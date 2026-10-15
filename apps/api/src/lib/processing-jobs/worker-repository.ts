import type {
  Json,
  ProcessingJobDatabaseRow,
  ProcessingJobType,
} from "@stay-focused/db";

import { JOB_WORKER_LEASE_SECONDS } from "./constants";
import type { ProcessingJobServiceClient } from "./repository";
import type { prerenderSourcePageSnapshots } from '../source-page-snapshot-prerender';

export async function recoverStaleProcessingJobs(
  client: ProcessingJobServiceClient,
): Promise<number> {
  const { data, error } = await client.rpc("recover_stale_processing_jobs", {});
  if (error) {
    throw new WorkerRepositoryError(
      "processing_job_recovery_failed",
      readSafeDatabaseCode(error),
    );
  }
  return data ?? 0;
}

export async function recordProcessingWorkerHeartbeat(
  client: ProcessingJobServiceClient,
  input: {
    readonly workerId: string;
    readonly status: "running" | "stopped" | "error";
    readonly capacity: number;
    readonly activeJobCount: number;
    readonly buildRevision?: string;
  },
): Promise<void> {
  const { error } = await client.rpc("record_processing_worker_heartbeat", {
    p_worker_id: input.workerId,
    p_status: input.status,
    p_capacity: input.capacity,
    p_active_job_count: input.activeJobCount,
    p_build_revision: input.buildRevision ?? null,
  });
  if (error) {
    throw new WorkerRepositoryError(
      "processing_worker_heartbeat_failed",
      readSafeDatabaseCode(error),
    );
  }
}

export async function claimProcessingJobs(
  client: ProcessingJobServiceClient,
  workerId: string,
  limit: number,
): Promise<readonly ProcessingJobDatabaseRow[]> {
  const { data, error } = await client.rpc("claim_processing_jobs_v2", {
    p_worker_id: workerId,
    p_job_types: ["document_extraction", "reviewer_generation", "activity_generation", "quiz_generation"],
    p_limit: limit,
    p_lease_seconds: JOB_WORKER_LEASE_SECONDS,
  });
  if (error) {
    throw new WorkerRepositoryError(
      "processing_job_claim_failed",
      readSafeDatabaseCode(error),
    );
  }
  return data ?? [];
}

export async function heartbeatProcessingJob(
  client: ProcessingJobServiceClient,
  jobId: string,
  workerId: string,
  leaseSeconds = JOB_WORKER_LEASE_SECONDS,
): Promise<void> {
  const { data, error } = await client.rpc("heartbeat_processing_job", {
    p_job_id: jobId,
    p_worker_id: workerId,
    p_lease_seconds: leaseSeconds,
  });
  if (error || !data?.[0]) {
    throw new WorkerRepositoryError(
      "processing_job_lease_lost",
      readSafeDatabaseCode(error),
    );
  }
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
  if (error || !data?.[0]) {
    throw new WorkerRepositoryError(
      "processing_job_progress_rejected",
      readSafeDatabaseCode(error),
    );
  }
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
  if (error || !data) {
    throw new WorkerRepositoryError(
      "processing_job_read_failed",
      readSafeDatabaseCode(error),
    );
  }
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
  dependencies: { readonly prerender?: typeof prerenderSourcePageSnapshots; readonly figures?: typeof import("../source-figures/store").extractLocalPreparedFigures;
    readonly visuals?: typeof import("../external-visuals/batch").prepareReviewerVisuals } = {},
): Promise<ProcessingJobDatabaseRow> {
  const { data, error } = await client.rpc(input.resultType === "quiz_generation" ? "complete_quiz_processing_job" : input.resultType === "activity_generation" ? "complete_activity_processing_job" : "complete_processing_job_v2", {
    p_job_id: input.jobId,
    p_worker_id: input.workerId,
    p_result_type: input.resultType,
    p_payload: input.payload,
    p_metrics: input.metrics,
  });
  if (error || !data?.[0]) {
    throw new WorkerRepositoryError(
      "processing_job_completion_rejected",
      readSafeDatabaseCode(error),
    );
  }
  const completed = data[0];
  if (input.resultType === 'document_extraction' && completed.status === 'succeeded') {
    try { await (dependencies.figures ?? (await import('../source-figures/store')).extractLocalPreparedFigures)(client,completed); }
    catch { console.warn('source_figures.extraction',{code:'post_commit_failed',failureCount:1}); }
  }
  if (input.resultType === 'reviewer_generation' && completed.status === 'succeeded') {
    // The RPC has committed the artifact, version and source before this lookup.
    // Both manual and automatic jobs use this single publication boundary.
    let artifactId: string | null = null;
    try {
      const version = await client.from('generated_artifact_versions').select('artifact_id,source_version_id,user_id')
        .eq('generation_job_id', completed.id).eq('user_id', completed.user_id).eq('artifact_type', 'reviewer').maybeSingle();
      if (version.error || !version.data || version.data.user_id !== completed.user_id ||
          version.data.source_version_id !== completed.source_version_id) throw new Error('prerender_receipt_unavailable');
      artifactId = version.data.artifact_id;
      const prerender = dependencies.prerender ?? (await import('../source-page-snapshot-prerender')).prerenderSourcePageSnapshots;
      await prerender(client, {
        userId: completed.user_id, artifactId,
      });
    } catch {
      // No provider errors, IDs, paths or academic content in pre-render logs.
      console.warn('source_page_snapshot.prerender', { code: 'post_commit_failed', failureCount: 1 });
    }
    // Labeled reference visuals are prepared at publication so the reader shows them immediately.
    if (artifactId) {
      try {
        const visuals = dependencies.visuals ?? (await import('../external-visuals/batch')).prepareReviewerVisuals;
        await visuals(client, { userId: completed.user_id, artifactId });
      } catch {
        console.warn('external_visual.batch', { code: 'post_commit_failed', failureCount: 1 });
      }
    }
  }
  return completed;
}

export async function failProcessingJob(
  client: ProcessingJobServiceClient,
  input: {
    readonly jobId: string;
    readonly workerId: string;
    readonly errorCode: string;
    readonly safeErrorMessage: string;
    readonly retryable: boolean;
    readonly automaticRetryable: boolean;
  },
): Promise<ProcessingJobDatabaseRow> {
  const { data, error } = await client.rpc("fail_processing_job_v2", {
    p_job_id: input.jobId,
    p_worker_id: input.workerId,
    p_error_code: input.errorCode,
    p_safe_error_message: input.safeErrorMessage,
    p_retryable: input.retryable,
    p_automatic_retryable: input.automaticRetryable,
  });
  if (error || !data?.[0]) {
    throw new WorkerRepositoryError(
      "processing_job_failure_rejected",
      readSafeDatabaseCode(error),
    );
  }
  return data[0];
}

export class WorkerRepositoryError extends Error {
  public readonly code: string;
  public readonly databaseCode?: string;

  public constructor(code: string, databaseCode?: string) {
    super(code);
    this.name = "WorkerRepositoryError";
    this.code = code;
    this.databaseCode = databaseCode;
  }
}

function readSafeDatabaseCode(error: unknown): string | undefined {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    typeof error.code !== "string"
  ) {
    return undefined;
  }
  const normalized = error.code.trim().toUpperCase();
  return /^[A-Z0-9]{5,12}$/.test(normalized) ? normalized : undefined;
}
