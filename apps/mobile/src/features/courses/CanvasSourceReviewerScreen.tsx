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
  previewCanvasReviewerSources,
  type CanvasApiClientError,
  type CanvasReviewerSourceDescriptor,
  type CanvasReviewerSourceListPayload,
  type CanvasReviewerSourcePreviewPayload,
  type CanvasReviewerSourceType,
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
  const [preview, setPreview] =
    useState<CanvasReviewerSourcePreviewPayload | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [reviewer, setReviewer] = useState<ReviewerOutput | null>(null);
  const [saveTitle, setSaveTitle] = useState("");
  const [savedReviewer, setSavedReviewer] =
    useState<SavedReviewerSummary | null>(null);
  const [error, setError] = useState<CanvasSourceDisplayError | null>(null);
  const [saveError, setSaveError] = useState<CanvasSourceDisplayError | null>(null);
  const [isLoadingSources, setIsLoadingSources] = useState(true);
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
    setPreview(null);
    setReviewer(null);
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

    setIsPreviewing(true);
    setError(null);
    setReviewer(null);
    setSavedReviewer(null);

    try {
      const result = await previewCanvasReviewerSources({
        ...context.value,
        courseId,
        sourceIds: selectedIdsInPreviewOrder,
      });

      if (result.ok) {
        setPreview(result.data);
        setSourceText(result.data.sourceText);
        setSourceTitle(result.data.suggestedTitle);
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
    setSavedReviewer(null);

    try {
      const result = await generateReviewer({
        ...context.value,
        sourceText: trimmedSourceText,
        ...(trimmedSourceTitle ? { sourceTitle: trimmedSourceTitle } : {}),
      });

      if (result.ok) {
        setReviewer(result.reviewer);
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

      {!preview ? (
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
              loading={isPreviewing}
              onPress={() => void handlePreviewSources()}
              testID="canvas-preview-sources-button"
              variant="primary"
            >
              {isPreviewing && previewIncludesFile
                ? "Extracting source text..."
                : "Preview selected content"}
            </Button>
          </Card>
        </View>
      ) : (
        <View style={styles.stack} testID="canvas-source-preview-editor">
          <Card style={styles.formCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.statusTitle}>Canvas source preview</Text>
              <Text style={styles.statusText}>
                {preview.sourceCount} sources - {sourceText.length} characters
              </Text>
            </View>

            <TextField
              label="Source title"
              onChangeText={(value) => {
                setSourceTitle(value);
                setError(null);
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
              }}
              testID="canvas-preview-source-input"
              textAlignVertical="top"
              value={sourceText}
            />

            <View style={styles.actions}>
              <Button
                disabled={isGenerating}
                onPress={() => setPreview(null)}
                variant="secondary"
              >
                Back to sources
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
            />
          ) : null}

          {reviewer ? <ReviewerPreview reviewer={reviewer} /> : null}
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

function SaveCanvasReviewerPanel({
  isSaving,
  onChangeTitle,
  onOpenLibrary,
  onSave,
  savedReviewer,
  saveError,
  saveTitle,
}: {
  readonly isSaving: boolean;
  readonly onChangeTitle: (value: string) => void;
  readonly onOpenLibrary: () => void;
  readonly onSave: () => void;
  readonly savedReviewer: SavedReviewerSummary | null;
  readonly saveError: CanvasSourceDisplayError | null;
  readonly saveTitle: string;
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
          disabled={Boolean(savedReviewer) || saveTitle.trim().length === 0}
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
  return {
    title:
      error.code === "unauthorized"
        ? "Login session expired"
        : "Reviewer could not be saved",
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
