import type {
  Json,
  ProcessingJobCheckpointRow,
  ProcessingJobDatabaseRow,
} from "@stay-focused/db";

import type { ProcessingJobServiceClient } from "./repository";
import { WorkerRepositoryError } from "./worker-repository";

export const WORKFLOW_JOB_LEASE_SECONDS = 300;

export async function prepareProcessingJobWorkflowDispatch(
  client: ProcessingJobServiceClient,
  jobId: string,
): Promise<ProcessingJobDatabaseRow> {
  const { data, error } = await client.rpc(
    "prepare_processing_job_workflow_dispatch_v1",
    { p_job_id: jobId },
  );
  if (error || !data?.[0]) {
    throw new WorkflowRepositoryError("processing_workflow_prepare_failed");
  }
  return data[0];
}

export async function attachProcessingJobWorkflow(
  client: ProcessingJobServiceClient,
  jobId: string,
  workflowRunId: string,
): Promise<ProcessingJobDatabaseRow> {
  const { data, error } = await client.rpc(
    "attach_processing_job_workflow_v1",
    {
      p_job_id: jobId,
      p_workflow_run_id: workflowRunId,
    },
  );
  if (error || !data?.[0]) {
    throw new WorkflowRepositoryError("processing_workflow_attach_failed");
  }
  return data[0];
}

export async function markProcessingJobWorkflowDispatchFailed(
  client: ProcessingJobServiceClient,
  jobId: string,
): Promise<ProcessingJobDatabaseRow | null> {
  const { data, error } = await client.rpc(
    "mark_processing_job_dispatch_failed_v1",
    { p_job_id: jobId },
  );
  if (error) {
    throw new WorkflowRepositoryError(
      "processing_workflow_dispatch_failure_record_failed",
    );
  }
  return data?.[0] ?? null;
}

export async function claimProcessingJobForWorkflow(
  client: ProcessingJobServiceClient,
  jobId: string,
  workerId: string,
): Promise<ProcessingJobDatabaseRow | null> {
  const { data, error } = await client.rpc(
    "claim_processing_job_by_id_v1",
    {
      p_job_id: jobId,
      p_worker_id: workerId,
      p_lease_seconds: WORKFLOW_JOB_LEASE_SECONDS,
    },
  );
  if (error) {
    throw new WorkerRepositoryError("processing_job_claim_failed");
  }
  return data?.[0] ?? null;
}

export async function readProcessingJobCheckpoint(
  client: ProcessingJobServiceClient,
  jobId: string,
  checkpointKey: string,
): Promise<ProcessingJobCheckpointRow | null> {
  const { data, error } = await client
    .from("processing_job_checkpoints")
    .select("*")
    .eq("job_id", jobId)
    .eq("checkpoint_key", checkpointKey)
    .maybeSingle();
  if (error) {
    throw new WorkflowRepositoryError("processing_checkpoint_read_failed");
  }
  return data;
}

export async function listProcessingJobCheckpoints(
  client: ProcessingJobServiceClient,
  jobId: string,
  checkpointKeyPrefix: string,
): Promise<readonly ProcessingJobCheckpointRow[]> {
  const escapedPrefix = escapeLikePattern(checkpointKeyPrefix);
  const { data, error } = await client
    .from("processing_job_checkpoints")
    .select("*")
    .eq("job_id", jobId)
    .like("checkpoint_key", `${escapedPrefix}%`)
    .order("checkpoint_key", { ascending: true });
  if (error) {
    throw new WorkflowRepositoryError("processing_checkpoint_list_failed");
  }
  return data ?? [];
}

export async function writeProcessingJobCheckpoint(
  client: ProcessingJobServiceClient,
  input: {
    readonly jobId: string;
    readonly checkpointKey: string;
    readonly payload: Json;
  },
): Promise<ProcessingJobCheckpointRow> {
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("processing_job_checkpoints")
    .upsert(
      {
        job_id: input.jobId,
        checkpoint_key: input.checkpointKey,
        payload: input.payload,
        updated_at: now,
      },
      {
        onConflict: "job_id,checkpoint_key",
      },
    )
    .select("*")
    .single();
  if (error || !data) {
    throw new WorkflowRepositoryError("processing_checkpoint_write_failed");
  }
  return data;
}

export class WorkflowRepositoryError extends Error {
  public readonly code: string;

  public constructor(code: string) {
    super(code);
    this.name = "WorkflowRepositoryError";
    this.code = code;
  }
}

function escapeLikePattern(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}
