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
  const intent = await reserveCanvasSyncIntent(input);
  const result = await submitIntent(input, intent);
  if (result.ok) {
    await upsertActiveCanvasSyncJob(input.ownerUserId, result.data);
  }
  return result;
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
    if (!result.ok) continue;

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
