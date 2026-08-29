import type { ReviewerOutput } from "@stay-focused/engine";
import {
  isActiveProcessingJobStatus,
  type ProcessingJobStatusView,
} from "@stay-focused/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../../auth";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { getApiBaseUrl } from "../../config/apiBaseUrl";
import { colors, radius, spacing, typography } from "../../design/tokens";
import {
  readActiveProcessingJobs,
  removeActiveProcessingJob,
  upsertActiveProcessingJob,
  type ActiveProcessingJobReference,
} from "../../services/activeProcessingJobStore";
import {
  cacheCompletedArtifact,
  listCachedArtifactMetadata,
  readCachedArtifact,
} from "../../services/completedArtifactCache";
import {
  dismissProcessingJob,
  readDismissedProcessingJobIds,
} from "../../services/dismissedProcessingJobStore";
import { getSourceVersion } from "../../services/processingAssetsApi";
import {
  reconcileReviewerProcessingOutbox,
} from "../../services/processingOutboxReconciliation";
import {
  cancelProcessingJob,
  createProcessingJobIdempotencyKey,
  getExtractionJobResult,
  getProcessingJobStatus,
  getReviewerJobResult,
  listProcessingJobsPage,
  retryProcessingJob,
} from "../../services/processingJobsApi";
import {
  disableCompletionNotifications,
  enableCompletionNotifications,
  isCompletionNotificationAvailable,
  sendCompletionNotificationTest,
} from "../../services/completionNotifications";
import {
  cancelOfflineProcessingIntent,
  readOfflineProcessingIntents,
  type OfflineProcessingIntent,
} from "../../services/processingOutboxStore";
import { API_BASE_URL_SETUP_HINT } from "../../services/reviewerApi";
import { saveReviewer } from "../../services/reviewerLibraryApi";
import { ReviewerPreview } from "../reviewer/ReviewerPreview";
import {
  groupProcessingJobs,
  presentProcessingJob,
  processingEmptyState,
  processingTimestamp,
  type ProcessingStatusTone,
} from "./processingJobPresentation";
import { createProcessingReviewerSourceMetadata } from "./processingReviewerSave";

interface ProcessingScreenProps {
  readonly onBack: () => void;
}

interface OpenedReviewerResult {
  readonly job: ProcessingJobStatusView;
  readonly reviewer: ReviewerOutput;
  readonly sourceSnapshotId?: string;
}

