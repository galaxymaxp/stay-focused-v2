import type {
  ProcessingJobStatus,
  ProcessingJobStatusView,
  ProcessingJobType,
} from "@stay-focused/shared";

import { sessionStore } from "../auth/sessionStore";

const ACTIVE_JOB_STORAGE_KEY = "stay-focused-v2.processing-jobs.v1";
const MAX_LOCAL_JOB_REFERENCES = 20;

export interface ActiveProcessingJobReference {
  readonly jobId: string;
  readonly ownerUserId: string;
  readonly jobType: ProcessingJobType;
  readonly sourceDisplayName: string;
  readonly sourceKind: "pdf" | "image" | "text";
  readonly createdAt: string;
  readonly lastKnownStatus: ProcessingJobStatus;
  readonly lastStatusCheckAt: string;
}

export async function readActiveProcessingJobs(
  ownerUserId: string,
): Promise<readonly ActiveProcessingJobReference[]> {
  const raw = await sessionStore.getItem(ACTIVE_JOB_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isActiveReference).filter((job) => job.ownerUserId === ownerUserId);
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
  };
  const updated = [next, ...all.filter((item) => item.jobId !== job.id)]
    .slice(0, MAX_LOCAL_JOB_REFERENCES);
  await sessionStore.setItem(ACTIVE_JOB_STORAGE_KEY, JSON.stringify(updated));
}

export async function removeActiveProcessingJob(jobId: string): Promise<void> {
  const all = await readAllReferences();
  await sessionStore.setItem(
    ACTIVE_JOB_STORAGE_KEY,
    JSON.stringify(all.filter((item) => item.jobId !== jobId)),
  );
}

async function readAllReferences(): Promise<readonly ActiveProcessingJobReference[]> {
  const raw = await sessionStore.getItem(ACTIVE_JOB_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isActiveReference) : [];
  } catch {
    return [];
  }
}

function isActiveReference(value: unknown): value is ActiveProcessingJobReference {
  if (!isRecord(value)) return false;
  return (
    typeof value.jobId === "string" &&
    typeof value.ownerUserId === "string" &&
    (value.jobType === "document_extraction" || value.jobType === "reviewer_generation") &&
    typeof value.sourceDisplayName === "string" &&
    (value.sourceKind === "pdf" || value.sourceKind === "image" || value.sourceKind === "text") &&
    typeof value.createdAt === "string" &&
    typeof value.lastKnownStatus === "string" &&
    typeof value.lastStatusCheckAt === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
