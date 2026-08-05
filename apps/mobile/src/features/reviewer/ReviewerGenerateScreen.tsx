import type { ReviewerOutput } from "@stay-focused/engine";
import {
  isActiveProcessingJobStatus,
  type ProcessingJobStatusView,
} from "@stay-focused/shared";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Image,
  KeyboardAvoidingView,
  Platform,
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
import { colors, spacing, typography } from "../../design/tokens";
import {
  API_BASE_URL_SETUP_HINT,
} from "../../services/reviewerApi";
import {
  saveReviewer,
  type ReviewerLibraryError,
  type SavedReviewerSourceMetadata,
  type SavedReviewerSourceMode,
  type SavedReviewerSummary,
} from "../../services/reviewerLibraryApi";
import {
  cancelProcessingJob,
  createExtractionJob,
  createProcessingJobIdempotencyKey,
  createReviewerJob,
  getExtractionJobResult,
  getProcessingJobStatus,
  getReviewerJobResult,
  listActiveProcessingJobs,
  MOBILE_JOB_POLL_INTERVAL_MS,
  retryProcessingJob,
  type ProcessingJobApiError,
} from "../../services/processingJobsApi";
import {
  readActiveProcessingJobs,
  removeActiveProcessingJob,
  upsertActiveProcessingJob,
} from "../../services/activeProcessingJobStore";
import { cacheCompletedArtifact } from "../../services/completedArtifactCache";
import { saveProcessingDraft } from "../../services/processingDraftStore";
import { enqueueOfflineProcessingIntent } from "../../services/processingOutboxStore";
import { getProcessingCompletionNotice } from "../../services/processingCompletionNotice";
import type { OcrClientError } from "../../services/ocrApi";
import {
  captureImageWithCamera,
  chooseImageFromGallery,
  createOcrSmokeFixtureImage,
  type GallerySelectionResult,
  type SelectedGalleryImage,
} from "./galleryImage";
import {
  choosePdfDocument,
  type PdfSelectionResult,
  type SelectedPdfDocument,
} from "./pdfDocument";
import {
  canExtractOcrText,
  canExtractPdfText,
  getCurrentSourceText,
  getSourceCharacterCount,
  initialReviewerSourceState,
  isReviewerSourceReadyForGeneration,
  reviewerSourceReducer,
  type ReviewerSourceState,
  type SourceFlowError,
} from "./reviewerSourceFlow";
import { ReviewerPreview } from "./ReviewerPreview";

const DEFAULT_SOURCE_TEXT_HEIGHT = 180;
const OCR_SMOKE_FIXTURE_ENABLED = isOcrSmokeFixtureEnabled();

interface ReviewerGenerateScreenProps {
  readonly onOpenCourses?: () => void;
  readonly onOpenLibrary?: () => void;
  readonly onOpenProcessing?: () => void;
}

interface GenerationDisplayError {
  readonly title: string;
  readonly message: string;
  readonly detail?: string;
}