export function ProcessingScreen({ onBack }: ProcessingScreenProps) {
  const { session } = useAuth();
  const [jobs, setJobs] = useState<readonly ProcessingJobStatusView[]>([]);
  const [offlineIntents, setOfflineIntents] =
    useState<readonly OfflineProcessingIntent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Distinguishes "still restoring persisted and server state" from "there is
  // genuinely nothing processing". Without it the screen claims the latter
  // while a durable job is being recovered.
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Neutral confirmations are kept apart from failures so a successful local
  // action is not rendered in the error treatment.
  const [notice, setNotice] = useState<string | null>(null);
  const [openedReviewer, setOpenedReviewer] =
    useState<OpenedReviewerResult | null>(null);
  const [reviewerSaveTitle, setReviewerSaveTitle] = useState("");
  const [reviewerSaveMessage, setReviewerSaveMessage] = useState<string | null>(null);
  const [isSavingReviewer, setIsSavingReviewer] = useState(false);
  // Held so a saved reviewer cannot be saved a second time from the same
  // screen. Save identity and provenance are unchanged; this only stops a
  // repeated tap from creating a duplicate Study Library entry.
  const [savedReviewerId, setSavedReviewerId] = useState<string | null>(null);
  const [openedSource, setOpenedSource] = useState<{
    readonly title: string;
    readonly text: string;
  } | null>(null);
  const [notificationMessage, setNotificationMessage] = useState(
    "Get told when a reviewer or extraction finishes while you are in another app.",
  );
  const [notificationBusy, setNotificationBusy] = useState(false);

  const refresh = useCallback(async () => {
    const ownerUserId = session?.user.id;
    const accessToken = session?.accessToken.trim();
    const apiBaseUrl = getApiBaseUrl();
    if (!ownerUserId) return;

    setIsRefreshing(true);
    setError(null);
    try {
      const [local, outbox, dismissed] = await Promise.all([
        readActiveProcessingJobs(ownerUserId),
        readOfflineProcessingIntents(ownerUserId),
        readDismissedProcessingJobIds(ownerUserId),
      ]);
      if (!accessToken || !apiBaseUrl) {
        setOfflineIntents(outbox);
        setJobs(local.map(referenceToStatusView));
        setError(API_BASE_URL_SETUP_HINT);
        return;
      }

      const flushed = await reconcileReviewerProcessingOutbox({
        ownerUserId,
        accessToken,
        apiBaseUrl,
      });
      setOfflineIntents(flushed.remaining);

      const page = await listProcessingJobsPage({
        apiBaseUrl,
        accessToken,
        limit: 50,
      });
      const byId = new Map<string, ProcessingJobStatusView>();
      if (page.ok) {
        for (const job of page.data.jobs) {
          if (
            isActiveProcessingJobStatus(job.status) ||
            !dismissed.has(job.id)
          ) {
            byId.set(job.id, job);
            await upsertActiveProcessingJob(ownerUserId, job);
          }
        }
      } else {
        setError(page.error.message);
      }

      for (const reference of local) {
        if (byId.has(reference.jobId) || dismissed.has(reference.jobId)) continue;
        const status = await getProcessingJobStatus({
          apiBaseUrl,
          accessToken,
          jobId: reference.jobId,
        });
        if (status.ok) {
          byId.set(status.data.id, status.data);
          await upsertActiveProcessingJob(ownerUserId, status.data);
        } else if (status.error.code === "processing_job_not_found") {
          await removeActiveProcessingJob(reference.jobId);
        } else {
          byId.set(reference.jobId, referenceToStatusView(reference));
        }
      }

      setJobs(
        [...byId.values()].sort((left, right) =>
          right.createdAt.localeCompare(left.createdAt),
        ),
      );
    } finally {
      setIsRefreshing(false);
      setHasLoadedOnce(true);
    }
  }, [session?.accessToken, session?.user.id]);

  useEffect(() => {
    void refresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const groups = useMemo(() => groupProcessingJobs(jobs), [jobs]);
  const notificationsAvailable = isCompletionNotificationAvailable();

  const updateJob = async (job: ProcessingJobStatusView) => {
    const ownerUserId = session?.user.id;
    if (ownerUserId) await upsertActiveProcessingJob(ownerUserId, job);
    setJobs((current) => [
      job,
      ...current.filter((item) => item.id !== job.id),
    ]);
  };

  const handleCancel = async (job: ProcessingJobStatusView) => {
    const context = requestContext(session?.accessToken);
    if (!context) return;
    const result = await cancelProcessingJob({ ...context, jobId: job.id });
    if (result.ok) await updateJob(result.data);
    else setError(result.error.message);
  };

  const handleRetry = async (job: ProcessingJobStatusView) => {
    const context = requestContext(session?.accessToken);
    if (!context) return;
    const result = await retryProcessingJob({
      ...context,
      jobId: job.id,
      idempotencyKey: createProcessingJobIdempotencyKey(job.jobType),
    });
    if (result.ok) await updateJob(result.data);
    else setError(result.error.message);
  };

  const handleDismiss = async (job: ProcessingJobStatusView) => {
    const ownerUserId = session?.user.id;
    if (!ownerUserId) return;
    await dismissProcessingJob(ownerUserId, job.id);
    await removeActiveProcessingJob(job.id);
    setJobs((current) => current.filter((item) => item.id !== job.id));
  };

  const handleRemoveLocal = async (job: ProcessingJobStatusView) => {
    await removeActiveProcessingJob(job.id);
    setNotice(
      "Removed from this device. The job itself was not deleted from the server.",
    );
  };

  const notificationContext = () => {
    const apiBaseUrl = getApiBaseUrl();
    const accessToken = session?.accessToken.trim();
    return apiBaseUrl && accessToken ? { apiBaseUrl, accessToken } : null;
  };

  const handleEnableNotifications = async () => {
    const context = notificationContext();
    if (!context) {
      setNotificationMessage("Sign in and connect to the API first.");
      return;
    }
    setNotificationBusy(true);
    const result = await enableCompletionNotifications(context);
    setNotificationMessage(
      result.ok
        ? "Notifications enabled. Send a test before starting a long job."
        : result.message,
    );
    setNotificationBusy(false);
  };

  const handleTestNotification = async () => {
    const context = notificationContext();
    if (!context) return;
    setNotificationBusy(true);
    const result = await sendCompletionNotificationTest(context);
    setNotificationMessage(
      result.ok
        ? "Test queued. It will arrive after the server worker sends it."
        : result.message,
    );
    setNotificationBusy(false);
  };

  const handleDisableNotifications = async () => {
    const context = notificationContext();
    if (!context) return;
    setNotificationBusy(true);
    const result = await disableCompletionNotifications(context);
    setNotificationMessage(
      result.ok ? "Completion notifications disabled on this account." : result.message,
    );
    setNotificationBusy(false);
  };

  const handleOpenResult = async (job: ProcessingJobStatusView) => {
    const context = requestContext(session?.accessToken);
    const ownerUserId = session?.user.id;
    if (!ownerUserId) return;

    if (job.jobType === "document_extraction") {
      if (!context) return;
      const result = await getExtractionJobResult({ ...context, jobId: job.id });
      if (result.ok) {
        setOpenedSource({ title: job.source.displayName, text: result.data.text });
      } else {
        setError(result.error.message);
      }
      return;
    }

    if (context) {
      const result = await getReviewerJobResult({ ...context, jobId: job.id });
      if (result.ok) {
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
        setOpenedReviewer({
          job,
          reviewer: result.data.reviewer,
          ...(result.data.sourceSnapshotId
            ? { sourceSnapshotId: result.data.sourceSnapshotId }
            : {}),
        });
        setReviewerSaveTitle(
          result.data.reviewer.title.trim() || job.source.displayName,
        );
        setReviewerSaveMessage(null);
        setSavedReviewerId(null);
        return;
      }
    }

    const metadata = (await listCachedArtifactMetadata(ownerUserId)).find(
      (item) => item.processingJobId === job.id && item.payloadAvailable,
    );
    const cached = metadata
      ? await readCachedArtifact(ownerUserId, metadata.artifactVersionId)
      : null;
    if (cached && isReviewerOutput(cached.payload)) {
      setOpenedReviewer({ job, reviewer: cached.payload });
      setReviewerSaveTitle(cached.payload.title.trim() || job.source.displayName);
      setReviewerSaveMessage(null);
      setSavedReviewerId(null);
    } else {
      setError("This reviewer is not stored on this device, so it cannot be opened offline.");
    }
  };

  const handleSaveOpenedReviewer = async () => {
    if (!openedReviewer || isSavingReviewer || savedReviewerId) return;
    const context = requestContext(session?.accessToken);
    if (!context) {
      setReviewerSaveMessage("Sign in and connect to the API before saving.");
      return;
    }
    const title = reviewerSaveTitle.trim();
    if (!title) {
      setReviewerSaveMessage("Enter a title before saving this reviewer.");
      return;
    }

    setIsSavingReviewer(true);
    setReviewerSaveMessage(null);
    try {
      const result = await saveReviewer({
        ...context,
        reviewerOutput: openedReviewer.reviewer,
        sourceMetadata: createProcessingReviewerSourceMetadata(
          openedReviewer.job,
          openedReviewer.sourceSnapshotId,
        ),
        ...(openedReviewer.sourceSnapshotId
          ? { sourceSnapshotId: openedReviewer.sourceSnapshotId }
          : {}),
        title,
      });
      setReviewerSaveMessage(
        result.ok
          ? `Saved as ${result.data.title}. Open it later from Study Library.`
          : result.error.message,
      );
      if (result.ok) {
        setReviewerSaveTitle(result.data.title);
        setSavedReviewerId(result.data.id);
      }
    } finally {
      setIsSavingReviewer(false);
    }
  };

  const handleViewSource = async (job: ProcessingJobStatusView) => {
    const context = requestContext(session?.accessToken);
    if (!context || !job.sourceVersionId) return;
    const result = await getSourceVersion({
      ...context,
      sourceVersionId: job.sourceVersionId,
    });
    if (result.ok) {
      setOpenedSource({ title: job.source.displayName, text: result.data.sourceText });
    } else {
      setError(result.error.message);
    }
  };

  if (openedReviewer) {
    const isSaved = savedReviewerId !== null;

    return (
      <Screen
        contentContainerStyle={styles.readerContent}
        footer={
          <>
            {isSavingReviewer ? (
              <Text accessibilityLiveRegion="polite" style={styles.footerNote}>
                Saving to Study Library.
              </Text>
            ) : null}
            {reviewerSaveMessage ? (
              <Text
                accessibilityLiveRegion="polite"
                style={styles.footerNote}
                testID="processing-reviewer-save-message"
              >
                {reviewerSaveMessage}
              </Text>
            ) : null}
            <Button
              disabled={isSaved || reviewerSaveTitle.trim().length === 0}
              fullWidth
              loading={isSavingReviewer}
              onPress={() => void handleSaveOpenedReviewer()}
              testID="processing-reviewer-save-button"
            >
              {isSaved ? "Saved" : "Save reviewer"}
            </Button>
          </>
        }
      >
        <Button
          onPress={() => {
            setOpenedReviewer(null);
            setReviewerSaveMessage(null);
          }}
          variant="secondary"
        >
          Back to Processing
        </Button>
        <ReviewerPreview
          context={{ sourceLabel: openedReviewer.job.source.displayName }}
          reviewer={openedReviewer.reviewer}
        />
        <Card style={styles.jobCard} testID="processing-reviewer-save-card">
          <Text accessibilityRole="header" style={styles.jobTitle}>
            Save to Study Library
          </Text>
          <Text style={styles.meta}>
            The saved copy keeps the source this reviewer was generated from.
          </Text>
          <TextField
            editable={!isSaved && !isSavingReviewer}
            label="Reviewer title"
            onChangeText={(value) => {
              setReviewerSaveTitle(value);
              setReviewerSaveMessage(null);
            }}
            testID="processing-reviewer-save-title"
            value={reviewerSaveTitle}
          />
        </Card>
      </Screen>
    );
  }

  if (openedSource) {
    return (
      <Screen>
        <Button onPress={() => setOpenedSource(null)} variant="secondary">
          Back to Processing
        </Button>
        <Card elevated style={styles.sourceCard}>
          <Text accessibilityRole="header" style={styles.title}>
            {openedSource.title}
          </Text>
          <Text selectable style={styles.sourceText}>
            {openedSource.text}
          </Text>
        </Card>
      </Screen>
    );
  }

  const empty = processingEmptyState(!hasLoadedOnce);
  const showsEmptyState = jobs.length === 0 && offlineIntents.length === 0;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Processing</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Your processing jobs
        </Text>
        <Text style={styles.subtitle}>
          Reviewers and text extractions run on the server, so they keep going
          after you leave this screen or close the app.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button onPress={onBack} variant="secondary">Back</Button>
        <Button loading={isRefreshing} onPress={() => void refresh()} variant="secondary">
          Refresh
        </Button>
      </View>

      {error ? (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}

      {notice ? (
        <Card style={styles.noticeCard}>
          <Text style={styles.meta}>{notice}</Text>
        </Card>
      ) : null}

      {offlineIntents.length > 0 ? (
        <JobSection title="Waiting for connection">
          {offlineIntents.map((intent) => (
            <Card key={intent.localRequestId} style={styles.jobCard}>
              <Text style={styles.jobTitle}>{intent.sourceLocalReference}</Text>
              <Text style={styles.meta}>
                {formatOperation(intent.operation)} · Not sent yet
              </Text>
              <Text style={styles.status}>{formatOutboxStatus(intent)}</Text>
              <Button
                onPress={() => {
                  void cancelOfflineProcessingIntent(
                    intent.ownerUserId,
                    intent.localRequestId,
                  ).then(refresh);
                }}
                variant="danger"
              >
                Cancel this request
              </Button>
            </Card>
          ))}
        </JobSection>
      ) : null}

      {groups.map((group) => (
        <JobSection key={group.key} title={group.title}>
          {group.jobs.map((job) => (
            <ProcessingJobCard
              job={job}
              key={job.id}
              onCancel={() => void handleCancel(job)}
              onDismiss={() => void handleDismiss(job)}
              onOpenResult={() => void handleOpenResult(job)}
              onRemoveLocal={() => void handleRemoveLocal(job)}
              onRetry={() => void handleRetry(job)}
              onViewSource={() => void handleViewSource(job)}
            />
          ))}
        </JobSection>
      ))}

      {showsEmptyState ? (
        <Card testID="processing-empty-state">
          <Text style={styles.jobTitle}>{empty.title}</Text>
          <Text style={styles.status}>{empty.message}</Text>
        </Card>
      ) : null}

      {notificationsAvailable ? (
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Completion notifications
          </Text>
          <Card style={styles.jobCard}>
            <Text style={styles.meta}>{notificationMessage}</Text>
            <View style={styles.cardActions}>
              <Button
                disabled={notificationBusy}
                onPress={() => void handleEnableNotifications()}
                variant="secondary"
              >
                Enable
              </Button>
              <Button
                disabled={notificationBusy}
                onPress={() => void handleTestNotification()}
                variant="secondary"
              >
                Send test
              </Button>
              <Button
                disabled={notificationBusy}
                onPress={() => void handleDisableNotifications()}
                variant="ghost"
              >
                Disable
              </Button>
            </View>
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

function JobSection({
  children,
  title,
}: {
  readonly children: React.ReactNode;
  readonly title: string;
}) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}

/**
 * A single job, ordered so the student reads what it is, what state it is in,
 * what real progress exists, and only then the controls.
 */
function ProcessingJobCard({
  job,
  onCancel,
  onDismiss,
  onOpenResult,
  onRemoveLocal,
  onRetry,
  onViewSource,
}: {
  readonly job: ProcessingJobStatusView;
  readonly onCancel: () => void;
  readonly onDismiss: () => void;
  readonly onOpenResult: () => void;
  readonly onRemoveLocal: () => void;
  readonly onRetry: () => void;
  readonly onViewSource: () => void;
}) {
  const presentation = presentProcessingJob(job);
  const timestamp = processingTimestamp(job);

  return (
    <Card
      accent={presentation.tone === "ready"}
      style={styles.jobCard}
      testID={`processing-job-${job.id}`}
    >
      <Text style={styles.jobTitle}>{job.source.displayName}</Text>
      <Text style={styles.meta}>
        {presentation.kindLabel} · {presentation.sourceLabel}
      </Text>

      <View style={styles.statusBlock}>
        <Text
          style={[styles.statusLabel, { color: toneColor[presentation.tone] }]}
        >
          {presentation.statusLabel}
        </Text>
        {presentation.detail ? (
          <Text style={styles.status}>{presentation.detail}</Text>
        ) : null}
      </View>

      {presentation.progress ? (
        <View style={styles.progressBlock}>
          {/*
            The bar is drawn only while work is still moving. On a stopped job
            a filling gold bar would read as progress that is still happening,
            so the honest count carries the same fact on its own.
          */}
          {presentation.isActive ? (
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{
                max: presentation.progress.totalUnits,
                min: 0,
                now: presentation.progress.completedUnits,
              }}
              style={styles.progressTrack}
            >
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round(presentation.progress.ratio * 100)}%` },
                ]}
              />
            </View>
          ) : null}
          <Text style={styles.progressLabel}>{presentation.progress.label}</Text>
        </View>
      ) : null}

      {presentation.durableNotice ? (
        <Text style={styles.durableNotice}>{presentation.durableNotice}</Text>
      ) : null}

      {presentation.failure ? (
        <View style={styles.failureBlock}>
          <Text style={styles.errorText}>{presentation.failure.summary}</Text>
          {presentation.failure.detail ? (
            <Text style={styles.failureDetail}>{presentation.failure.detail}</Text>
          ) : null}
        </View>
      ) : null}

      {job.reuseMode === "reuse_existing" ? (
        <Text style={styles.meta}>Reused an exact prior artifact by request.</Text>
      ) : job.reuseCandidateArtifactVersionId ? (
        <Text style={styles.meta}>
          An exact prior artifact exists; this request is generating a fresh version.
        </Text>
      ) : null}

      <Text style={styles.meta}>
        {timestamp.label} {formatTime(timestamp.value)}
      </Text>

      <View style={styles.cardActions}>
        {presentation.resultActionLabel ? (
          <Button fullWidth onPress={onOpenResult}>
            {presentation.resultActionLabel}
          </Button>
        ) : null}
        {presentation.canRetry ? (
          <Button fullWidth onPress={onRetry}>Try again</Button>
        ) : null}
        {job.sourceVersionId ? (
          <Button onPress={onViewSource} variant="secondary">View source</Button>
        ) : null}
        {presentation.canCancel ? (
          <Button onPress={onCancel} variant="secondary">Stop processing</Button>
        ) : null}
        {presentation.canDismiss ? (
          <Button onPress={onDismiss} variant="ghost">Dismiss</Button>
        ) : null}
        <Button onPress={onRemoveLocal} variant="ghost">
          Remove from this device
        </Button>
      </View>
    </Card>
  );
}

function referenceToStatusView(
  reference: ActiveProcessingJobReference,
): ProcessingJobStatusView {
  return {
    id: reference.jobId,
    jobType: reference.jobType,
    status: reference.lastKnownStatus,
    stage:
      reference.jobType === "document_extraction"
        ? "inspecting_document"
        : "preparing_source",
    progress: {
      completedUnits: reference.completedUnits,
      totalUnits: reference.totalUnits,
      unitLabel: reference.unitLabel,
      message: reference.progressMessage,
    },
    source: {
      displayName: reference.sourceDisplayName,
      sourceKind: reference.sourceKind,
      mimeType:
        reference.sourceKind === "pdf"
          ? "application/pdf"
          : reference.sourceKind === "image"
            ? "image/jpeg"
            : "text/plain",
    },
    createdAt: reference.createdAt,
    acceptedAt: reference.createdAt,
    startedAt: null,
    updatedAt: reference.updatedAt,
    completedAt: reference.completedAt,
    failedAt: null,
    cancellationRequestedAt: null,
    errorCode: reference.errorCode,
    safeErrorMessage: reference.safeErrorMessage,
    retryable: reference.retryable,
    attemptCount: 0,
    resultAvailable: reference.resultAvailable,
    retryOfJobId: null,
    sourceVersionId: null,
    artifactType:
      reference.jobType === "reviewer_generation" ? "reviewer" : null,
    reuseMode: "fresh",
    reusedFromJobId: null,
    reuseCandidateArtifactVersionId: null,
    provenance: null,
  };
}

function requestContext(accessToken: string | undefined) {
  const apiBaseUrl = getApiBaseUrl();
  const token = accessToken?.trim();
  return apiBaseUrl && token ? { apiBaseUrl, accessToken: token } : null;
}

function formatOperation(operation: OfflineProcessingIntent["operation"]): string {
  return operation === "document_extraction"
    ? "Text extraction"
    : "Reviewer";
}

function formatOutboxStatus(intent: OfflineProcessingIntent): string {
  if (intent.status === "blocked") return "Needs attention before it can be submitted";
  if (intent.status === "paused") return "Paused after logout";
  if (intent.status === "submitting") return "Submitting with the saved idempotency key";
  return "Waiting for connection — no server job exists yet";
}

function formatTime(value: string): string {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toLocaleString()
    : "at an unknown time";
}

function isReviewerOutput(value: unknown): value is ReviewerOutput {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "title" in value &&
    typeof value.title === "string" &&
    "sections" in value &&
    Array.isArray(value.sections) &&
    "metadata" in value &&
    typeof value.metadata === "object" &&
    value.metadata !== null
  );
}

const styles = StyleSheet.create({
  // The opened reviewer is a reading surface, so its chrome is spaced apart
  // from the document instead of stacking flush against it.
  readerContent: { gap: spacing[6] },
  header: { gap: spacing[2] },
  kicker: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.kicker,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h1,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    lineHeight: 22,
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  section: { gap: spacing[3] },
  sectionTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h2,
    fontWeight: "800",
  },
  jobCard: { gap: spacing[2] },
  jobTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h3,
    fontWeight: "800",
  },
  statusBlock: { gap: spacing[1] },
  statusLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    fontWeight: "800",
  },
  status: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    lineHeight: 21,
  },
  progressBlock: { gap: spacing[1] },
  progressTrack: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 6,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: colors.accent,
    height: "100%",
  },
  progressLabel: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    fontWeight: "700",
    lineHeight: 19,
  },
  durableNotice: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
  failureBlock: {
    backgroundColor: colors.errorSurface,
    borderRadius: radius.tight,
    gap: spacing[1],
    padding: spacing[3],
  },
  failureDetail: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.caption,
    lineHeight: 17,
  },
  meta: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
  cardActions: { gap: spacing[2] },
  errorCard: { backgroundColor: colors.errorSurface },
  noticeCard: { backgroundColor: colors.cardElevated },
  errorText: {
    color: colors.error,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
  footerNote: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
  sourceCard: { gap: spacing[4] },
  sourceText: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    lineHeight: 23,
  },
});

/**
 * Tone reinforces the status word; it never carries the status on its own,
 * because every card also states its status in text.
 */
const toneColor: Record<ProcessingStatusTone, string> = {
  active: colors.accentPressed,
  waiting: colors.textSecondary,
  ready: colors.success,
  attention: colors.error,
  neutral: colors.textMuted,
};
