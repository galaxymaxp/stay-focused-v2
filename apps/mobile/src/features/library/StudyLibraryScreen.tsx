import { ChevronDown, ChevronRight } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  API_BASE_URL_SETUP_HINT,
} from "../../services/reviewerApi";
import {
  deleteReviewer,
  getReviewer,
  getReviewerSourceStatus,
  listReviewers,
  renameReviewer,
  type ReviewerLibraryError,
  type ReviewerSourceStatusPayload,
  type SavedReviewerDetail,
  type SavedReviewerSummary,
  type SavedReviewerSourceProvenanceSummary,
} from "../../services/reviewerLibraryApi";
import { ReviewerPreview } from "../reviewer/ReviewerPreview";
import {
  describeSavedReviewerCount,
  describeSavedReviewerSavedAt,
  describeSavedReviewerTechnicalProvenance,
  describeSourceReadiness,
  describeSourceStatusActions,
  describeSourceStatusItem,
  describeSourceStatusSummary,
  presentSavedReviewer,
  savedReviewerReaderContext,
  savedReviewerTitle,
} from "./studyLibraryPresentation";

interface StudyLibraryScreenProps {
  readonly onCreateReviewer: () => void;
}

type LibraryOperation =
  | "load"
  | "open"
  | "rename"
  | "delete"
  | "source-status";

interface LibraryDisplayError {
  readonly title: string;
  readonly message: string;
  readonly detail?: string;
}

interface RenameState {
  readonly reviewerId: string;
  readonly title: string;
}

interface SourceStatusState {
  readonly reviewerId: string;
  readonly status: ReviewerSourceStatusPayload;
}

/**
 * Study Library.
 *
 * The saved reviewer is the product here, so the list reads as a shelf of
 * finished study documents rather than a generation log: title, where it came
 * from, how much of it there is, when it was kept, and one obvious way back
 * into it. Reopening fetches the persisted reviewer and hands it straight to
 * the Reader - no job, no regeneration - and the snapshot identifiers and
 * parser versions that make that traceable stay behind a disclosure so they
 * never lead the reading experience.
 */
