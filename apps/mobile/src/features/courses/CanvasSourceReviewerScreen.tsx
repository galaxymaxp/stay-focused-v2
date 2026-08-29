import type { ReviewerOutput } from "@stay-focused/engine";
import {
  isActiveProcessingJobStatus,
  type ProcessingJobStatusView,
} from "@stay-focused/shared";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Check,
  ClipboardList,
  FileText,
  Megaphone,
  RotateCcw,
} from "lucide-react-native";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../../auth";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { getApiBaseUrl } from "../../config/apiBaseUrl";
import { colors, hitTarget, radius, spacing, typography } from "../../design/tokens";
import {
  listCanvasReviewerSources,
  prepareCanvasReviewerSources,
  previewSelectiveCanvasReviewerSources,
  structureCanvasReviewerSources,
  type CanvasApiClientError,
  type CanvasReviewerSourceDescriptor,
  type CanvasReviewerSourceListPayload,
  type CanvasReviewerSourcePreviewPayload,
  type CanvasReviewerSourceType,
  type CanvasSourceStructurePayload,
  type CanvasStructuredBlock,
} from "../../services/canvasApi";
import {
  cancelProcessingJob,
  createProcessingJobIdempotencyKey,
  createReviewerJob,
  getProcessingJobStatus,
  getReviewerJobResult,
  MOBILE_JOB_POLL_INTERVAL_MS,
  retryProcessingJob,
  type ProcessingJobApiError,
} from "../../services/processingJobsApi";
import {
  removeActiveProcessingJob,
  upsertActiveProcessingJob,
} from "../../services/activeProcessingJobStore";
import { cacheCompletedArtifact } from "../../services/completedArtifactCache";
import { API_BASE_URL_SETUP_HINT } from "../../services/reviewerApi";
import {
  saveReviewer,
  type ReviewerLibraryError,
  type SavedReviewerSummary,
} from "../../services/reviewerLibraryApi";
import { ReviewerPreview } from "../reviewer/ReviewerPreview";
import {
  canvasBlockPreview,
  createCanvasBlockSelectionKey,
  createDefaultCanvasBlockSelection,
  toggleCanvasBlockSelection,
} from "./canvasBlockSelection";
import {
  canvasGenerationNeedsNewPreview,
  canvasResolutionReducer,
  createCanvasResolutionState,
  createCanvasSelectionKey,
  finishCanvasSingleFlight,
  isCanvasGeneratedBindingCurrent,
  isCanvasGenerationCurrent,
  tryBeginCanvasSingleFlight,
  type CanvasGeneratedBinding,
  type CanvasResolutionStatus,
} from "./canvasResolutionState";
import {
  formatCanvasSourceType,
  groupCanvasSourcesForSelection,
  mergeCanvasSourceListPages,
  presentCanvasSourceCapability,
  sourceSelectionHelp,
} from "./canvasSourcePresentation";

const SOURCE_TEXT_HEIGHT = 320;

interface CanvasSourceReviewerScreenProps {
  readonly courseId: string;
  readonly courseName: string;
  readonly onBackToCourses: () => void;
  readonly onOpenLibrary: () => void;
}

interface CanvasSourceDisplayError {
  readonly title: string;
  readonly message: string;
}