export function ReviewerGenerateScreen({
  onOpenCourses,
  onOpenLibrary,
  onOpenProcessing,
}: ReviewerGenerateScreenProps) {
  const { isSigningOut, session, signOut } = useAuth();
  const [sourceTitle, setSourceTitle] = useState("");
  const [imageSourceMode, setImageSourceMode] =
    useState<Extract<SavedReviewerSourceMode, "gallery" | "camera">>("gallery");
  const [sourceState, dispatchSource] = useReducer(
    reviewerSourceReducer,
    initialReviewerSourceState,
  );
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [generationError, setGenerationError] =
    useState<GenerationDisplayError | null>(null);
  const [reviewer, setReviewer] = useState<ReviewerOutput | null>(null);
  const [saveTitle, setSaveTitle] = useState("");
  const [savedReviewer, setSavedReviewer] =
    useState<SavedReviewerSummary | null>(null);
  const [recoveredReviewerSource, setRecoveredReviewerSource] = useState<{
    readonly sourceSnapshotId: string;
    readonly sourceCharacterCount: number;
    readonly sourceLabel: string;
  } | null>(null);
  const [saveError, setSaveError] = useState<GenerationDisplayError | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingReviewer, setIsSavingReviewer] = useState(false);
  const [activeExtractionJob, setActiveExtractionJob] =
    useState<ProcessingJobStatusView | null>(null);
  const [activeReviewerJob, setActiveReviewerJob] =
    useState<ProcessingJobStatusView | null>(null);
  const [appIsActive, setAppIsActive] = useState(
    AppState.currentState === "active",
  );
  const extractionIdempotencyKeyRef = useRef<string | null>(null);
  const reviewerIdempotencyKeyRef = useRef<string | null>(null);
  const extractionSubmissionInFlightRef = useRef(false);
  const reviewerSubmissionInFlightRef = useRef(false);

  const email = session?.user.email ?? "No email on this account";
  const visibleSourceText = getCurrentSourceText(sourceState);
  const sourceCharacterCount = getSourceCharacterCount(sourceState);

  useEffect(() => {
    const previewUri = sourceState.selectedImage?.uri;
    return () => {
      revokeWebObjectUrl(previewUri);
    };
  }, [sourceState.selectedImage?.uri]);

  useEffect(() => {
    const pdfUri = sourceState.selectedPdf?.uri;
    return () => {
      revokeWebObjectUrl(pdfUri);
    };
  }, [sourceState.selectedPdf?.uri]);

  const applyObservedJob = useCallback(
    async (job: ProcessingJobStatusView): Promise<void> => {
      const ownerUserId = session?.user.id;
      const accessToken = session?.accessToken.trim();
      const apiBaseUrl = getApiBaseUrl();
      if (!ownerUserId || !accessToken || !apiBaseUrl) return;

      const previousReference = (
        await readActiveProcessingJobs(ownerUserId)
      ).find((reference) => reference.jobId === job.id);
      const completionNotice = getProcessingCompletionNotice(
        previousReference,
        job,
      );
      await upsertActiveProcessingJob(ownerUserId, job);
      if (job.jobType === "document_extraction") {
        setActiveExtractionJob(job);
      } else {
        setActiveReviewerJob(job);
      }

      if (job.status !== "succeeded" || !job.resultAvailable) return;

      if (job.jobType === "document_extraction") {
        const result = await getExtractionJobResult({
          apiBaseUrl,
          accessToken,
          jobId: job.id,
        });
        if (!result.ok) {
          setGenerationError(formatProcessingJobApiError(result.error));
          return;
        }
        dispatchSource({
          type: "restore_ocr_result",
          mode: job.source.sourceKind === "pdf" ? "pdf" : "image",
          text: result.data.text,
          pageCount: result.data.pageCount,
        });
        setActiveExtractionJob(null);
      } else {
        const result = await getReviewerJobResult({
          apiBaseUrl,
          accessToken,
          jobId: job.id,
        });
        if (!result.ok) {
          setGenerationError(formatProcessingJobApiError(result.error));
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
        setReviewer(result.data.reviewer);
        setRecoveredReviewerSource(
          result.data.sourceSnapshotId
            ? {
                sourceSnapshotId: result.data.sourceSnapshotId,
                sourceCharacterCount: job.source.characterCount ?? 0,
                sourceLabel: job.source.displayName,
              }
            : null,
        );
        setSaveTitle(
          defaultReviewerSaveTitle(result.data.reviewer, job.source.displayName),
        );
        setActiveReviewerJob(null);
      }
      await removeActiveProcessingJob(job.id);
      if (completionNotice) {
        Alert.alert(completionNotice.title, completionNotice.message);
      }
    },
    [session?.accessToken, session?.user.id],
  );

  const reconcileProcessingJobs = useCallback(async (): Promise<void> => {
    const ownerUserId = session?.user.id;
    const accessToken = session?.accessToken.trim();
    const apiBaseUrl = getApiBaseUrl();
    if (!ownerUserId || !accessToken || !apiBaseUrl) return;

    const localReferences = await readActiveProcessingJobs(ownerUserId);
    const serverActive = await listActiveProcessingJobs({ apiBaseUrl, accessToken });
    const jobIds = new Set(localReferences.map((job) => job.jobId));
    if (serverActive.ok) {
      for (const job of serverActive.data) {
        jobIds.add(job.id);
        await upsertActiveProcessingJob(ownerUserId, job);
      }
    }

    for (const jobId of jobIds) {
      const status = await getProcessingJobStatus({
        apiBaseUrl,
        accessToken,
        jobId,
      });
      if (status.ok) {
        await applyObservedJob(status.data);
      } else if (status.error.code === "unauthorized") {
        setGenerationError({
          title: "Sign in again",
          message: "Your processing job is still on the server. Sign in again to retrieve it.",
        });
        return;
      }
    }
  }, [applyObservedJob, session?.accessToken, session?.user.id]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      const active = state === "active";
      setAppIsActive(active);
      if (active) void reconcileProcessingJobs();
    });
    void reconcileProcessingJobs();
    return () => subscription.remove();
  }, [reconcileProcessingJobs]);

  useEffect(() => {
    const hasActiveJob = [activeExtractionJob, activeReviewerJob].some(
      (job) => job && isActiveProcessingJobStatus(job.status),
    );
    if (!appIsActive || !hasActiveJob) return;
    const timer = setInterval(() => {
      void reconcileProcessingJobs();
    }, MOBILE_JOB_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [
    activeExtractionJob,
    activeReviewerJob,
    appIsActive,
    reconcileProcessingJobs,
  ]);

  const handleGenerate = async () => {
    if (
      reviewerSubmissionInFlightRef.current ||
      (activeReviewerJob && isActiveProcessingJobStatus(activeReviewerJob.status))
    ) {
      return;
    }
    const trimmedSourceText = visibleSourceText.trim();
    const trimmedSourceTitle = sourceTitle.trim();

    setValidationMessage(null);
    setGenerationError(null);

    if (
      (sourceState.mode === "image" || sourceState.mode === "pdf") &&
      !isReviewerSourceReadyForGeneration(sourceState)
    ) {
      setValidationMessage(
        "Finish reading the entire selected file successfully before generating a reviewer.",
      );
      return;
    }

    if (!trimmedSourceText) {
      setValidationMessage(
        sourceState.mode === "image" || sourceState.mode === "pdf"
          ? "Extract text from the selected file, or enter corrected text before generating."
          : "Paste source text before generating a reviewer.",
      );
      return;
    }

    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) {
      setGenerationError({
        title: "API base URL missing",
        message: API_BASE_URL_SETUP_HINT,
      });
      return;
    }

    const accessToken = session?.accessToken.trim();
    const ownerUserId = session?.user.id;
    if (!accessToken || !ownerUserId) {
      setGenerationError({
        title: "Session check failed",
        message:
          "Your session is missing an access token. Sign out and sign in again.",
      });
      return;
    }

    setReviewer(null);
    setRecoveredReviewerSource(null);
    setSavedReviewer(null);
    setSaveError(null);
    setSaveTitle("");
    setIsGenerating(true);
    reviewerSubmissionInFlightRef.current = true;
    const idempotencyKey =
      reviewerIdempotencyKeyRef.current ??
      createProcessingJobIdempotencyKey("reviewer_generation");
    reviewerIdempotencyKeyRef.current = idempotencyKey;

    try {
      const result = await createReviewerJob({
        apiBaseUrl,
        accessToken,
        idempotencyKey,
        sourceText: trimmedSourceText,
        ...(trimmedSourceTitle ? { sourceTitle: trimmedSourceTitle } : {}),
      });

      if (result.ok) {
        reviewerIdempotencyKeyRef.current = null;
        setActiveReviewerJob(result.data);
        await upsertActiveProcessingJob(ownerUserId, result.data);
      } else {
        if (
          result.error.code === "network_error" ||
          result.error.code === "request_timeout"
        ) {
          const localReference = `reviewer-draft:${idempotencyKey}`;
          const saved = await saveProcessingDraft({
            localReference,
            ownerUserId,
            sourceText: trimmedSourceText,
            ...(trimmedSourceTitle ? { sourceTitle: trimmedSourceTitle } : {}),
          });
          if (saved) {
            await enqueueOfflineProcessingIntent({
              ownerUserId,
              operation: "artifact_generation",
              sourceLocalReference: localReference,
              artifactType: "reviewer",
              idempotencyKey,
              settings: {
                language: "auto",
                outputMode: "standard",
              },
            });
            setGenerationError({
              title: "Waiting for connection",
              message:
                "This request is saved locally. It is not a server job yet; Processing will submit it with the same idempotency key when the API is reachable.",
            });
          } else {
            setGenerationError({
              title: "Offline draft is too large",
              message:
                "Keep this screen open and reconnect before submitting this source.",
            });
          }
        } else {
          setGenerationError(formatProcessingJobApiError(result.error));
        }
        if (!result.error.retryable) reviewerIdempotencyKeyRef.current = null;
      }
    } finally {
      reviewerSubmissionInFlightRef.current = false;
      setIsGenerating(false);
    }
  };

  const handleSourceTextChange = (value: string) => {
    dispatchSource({ type: "edit_source_text", value });
    if (generationError) {
      setGenerationError(null);
    }
    if (validationMessage) {
      setValidationMessage(null);
    }
  };

  const handleChooseImage = async () => {
    setValidationMessage(null);
    setGenerationError(null);

    const result = await chooseImageFromGallery();
    applyImageSelectionResult(result);
    if (result.status === "selected") {
      setImageSourceMode("gallery");
    }
  };

  const handleChoosePdf = async () => {
    setValidationMessage(null);
    setGenerationError(null);

    const result = await choosePdfDocument();
    applyPdfSelectionResult(result);
  };

  const handleCaptureImage = async () => {
    setValidationMessage(null);
    setGenerationError(null);

    const result = await captureImageWithCamera();
    applyImageSelectionResult(result);
    if (result.status === "selected") {
      setImageSourceMode("camera");
    }
  };

  const applyImageSelectionResult = (result: GallerySelectionResult) => {
    if (result.status === "cancelled") {
      dispatchSource({ type: "image_selection_cancelled" });
      return;
    }

    if (result.status === "failed") {
      dispatchSource({ type: "image_selection_failed", error: result.error });
      return;
    }

    dispatchSource({ type: "image_selected", image: result.image });
  };

  const applyPdfSelectionResult = (result: PdfSelectionResult) => {
    if (result.status === "cancelled") {
      dispatchSource({ type: "pdf_selection_cancelled" });
      return;
    }

    if (result.status === "failed") {
      dispatchSource({ type: "pdf_selection_failed", error: result.error });
      return;
    }

    dispatchSource({ type: "pdf_selected", pdf: result.pdf });
  };

  const handleUseSmokeFixtureImage = () => {
    setImageSourceMode("gallery");
    dispatchSource({
      type: "image_selected",
      image: createOcrSmokeFixtureImage(),
    });
  };

  const handleClearImage = () => {
    dispatchSource({ type: "clear_image" });
  };

  const handleClearPdf = () => {
    dispatchSource({ type: "clear_pdf" });
  };

  const handleExtractText = async () => {
    if (
      extractionSubmissionInFlightRef.current ||
      (activeExtractionJob && isActiveProcessingJobStatus(activeExtractionJob.status))
    ) {
      return;
    }
    const selectedImage = sourceState.selectedImage;
    if (!selectedImage) {
      dispatchSource({
        type: "ocr_failed",
        error: {
          code: "invalid_image",
          message: "Choose an image before extracting text.",
        },
      });
      return;
    }

    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) {
      dispatchSource({
        type: "ocr_failed",
        error: {
          code: "invalid_api_base_url",
          message: API_BASE_URL_SETUP_HINT,
        },
      });
      return;
    }

    const accessToken = session?.accessToken.trim();
    const ownerUserId = session?.user.id;
    if (!accessToken || !ownerUserId) {
      dispatchSource({
        type: "ocr_failed",
        error: {
          code: "missing_access_token",
          message:
            "Your session is missing an access token. Sign out and sign in again.",
        },
      });
      return;
    }

    dispatchSource({ type: "ocr_started" });
    extractionSubmissionInFlightRef.current = true;
    const idempotencyKey =
      extractionIdempotencyKeyRef.current ??
      createProcessingJobIdempotencyKey("document_extraction");
    extractionIdempotencyKeyRef.current = idempotencyKey;

    try {
      const result = await createExtractionJob({
        apiBaseUrl,
        accessToken,
        idempotencyKey,
        source: { kind: "image", value: selectedImage },
        platformOS: Platform.OS,
      });

      if (result.ok) {
        extractionIdempotencyKeyRef.current = null;
        setActiveExtractionJob(result.data);
        await upsertActiveProcessingJob(ownerUserId, result.data);
      } else {
        dispatchSource({
          type: "ocr_failed",
          error: toOcrCompatibleJobError(result.error),
        });
        if (!result.error.retryable) extractionIdempotencyKeyRef.current = null;
      }
    } finally {
      extractionSubmissionInFlightRef.current = false;
    }
  };

  const handleExtractPdfText = async () => {
    if (
      extractionSubmissionInFlightRef.current ||
      (activeExtractionJob && isActiveProcessingJobStatus(activeExtractionJob.status))
    ) {
      return;
    }
    const selectedPdf = sourceState.selectedPdf;
    if (!selectedPdf) {
      dispatchSource({
        type: "ocr_failed",
        error: {
          code: "invalid_pdf",
          message: "Choose a PDF before extracting text.",
        },
      });
      return;
    }

    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) {
      dispatchSource({
        type: "ocr_failed",
        error: {
          code: "invalid_api_base_url",
          message: API_BASE_URL_SETUP_HINT,
        },
      });
      return;
    }

    const accessToken = session?.accessToken.trim();
    const ownerUserId = session?.user.id;
    if (!accessToken || !ownerUserId) {
      dispatchSource({
        type: "ocr_failed",
        error: {
          code: "missing_access_token",
          message:
            "Your session is missing an access token. Sign out and sign in again.",
        },
      });
      return;
    }

    dispatchSource({ type: "ocr_started" });
    extractionSubmissionInFlightRef.current = true;
    const idempotencyKey =
      extractionIdempotencyKeyRef.current ??
      createProcessingJobIdempotencyKey("document_extraction");
    extractionIdempotencyKeyRef.current = idempotencyKey;

    try {
      const result = await createExtractionJob({
        apiBaseUrl,
        accessToken,
        idempotencyKey,
        source: { kind: "pdf", value: selectedPdf },
        platformOS: Platform.OS,
      });

      if (result.ok) {
        extractionIdempotencyKeyRef.current = null;
        setActiveExtractionJob(result.data);
        await upsertActiveProcessingJob(ownerUserId, result.data);
      } else {
        dispatchSource({
          type: "ocr_failed",
          error: toOcrCompatibleJobError(result.error),
        });
        if (!result.error.retryable) extractionIdempotencyKeyRef.current = null;
      }
    } finally {
      extractionSubmissionInFlightRef.current = false;
    }
  };

  const handleCancelJob = async (job: ProcessingJobStatusView) => {
    const apiBaseUrl = getApiBaseUrl();
    const accessToken = session?.accessToken.trim();
    if (!apiBaseUrl || !accessToken) return;
    const result = await cancelProcessingJob({
      apiBaseUrl,
      accessToken,
      jobId: job.id,
    });
    if (result.ok) {
      await applyObservedJob(result.data);
    } else {
      setGenerationError(formatProcessingJobApiError(result.error));
    }
  };

  const handleRetryJob = async (job: ProcessingJobStatusView) => {
    const apiBaseUrl = getApiBaseUrl();
    const accessToken = session?.accessToken.trim();
    const ownerUserId = session?.user.id;
    if (!apiBaseUrl || !accessToken || !ownerUserId) return;
    const result = await retryProcessingJob({
      apiBaseUrl,
      accessToken,
      jobId: job.id,
      idempotencyKey: createProcessingJobIdempotencyKey(job.jobType),
    });
    if (!result.ok) {
      setGenerationError(formatProcessingJobApiError(result.error));
      return;
    }
    await removeActiveProcessingJob(job.id);
    await upsertActiveProcessingJob(ownerUserId, result.data);
    if (job.jobType === "document_extraction") {
      setActiveExtractionJob(result.data);
      dispatchSource({ type: "ocr_started" });
    } else {
      setActiveReviewerJob(result.data);
    }
  };

  const handleReturnFromJob = async (job: ProcessingJobStatusView) => {
    await removeActiveProcessingJob(job.id);
    if (job.jobType === "document_extraction") {
      setActiveExtractionJob(null);
      dispatchSource({
        type: "ocr_failed",
        error: {
          code: "request_cancelled",
          message: job.safeErrorMessage ?? "Extraction did not complete.",
        },
      });
    } else {
      setActiveReviewerJob(null);
    }
  };

  const handleSaveReviewer = async () => {
    if (!reviewer) {
      return;
    }

    const trimmedSaveTitle = saveTitle.trim();
    setSaveError(null);

    if (!trimmedSaveTitle) {
      setSaveError({
        title: "Save needs a title",
        message: "Enter a title before saving this reviewer.",
      });
      return;
    }

    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) {
      setSaveError({
        title: "API address needs setup",
        message: API_BASE_URL_SETUP_HINT,
      });
      return;
    }

    const accessToken = session?.accessToken.trim();
    if (!accessToken) {
      setSaveError({
        title: "Login session expired",
        message:
          "Sign out and sign in again before saving this reviewer.",
      });
      return;
    }

    setIsSavingReviewer(true);

    try {
      const result = await saveReviewer({
        apiBaseUrl,
        accessToken,
        title: trimmedSaveTitle,
        sourceMetadata: recoveredReviewerSource
          ? {
              sourceCharacterCount:
                recoveredReviewerSource.sourceCharacterCount,
              sourceLabel: recoveredReviewerSource.sourceLabel,
              sourceMode: "canvas",
            }
          : createSavedReviewerSourceMetadata({
              imageSourceMode,
              sourceCharacterCount,
              sourceState,
              sourceTitle,
            }),
        reviewerOutput: reviewer,
        ...(recoveredReviewerSource
          ? { sourceSnapshotId: recoveredReviewerSource.sourceSnapshotId }
          : {}),
      });

      if (result.ok) {
        setSavedReviewer(result.data);
        setSaveTitle(result.data.title);
      } else {
        setSaveError(formatSaveReviewerError(result.error));
      }
    } finally {
      setIsSavingReviewer(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={styles.stack}
      >
        <View style={styles.header} testID="reviewer-generate-screen">
          <Text style={styles.kicker}>Reviewer generator</Text>
          <Text style={styles.title}>Stay Focused</Text>
          <Text style={styles.subtitle}>{email}</Text>
        </View>

        <Card elevated style={styles.formCard}>
          <TextField
            label="Source title"
            onChangeText={setSourceTitle}
            placeholder="Optional title"
            returnKeyType="next"
            testID="reviewer-title-input"
            value={sourceTitle}
          />

          <View style={styles.sourceModeGroup}>
            <Text style={styles.fieldLabel}>Source mode</Text>
            <View style={styles.sourceModeButtons}>
              <Button
                onPress={() => dispatchSource({ type: "switch_mode", mode: "paste" })}
                style={styles.sourceModeButton}
                testID="reviewer-source-mode-paste"
                variant={sourceState.mode === "paste" ? "primary" : "secondary"}
              >
                Paste text
              </Button>
              <Button
                onPress={() => dispatchSource({ type: "switch_mode", mode: "image" })}
                style={styles.sourceModeButton}
                testID="reviewer-source-mode-image"
                variant={sourceState.mode === "image" ? "primary" : "secondary"}
              >
                Import image
              </Button>
              <Button
                onPress={() => dispatchSource({ type: "switch_mode", mode: "pdf" })}
                style={styles.sourceModeButton}
                testID="reviewer-source-mode-pdf"
                variant={sourceState.mode === "pdf" ? "primary" : "secondary"}
              >
                Import PDF
              </Button>
            </View>
          </View>

          {sourceState.mode === "image" ? (
            <ImageImportPanel
              acceptedJob={
                activeExtractionJob?.source.sourceKind === "image"
                  ? activeExtractionJob
                  : null
              }
              canExtract={canExtractOcrText(sourceState)}
              error={sourceState.ocrError}
              isSmokeFixtureEnabled={OCR_SMOKE_FIXTURE_ENABLED}
              onChooseImage={handleChooseImage}
              onCaptureImage={handleCaptureImage}
              onClearImage={handleClearImage}
              onExtractText={handleExtractText}
              onUseSmokeFixture={handleUseSmokeFixtureImage}
              selectedImage={sourceState.selectedImage}
              status={sourceState.ocrStatus}
            />
          ) : null}

          {sourceState.mode === "pdf" ? (
            <PdfImportPanel
              acceptedJob={
                activeExtractionJob?.source.sourceKind === "pdf"
                  ? activeExtractionJob
                  : null
              }
              canExtract={canExtractPdfText(sourceState)}
              error={sourceState.ocrError}
              onChoosePdf={handleChoosePdf}
              onClearPdf={handleClearPdf}
              onExtractText={handleExtractPdfText}
              pageCount={sourceState.pdfPageCount}
              selectedPdf={sourceState.selectedPdf}
              status={sourceState.ocrStatus}
            />
          ) : null}

          <TextField
            error={validationMessage}
            inputStyle={styles.sourceTextInput}
            label={
              sourceState.mode === "image" || sourceState.mode === "pdf"
                ? "Extracted text review"
                : "Source text"
            }
            multiline
            onChangeText={handleSourceTextChange}
            placeholder={
              sourceState.mode === "image" || sourceState.mode === "pdf"
                ? "Extracted text will appear here. Correct OCR mistakes before generating."
                : "Paste notes, readings, or lecture text here."
            }
            testID="reviewer-source-input"
            textAlignVertical="top"
            value={visibleSourceText}
          />

          <Text
            style={styles.characterCount}
            testID="reviewer-source-character-count"
          >
            {sourceCharacterCount} characters
          </Text>

          {generationError ? (
            <View style={styles.errorBox} testID="reviewer-generation-error">
              <Text style={styles.errorTitle}>{generationError.title}</Text>
              <Text style={styles.errorText}>{generationError.message}</Text>
              {generationError.detail ? (
                <Text style={styles.errorDetail}>{generationError.detail}</Text>
              ) : null}
            </View>
          ) : null}

          <Button
            disabled={Boolean(
              activeReviewerJob &&
                isActiveProcessingJobStatus(activeReviewerJob.status),
            )}
            fullWidth
            loading={isGenerating}
            onPress={handleGenerate}
            testID="reviewer-generate-button"
            variant="primary"
          >
            Generate reviewer
          </Button>

          <Button
            fullWidth
            loading={isSigningOut}
            onPress={signOut}
            variant="secondary"
          >
            Log out
          </Button>

          {onOpenLibrary ? (
            <Button
              fullWidth
              onPress={onOpenLibrary}
              testID="study-library-open-button"
              variant="secondary"
            >
              Study Library
            </Button>
          ) : null}

          {onOpenProcessing ? (
            <Button
              fullWidth
              onPress={onOpenProcessing}
              testID="processing-open-button"
              variant="secondary"
            >
              Processing
            </Button>
          ) : null}

          {onOpenCourses ? (
            <Button
              fullWidth
              onPress={onOpenCourses}
              testID="courses-open-button"
              variant="secondary"
            >
              Courses
            </Button>
          ) : null}
        </Card>

        {activeExtractionJob ? (
          <ProcessingJobCard
            job={activeExtractionJob}
            onCancel={() => void handleCancelJob(activeExtractionJob)}
            onRetry={() => void handleRetryJob(activeExtractionJob)}
            onReturn={() => void handleReturnFromJob(activeExtractionJob)}
            onView={() => void applyObservedJob(activeExtractionJob)}
          />
        ) : null}

        {activeReviewerJob ? (
          <ProcessingJobCard
            job={activeReviewerJob}
            onCancel={() => void handleCancelJob(activeReviewerJob)}
            onRetry={() => void handleRetryJob(activeReviewerJob)}
            onReturn={() => void handleReturnFromJob(activeReviewerJob)}
            onView={() => void applyObservedJob(activeReviewerJob)}
          />
        ) : null}

        {isGenerating && !activeReviewerJob ? (
          <Card style={styles.statusCard}>
            <Text style={styles.statusTitle}>Starting reviewer...</Text>
            <Text style={styles.statusText}>
              Keep Stay Focused open until the server accepts the job.
            </Text>
          </Card>
        ) : null}

        {reviewer ? (
          <SaveReviewerPanel
            isSaving={isSavingReviewer}
            onChangeTitle={(value) => {
              setSaveTitle(value);
              setSaveError(null);
            }}
            onOpenLibrary={onOpenLibrary}
            onSave={() => {
              void handleSaveReviewer();
            }}
            savedReviewer={savedReviewer}
            saveError={saveError}
            saveTitle={saveTitle}
          />
        ) : null}

        {reviewer ? <ReviewerPreview reviewer={reviewer} /> : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

function ProcessingJobCard({
  job,
  onCancel,
  onRetry,
  onReturn,
  onView,
}: {
  readonly job: ProcessingJobStatusView;
  readonly onCancel: () => void;
  readonly onRetry: () => void;
  readonly onReturn: () => void;
  readonly onView: () => void;
}) {
  const isActive = isActiveProcessingJobStatus(job.status);
  const hasUnits =
    job.progress.completedUnits !== null &&
    job.progress.totalUnits !== null &&
    job.progress.unitLabel !== null;

  return (
    <Card style={styles.statusCard}>
      <Text style={styles.statusTitle}>{processingJobLabel(job)}</Text>
      <Text style={styles.statusText}>{job.progress.message}</Text>
      {hasUnits ? (
        <Text style={styles.statusText}>
          {job.progress.completedUnits} of {job.progress.totalUnits}{" "}
          {job.progress.unitLabel} processed
        </Text>
      ) : null}
      {isActive ? (
        <Text style={styles.statusText}>
          You can switch apps. Processing will continue on the server.
        </Text>
      ) : null}
      {job.safeErrorMessage ? (
        <Text style={styles.errorText}>{job.safeErrorMessage}</Text>
      ) : null}
      <Text style={styles.helperText}>
        Latest update: {new Date(job.updatedAt).toLocaleString()}
      </Text>
      {job.status === "queued" || job.status === "running" ? (
        <Button fullWidth onPress={onCancel} variant="secondary">
          Cancel
        </Button>
      ) : null}
      {job.status === "succeeded" ? (
        <Button fullWidth onPress={onView} variant="primary">
          View completed result
        </Button>
      ) : null}
      {job.status === "failed" && job.retryable ? (
        <Button fullWidth onPress={onRetry} variant="primary">
          Retry
        </Button>
      ) : null}
      {!isActive && job.status !== "succeeded" ? (
        <Button fullWidth onPress={onReturn} variant="secondary">
          Return to source
        </Button>
      ) : null}
    </Card>
  );
}

function processingJobLabel(job: ProcessingJobStatusView): string {
  if (job.status === "queued") return "Waiting to start";
  if (job.status === "succeeded") return "Complete";
  if (job.status === "failed" || job.status === "expired") return "Needs attention";
  if (job.status === "cancelled") return "Cancelled";
  if (job.status === "cancellation_requested") return "Stopping safely";
  switch (job.stage) {
    case "inspecting_document": return "Inspecting document";
    case "extracting_native_text":
    case "preparing_ocr_chunks":
    case "extracting_ocr": return "Reading pages";
    case "verifying_pages": return "Checking extraction";
    case "preparing_source":
    case "normalizing_source": return "Preparing source";
    case "detecting_outline":
    case "planning_sections": return "Organizing topics";
    case "generating_sections": return "Creating reviewer sections";
    case "verifying_coverage":
    case "retrying_sections": return "Checking coverage";
    default:
      return job.jobType === "document_extraction"
        ? "Finishing extraction"
        : "Finishing reviewer";
  }
}

function ImageImportPanel({
  acceptedJob,
  canExtract,
  error,
  isSmokeFixtureEnabled,
  onChooseImage,
  onCaptureImage,
  onClearImage,
  onExtractText,
  onUseSmokeFixture,
  selectedImage,
  status,
}: {
  readonly acceptedJob: ProcessingJobStatusView | null;
  readonly canExtract: boolean;
  readonly error: SourceFlowError | null;
  readonly isSmokeFixtureEnabled: boolean;
  readonly onChooseImage: () => void;
  readonly onCaptureImage: () => void;
  readonly onClearImage: () => void;
  readonly onExtractText: () => void;
  readonly onUseSmokeFixture: () => void;
  readonly selectedImage: SelectedGalleryImage | null;
  readonly status: "idle" | "selected" | "uploading" | "ready" | "failed";
}) {
  const isUploading = status === "uploading";

  return (
    <View style={styles.imagePanel}>
      <View style={styles.imageActions}>
        <Button
          disabled={isUploading}
          onPress={onChooseImage}
          style={styles.imageActionButton}
          testID="reviewer-choose-image-button"
          variant="secondary"
        >
          Choose image
        </Button>

        <Button
          disabled={isUploading}
          onPress={onCaptureImage}
          style={styles.imageActionButton}
          testID="reviewer-capture-image-button"
          variant="secondary"
        >
          Take photo
        </Button>

        {isSmokeFixtureEnabled ? (
          <Button
            disabled={isUploading}
            onPress={onUseSmokeFixture}
            style={styles.imageActionButton}
            testID="reviewer-ocr-smoke-fixture-button"
            variant="ghost"
          >
            Use smoke image
          </Button>
        ) : null}
      </View>

      {selectedImage ? (
        <View style={styles.selectedImageGroup}>
          <Image
            resizeMode="cover"
            source={{ uri: selectedImage.uri }}
            style={styles.imagePreview}
            testID="reviewer-image-preview"
          />
          <View style={styles.imageMeta}>
            <Text style={styles.imageName} testID="reviewer-image-name">
              {selectedImage.fileName || "Selected image"}
            </Text>
            <Text style={styles.imageMetaText}>
              {selectedImage.mimeType.toUpperCase()}
              {selectedImage.fileSize !== undefined
                ? ` - ${formatImageSize(selectedImage.fileSize)}`
                : ""}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.helperText}>
          Choose a PNG or JPEG image from your gallery, or take a photo.
        </Text>
      )}

      {selectedImage ? (
        <View style={styles.imageActions}>
          <Button
            disabled={!canExtract}
            loading={isUploading}
            onPress={onExtractText}
            style={styles.imageActionButton}
            testID="reviewer-extract-text-button"
            variant="primary"
          >
            {status === "failed" ? "Retry extraction" : "Extract text"}
          </Button>
          <Button
            disabled={isUploading}
            onPress={onClearImage}
            style={styles.imageActionButton}
            testID="reviewer-clear-image-button"
            variant="secondary"
          >
            Clear image
          </Button>
        </View>
      ) : null}

      {isUploading ? (
        <View style={styles.infoBox} testID="reviewer-ocr-loading">
          <Text style={styles.statusTitle}>
            {acceptedJob ? "Extraction started" : "Uploading source…"}
          </Text>
          <Text style={styles.statusText}>
            {acceptedJob
              ? "You can switch apps. Processing will continue on the server."
              : "Keep Stay Focused open until the upload is accepted."}
          </Text>
        </View>
      ) : null}

      {status === "ready" ? (
        <View style={styles.successBox} testID="reviewer-ocr-ready">
          <Text style={styles.successText}>
            Text extracted. Review and correct it before generating.
          </Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBox} testID="reviewer-ocr-error">
          <Text style={styles.errorTitle}>{error.title}</Text>
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      ) : null}
    </View>
  );
}

function PdfImportPanel({
  acceptedJob,
  canExtract,
  error,
  onChoosePdf,
  onClearPdf,
  onExtractText,
  pageCount,
  selectedPdf,
  status,
}: {
  readonly acceptedJob: ProcessingJobStatusView | null;
  readonly canExtract: boolean;
  readonly error: SourceFlowError | null;
  readonly onChoosePdf: () => void;
  readonly onClearPdf: () => void;
  readonly onExtractText: () => void;
  readonly pageCount: number | null;
  readonly selectedPdf: SelectedPdfDocument | null;
  readonly status: "idle" | "selected" | "uploading" | "ready" | "failed";
}) {
  const isUploading = status === "uploading";

  return (
    <View style={styles.imagePanel}>
      <View style={styles.imageActions}>
        <Button
          disabled={isUploading}
          onPress={onChoosePdf}
          style={styles.imageActionButton}
          testID="reviewer-choose-pdf-button"
          variant="secondary"
        >
          Choose PDF
        </Button>
      </View>

      {selectedPdf ? (
        <View style={styles.selectedPdfGroup} testID="reviewer-pdf-summary">
          <Text style={styles.imageName} testID="reviewer-pdf-name">
            {selectedPdf.fileName || "Selected PDF"}
          </Text>
          <Text style={styles.imageMetaText} testID="reviewer-pdf-meta">
            {selectedPdf.mimeType.toUpperCase()}
            {selectedPdf.fileSize !== undefined
              ? ` - ${formatFileSize(selectedPdf.fileSize)}`
              : ""}
            {pageCount !== null
              ? ` - ${pageCount} ${pageCount === 1 ? "page" : "pages"}`
              : ""}
          </Text>
        </View>
      ) : (
        <Text style={styles.helperText}>Choose a PDF from Files.</Text>
      )}

      {selectedPdf ? (
        <View style={styles.imageActions}>
          <Button
            disabled={!canExtract}
            loading={isUploading}
            onPress={onExtractText}
            style={styles.imageActionButton}
            testID="reviewer-extract-pdf-text-button"
            variant="primary"
          >
            {status === "failed" ? "Retry extraction" : "Extract text"}
          </Button>
          <Button
            disabled={isUploading}
            onPress={onClearPdf}
            style={styles.imageActionButton}
            testID="reviewer-clear-pdf-button"
            variant="secondary"
          >
            Clear PDF
          </Button>
        </View>
      ) : null}

      {isUploading ? (
        <View style={styles.infoBox} testID="reviewer-pdf-ocr-loading">
          <Text style={styles.statusTitle}>
            {acceptedJob ? "Extraction started" : "Uploading source…"}
          </Text>
          <Text style={styles.statusText}>
            {acceptedJob
              ? "You can switch apps. Processing will continue on the server."
              : "Keep Stay Focused open until the upload is accepted."}
          </Text>
        </View>
      ) : null}

      {status === "ready" ? (
        <View style={styles.successBox} testID="reviewer-pdf-ocr-ready">
          <Text style={styles.successText}>
            Text extracted. Review and correct it before generating.
          </Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBox} testID="reviewer-pdf-ocr-error">
          <Text style={styles.errorTitle}>{error.title}</Text>
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      ) : null}
    </View>
  );
}

