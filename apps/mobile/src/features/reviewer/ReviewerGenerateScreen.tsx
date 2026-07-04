import type { ReviewerOutput } from "@stay-focused/engine";
import { useEffect, useReducer, useRef, useState } from "react";
import {
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
import { colors, spacing, typography } from "../../design/tokens";
import {
  API_BASE_URL_SETUP_HINT,
  generateReviewer,
  type GenerateReviewerError,
} from "../../services/reviewerApi";
import { extractOcrText } from "../../services/ocrApi";
import {
  chooseImageFromGallery,
  createOcrSmokeFixtureImage,
  type SelectedGalleryImage,
} from "./galleryImage";
import {
  canExtractOcrText,
  getCurrentSourceText,
  getSourceCharacterCount,
  initialReviewerSourceState,
  reviewerSourceReducer,
  type SourceFlowError,
} from "./reviewerSourceFlow";
import { ReviewerPreview } from "./ReviewerPreview";

const DEFAULT_SOURCE_TEXT_HEIGHT = 180;
const OCR_SMOKE_FIXTURE_ENABLED = isOcrSmokeFixtureEnabled();

interface GenerationDisplayError {
  readonly title: string;
  readonly message: string;
  readonly detail?: string;
}

export function ReviewerGenerateScreen() {
  const { isSigningOut, session, signOut } = useAuth();
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceState, dispatchSource] = useReducer(
    reviewerSourceReducer,
    initialReviewerSourceState,
  );
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [generationError, setGenerationError] =
    useState<GenerationDisplayError | null>(null);
  const [reviewer, setReviewer] = useState<ReviewerOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const reviewerAbortControllerRef = useRef<AbortController | null>(null);
  const ocrAbortControllerRef = useRef<AbortController | null>(null);

  const email = session?.user.email ?? "No email on this account";
  const visibleSourceText = getCurrentSourceText(sourceState);
  const sourceCharacterCount = getSourceCharacterCount(sourceState);

  useEffect(() => {
    return () => {
      const reviewerAbortController = reviewerAbortControllerRef.current;
      const ocrAbortController = ocrAbortControllerRef.current;
      reviewerAbortControllerRef.current = null;
      ocrAbortControllerRef.current = null;
      reviewerAbortController?.abort();
      ocrAbortController?.abort();
    };
  }, []);

  useEffect(() => {
    const previewUri = sourceState.selectedImage?.uri;
    return () => {
      revokeWebObjectUrl(previewUri);
    };
  }, [sourceState.selectedImage?.uri]);

  const handleGenerate = async () => {
    const trimmedSourceText = visibleSourceText.trim();
    const trimmedSourceTitle = sourceTitle.trim();

    setValidationMessage(null);
    setGenerationError(null);

    if (!trimmedSourceText) {
      setValidationMessage(
        sourceState.mode === "image"
          ? "Extract text from an image, or enter corrected text before generating."
          : "Paste source text before generating a reviewer.",
      );
      return;
    }

    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
    if (!apiBaseUrl) {
      setGenerationError({
        title: "API base URL missing",
        message: API_BASE_URL_SETUP_HINT,
      });
      return;
    }

    const accessToken = session?.accessToken.trim();
    if (!accessToken) {
      setGenerationError({
        title: "Session check failed",
        message:
          "Your session is missing an access token. Sign out and sign in again.",
      });
      return;
    }

    reviewerAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    reviewerAbortControllerRef.current = abortController;

    setReviewer(null);
    setIsGenerating(true);

    try {
      const result = await generateReviewer({
        apiBaseUrl,
        accessToken,
        sourceText: trimmedSourceText,
        ...(trimmedSourceTitle ? { sourceTitle: trimmedSourceTitle } : {}),
        signal: abortController.signal,
      });

      if (result.ok) {
        setReviewer(result.reviewer);
      } else {
        setGenerationError(formatGenerateReviewerError(result.error));
      }
    } finally {
      if (reviewerAbortControllerRef.current === abortController) {
        reviewerAbortControllerRef.current = null;
        setIsGenerating(false);
      }
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

  const handleUseSmokeFixtureImage = () => {
    dispatchSource({
      type: "image_selected",
      image: createOcrSmokeFixtureImage(),
    });
  };

  const handleClearImage = () => {
    ocrAbortControllerRef.current?.abort();
    ocrAbortControllerRef.current = null;
    dispatchSource({ type: "clear_image" });
  };

  const handleExtractText = async () => {
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

    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
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
    if (!accessToken) {
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

    ocrAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    ocrAbortControllerRef.current = abortController;

    dispatchSource({ type: "ocr_started" });

    try {
      const result = await extractOcrText({
        apiBaseUrl,
        accessToken,
        image: selectedImage,
        platformOS: Platform.OS,
        signal: abortController.signal,
      });

      if (result.ok) {
        dispatchSource({ type: "ocr_succeeded", text: result.data.text });
      } else {
        dispatchSource({ type: "ocr_failed", error: result.error });
      }
    } finally {
      if (ocrAbortControllerRef.current === abortController) {
        ocrAbortControllerRef.current = null;
      }
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
            </View>
          </View>

          {sourceState.mode === "image" ? (
            <ImageImportPanel
              canExtract={canExtractOcrText(sourceState)}
              error={sourceState.ocrError}
              isSmokeFixtureEnabled={OCR_SMOKE_FIXTURE_ENABLED}
              onChooseImage={handleChooseImage}
              onClearImage={handleClearImage}
              onExtractText={handleExtractText}
              onUseSmokeFixture={handleUseSmokeFixtureImage}
              selectedImage={sourceState.selectedImage}
              status={sourceState.ocrStatus}
            />
          ) : null}

          <TextField
            error={validationMessage}
            inputStyle={styles.sourceTextInput}
            label={
              sourceState.mode === "image"
                ? "Extracted text review"
                : "Source text"
            }
            multiline
            onChangeText={handleSourceTextChange}
            placeholder={
              sourceState.mode === "image"
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
        </Card>

        {isGenerating ? (
          <Card style={styles.statusCard}>
            <Text style={styles.statusTitle}>Generating reviewer...</Text>
            <Text style={styles.statusText}>
              This may take 10-45 seconds. Stay Focused is turning your source
              into readable study cards.
            </Text>
          </Card>
        ) : null}

        {reviewer ? <ReviewerPreview reviewer={reviewer} /> : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

function ImageImportPanel({
  canExtract,
  error,
  isSmokeFixtureEnabled,
  onChooseImage,
  onClearImage,
  onExtractText,
  onUseSmokeFixture,
  selectedImage,
  status,
}: {
  readonly canExtract: boolean;
  readonly error: SourceFlowError | null;
  readonly isSmokeFixtureEnabled: boolean;
  readonly onChooseImage: () => void;
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
        <Text style={styles.helperText}>Choose a PNG or JPEG image from your gallery.</Text>
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
          <Text style={styles.statusTitle}>Extracting text...</Text>
          <Text style={styles.statusText}>
            The image is uploaded to the protected OCR API. You can edit the
            extracted text before reviewer generation.
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

function formatImageSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KiB`;
  }
  return `${bytes} bytes`;
}

function formatGenerateReviewerError(
  error: GenerateReviewerError,
): GenerationDisplayError {
  const detail = formatTechnicalDetail(error);

  if (error.code === "reviewer_validation_failed" || error.status === 422) {
    return {
      title: "Reviewer needs a clearer source",
      message:
        "The reviewer could not pass validation from this source. Try a clearer or longer source.",
      detail,
    };
  }

  if (error.code === "invalid_api_base_url") {
    return {
      title: "API address needs setup",
      message: error.message,
      detail,
    };
  }

  if (error.code === "network_error") {
    return {
      title: "Could not reach the API",
      message:
        "Check EXPO_PUBLIC_API_BASE_URL, the host, and the port. The API must be reachable from the current test surface.",
      detail,
    };
  }

  if (error.code === "request_timeout") {
    return {
      title: "Reviewer took too long",
      message:
        "The API took too long to finish. Try again, or use a shorter source for now.",
      detail,
    };
  }

  if (error.code === "unauthorized") {
    return {
      title: "Login session expired",
      message:
        "Your login session was rejected by the API. Sign out and sign in again before generating another reviewer.",
      detail,
    };
  }

  if (isValidationRequestError(error)) {
    return {
      title: "Reviewer request needs a change",
      message: error.message,
      detail,
    };
  }

  if (isPayloadTooLargeError(error)) {
    return {
      title: "Source is too large",
      message: error.message,
      detail,
    };
  }

  if (isServerGenerationError(error)) {
    return {
      title: "Reviewer generation failed",
      message:
        "The API could not generate the reviewer. Try again, or check the API server if this is local testing.",
      detail,
    };
  }

  return {
    title: "Reviewer generation failed",
    message:
      "Something went wrong while generating the reviewer. Try again in a moment.",
    detail,
  };
}

function isValidationRequestError(error: GenerateReviewerError): boolean {
  return (
    error.status === 400 ||
    error.code === "invalid_json" ||
    error.code === "invalid_request"
  );
}

function isPayloadTooLargeError(error: GenerateReviewerError): boolean {
  return (
    error.status === 413 ||
    error.code === "payload_too_large" ||
    error.code === "source_text_too_large"
  );
}

function isServerGenerationError(error: GenerateReviewerError): boolean {
  return (
    (error.status !== undefined && error.status >= 500) ||
    error.code === "provider_configuration_error" ||
    error.code === "reviewer_generation_failed"
  );
}

function formatTechnicalDetail(error: GenerateReviewerError): string {
  const details = [
    error.status !== undefined ? `HTTP ${error.status}` : null,
    `code ${error.apiCode ?? error.code}`,
  ].filter(isString);

  if (details.length === 0) {
    return `Details: ${error.message}`;
  }

  return `Details: ${details.join(", ")}. ${error.message}`;
}

function isString(value: string | null): value is string {
  return value !== null;
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