export function CanvasSourceReviewerScreen({
  courseId,
  courseName,
  onBackToCourses,
  onOpenLibrary,
}: CanvasSourceReviewerScreenProps) {
  const { session } = useAuth();
  const [sourceList, setSourceList] =
    useState<CanvasReviewerSourceListPayload | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [preview, setPreview] =
    useState<CanvasReviewerSourcePreviewPayload | null>(null);
  const [structure, setStructure] =
    useState<CanvasSourceStructurePayload | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<readonly string[]>([]);
  const [resolution, dispatchResolution] = useReducer(
    canvasResolutionReducer,
    undefined,
    createCanvasResolutionState,
  );
  const [reviewer, setReviewer] = useState<ReviewerOutput | null>(null);
  const [sourceSnapshotId, setSourceSnapshotId] = useState<string | null>(null);
  const [generatedBinding, setGeneratedBinding] =
    useState<CanvasGeneratedBinding | null>(null);
  const [saveTitle, setSaveTitle] = useState("");
  const [savedReviewer, setSavedReviewer] =
    useState<SavedReviewerSummary | null>(null);
  const [error, setError] = useState<CanvasSourceDisplayError | null>(null);
  const [saveError, setSaveError] = useState<CanvasSourceDisplayError | null>(null);
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  const [isLoadingMoreSources, setIsLoadingMoreSources] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isStructuring, setIsStructuring] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeReviewerJob, setActiveReviewerJob] =
    useState<ProcessingJobStatusView | null>(null);
  const [appIsActive, setAppIsActive] = useState(
    AppState.currentState === "active",
  );
  const [isSaving, setIsSaving] = useState(false);

  const inventoryAbortRef = useRef<AbortController | null>(null);
  const preparationAbortRef = useRef<AbortController | null>(null);
  const structureAbortRef = useRef<AbortController | null>(null);
  const previewAbortRef = useRef<AbortController | null>(null);
  const saveAbortRef = useRef<AbortController | null>(null);
  const inventoryTokenRef = useRef(0);
  const preparationTokenRef = useRef(0);
  const structureTokenRef = useRef(0);
  const resolutionTokenRef = useRef(0);
  const selectedSourceIdRef = useRef<string | null>(null);
  const preparationLockRef = useRef(false);
  const structureLockRef = useRef(false);
  const loadMoreLockRef = useRef(false);
  const previewLockRef = useRef(false);
  const generationLockRef = useRef(false);
  const saveLockRef = useRef(false);
  const generationIdempotencyKeyRef = useRef<string | null>(null);
  const currentResolutionSelectionKeyRef = useRef("");
  const [structureRetryToken, setStructureRetryToken] = useState(0);
  const pendingGenerationRef = useRef<{
    readonly requestToken: number;
    readonly selectionKey: string;
    readonly sourceText: string;
    readonly resolutionFingerprint: string;
    readonly sourceTitle: string;
  } | null>(null);

  const selectedSource = useMemo(
    () =>
      sourceList?.sources.find((source) => source.id === selectedSourceId) ?? null,
    [selectedSourceId, sourceList?.sources],
  );
  const selectedSourceAction = selectedSource
    ? presentCanvasSourceCapability(selectedSource).action
    : null;
  const selectionIds = selectedSourceId ? [selectedSourceId] : [];
  const sourceSelectionKey = createCanvasSelectionKey(selectionIds);
  const blockSelectionKey = structure
    ? createCanvasBlockSelectionKey(structure.structureSessionId, selectedBlockIds)
    : sourceSelectionKey;
  const sourceGroups = useMemo(
    () => groupCanvasSourcesForSelection(sourceList?.sources ?? []),
    [sourceList?.sources],
  );
  const hasMeaningfulEdit = Boolean(
    preview && resolution.sourceText !== preview.sourceText,
  );
  const hasUnsavedReviewer = Boolean(reviewer && !savedReviewer);

  const invalidateGeneratedOutput = useCallback(() => {
    saveAbortRef.current?.abort();
    saveAbortRef.current = null;
    generationLockRef.current = false;
    generationIdempotencyKeyRef.current = null;
    pendingGenerationRef.current = null;
    saveLockRef.current = false;
    resolutionTokenRef.current += 1;
    setReviewer(null);
    setSourceSnapshotId(null);
    setGeneratedBinding(null);
    setSavedReviewer(null);
    setSaveError(null);
    setIsGenerating(false);
    setIsSaving(false);
  }, []);

  const clearPreviewState = useCallback(
    (nextSelectionKey: string) => {
      previewAbortRef.current?.abort();
      previewAbortRef.current = null;
      finishCanvasSingleFlight(previewLockRef);
      setPreview(null);
      dispatchResolution({
        type: "selection_changed",
        selectionKey: nextSelectionKey,
      });
      currentResolutionSelectionKeyRef.current = nextSelectionKey;
      invalidateGeneratedOutput();
      setError(null);
      setSaveTitle("");
      setIsPreviewing(false);
    },
    [invalidateGeneratedOutput],
  );

  const clearDependentState = useCallback(
    (nextSourceId: string | null) => {
      structureTokenRef.current += 1;
      structureAbortRef.current?.abort();
      structureAbortRef.current = null;
      finishCanvasSingleFlight(structureLockRef);
      setStructure(null);
      setSelectedBlockIds([]);
      setIsStructuring(false);
      clearPreviewState(
        createCanvasSelectionKey(nextSourceId ? [nextSourceId] : []),
      );
    },
    [clearPreviewState],
  );

  const loadSources = useCallback(
    async (preferredSourceId: string | null = null) => {
      const context = createRequestContext(session?.accessToken);
      if (!context.ok) {
        selectedSourceIdRef.current = null;
        setSelectedSourceId(null);
        setSourceList(null);
        clearDependentState(null);
        setError(context.error);
        setIsLoadingSources(false);
        return;
      }

      inventoryAbortRef.current?.abort();
      const controller = new AbortController();
      inventoryAbortRef.current = controller;
      const requestToken = inventoryTokenRef.current + 1;
      inventoryTokenRef.current = requestToken;
      clearDependentState(preferredSourceId);
      finishCanvasSingleFlight(loadMoreLockRef);
      setIsLoadingMoreSources(false);
      setIsLoadingSources(true);

      try {
        const result = await listCanvasReviewerSources({
          ...context.value,
          courseId,
          signal: controller.signal,
        });
        if (inventoryTokenRef.current !== requestToken) return;

        if (result.ok) {
          setSourceList(result.data);
          const preferred = preferredSourceId
            ? result.data.sources.find((source) => source.id === preferredSourceId)
            : null;
          const canKeep = preferred
            ? presentCanvasSourceCapability(preferred).selectable
            : false;
          setSelectedSourceId(canKeep ? preferredSourceId : null);
          selectedSourceIdRef.current = canKeep ? preferredSourceId : null;
          if (!canKeep) {
            dispatchResolution({ type: "selection_changed", selectionKey: "" });
          }
        } else {
          setSourceList(null);
          setSelectedSourceId(null);
          selectedSourceIdRef.current = null;
          setError(formatCanvasSourceError(result.error));
        }
      } finally {
        if (inventoryTokenRef.current === requestToken) {
          inventoryAbortRef.current = null;
          setIsLoadingSources(false);
        }
      }
    },
    [clearDependentState, courseId, session?.accessToken],
  );

  const loadMoreSources = async () => {
    if (
      !sourceList?.pagination.hasMore ||
      isLoadingMoreSources ||
      !tryBeginCanvasSingleFlight(loadMoreLockRef)
    ) {
      return;
    }
    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      finishCanvasSingleFlight(loadMoreLockRef);
      setError(context.error);
      return;
    }

    inventoryAbortRef.current?.abort();
    const controller = new AbortController();
    inventoryAbortRef.current = controller;
    const requestToken = inventoryTokenRef.current + 1;
    inventoryTokenRef.current = requestToken;
    const expectedCourseId = sourceList.courseId;
    const nextOffset = sourceList.pagination.offset + sourceList.pagination.returned;
    setIsLoadingMoreSources(true);
    setError(null);

    try {
      const result = await listCanvasReviewerSources({
        ...context.value,
        courseId,
        limit: sourceList.pagination.limit,
        offset: nextOffset,
        signal: controller.signal,
      });
      if (inventoryTokenRef.current !== requestToken) return;

      if (result.ok) {
        const merged = mergeCanvasSourceListPages(sourceList, result.data);
        if (!merged || merged.courseId !== expectedCourseId) {
          await loadSources(selectedSourceIdRef.current);
          return;
        }
        setSourceList(merged);
      } else {
        setError(formatCanvasSourceError(result.error));
      }
    } finally {
      if (inventoryTokenRef.current === requestToken) {
        inventoryAbortRef.current = null;
        finishCanvasSingleFlight(loadMoreLockRef);
        setIsLoadingMoreSources(false);
      }
    }
  };

  useEffect(() => {
    void loadSources();
    return () => {
      inventoryTokenRef.current += 1;
      preparationTokenRef.current += 1;
      structureTokenRef.current += 1;
      resolutionTokenRef.current += 1;
      inventoryAbortRef.current?.abort();
      preparationAbortRef.current?.abort();
      structureAbortRef.current?.abort();
      previewAbortRef.current?.abort();
      saveAbortRef.current?.abort();
      inventoryAbortRef.current = null;
      preparationAbortRef.current = null;
      structureAbortRef.current = null;
      previewAbortRef.current = null;
      saveAbortRef.current = null;
      generationLockRef.current = false;
      saveLockRef.current = false;
      preparationLockRef.current = false;
      structureLockRef.current = false;
      previewLockRef.current = false;
      loadMoreLockRef.current = false;
      dispatchResolution({ type: "cleared" });
    };
  }, [loadSources]);

  const selectSource = (source: CanvasReviewerSourceDescriptor) => {
    if (!presentCanvasSourceCapability(source).selectable) return;
    preparationTokenRef.current += 1;
    preparationAbortRef.current?.abort();
    preparationAbortRef.current = null;
    finishCanvasSingleFlight(preparationLockRef);
    setIsPreparing(false);
    setSelectedSourceId(source.id);
    selectedSourceIdRef.current = source.id;
    clearDependentState(source.id);
  };

  useEffect(() => {
    if (!selectedSourceId || selectedSourceAction !== "preview") return;

    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      setError(context.error);
      return;
    }

    structureAbortRef.current?.abort();
    finishCanvasSingleFlight(structureLockRef);
    if (!tryBeginCanvasSingleFlight(structureLockRef)) return;
    const controller = new AbortController();
    structureAbortRef.current = controller;
    const requestToken = structureTokenRef.current + 1;
    structureTokenRef.current = requestToken;
    const activeSourceId = selectedSourceId;
    setStructure(null);
    setSelectedBlockIds([]);
    setIsStructuring(true);
    clearPreviewState(createCanvasSelectionKey([activeSourceId]));

    void (async () => {
      try {
        const result = await structureCanvasReviewerSources({
          ...context.value,
          courseId,
          signal: controller.signal,
          sourceIds: [activeSourceId],
        });
        if (
          structureTokenRef.current !== requestToken ||
          selectedSourceIdRef.current !== activeSourceId
        ) {
          return;
        }
        if (!result.ok) {
          setError(formatCanvasSourceError(result.error));
          return;
        }

        const defaultSelection = createDefaultCanvasBlockSelection(result.data);
        setStructure(result.data);
        setSelectedBlockIds(defaultSelection);
        const nextSelectionKey = createCanvasBlockSelectionKey(
          result.data.structureSessionId,
          defaultSelection,
        );
        currentResolutionSelectionKeyRef.current = nextSelectionKey;
        dispatchResolution({
          selectionKey: nextSelectionKey,
          type: "selection_changed",
        });
        if (defaultSelection.length > result.data.limits.maximumSelectedBlocks) {
          setError({
            message: `This source defaults to ${defaultSelection.length.toLocaleString()} blocks. Clear or deselect blocks until no more than ${result.data.limits.maximumSelectedBlocks.toLocaleString()} remain.`,
            title: "Choose fewer blocks",
          });
        }
      } finally {
        if (structureTokenRef.current === requestToken) {
          structureAbortRef.current = null;
          finishCanvasSingleFlight(structureLockRef);
          setIsStructuring(false);
        }
      }
    })();

    return () => {
      controller.abort();
      finishCanvasSingleFlight(structureLockRef);
    };
  }, [
    clearPreviewState,
    courseId,
    selectedSourceAction,
    selectedSourceId,
    session?.accessToken,
    structureRetryToken,
  ]);

  const requestSourceSelection = (source: CanvasReviewerSourceDescriptor) => {
    if (source.id === selectedSourceId) return;
    if (hasMeaningfulEdit || hasUnsavedReviewer) {
      Alert.alert(
        "Change source?",
        "Your edited preview and unsaved reviewer will be cleared.",
        [
          { style: "cancel", text: "Keep current source" },
          { onPress: () => selectSource(source), style: "destructive", text: "Change source" },
        ],
      );
      return;
    }
    selectSource(source);
  };

  const requestBackToCourses = () => {
    if (hasMeaningfulEdit || hasUnsavedReviewer) {
      Alert.alert(
        "Return to courses?",
        "Your edited preview and unsaved reviewer will be cleared.",
        [
          { style: "cancel", text: "Stay here" },
          { onPress: onBackToCourses, style: "destructive", text: "Return to courses" },
        ],
      );
      return;
    }
    onBackToCourses();
  };

  const requestChangeSource = () => {
    const clearSourceSelection = () => {
      selectedSourceIdRef.current = null;
      setSelectedSourceId(null);
      clearDependentState(null);
    };
    if (hasMeaningfulEdit || hasUnsavedReviewer) {
      Alert.alert(
        "Change source?",
        "Your edited preview and unsaved reviewer will be cleared.",
        [
          { style: "cancel", text: "Keep current source" },
          {
            onPress: clearSourceSelection,
            style: "destructive",
            text: "Change source",
          },
        ],
      );
      return;
    }
    clearSourceSelection();
  };

  const handlePrepare = async () => {
    if (
      !selectedSource ||
      isPreparing ||
      !tryBeginCanvasSingleFlight(preparationLockRef)
    ) {
      return;
    }
    const presentation = presentCanvasSourceCapability(selectedSource);
    if (presentation.action !== "prepare" && presentation.action !== "retry") {
      finishCanvasSingleFlight(preparationLockRef);
      return;
    }
    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      finishCanvasSingleFlight(preparationLockRef);
      setError(context.error);
      return;
    }

    preparationAbortRef.current?.abort();
    const controller = new AbortController();
    preparationAbortRef.current = controller;
    const requestToken = preparationTokenRef.current + 1;
    preparationTokenRef.current = requestToken;
    const activeSelectionKey = sourceSelectionKey;
    clearDependentState(selectedSource.id);
    setIsPreparing(true);

    try {
      const result = await prepareCanvasReviewerSources({
        ...context.value,
        courseId,
        signal: controller.signal,
        sourceIds: [selectedSource.id],
      });
      if (
        preparationTokenRef.current !== requestToken ||
        createCanvasSelectionKey(
          selectedSourceIdRef.current ? [selectedSourceIdRef.current] : [],
        ) !==
          activeSelectionKey
      ) {
        return;
      }
      if (result.ok) {
        await loadSources(selectedSource.id);
      } else {
        setError(formatCanvasSourceError(result.error));
      }
    } finally {
      if (preparationTokenRef.current === requestToken) {
        preparationAbortRef.current = null;
        finishCanvasSingleFlight(preparationLockRef);
        setIsPreparing(false);
      }
    }
  };

  const applyBlockSelection = (nextSelection: readonly string[]) => {
    if (!structure) return;
    const nextSelectionKey = createCanvasBlockSelectionKey(
      structure.structureSessionId,
      nextSelection,
    );
    setSelectedBlockIds(nextSelection);
    clearPreviewState(nextSelectionKey);
  };

  const handleToggleBlock = (block: CanvasStructuredBlock) => {
    if (!structure || !block.selectable) return;
    const isSelected = selectedBlockIds.includes(block.id);
    if (
      !isSelected &&
      selectedBlockIds.length >= structure.limits.maximumSelectedBlocks
    ) {
      setError({
        message: `Select at most ${structure.limits.maximumSelectedBlocks.toLocaleString()} Canvas blocks. Deselect one before adding another.`,
        title: "Block limit reached",
      });
      return;
    }
    applyBlockSelection(
      toggleCanvasBlockSelection({
        blockId: block.id,
        selectedBlockIds,
        structure,
      }),
    );
  };

  const handlePreview = async () => {
    if (
      !selectedSource ||
      !structure ||
      isPreviewing ||
      !tryBeginCanvasSingleFlight(previewLockRef)
    ) {
      return;
    }
    if (selectedBlockIds.length === 0) {
      finishCanvasSingleFlight(previewLockRef);
      setError({
        message: "Select at least one Canvas block before previewing.",
        title: "Choose study material",
      });
      return;
    }
    if (selectedBlockIds.length > structure.limits.maximumSelectedBlocks) {
      finishCanvasSingleFlight(previewLockRef);
      setError({
        message: `Select at most ${structure.limits.maximumSelectedBlocks.toLocaleString()} Canvas blocks.`,
        title: "Choose fewer blocks",
      });
      return;
    }
    if (presentCanvasSourceCapability(selectedSource).action !== "preview") {
      finishCanvasSingleFlight(previewLockRef);
      return;
    }
    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      finishCanvasSingleFlight(previewLockRef);
      setError(context.error);
      return;
    }

    previewAbortRef.current?.abort();
    const controller = new AbortController();
    previewAbortRef.current = controller;
    const activeSelectionKey = createCanvasBlockSelectionKey(
      structure.structureSessionId,
      selectedBlockIds,
    );
    setPreview(null);
    invalidateGeneratedOutput();
    const requestToken = resolutionTokenRef.current + 1;
    resolutionTokenRef.current = requestToken;
    dispatchResolution({
      requestToken,
      selectionKey: activeSelectionKey,
      type: "started",
    });
    setIsPreviewing(true);
    setError(null);

    try {
      const result = await previewSelectiveCanvasReviewerSources({
        ...context.value,
        courseId,
        signal: controller.signal,
        selectedBlockIds,
        structureSessionId: structure.structureSessionId,
      });
      if (
        resolutionTokenRef.current !== requestToken ||
        currentResolutionSelectionKeyRef.current !== activeSelectionKey
      ) {
        return;
      }

      if (result.ok) {
        setPreview(result.data);
        dispatchResolution({
          preview: {
            previewSessionId: result.data.previewSessionId,
            resolutionFingerprint: result.data.resolutionFingerprint,
            sourceIds: result.data.sources.map((source) => source.id),
          },
          requestToken,
          selectionKey: activeSelectionKey,
          sourceText: result.data.sourceText,
          sourceTitle: selectedSource.title,
          type: "resolved",
        });
        setSaveTitle(result.data.suggestedTitle || selectedSource.title);
      } else {
        dispatchResolution({
          requestToken,
          selectionKey: activeSelectionKey,
          status: terminalStatusForCanvasError(result.error),
          type: "terminal",
        });
        if (
          result.error.code === "structure_session_invalid" ||
          result.error.code === "structure_session_not_found" ||
          result.error.code === "structure_session_expired" ||
          result.error.code === "block_selection_invalid"
        ) {
          clearDependentState(selectedSource.id);
        }
        setError(formatCanvasSourceError(result.error));
      }
    } finally {
      if (resolutionTokenRef.current === requestToken) {
        previewAbortRef.current = null;
        finishCanvasSingleFlight(previewLockRef);
        setIsPreviewing(false);
      }
    }
  };

  const handleSourceTextChange = (value: string) => {
    if (activeReviewerJob && !isActiveProcessingJobStatus(activeReviewerJob.status)) {
      void removeActiveProcessingJob(activeReviewerJob.id);
      setActiveReviewerJob(null);
    }
    dispatchResolution({ sourceText: value, type: "edited" });
    invalidateGeneratedOutput();
    setError(null);
  };

  const handleReturnToBlockSelection = () => {
    if (activeReviewerJob && !isActiveProcessingJobStatus(activeReviewerJob.status)) {
      void removeActiveProcessingJob(activeReviewerJob.id);
      setActiveReviewerJob(null);
    }
    clearPreviewState(blockSelectionKey);
  };

  const applyObservedReviewerJob = useCallback(
    async (job: ProcessingJobStatusView): Promise<void> => {
      const context = createRequestContext(session?.accessToken);
      const ownerUserId = session?.user.id;
      if (!context.ok || !ownerUserId) return;

      setActiveReviewerJob(job);
      await upsertActiveProcessingJob(ownerUserId, job);
      if (isActiveProcessingJobStatus(job.status)) {
        setIsGenerating(true);
        return;
      }

      finishCanvasSingleFlight(generationLockRef);
      setIsGenerating(false);
      if (job.status !== "succeeded" || !job.resultAvailable) {
        if (job.status === "failed" || job.status === "expired") {
          setError({
            message: job.safeErrorMessage ?? "The reviewer job could not finish safely.",
            title: "Reviewer needs attention",
          });
        } else if (job.status === "cancelled") {
          setError({
            message: "No partial reviewer was published.",
            title: "Reviewer generation cancelled",
          });
        }
        return;
      }

      const result = await getReviewerJobResult({
        ...context.value,
        jobId: job.id,
      });
      if (!result.ok) {
        setError(formatProcessingJobError(result.error));
        return;
      }
      if (
        result.data.artifactVersionId &&
        result.data.sourceVersionId &&
        result.data.sourceContentSha256
      ) {
        await cacheCompletedArtifact({
          artifactVersionId: result.data.artifactVersionId,
          processingJobId: job.id,
          ownerUserId,
          artifactType: "reviewer",
          sourceVersionId: result.data.sourceVersionId,
          sourceContentSha256: result.data.sourceContentSha256,
          title: result.data.reviewer.title,
          createdAt: job.completedAt ?? job.updatedAt,
          payload: result.data.reviewer,
        });
      }

      const pending = pendingGenerationRef.current;
      if (
        pending &&
        (resolutionTokenRef.current !== pending.requestToken ||
          currentResolutionSelectionKeyRef.current !== pending.selectionKey)
      ) {
        return;
      }

      setReviewer(result.data.reviewer);
      setSourceSnapshotId(result.data.sourceSnapshotId ?? null);
      if (pending) {
        setGeneratedBinding({
          fingerprint: pending.resolutionFingerprint,
          selectionKey: pending.selectionKey,
          sourceText: pending.sourceText,
        });
        setSaveTitle(
          pending.sourceTitle.trim() ||
            result.data.reviewer.title.trim() ||
            "Canvas reviewer",
        );
      } else {
        setSaveTitle(result.data.reviewer.title.trim() || "Canvas reviewer");
      }
      setActiveReviewerJob(null);
      pendingGenerationRef.current = null;
      generationIdempotencyKeyRef.current = null;
      await removeActiveProcessingJob(job.id);
    },
    [session?.accessToken, session?.user.id],
  );

  const reconcileReviewerJob = useCallback(async (): Promise<void> => {
    const context = createRequestContext(session?.accessToken);
    if (!context.ok || !activeReviewerJob) return;
    const result = await getProcessingJobStatus({
      ...context.value,
      jobId: activeReviewerJob.id,
    });
    if (result.ok) {
      await applyObservedReviewerJob(result.data);
    } else {
      setError(formatProcessingJobError(result.error));
    }
  }, [activeReviewerJob, applyObservedReviewerJob, session?.accessToken]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      const active = state === "active";
      setAppIsActive(active);
      if (active) void reconcileReviewerJob();
    });
    return () => subscription.remove();
  }, [reconcileReviewerJob]);

  useEffect(() => {
    if (
      !appIsActive ||
      !activeReviewerJob ||
      !isActiveProcessingJobStatus(activeReviewerJob.status)
    ) {
      return;
    }
    const timer = setInterval(() => {
      void reconcileReviewerJob();
    }, MOBILE_JOB_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [activeReviewerJob, appIsActive, reconcileReviewerJob]);

  const handleGenerate = async () => {
    if (isGenerating || !tryBeginCanvasSingleFlight(generationLockRef)) return;
    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      finishCanvasSingleFlight(generationLockRef);
      setError(context.error);
      return;
    }
    if (
      !preview ||
      !isCanvasGenerationCurrent(resolution, selectionIds, blockSelectionKey)
    ) {
      setError({
        message: "Check the current source again before creating a reviewer.",
        title: "Source preview changed",
      });
      finishCanvasSingleFlight(generationLockRef);
      return;
    }

    const finalSourceText = resolution.sourceText.trim();
    if (!finalSourceText) {
      setError({
        message: "Keep at least one readable line in the preview.",
        title: "Preview is empty",
      });
      finishCanvasSingleFlight(generationLockRef);
      return;
    }
    if (finalSourceText.length > preview.limits.existingReviewerRequestLimit) {
      setError({
        message: `Keep the edited preview under ${preview.limits.existingReviewerRequestLimit.toLocaleString()} characters.`,
        title: "Preview is too long",
      });
      finishCanvasSingleFlight(generationLockRef);
      return;
    }

    const requestToken = resolutionTokenRef.current;
    const activeSelectionKey = blockSelectionKey;
    const idempotencyKey =
      generationIdempotencyKeyRef.current ??
      createProcessingJobIdempotencyKey("reviewer_generation");
    generationIdempotencyKeyRef.current = idempotencyKey;
    pendingGenerationRef.current = {
      requestToken,
      resolutionFingerprint: preview.resolutionFingerprint,
      selectionKey: activeSelectionKey,
      sourceText: finalSourceText,
      sourceTitle: resolution.sourceTitle,
    };
    setIsGenerating(true);
    setError(null);
    setReviewer(null);
    setSourceSnapshotId(null);
    setGeneratedBinding(null);
    setSavedReviewer(null);

    let accepted = false;
    try {
      const result = await createReviewerJob({
        ...context.value,
        canvasCourseId: courseId,
        canvasItemIds: preview.sources.map((source) => source.id),
        canvasPreviewSessionId: preview.previewSessionId,
        canvasResolutionFingerprint: preview.resolutionFingerprint,
        idempotencyKey,
        sourceText: finalSourceText,
        sourceTitle: resolution.sourceTitle,
      });
      if (
        resolutionTokenRef.current !== requestToken ||
        currentResolutionSelectionKeyRef.current !== activeSelectionKey
      ) {
        return;
      }
      if (result.ok) {
        accepted = true;
        const ownerUserId = session?.user.id;
        if (ownerUserId) {
          await upsertActiveProcessingJob(ownerUserId, result.data);
        }
        setActiveReviewerJob(result.data);
        generationIdempotencyKeyRef.current = null;
      } else {
        const displayError = formatProcessingJobError(result.error);
        if (canvasGenerationNeedsNewPreview(result.error.code)) {
          clearPreviewState(activeSelectionKey);
        }
        setError(displayError);
        if (!result.error.retryable) {
          generationIdempotencyKeyRef.current = null;
          pendingGenerationRef.current = null;
        }
      }
    } finally {
      if (resolutionTokenRef.current === requestToken && !accepted) {
        finishCanvasSingleFlight(generationLockRef);
        setIsGenerating(false);
      }
    }
  };

  const handleCancelReviewerJob = async () => {
    const context = createRequestContext(session?.accessToken);
    if (!context.ok || !activeReviewerJob) return;
    const result = await cancelProcessingJob({
      ...context.value,
      jobId: activeReviewerJob.id,
    });
    if (result.ok) await applyObservedReviewerJob(result.data);
    else setError(formatProcessingJobError(result.error));
  };

  const handleRetryReviewerJob = async () => {
    const context = createRequestContext(session?.accessToken);
    const ownerUserId = session?.user.id;
    if (!context.ok || !ownerUserId || !activeReviewerJob) return;
    const result = await retryProcessingJob({
      ...context.value,
      jobId: activeReviewerJob.id,
      idempotencyKey: createProcessingJobIdempotencyKey("reviewer_generation"),
    });
    if (!result.ok) {
      setError(formatProcessingJobError(result.error));
      return;
    }
    await removeActiveProcessingJob(activeReviewerJob.id);
    await upsertActiveProcessingJob(ownerUserId, result.data);
    setActiveReviewerJob(result.data);
    setIsGenerating(true);
    setError(null);
  };

  const handleSave = async () => {
    if (isSaving || !reviewer || !tryBeginCanvasSingleFlight(saveLockRef)) return;
    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      finishCanvasSingleFlight(saveLockRef);
      setSaveError(context.error);
      return;
    }
    const finalSourceText = resolution.sourceText.trim();
    if (
      !sourceSnapshotId ||
      !preview ||
      !isCanvasGeneratedBindingCurrent(
        generatedBinding,
        resolution,
        selectionIds,
        blockSelectionKey,
      )
    ) {
      setSaveError({
        message: "Create the reviewer again from the current preview before saving.",
        title: "Reviewer is no longer current",
      });
      finishCanvasSingleFlight(saveLockRef);
      return;
    }
    const title = saveTitle.trim();
    if (!title) {
      setSaveError({ message: "Enter a title before saving.", title: "Title needed" });
      finishCanvasSingleFlight(saveLockRef);
      return;
    }

    saveAbortRef.current?.abort();
    const controller = new AbortController();
    saveAbortRef.current = controller;
    const requestToken = resolutionTokenRef.current;
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await saveReviewer({
        ...context.value,
        reviewerOutput: reviewer,
        signal: controller.signal,
        sourceMetadata: {
          sourceCharacterCount: finalSourceText.length,
          sourceLabel: resolution.sourceTitle,
          sourceMode: "canvas",
        },
        sourceSnapshotId,
        title,
      });
      if (resolutionTokenRef.current !== requestToken) return;
      if (result.ok) {
        setSavedReviewer(result.data);
        setSaveTitle(result.data.title);
      } else {
        setSaveError(formatLibraryError(result.error));
      }
    } finally {
      if (resolutionTokenRef.current === requestToken) {
        saveAbortRef.current = null;
        finishCanvasSingleFlight(saveLockRef);
        setIsSaving(false);
      }
    }
  };

  const displayCourseName = sourceList?.courseName || courseName;
  const stage = reviewer
    ? "REVIEWER READY"
    : preview
      ? "CHECK SOURCE"
      : selectedSourceAction === "preview"
        ? "SELECT BLOCKS"
        : "CHOOSE SOURCE";

  return (
    <Screen contentContainerStyle={styles.content}>
      <Header
        courseName={displayCourseName}
        onBackToCourses={requestBackToCourses}
        stage={stage}
      />

      {error ? <ErrorCard error={error} /> : null}

      {isLoadingSources ? (
        <StatusCard
          message="Loading the synchronized items for this course."
          loading
          testID="canvas-sources-loading"
          title="Loading course content"
        />
      ) : reviewer ? (
        <View style={styles.stack}>
          <SaveCanvasReviewerPanel
            isSaving={isSaving}
            onChangeTitle={(value) => {
              setSaveTitle(value);
              setSaveError(null);
            }}
            onOpenLibrary={onOpenLibrary}
            onSave={() => void handleSave()}
            savedReviewer={savedReviewer}
            saveError={saveError}
            saveTitle={saveTitle}
            sourceSnapshotReady={sourceSnapshotId !== null}
          />
          <ReviewerPreview reviewer={reviewer} />
          <Button onPress={requestChangeSource} variant="secondary">
            Change source
          </Button>
        </View>
      ) : preview ? (
        <PreviewStage
          activeJob={activeReviewerJob}
          isGenerating={isGenerating}
          onBack={handleReturnToBlockSelection}
          onCancel={() => void handleCancelReviewerJob()}
          onChangeText={handleSourceTextChange}
          onGenerate={() => void handleGenerate()}
          onRetry={() => void handleRetryReviewerJob()}
          preview={preview}
          source={selectedSource}
          sourceText={resolution.sourceText}
        />
      ) : selectedSourceAction === "preview" && selectedSource ? (
        structure ? (
          <BlockSelectionStage
            isPreviewing={isPreviewing}
            onChangeSource={requestChangeSource}
            onClear={() => applyBlockSelection([])}
            onPreview={() => void handlePreview()}
            onToggleBlock={handleToggleBlock}
            selectedBlockIds={selectedBlockIds}
            source={selectedSource}
            structure={structure}
          />
        ) : (
          <View style={styles.stack} testID="canvas-source-structure-stage">
            <StatusCard
              loading={isStructuring}
              message={
                isStructuring
                  ? "Loading the synchronized source structure and selectable study blocks."
                  : "The source structure did not load. Try again."
              }
              testID="canvas-source-structure-loading"
              title={isStructuring ? "Loading source blocks" : "Blocks unavailable"}
            />
            {!isStructuring ? (
              <Button
                fullWidth
                onPress={() => setStructureRetryToken((value) => value + 1)}
                testID="canvas-source-structure-retry"
                variant="primary"
              >
                Try loading blocks again
              </Button>
            ) : null}
            <Button fullWidth onPress={requestChangeSource} variant="secondary">
              Change source
            </Button>
          </View>
        )
      ) : (
        <View style={styles.stack}>
          {sourceList ? <CourseFreshnessCard courseSync={sourceList.courseSync} /> : null}

          {sourceList?.courseSync.status === "never" ? (
            <StatusCard
              message="Return to Courses and synchronize this course before choosing study material."
              testID="canvas-sources-sync-required"
              title="Synchronize this course first"
            />
          ) : sourceList && sourceList.sources.length === 0 ? (
            <StatusCard
              message="No synchronized pages, assignment descriptions, announcements, images, or PDFs are available yet."
              testID="canvas-sources-empty"
              title="No course content found"
            />
          ) : (
            sourceGroups.map((group) => (
              <SourceSection
                key={group.key}
                onSelect={requestSourceSelection}
                selectedSourceId={selectedSourceId}
                sources={group.sources}
                title={group.title}
              />
            ))
          )}

          {sourceList?.pagination.hasMore ? (
            <View style={styles.stack}>
              <Button
                accessibilityLabel={
                  isLoadingMoreSources
                    ? "Loading more course items"
                    : "Load more course items"
                }
                fullWidth
                loading={isLoadingMoreSources}
                onPress={() => void loadMoreSources()}
                testID="canvas-load-more-sources"
                variant="secondary"
              >
                Load more course items
              </Button>
              {isLoadingMoreSources ? (
                <Text accessibilityLiveRegion="polite" style={styles.statusText}>
                  Loading the next synchronized course items.
                </Text>
              ) : null}
            </View>
          ) : null}

          <Card accent={Boolean(selectedSource)} style={styles.actionCard}>
            <Text style={styles.sectionLabel}>NEXT STEP</Text>
            <Text style={styles.cardTitle}>
              {selectedSource?.title ?? "Choose one course item"}
            </Text>
            <Text style={styles.bodyText}>{sourceSelectionHelp(selectedSource)}</Text>
            {resolution.status !== "idle" ? (
              <Text style={styles.statusText}>{resolutionStatusCopy(resolution.status)}</Text>
            ) : null}
            {selectedSource ? (
              <SelectionAction
                isPreparing={isPreparing}
                isPreviewing={isPreviewing}
                onPrepare={() => void handlePrepare()}
                onPreview={() => void handlePreview()}
                source={selectedSource}
              />
            ) : (
              <Button disabled fullWidth variant="primary">
                Check source
              </Button>
            )}
          </Card>
          {isPreparing ? (
            <StatusCard
              loading
              message="Stay Focused is securely preparing this file. Preparation may take a moment."
              title="Preparing file"
            />
          ) : isPreviewing ? (
            <StatusCard
              loading
              message={
                selectedSource?.type === "file"
                  ? "Reading the prepared file and checking that its study text is complete."
                  : "Checking the synchronized study text for this item."
              }
              title="Checking source"
            />
          ) : null}
        </View>
      )}
    </Screen>
  );
}

