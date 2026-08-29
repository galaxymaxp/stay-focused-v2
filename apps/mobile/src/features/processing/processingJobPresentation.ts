import {
  isActiveProcessingJobStatus,
  type ProcessingJobStatusView,
} from "@stay-focused/shared";

/**
 * Student-facing presentation for a processing job.
 *
 * Every value here is derived from state the server actually reports. Nothing
 * is simulated: there is no elapsed-time percentage, no estimated finish time,
 * and no progress value when the server has not sent completed and total units.
 * When precise progress is unavailable the job reports an honest indeterminate
 * state instead.
 *
 * The headline is derived from `status` rather than `stage` on purpose. A job
 * restored from the local reference store carries a real last-known status but
 * a placeholder stage, so a stage-derived headline could describe the wrong
 * step. The live stage reaches the student through `detail`, which is the
 * server's own status message and is persisted accurately.
 */

export type ProcessingStatusTone =
  | "active"
  | "waiting"
  | "ready"
  | "attention"
  | "neutral";

export interface ProcessingProgressPresentation {
  /** Real counted progress, e.g. "1 of 3 sections complete". */
  readonly label: string;
  readonly completedUnits: number;
  readonly totalUnits: number;
  /** 0–1, derived only from server-reported units. */
  readonly ratio: number;
}

export interface ProcessingFailurePresentation {
  /** Short, student-readable summary of what went wrong. */
  readonly summary: string;
  /** Technical detail, kept separate so it never leads the card. */
  readonly detail: string | null;
}

export interface ProcessingJobPresentation {
  readonly statusLabel: string;
  readonly tone: ProcessingStatusTone;
  /** Current real state under the headline, or null when there is nothing true to add. */
  readonly detail: string | null;
  readonly kindLabel: string;
  readonly sourceLabel: string;
  readonly progress: ProcessingProgressPresentation | null;
  /** True while the server still has work in flight for this job. */
  readonly isActive: boolean;
  /** Only present while the job is genuinely still running on the server. */
  readonly durableNotice: string | null;
  readonly failure: ProcessingFailurePresentation | null;
  /** Label for the result action, or null when no result can be opened. */
  readonly resultActionLabel: string | null;
  readonly canCancel: boolean;
  readonly canRetry: boolean;
  readonly canDismiss: boolean;
}

const DURABLE_NOTICE =
  "You can leave this screen. Processing continues on the server.";

export function presentProcessingJob(
  job: ProcessingJobStatusView,
): ProcessingJobPresentation {
  const isReviewer = job.jobType === "reviewer_generation";
  const active = isActiveProcessingJobStatus(job.status);

  return {
    statusLabel: processingStatusLabel(job),
    tone: processingStatusTone(job),
    detail: processingDetail(job),
    kindLabel: isReviewer ? "Reviewer" : "Text extraction",
    sourceLabel: processingSourceLabel(job),
    progress: presentProcessingProgress(job),
    isActive: active,
    durableNotice: active ? DURABLE_NOTICE : null,
    failure: presentProcessingFailure(job),
    resultActionLabel: job.resultAvailable
      ? isReviewer
        ? "Open reviewer"
        : "Open extracted text"
      : null,
    // Cancellation is a real server operation (`POST /api/jobs/:id/cancel`),
    // so it is offered only while the server can still act on it.
    canCancel: job.status === "queued" || job.status === "running",
    // Retry is offered only when the server marked this job retryable, so the
    // button never implies work the backend will refuse.
    canRetry:
      job.retryable && (job.status === "failed" || job.status === "expired"),
    canDismiss: !active,
  };
}

export function processingStatusLabel(job: ProcessingJobStatusView): string {
  const isReviewer = job.jobType === "reviewer_generation";
  switch (job.status) {
    case "queued":
      return "Waiting to start";
    case "running":
      return isReviewer ? "Processing reviewer" : "Extracting text";
    case "cancellation_requested":
      return "Stopping";
    case "succeeded":
      return isReviewer ? "Reviewer ready" : "Text ready";
    case "failed":
      return "Processing failed";
    case "expired":
      return "Processing expired";
    case "cancelled":
      return "Cancelled";
  }
}

export function processingStatusTone(
  job: ProcessingJobStatusView,
): ProcessingStatusTone {
  switch (job.status) {
    case "running":
    case "cancellation_requested":
      return "active";
    case "queued":
      return "waiting";
    case "succeeded":
      return job.resultAvailable ? "ready" : "neutral";
    case "failed":
    case "expired":
      return "attention";
    case "cancelled":
      return "neutral";
  }
}

/**
 * The line under the headline. While the job is active this is the server's own
 * status message, which is the only trustworthy description of the current
 * step. Terminal states describe themselves instead, because a finished job's
 * last progress message ("Storing reviewer") reads as though work continues.
 */
export function processingDetail(job: ProcessingJobStatusView): string | null {
  if (isActiveProcessingJobStatus(job.status)) {
    const message = job.progress.message.trim();
    return message || null;
  }
  if (job.status === "succeeded") {
    return job.resultAvailable
      ? null
      : "This job finished, but its result is no longer stored.";
  }
  if (job.status === "expired") {
    return "This job expired before its result could be opened.";
  }
  if (job.status === "cancelled") {
    return "This job was cancelled.";
  }
  return null;
}

/**
 * Counted progress, or null. `unitLabel` is server-owned ("sections" or
 * "pages"), so the sentence names the real unit rather than a generic step.
 * A percentage is never derived from anything other than these counts.
 */
