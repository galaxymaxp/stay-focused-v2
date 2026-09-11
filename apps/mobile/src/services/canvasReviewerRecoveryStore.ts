import type { ProcessingJobStatusView } from "@stay-focused/shared";

import { sessionStore } from "../auth/sessionStore";

const STORAGE_KEY = "stay-focused-v2.canvas-reviewer-recovery.v1";
const RECORD_VERSION = 1 as const;
const ACCEPTED_RETENTION_MS = 7 * 24 * 60 * 60 * 1_000;
const UNCERTAIN_SUBMISSION_RETENTION_MS = 2 * 60 * 1_000;
const ACCEPTANCE_CLOCK_SKEW_MS = 5_000;

export interface CanvasReviewerRecoveryRecord {
  readonly version: typeof RECORD_VERSION;
  readonly ownerUserId: string;
  readonly requestIdempotencyKey: string;
  readonly jobId: string | null;
  readonly jobSourceVersionId: string | null;
  readonly courseId: string;
  readonly courseName: string;
  readonly canvasItemIds: readonly string[];
  readonly canvasResolutionFingerprint: string;
  readonly sourceTitle: string;
  readonly sourceCharacterCount: number;
  readonly createdAt: string;
  readonly acceptedAt: string | null;
}

export interface BeginCanvasReviewerRecoveryInput {
  readonly ownerUserId: string;
  readonly requestIdempotencyKey: string;
  readonly courseId: string;
  readonly courseName: string;
  readonly canvasItemIds: readonly string[];
  readonly canvasResolutionFingerprint: string;
  readonly sourceTitle: string;
  readonly sourceCharacterCount: number;
}

/**
 * Persist the non-secret request identity before submission. If Android kills
 * the process while the acceptance response is in flight, a relaunch can look
 * for the matching user-owned server job without blindly submitting again.
 */
export async function beginCanvasReviewerRecovery(
  input: BeginCanvasReviewerRecoveryInput,
): Promise<CanvasReviewerRecoveryRecord> {
  const record: CanvasReviewerRecoveryRecord = {
    version: RECORD_VERSION,
    ownerUserId: input.ownerUserId.trim(),
    requestIdempotencyKey: input.requestIdempotencyKey.trim(),
    jobId: null,
    jobSourceVersionId: null,
    courseId: input.courseId.trim(),
    courseName: input.courseName.trim() || "Course",
    canvasItemIds: input.canvasItemIds.map((item) => item.trim()),
    canvasResolutionFingerprint: input.canvasResolutionFingerprint.trim(),
    sourceTitle: input.sourceTitle.trim() || "Canvas reviewer",
    sourceCharacterCount: input.sourceCharacterCount,
    createdAt: new Date().toISOString(),
    acceptedAt: null,
  };
  await writeRecord(record);
  return record;
}

export async function acceptCanvasReviewerRecovery(
  record: CanvasReviewerRecoveryRecord,
  job: ProcessingJobStatusView,
): Promise<CanvasReviewerRecoveryRecord | null> {
  if (!matchesCanvasReviewerRecoveryJob(record, job, { allowMissingJobId: true })) {
    await removeCanvasReviewerRecovery(record.ownerUserId);
    return null;
  }
  const accepted: CanvasReviewerRecoveryRecord = {
    ...record,
    jobId: job.id,
    jobSourceVersionId: job.sourceVersionId,
    acceptedAt: job.acceptedAt,
  };
  await writeRecord(accepted);
  return accepted;
}

export async function readCanvasReviewerRecovery(
  ownerUserId: string,
): Promise<CanvasReviewerRecoveryRecord | null> {
  const raw = await sessionStore.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const record = normalizeRecord(JSON.parse(raw) as unknown);
    if (!record || record.ownerUserId !== ownerUserId || isRecordExpired(record)) {
      await sessionStore.removeItem(STORAGE_KEY);
      return null;
    }
    return record;
  } catch {
    await sessionStore.removeItem(STORAGE_KEY);
    return null;
  }
}

export async function removeCanvasReviewerRecovery(
  ownerUserId: string,
  jobId?: string,
): Promise<void> {
  if (jobId) {
    const record = await readCanvasReviewerRecovery(ownerUserId);
    if (!record || record.jobId !== jobId) return;
  }
  await sessionStore.removeItem(STORAGE_KEY);
}

export async function clearCanvasReviewerRecoveryForOwner(
  ownerUserId: string,
): Promise<void> {
  const raw = await sessionStore.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const record = normalizeRecord(JSON.parse(raw) as unknown);
    if (!record || record.ownerUserId === ownerUserId) {
      await sessionStore.removeItem(STORAGE_KEY);
    }
  } catch {
    await sessionStore.removeItem(STORAGE_KEY);
  }
}

