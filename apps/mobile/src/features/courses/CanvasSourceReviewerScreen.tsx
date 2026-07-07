import type { ReviewerOutput } from "@stay-focused/engine";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { colors, spacing, typography } from "../../design/tokens";
import {
  CANVAS_REVIEWER_MAX_SELECTED_SOURCES,
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
  API_BASE_URL_SETUP_HINT,
  generateReviewer,
  type GenerateReviewerError,
} from "../../services/reviewerApi";
import {
  saveReviewer,
  type ReviewerLibraryError,
  type SavedReviewerSummary,
} from "../../services/reviewerLibraryApi";
import { ReviewerPreview } from "../reviewer/ReviewerPreview";

const SOURCE_TEXT_HEIGHT = 260;

interface CanvasSourceReviewerScreenProps {
  readonly courseId: string;
  readonly onBackToCourses: () => void;
  readonly onOpenLibrary: () => void;
}

interface CanvasSourceDisplayError {
  readonly title: string;
  readonly message: string;
  readonly detail?: string;
}

export function CanvasSourceReviewerScreen({
  courseId,
  onBackToCourses,
  onOpenLibrary,
}: CanvasSourceReviewerScreenProps) {
  const { session } = useAuth();
  const [sourceList, setSourceList] =
    useState<CanvasReviewerSourceListPayload | null>(null);
  const [selectedSourceIds, setSelectedSourceIds] = useState<readonly string[]>([]);
  const [structure, setStructure] =
    useState<CanvasSourceStructurePayload | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<readonly string[]>([]);
  const [preview, setPreview] =
    useState<CanvasReviewerSourcePreviewPayload | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [reviewer, setReviewer] = useState<ReviewerOutput | null>(null);
  const [sourceSnapshotId, setSourceSnapshotId] = useState<string | null>(null);
  const [saveTitle, setSaveTitle] = useState("");
  const [savedReviewer, setSavedReviewer] =
    useState<SavedReviewerSummary | null>(null);
  const [error, setError] = useState<CanvasSourceDisplayError | null>(null);
  const [saveError, setSaveError] = useState<CanvasSourceDisplayError | null>(null);
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  const [isStructuring, setIsStructuring] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [preparingSourceIds, setPreparingSourceIds] = useState<readonly string[]>(
    [],
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectedIdsInPreviewOrder = useMemo(
    () =>
      selectedSourceIds.filter((sourceId) =>
        sourceList?.sources.some(
          (source) =>
            source.id === sourceId && source.availability === "available",
        ),
      ),
    [selectedSourceIds, sourceList?.sources],
  );
  const selectedFileCount = useMemo(
    () =>
      selectedSourceIds.filter((sourceId) =>
        sourceList?.sources.some(
          (source) => source.id === sourceId && source.type === "file",
        ),
      ).length,
    [selectedSourceIds, sourceList?.sources],
  );
  const previewIncludesFile = selectedIdsInPreviewOrder.some((sourceId) =>
    sourceList?.sources.some(
      (source) => source.id === sourceId && source.type === "file",
    ),
  );
  const groupedSources = useMemo(
    () => groupSourcesByType(sourceList?.sources ?? []),
    [sourceList?.sources],
  );

  const loadSources = useCallback(async () => {
    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      setError(context.error);
      setIsLoadingSources(false);
      return;
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoadingSources(true);
    setError(null);
    setStructure(null);
    setSelectedBlockIds([]);
    setPreview(null);
    setReviewer(null);
    setSourceSnapshotId(null);
    setSavedReviewer(null);

    try {
      const result = await listCanvasReviewerSources({
        ...context.value,
        courseId,
        signal: abortController.signal,
      });

      if (result.ok) {
        setSourceList(result.data);
        setSelectedSourceIds((current) =>
          current.filter((sourceId) =>
            result.data.sources.some(
              (source) =>
                source.id === sourceId && source.availability === "available",
            ),
          ),
        );
      } else {
        setError(formatCanvasSourceError(result.error));
      }
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
        setIsLoadingSources(false);
      }
    }
  }, [courseId, session?.accessToken]);

  useEffect(() => {
    void loadSources();
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [loadSources]);

  const handleToggleSource = (source: CanvasReviewerSourceDescriptor) => {
    if (source.availability !== "available") {
      return;
    }
    setError(null);
    setStructure(null);
    setSelectedBlockIds([]);
    setPreview(null);
    setReviewer(null);
    setSourceSnapshotId(null);
    setSavedReviewer(null);
    setSelectedSourceIds((current) => {
      if (current.includes(source.id)) {
        return current.filter((sourceId) => sourceId !== source.id);
      }
      if (
        source.type === "file" &&
        current.some((sourceId) =>
          sourceList?.sources.some(
            (candidate) => candidate.id === sourceId && candidate.type === "file",
          ),
        )
      ) {
        setError({
          title: "One file per preview",
          message: "You can use one PDF or image per reviewer preview.",
        });
        return current;
      }
      if (current.length >= CANVAS_REVIEWER_MAX_SELECTED_SOURCES) {
        setError({
          title: "Too many sources",
          message: `Select at most ${CANVAS_REVIEWER_MAX_SELECTED_SOURCES} Canvas sources.`,
        });
        return current;
      }
      return [...current, source.id];
    });
  };

  const handlePrepareSource = async (source: CanvasReviewerSourceDescriptor) => {
    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      setError(context.error);
      return;
    }
    if (source.type !== "file" || source.file?.canPrepare !== true) {
      return;
    }
    if (preparingSourceIds.includes(source.id)) {
      return;
    }

    setPreparingSourceIds((current) => [...current, source.id]);
    setError(null);
    try {
      const result = await prepareCanvasReviewerSources({
        ...context.value,
        courseId,
        sourceIds: [source.id],
      });
      if (result.ok) {
        await loadSources();
      } else {
        setError(formatCanvasSourceError(result.error));
      }
    } finally {
      setPreparingSourceIds((current) =>
        current.filter((sourceId) => sourceId !== source.id),
      );
    }
  };

  const handlePreviewSources = async () => {
    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      setError(context.error);
      return;
    }

    if (selectedIdsInPreviewOrder.length === 0) {
      setError({
        title: "Choose a source",
        message: "Choose at least one available Canvas source.",
      });
      return;
    }

    setIsStructuring(true);
    setError(null);
    setStructure(null);
    setSelectedBlockIds([]);
    setPreview(null);
    setReviewer(null);
    setSourceSnapshotId(null);
    setSavedReviewer(null);

    try {
      const result = await structureCanvasReviewerSources({
        ...context.value,
        courseId,
        sourceIds: selectedIdsInPreviewOrder,
      });

      if (result.ok) {
        setStructure(result.data);
        setSelectedBlockIds(defaultSelectedBlockIds(result.data));
        setSourceText("");
        setSourceTitle("");
        setSourceSnapshotId(null);
        setSaveTitle("");
      } else {
        setError(formatCanvasSourceError(result.error));
      }
    } finally {
      setIsStructuring(false);
    }
  };

  const updateSelectedBlockIds = (
    updater: (current: readonly string[]) => readonly string[],
  ) => {
    setSelectedBlockIds((current) => updater(current));
    setPreview(null);
    setSourceText("");
    setSourceTitle("");
    setReviewer(null);
    setSourceSnapshotId(null);
    setSavedReviewer(null);
  };

  const handleToggleBlock = (block: CanvasStructuredBlock) => {
    if (!block.selectable) {
      return;
    }
    setError(null);
    updateSelectedBlockIds((current) => {
      if (current.includes(block.id)) {
        return current.filter((blockId) => blockId !== block.id);
      }
      const maximum = structure?.limits.maximumSelectedBlocks ?? 250;
      if (current.length >= maximum) {
        setError({
          title: "Too many blocks",
          message: `Select at most ${maximum} Canvas blocks.`,
        });
        return current;
      }
      return [...current, block.id];
    });
  };

  const handleSelectAllSourceBlocks = (
    source: CanvasSourceStructurePayload["sources"][number],
  ) => {
    const selectableIds = source.blocks
      .filter((block) => block.selectable)
      .map((block) => block.id);
    const maximum = structure?.limits.maximumSelectedBlocks ?? 250;
    setError(null);
    updateSelectedBlockIds((current) => {
      const next = [...new Set([...current, ...selectableIds])];
      if (next.length > maximum) {
        setError({
          title: "Too many blocks",
          message: `Select at most ${maximum} Canvas blocks.`,
        });
        return current;
      }
      return next;
    });
  };

  const handleClearSourceBlocks = (
    source: CanvasSourceStructurePayload["sources"][number],
  ) => {
    const sourceBlockIds = new Set(source.blocks.map((block) => block.id));
    setError(null);
    updateSelectedBlockIds((current) =>
      current.filter((blockId) => !sourceBlockIds.has(blockId)),
    );
  };

  const handleBuildSelectivePreview = async () => {
    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      setError(context.error);
      return;
    }
    if (!structure) {
      setError({
        title: "Select sources again",
        message: "Choose Canvas sources before previewing selected blocks.",
      });
      return;
    }
    if (selectedBlockIds.length === 0) {
      setError({
        title: "Choose a block",
        message: "Choose at least one Canvas block.",
      });
      return;
    }

    setIsPreviewing(true);
    setError(null);
    setPreview(null);
    setReviewer(null);
    setSourceSnapshotId(null);
    setSavedReviewer(null);

    try {
      const result = await previewSelectiveCanvasReviewerSources({
        ...context.value,
        courseId,
        selectedBlockIds,
        structureSessionId: structure.structureSessionId,
      });

      if (result.ok) {
        setPreview(result.data);
        setSourceText(result.data.sourceText);
        setSourceTitle(result.data.suggestedTitle);
        setSourceSnapshotId(null);
        setSaveTitle(result.data.suggestedTitle);
      } else {
        setError(formatCanvasSourceError(result.error));
      }
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleGenerate = async () => {
    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      setError(context.error);
      return;
    }

    const trimmedSourceText = sourceText.trim();
    const trimmedSourceTitle = sourceTitle.trim();
    if (!trimmedSourceText) {
      setError({
        title: "Source text is empty",
        message: "Keep at least one readable source line before generating.",
      });
      return;
    }
    const reviewerLimit = preview?.limits.existingReviewerRequestLimit ?? 100_000;
    if (trimmedSourceText.length > reviewerLimit) {
      setError({
        title: "Source is too large",
        message: `Edited source text must be at most ${reviewerLimit} characters.`,
      });
      return;
    }

    setIsGenerating(true);
    setError(null);
    setReviewer(null);
    setSourceSnapshotId(null);
    setSavedReviewer(null);

    try {
      const result = await generateReviewer({
        ...context.value,
        sourceText: trimmedSourceText,
        ...(trimmedSourceTitle ? { sourceTitle: trimmedSourceTitle } : {}),
        canvasPreviewSessionId: preview?.previewSessionId,
      });

      if (result.ok) {
        setReviewer(result.reviewer);
        setSourceSnapshotId(result.sourceSnapshotId ?? null);
        setSaveTitle(defaultSaveTitle(result.reviewer, trimmedSourceTitle));
      } else {
        setError(formatGenerateError(result.error));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveReviewer = async () => {
    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      setSaveError(context.error);
      return;
    }
    if (!reviewer) {
      return;
    }
    if (!sourceSnapshotId) {
      setSaveError({
        title: "Source snapshot is missing",
        message: "Generate the Canvas reviewer again before saving.",
      });
      return;
    }
    const trimmedSaveTitle = saveTitle.trim();
    if (!trimmedSaveTitle) {
      setSaveError({
        title: "Save needs a title",
        message: "Enter a title before saving this reviewer.",
      });
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await saveReviewer({
        ...context.value,
        reviewerOutput: reviewer,
        sourceSnapshotId,
        sourceMetadata: {
          sourceCharacterCount: sourceText.trim().length,
          sourceLabel: sourceTitle.trim() || trimmedSaveTitle,
          sourceMode: "canvas",
        },
        title: trimmedSaveTitle,
      });

      if (result.ok) {
        setSavedReviewer(result.data);
        setSaveTitle(result.data.title);
      } else {
        setSaveError(formatLibraryError(result.error));
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingSources) {
    return (
      <Screen contentContainerStyle={styles.content}>
        <Header onBackToCourses={onBackToCourses} />
        <Card style={styles.statusCard} testID="canvas-sources-loading">
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.statusTitle}>Loading Canvas sources...</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <Header onBackToCourses={onBackToCourses} />

      {error ? <ErrorCard error={error} /> : null}

      {sourceList ? (
        <CourseFreshnessCard
          courseSync={sourceList.courseSync}
          onRefresh={loadSources}
        />
      ) : null}

      {preview ? (
        <View style={styles.stack} testID="canvas-source-preview-editor">
          <Card style={styles.formCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.statusTitle}>Canvas source preview</Text>
              <Text style={styles.statusText}>
                {preview.sourceCount} sources - {sourceText.length} characters
                {preview.selectedBlockCount !== undefined
                  ? ` - ${preview.selectedBlockCount} blocks`
                  : ""}
              </Text>
            </View>

            <TextField
              label="Source title"
              onChangeText={(value) => {
                setSourceTitle(value);
                setError(null);
                setReviewer(null);
                setSourceSnapshotId(null);
                setSavedReviewer(null);
              }}
              testID="canvas-preview-title-input"
              value={sourceTitle}
            />

            <TextField
              inputStyle={styles.sourceTextInput}
              label="Source text"
              multiline
              onChangeText={(value) => {
                setSourceText(value);
                setError(null);
                setReviewer(null);
                setSourceSnapshotId(null);
                setSavedReviewer(null);
              }}
              testID="canvas-preview-source-input"
              textAlignVertical="top"
              value={sourceText}
            />

            <View style={styles.actions}>
              <Button
                disabled={isGenerating}
                onPress={() => {
                  setPreview(null);
                  setSourceText("");
                  setSourceTitle("");
                  setReviewer(null);
                  setSourceSnapshotId(null);
                  setSavedReviewer(null);
                }}
                variant="secondary"
              >
                Back to blocks
              </Button>
              <Button
                disabled={sourceText.trim().length === 0}
                loading={isGenerating}
                onPress={() => void handleGenerate()}
                testID="canvas-generate-reviewer-button"
                variant="primary"
              >
                Generate reviewer
              </Button>
            </View>
          </Card>

          {isGenerating ? (
            <Card style={styles.statusCard}>
              <Text style={styles.statusTitle}>Generating reviewer...</Text>
              <Text style={styles.statusText}>
                Stay Focused is using only the edited source text and title.
              </Text>
            </Card>
          ) : null}

          {reviewer ? (
            <SaveCanvasReviewerPanel
              isSaving={isSaving}
              onChangeTitle={(value) => {
                setSaveTitle(value);
                setSaveError(null);
              }}
              onOpenLibrary={onOpenLibrary}
              onSave={() => void handleSaveReviewer()}
              savedReviewer={savedReviewer}
              saveError={saveError}
              saveTitle={saveTitle}
              sourceSnapshotReady={sourceSnapshotId !== null}
            />
          ) : null}

          {reviewer ? <ReviewerPreview reviewer={reviewer} /> : null}
        </View>
      ) : structure ? (
        <View style={styles.stack} testID="canvas-source-block-selector">
          {structure.sources.map((source) => (
            <StructuredSourceSection
              key={`${source.type}:${source.ordinal}`}
              onClearSource={handleClearSourceBlocks}
              onSelectAllSource={handleSelectAllSourceBlocks}
              onToggleBlock={handleToggleBlock}
              selectedBlockIds={selectedBlockIds}
              source={source}
            />
          ))}

          <Card style={styles.actionCard}>
            <Text style={styles.statusText} testID="canvas-selected-block-count">
              {selectedBlockIds.length} selected blocks
            </Text>
            <View style={styles.actions}>
              <Button
                disabled={isPreviewing}
                onPress={() => {
                  setStructure(null);
                  setSelectedBlockIds([]);
                  setPreview(null);
                  setReviewer(null);
                  setSourceSnapshotId(null);
                  setSavedReviewer(null);
                }}
                variant="secondary"
              >
                Back to sources
              </Button>
              <Button
                disabled={selectedBlockIds.length === 0}
                loading={isPreviewing}
                onPress={() => void handleBuildSelectivePreview()}
                testID="canvas-selective-preview-button"
                variant="primary"
              >
                Preview selected blocks
              </Button>
            </View>
          </Card>
        </View>
      ) : (
        <View style={styles.stack}>
          {sourceList?.courseSync.status === "never" ? (
            <Card style={styles.statusCard} testID="canvas-sources-sync-required">
              <Text style={styles.statusTitle}>Synchronize this course first</Text>
              <Text style={styles.statusText}>
                Synchronize this course before selecting sources.
              </Text>
            </Card>
          ) : sourceList && sourceList.availableSourceCount === 0 ? (
            <Card style={styles.statusCard} testID="canvas-sources-empty">
              <Text style={styles.statusTitle}>No supported sources yet</Text>
              <Text style={styles.statusText}>
                Pages, assignment descriptions, and announcements with readable
                text will appear here after synchronization.
              </Text>
            </Card>
          ) : (
            <>
              <SourceSection
                onToggleSource={handleToggleSource}
                onPrepareSource={handlePrepareSource}
                preparingSourceIds={preparingSourceIds}
                selectedSourceIds={selectedSourceIds}
                sources={groupedSources.pages}
                title="Pages"
              />
              <SourceSection
                onToggleSource={handleToggleSource}
                onPrepareSource={handlePrepareSource}
                preparingSourceIds={preparingSourceIds}
                selectedSourceIds={selectedSourceIds}
                sources={groupedSources.assignments}
                title="Assignments"
              />
              <SourceSection
                onToggleSource={handleToggleSource}
                onPrepareSource={handlePrepareSource}
                preparingSourceIds={preparingSourceIds}
                selectedSourceIds={selectedSourceIds}
                sources={groupedSources.announcements}
                title="Announcements"
              />
              <SourceSection
                onToggleSource={handleToggleSource}
                onPrepareSource={handlePrepareSource}
                preparingSourceIds={preparingSourceIds}
                selectedSourceIds={selectedSourceIds}
                sources={groupedSources.files}
                title="Files"
              />
            </>
          )}

          <Card style={styles.actionCard}>
            <Text style={styles.statusText} testID="canvas-selected-source-count">
              {selectedIdsInPreviewOrder.length} selected
              {selectedFileCount > 0 ? " - 1 file" : ""}
            </Text>
            <Button
              disabled={selectedIdsInPreviewOrder.length === 0}
              fullWidth
              loading={isStructuring}
              onPress={() => void handlePreviewSources()}
              testID="canvas-preview-sources-button"
              variant="primary"
            >
              {isStructuring && previewIncludesFile
                ? "Extracting source blocks..."
                : "Choose content blocks"}
            </Button>
          </Card>
        </View>
      )}
    </Screen>
  );
}

function Header({
  onBackToCourses,
}: {
  readonly onBackToCourses: () => void;
}) {
  return (
    <View style={styles.header} testID="canvas-source-reviewer-screen">
      <Text style={styles.kicker}>Canvas reviewer</Text>
      <Text style={styles.title}>Create reviewer from Canvas</Text>
      <Button onPress={onBackToCourses} variant="secondary">
        Back to courses
      </Button>
    </View>
  );
}

function CourseFreshnessCard({
  courseSync,
  onRefresh,
}: {
  readonly courseSync: CanvasReviewerSourceListPayload["courseSync"];
  readonly onRefresh: () => void;
}) {
  const warning =
    courseSync.status === "partial"
      ? "Latest synchronization was partial."
      : courseSync.status === "failed"
        ? "Latest synchronization failed."
        : null;

  return (
    <Card style={styles.statusCard} testID="canvas-source-freshness">
      <View style={styles.summaryHeader}>
        <Text style={styles.statusTitle}>{formatSyncStatus(courseSync.status)}</Text>
        <Text style={styles.statusText}>
          {courseSync.completedAt
            ? `Last checked ${formatDateTime(courseSync.completedAt)}`
            : "No completed synchronization yet."}
        </Text>
        {warning ? <Text style={styles.warningText}>{warning}</Text> : null}
        {courseSync.failureCategories.length > 0 ? (
          <Text style={styles.statusText}>
            Limited areas: {courseSync.failureCategories.join(", ")}
          </Text>
        ) : null}
      </View>
      <Button onPress={onRefresh} variant="secondary">
        Retry loading
      </Button>
    </Card>
  );
}

function SourceSection({
  onToggleSource,
  onPrepareSource,
  preparingSourceIds,
  selectedSourceIds,
  sources,
  title,
}: {
  readonly onToggleSource: (source: CanvasReviewerSourceDescriptor) => void;
  readonly onPrepareSource: (source: CanvasReviewerSourceDescriptor) => void;
  readonly preparingSourceIds: readonly string[];
  readonly selectedSourceIds: readonly string[];
  readonly sources: readonly CanvasReviewerSourceDescriptor[];
  readonly title: string;
}) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <Card style={styles.sectionCard}>
      <Text style={styles.statusTitle}>{title}</Text>
      <View style={styles.sourceList}>
        {sources.map((source) => (
          <SourceRow
            isSelected={selectedSourceIds.includes(source.id)}
            isPreparing={preparingSourceIds.includes(source.id)}
            key={source.id}
            onPrepareSource={onPrepareSource}
            onToggleSource={onToggleSource}
            source={source}
          />
        ))}
      </View>
    </Card>
  );
}

function SourceRow({
  isSelected,
  isPreparing,
  onPrepareSource,
  onToggleSource,
  source,
}: {
  readonly isSelected: boolean;
  readonly isPreparing: boolean;
  readonly onPrepareSource: (source: CanvasReviewerSourceDescriptor) => void;
  readonly onToggleSource: (source: CanvasReviewerSourceDescriptor) => void;
  readonly source: CanvasReviewerSourceDescriptor;
}) {
  const disabled = source.availability !== "available";

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected, disabled }}
      disabled={disabled && source.file?.canPrepare !== true}
      onPress={() => {
        if (!disabled) {
          onToggleSource(source);
        }
      }}
      style={[styles.sourceRow, disabled ? styles.sourceRowDisabled : null]}
      testID={`canvas-source-row-${source.id}`}
    >
      <View style={[styles.checkBox, isSelected ? styles.checkBoxSelected : null]}>
        <Text style={styles.checkMark}>{isSelected ? "x" : ""}</Text>
      </View>
      <View style={styles.sourceBody}>
        <Text style={styles.sourceTitle}>{source.title}</Text>
        <Text style={styles.sourceMeta}>
          {formatSourceType(source.type)}
          {source.file ? ` - ${formatFileState(source.file, isPreparing)}` : ""}
          {source.estimatedCharacters !== null
            ? ` - ${source.estimatedCharacters} characters`
            : ""}
          {source.updatedAt ? ` - ${formatDate(source.updatedAt)}` : ""}
        </Text>
        {source.unavailableReason ? (
          <Text style={styles.warningText}>{source.unavailableReason}</Text>
        ) : null}
        {source.file?.canPrepare ? (
          <View style={styles.inlineAction}>
            <Button
              disabled={isPreparing}
              loading={isPreparing}
              onPress={() => onPrepareSource(source)}
              testID={`canvas-prepare-source-${source.id}`}
              variant="secondary"
            >
              Prepare file
            </Button>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function StructuredSourceSection({
  onClearSource,
  onSelectAllSource,
  onToggleBlock,
  selectedBlockIds,
  source,
}: {
  readonly onClearSource: (
    source: CanvasSourceStructurePayload["sources"][number],
  ) => void;
  readonly onSelectAllSource: (
    source: CanvasSourceStructurePayload["sources"][number],
  ) => void;
  readonly onToggleBlock: (block: CanvasStructuredBlock) => void;
  readonly selectedBlockIds: readonly string[];
  readonly source: CanvasSourceStructurePayload["sources"][number];
}) {
  const selectedCount = source.blocks.filter((block) =>
    selectedBlockIds.includes(block.id),
  ).length;

  return (
    <Card style={styles.sectionCard} testID={`canvas-structured-source-${source.ordinal}`}>
      <View style={styles.previewHeader}>
        <Text style={styles.statusTitle}>{source.title}</Text>
        <Text style={styles.statusText}>
          {formatSourceType(source.type)}
          {source.fileKind ? ` - ${source.fileKind.toUpperCase()}` : ""}
          {" - "}
          {selectedCount}/{source.blocks.length} selected
        </Text>
        {formatDuplicateSummary(source) ? (
          <Text
            style={styles.statusText}
            testID={`canvas-source-duplicate-summary-${source.ordinal}`}
          >
            {formatDuplicateSummary(source)}
          </Text>
        ) : null}
        {formatRepeatedReferenceSummary(source) ? (
          <Text
            style={styles.statusText}
            testID={`canvas-source-reference-summary-${source.ordinal}`}
          >
            {formatRepeatedReferenceSummary(source)}
          </Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Button onPress={() => onSelectAllSource(source)} variant="secondary">
          Select all
        </Button>
        <Button onPress={() => onClearSource(source)} variant="secondary">
          Clear
        </Button>
      </View>
      <View style={styles.sourceList}>
        {source.blocks.map((block) => (
          <StructuredBlockRow
            block={block}
            isSelected={selectedBlockIds.includes(block.id)}
            key={block.id}
            onToggleBlock={onToggleBlock}
          />
        ))}
      </View>
    </Card>
  );
}

function StructuredBlockRow({
  block,
  isSelected,
  onToggleBlock,
}: {
  readonly block: CanvasStructuredBlock;
  readonly isSelected: boolean;
  readonly onToggleBlock: (block: CanvasStructuredBlock) => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected, disabled: !block.selectable }}
      disabled={!block.selectable}
      onPress={() => onToggleBlock(block)}
      style={[
        styles.sourceRow,
        !block.selectable ? styles.sourceRowDisabled : null,
      ]}
      testID={`canvas-structured-block-${block.id}`}
    >
      <View style={[styles.checkBox, isSelected ? styles.checkBoxSelected : null]}>
        <Text style={styles.checkMark}>{isSelected ? "x" : ""}</Text>
      </View>
      <View style={styles.sourceBody}>
        <Text style={styles.sourceMeta}>
          {formatBlockKind(block)}
          {typeof block.pageNumber === "number" ? ` - Page ${block.pageNumber}` : ""}
        </Text>
        <Text style={styles.blockText}>{block.text}</Text>
      </View>
    </Pressable>
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
    <Card style={styles.formCard} testID="canvas-reviewer-save-card">
      <Text style={styles.statusTitle}>Save to Study Library</Text>
      <TextField
        editable={!savedReviewer}
        label="Saved reviewer title"
        onChangeText={onChangeTitle}
        testID="canvas-reviewer-save-title-input"
        value={saveTitle}
      />
      <Text style={styles.statusText} testID="canvas-source-snapshot-status">
        {sourceSnapshotReady
          ? "Source snapshot ready"
          : "Source snapshot unavailable"}
      </Text>
      {saveError ? <ErrorCard error={saveError} /> : null}
      {savedReviewer ? (
        <View style={styles.successBox} testID="canvas-reviewer-save-success">
          <Text style={styles.successText}>
            Saved to Study Library as {savedReviewer.title}.
          </Text>
        </View>
      ) : null}
      <View style={styles.actions}>
        <Button
          disabled={
            Boolean(savedReviewer) ||
            saveTitle.trim().length === 0 ||
            !sourceSnapshotReady
          }
          loading={isSaving}
          onPress={onSave}
          testID="canvas-reviewer-save-button"
          variant="primary"
        >
          {savedReviewer ? "Saved" : "Save reviewer"}
        </Button>
        <Button disabled={isSaving} onPress={onOpenLibrary} variant="secondary">
          Study Library
        </Button>
      </View>
    </Card>
  );
}

function ErrorCard({ error }: { readonly error: CanvasSourceDisplayError }) {
  return (
    <View style={styles.errorBox} testID="canvas-source-error">
      <Text style={styles.errorTitle}>{error.title}</Text>
      <Text style={styles.errorText}>{error.message}</Text>
      {error.detail ? <Text style={styles.errorDetail}>{error.detail}</Text> : null}
    </View>
  );
}

function groupSourcesByType(sources: readonly CanvasReviewerSourceDescriptor[]): {
  readonly pages: readonly CanvasReviewerSourceDescriptor[];
  readonly assignments: readonly CanvasReviewerSourceDescriptor[];
  readonly announcements: readonly CanvasReviewerSourceDescriptor[];
  readonly files: readonly CanvasReviewerSourceDescriptor[];
} {
  return {
    announcements: sources.filter((source) => source.type === "announcement"),
    assignments: sources.filter((source) => source.type === "assignment"),
    files: sources.filter((source) => source.type === "file"),
    pages: sources.filter((source) => source.type === "page"),
  };
}

function createRequestContext(accessToken: string | undefined):
  | {
      readonly ok: true;
      readonly value: {
        readonly apiBaseUrl: string;
        readonly accessToken: string;
      };
    }
  | { readonly ok: false; readonly error: CanvasSourceDisplayError } {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!apiBaseUrl) {
    return {
      ok: false,
      error: {
        title: "API address needs setup",
        message: API_BASE_URL_SETUP_HINT,
      },
    };
  }

  const token = accessToken?.trim();
  if (!token) {
    return {
      ok: false,
      error: {
        title: "Login session expired",
        message: "Sign out and sign in again before using Canvas sources.",
      },
    };
  }

  return { ok: true, value: { apiBaseUrl, accessToken: token } };
}

function formatCanvasSourceError(
  error: CanvasApiClientError,
): CanvasSourceDisplayError {
  const detail = formatCanvasDetail(error);
  switch (error.code) {
    case "course_not_selected":
      return {
        title: "Course is not selected",
        message: "Select this course before creating a reviewer from it.",
        detail,
      };
    case "course_not_found":
      return {
        title: "Course unavailable",
        message: "Canvas did not return this course for your connection.",
        detail,
      };
    case "source_count_exceeded":
      return {
        title: "Too many sources",
        message: error.message,
        detail,
      };
    case "ocr_file_limit_exceeded":
      return {
        title: "One file per preview",
        message: "You can use one PDF or image per reviewer preview.",
        detail,
      };
    case "source_preview_too_large":
      return {
        title: "Source preview is too large",
        message: error.message,
        detail,
      };
    case "structure_too_large":
      return {
        title: "Too many blocks",
        message: "Selected Canvas sources contain too many blocks. Select fewer sources.",
        detail,
      };
    case "structure_session_invalid":
    case "structure_session_not_found":
    case "structure_session_expired":
      return {
        title: "Select sources again",
        message: "The block selection expired. Choose Canvas sources again.",
        detail,
      };
    case "block_selection_empty":
      return {
        title: "Choose a block",
        message: "Choose at least one Canvas block.",
        detail,
      };
    case "block_selection_duplicate":
    case "block_selection_invalid":
      return {
        title: "Choose blocks again",
        message: "The selected Canvas blocks could not be used. Choose blocks again.",
        detail,
      };
    case "block_selection_limit_exceeded":
      return {
        title: "Too many blocks",
        message: error.message,
        detail,
      };
    case "source_preparation_required":
      return {
        title: "Prepare file first",
        message: "Prepare this file before using it as reviewer source text.",
        detail,
      };
    case "stored_file_missing":
    case "stored_file_corrupt":
      return {
        title: "Prepare file again",
        message: "The prepared file needs to be refreshed before previewing.",
        detail,
      };
    case "unsupported_file_type":
      return {
        title: "Unsupported file",
        message: "This Canvas file type is not supported yet.",
        detail,
      };
    case "ocr_empty":
      return {
        title: "No readable text",
        message: "OCR did not find readable text in this file.",
        detail,
      };
    case "pdf_encrypted":
      return {
        title: "PDF is locked",
        message: "Password-protected PDFs cannot be read.",
        detail,
      };
    case "pdf_page_limit_exceeded":
      return {
        title: "PDF has too many pages",
        message: "Canvas PDF OCR supports up to five pages per preview.",
        detail,
      };
    case "ocr_not_configured":
    case "ocr_failed":
    case "storage_read_failed":
      return {
        title: "Text extraction failed",
        message: "The file could not be extracted right now. Try again later.",
        detail,
      };
    case "source_not_found":
    case "source_unavailable":
      return {
        title: "Source unavailable",
        message: error.message,
        detail,
      };
    case "unauthorized":
    case "missing_access_token":
      return {
        title: "Login session expired",
        message: "Sign out and sign in again before using Canvas sources.",
        detail,
      };
    case "network_error":
      return {
        title: "Could not reach the API",
        message: "Check the API address and network connection.",
        detail,
      };
    default:
      return {
        title: "Canvas sources could not load",
        message: error.message,
        detail,
      };
  }
}

function formatGenerateError(error: GenerateReviewerError): CanvasSourceDisplayError {
  const detail =
    error.status !== undefined
      ? `Details: HTTP ${error.status}, code ${error.apiCode ?? error.code}.`
      : `Details: code ${error.apiCode ?? error.code}.`;
  if (error.code === "source_text_too_large" || error.status === 413) {
    return {
      title: "Source is too large",
      message: error.message,
      detail,
    };
  }
  if (error.code === "unauthorized") {
    return {
      title: "Login session expired",
      message: "Sign out and sign in again before generating.",
      detail,
    };
  }
  if (
    error.code === "canvas_preview_session_expired" ||
    error.code === "canvas_preview_session_not_found" ||
    error.code === "canvas_preview_session_invalid"
  ) {
    return {
      title: "Preview expired",
      message: "Preview the Canvas sources again before generating.",
      detail,
    };
  }
  return {
    title: "Reviewer generation failed",
    message: error.message,
    detail,
  };
}

function formatLibraryError(error: ReviewerLibraryError): CanvasSourceDisplayError {
  const detail =
    error.status !== undefined
      ? `Details: HTTP ${error.status}, code ${error.apiCode ?? error.code}.`
      : `Details: code ${error.apiCode ?? error.code}.`;
  if (error.code === "unauthorized") {
    return {
      title: "Login session expired",
      message: error.message,
      detail,
    };
  }
  if (
    error.code === "source_snapshot_required" ||
    error.code === "source_snapshot_not_found" ||
    error.code === "source_snapshot_metadata_mismatch"
  ) {
    return {
      title: "Generate again before saving",
      message: error.message,
      detail,
    };
  }
  return {
    title: "Reviewer could not be saved",
    message: error.message,
    detail,
  };
}

function formatCanvasDetail(error: CanvasApiClientError): string {
  return error.status !== undefined
    ? `Details: HTTP ${error.status}, code ${error.apiCode ?? error.code}.`
    : `Details: code ${error.apiCode ?? error.code}.`;
}

function defaultSaveTitle(reviewer: ReviewerOutput, sourceTitle: string): string {
  const title = sourceTitle.trim() || reviewer.title.trim();
  return title || "Canvas Reviewer";
}

function defaultSelectedBlockIds(
  structure: CanvasSourceStructurePayload,
): readonly string[] {
  return structure.sources.flatMap((source) =>
    source.blocks
      .filter((block) => block.selectable && block.selectedByDefault)
      .map((block) => block.id),
  );
}

function formatSyncStatus(
  status: CanvasReviewerSourceListPayload["courseSync"]["status"],
): string {
  switch (status) {
    case "success":
      return "Latest sync complete";
    case "partial":
      return "Latest sync partial";
    case "failed":
      return "Latest sync failed";
    case "never":
      return "Not synchronized yet";
  }
}

function formatSourceType(type: CanvasReviewerSourceType): string {
  switch (type) {
    case "page":
      return "Page";
    case "assignment":
      return "Assignment";
    case "announcement":
      return "Announcement";
    case "file":
      return "File";
  }
}

function formatFileState(
  file: NonNullable<CanvasReviewerSourceDescriptor["file"]>,
  isPreparing = false,
): string {
  if (isPreparing) {
    return "Preparing...";
  }
  switch (file.preparationStatus) {
    case "ready":
      return "Ready";
    case "not_prepared":
      return "Prepare";
    case "failed":
      return "Preparation failed";
    case "blocked":
      return "Unavailable";
    case "unsupported":
      return "Unsupported";
    case "unavailable":
      return "Unavailable";
  }
}

function formatBlockKind(block: CanvasStructuredBlock): string {
  switch (block.kind) {
    case "heading":
      return block.headingLevel ? `Heading ${block.headingLevel}` : "Heading";
    case "paragraph":
      return "Paragraph";
    case "list_item":
      return block.listStyle === "ordered" ? "Numbered list" : "List item";
    case "table":
      return "Table";
    case "quote":
      return "Quote";
    case "code":
      return "Code";
  }
}

function formatDuplicateSummary(
  source: CanvasSourceStructurePayload["sources"][number],
): string | null {
  const summary = source.duplicateSummary;
  if (summary.duplicateKind === "none") {
    return null;
  }
  const canonical = summary.canonicalSourceOrdinal;
  const isCanonical = canonical === source.ordinal;
  if (summary.duplicateKind === "same_source") {
    return isCanonical
      ? "Same Canvas source appears elsewhere in this selection."
      : `Same Canvas source as source ${canonical}.`;
  }
  return isCanonical
    ? "Canonical copy for matching source content."
    : `Content matches source ${canonical}; blocks start unselected.`;
}

function formatRepeatedReferenceSummary(
  source: CanvasSourceStructurePayload["sources"][number],
): string | null {
  const { repeatedReferenceCount, repeatedReferenceKinds } =
    source.duplicateSummary;
  if (repeatedReferenceCount <= 0) {
    return null;
  }
  const kinds = repeatedReferenceKinds.map(formatReferenceKind).join(", ");
  return `Referenced in ${repeatedReferenceCount} Canvas ${
    repeatedReferenceCount === 1 ? "location" : "locations"
  }${kinds ? `: ${kinds}` : ""}.`;
}

function formatReferenceKind(
  kind: CanvasSourceStructurePayload["sources"][number]["duplicateSummary"]["repeatedReferenceKinds"][number],
): string {
  switch (kind) {
    case "module":
      return "module";
    case "page":
      return "page";
    case "assignment":
      return "assignment";
    case "announcement":
      return "announcement";
  }
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[5],
  },
  stack: {
    gap: spacing[4],
  },
  header: {
    gap: spacing[3],
  },
  kicker: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.kicker,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h1,
    fontWeight: "800",
    lineHeight: 30,
  },
  statusCard: {
    alignItems: "flex-start",
    gap: spacing[3],
  },
  actionCard: {
    gap: spacing[3],
  },
  formCard: {
    gap: spacing[4],
  },
  sectionCard: {
    gap: spacing[4],
  },
  previewHeader: {
    gap: spacing[1],
  },
  summaryHeader: {
    gap: spacing[1],
  },
  sourceList: {
    gap: spacing[3],
  },
  sourceRow: {
    alignItems: "flex-start",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing[2],
    paddingBottom: spacing[3],
  },
  sourceRowDisabled: {
    opacity: 0.58,
  },
  checkBox: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: 4,
    borderWidth: 1,
    height: 22,
    justifyContent: "center",
    marginTop: 1,
    width: 22,
  },
  checkBoxSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accentPressed,
  },
  checkMark: {
    color: colors.accentText,
    fontFamily: typography.fontFamily,
    fontSize: typography.caption,
    fontWeight: "900",
    lineHeight: 15,
    textAlign: "center",
  },
  sourceBody: {
    flex: 1,
    gap: spacing[1],
  },
  inlineAction: {
    alignSelf: "flex-start",
    marginTop: spacing[1],
  },
  sourceTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    fontWeight: "800",
    lineHeight: 21,
  },
  sourceMeta: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
  blockText: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  sourceTextInput: {
    minHeight: SOURCE_TEXT_HEIGHT,
  },
  statusTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h3,
    fontWeight: "800",
  },
  statusText: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  warningText: {
    color: colors.error,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  errorBox: {
    backgroundColor: colors.errorSurface,
    borderColor: colors.error,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing[2],
    padding: spacing[3],
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
  errorDetail: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.caption,
    lineHeight: 17,
  },
  successBox: {
    backgroundColor: colors.successSurface,
    borderColor: colors.success,
    borderRadius: 10,
    borderWidth: 1,
    padding: spacing[3],
  },
  successText: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    fontWeight: "700",
    lineHeight: 19,
  },
});
