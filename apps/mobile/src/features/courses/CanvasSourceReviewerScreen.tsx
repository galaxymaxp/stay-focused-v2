import { router } from "expo-router";
import { useMemo ,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { useLegacyTheme, type LegacyColors } from "../../design/theme";
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
import { hitTarget, radius, spacing, typography } from "../../design/tokens";
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
  listProcessingJobsPage,
  MOBILE_JOB_POLL_INTERVAL_MS,
  retryProcessingJob,
  type ProcessingJobApiError,
} from "../../services/processingJobsApi";
import {
  removeActiveProcessingJob,
  upsertActiveProcessingJob,
} from "../../services/activeProcessingJobStore";
import {
  acceptCanvasReviewerRecovery,
  beginCanvasReviewerRecovery,
  findCanvasReviewerRecoveryCandidate,
  isUncertainCanvasReviewerSubmissionExpired,
  matchesCanvasReviewerRecoveryJob,
  prepareCanvasReviewerRetryRecovery,
  readCanvasReviewerRecovery,
  removeCanvasReviewerRecovery,
  shouldDiscardCanvasReviewerRecoveryAfterStatusError,
  type CanvasReviewerRecoveryRecord,
} from "../../services/canvasReviewerRecoveryStore";
import { cacheCompletedArtifact } from "../../services/completedArtifactCache";
import { API_CONFIGURATION_MESSAGE } from "../../config/apiBaseUrlResolution";
import {
  saveReviewer,
  type ReviewerLibraryError,
  type SavedReviewerSummary,
} from "../../services/reviewerLibraryApi";
import { ReviewerPreview } from "../reviewer/ReviewerPreview";
import {
  canvasBlockPreview,
  countSelectableCanvasBlocks,
  createCanvasBlockSelectionKey,
  createDefaultCanvasBlockSelection,
  describeCanvasBlockSelection,
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
  describeSelectivePreviewScope,
  formatCanvasSourceType,
  groupCanvasSourcesForSelection,
  mergeCanvasSourceListPages,
  presentCanvasSourceCapability,
  sourceSelectionHelp,
} from "./canvasSourcePresentation";
import {
  canvasReviewerProgressLabel,
  canvasSourceModuleLabel,
  createCanvasReviewerJobDraft,
  persistCanvasReviewerAutomatically,
} from "./canvasStudyWorkflow";

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
  const colors = useLegacyTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
  const [isRestoringReviewerJob, setIsRestoringReviewerJob] = useState(true);
  const [activeReviewerJob, setActiveReviewerJob] =
    useState<ProcessingJobStatusView | null>(null);
  const [appIsActive, setAppIsActive] = useState(
    AppState.currentState === "active",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showSourceDetails, setShowSourceDetails] = useState(false);

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
  const recoveryRecordRef = useRef<CanvasReviewerRecoveryRecord | null>(null);
  const recoveryLockRef = useRef(false);
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
    setShowSourceDetails(false);
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
      setShowSourceDetails(false);
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

  const submitReviewerJob = async ({
    previewToGenerate,
    requestToken,
    selectionKey,
    sourceText,
    sourceTitle,
  }: {
    readonly previewToGenerate: CanvasReviewerSourcePreviewPayload;
    readonly requestToken: number;
    readonly selectionKey: string;
    readonly sourceText: string;
    readonly sourceTitle: string;
  }) => {
    if (isGenerating || !tryBeginCanvasSingleFlight(generationLockRef)) return;
    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      finishCanvasSingleFlight(generationLockRef);
      setError(context.error);
      return;
    }

    const finalSourceText = sourceText.trim();
    if (!finalSourceText) {
      setError({
        message: "This material does not contain readable study text.",
        title: "Material is empty",
      });
      finishCanvasSingleFlight(generationLockRef);
      return;
    }
    if (finalSourceText.length > previewToGenerate.limits.existingReviewerRequestLimit) {
      setError({
        message: "Choose a smaller part of this material and try again.",
        title: "Material is too long",
      });
      finishCanvasSingleFlight(generationLockRef);
      return;
    }

    const idempotencyKey =
      generationIdempotencyKeyRef.current ??
      createProcessingJobIdempotencyKey("reviewer_generation");
    generationIdempotencyKeyRef.current = idempotencyKey;
    const ownerUserId = session?.user.id;
    if (!ownerUserId) {
      finishCanvasSingleFlight(generationLockRef);
      setError({
        message: "Sign in again before creating a reviewer.",
        title: "Login session expired",
      });
      return;
    }
    let recoveryRecord: CanvasReviewerRecoveryRecord;
    try {
      recoveryRecord = await beginCanvasReviewerRecovery({
        ownerUserId,
        requestIdempotencyKey: idempotencyKey,
        courseId,
        courseName: sourceList?.courseName || courseName,
        canvasItemIds: previewToGenerate.sources.map((source) => source.id),
        canvasResolutionFingerprint: previewToGenerate.resolutionFingerprint,
        sourceTitle,
        sourceCharacterCount: finalSourceText.length,
      });
      recoveryRecordRef.current = recoveryRecord;
    } catch {
      finishCanvasSingleFlight(generationLockRef);
      setError({
        message: "Stay Focused could not safely remember this request. Try again.",
        title: "Reviewer could not start safely",
      });
      return;
    }
    pendingGenerationRef.current = {
      requestToken,
      resolutionFingerprint: previewToGenerate.resolutionFingerprint,
      selectionKey,
      sourceText: finalSourceText,
      sourceTitle,
    };
    setIsGenerating(true);
    setError(null);
    setReviewer(null);
    setSourceSnapshotId(null);
    setGeneratedBinding(null);
    setSavedReviewer(null);

    let accepted = false;
    try {
      const draft = createCanvasReviewerJobDraft({
        courseId,
        preview: previewToGenerate,
        sourceText: finalSourceText,
        sourceTitle,
      });
      const result = await createReviewerJob({
        ...context.value,
        ...draft,
        idempotencyKey,
      });
      if (
        resolutionTokenRef.current !== requestToken ||
        currentResolutionSelectionKeyRef.current !== selectionKey
      ) {
        return;
      }
      if (result.ok) {
        let acceptedRecovery: CanvasReviewerRecoveryRecord | null;
        try {
          acceptedRecovery = await acceptCanvasReviewerRecovery(
            recoveryRecord,
            result.data,
          );
        } catch {
          setIsRestoringReviewerJob(true);
          setError({
            message:
              "The server accepted this reviewer. Stay Focused will reconnect without starting another one.",
            title: "Recovering accepted reviewer",
          });
          return;
        }
        if (!acceptedRecovery) {
          finishCanvasSingleFlight(generationLockRef);
          setIsGenerating(false);
          setError({
            message: "The accepted job did not match the selected material.",
            title: "Reviewer recovery was stopped safely",
          });
          return;
        }
        accepted = true;
        recoveryRecordRef.current = acceptedRecovery;
        setActiveReviewerJob(result.data);
        router.push({ pathname: "/generation", params: { id: result.data.id } });
        try {
          await upsertActiveProcessingJob(ownerUserId, result.data);
        } catch {
          // The Canvas recovery record is authoritative for relaunch recovery.
        }
        generationIdempotencyKeyRef.current = null;
      } else {
        const displayError = formatProcessingJobError(result.error);
        if (canvasGenerationNeedsNewPreview(result.error.code)) {
          clearPreviewState(selectionKey);
        }
        setError(displayError);
        if (
          !result.error.retryable ||
          (result.error.code !== "network_error" &&
            result.error.code !== "request_timeout")
        ) {
          await removeCanvasReviewerRecovery(ownerUserId);
          recoveryRecordRef.current = null;
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

  const handlePreview = async (generateAfterPreview = false) => {
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
        if (generateAfterPreview) {
          await submitReviewerJob({
            previewToGenerate: result.data,
            requestToken,
            selectionKey: activeSelectionKey,
            sourceText: result.data.sourceText,
            sourceTitle: selectedSource.title,
          });
        }
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
      const ownerUserId = session?.user.id;
      if (ownerUserId) void removeCanvasReviewerRecovery(ownerUserId);
      recoveryRecordRef.current = null;
      setActiveReviewerJob(null);
    }
    dispatchResolution({ sourceText: value, type: "edited" });
    invalidateGeneratedOutput();
    setError(null);
  };

  const handleReturnToBlockSelection = () => {
    if (activeReviewerJob && !isActiveProcessingJobStatus(activeReviewerJob.status)) {
      void removeActiveProcessingJob(activeReviewerJob.id);
      const ownerUserId = session?.user.id;
      if (ownerUserId) void removeCanvasReviewerRecovery(ownerUserId);
      recoveryRecordRef.current = null;
      setActiveReviewerJob(null);
    }
    clearPreviewState(blockSelectionKey);
  };

  const persistCompletedReviewer = useCallback(
    async ({
      courseLabel,
      output,
      requestToken,
      snapshotId,
      sourceCharacterCount,
      sourceTitle,
      title,
    }: {
      readonly courseLabel: string;
      readonly output: ReviewerOutput;
      readonly requestToken: number;
      readonly snapshotId: string;
      readonly sourceCharacterCount: number;
      readonly sourceTitle: string;
      readonly title: string;
    }): Promise<SavedReviewerSummary | null> => {
      if (!tryBeginCanvasSingleFlight(saveLockRef)) return null;
      const context = createRequestContext(session?.accessToken);
      if (!context.ok) {
        finishCanvasSingleFlight(saveLockRef);
        setSaveError(context.error);
        return null;
      }

      saveAbortRef.current?.abort();
      const controller = new AbortController();
      saveAbortRef.current = controller;
      setIsSaving(true);
      setSaveError(null);

      try {
        const result = await persistCanvasReviewerAutomatically(
          {
            courseName: courseLabel,
            reviewer: output,
            sourceSnapshotId: snapshotId,
            sourceCharacterCount,
            sourceTitle,
            title,
          },
          (draft) =>
            saveReviewer({
              ...context.value,
              ...draft,
              signal: controller.signal,
            }),
        );
        if (resolutionTokenRef.current !== requestToken) return null;
        if (result.ok) {
          setSavedReviewer(result.data);
          setSaveTitle(result.data.title);
          return result.data;
        } else {
          setSaveError(formatLibraryError(result.error));
          return null;
        }
      } finally {
        if (resolutionTokenRef.current === requestToken) {
          saveAbortRef.current = null;
          finishCanvasSingleFlight(saveLockRef);
          setIsSaving(false);
        }
      }
    },
    [session?.accessToken],
  );

  const applyObservedReviewerJob = useCallback(
    async (job: ProcessingJobStatusView): Promise<void> => {
      const context = createRequestContext(session?.accessToken);
      const ownerUserId = session?.user.id;
      if (!context.ok || !ownerUserId) return;

      const recovery = recoveryRecordRef.current;
      if (!recovery || !matchesCanvasReviewerRecoveryJob(recovery, job)) {
        await Promise.all([
          removeActiveProcessingJob(job.id),
          removeCanvasReviewerRecovery(ownerUserId),
        ]);
        recoveryRecordRef.current = null;
        finishCanvasSingleFlight(generationLockRef);
        setIsGenerating(false);
        setError({
          message: "The saved recovery details did not match this server job.",
          title: "Reviewer recovery was stopped safely",
        });
        return;
      }

      setActiveReviewerJob(job);
      try {
        await upsertActiveProcessingJob(ownerUserId, job);
      } catch {
        // The job-specific Canvas recovery record remains authoritative.
      }
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

      const snapshotId = result.data.sourceSnapshotId ?? null;
      const sourceTitle =
        pending?.sourceTitle.trim() ||
        recovery.sourceTitle ||
        selectedSource?.title.trim() ||
        result.data.reviewer.title.trim() ||
        "Canvas reviewer";
      const title = sourceTitle;
      const requestToken = pending?.requestToken ?? resolutionTokenRef.current;
      setReviewer(result.data.reviewer);
      setSourceSnapshotId(snapshotId);
      setSaveTitle(title);
      setActiveReviewerJob(null);
      if (pending) {
        setGeneratedBinding({
          fingerprint: pending.resolutionFingerprint,
          selectionKey: pending.selectionKey,
          sourceText: pending.sourceText,
        });
      }
      pendingGenerationRef.current = null;
      generationIdempotencyKeyRef.current = null;
      if (snapshotId) {
        const persisted = await persistCompletedReviewer({
          courseLabel: recovery.courseName,
          output: result.data.reviewer,
          requestToken,
          snapshotId,
          sourceCharacterCount: recovery.sourceCharacterCount,
          sourceTitle,
          title,
        });
        if (persisted) {
          await Promise.all([
            removeActiveProcessingJob(job.id),
            removeCanvasReviewerRecovery(ownerUserId, job.id),
          ]);
          recoveryRecordRef.current = null;
        }
      } else {
        setSaveError({
          message: "Try creating the reviewer again before saving it.",
          title: "Reviewer could not be saved automatically",
        });
      }
    },
    [
      persistCompletedReviewer,
      selectedSource?.title,
      session?.accessToken,
      session?.user.id,
    ],
  );

  const restoreReviewerJob = useCallback(async (): Promise<void> => {
    if (recoveryLockRef.current) return;
    const context = createRequestContext(session?.accessToken);
    const ownerUserId = session?.user.id;
    if (!context.ok || !ownerUserId) {
      setIsRestoringReviewerJob(false);
      return;
    }
    recoveryLockRef.current = true;
    try {
      let recovery = await readCanvasReviewerRecovery(ownerUserId);
      if (!recovery || recovery.courseId !== courseId) {
        recoveryRecordRef.current = null;
        setIsRestoringReviewerJob(false);
        return;
      }
      recoveryRecordRef.current = recovery;

      let job: ProcessingJobStatusView | null = null;
      if (recovery.jobId) {
        const status = await getProcessingJobStatus({
          ...context.value,
          jobId: recovery.jobId,
        });
        if (!status.ok) {
          if (shouldDiscardCanvasReviewerRecoveryAfterStatusError(status.error)) {
            await removeCanvasReviewerRecovery(ownerUserId);
            recoveryRecordRef.current = null;
            setIsRestoringReviewerJob(false);
          } else {
            setError(formatProcessingJobError(status.error));
            setIsRestoringReviewerJob(true);
          }
          return;
        }
        job = status.data;
      } else {
        const history = await listProcessingJobsPage({
          ...context.value,
          limit: 20,
        });
        if (!history.ok) {
          setError(formatProcessingJobError(history.error));
          setIsRestoringReviewerJob(true);
          return;
        }
        job = findCanvasReviewerRecoveryCandidate(recovery, history.data.jobs);
        if (!job) {
          if (isUncertainCanvasReviewerSubmissionExpired(recovery)) {
            await removeCanvasReviewerRecovery(ownerUserId);
            recoveryRecordRef.current = null;
            setError({
              message: "No accepted server job was found. You can create the reviewer again.",
              title: "Previous request was not accepted",
            });
            setIsRestoringReviewerJob(false);
          } else {
            setIsRestoringReviewerJob(true);
          }
          return;
        }
        let accepted: CanvasReviewerRecoveryRecord | null;
        try {
          accepted = await acceptCanvasReviewerRecovery(recovery, job);
        } catch {
          setError({
            message:
              "The existing server job is safe. Stay Focused will keep trying to reconnect.",
            title: "Recovery temporarily unavailable",
          });
          setIsRestoringReviewerJob(true);
          return;
        }
        if (!accepted) {
          recoveryRecordRef.current = null;
          setIsRestoringReviewerJob(false);
          setError({
            message: "The discovered job did not match the selected material.",
            title: "Reviewer recovery was stopped safely",
          });
          return;
        }
        recovery = accepted;
        recoveryRecordRef.current = accepted;
      }

      if (!matchesCanvasReviewerRecoveryJob(recovery, job)) {
        await Promise.all([
          removeActiveProcessingJob(job.id),
          removeCanvasReviewerRecovery(ownerUserId),
        ]);
        recoveryRecordRef.current = null;
        setIsRestoringReviewerJob(false);
        setError({
          message: "The server job belongs to different study material.",
          title: "Reviewer recovery was stopped safely",
        });
        return;
      }

      setError(null);
      setIsRestoringReviewerJob(false);
      await applyObservedReviewerJob(job);
    } finally {
      recoveryLockRef.current = false;
    }
  }, [applyObservedReviewerJob, courseId, session?.accessToken, session?.user.id]);

  useEffect(() => {
    void restoreReviewerJob();
  }, [restoreReviewerJob]);

  useEffect(() => {
    if (!appIsActive || !isRestoringReviewerJob) return;
    const timer = setInterval(() => {
      void restoreReviewerJob();
    }, MOBILE_JOB_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [appIsActive, isRestoringReviewerJob, restoreReviewerJob]);

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
      if (shouldDiscardCanvasReviewerRecoveryAfterStatusError(result.error)) {
        const ownerUserId = session?.user.id;
        if (ownerUserId) {
          await Promise.all([
            removeActiveProcessingJob(activeReviewerJob.id),
            removeCanvasReviewerRecovery(ownerUserId),
          ]);
        }
        recoveryRecordRef.current = null;
        setActiveReviewerJob(null);
        setIsGenerating(false);
      }
    }
  }, [
    activeReviewerJob,
    applyObservedReviewerJob,
    session?.accessToken,
    session?.user.id,
  ]);

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
    if (
      !preview ||
      !isCanvasGenerationCurrent(resolution, selectionIds, blockSelectionKey)
    ) {
      setError({
        message: "Check the current source again before creating a reviewer.",
        title: "Source preview changed",
      });
      return;
    }
    await submitReviewerJob({
      previewToGenerate: preview,
      requestToken: resolutionTokenRef.current,
      selectionKey: blockSelectionKey,
      sourceText: resolution.sourceText,
      sourceTitle: resolution.sourceTitle,
    });
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
    const recovery = recoveryRecordRef.current;
    if (!context.ok || !ownerUserId || !activeReviewerJob || !recovery) return;
    const retryIdempotencyKey = createProcessingJobIdempotencyKey(
      "reviewer_generation",
    );
    const result = await retryProcessingJob({
      ...context.value,
      jobId: activeReviewerJob.id,
      idempotencyKey: retryIdempotencyKey,
    });
    if (!result.ok) {
      setError(formatProcessingJobError(result.error));
      return;
    }
    const rebound = await acceptCanvasReviewerRecovery(
      prepareCanvasReviewerRetryRecovery(recovery, retryIdempotencyKey),
      result.data,
    );
    if (!rebound) {
      setError({
        message: "The retry did not match the original study material.",
        title: "Reviewer retry was stopped safely",
      });
      return;
    }
    await removeActiveProcessingJob(activeReviewerJob.id);
    await upsertActiveProcessingJob(ownerUserId, result.data);
    recoveryRecordRef.current = rebound;
    setActiveReviewerJob(result.data);
    setIsGenerating(true);
    setError(null);
  };

  const handleDismissReviewerJob = async () => {
    const ownerUserId = session?.user.id;
    const jobId = activeReviewerJob?.id;
    if (ownerUserId) {
      await Promise.all([
        jobId ? removeActiveProcessingJob(jobId) : Promise.resolve(),
        removeCanvasReviewerRecovery(ownerUserId),
      ]);
    }
    recoveryRecordRef.current = null;
    setActiveReviewerJob(null);
    setIsGenerating(false);
    setError(null);
  };

  const handleSave = async () => {
    if (isSaving || !reviewer) return;
    const finalSourceText = resolution.sourceText.trim();
    const recovery = recoveryRecordRef.current;
    if (!sourceSnapshotId) {
      setSaveError({
        message: "Create the reviewer again from the current preview before saving.",
        title: "Reviewer is no longer current",
      });
      return;
    }
    if (
      !recovery &&
      (!preview || !isCanvasGeneratedBindingCurrent(
        generatedBinding,
        resolution,
        selectionIds,
        blockSelectionKey,
      ))
    ) {
      setSaveError({
        message: "Create the reviewer again from the current preview before saving.",
        title: "Reviewer is no longer current",
      });
      return;
    }
    const title = saveTitle.trim();
    if (!title) {
      setSaveError({ message: "Enter a title before saving.", title: "Title needed" });
      return;
    }
    const persisted = await persistCompletedReviewer({
      courseLabel: recovery?.courseName ?? sourceList?.courseName ?? courseName,
      output: reviewer,
      requestToken: resolutionTokenRef.current,
      snapshotId: sourceSnapshotId,
      sourceCharacterCount:
        recovery?.sourceCharacterCount ?? finalSourceText.length,
      sourceTitle: recovery?.sourceTitle ?? resolution.sourceTitle,
      title,
    });
    const ownerUserId = session?.user.id;
    if (persisted && recovery && ownerUserId) {
      await Promise.all([
        recovery.jobId
          ? removeActiveProcessingJob(recovery.jobId)
          : Promise.resolve(),
        removeCanvasReviewerRecovery(ownerUserId),
      ]);
      recoveryRecordRef.current = null;
    }
  };

  const displayCourseName =
    sourceList?.courseName || recoveryRecordRef.current?.courseName || courseName;
  const stage = reviewer
    ? "STUDY"
    : activeReviewerJob || isGenerating || isRestoringReviewerJob
      ? "CREATING REVIEWER"
      : selectedSourceAction === "preview"
        ? showSourceDetails
          ? preview
            ? "CHECK SOURCE"
            : "CHOOSE SECTIONS"
          : "CHOOSE STUDY ACTION"
        : "CHOOSE SOURCE";

  const showsBlockSelection =
    !isLoadingSources &&
    !reviewer &&
    !preview &&
    showSourceDetails &&
    selectedSourceAction === "preview" &&
    Boolean(selectedSource) &&
    structure !== null;
  const showsPreviewEditor =
    showSourceDetails && !isLoadingSources && !reviewer && preview !== null;

  return (
    <Screen
      contentContainerStyle={styles.content}
      footer={
        !isLoadingSources && reviewer ? (
          <ReviewerSaveFooter
            isSaving={isSaving}
            onSave={() => void handleSave()}
            savedReviewer={savedReviewer}
            saveTitle={saveTitle}
            sourceSnapshotReady={sourceSnapshotId !== null}
          />
        ) : showsPreviewEditor && !activeReviewerJob ? (
          <PreviewActionFooter
            isGenerating={isGenerating}
            onGenerate={() => void handleGenerate()}
            sourceText={resolution.sourceText}
          />
        ) : showsBlockSelection && structure ? (
          <BlockSelectionFooter
            isPreviewing={isPreviewing}
            onPreview={() => void handlePreview()}
            selectedBlockIds={selectedBlockIds}
            structure={structure}
          />
        ) : null
      }
    >
      <Header
        courseName={displayCourseName}
        onBackToCourses={requestBackToCourses}
        stage={stage}
      />

      {error ? <ErrorCard error={error} /> : null}

      {isRestoringReviewerJob ? (
        <StatusCard
          message="Checking the server for your existing reviewer. No new generation will be started."
          loading
          testID="canvas-reviewer-recovery-loading"
          title="Recovering reviewer"
        />
      ) : isLoadingSources ? (
        <StatusCard
          message="Loading the synchronized items for this course."
          loading
          testID="canvas-sources-loading"
          title="Loading course content"
        />
      ) : reviewer ? (
        <View style={styles.readerStack}>
          <ReviewerPreview
            context={{
              courseName: displayCourseName,
              sourceLabel:
                selectedSource?.title ?? recoveryRecordRef.current?.sourceTitle ?? null,
              sourceMode: "canvas",
              selectedBlockCount: selectedBlockIds.length,
            }}
            reviewer={reviewer}
          />
          <SaveCanvasReviewerPanel
            isSaving={isSaving}
            onOpenLibrary={onOpenLibrary}
            savedReviewer={savedReviewer}
            saveError={saveError}
            saveTitle={saveTitle}
            sourceSnapshotReady={sourceSnapshotId !== null}
          />
          <Button onPress={requestChangeSource} variant="secondary">
            Change source
          </Button>
        </View>
      ) : activeReviewerJob ? (
        <CanvasReviewerJobCard
          job={activeReviewerJob}
          onCancel={() => void handleCancelReviewerJob()}
          onDismiss={() => void handleDismissReviewerJob()}
          onRetry={() => void handleRetryReviewerJob()}
        />
      ) : selectedSourceAction === "preview" &&
        selectedSource &&
        !showSourceDetails ? (
        <CanvasStudyActionStage
          courseName={displayCourseName}
          isCreating={isGenerating || isPreviewing}
          isLoadingMaterial={isStructuring}
          material={selectedSource}
          onChangeMaterial={requestChangeSource}
          onChooseSections={() => setShowSourceDetails(true)}
          onCreateReviewer={() => void handlePreview(true)}
          onRetryMaterial={() => setStructureRetryToken((value) => value + 1)}
          structureReady={structure !== null}
        />
      ) : preview ? (
        <PreviewStage
          activeJob={activeReviewerJob}
          isGenerating={isGenerating}
          onBack={handleReturnToBlockSelection}
          onCancel={() => void handleCancelReviewerJob()}
          onChangeText={handleSourceTextChange}
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
              message="No synchronized pages, assignment study text, images, or PDFs are available yet."
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
  const colors = useLegacyTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
  const colors = useLegacyTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
  const colors = useLegacyTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View
      accessibilityLabel={`${title} study materials`}
      accessibilityRole="radiogroup"
      style={styles.section}
    >
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
  const colors = useLegacyTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
  const colors = useLegacyTheme();

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

function CanvasStudyActionStage({
  courseName,
  isCreating,
  isLoadingMaterial,
  material,
  onChangeMaterial,
  onChooseSections,
  onCreateReviewer,
  onRetryMaterial,
  structureReady,
}: {
  readonly courseName: string;
  readonly isCreating: boolean;
  readonly isLoadingMaterial: boolean;
  readonly material: CanvasReviewerSourceDescriptor;
  readonly onChangeMaterial: () => void;
  readonly onChooseSections: () => void;
  readonly onCreateReviewer: () => void;
  readonly onRetryMaterial: () => void;
  readonly structureReady: boolean;
}) {
  const colors = useLegacyTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.stack} testID="canvas-study-action-stage">
      <Card accent style={styles.actionCard}>
        <Text style={styles.sectionLabel}>YOUR MATERIAL</Text>
        <Text style={styles.cardTitle}>{material.title}</Text>
        <Text style={styles.statusText}>{courseName}</Text>
        <Text style={styles.statusText}>{canvasSourceModuleLabel(material)}</Text>
        <Text style={styles.statusText}>
          {formatCanvasSourceType(material.type)} · Ready
        </Text>
      </Card>

      <Card style={styles.previewCard}>
        <View style={styles.actionTitleRow}>
          <BookOpen color={colors.accent} size={22} strokeWidth={2} />
          <View style={styles.actionTitleCopy}>
            <Text style={styles.sectionLabel}>STUDY ACTION</Text>
            <Text style={styles.cardTitle}>Reviewer</Text>
          </View>
        </View>
        <Text style={styles.bodyText}>
          Create organized explanations and key points from this material. It
          will be saved to your Study Library automatically.
        </Text>
        {!structureReady ? (
          <View accessibilityLiveRegion="polite" style={styles.progressRow}>
            {isLoadingMaterial ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : null}
            <Text style={styles.statusText}>
              {isLoadingMaterial
                ? "Getting your material ready."
                : "This material could not be read yet."}
            </Text>
          </View>
        ) : null}
        {!structureReady && !isLoadingMaterial ? (
          <Button fullWidth onPress={onRetryMaterial} variant="primary">
            Try again
          </Button>
        ) : (
          <Button
            disabled={!structureReady || isCreating}
            fullWidth
            loading={isCreating}
            onPress={onCreateReviewer}
            testID="canvas-create-reviewer-action"
            variant="primary"
          >
            Create Reviewer
          </Button>
        )}
        <Button
          disabled={!structureReady || isCreating}
          fullWidth
          onPress={onChooseSections}
          testID="canvas-choose-sections-action"
          variant="secondary"
        >
          Choose specific sections
        </Button>
        <Button
          disabled={isCreating}
          fullWidth
          onPress={onChangeMaterial}
          variant="secondary"
        >
          Change material
        </Button>
      </Card>
    </View>
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
  const colors = useLegacyTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const selected = new Set(selectedBlockIds);

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

/**
 * Pinned selection state and the single primary Preview action. The selection
 * count lives here rather than in the scrolling header so it stays readable
 * while the student works down a long block list.
 */
function BlockSelectionFooter({
  isPreviewing,
  onPreview,
  selectedBlockIds,
  structure,
}: {
  readonly isPreviewing: boolean;
  readonly onPreview: () => void;
  readonly selectedBlockIds: readonly string[];
  readonly structure: CanvasSourceStructurePayload;
}) {
  const colors = useLegacyTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const selection = describeCanvasBlockSelection({
    maximumSelectedBlocks: structure.limits.maximumSelectedBlocks,
    selectableCount: countSelectableCanvasBlocks(structure),
    selectedCount: selectedBlockIds.length,
  });

  return (
    <>
      <Text
        accessibilityLiveRegion="polite"
        style={selection.exceedsLimit ? styles.selectionCountError : styles.selectionCount}
        testID="canvas-selected-block-count"
      >
        {selection.summary}
      </Text>
      {selection.limitNotice ? (
        <Text
          style={selection.exceedsLimit ? styles.errorText : styles.prerequisiteCopy}
          testID="canvas-block-selection-limit-notice"
        >
          {selection.limitNotice}
        </Text>
      ) : null}
      {selectedBlockIds.length === 0 ? (
        <Text style={styles.prerequisiteCopy} testID="canvas-zero-selection-guard">
          Select at least one block to preview.
        </Text>
      ) : null}
      <Button
        disabled={selectedBlockIds.length === 0 || selection.exceedsLimit}
        fullWidth
        loading={isPreviewing}
        onPress={onPreview}
        testID="canvas-preview-selected-blocks"
        variant="primary"
      >
        Preview selected blocks
      </Button>
    </>
  );
}

/**
 * Pinned primary generation action. It mirrors the preview stage's own
 * precondition, so a stale or missing preview can never present a usable
 * Create reviewer control.
 */
function PreviewActionFooter({
  isGenerating,
  onGenerate,
  sourceText,
}: {
  readonly isGenerating: boolean;
  readonly onGenerate: () => void;
  readonly sourceText: string;
}) {
  const colors = useLegacyTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <>
      {sourceText.trim() ? null : (
        <Text style={styles.prerequisiteCopy}>
          Keep at least one readable line to continue.
        </Text>
      )}
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
    </>
  );
}

function PreviewStage({
  activeJob,
  isGenerating,
  onBack,
  onCancel,
  onChangeText,
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
  readonly onRetry: () => void;
  readonly preview: CanvasReviewerSourcePreviewPayload;
  readonly source: CanvasReviewerSourceDescriptor | null;
  readonly sourceText: string;
}) {
  const colors = useLegacyTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.stack} testID="canvas-source-preview-editor">
      <Card style={styles.previewCard}>
        <Text style={styles.sectionLabel}>SELECTIVE PREVIEW</Text>
        <View style={styles.previewSourceHeader}>
          <FileText color={colors.textSecondary} size={20} strokeWidth={1.7} />
          <View style={styles.sourceBody}>
            <Text style={styles.cardTitle}>{source?.title ?? "Canvas source"}</Text>
            <Text style={styles.statusText}>
              {source ? formatCanvasSourceType(source.type) : "Course item"}
            </Text>
          </View>
        </View>
        <Text style={styles.selectionSummary} testID="canvas-preview-block-count">
          {describeSelectivePreviewScope(preview.selectedBlockCount)}
        </Text>
        <Text style={styles.bodyText}>
          This is the exact study text the reviewer will use. Edit only what you
          want corrected or removed.
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
        <Button disabled={isGenerating} fullWidth onPress={onBack} variant="secondary">
          Change selection
        </Button>
        <Text style={styles.prerequisiteCopy} testID="canvas-preview-binding-note">
          Changing the selection replaces this preview. You will preview the new
          selection before creating a reviewer.
        </Text>
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
          onDismiss={onBack}
          onRetry={onRetry}
        />
      ) : null}
    </View>
  );
}

