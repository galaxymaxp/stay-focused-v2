import type { Json } from "@stay-focused/db";
import { getWorkflowMetadata, RetryableError } from "workflow";

import { loadSelectedSyncCourse } from "@/lib/canvas-course-selection";
import { syncCanvasCourseGrades } from "@/lib/canvas-grade-sync";
import {
  attachCanvasSyncJobWorkflow,
  claimCanvasSyncJob,
  completeCanvasSyncJob,
  createCanvasSyncJobServiceClient,
  failCanvasSyncJob,
  findCanvasSyncJob,
  recoverStaleCanvasSyncOperation,
  updateCanvasSyncJobProgress,
} from "@/lib/canvas-sync-jobs/repository";
import { syncSelectedCanvasCourse } from "@/lib/canvas-sync";

type CanvasWorkflowOutcome =
  | { readonly status: "succeeded"; readonly jobId: string }
  | { readonly status: "failed"; readonly jobId: string }
  | { readonly status: "skipped"; readonly jobId: string };

type CanvasExecutionResult =
  | { readonly ok: true; readonly summary: Json }
  | {
      readonly ok: false;
      readonly code: string;
      readonly message: string;
      readonly retryable: boolean;
    };

export async function canvasSyncJobWorkflow(
  jobId: string,
): Promise<CanvasWorkflowOutcome> {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  const workerId = `vercel-workflow:${workflowRunId}`;

  try {
    const claimed = await claimCanvasSyncJobStep(
      jobId,
      workerId,
      workflowRunId,
    );
    if (!claimed) return { status: "skipped", jobId };

    const result = await executeCanvasSyncJobStep(jobId, workerId);
    if (!result.ok) {
      await failCanvasSyncJobStep(jobId, workerId, result);
      return { status: "failed", jobId };
    }

    await completeCanvasSyncJobStep(jobId, workerId, result.summary);
    return { status: "succeeded", jobId };
  } catch {
    await failCanvasSyncJobStep(jobId, workerId, {
      ok: false,
      code: "canvas_sync_interrupted",
      message: "Canvas synchronization was interrupted and can be retried.",
      retryable: true,
    });
    return { status: "failed", jobId };
  }
}

async function claimCanvasSyncJobStep(
  jobId: string,
  workerId: string,
  workflowRunId: string,
): Promise<boolean> {
  "use step";
  safeLog("claim", "start", jobId);
  const client = createCanvasSyncJobServiceClient();
  await attachCanvasSyncJobWorkflow(client, jobId, workflowRunId);
  const job = await claimCanvasSyncJob(client, jobId, workerId);
  safeLog("claim", job ? "done" : "skipped", jobId);
  return job !== null;
}

async function executeCanvasSyncJobStep(
  jobId: string,
  workerId: string,
): Promise<CanvasExecutionResult> {
  "use step";
  const client = createCanvasSyncJobServiceClient();
  const job = await findCanvasSyncJob(client, jobId);
  if (!job || job.worker_id !== workerId) {
    return permanentFailure(
      "canvas_sync_job_not_claimed",
      "Canvas synchronization could not be claimed.",
    );
  }
  if (job.status === "cancellation_requested") {
    return permanentFailure("canvas_sync_cancelled", "Cancellation requested.");
  }
  if (job.status !== "running") {
    return permanentFailure(
      "canvas_sync_job_not_running",
      "Canvas synchronization is no longer running.",
    );
  }

  await recoverStaleCanvasSyncOperation(client, jobId, workerId);

  const stage = job.job_type === "course_content"
    ? "synchronizing_content"
    : "synchronizing_grades";
  const message = job.job_type === "course_content"
    ? "Synchronizing Canvas course content"
    : "Synchronizing Canvas grades";
  await updateCanvasSyncJobProgress(client, {
    completedUnits: 0,
    jobId,
    message,
    stage,
    totalUnits: 1,
    workerId,
  });

  safeLog(job.job_type, "start", jobId);
  if (job.job_type === "course_content") {
    const selected = await loadSelectedSyncCourse({
      client,
      courseId: job.course_id,
      userId: job.user_id,
    });
    if (!selected.ok) {
      return mapCanvasFailure(
        selected.code,
        selected.message,
        selected.status,
      );
    }
    const current = await findCanvasSyncJob(client, jobId);
    if (current?.status === "cancellation_requested") {
      return permanentFailure("canvas_sync_cancelled", "Cancellation requested.");
    }
    const result = await syncSelectedCanvasCourse({
      client,
      connection: selected.value.connection,
      course: selected.value.course,
      courseRow: selected.value.courseRow,
      userId: job.user_id,
    });
    if (!result.ok) {
      return mapCanvasFailure(result.code, result.message, result.status);
    }
    safeLog(job.job_type, "done", jobId);
    return {
      ok: true,
      summary: toJson({
        outcome: result.summary.status,
        kind: "course_content",
        summary: result.summary,
      }),
    };
  }

  const result = await syncCanvasCourseGrades({
    client,
    courseId: job.course_id,
    userId: job.user_id,
  });
  safeLog(job.job_type, "done", jobId);
  return {
    ok: true,
    summary: toJson({
      outcome: result.status,
      kind: "course_grades",
      summary: result,
    }),
  };
}
executeCanvasSyncJobStep.maxRetries = 2;

async function completeCanvasSyncJobStep(
  jobId: string,
  workerId: string,
  summary: Json,
): Promise<void> {
  "use step";
  const client = createCanvasSyncJobServiceClient();
  await updateCanvasSyncJobProgress(client, {
    completedUnits: 1,
    jobId,
    message: "Finishing Canvas synchronization",
    stage: "storing_result",
    totalUnits: 1,
    workerId,
  });
  await completeCanvasSyncJob(client, {
    jobId,
    resultSummary: summary,
    workerId,
  });
  safeLog("complete", "done", jobId);
}

async function failCanvasSyncJobStep(
  jobId: string,
  workerId: string,
  failure: Extract<CanvasExecutionResult, { readonly ok: false }>,
): Promise<void> {
  "use step";
  const client = createCanvasSyncJobServiceClient();
  await failCanvasSyncJob(client, {
    code: failure.code,
    jobId,
    message: failure.message,
    retryable: failure.retryable,
    workerId,
  });
  safeLog("failure", "done", jobId, failure.code);
}
failCanvasSyncJobStep.maxRetries = 1;

function mapCanvasFailure(
  code: string,
  message: string,
  status: number,
): CanvasExecutionResult {
  const retryable =
    status === 408 ||
    status === 409 ||
    status === 429 ||
    status >= 500;
  if (retryable) {
    throw new RetryableError(code, {
      retryAfter: status === 409 ? "5m" : "30s",
    });
  }
  return permanentFailure(code, message);
}

function permanentFailure(
  code: string,
  message: string,
): CanvasExecutionResult {
  return { ok: false, code, message, retryable: false };
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function safeLog(
  step: string,
  event: string,
  jobId: string,
  code?: string,
): void {
  console.info("canvas_sync_workflow", {
    ...(code ? { code } : {}),
    event,
    jobId,
    step,
  });
}
