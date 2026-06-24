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

export function ReviewerGenerateScreen() {
  const { isSigningOut, session, signOut } = useAuth();
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
    setErrorMessage(null);

    if (!trimmedSourceText) {
      setValidationMessage("Paste source text before generating a reviewer.");
      return;
    }

    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
    if (!apiBaseUrl) {
      setErrorMessage(
        "EXPO_PUBLIC_API_BASE_URL is required before reviewer generation can run.",
      );
      return;
    }

    const token = await getAccessToken();
    if (!token.ok) {
      setErrorMessage(token.error.message);
      return;
    }
    if (!token.data) {
      setErrorMessage(
        "Your session is missing an access token. Sign out and sign in again.",
      );
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
        setErrorMessage(formatGenerateReviewerError(result.error));
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
              if (validationMessage) {
                setValidationMessage(null);
              }
            }}
            placeholder="Paste notes, readings, or lecture text here."
            textAlignVertical="top"
            value={sourceText}
          />

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
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
            <Text style={styles.statusTitle}>Generating reviewer</Text>
            <Text style={styles.statusText}>
              Stay Focused is sending your source text to the authenticated API.
            </Text>
          </Card>
        ) : null}

        {reviewer ? <ReviewerPreview reviewer={reviewer} /> : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

function formatGenerateReviewerError(error: GenerateReviewerError): string {
  const details = [
    error.status !== undefined ? `HTTP ${error.status}` : null,
    `code ${error.apiCode ?? error.code}`,
  ].filter(isString);

  if (details.length === 0) {
    return error.message;
  }

  return `${error.message} (${details.join(", ")})`;
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
    padding: spacing[3],
  },
  errorText: {
    color: colors.error,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
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