function CanvasReviewerJobCard({
  job,
  onCancel,
  onDismiss,
  onRetry,
}: {
  readonly job: ProcessingJobStatusView;
  readonly onCancel: () => void;
  readonly onDismiss: () => void;
  readonly onRetry: () => void;
}) {
  const colors = useLegacyTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const active = isActiveProcessingJobStatus(job.status);
  const hasUnits =
    job.progress.completedUnits !== null &&
    job.progress.totalUnits !== null &&
    job.progress.unitLabel !== null;
  return (
    <Card
      accessibilityLabel={`${canvasReviewerProgressLabel(job)}. ${job.progress.message}`}
      accessibilityLiveRegion="polite"
      accessibilityRole={active ? "progressbar" : "alert"}
      accessibilityState={{ busy: active }}
      style={styles.previewCard}
      testID="canvas-reviewer-job-status"
    >
      <Text style={styles.cardTitle}>{canvasReviewerProgressLabel(job)}</Text>
      <Text style={styles.statusText}>
        Stay Focused is turning your selected material into study notes.
      </Text>
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
        Latest update: {new Date(job.updatedAt).toLocaleString([], { hour12: true })}
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
      {!active ? (
        <Button fullWidth onPress={onDismiss} variant="secondary">
          Choose another material
        </Button>
      ) : null}
    </Card>
  );
}

