import type { ProcessingJobDatabaseRow } from "@stay-focused/db";
import { start } from "workflow/api";

import { processingJobWorkflow } from "@/workflows/processing-job";

import {
  createProcessingJobServiceClient,
  type ProcessingJobServiceClient,
} from "./repository";
import {
  attachProcessingJobWorkflow,
  markProcessingJobWorkflowDispatchFailed,
  prepareProcessingJobWorkflowDispatch,
} from "./workflow-repository";

export type ProcessingExecutionBackend =
  | "database_worker"
  | "vercel_workflow";

interface DispatchDependencies {
  readonly client?: ProcessingJobServiceClient;
  readonly startWorkflow?: (
    jobId: string,
  ) => Promise<{ readonly runId: string }>;
}

export function getProcessingExecutionBackend(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): ProcessingExecutionBackend {
  const configured = environment.PROCESSING_EXECUTION_BACKEND?.trim();
  if (configured === "database_worker" || configured === "vercel_workflow") {
    return configured;
  }
  return environment.VERCEL === "1" ? "vercel_workflow" : "database_worker";
}

export async function dispatchAcceptedProcessingJob(
  job: ProcessingJobDatabaseRow,
  dependencies: DispatchDependencies = {},
): Promise<ProcessingJobDatabaseRow> {
  if (getProcessingExecutionBackend() === "database_worker") {
    return job;
  }
  const canRecoverDispatchFailure =
    job.status === "failed" &&
    job.execution_backend === "vercel_workflow" &&
    job.workflow_run_id === null &&
    job.error_code === "processing_workflow_dispatch_failed" &&
    job.retryable;
  if (
    (job.status !== "queued" && !canRecoverDispatchFailure) ||
    (job.execution_backend === "vercel_workflow" && job.workflow_run_id)
  ) {
    return job;
  }

  const client =
    dependencies.client ?? createProcessingJobServiceClient();
  const prepared = await prepareProcessingJobWorkflowDispatch(client, job.id);
  if (prepared.workflow_run_id || prepared.status !== "queued") {
    return prepared;
  }

  let run: { readonly runId: string };
  try {
    run = await (
      dependencies.startWorkflow ??
      (async (jobId: string) => {
        const started = await start(processingJobWorkflow, [jobId]);
        return { runId: started.runId };
      })
    )(job.id);
  } catch {
    await markProcessingJobWorkflowDispatchFailed(client, job.id).catch(
      () => undefined,
    );
    throw new ProcessingWorkflowDispatchError();
  }

  try {
    return await attachProcessingJobWorkflow(client, job.id, run.runId);
  } catch {
    // Vercel has durably accepted this run. The workflow's first step also
    // attaches the same run ID before claiming, so an API-side attach outage
    // must not misreport accepted work as a failed dispatch.
    return prepared;
  }
}

export class ProcessingWorkflowDispatchError extends Error {
  public readonly code = "processing_workflow_dispatch_failed";
  public readonly safeMessage = "Processing could not be started. Try again.";
  public readonly retryable = true;

  public constructor() {
    super("processing_workflow_dispatch_failed");
    this.name = "ProcessingWorkflowDispatchError";
  }
}