function Header({
  courseName,
  onBackToCourses,
  stage,
}: {
  readonly courseName: string;
  readonly onBackToCourses: () => void;
  readonly stage: string;
}) {
  return (
    <View style={styles.header} testID="canvas-source-reviewer-screen">
      <Pressable
        accessibilityLabel="Back to courses"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onBackToCourses}
        style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
      >
        <ArrowLeft color={colors.textPrimary} size={22} strokeWidth={1.8} />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={styles.sectionLabel}>{stage}</Text>
        <Text style={styles.title}>Create a Canvas reviewer</Text>
        <Text style={styles.courseName}>{courseName}</Text>
      </View>
    </View>
  );
}

function CourseFreshnessCard({
  courseSync,
}: {
  readonly courseSync: CanvasReviewerSourceListPayload["courseSync"];
}) {
  const copy =
    courseSync.status === "success"
      ? "Course content is synchronized."
      : courseSync.status === "partial"
        ? "Some course areas could not be synchronized. Available items are shown below."
        : courseSync.status === "failed"
          ? "The latest synchronization did not finish. Previously synchronized items may still be available."
          : "This course has not been synchronized yet.";
  return (
    <View accessibilityLiveRegion="polite" style={styles.freshnessRow}>
      <RotateCcw color={colors.textMuted} size={17} strokeWidth={1.8} />
      <Text style={styles.statusText}>{copy}</Text>
    </View>
  );
}

