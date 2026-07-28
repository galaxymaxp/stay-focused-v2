import { sessionStore } from "../auth/sessionStore";
import type {
  CanvasSyncJobStatus,
  CanvasSyncJobStatusView,
  CanvasSyncJobType,
} from "./canvasApi";

const STORAGE_KEY = "stay-focused-v2.canvas-sync-jobs.v1";
const MAX_REFERENCES = 40;
const RETENTION_MS = 7 * 24 * 60 * 60 * 1_000;

export interface ActiveCanvasSyncJobReference {
  readonly ownerUserId: string;
  readonly courseId: string;
  readonly courseDisplayName: string;
  readonly jobType: CanvasSyncJobType;
  readonly idempotencyKey: string;
  readonly jobId: string | null;
  readonly createdAt: string;
  readonly lastKnownStatus: CanvasSyncJobStatus | "creating";
  readonly lastStatusCheckAt: string;
  readonly updatedAt: string;
  readonly progressMessage: string;
  readonly retryable: boolean;
  readonly safeErrorMessage: string | null;
}

export async function reserveCanvasSyncIntent(input: {
  readonly ownerUserId: string;
  readonly courseId: string;
  readonly courseDisplayName: string;
  readonly jobType: CanvasSyncJobType;
}): Promise<ActiveCanvasSyncJobReference> {
  const references = await readAll();
  const existing = references.find(
    (item) =>
      item.ownerUserId === input.ownerUserId &&
      item.courseId === input.courseId &&
      item.jobType === input.jobType &&
      isActiveStatus(item.lastKnownStatus),
  );
  if (existing) return existing;

  const now = new Date().toISOString();
  const reference: ActiveCanvasSyncJobReference = {
    ...input,
    idempotencyKey: createCanvasSyncIdempotencyKey(input.jobType),
    jobId: null,
    createdAt: now,
    lastKnownStatus: "creating",
    lastStatusCheckAt: now,
    updatedAt: now,
    progressMessage: "Submitting Canvas synchronization",
    retryable: true,
    safeErrorMessage: null,
  };
  await write([
    reference,
    ...references.filter((item) => !sameIntent(item, reference)),
  ]);
  return reference;
}

export async function upsertActiveCanvasSyncJob(
  ownerUserId: string,
  job: CanvasSyncJobStatusView,
): Promise<void> {
  const references = await readAll();
  const previous = references.find(
    (item) =>
      item.ownerUserId === ownerUserId &&
      (item.jobId === job.id ||
        (item.courseId === job.course.id && item.jobType === job.jobType)),
  );
  const now = new Date().toISOString();
  const reference: ActiveCanvasSyncJobReference = {
    ownerUserId,
    courseId: job.course.id,
    courseDisplayName: job.course.displayName,
    jobType: job.jobType,
    idempotencyKey:
      previous?.idempotencyKey ?? createCanvasSyncIdempotencyKey(job.jobType),
    jobId: job.id,
    createdAt: job.createdAt,
    lastKnownStatus: job.status,
    lastStatusCheckAt: now,
    updatedAt: job.updatedAt,
    progressMessage: job.progress.message,
    retryable: job.retryable,
    safeErrorMessage: job.safeErrorMessage,
  };
  await write([
    reference,
    ...references.filter(
      (item) =>
        item.jobId !== job.id &&
        !(
          item.ownerUserId === ownerUserId &&
          item.courseId === job.course.id &&
          item.jobType === job.jobType
        ),
    ),
  ]);
}

export async function readActiveCanvasSyncJobs(
  ownerUserId: string,
): Promise<readonly ActiveCanvasSyncJobReference[]> {
  return (await readAll()).filter((item) => item.ownerUserId === ownerUserId);
}

export async function removeActiveCanvasSyncJob(jobId: string): Promise<void> {
  await write((await readAll()).filter((item) => item.jobId !== jobId));
}

export function isActiveCanvasSyncStatus(
  status: ActiveCanvasSyncJobReference["lastKnownStatus"],
): boolean {
  return isActiveStatus(status);
}

function createCanvasSyncIdempotencyKey(jobType: CanvasSyncJobType): string {
  return `canvas:${jobType}:${Date.now().toString(36)}:${Math.random()
    .toString(36)
    .slice(2, 14)}`;
}

async function readAll(): Promise<readonly ActiveCanvasSyncJobReference[]> {
  const raw = await sessionStore.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value)
      ? value.map(normalize).filter(isPresent).filter(isRetained)
      : [];
  } catch {
    return [];
  }
}

async function write(
  references: readonly ActiveCanvasSyncJobReference[],
): Promise<void> {
  await sessionStore.setItem(
    STORAGE_KEY,
    JSON.stringify(references.filter(isRetained).slice(0, MAX_REFERENCES)),
  );
}

function normalize(value: unknown): ActiveCanvasSyncJobReference | null {
  if (
    !isRecord(value) ||
    typeof value.ownerUserId !== "string" ||
    typeof value.courseId !== "string" ||
    typeof value.courseDisplayName !== "string" ||
    (value.jobType !== "course_content" && value.jobType !== "course_grades") ||
    typeof value.idempotencyKey !== "string" ||
    (value.jobId !== null && typeof value.jobId !== "string") ||
    typeof value.createdAt !== "string" ||
    !isStoredStatus(value.lastKnownStatus) ||
    typeof value.lastStatusCheckAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }
  return {
    ownerUserId: value.ownerUserId,
    courseId: value.courseId,
    courseDisplayName: value.courseDisplayName,
    jobType: value.jobType,
    idempotencyKey: value.idempotencyKey,
    jobId: value.jobId,
    createdAt: value.createdAt,
    lastKnownStatus: value.lastKnownStatus,
    lastStatusCheckAt: value.lastStatusCheckAt,
    updatedAt: value.updatedAt,
    progressMessage:
      typeof value.progressMessage === "string"
        ? value.progressMessage
        : "Canvas synchronization will refresh when online.",
    retryable: value.retryable === true,
    safeErrorMessage:
      typeof value.safeErrorMessage === "string"
        ? value.safeErrorMessage
        : null,
  };
}

function sameIntent(
  left: ActiveCanvasSyncJobReference,
  right: ActiveCanvasSyncJobReference,
): boolean {
  return (
    left.ownerUserId === right.ownerUserId &&
    left.courseId === right.courseId &&
    left.jobType === right.jobType
  );
}

function isActiveStatus(
  status: ActiveCanvasSyncJobReference["lastKnownStatus"],
): boolean {
  return (
    status === "creating" ||
    status === "queued" ||
    status === "running" ||
    status === "cancellation_requested"
  );
}

function isStoredStatus(
  value: unknown,
): value is ActiveCanvasSyncJobReference["lastKnownStatus"] {
  return (
    value === "creating" ||
    value === "queued" ||
    value === "running" ||
    value === "succeeded" ||
    value === "failed" ||
    value === "cancellation_requested" ||
    value === "cancelled" ||
    value === "expired"
  );
}

function isRetained(reference: ActiveCanvasSyncJobReference): boolean {
  if (isActiveStatus(reference.lastKnownStatus)) return true;
  const updatedAt = Date.parse(reference.updatedAt);
  return Number.isFinite(updatedAt) && updatedAt >= Date.now() - RETENTION_MS;
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
