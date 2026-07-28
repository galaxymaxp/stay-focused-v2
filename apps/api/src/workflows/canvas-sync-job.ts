import type { CanvasSyncJobUnitRow } from "@stay-focused/db";
import {
  getWorkflowMetadata,
  RetryableError,
  sleep,
} from "workflow";

import {
  CANVAS_SYNC_CONTENT_CONCURRENCY,
  claimCanvasSyncUnitBatch,
  createInitialCanvasSyncUnits,
  failCheckpointedCanvasSyncJob,
  initializeCanvasSyncPlan,
  readCanvasSyncPlanState,
} from "@/lib/canvas-sync-jobs/checkpoints";
import { finalizeCheckpointedCanvasSync } from "@/lib/canvas-sync-jobs/finalize";
import {
  attachCanvasSyncJobWorkflow,
  claimCanvasSyncJob,
  createCanvasSyncJobServiceClient,
  findCanvasSyncJob,
} from "@/lib/canvas-sync-jobs/repository";
import { executeCanvasSyncUnit } from "@/lib/canvas-sync-jobs/unit-executor";

type CanvasWorkflowOutcome =
  | { readonly status: "succeeded"; readonly jobId: string }
  | { readonly status: "failed"; readonly jobId: string }
  | { readonly status: "cancelled"; readonly jobId: string }
  | { readonly status: "skipped"; readonly jobId: string };

interface CanvasClaimedBatch {
  readonly status: "claimed" | "ready" | "cancelled" | "wait" | "stopped";
  readonly unitIds: readonly string[];
  readonly wakeAt: string | null;
}

const EMPTY_BATCH_WAIT_MS = 1_000;

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

    const initialized = await initializeCanvasSyncPlanStep(jobId, workerId);
    if (!initialized) return { status: "skipped", jobId };

    while (true) {
      const batch = await claimCanvasSyncUnitBatchStep(jobId, workerId);

      if (batch.status === "cancelled" || batch.status === "ready") {
        const final = await finalizeCanvasSyncJobStep(jobId, workerId);
        if (final.status === "pending") {
          await sleep(EMPTY_BATCH_WAIT_MS);
          continue;
        }
        if (final.status === "cancelled") {
          return { status: "cancelled", jobId };
        }
        return {
          status: final.status === "succeeded" ? "succeeded" : "failed",
          jobId,
        };
      }

      if (batch.status === "stopped") {
        return { status: "skipped", jobId };
      }

      if (batch.status === "wait") {
        if (batch.wakeAt) {
          await sleep(new Date(batch.wakeAt));
        } else {
          await sleep(EMPTY_BATCH_WAIT_MS);
        }
        continue;
      }

      await Promise.all(
        batch.unitIds.map((unitId) =>
          executeCanvasSyncUnitStep(unitId, workerId)
        ),
      );
    }
  } catch (error) {
    await failInterruptedCanvasSyncJobStep(jobId, workerId);
    safeLog(
      "workflow",
      "interrupted",
      jobId,
      safeErrorCode(error),
    );
    return { status: "failed", jobId };
  }
}

async function claimCanvasSyncJobStep(
  jobId: string,
  workerId: string,
  workflowRunId: string,
): Promise<boolean> {
  "use step";
  const client = createCanvasSyncJobServiceClient();
  await attachCanvasSyncJobWorkflow(client, jobId, workflowRunId);
  const job = await claimCanvasSyncJob(client, jobId, workerId);
  safeLog("claim_parent", job ? "done" : "skipped", jobId);
  return job !== null;
}

async function initializeCanvasSyncPlanStep(
  jobId: string,
  workerId: string,
): Promise<boolean> {
  "use step";
  const client = createCanvasSyncJobServiceClient();
  const job = await findCanvasSyncJob(client, jobId);
  if (
    !job ||
    job.worker_id !== workerId ||
    (job.status !== "running" && job.status !== "cancellation_requested")
  ) {
    return false;
  }
  if (job.status === "cancellation_requested") return true;
  const initialized = await initializeCanvasSyncPlan(client, {
    jobId,
    units: createInitialCanvasSyncUnits(job),
    workerId,
  });
  safeLog("initialize_plan", initialized ? "done" : "skipped", jobId);
  return initialized !== null;
}

