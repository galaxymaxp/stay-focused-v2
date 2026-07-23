import type {
  ProcessingJobStatus,
  ProcessingJobStatusView,
  ProcessingJobType,
} from "@stay-focused/shared";

import { sessionStore } from "../auth/sessionStore";

const ACTIVE_JOB_STORAGE_KEY = "stay-focused-v2.processing-jobs.v1";
const MAX_LOCAL_JOB_REFERENCES = 50;
const RECENT_JOB_RETENTION_MS = 7 * 24 * 60 * 60 * 1_000;

export interface ActiveProcessingJobReference {
  readonly jobId: string;
  readonly ownerUserId: string;
  readonly jobType: ProcessingJobType;
  readonly sourceDisplayName: string;
  readonly sourceKind: "pdf" | "image" | "text";
  readonly createdAt: string;
  readonly lastKnownStatus: ProcessingJobStatus;
  readonly lastStatusCheckAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | null;
  readonly resultAvailable: boolean;
  readonly progressMessage: string;
  readonly completedUnits: number | null;
  readonly totalUnits: number | null;
  readonly unitLabel: "pages" | "sections" | null;
  readonly errorCode: string | null;
  readonly safeErrorMessage: string | null;
  readonly retryable: boolean;
}

export async function readActiveProcessingJobs(
  ownerUserId: string,
): Promise<readonly ActiveProcessingJobReference[]> {
  const raw = await sessionStore.getItem(ACTIVE_JOB_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return pruneReferences(parsed.map(normalizeReference).filter(isPresent))
      .filter((job) => job.ownerUserId === ownerUserId);
  } catch {
    return [];
  }
}

export async function upsertActiveProcessingJob(
  ownerUserId: string,
  job: ProcessingJobStatusView,
): Promise<void> {
  const all = await readAllReferences();
  const next: ActiveProcessingJobReference = {
    jobId: job.id,
    ownerUserId,
    jobType: job.jobType,
    sourceDisplayName: job.source.displayName,
    sourceKind: job.source.sourceKind,
    createdAt: job.createdAt,
    lastKnownStatus: job.status,
    lastStatusCheckAt: new Date().toISOString(),
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
    resultAvailable: job.resultAvailable,
    progressMessage: job.progress.message,
    completedUnits: job.progress.completedUnits,
    totalUnits: job.progress.totalUnits,
    unitLabel: job.progress.unitLabel,
    errorCode: job.errorCode,
    safeErrorMessage: job.safeErrorMessage,
    retryable: job.retryable,
  };
  const updated = capReferences([
    next,
    ...all.filter((item) => item.jobId !== job.id),
  ]);
  await sessionStore.setItem(ACTIVE_JOB_STORAGE_KEY, JSON.stringify(updated));
}

export async function removeActiveProcessingJob(jobId: string): Promise<void> {
  const all = await readAllReferences();
  await sessionStore.setItem(
    ACTIVE_JOB_STORAGE_KEY,
    JSON.stringify(all.filter((item) => item.jobId !== jobId)),
  );
}

export async function clearProcessingJobReferencesForOwner(
  ownerUserId: string,
): Promise<void> {
  const all = await readAllReferences();
  await sessionStore.setItem(
    ACTIVE_JOB_STORAGE_KEY,
    JSON.stringify(all.filter((item) => item.ownerUserId !== ownerUserId)),
  );
}

async function readAllReferences(): Promise<readonly ActiveProcessingJobReference[]> {
  const raw = await sessionStore.getItem(ACTIVE_JOB_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? pruneReferences(parsed.map(normalizeReference).filter(isPresent))
      : [];
  } catch {
    return [];
  }
}

function normalizeReference(
  value: unknown,
): ActiveProcessingJobReference | null {
  if (!isRecord(value)) return null;
  if (!(
    typeof value.jobId === "string" &&
    typeof value.ownerUserId === "string" &&
    (value.jobType === "document_extraction" || value.jobType === "reviewer_generation") &&
    typeof value.sourceDisplayName === "string" &&
    (value.sourceKind === "pdf" || value.sourceKind === "image" || value.sourceKind === "text") &&
    typeof value.createdAt === "string" &&
    typeof value.lastKnownStatus === "string" &&
    typeof value.lastStatusCheckAt === "string"
  )) {
    return null;
  }
  return {
    jobId: value.jobId,
    ownerUserId: value.ownerUserId,
    jobType: value.jobType,
    sourceDisplayName: value.sourceDisplayName,
    sourceKind: value.sourceKind,
    createdAt: value.createdAt,
    lastKnownStatus: value.lastKnownStatus as ProcessingJobStatus,
    lastStatusCheckAt: value.lastStatusCheckAt,
    updatedAt:
      typeof value.updatedAt === "string" ? value.updatedAt : value.lastStatusCheckAt,
    completedAt:
      typeof value.completedAt === "string" ? value.completedAt : null,
    resultAvailable: value.resultAvailable === true,
    progressMessage:
      typeof value.progressMessage === "string"
        ? value.progressMessage
        : "Processing status will refresh when online.",
    completedUnits:
      typeof value.completedUnits === "number" ? value.completedUnits : null,
    totalUnits: typeof value.totalUnits === "number" ? value.totalUnits : null,
    unitLabel:
      value.unitLabel === "pages" || value.unitLabel === "sections"
        ? value.unitLabel
        : null,
    errorCode: typeof value.errorCode === "string" ? value.errorCode : null,
    safeErrorMessage:
      typeof value.safeErrorMessage === "string" ? value.safeErrorMessage : null,
    retryable: value.retryable === true,
  };
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

function pruneReferences(
  references: readonly ActiveProcessingJobReference[],
): readonly ActiveProcessingJobReference[] {
  const cutoff = Date.now() - RECENT_JOB_RETENTION_MS;
  return references.filter((reference) => {
    if (
      reference.lastKnownStatus === "queued" ||
      reference.lastKnownStatus === "running" ||
      reference.lastKnownStatus === "cancellation_requested"
    ) {
      return true;
    }
    const updatedAt = Date.parse(reference.updatedAt);
    return Number.isFinite(updatedAt) && updatedAt >= cutoff;
  });
}

function capReferences(
  references: readonly ActiveProcessingJobReference[],
): readonly ActiveProcessingJobReference[] {
  const pruned = pruneReferences(references);
  const active = pruned.filter((reference) =>
    reference.lastKnownStatus === "queued" ||
    reference.lastKnownStatus === "running" ||
    reference.lastKnownStatus === "cancellation_requested",
  );
  const recent = pruned
    .filter((reference) => !active.includes(reference))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  return [...active, ...recent].slice(0, MAX_LOCAL_JOB_REFERENCES);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
