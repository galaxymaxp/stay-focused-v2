import type { CanvasSyncJobDatabaseRow } from "@stay-focused/db";
import { start } from "workflow/api";

import { canvasSyncJobWorkflow } from "@/workflows/canvas-sync-job";

import {
  attachCanvasSyncJobWorkflow,
  createCanvasSyncJobServiceClient,
  markCanvasSyncJobDispatchFailed,
  prepareCanvasSyncJobWorkflowDispatch,
  type CanvasSyncJobServiceClient,
} from "./repository";

interface DispatchDependencies {
  readonly client?: CanvasSyncJobServiceClient;
  readonly startWorkflow?: (
    jobId: string,
  ) => Promise<{ readonly runId: string }>;
}

export async function dispatchAcceptedCanvasSyncJob(
  job: CanvasSyncJobDatabaseRow,
  dependencies: DispatchDependencies = {},
): Promise<CanvasSyncJobDatabaseRow> {
  const canRecoverDispatchFailure =
    job.status === "failed" &&
    job.workflow_run_id === null &&
    job.error_code === "canvas_sync_workflow_dispatch_failed" &&
    job.retryable;
  if (
    (job.status !== "queued" && !canRecoverDispatchFailure) ||
    job.workflow_run_id
  ) {
    return job;
  }

  const client =
    dependencies.client ?? createCanvasSyncJobServiceClient();
  const prepared = await prepareCanvasSyncJobWorkflowDispatch(client, job.id);
  if (prepared.workflow_run_id || prepared.status !== "queued") {
    return prepared;
  }

  let run: { readonly runId: string };
  try {
    run = await (
      dependencies.startWorkflow ??
      (async (jobId: string) => {
        const started = await start(canvasSyncJobWorkflow, [jobId]);
        return { runId: started.runId };
      })
    )(job.id);
  } catch {
    await markCanvasSyncJobDispatchFailed(client, job.id).catch(
      () => undefined,
    );
    throw new CanvasSyncWorkflowDispatchError();
  }

  try {
    return await attachCanvasSyncJobWorkflow(client, job.id, run.runId);
  } catch {
    // The workflow has already been durably accepted. Its claim step attaches
    // the same run ID before doing any Canvas work.
    return prepared;
  }
}

export class CanvasSyncWorkflowDispatchError extends Error {
  public readonly code = "canvas_sync_workflow_dispatch_failed";
  public readonly safeMessage =
    "Canvas synchronization could not be started. Try again.";
  public readonly retryable = true;

  public constructor() {
    super("canvas_sync_workflow_dispatch_failed");
    this.name = "CanvasSyncWorkflowDispatchError";
  }
}