/**
 * Save details for the reviewer being read. The Save action itself lives in the
 * shared `Screen` footer so it stays reachable through a long reviewer; this
 * panel carries only the title, the outcome, and the way onward.
 */
function SaveCanvasReviewerPanel({
  isSaving,
  onOpenLibrary,
  savedReviewer,
  saveError,
  saveTitle,
  sourceSnapshotReady,
}: {
  readonly isSaving: boolean;
  readonly onOpenLibrary: () => void;
  readonly savedReviewer: SavedReviewerSummary | null;
  readonly saveError: CanvasSourceDisplayError | null;
  readonly saveTitle: string;
  readonly sourceSnapshotReady: boolean;
}) {
  const colors = useLegacyTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Card style={styles.previewCard} testID="canvas-reviewer-save-card">
      <Text accessibilityRole="header" style={styles.cardTitle}>
        {savedReviewer
          ? "Saved automatically"
          : isSaving
            ? "Saving to Study Library"
            : "Save needs attention"}
      </Text>
      <Text style={styles.bodyText}>
        {savedReviewer
          ? `You can reopen ${saveTitle} later without creating it again.`
          : isSaving
            ? "Your reviewer is ready to study. Stay Focused is saving it now."
            : "Your reviewer is ready to study, but it has not been saved yet."}
      </Text>
      {!sourceSnapshotReady ? (
        <Text style={styles.prerequisiteCopy}>
          Create the reviewer again before saving.
        </Text>
      ) : null}
      {saveError ? <ErrorCard error={saveError} /> : null}
      {savedReviewer ? (
        <View accessibilityLiveRegion="polite" style={styles.successBox}>
          <Check color={colors.success} size={18} strokeWidth={2} />
          <Text style={styles.successText}>Reviewer saved.</Text>
        </View>
      ) : null}
      <Button
        disabled={!savedReviewer || isSaving}
        fullWidth
        onPress={onOpenLibrary}
        variant="secondary"
      >
        Open Study Library
      </Button>
    </Card>
  );
}

