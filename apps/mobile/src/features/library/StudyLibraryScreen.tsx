import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
} from "../../services/reviewerApi";
import {
  deleteReviewer,
  getReviewer,
  listReviewers,
  renameReviewer,
  type ReviewerLibraryError,
  type SavedReviewerDetail,
  type SavedReviewerSummary,
  type SavedReviewerSourceMode,
} from "../../services/reviewerLibraryApi";
import { ReviewerPreview } from "../reviewer/ReviewerPreview";

interface StudyLibraryScreenProps {
  readonly onCreateReviewer: () => void;
}

interface LibraryDisplayError {
  readonly title: string;
  readonly message: string;
  readonly detail?: string;
}

interface RenameState {
  readonly reviewerId: string;
  readonly title: string;
}

export function StudyLibraryScreen({ onCreateReviewer }: StudyLibraryScreenProps) {
  const { isSigningOut, session, signOut } = useAuth();
  const [reviewers, setReviewers] = useState<readonly SavedReviewerSummary[]>([]);
  const [openedReviewer, setOpenedReviewer] =
    useState<SavedReviewerDetail | null>(null);
  const [error, setError] = useState<LibraryDisplayError | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [renameState, setRenameState] = useState<RenameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpening, setIsOpening] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [deletingReviewerId, setDeletingReviewerId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadLibrary = useCallback(async () => {
    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      setError(context.error);
      setIsLoading(false);
      return;
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsLoading(true);
    setError(null);

    try {
      const result = await listReviewers({
        ...context.value,
        signal: abortController.signal,
      });

      if (result.ok) {
        setReviewers(result.data);
      } else {
        setError(formatLibraryError(result.error));
      }
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
        setIsLoading(false);
      }
    }
  }, [session?.accessToken]);

  useEffect(() => {
    void loadLibrary();
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [loadLibrary]);

  const handleOpenReviewer = async (reviewerId: string) => {
    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      setError(context.error);
      return;
    }

    setIsOpening(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await getReviewer({
        ...context.value,
        reviewerId,
      });

      if (result.ok) {
        setOpenedReviewer(result.data);
      } else {
        setError(formatLibraryError(result.error));
      }
    } finally {
      setIsOpening(false);
    }
  };

  const handleStartRename = (reviewer: SavedReviewerSummary) => {
    setRenameState({ reviewerId: reviewer.id, title: reviewer.title });
    setError(null);
    setSuccessMessage(null);
  };

  const handleRename = async () => {
    if (!renameState) {
      return;
    }

    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      setError(context.error);
      return;
    }

    const nextTitle = renameState.title.trim();
    if (!nextTitle) {
      setError({
        title: "Rename needs a title",
        message: "Enter a title before saving the rename.",
      });
      return;
    }

    setIsRenaming(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await renameReviewer({
        ...context.value,
        reviewerId: renameState.reviewerId,
        title: nextTitle,
      });

      if (result.ok) {
        setReviewers((current) =>
          current.map((reviewer) =>
            reviewer.id === result.data.id ? result.data : reviewer,
          ),
        );
        setOpenedReviewer((current) =>
          current && current.id === result.data.id
            ? { ...current, title: result.data.title, updatedAt: result.data.updatedAt }
            : current,
        );
        setRenameState(null);
        setSuccessMessage("Reviewer renamed.");
      } else {
        setError(formatLibraryError(result.error));
      }
    } finally {
      setIsRenaming(false);
    }
  };

  const handleRequestDelete = (reviewer: SavedReviewerSummary) => {
    Alert.alert(
      "Delete reviewer?",
      `Delete "${reviewer.title}" from your Study Library?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void handleDelete(reviewer.id);
          },
        },
      ],
    );
  };

  const handleDelete = async (reviewerId: string) => {
    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      setError(context.error);
      return;
    }

    setDeletingReviewerId(reviewerId);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await deleteReviewer({
        ...context.value,
        reviewerId,
      });

      if (result.ok) {
        setReviewers((current) =>
          current.filter((reviewer) => reviewer.id !== reviewerId),
        );
        setOpenedReviewer((current) =>
          current?.id === reviewerId ? null : current,
        );
        setRenameState((current) =>
          current?.reviewerId === reviewerId ? null : current,
        );
        setSuccessMessage("Reviewer deleted.");
      } else {
        setError(formatLibraryError(result.error));
      }
    } finally {
      setDeletingReviewerId(null);
    }
  };

  if (openedReviewer) {
    return (
      <Screen contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Study Library</Text>
          <Text style={styles.title}>{openedReviewer.title}</Text>
          <Text style={styles.subtitle}>
            Opened from your saved reviewers without regenerating.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button onPress={() => setOpenedReviewer(null)} variant="secondary">
            Back to library
          </Button>
          <Button
            onPress={() => handleStartRename(openedReviewer)}
            variant="secondary"
          >
            Rename
          </Button>
          <Button
            loading={deletingReviewerId === openedReviewer.id}
            onPress={() => handleRequestDelete(openedReviewer)}
            variant="danger"
          >
            Delete
          </Button>
        </View>

        {renameState ? (
          <RenameCard
            isRenaming={isRenaming}
            onCancel={() => setRenameState(null)}
            onChangeTitle={(title) =>
              setRenameState((current) =>
                current ? { ...current, title } : current,
              )
            }
            onSubmit={handleRename}
            title={renameState.title}
          />
        ) : null}

        {error ? <ErrorCard error={error} /> : null}
        {successMessage ? <SuccessCard message={successMessage} /> : null}

        <ReviewerPreview reviewer={openedReviewer.reviewerOutput} />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header} testID="study-library-screen">
        <Text style={styles.kicker}>Study Library</Text>
        <Text style={styles.title}>Saved reviewers</Text>
        <Text style={styles.subtitle}>
          {session?.user.email ?? "Signed in account"}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button onPress={onCreateReviewer} variant="primary">
          New reviewer
        </Button>
        <Button loading={isLoading} onPress={loadLibrary} variant="secondary">
          Refresh
        </Button>
        <Button loading={isSigningOut} onPress={signOut} variant="secondary">
          Log out
        </Button>
      </View>

      {renameState ? (
        <RenameCard
          isRenaming={isRenaming}
          onCancel={() => setRenameState(null)}
          onChangeTitle={(title) =>
            setRenameState((current) =>
              current ? { ...current, title } : current,
            )
          }
          onSubmit={handleRename}
          title={renameState.title}
        />
      ) : null}

      {error ? <ErrorCard error={error} /> : null}
      {successMessage ? <SuccessCard message={successMessage} /> : null}

      {isLoading ? (
        <Card style={styles.statusCard} testID="study-library-loading">
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.statusTitle}>Loading saved reviewers...</Text>
        </Card>
      ) : reviewers.length === 0 ? (
        <Card style={styles.statusCard} testID="study-library-empty">
          <Text style={styles.statusTitle}>No saved reviewers yet</Text>
          <Text style={styles.statusText}>
            Generate a reviewer, then save it here when it is ready.
          </Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {reviewers.map((reviewer) => (
            <ReviewerSummaryCard
              isDeleting={deletingReviewerId === reviewer.id}
              isOpening={isOpening}
              key={reviewer.id}
              onDelete={() => handleRequestDelete(reviewer)}
              onOpen={() => void handleOpenReviewer(reviewer.id)}
              onRename={() => handleStartRename(reviewer)}
              reviewer={reviewer}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function RenameCard({
  isRenaming,
  onCancel,
  onChangeTitle,
  onSubmit,
  title,
}: {
  readonly isRenaming: boolean;
  readonly onCancel: () => void;
  readonly onChangeTitle: (title: string) => void;
  readonly onSubmit: () => void;
  readonly title: string;
}) {
  return (
    <Card style={styles.formCard} testID="study-library-rename-card">
      <Text style={styles.statusTitle}>Rename reviewer</Text>
      <TextField
        label="Reviewer title"
        onChangeText={onChangeTitle}
        testID="study-library-rename-input"
        value={title}
      />
      <View style={styles.actions}>
        <Button loading={isRenaming} onPress={onSubmit} variant="primary">
          Save title
        </Button>
        <Button disabled={isRenaming} onPress={onCancel} variant="secondary">
          Cancel
        </Button>
      </View>
    </Card>
  );
}

function ReviewerSummaryCard({
  isDeleting,
  isOpening,
  onDelete,
  onOpen,
  onRename,
  reviewer,
}: {
  readonly isDeleting: boolean;
  readonly isOpening: boolean;
  readonly onDelete: () => void;
  readonly onOpen: () => void;
  readonly onRename: () => void;
  readonly reviewer: SavedReviewerSummary;
}) {
  return (
    <Card style={styles.summaryCard} testID="study-library-reviewer">
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryTitle}>{reviewer.title}</Text>
        <Text style={styles.summaryMeta}>
          {formatSourceMode(reviewer.sourceMetadata.sourceMode)}
          {" - "}
          {formatSectionCount(reviewer.sectionCount)}
        </Text>
        <Text style={styles.summaryMeta}>
          Updated {formatDate(reviewer.updatedAt)}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button loading={isOpening} onPress={onOpen} variant="primary">
          Open
        </Button>
        <Button onPress={onRename} variant="secondary">
          Rename
        </Button>
        <Button loading={isDeleting} onPress={onDelete} variant="danger">
          Delete
        </Button>
      </View>
    </Card>
  );
}

function ErrorCard({ error }: { readonly error: LibraryDisplayError }) {
  return (
    <View style={styles.errorBox} testID="study-library-error">
      <Text style={styles.errorTitle}>{error.title}</Text>
      <Text style={styles.errorText}>{error.message}</Text>
      {error.detail ? <Text style={styles.errorDetail}>{error.detail}</Text> : null}
    </View>
  );
}

function SuccessCard({ message }: { readonly message: string }) {
  return (
    <View style={styles.successBox} testID="study-library-success">
      <Text style={styles.successText}>{message}</Text>
    </View>
  );
}

function createRequestContext(accessToken: string | undefined):
  | {
      readonly ok: true;
      readonly value: {
        readonly apiBaseUrl: string;
        readonly accessToken: string;
      };
    }
  | { readonly ok: false; readonly error: LibraryDisplayError } {
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
        message: "Sign out and sign in again before using the Study Library.",
      },
    };
  }

  return { ok: true, value: { apiBaseUrl, accessToken: token } };
}

function formatLibraryError(error: ReviewerLibraryError): LibraryDisplayError {
  const detail =
    error.status !== undefined
      ? `Details: HTTP ${error.status}, code ${error.apiCode ?? error.code}.`
      : `Details: code ${error.apiCode ?? error.code}.`;

  if (error.code === "unauthorized") {
    return {
      title: "Login session expired",
      message: "Sign out and sign in again before using the Study Library.",
      detail,
    };
  }

  if (error.code === "reviewer_not_found") {
    return {
      title: "Reviewer not found",
      message: "This saved reviewer is no longer available.",
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

  if (error.code === "invalid_title") {
    return {
      title: "Reviewer title needs a change",
      message: error.message,
      detail,
    };
  }

  return {
    title: "Study Library action failed",
    message: error.message,
    detail,
  };
}

function formatSourceMode(sourceMode: SavedReviewerSourceMode): string {
  switch (sourceMode) {
    case "paste":
      return "Pasted source";
    case "gallery":
      return "Gallery image OCR";
    case "camera":
      return "Camera OCR";
    case "pdf":
      return "PDF OCR";
    case "canvas":
      return "Canvas source";
  }
}

function formatSectionCount(sectionCount: number): string {
  return `${sectionCount} ${sectionCount === 1 ? "section" : "sections"}`;
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

const styles = StyleSheet.create({
  content: {
    gap: spacing[5],
  },
  header: {
    gap: spacing[2],
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
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  list: {
    gap: spacing[3],
  },
  formCard: {
    gap: spacing[4],
  },
  summaryCard: {
    gap: spacing[4],
  },
  summaryHeader: {
    gap: spacing[1],
  },
  summaryTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h3,
    fontWeight: "800",
    lineHeight: 22,
  },
  summaryMeta: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
  statusCard: {
    alignItems: "flex-start",
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