function SaveReviewerPanel({
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
  readonly onOpenLibrary?: () => void;
  readonly onSave: () => void;
  readonly savedReviewer: SavedReviewerSummary | null;
  readonly saveError: GenerationDisplayError | null;
  readonly saveTitle: string;
}) {
  return (
    <Card style={styles.saveCard} testID="reviewer-save-card">
      <View style={styles.saveHeader}>
        <Text style={styles.statusTitle}>Save to Study Library</Text>
        <Text style={styles.statusText}>
          Save this validated reviewer so you can reopen it later without
          regenerating.
        </Text>
      </View>

      <TextField
        editable={!savedReviewer}
        label="Saved reviewer title"
        onChangeText={onChangeTitle}
        testID="reviewer-save-title-input"
        value={saveTitle}
      />

      {saveError ? (
        <View style={styles.errorBox} testID="reviewer-save-error">
          <Text style={styles.errorTitle}>{saveError.title}</Text>
          <Text style={styles.errorText}>{saveError.message}</Text>
          {saveError.detail ? (
            <Text style={styles.errorDetail}>{saveError.detail}</Text>
          ) : null}
        </View>
      ) : null}

      {savedReviewer ? (
        <View style={styles.successBox} testID="reviewer-save-success">
          <Text style={styles.successText}>
            Saved to Study Library as {savedReviewer.title}.
          </Text>
        </View>
      ) : null}

      <View style={styles.imageActions}>
        <Button
          disabled={Boolean(savedReviewer) || saveTitle.trim().length === 0}
          loading={isSaving}
          onPress={onSave}
          style={styles.imageActionButton}
          testID="reviewer-save-button"
          variant="primary"
        >
          {savedReviewer ? "Saved" : "Save reviewer"}
        </Button>

        {onOpenLibrary ? (
          <Button
            disabled={isSaving}
            onPress={onOpenLibrary}
            style={styles.imageActionButton}
            testID="reviewer-save-open-library-button"
            variant="secondary"
          >
            Open Study Library
          </Button>
        ) : null}
      </View>
    </Card>
  );
}