async function claimCanvasSyncUnitBatchStep(
  jobId: string,
  workerId: string,
): Promise<CanvasClaimedBatch> {
  "use step";
  const client = createCanvasSyncJobServiceClient();
  const job = await findCanvasSyncJob(client, jobId);
  if (!job || job.worker_id !== workerId) {
    return { status: "stopped", unitIds: [], wakeAt: null };
  }
  if (job.status === "cancellation_requested") {
    return { status: "cancelled", unitIds: [], wakeAt: null };
  }
  if (job.status !== "running") {
    return { status: "stopped", unitIds: [], wakeAt: null };
  }

  const units = await claimCanvasSyncUnitBatch(client, {
    jobId,
    limit: CANVAS_SYNC_CONTENT_CONCURRENCY,
    workerId,
  });
  if (units.length > 0) {
    safeLog("claim_units", "done", jobId, undefined, units.length);
    return {
      status: "claimed",
      unitIds: units.map((unit) => unit.id),
      wakeAt: null,
    };
  }

  const state = await readCanvasSyncPlanState(client, jobId);
  const active = state.units.filter(isActiveUnit);
  if (active.length === 0) {
    return { status: "ready", unitIds: [], wakeAt: null };
  }
  const wakeAt = earliestWakeAt(active, state.nextAvailableAt);
  return { status: "wait", unitIds: [], wakeAt };
}

async function executeCanvasSyncUnitStep(
  unitId: string,
  workerId: string,
): Promise<void> {
  "use step";
  const client = createCanvasSyncJobServiceClient();
  const result = await executeCanvasSyncUnit(client, { unitId, workerId });
  if (result.status === "retry") {
    throw new RetryableError(result.code, {
      retryAfter: result.retryAfterMs,
    });
  }
  safeLog(
    "execute_unit",
    result.status,
    unitId,
    result.status === "failed" ? result.code : undefined,
  );
}
executeCanvasSyncUnitStep.maxRetries = 3;

async function finalizeCanvasSyncJobStep(
  jobId: string,
  workerId: string,
): ReturnType<typeof finalizeCheckpointedCanvasSync> {
  "use step";
  const client = createCanvasSyncJobServiceClient();
  const result = await finalizeCheckpointedCanvasSync(client, {
    jobId,
    workerId,
  });
  safeLog(
    "finalize",
    result.status,
    jobId,
    result.status === "failed" ? "canvas_sync_failed" : undefined,
  );
  return result;
}

async function failInterruptedCanvasSyncJobStep(
  jobId: string,
  workerId: string,
): Promise<void> {
  "use step";
  const client = createCanvasSyncJobServiceClient();
  await failCheckpointedCanvasSyncJob(client, {
    code: "canvas_sync_interrupted",
    jobId,
    message: "Canvas synchronization was interrupted and can be retried.",
    retryable: true,
    workerId,
  });
}
failInterruptedCanvasSyncJobStep.maxRetries = 1;

function isActiveUnit(unit: CanvasSyncJobUnitRow): boolean {
  return (
    unit.status === "queued" ||
    unit.status === "running" ||
    unit.status === "retry_wait"
  );
}

function earliestWakeAt(
  units: readonly CanvasSyncJobUnitRow[],
  retryAt: string | null,
): string {
  const candidates = [
    retryAt,
    ...units.map((unit) =>
      unit.status === "running"
        ? unit.lease_expires_at
        : unit.status === "retry_wait"
          ? unit.available_at
          : null
    ),
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter(Number.isFinite);
  const next = candidates.length > 0
    ? Math.min(...candidates)
    : Date.now() + EMPTY_BATCH_WAIT_MS;
  return new Date(Math.max(next, Date.now() + EMPTY_BATCH_WAIT_MS)).toISOString();
}

function safeErrorCode(error: unknown): string {
  if (error instanceof Error && /^[a-z0-9_]{3,80}$/.test(error.message)) {
    return error.message;
  }
  return "canvas_sync_interrupted";
}

function safeLog(
  step: string,
  event: string,
  jobOrUnitId: string,
  code?: string,
  count?: number,
): void {
  console.info("canvas_sync_workflow", {
    ...(code ? { code } : {}),
    ...(count === undefined ? {} : { count }),
    event,
    id: jobOrUnitId,
    step,
  });
}
