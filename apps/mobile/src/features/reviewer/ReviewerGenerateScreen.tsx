import type { ReviewerOutput } from "@stay-focused/engine";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";

import { getAccessToken, useAuth } from "../../auth";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { colors, spacing, typography } from "../../design/tokens";
import {
  generateReviewer,
  type GenerateReviewerError,
} from "../../services/reviewerApi";
import { ReviewerPreview } from "./ReviewerPreview";

const DEFAULT_SOURCE_TEXT_HEIGHT = 180;

interface GenerationDisplayError {
  readonly title: string;
  readonly message: string;
  readonly detail?: string;
}

export function ReviewerGenerateScreen() {
  const { isSigningOut, session, signOut } = useAuth();
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [generationError, setGenerationError] =
    useState<GenerationDisplayError | null>(null);
  const [reviewer, setReviewer] = useState<ReviewerOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const email = session?.user.email ?? "No email on this account";

  useEffect(() => {
    return () => {
      const abortController = abortControllerRef.current;
      abortControllerRef.current = null;
      abortController?.abort();
    };
  }, []);

  const handleGenerate = async () => {
    const trimmedSourceText = sourceText.trim();
    const trimmedSourceTitle = sourceTitle.trim();

    setValidationMessage(null);
    setGenerationError(null);

    if (!trimmedSourceText) {
      setValidationMessage("Paste source text before generating a reviewer.");
      return;
    }

    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
    if (!apiBaseUrl) {
      setGenerationError({
        title: "API setup needed",
        message:
          "EXPO_PUBLIC_API_BASE_URL is required before reviewer generation can run.",
      });
      return;
    }

    const token = await getAccessToken();
    if (!token.ok) {
      setGenerationError({
        title: "Session check failed",
        message: token.error.message,
      });
      return;
    }
    if (!token.data) {
      setGenerationError({
        title: "Session check failed",
        message:
          "Your session is missing an access token. Sign out and sign in again.",
      });
      return;
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setReviewer(null);
    setIsGenerating(true);

    try {
      const result = await generateReviewer({
        apiBaseUrl,
        accessToken: token.data,
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
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
        setIsGenerating(false);
      }
    }
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={styles.stack}
      >
        <View style={styles.header}>
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
            value={sourceTitle}
          />

          <TextField
            error={validationMessage}
            inputStyle={styles.sourceTextInput}
            label="Source text"
            multiline
            onChangeText={(value) => {
              setSourceText(value);
              if (generationError) {
                setGenerationError(null);
              }
              if (validationMessage) {
                setValidationMessage(null);
              }
            }}
            placeholder="Paste notes, readings, or lecture text here."
            textAlignVertical="top"
            value={sourceText}
          />

          {generationError ? (
            <View style={styles.errorBox}>
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

  if (error.code === "network_error") {
    return {
      title: "Could not reach the API",
      message:
        "Could not reach the API. Check that the API server is running and the phone is on the same Wi-Fi.",
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
      title: "Session expired",
      message: "Sign out and sign in again before generating another reviewer.",
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
  sourceTextInput: {
    minHeight: DEFAULT_SOURCE_TEXT_HEIGHT,
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
