import { sessionStore } from "../auth/sessionStore";

const DISMISSED_JOBS_KEY = "stay-focused-v2.dismissed-processing-jobs.v1";
const MAX_DISMISSED_JOBS = 200;

interface DismissedProcessingJob {
  readonly ownerUserId: string;
  readonly jobId: string;
  readonly dismissedAt: string;
}

export async function dismissProcessingJob(
  ownerUserId: string,
  jobId: string,
): Promise<void> {
  const all = await readAll();
  const next: DismissedProcessingJob[] = [
    { ownerUserId, jobId, dismissedAt: new Date().toISOString() },
    ...all.filter(
      (item) => !(item.ownerUserId === ownerUserId && item.jobId === jobId),
    ),
  ].slice(0, MAX_DISMISSED_JOBS);
  await sessionStore.setItem(DISMISSED_JOBS_KEY, JSON.stringify(next));
}

export async function readDismissedProcessingJobIds(
  ownerUserId: string,
): Promise<ReadonlySet<string>> {
  const all = await readAll();
  return new Set(
    all
      .filter((item) => item.ownerUserId === ownerUserId)
      .map((item) => item.jobId),
  );
}

async function readAll(): Promise<readonly DismissedProcessingJob[]> {
  const raw = await sessionStore.getItem(DISMISSED_JOBS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isDismissedJob) : [];
  } catch {
    return [];
  }
}

function isDismissedJob(value: unknown): value is DismissedProcessingJob {
  return (
    typeof value === "object" &&
    value !== null &&
    "ownerUserId" in value &&
    typeof value.ownerUserId === "string" &&
    "jobId" in value &&
    typeof value.jobId === "string" &&
    "dismissedAt" in value &&
    typeof value.dismissedAt === "string"
  );
}
