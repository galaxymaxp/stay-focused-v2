import {
  cancelCanvasSyncJob,
  getCanvasSyncJob,
  retryCanvasSyncJob,
  startCanvasCourseGradeSyncJob,
  startCanvasCourseSyncJob,
  type CanvasApiBaseInput,
  type CanvasApiResult,
  type CanvasSyncJobStatusView,
  type CanvasSyncJobType,
} from "./canvasApi";
import {
  isActiveCanvasSyncStatus,
  readActiveCanvasSyncJobs,
  removeActiveCanvasSyncJob,
  reserveCanvasSyncIntent,
  upsertActiveCanvasSyncJob,
  type ActiveCanvasSyncJobReference,
} from "./activeCanvasSyncJobStore";

export async function startDurableCanvasSync(
  input: CanvasApiBaseInput & {
    readonly ownerUserId: string;
    readonly courseId: string;
    readonly courseDisplayName: string;
    readonly jobType: CanvasSyncJobType;
  },
): Promise<CanvasApiResult<CanvasSyncJobStatusView>> {
  const requestedAt = Date.now();
  const previous = (await readActiveCanvasSyncJobs(input.ownerUserId)).find(
    (item) =>
      item.courseId === input.courseId &&
      item.jobType === input.jobType &&
      item.jobId !== null &&
      isActiveCanvasSyncStatus(item.lastKnownStatus),
  );
  const intent = await reserveCanvasSyncIntent(input);
  let result = await submitIntent(input, intent);

  // A key the server already knows replays its original job. A finished job
  // created before this request is that replay, not a new sync: record it and
  // submit once more under a fresh key.
  if (result.ok && isReplayedFinishedJob(result.data, requestedAt)) {
    await upsertActiveCanvasSyncJob(input.ownerUserId, result.data);
    result = await submitIntent(input, await reserveCanvasSyncIntent(input));
  }

  // The course already has a running job. Report that job rather than a failure.
  if (!result.ok && result.error.code === "sync_in_progress" && previous?.jobId) {
    const running = await getCanvasSyncJob({ ...input, jobId: previous.jobId });
    if (running.ok) result = running;
  }

  if (result.ok) {
    await upsertActiveCanvasSyncJob(input.ownerUserId, result.data);
  }
  return result;
}

const REPLAY_TOLERANCE_MS = 60_000;

export function isReplayedFinishedJob(
  job: CanvasSyncJobStatusView,
  requestedAt: number,
): boolean {
  if (isActiveCanvasSyncStatus(job.status)) return false;
  const createdAt = Date.parse(job.createdAt);
  return Number.isFinite(createdAt) && createdAt < requestedAt - REPLAY_TOLERANCE_MS;
}

export async function reconcileCanvasSyncJobs(
  input: CanvasApiBaseInput & { readonly ownerUserId: string },
): Promise<{
  readonly jobs: readonly CanvasSyncJobStatusView[];
  readonly newlyCompleted: readonly CanvasSyncJobStatusView[];
}> {
  const references = await readActiveCanvasSyncJobs(input.ownerUserId);
  const jobs: CanvasSyncJobStatusView[] = [];
  const newlyCompleted: CanvasSyncJobStatusView[] = [];

  for (const reference of references) {
    if (!isActiveCanvasSyncStatus(reference.lastKnownStatus)) continue;
    const result = reference.jobId
      ? await getCanvasSyncJob({ ...input, jobId: reference.jobId })
      : await submitIntent(input, reference);
    if (!result.ok) {
      // A job the server no longer knows can never finish; stop tracking it so
      // it cannot hold the course in a permanent "syncing" state.
      if (reference.jobId && result.error.status === 404) {
        await removeActiveCanvasSyncJob(reference.jobId);
      }
      continue;
    }

    jobs.push(result.data);
    if (
      result.data.status === "succeeded" &&
      reference.lastKnownStatus !== "succeeded"
    ) {
      newlyCompleted.push(result.data);
    }
    await upsertActiveCanvasSyncJob(input.ownerUserId, result.data);
  }

  return { jobs, newlyCompleted };
}

export async function cancelDurableCanvasSync(
  input: CanvasApiBaseInput & {
    readonly ownerUserId: string;
    readonly jobId: string;
  },
): Promise<CanvasApiResult<CanvasSyncJobStatusView>> {
  const result = await cancelCanvasSyncJob(input);
  if (result.ok) {
    await upsertActiveCanvasSyncJob(input.ownerUserId, result.data);
  }
  return result;
}

export async function retryDurableCanvasSync(
  input: CanvasApiBaseInput & {
    readonly ownerUserId: string;
    readonly jobId: string;
    readonly jobType: CanvasSyncJobType;
  },
): Promise<CanvasApiResult<CanvasSyncJobStatusView>> {
  const result = await retryCanvasSyncJob({
    ...input,
    idempotencyKey: createRetryKey(input.jobType),
  });
  if (result.ok) {
    await upsertActiveCanvasSyncJob(input.ownerUserId, result.data);
  }
  return result;
}

async function submitIntent(
  input: CanvasApiBaseInput & { readonly ownerUserId: string },
  intent: Pick<
    ActiveCanvasSyncJobReference,
    "courseId" | "idempotencyKey" | "jobType"
  >,
): Promise<CanvasApiResult<CanvasSyncJobStatusView>> {
  const request = {
    apiBaseUrl: input.apiBaseUrl,
    accessToken: input.accessToken,
    ...(input.fetchImpl ? { fetchImpl: input.fetchImpl } : {}),
    ...(input.signal ? { signal: input.signal } : {}),
    courseId: intent.courseId,
    idempotencyKey: intent.idempotencyKey,
  };
  return intent.jobType === "course_content"
    ? startCanvasCourseSyncJob(request)
    : startCanvasCourseGradeSyncJob(request);
}

function createRetryKey(jobType: CanvasSyncJobType): string {
  return `canvas-retry:${jobType}:${Date.now().toString(36)}:${Math.random()
    .toString(36)
    .slice(2, 14)}`;
}