function formatImageSize(bytes: number): string {
  return formatFileSize(bytes);
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KiB`;
  }
  return `${bytes} bytes`;
}

function formatProcessingJobApiError(
  error: ProcessingJobApiError,
): GenerationDisplayError {
  const detail = error.status !== undefined
    ? `Details: HTTP ${error.status}, code ${error.code}.`
    : `Details: code ${error.code}.`;
  if (error.code === "unauthorized" || error.code === "missing_access_token") {
    return {
      title: "Sign in again",
      message:
        "The server job continues independently. Sign in again to retrieve its status.",
      detail,
    };
  }
  if (error.code === "request_timeout" || error.code === "network_error") {
    return {
      title: "Status temporarily unavailable",
      message:
        "The connection was interrupted. Any accepted server job was not cancelled; reconnect to check it.",
      detail,
    };
  }
  if (error.code === "processing_job_idempotency_conflict") {
    return {
      title: "Request could not be replayed",
      message: error.message,
      detail,
    };
  }
  return {
    title: error.retryable ? "Processing needs attention" : "Request needs a change",
    message: error.message,
    detail,
  };
}

function toOcrCompatibleJobError(error: ProcessingJobApiError): OcrClientError {
  const code: OcrClientError["code"] = (() => {
    switch (error.code) {
      case "unauthorized": return "unauthorized";
      case "missing_access_token": return "missing_access_token";
      case "invalid_api_base_url": return "invalid_api_base_url";
      case "invalid_pdf": return "invalid_pdf";
      case "pdf_encrypted": return "pdf_encrypted";
      case "pdf_page_limit_exceeded": return "pdf_page_limit_exceeded";
      case "pdf_ocr_page_limit_exceeded": return "pdf_ocr_page_limit_exceeded";
      case "file_too_large": return "file_too_large";
      case "image_too_large": return "image_too_large";
      case "empty_file": return "empty_file";
      case "empty_image": return "empty_image";
      case "unsupported_file_type": return "unsupported_file_type";
      case "unsupported_media_type": return "unsupported_media_type";
      case "request_timeout":
      case "network_error": return "network_error";
      default: return "unknown_error";
    }
  })();
  return {
    code,
    message: error.message,
    ...(error.status !== undefined ? { status: error.status } : {}),
    apiCode: error.code,
  };
}

function formatSaveReviewerError(
  error: ReviewerLibraryError,
): GenerationDisplayError {
  const detail =
    error.status !== undefined
      ? `Details: HTTP ${error.status}, code ${error.apiCode ?? error.code}.`
      : `Details: code ${error.apiCode ?? error.code}.`;

  if (error.code === "unauthorized" || error.code === "missing_access_token") {
    return {
      title: "Login session expired",
      message: "Sign out and sign in again before saving this reviewer.",
      detail,
    };
  }

  if (error.code === "invalid_title") {
    return {
      title: "Save title needs a change",
      message: error.message,
      detail,
    };
  }

  if (error.code === "network_error") {
    return {
      title: "Could not reach the API",
      message: "Check the API address and network connection.",
      detail,
    };
  }

  if (error.code === "reviewer_storage_not_configured") {
    return {
      title: "Study Library is not configured",
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

function defaultReviewerSaveTitle(
  reviewer: ReviewerOutput,
  sourceTitle: string,
): string {
  const title = sourceTitle.trim() || reviewer.title.trim();
  return title || "Untitled reviewer";
}

function createSavedReviewerSourceMetadata({
  imageSourceMode,
  sourceCharacterCount,
  sourceState,
  sourceTitle,
}: {
  readonly imageSourceMode: Extract<SavedReviewerSourceMode, "gallery" | "camera">;
  readonly sourceCharacterCount: number;
  readonly sourceState: ReviewerSourceState;
  readonly sourceTitle: string;
}): SavedReviewerSourceMetadata {
  const sourceMode =
    sourceState.mode === "paste"
      ? "paste"
      : sourceState.mode === "pdf"
        ? "pdf"
        : imageSourceMode;
  const sourceLabel = sourceTitle.trim();

  return {
    sourceMode,
    sourceCharacterCount,
    ...(sourceState.mode === "pdf" && sourceState.pdfPageCount !== null
      ? { pdfPageCount: sourceState.pdfPageCount }
      : {}),
    ...(sourceLabel ? { sourceLabel } : {}),
  };
}

function isOcrSmokeFixtureEnabled(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  if (process.env.EXPO_PUBLIC_OCR_SMOKE_FIXTURE === "1") {
    return true;
  }

  try {
    const location = globalThis.location;
    return new URLSearchParams(location?.search ?? "").get("ocrSmoke") === "1";
  } catch {
    return false;
  }
}

function revokeWebObjectUrl(uri: string | undefined): void {
  if (!uri?.startsWith("blob:")) {
    return;
  }

  const revokeObjectURL = globalThis.URL?.revokeObjectURL;
  if (typeof revokeObjectURL === "function") {
    revokeObjectURL.call(globalThis.URL, uri);
  }
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[6],
  },
  stack: {
    gap: spacing[6],
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
  subtitle: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    lineHeight: 23,
  },
  formCard: {
    gap: spacing[5],
  },
  sourceModeGroup: {
    gap: spacing[2],
  },
  fieldLabel: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.caption,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sourceModeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  sourceModeButton: {
    flexGrow: 1,
    minWidth: 132,
  },
  imagePanel: {
    backgroundColor: colors.card,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing[3],
    padding: spacing[3],
  },
  imageActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  imageActionButton: {
    flexGrow: 1,
    minWidth: 132,
  },
  selectedImageGroup: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing[3],
  },
  selectedPdfGroup: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    borderWidth: 1,
    gap: spacing[1],
    padding: spacing[3],
  },
  imagePreview: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    borderWidth: 1,
    height: 72,
    width: 72,
  },
  imageMeta: {
    flex: 1,
    gap: spacing[1],
  },
  imageName: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    fontWeight: "800",
    lineHeight: 19,
  },
  imageMetaText: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.caption,
    lineHeight: 17,
  },
  helperText: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  sourceTextInput: {
    minHeight: DEFAULT_SOURCE_TEXT_HEIGHT,
  },
  characterCount: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.caption,
    lineHeight: 17,
    marginTop: -spacing[3],
    textAlign: "right",
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
  infoBox: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    gap: spacing[1],
    padding: spacing[3],
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
  statusCard: {
    gap: spacing[2],
  },
  saveCard: {
    gap: spacing[4],
  },
  saveHeader: {
    gap: spacing[2],
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
});