export function matchesCanvasReviewerRecoveryJob(
  record: CanvasReviewerRecoveryRecord,
  job: ProcessingJobStatusView,
  options: { readonly allowMissingJobId?: boolean } = {},
): boolean {
  if (
    job.jobType !== "reviewer_generation" ||
    (record.jobId && record.jobId !== job.id) ||
    (!record.jobId && !options.allowMissingJobId) ||
    job.source.displayName.trim() !== record.sourceTitle ||
    (job.source.characterCount !== undefined &&
      job.source.characterCount !== record.sourceCharacterCount) ||
    (record.jobSourceVersionId !== null &&
      job.sourceVersionId !== record.jobSourceVersionId)
  ) {
    return false;
  }
  return true;
}

/** Find the accepted server job for a request whose response was interrupted. */
export function findCanvasReviewerRecoveryCandidate(
  record: CanvasReviewerRecoveryRecord,
  jobs: readonly ProcessingJobStatusView[],
): ProcessingJobStatusView | null {
  if (record.jobId) {
    return jobs.find((job) => job.id === record.jobId) ?? null;
  }
  const earliestAcceptedAt = Date.parse(record.createdAt) - ACCEPTANCE_CLOCK_SKEW_MS;
  const candidates = jobs
    .filter(
      (job) =>
        Date.parse(job.acceptedAt) >= earliestAcceptedAt &&
        matchesCanvasReviewerRecoveryJob(record, job, { allowMissingJobId: true }),
    )
    .sort((left, right) => right.acceptedAt.localeCompare(left.acceptedAt));
  return candidates.length === 1 ? candidates[0] : null;
}

export function isUncertainCanvasReviewerSubmissionExpired(
  record: CanvasReviewerRecoveryRecord,
  now = Date.now(),
): boolean {
  return (
    record.jobId === null &&
    now - Date.parse(record.createdAt) > UNCERTAIN_SUBMISSION_RETENTION_MS
  );
}

export function shouldDiscardCanvasReviewerRecoveryAfterStatusError(error: {
  readonly retryable: boolean;
  readonly status?: number;
}): boolean {
  return error.status === 404 || !error.retryable;
}

export function prepareCanvasReviewerRetryRecovery(
  record: CanvasReviewerRecoveryRecord,
  requestIdempotencyKey: string,
  createdAt = new Date().toISOString(),
): CanvasReviewerRecoveryRecord {
  return {
    ...record,
    requestIdempotencyKey,
    jobId: null,
    jobSourceVersionId: null,
    createdAt,
    acceptedAt: null,
  };
}

async function writeRecord(record: CanvasReviewerRecoveryRecord): Promise<void> {
  await sessionStore.setItem(STORAGE_KEY, JSON.stringify(record));
}

function normalizeRecord(value: unknown): CanvasReviewerRecoveryRecord | null {
  if (!isRecord(value)) return null;
  if (
    value.version !== RECORD_VERSION ||
    !isNonEmptyString(value.ownerUserId) ||
    !isNonEmptyString(value.requestIdempotencyKey) ||
    !(value.jobId === null || isNonEmptyString(value.jobId)) ||
    !(value.jobSourceVersionId === null || isNonEmptyString(value.jobSourceVersionId)) ||
    !isNonEmptyString(value.courseId) ||
    !isNonEmptyString(value.courseName) ||
    !Array.isArray(value.canvasItemIds) ||
    value.canvasItemIds.length !== 1 ||
    !value.canvasItemIds.every(isNonEmptyString) ||
    !isNonEmptyString(value.canvasResolutionFingerprint) ||
    !isNonEmptyString(value.sourceTitle) ||
    typeof value.sourceCharacterCount !== "number" ||
    !Number.isSafeInteger(value.sourceCharacterCount) ||
    value.sourceCharacterCount <= 0 ||
    !isIsoDate(value.createdAt) ||
    !(value.acceptedAt === null || isIsoDate(value.acceptedAt))
  ) {
    return null;
  }
  if ((value.jobId === null) !== (value.acceptedAt === null)) return null;
  return {
    version: RECORD_VERSION,
    ownerUserId: value.ownerUserId,
    requestIdempotencyKey: value.requestIdempotencyKey,
    jobId: value.jobId,
    jobSourceVersionId: value.jobSourceVersionId,
    courseId: value.courseId,
    courseName: value.courseName,
    canvasItemIds: value.canvasItemIds,
    canvasResolutionFingerprint: value.canvasResolutionFingerprint,
    sourceTitle: value.sourceTitle,
    sourceCharacterCount: value.sourceCharacterCount,
    createdAt: value.createdAt,
    acceptedAt: value.acceptedAt,
  };
}

function isRecordExpired(record: CanvasReviewerRecoveryRecord): boolean {
  const createdAt = Date.parse(record.createdAt);
  return !Number.isFinite(createdAt) || Date.now() - createdAt > ACCEPTED_RETENTION_MS;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