function SourceSection({
  onSelect,
  selectedSourceId,
  sources,
  title,
}: {
  readonly onSelect: (source: CanvasReviewerSourceDescriptor) => void;
  readonly selectedSourceId: string | null;
  readonly sources: readonly CanvasReviewerSourceDescriptor[];
  readonly title: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title.toUpperCase()}</Text>
      <Card style={styles.sourceCard}>
        {sources.map((source, index) => (
          <SourceRow
            index={index}
            isLast={index === sources.length - 1}
            isSelected={source.id === selectedSourceId}
            key={source.id}
            onSelect={onSelect}
            source={source}
          />
        ))}
      </Card>
    </View>
  );
}

function SourceRow({
  index,
  isLast,
  isSelected,
  onSelect,
  source,
}: {
  readonly index: number;
  readonly isLast: boolean;
  readonly isSelected: boolean;
  readonly onSelect: (source: CanvasReviewerSourceDescriptor) => void;
  readonly source: CanvasReviewerSourceDescriptor;
}) {
  const presentation = presentCanvasSourceCapability(source);
  return (
    <Pressable
      accessibilityLabel={`${source.title}, ${formatCanvasSourceType(source.type)}, ${presentation.statusLabel}`}
      accessibilityHint={presentation.explanation}
      accessibilityRole="radio"
      accessibilityState={{
        checked: isSelected,
        disabled: !presentation.selectable,
        selected: isSelected,
      }}
      disabled={!presentation.selectable}
      onPress={() => onSelect(source)}
      style={({ pressed }) => [
        styles.sourceRow,
        !isLast ? styles.sourceRowBorder : null,
        isSelected ? styles.sourceRowSelected : null,
        !presentation.selectable ? styles.sourceRowDisabled : null,
        pressed ? styles.pressed : null,
      ]}
      testID={`canvas-source-row-${index}`}
    >
      <View style={styles.sourceIcon}>
        <SourceTypeIcon type={source.type} />
      </View>
      <View style={styles.sourceBody}>
        <Text style={styles.sourceTitle}>{source.title}</Text>
        <Text style={styles.sourceMeta}>{formatCanvasSourceType(source.type)}</Text>
        <View style={styles.statusRow}>
          {source.capability === "ready" ? (
            <Check color={colors.success} size={15} strokeWidth={2} />
          ) : (
            <AlertCircle color={colors.textMuted} size={15} strokeWidth={1.8} />
          )}
          <Text style={styles.statusText}>{presentation.statusLabel}</Text>
        </View>
      </View>
      <View style={[styles.radio, isSelected ? styles.radioSelected : null]}>
        {isSelected ? <Check color={colors.accentText} size={14} strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}

function SourceTypeIcon({ type }: { readonly type: CanvasReviewerSourceType }) {
  const props = { color: colors.textSecondary, size: 21, strokeWidth: 1.7 } as const;
  switch (type) {
    case "page":
      return <BookOpen {...props} />;
    case "assignment":
      return <ClipboardList {...props} />;
    case "announcement":
      return <Megaphone {...props} />;
    case "file":
      return <FileText {...props} />;
  }
}

function SelectionAction({
  isPreparing,
  isPreviewing,
  onPrepare,
  onPreview,
  source,
}: {
  readonly isPreparing: boolean;
  readonly isPreviewing: boolean;
  readonly onPrepare: () => void;
  readonly onPreview: () => void;
  readonly source: CanvasReviewerSourceDescriptor;
}) {
  const presentation = presentCanvasSourceCapability(source);
  if (presentation.action === "prepare" || presentation.action === "retry") {
    return (
      <Button
        fullWidth
        loading={isPreparing}
        onPress={onPrepare}
        testID="canvas-prepare-selected-source"
        variant="primary"
      >
        {presentation.action === "retry" ? "Try preparation again" : "Prepare file"}
      </Button>
    );
  }
  return (
    <Button
      disabled={presentation.action !== "preview"}
      fullWidth
      loading={isPreviewing}
      onPress={onPreview}
      testID="canvas-preview-selected-source"
      variant="primary"
    >
      {isPreviewing
        ? source.type === "file"
          ? "Reading prepared file"
          : "Checking source"
        : "Check source"}
    </Button>
  );
}

function BlockSelectionStage({
  isPreviewing,
  onChangeSource,
  onClear,
  onPreview,
  onToggleBlock,
  selectedBlockIds,
  source,
  structure,
}: {
  readonly isPreviewing: boolean;
  readonly onChangeSource: () => void;
  readonly onClear: () => void;
  readonly onPreview: () => void;
  readonly onToggleBlock: (block: CanvasStructuredBlock) => void;
  readonly selectedBlockIds: readonly string[];
  readonly source: CanvasReviewerSourceDescriptor;
  readonly structure: CanvasSourceStructurePayload;
}) {
  const selected = new Set(selectedBlockIds);
  const exceedsLimit =
    selectedBlockIds.length > structure.limits.maximumSelectedBlocks;

  return (
    <View style={styles.stack} testID="canvas-block-selection-stage">
      <Card accent style={styles.blockSelectionHeader}>
        <Text style={styles.sectionLabel}>SELECT STUDY MATERIAL</Text>
        <View style={styles.previewSourceHeader}>
          <SourceTypeIcon type={source.type} />
          <View style={styles.sourceBody}>
            <Text style={styles.cardTitle}>{source.title}</Text>
            <Text style={styles.statusText}>{formatCanvasSourceType(source.type)}</Text>
          </View>
        </View>
        <Text style={styles.bodyText}>
          Choose the blocks that should become the reviewer. Selected blocks stay
          in their original source order.
        </Text>
        <View style={styles.selectionActions}>
          <Text
            accessibilityLiveRegion="polite"
            style={exceedsLimit ? styles.selectionCountError : styles.selectionCount}
            testID="canvas-selected-block-count"
          >
            {selectedBlockIds.length.toLocaleString()} of{" "}
            {structure.limits.maximumSelectedBlocks.toLocaleString()} blocks selected
          </Text>
          <Button
            disabled={selectedBlockIds.length === 0 || isPreviewing}
            onPress={onClear}
            testID="canvas-clear-block-selection"
            variant="ghost"
          >
            Clear selection
          </Button>
        </View>
      </Card>

      {structure.sources.map((structuredSource) => (
        <View key={`${structuredSource.ordinal}:${structuredSource.title}`} style={styles.section}>
          {structure.sources.length > 1 ? (
            <Text style={styles.sectionLabel}>{structuredSource.title}</Text>
          ) : null}
          <Card style={styles.blockListCard}>
            {structuredSource.blocks.map((block, index) => {
              const isSelected = selected.has(block.id);
              return (
                <Pressable
                  accessibilityLabel={`${isSelected ? "Deselect" : "Select"} ${formatCanvasBlockKind(block.kind)} block`}
                  accessibilityRole="checkbox"
                  accessibilityState={{
                    checked: isSelected,
                    disabled: !block.selectable || isPreviewing,
                  }}
                  disabled={!block.selectable || isPreviewing}
                  key={block.id}
                  onPress={() => onToggleBlock(block)}
                  style={({ pressed }) => [
                    styles.blockRow,
                    index < structuredSource.blocks.length - 1
                      ? styles.sourceRowBorder
                      : null,
                    blockHierarchyIndent(block),
                    isSelected ? styles.blockRowSelected : null,
                    !block.selectable ? styles.sourceRowDisabled : null,
                    pressed ? styles.pressed : null,
                  ]}
                  testID={`canvas-block-${block.id}`}
                >
                  <View
                    style={[
                      styles.checkbox,
                      isSelected ? styles.checkboxSelected : null,
                    ]}
                  >
                    {isSelected ? (
                      <Check color={colors.accentText} size={15} strokeWidth={2.5} />
                    ) : null}
                  </View>
                  <View style={styles.blockBody}>
                    <Text style={styles.blockKind}>
                      {formatCanvasBlockKind(block.kind)}
                      {formatCanvasBlockLocation(block)}
                    </Text>
                    <Text
                      numberOfLines={block.kind === "heading" ? 3 : 5}
                      style={
                        block.kind === "heading"
                          ? styles.blockHeadingText
                          : styles.blockPreviewText
                      }
                    >
                      {canvasBlockPreview(block.text)}
                    </Text>
                    {!block.selectable ? (
                      <Text style={styles.statusText}>Context only</Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </Card>
        </View>
      ))}

      <Button
        disabled={selectedBlockIds.length === 0 || exceedsLimit}
        fullWidth
        loading={isPreviewing}
        onPress={onPreview}
        testID="canvas-preview-selected-blocks"
        variant="primary"
      >
        Preview selected blocks
      </Button>
      {selectedBlockIds.length === 0 ? (
        <Text style={styles.prerequisiteCopy} testID="canvas-zero-selection-guard">
          Select at least one block to preview.
        </Text>
      ) : null}
      <Button
        disabled={isPreviewing}
        fullWidth
        onPress={onChangeSource}
        variant="secondary"
      >
        Change source
      </Button>
    </View>
  );
}

function PreviewStage({
  activeJob,
  isGenerating,
  onBack,
  onCancel,
  onChangeText,
  onGenerate,
  onRetry,
  preview,
  source,
  sourceText,
}: {
  readonly activeJob: ProcessingJobStatusView | null;
  readonly isGenerating: boolean;
  readonly onBack: () => void;
  readonly onCancel: () => void;
  readonly onChangeText: (value: string) => void;
  readonly onGenerate: () => void;
  readonly onRetry: () => void;
  readonly preview: CanvasReviewerSourcePreviewPayload;
  readonly source: CanvasReviewerSourceDescriptor | null;
  readonly sourceText: string;
}) {
  return (
    <View style={styles.stack} testID="canvas-source-preview-editor">
      <Card style={styles.previewCard}>
        <Text style={styles.sectionLabel}>SOURCE</Text>
        <View style={styles.previewSourceHeader}>
          <FileText color={colors.textSecondary} size={20} strokeWidth={1.7} />
          <View style={styles.sourceBody}>
            <Text style={styles.cardTitle}>{source?.title ?? "Canvas source"}</Text>
            <Text style={styles.statusText}>
              {source ? formatCanvasSourceType(source.type) : "Course item"}
            </Text>
          </View>
        </View>
        <Text style={styles.bodyText}>
          This is the exact study text the reviewer will use. Edit only what you
          want corrected or removed.
        </Text>
        <Text style={styles.selectionSummary} testID="canvas-preview-block-count">
          {preview.selectedBlockCount?.toLocaleString() ?? "Selected"}{" "}
          {preview.selectedBlockCount === 1 ? "block" : "blocks"} in this server preview
        </Text>
        <TextField
          editable={!isGenerating}
          inputStyle={styles.sourceTextInput}
          label="Reviewer source text"
          multiline
          onChangeText={onChangeText}
          testID="canvas-preview-source-input"
          textAlignVertical="top"
          value={sourceText}
        />
        <Text style={styles.characterCount}>
          {sourceText.length.toLocaleString()} characters
        </Text>
        <Text style={styles.prerequisiteCopy}>
          {sourceText.trim()
            ? "Ready to create a reviewer."
            : "Keep at least one readable line to continue."}
        </Text>
        {!activeJob ? (
          <Button
            disabled={!sourceText.trim()}
            fullWidth
            loading={isGenerating}
            onPress={onGenerate}
            testID="canvas-generate-reviewer-button"
            variant="primary"
          >
            Create reviewer
          </Button>
        ) : null}
        <Button disabled={isGenerating} fullWidth onPress={onBack} variant="secondary">
          Change selection
        </Button>
      </Card>
      {isGenerating && !activeJob ? (
        <StatusCard
          message="Keep Stay Focused open until the reviewer job is accepted."
          loading
          title="Starting reviewer generation"
        />
      ) : null}
      {activeJob ? (
        <CanvasReviewerJobCard
          job={activeJob}
          onCancel={onCancel}
          onRetry={onRetry}
        />
      ) : null}
    </View>
  );
}

function CanvasReviewerJobCard({
  job,
  onCancel,
  onRetry,
}: {
  readonly job: ProcessingJobStatusView;
  readonly onCancel: () => void;
  readonly onRetry: () => void;
}) {
  const active = isActiveProcessingJobStatus(job.status);
  const hasUnits =
    job.progress.completedUnits !== null &&
    job.progress.totalUnits !== null &&
    job.progress.unitLabel !== null;
  return (
    <Card style={styles.previewCard} testID="canvas-reviewer-job-status">
      <Text style={styles.cardTitle}>{processingJobLabel(job)}</Text>
      <Text style={styles.statusText}>{job.progress.message}</Text>
      {hasUnits ? (
        <Text style={styles.statusText}>
          {job.progress.completedUnits} of {job.progress.totalUnits}{" "}
          {job.progress.unitLabel} processed
        </Text>
      ) : null}
      {active ? (
        <Text style={styles.bodyText}>
          Reviewer generation started. You can switch apps; processing will continue on
          the server.
        </Text>
      ) : null}
      {job.safeErrorMessage ? (
        <Text style={styles.errorText}>{job.safeErrorMessage}</Text>
      ) : null}
      <Text style={styles.characterCount}>
        Latest update: {new Date(job.updatedAt).toLocaleString()}
      </Text>
      {job.status === "queued" || job.status === "running" ? (
        <Button fullWidth onPress={onCancel} variant="secondary">
          Cancel
        </Button>
      ) : null}
      {job.status === "failed" && job.retryable ? (
        <Button fullWidth onPress={onRetry} variant="primary">
          Retry
        </Button>
      ) : null}
    </Card>
  );
}

function SaveCanvasReviewerPanel({
  isSaving,
  onChangeTitle,
  onOpenLibrary,
  onSave,
  savedReviewer,
  saveError,
  saveTitle,
  sourceSnapshotReady,
}: {
  readonly isSaving: boolean;
  readonly onChangeTitle: (value: string) => void;
  readonly onOpenLibrary: () => void;
  readonly onSave: () => void;
  readonly savedReviewer: SavedReviewerSummary | null;
  readonly saveError: CanvasSourceDisplayError | null;
  readonly saveTitle: string;
  readonly sourceSnapshotReady: boolean;
}) {
  return (
    <Card accent style={styles.previewCard} testID="canvas-reviewer-save-card">
      <Text style={styles.sectionLabel}>REVIEWER READY</Text>
      <Text style={styles.cardTitle}>
        {savedReviewer ? "Saved to Study Library" : "Save this reviewer"}
      </Text>
      <Text style={styles.bodyText}>
        {savedReviewer
          ? "The saved copy keeps its verified Canvas source snapshot."
          : "Save a source-bound copy so you can return to it from Study Library."}
      </Text>
      <TextField
        editable={!savedReviewer && !isSaving}
        label="Reviewer title"
        onChangeText={onChangeTitle}
        testID="canvas-reviewer-save-title-input"
        value={saveTitle}
      />
      {!sourceSnapshotReady ? (
        <Text style={styles.prerequisiteCopy}>
          Create the reviewer again before saving.
        </Text>
      ) : null}
      {saveError ? <ErrorCard error={saveError} /> : null}
      {isSaving ? (
        <View accessibilityLiveRegion="polite" style={styles.progressRow}>
          <ActivityIndicator color={colors.accent} size="small" />
          <Text style={styles.statusText}>Saving to Study Library.</Text>
        </View>
      ) : null}
      {savedReviewer ? (
        <View accessibilityLiveRegion="polite" style={styles.successBox}>
          <Check color={colors.success} size={18} strokeWidth={2} />
          <Text style={styles.successText}>Reviewer saved.</Text>
        </View>
      ) : null}
      <Button
        disabled={Boolean(savedReviewer) || !saveTitle.trim() || !sourceSnapshotReady}
        fullWidth
        loading={isSaving}
        onPress={onSave}
        testID="canvas-reviewer-save-button"
        variant="primary"
      >
        {savedReviewer ? "Saved" : "Save reviewer"}
      </Button>
      <Button disabled={isSaving} fullWidth onPress={onOpenLibrary} variant="secondary">
        Open Study Library
      </Button>
    </Card>
  );
}

function StatusCard({
  loading = false,
  message,
  testID,
  title,
}: {
  readonly loading?: boolean;
  readonly message: string;
  readonly testID?: string;
  readonly title: string;
}) {
  return (
    <Card
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={styles.statusCard}
      testID={testID}
    >
      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      <View style={styles.sourceBody}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.bodyText}>{message}</Text>
      </View>
    </Card>
  );
}

function ErrorCard({ error }: { readonly error: CanvasSourceDisplayError }) {
  return (
    <View accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.errorBox}>
      <AlertCircle color={colors.error} size={20} strokeWidth={1.8} />
      <View style={styles.sourceBody}>
        <Text style={styles.errorTitle}>{error.title}</Text>
        <Text style={styles.errorText}>{error.message}</Text>
      </View>
    </View>
  );
}

function createRequestContext(accessToken: string | undefined):
  | {
      readonly ok: true;
      readonly value: { readonly apiBaseUrl: string; readonly accessToken: string };
    }
  | { readonly ok: false; readonly error: CanvasSourceDisplayError } {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    return {
      error: { message: API_BASE_URL_SETUP_HINT, title: "API address needs setup" },
      ok: false,
    };
  }
  const token = accessToken?.trim();
  if (!token) {
    return {
      error: {
        message: "Sign in again before using Canvas course content.",
        title: "Session expired",
      },
      ok: false,
    };
  }
  return { ok: true, value: { accessToken: token, apiBaseUrl } };
}

function terminalStatusForCanvasError(
  error: CanvasApiClientError,
): Exclude<CanvasResolutionStatus, "idle" | "pending" | "usable"> {
  if (error.code === "ocr_empty") return "empty";
  if (error.code === "unsupported_file_type") return "unsupported";
  if (
    error.code === "source_not_found" ||
    error.code === "source_unavailable" ||
    error.code === "course_not_found" ||
    error.code === "course_not_selected"
  ) {
    return "inaccessible";
  }
  return "failed";
}

function formatCanvasSourceError(
  error: CanvasApiClientError,
): CanvasSourceDisplayError {
  switch (error.code) {
    case "course_not_selected":
      return {
        message: "Select and synchronize this course before creating a reviewer.",
        title: "Course is not ready",
      };
    case "course_not_found":
    case "source_not_found":
    case "source_unavailable":
      return { message: "Choose another synchronized item.", title: "Item unavailable" };
    case "source_preparation_required":
      return { message: "Prepare this file before checking its text.", title: "Preparation needed" };
    case "stored_file_missing":
    case "stored_file_corrupt":
      return { message: "Prepare this file again, then retry.", title: "File needs preparation" };
    case "unsupported_file_type":
      return { message: "This item type cannot create a reviewer yet.", title: "Item not supported" };
    case "ocr_empty":
      return { message: "Choose a clearer scan or another item.", title: "No readable text found" };
    case "pdf_encrypted":
      return { message: "Choose an unlocked PDF or another item.", title: "PDF is locked" };
    case "pdf_page_limit_exceeded":
      return { message: "Choose a shorter PDF that fits the current document limit.", title: "PDF is too long" };
    case "ocr_not_configured":
    case "ocr_failed":
    case "storage_read_failed":
      return { message: "Try preparation again later or choose another item.", title: "File could not be read" };
    case "structure_session_invalid":
    case "structure_session_not_found":
    case "structure_session_expired":
      return { message: "Load this source's blocks again before previewing.", title: "Block selection expired" };
    case "structure_too_large":
      return { message: error.message, title: "Source has too many blocks" };
    case "block_selection_empty":
      return { message: "Select at least one Canvas block.", title: "Choose study material" };
    case "block_selection_limit_exceeded":
      return { message: error.message, title: "Choose fewer blocks" };
    case "block_selection_invalid":
    case "block_selection_duplicate":
      return { message: "Choose the Canvas blocks again.", title: "Selection changed" };
    case "source_preview_too_large":
      return { message: error.message, title: "Selection is too large" };
    case "unauthorized":
    case "missing_access_token":
      return { message: "Sign in again before continuing.", title: "Session expired" };
    case "network_error":
      return { message: "Check your connection and try again.", title: "Could not reach Stay Focused" };
    default:
      return { message: "Try again or choose another course item.", title: "Course content could not load" };
  }
}

function formatProcessingJobError(
  error: ProcessingJobApiError,
): CanvasSourceDisplayError {
  if (error.code === "source_text_too_large" || error.status === 413) {
    return {
      message: "Shorten the edited preview, then try again.",
      title: "Preview is too long",
    };
  }
  if (error.code === "unauthorized" || error.code === "missing_access_token") {
    return {
      message: "The server job continues independently. Sign in again to retrieve it.",
      title: "Session expired",
    };
  }
  if (error.code === "request_timeout" || error.code === "network_error") {
    return {
      message:
        "The connection was interrupted. Any accepted server job was not cancelled; reconnect to check it.",
      title: "Status temporarily unavailable",
    };
  }
  if (
    canvasGenerationNeedsNewPreview(error.code)
  ) {
    return {
      message: "The Canvas selection changed or expired. Create a new selective preview before generating.",
      title: "New preview required",
    };
  }
  return {
    message: error.message,
    title: error.retryable ? "Reviewer needs attention" : "Request needs a change",
  };
}

function processingJobLabel(job: ProcessingJobStatusView): string {
  if (job.status === "queued") return "Waiting to start";
  if (job.status === "succeeded") return "Complete";
  if (job.status === "failed" || job.status === "expired") return "Needs attention";
  if (job.status === "cancelled") return "Cancelled";
  if (job.status === "cancellation_requested") return "Stopping safely";
  switch (job.stage) {
    case "preparing_source":
    case "normalizing_source":
      return "Preparing source";
    case "detecting_outline":
    case "planning_sections":
      return "Organizing topics";
    case "generating_sections":
      return "Creating reviewer sections";
    case "verifying_coverage":
    case "retrying_sections":
      return "Checking coverage";
    default:
      return "Finishing reviewer";
  }
}

function formatLibraryError(error: ReviewerLibraryError): CanvasSourceDisplayError {
  if (error.code === "unauthorized") {
    return { message: "Sign in again before saving.", title: "Session expired" };
  }
  if (
    error.code === "source_snapshot_required" ||
    error.code === "source_snapshot_not_found" ||
    error.code === "source_snapshot_metadata_mismatch"
  ) {
    return {
      message: "Create the reviewer again from the current preview before saving.",
      title: "Source snapshot changed",
    };
  }
  return { message: "Try saving again.", title: "Reviewer could not be saved" };
}

function resolutionStatusCopy(status: CanvasResolutionStatus): string {
  switch (status) {
    case "idle":
      return "";
    case "pending":
      return "Checking this source.";
    case "usable":
      return "Source text is ready.";
    case "empty":
      return "No study text was found.";
    case "unsupported":
      return "This item type is not supported yet.";
    case "inaccessible":
      return "This item is unavailable.";
    case "failed":
      return "Stay Focused could not read this item.";
  }
}

function formatCanvasBlockKind(kind: CanvasStructuredBlock["kind"]): string {
  switch (kind) {
    case "heading":
      return "Heading";
    case "paragraph":
      return "Paragraph";
    case "list_item":
      return "List item";
    case "table":
      return "Table";
    case "quote":
      return "Quote";
    case "code":
      return "Code";
  }
}

function formatCanvasBlockLocation(block: CanvasStructuredBlock): string {
  if (block.pageNumber) return ` · Page ${block.pageNumber}`;
  if (block.slideNumber) return ` · Slide ${block.slideNumber}`;
  return "";
}

function blockHierarchyIndent(block: CanvasStructuredBlock): { paddingLeft: number } {
  const headingDepth = block.headingLevel ? Math.max(0, block.headingLevel - 1) : 0;
  const listDepth = block.listDepth ?? 0;
  const contentDepth = block.kind === "heading" ? headingDepth : listDepth + 1;
  return { paddingLeft: spacing[4] + Math.min(contentDepth, 5) * spacing[2] };
}

const styles = StyleSheet.create({
  content: { gap: spacing[5] },
  stack: { gap: spacing[4] },
  header: { alignItems: "flex-start", flexDirection: "row", gap: spacing[3] },
  headerText: { flex: 1, gap: spacing[1] },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.cardElevated,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: hitTarget.min,
    justifyContent: "center",
    width: hitTarget.min,
  },
  pressed: { opacity: 0.75 },
  sectionLabel: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.kicker,
    fontWeight: "800",
    letterSpacing: 1.15,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h1,
    fontWeight: "800",
    lineHeight: 31,
  },
  courseName: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    lineHeight: 22,
  },
  freshnessRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing[2],
    paddingHorizontal: spacing[1],
  },
  section: { gap: spacing[2] },
  sourceCard: { gap: 0, padding: 0, overflow: "hidden" },
  sourceRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing[3],
    minHeight: 72,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  sourceRowBorder: { borderBottomColor: colors.border, borderBottomWidth: 1 },
  sourceRowSelected: { backgroundColor: colors.cardPressed },
  sourceRowDisabled: { opacity: 0.62 },
  sourceIcon: {
    alignItems: "center",
    backgroundColor: colors.cardElevated,
    borderRadius: radius.tight,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  sourceBody: { flex: 1, gap: spacing[1] },
  sourceTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    fontWeight: "700",
    lineHeight: 21,
  },
  sourceMeta: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.caption,
    lineHeight: 17,
  },
  statusRow: { alignItems: "center", flexDirection: "row", gap: spacing[1] },
  statusText: {
    color: colors.textMuted,
    flexShrink: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
  radio: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  radioSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  actionCard: { gap: spacing[3] },
  blockSelectionHeader: { gap: spacing[3] },
  selectionActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
    justifyContent: "space-between",
  },
  selectionCount: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    fontWeight: "700",
  },
  selectionCountError: {
    color: colors.error,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    fontWeight: "800",
  },
  blockListCard: { gap: 0, overflow: "hidden", padding: 0 },
  blockRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing[3],
    minHeight: hitTarget.min,
    paddingBottom: spacing[3],
    paddingRight: spacing[4],
    paddingTop: spacing[3],
  },
  blockRowSelected: { backgroundColor: colors.cardPressed },
  checkbox: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: radius.tight,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    marginTop: 1,
    width: 24,
  },
  checkboxSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  blockBody: { flex: 1, gap: spacing[1] },
  blockKind: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.kicker,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  blockHeadingText: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h3,
    fontWeight: "800",
    lineHeight: 22,
  },
  blockPreviewText: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    lineHeight: 22,
  },
  previewCard: { gap: spacing[4] },
  previewSourceHeader: { alignItems: "center", flexDirection: "row", gap: spacing[3] },
  cardTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h3,
    fontWeight: "800",
    lineHeight: 22,
  },
  bodyText: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    lineHeight: 23,
  },
  sourceTextInput: { minHeight: SOURCE_TEXT_HEIGHT, lineHeight: 23 },
  characterCount: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.caption,
    textAlign: "right",
  },
  prerequisiteCopy: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
  selectionSummary: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    fontWeight: "700",
    lineHeight: 19,
  },
  statusCard: { alignItems: "center", flexDirection: "row", gap: spacing[3] },
  errorBox: {
    alignItems: "flex-start",
    backgroundColor: colors.errorSurface,
    borderColor: colors.error,
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing[3],
    padding: spacing[4],
  },
  errorTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    fontWeight: "800",
    lineHeight: 21,
  },
  errorText: {
    color: colors.error,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
  successBox: {
    alignItems: "center",
    backgroundColor: colors.successSurface,
    borderColor: colors.success,
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing[2],
    padding: spacing[3],
  },
  progressRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing[2],
  },
  successText: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    fontWeight: "700",
  },
});