export function presentProcessingProgress(
  job: ProcessingJobStatusView,
): ProcessingProgressPresentation | null {
  // A completed job is described by its status, not by a full bar.
  if (job.status === "succeeded" || job.status === "cancelled") return null;

  const { completedUnits, totalUnits, unitLabel } = job.progress;
  if (
    completedUnits === null ||
    totalUnits === null ||
    unitLabel === null ||
    !Number.isFinite(completedUnits) ||
    !Number.isFinite(totalUnits) ||
    totalUnits <= 0 ||
    completedUnits < 0
  ) {
    return null;
  }

  const completed = Math.min(completedUnits, totalUnits);
  const unit = totalUnits === 1 ? singularUnit(unitLabel) : unitLabel;
  return {
    label: `${completed} of ${totalUnits} ${unit} complete`,
    completedUnits: completed,
    totalUnits,
    ratio: completed / totalUnits,
  };
}

/**
 * Splits failure into a summary a student can act on and the technical detail
 * that helps diagnose it, so a raw code never becomes the headline message.
 */
export function presentProcessingFailure(
  job: ProcessingJobStatusView,
): ProcessingFailurePresentation | null {
  if (job.status !== "failed" && job.status !== "expired") return null;

  const safeMessage = job.safeErrorMessage?.trim();
  const summary =
    safeMessage ||
    (job.status === "expired"
      ? "This job expired before it finished."
      : "This job stopped before it finished.");

  const detailParts: string[] = [];
  if (job.errorCode) detailParts.push(`Code ${job.errorCode}`);
  if (job.attemptCount > 1) detailParts.push(`Attempt ${job.attemptCount}`);

  return {
    summary,
    detail: detailParts.length > 0 ? detailParts.join(" · ") : null,
  };
}

/**
 * The one timestamp worth showing. A card previously carried both a created and
 * an updated time; the useful one is when the job last did something, and for a
 * finished job that is the moment it actually finished.
 */
export function processingTimestamp(job: ProcessingJobStatusView): {
  readonly label: string;
  readonly value: string;
} {
  if (job.status === "succeeded" && job.completedAt) {
    return { label: "Finished", value: job.completedAt };
  }
  if (
    (job.status === "failed" || job.status === "expired") &&
    job.failedAt
  ) {
    return { label: "Stopped", value: job.failedAt };
  }
  if (job.status === "queued") {
    return { label: "Submitted", value: job.acceptedAt };
  }
  return { label: "Updated", value: job.updatedAt };
}

export function processingSourceLabel(job: ProcessingJobStatusView): string {
  switch (job.source.sourceKind) {
    case "pdf":
      return "PDF";
    case "image":
      return "Photo";
    case "text":
      return "Text";
  }
}

export type ProcessingGroupKey =
  | "in_progress"
  | "waiting"
  | "ready"
  | "attention"
  | "finished";

/**
 * Group order puts openable results above jobs that only need acknowledgement,
 * so a reviewer that just finished is reachable without scrolling past older
 * failures. Within a group, jobs stay newest first.
 */
export const PROCESSING_GROUP_ORDER: readonly ProcessingGroupKey[] = [
  "in_progress",
  "waiting",
  "ready",
  "attention",
  "finished",
];

export function processingGroupTitle(key: ProcessingGroupKey): string {
  switch (key) {
    case "in_progress":
      return "In progress";
    case "waiting":
      return "Waiting to start";
    case "ready":
      return "Ready to open";
    case "attention":
      return "Needs attention";
    case "finished":
      return "Finished";
  }
}

export function processingGroupKey(
  job: ProcessingJobStatusView,
): ProcessingGroupKey {
  switch (job.status) {
    case "running":
    case "cancellation_requested":
      return "in_progress";
    case "queued":
      return "waiting";
    case "succeeded":
      return job.resultAvailable ? "ready" : "finished";
    case "failed":
    case "expired":
      return "attention";
    case "cancelled":
      return "finished";
  }
}

export interface ProcessingJobGroup {
  readonly key: ProcessingGroupKey;
  readonly title: string;
  readonly jobs: readonly ProcessingJobStatusView[];
}

export function groupProcessingJobs(
  jobs: readonly ProcessingJobStatusView[],
): readonly ProcessingJobGroup[] {
  const byKey = new Map<ProcessingGroupKey, ProcessingJobStatusView[]>();
  for (const job of jobs) {
    const key = processingGroupKey(job);
    const bucket = byKey.get(key);
    if (bucket) bucket.push(job);
    else byKey.set(key, [job]);
  }

  return PROCESSING_GROUP_ORDER.flatMap((key) => {
    const groupJobs = byKey.get(key);
    return groupJobs && groupJobs.length > 0
      ? [{ key, title: processingGroupTitle(key), jobs: groupJobs }]
      : [];
  });
}

/**
 * What the screen says while it has nothing to list. Restoration is a real
 * state — the persisted job references and the server page are still being
 * read — so it must not be reported as "nothing is processing".
 */
export function processingEmptyState(isRestoring: boolean): {
  readonly title: string;
  readonly message: string;
} {
  return isRestoring
    ? {
        title: "Restoring processing",
        message: "Checking the server for reviewers that are still processing.",
      }
    : {
        title: "Nothing is processing",
        message:
          "Reviewers you generate appear here while they process, and stay until you dismiss them.",
      };
}

function singularUnit(unitLabel: "pages" | "sections"): string {
  return unitLabel === "pages" ? "page" : "section";
}