export function StudyLibraryScreen({ onCreateReviewer }: StudyLibraryScreenProps) {
  const { isSigningOut, session, signOut } = useAuth();
  const [reviewers, setReviewers] = useState<readonly SavedReviewerSummary[]>([]);
  const [openedReviewer, setOpenedReviewer] =
    useState<SavedReviewerDetail | null>(null);
  const [error, setError] = useState<LibraryDisplayError | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [renameState, setRenameState] = useState<RenameState | null>(null);
  const [sourceStatusState, setSourceStatusState] =
    useState<SourceStatusState | null>(null);
  const [isSourceDetailsOpen, setIsSourceDetailsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [openingReviewerId, setOpeningReviewerId] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isCheckingSourceStatus, setIsCheckingSourceStatus] = useState(false);
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
        setError(formatLibraryError(result.error, "load"));
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

    setOpeningReviewerId(reviewerId);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await getReviewer({
        ...context.value,
        reviewerId,
      });

      if (result.ok) {
        setOpenedReviewer(result.data);
        setSourceStatusState(null);
        setIsSourceDetailsOpen(false);
      } else {
        setError(formatLibraryError(result.error, "open"));
      }
    } finally {
      setOpeningReviewerId(null);
    }
  };

  const handleCloseReviewer = () => {
    setOpenedReviewer(null);
    setRenameState(null);
    setSourceStatusState(null);
    setIsSourceDetailsOpen(false);
    setError(null);
    setSuccessMessage(null);
  };

  const handleCheckSourceStatus = async () => {
    if (!openedReviewer?.sourceProvenance) {
      return;
    }

    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      setError(context.error);
      return;
    }

    const reviewerId = openedReviewer.id;
    setIsCheckingSourceStatus(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await getReviewerSourceStatus({
        ...context.value,
        reviewerId,
      });

      if (result.ok) {
        setSourceStatusState({ reviewerId, status: result.data });
      } else {
        setError(formatLibraryError(result.error, "source-status"));
      }
    } finally {
      setIsCheckingSourceStatus(false);
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
        setError(formatLibraryError(result.error, "rename"));
      }
    } finally {
      setIsRenaming(false);
    }
  };

  const handleRequestDelete = (reviewer: SavedReviewerSummary) => {
    Alert.alert(
      "Delete reviewer?",
      `"${savedReviewerTitle(reviewer)}" will be removed from your Study Library. This cannot be undone.`,
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
        setError(formatLibraryError(result.error, "delete"));
      }
    } finally {
      setDeletingReviewerId(null);
    }
  };

  if (openedReviewer) {
    const savedAt = describeSavedReviewerSavedAt(openedReviewer);

    return (
      <Screen contentContainerStyle={styles.content}>
        <View style={styles.backRow}>
          <Button
            onPress={handleCloseReviewer}
            style={styles.inlineAction}
            testID="study-library-back"
            variant="ghost"
          >
            Back to library
          </Button>
        </View>

        {error ? <ErrorCard error={error} /> : null}
        {successMessage ? <SuccessCard message={successMessage} /> : null}

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

        <ReviewerPreview
          context={savedReviewerReaderContext(openedReviewer)}
          reviewer={openedReviewer.reviewerOutput}
        />

        <View style={styles.documentFooter}>
          {savedAt ? (
            <Text style={styles.footerMeta} testID="study-library-saved-at">
              {savedAt}
            </Text>
          ) : null}
          <View style={styles.footerActions}>
            <Button
              accessibilityLabel={`Rename reviewer ${savedReviewerTitle(openedReviewer)}`}
              onPress={() => handleStartRename(openedReviewer)}
              style={styles.inlineAction}
              variant="ghost"
            >
              Rename
            </Button>
            <Button
              accessibilityLabel={`Delete reviewer ${savedReviewerTitle(openedReviewer)}`}
              loading={deletingReviewerId === openedReviewer.id}
              onPress={() => handleRequestDelete(openedReviewer)}
              style={styles.inlineAction}
              textStyle={styles.destructiveLabel}
              variant="ghost"
            >
              Delete
            </Button>
          </View>
        </View>

        {openedReviewer.sourceProvenance ? (
          <SourceDetailsDisclosure
            isCheckingStatus={isCheckingSourceStatus}
            isOpen={isSourceDetailsOpen}
            onRefreshStatus={handleCheckSourceStatus}
            onToggle={() => setIsSourceDetailsOpen((current) => !current)}
            status={
              sourceStatusState?.reviewerId === openedReviewer.id
                ? sourceStatusState.status
                : null
            }
            summary={openedReviewer.sourceProvenance}
          />
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header} testID="study-library-screen">
        <Text style={styles.kicker}>Study Library</Text>
        <Text style={styles.title}>Saved reviewers</Text>
        {!isLoading && reviewers.length > 0 ? (
          <Text style={styles.subtitle} testID="study-library-count">
            {describeSavedReviewerCount(reviewers.length)}
          </Text>
        ) : null}
      </View>

      <View style={styles.headerActions}>
        <Button onPress={onCreateReviewer} variant="primary">
          New reviewer
        </Button>
        <Button
          loading={isLoading}
          onPress={loadLibrary}
          style={styles.inlineAction}
          variant="ghost"
        >
          Refresh
        </Button>
        <Button
          loading={isSigningOut}
          onPress={signOut}
          style={styles.inlineAction}
          variant="ghost"
        >
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
        <Card style={styles.noticeCard} testID="study-library-loading">
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.noticeTitle}>Loading saved reviewers</Text>
        </Card>
      ) : reviewers.length === 0 ? (
        <Card style={styles.noticeCard} testID="study-library-empty">
          <Text style={styles.noticeTitle}>No saved reviewers yet</Text>
          <Text style={styles.noticeText}>
            Save a reviewer once it finishes generating and it will wait here for
            you to reopen any time.
          </Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {reviewers.map((reviewer) => (
            <SavedReviewerEntry
              isDeleting={deletingReviewerId === reviewer.id}
              isOpening={openingReviewerId === reviewer.id}
              key={reviewer.id}
              onDelete={() => handleRequestDelete(reviewer)}
              onOpen={() => void handleOpenReviewer(reviewer.id)}
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
      <Text style={styles.noticeTitle}>Rename reviewer</Text>
      <TextField
        label="Reviewer title"
        onChangeText={onChangeTitle}
        testID="study-library-rename-input"
        value={title}
      />
      <View style={styles.formActions}>
        <Button loading={isRenaming} onPress={onSubmit} variant="primary">
          Save title
        </Button>
        <Button
          disabled={isRenaming}
          onPress={onCancel}
          style={styles.inlineAction}
          variant="ghost"
        >
          Cancel
        </Button>
      </View>
    </Card>
  );
}

/**
 * One saved reviewer on the shelf. Flat surface, three lines of recognition
 * metadata, and a primary way back into the document; Rename lives inside the
 * opened reviewer so the list stays scannable.
 */
function SavedReviewerEntry({
  isDeleting,
  isOpening,
  onDelete,
  onOpen,
  reviewer,
}: {
  readonly isDeleting: boolean;
  readonly isOpening: boolean;
  readonly onDelete: () => void;
  readonly onOpen: () => void;
  readonly reviewer: SavedReviewerSummary;
}) {
  const presentation = presentSavedReviewer(reviewer);

  return (
    <Card style={styles.entryCard} testID="study-library-reviewer">
      <View style={styles.entryText}>
        <Text
          numberOfLines={3}
          style={styles.entryTitle}
          testID="study-library-reviewer-title"
        >
          {presentation.title}
        </Text>
        {presentation.sourceLine ? (
          <Text
            numberOfLines={2}
            style={styles.entryMeta}
            testID="study-library-reviewer-source"
          >
            {presentation.sourceLine}
          </Text>
        ) : null}
        <Text style={styles.entryMeta} testID="study-library-reviewer-scale">
          {presentation.scaleLine}
        </Text>
      </View>

      <View style={styles.entryActions}>
        <Button
          accessibilityLabel={presentation.openAccessibilityLabel}
          loading={isOpening}
          onPress={onOpen}
          style={styles.openAction}
          variant="primary"
        >
          Open reviewer
        </Button>
        <View style={styles.entrySpacer} />
        <Button
          accessibilityLabel={presentation.deleteAccessibilityLabel}
          loading={isDeleting}
          onPress={onDelete}
          style={styles.inlineAction}
          textStyle={styles.destructiveLabel}
          variant="ghost"
        >
          Delete
        </Button>
      </View>
    </Card>
  );
}

/**
 * Snapshot identifiers, parser and OCR versions, and synchronized-source
 * health. All of it is real and worth keeping, and none of it is what a student
 * opened the reviewer to read, so it stays collapsed until asked for.
 */
function SourceDetailsDisclosure({
  isCheckingStatus,
  isOpen,
  onRefreshStatus,
  onToggle,
  status,
  summary,
}: {
  readonly isCheckingStatus: boolean;
  readonly isOpen: boolean;
  readonly onRefreshStatus: () => void;
  readonly onToggle: () => void;
  readonly status: ReviewerSourceStatusPayload | null;
  readonly summary: SavedReviewerSourceProvenanceSummary;
}) {
  const statusActions = status ? describeSourceStatusActions(status.actions) : null;

  return (
    <View style={styles.disclosure} testID="study-library-source-provenance">
      <Pressable
        accessibilityLabel="Source details"
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={onToggle}
        style={styles.disclosureHeader}
        testID="study-library-source-details-toggle"
      >
        {isOpen ? (
          <ChevronDown color={colors.textSecondary} size={18} strokeWidth={2.2} />
        ) : (
          <ChevronRight color={colors.textSecondary} size={18} strokeWidth={2.2} />
        )}
        <Text style={styles.disclosureLabel}>Source details</Text>
      </Pressable>

      {isOpen ? (
        <View style={styles.disclosureBody} testID="study-library-source-details">
          <Text style={styles.noticeText}>
            Kept so this reviewer can be traced back to the exact source it was
            made from. None of it is needed to read the reviewer.
          </Text>

          <View style={styles.detailRows}>
            {describeSavedReviewerTechnicalProvenance(summary).map((detail) => (
              <View key={detail.label} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{detail.label}</Text>
                <Text style={styles.detailValue}>{detail.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.disclosureDivider} />

          <View style={styles.sourceHealthHeader}>
            <View style={styles.sourceHealthText}>
              <Text style={styles.detailLabel}>Source health</Text>
              <Text
                style={styles.noticeText}
                testID="study-library-source-status-summary"
              >
                {status
                  ? describeSourceStatusSummary(status)
                  : "Not checked yet."}
              </Text>
            </View>
            <Button
              loading={isCheckingStatus}
              onPress={onRefreshStatus}
              style={styles.inlineAction}
              variant="ghost"
            >
              {status ? "Check again" : "Check sources"}
            </Button>
          </View>

          {isCheckingStatus ? (
            <Text
              style={styles.noticeText}
              testID="study-library-source-status-loading"
            >
              Checking synchronized sources
            </Text>
          ) : null}

          {status ? (
            <>
              <Text
                style={styles.noticeText}
                testID="study-library-source-readiness"
              >
                {describeSourceReadiness(status.regenerationReadiness)}
              </Text>
              {statusActions ? (
                <Text style={styles.noticeText}>{statusActions}</Text>
              ) : null}
              <View style={styles.sourceStatusList}>
                {status.items.map((item) => (
                  <View key={item.ordinal} style={styles.sourceStatusItem}>
                    <Text style={styles.sourceStatusItemTitle}>
                      {item.ordinal}. {item.title}
                    </Text>
                    <Text style={styles.noticeText}>
                      {describeSourceStatusItem(item)}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function ErrorCard({ error }: { readonly error: LibraryDisplayError }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={styles.errorBox}
      testID="study-library-error"
    >
      <Text style={styles.errorTitle}>{error.title}</Text>
      <Text style={styles.errorText}>{error.message}</Text>
      {error.detail ? <Text style={styles.errorDetail}>{error.detail}</Text> : null}
    </View>
  );
}

function SuccessCard({ message }: { readonly message: string }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={styles.successBox}
      testID="study-library-success"
    >
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
  const apiBaseUrl = getApiBaseUrl();
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

/**
 * Errors name the action that failed, so a student knows whether their library
 * failed to load or one reviewer failed to open. The technical code stays as a
 * separate, quieter line because it is what makes a report actionable.
 */
function formatLibraryError(
  error: ReviewerLibraryError,
  operation: LibraryOperation,
): LibraryDisplayError {
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
      title: "Saved reviewer is gone",
      message:
        "This reviewer is no longer in your Study Library. Refresh to see what is still saved.",
      detail,
    };
  }

  if (error.code === "network_error") {
    return {
      title: operationErrorTitle(operation),
      message: "Check your connection and the API address, then try again.",
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
    title: operationErrorTitle(operation),
    message: error.message,
    detail,
  };
}

function operationErrorTitle(operation: LibraryOperation): string {
  switch (operation) {
    case "load":
      return "Couldn't load your Study Library";
    case "open":
      return "Couldn't open this saved reviewer";
    case "rename":
      return "Couldn't rename this reviewer";
    case "delete":
      return "Couldn't delete this reviewer";
    case "source-status":
      return "Couldn't check this reviewer's sources";
  }
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[5],
  },
  header: {
    gap: spacing[2],
  },
  kicker: {
    color: colors.textSecondary,
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
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  backRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    marginLeft: -spacing[3],
  },
  inlineAction: {
    paddingHorizontal: spacing[3],
  },
  destructiveLabel: {
    color: colors.error,
  },
  list: {
    gap: spacing[3],
  },
  formCard: {
    gap: spacing[4],
  },
  formActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  entryCard: {
    elevation: 0,
    gap: spacing[4],
    padding: spacing[4],
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  entryText: {
    gap: spacing[1],
  },
  entryTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h3,
    fontWeight: "800",
    lineHeight: 22,
  },
  entryMeta: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
  entryActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  openAction: {
    flexShrink: 1,
  },
  entrySpacer: {
    flexGrow: 1,
  },
  documentFooter: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing[2],
    paddingTop: spacing[4],
  },
  footerMeta: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
  footerActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
    marginLeft: -spacing[3],
  },
  disclosure: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: spacing[2],
  },
  disclosureHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing[2],
    minHeight: hitTarget.min,
  },
  disclosureLabel: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    fontWeight: "700",
    lineHeight: 19,
  },
  disclosureBody: {
    gap: spacing[3],
    paddingBottom: spacing[2],
  },
  disclosureDivider: {
    alignSelf: "stretch",
    backgroundColor: colors.border,
    height: 1,
  },
  detailRows: {
    gap: spacing[2],
  },
  detailRow: {
    gap: spacing[1],
  },
  detailLabel: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.caption,
    fontWeight: "800",
    letterSpacing: 0.4,
    lineHeight: 17,
  },
  detailValue: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
  sourceHealthHeader: {
    alignItems: "flex-start",
    alignSelf: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
    justifyContent: "space-between",
  },
  sourceHealthText: {
    flex: 1,
    gap: spacing[1],
    minWidth: 180,
  },
  sourceStatusList: {
    alignSelf: "stretch",
    gap: spacing[2],
  },
  sourceStatusItem: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.border,
    borderRadius: radius.tight,
    borderWidth: 1,
    gap: spacing[1],
    padding: spacing[3],
  },
  sourceStatusItemTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    fontWeight: "800",
    lineHeight: 19,
  },
  noticeCard: {
    alignItems: "flex-start",
    elevation: 0,
    gap: spacing[2],
    padding: spacing[4],
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  noticeTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h3,
    fontWeight: "800",
    lineHeight: 22,
  },
  noticeText: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: colors.errorSurface,
    borderColor: colors.error,
    borderRadius: radius.card,
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
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.caption,
    lineHeight: 17,
  },
  successBox: {
    backgroundColor: colors.successSurface,
    borderColor: colors.success,
    borderRadius: radius.tight,
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