/**
 * Pinned Save action for the Reviewer Reader. It states the save state in words
 * as well as through the disabled control, and it is the only Save control on
 * the screen.
 */
function ReviewerSaveFooter({
  isSaving,
  onSave,
  savedReviewer,
  saveTitle,
  sourceSnapshotReady,
}: {
  readonly isSaving: boolean;
  readonly onSave: () => void;
  readonly savedReviewer: SavedReviewerSummary | null;
  readonly saveTitle: string;
  readonly sourceSnapshotReady: boolean;
}) {
  const colors = useLegacyTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <>
      {savedReviewer ? (
        <Text
          accessibilityLiveRegion="polite"
          style={styles.selectionCount}
          testID="canvas-reviewer-save-state"
        >
          Saved automatically to Study Library.
        </Text>
      ) : isSaving ? (
        <View accessibilityLiveRegion="polite" style={styles.progressRow}>
          <ActivityIndicator color={colors.accent} size="small" />
          <Text style={styles.statusText}>Saving automatically to Study Library.</Text>
        </View>
      ) : !sourceSnapshotReady ? (
        <Text style={styles.prerequisiteCopy}>
          Create the reviewer again before saving.
        </Text>
      ) : !saveTitle.trim() ? (
        <Text style={styles.prerequisiteCopy}>
          Enter a title before saving this reviewer.
        </Text>
      ) : null}
      <Button
        disabled={
          Boolean(savedReviewer) ||
          isSaving ||
          !saveTitle.trim() ||
          !sourceSnapshotReady
        }
        fullWidth
        loading={isSaving}
        onPress={onSave}
        testID="canvas-reviewer-save-button"
        variant="primary"
      >
        {savedReviewer
          ? "Saved automatically"
          : isSaving
            ? "Saving reviewer"
            : "Try saving again"}
      </Button>
    </>
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
  const colors = useLegacyTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Card
      accessibilityLabel={`${title}. ${message}`}
      accessibilityLiveRegion="polite"
      accessibilityRole={loading ? "progressbar" : "alert"}
      accessibilityState={{ busy: loading }}
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
  const colors = useLegacyTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
      error: { message: API_CONFIGURATION_MESSAGE, title: "App configuration error" },
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

const createStyles = (colors: LegacyColors) => StyleSheet.create({
  content: { gap: spacing[5] },
  stack: { gap: spacing[4] },
  // Reading stack: the document is followed by its save details with enough
  // separation that the reviewer keeps reading as one continuous document.
  readerStack: { gap: spacing[6] },
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
  actionTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing[3],
  },
  actionTitleCopy: { flex: 1, gap: spacing[1] },
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
