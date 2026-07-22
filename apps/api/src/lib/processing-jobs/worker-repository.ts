import type {
  Json,
  ProcessingJobDatabaseRow,
  ProcessingJobType,
} from "@stay-focused/db";

import { JOB_WORKER_LEASE_SECONDS } from "./constants";
import type { ProcessingJobServiceClient } from "./repository";

export async function recoverStaleProcessingJobs(
  client: ProcessingJobServiceClient,
): Promise<number> {
  const { data, error } = await client.rpc("recover_stale_processing_jobs", {});
  if (error) throw new WorkerRepositoryError("processing_job_recovery_failed");
  return data ?? 0;
}

export async function claimProcessingJobs(
  client: ProcessingJobServiceClient,
  workerId: string,
  limit: number,
): Promise<readonly ProcessingJobDatabaseRow[]> {
  const { data, error } = await client.rpc("claim_processing_jobs", {
    p_worker_id: workerId,
    p_job_types: ["document_extraction", "reviewer_generation"],
    p_limit: limit,
    p_lease_seconds: JOB_WORKER_LEASE_SECONDS,
  });
  if (error) throw new WorkerRepositoryError("processing_job_claim_failed");
  return data ?? [];
}

export async function heartbeatProcessingJob(
  client: ProcessingJobServiceClient,
  jobId: string,
  workerId: string,
): Promise<void> {
  const { data, error } = await client.rpc("heartbeat_processing_job", {
    p_job_id: jobId,
    p_worker_id: workerId,
    p_lease_seconds: JOB_WORKER_LEASE_SECONDS,
  });
  if (error || !data?.[0]) throw new WorkerRepositoryError("processing_job_lease_lost");
}

export async function updateProcessingJobProgress(
  client: ProcessingJobServiceClient,
  input: {
    readonly jobId: string;
    readonly workerId: string;
    readonly stage: string;
    readonly statusMessage: string;
    readonly completedUnits?: number;
    readonly totalUnits?: number;
    readonly unitLabel?: "pages" | "sections";
    readonly metrics?: Json;
  },
): Promise<void> {
  const { data, error } = await client.rpc("update_processing_job_progress", {
    p_job_id: input.jobId,
    p_worker_id: input.workerId,
    p_stage: input.stage,
    p_status_message: input.statusMessage,
    p_completed_units: input.completedUnits ?? null,
    p_total_units: input.totalUnits ?? null,
    p_unit_label: input.unitLabel ?? null,
    p_metrics: input.metrics ?? {},
  });
  if (error || !data?.[0]) throw new WorkerRepositoryError("processing_job_progress_rejected");
}

export async function readProcessingJobState(
  client: ProcessingJobServiceClient,
  jobId: string,
): Promise<ProcessingJobDatabaseRow> {
  const { data, error } = await client
    .from("processing_jobs")
    .select("*")
    .eq("id", jobId)
    .single();
  if (error || !data) throw new WorkerRepositoryError("processing_job_read_failed");
  return data;
}

export async function completeProcessingJob(
  client: ProcessingJobServiceClient,
  input: {
    readonly jobId: string;
    readonly workerId: string;
    readonly resultType: ProcessingJobType;
    readonly payload: Json;
    readonly metrics: Json;
  },
): Promise<ProcessingJobDatabaseRow> {
  const { data, error } = await client.rpc("complete_processing_job", {
    p_job_id: input.jobId,
    p_worker_id: input.workerId,
    p_result_type: input.resultType,
    p_payload: input.payload,
    p_metrics: input.metrics,
  });
  if (error || !data?.[0]) throw new WorkerRepositoryError("processing_job_completion_rejected");
  return data[0];
}

export async function failProcessingJob(
  client: ProcessingJobServiceClient,
  input: {
    readonly jobId: string;
    readonly workerId: string;
    readonly errorCode: string;
    readonly safeErrorMessage: string;
    readonly retryable: boolean;
  },
): Promise<ProcessingJobDatabaseRow> {
  const { data, error } = await client.rpc("fail_processing_job", {
    p_job_id: input.jobId,
    p_worker_id: input.workerId,
    p_error_code: input.errorCode,
    p_safe_error_message: input.safeErrorMessage,
    p_retryable: input.retryable,
  });
  if (error || !data?.[0]) throw new WorkerRepositoryError("processing_job_failure_rejected");
  return data[0];
}

export class WorkerRepositoryError extends Error {
  public readonly code: string;

  public constructor(code: string) {
    super(code);
    this.name = "WorkerRepositoryError";
    this.code = code;
  }
}
