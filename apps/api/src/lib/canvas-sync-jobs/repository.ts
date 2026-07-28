import { createHash } from "node:crypto";

import type {
  CanvasSyncJobDatabaseRow,
  CanvasSyncJobStage,
  CanvasSyncJobType,
  Database,
  Json,
} from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createCanvasServiceClient } from "@/lib/canvas-db";
import type { CanvasApiErrorCode } from "@/types/canvas";

const COURSE_COLUMNS = "id,user_id,canvas_connection_id,name,course_code";

export type CanvasSyncJobServiceClient = SupabaseClient<Database>;

export function createCanvasSyncJobServiceClient(): CanvasSyncJobServiceClient {
  return createCanvasServiceClient();
}

export function validateCanvasSyncIdempotencyKey(value: string | null): string {
  const normalized = value?.trim() ?? "";
  if (
    normalized.length < 8 ||
    normalized.length > 200 ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    throw new CanvasSyncJobRepositoryError(
      "invalid_idempotency_key",
      "Provide a valid idempotency key for this synchronization.",
      false,
    );
  }
  return normalized;
}

export async function createCanvasSyncJob(
  client: CanvasSyncJobServiceClient,
  input: {
    readonly courseId: string;
    readonly idempotencyKey: string;
    readonly jobType: CanvasSyncJobType;
    readonly userId: string;
  },
): Promise<CanvasSyncJobDatabaseRow> {
  const { data: course, error: courseError } = await client
    .from("canvas_courses")
    .select(COURSE_COLUMNS)
    .eq("id", input.courseId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (courseError) {
    throw new CanvasSyncJobRepositoryError(
      "canvas_sync_storage_failed",
      "Canvas synchronization is temporarily unavailable.",
      true,
    );
  }
  if (!course) {
    throw new CanvasSyncJobRepositoryError(
      "canvas_course_not_found",
      "Canvas course was not found for this account.",
      false,
    );
  }

  const requestFingerprint = createHash("sha256")
    .update([
      "canvas-sync-v1",
      input.userId,
      course.canvas_connection_id,
      course.id,
      input.jobType,
    ].join(":"))
    .digest("hex");

  const { data, error } = await client.rpc("create_canvas_sync_job_v1", {
    p_canvas_connection_id: course.canvas_connection_id,
    p_course_id: course.id,
    p_idempotency_key: input.idempotencyKey,
    p_job_type: input.jobType,
    p_request_fingerprint: requestFingerprint,
    p_source_metadata: {
      displayName: course.name,
      courseCode: course.course_code,
    },
    p_user_id: input.userId,
  });
  if (error || !data?.[0]) {
    const message = readDatabaseMessage(error);
    if (message.includes("canvas_sync_job_idempotency_conflict")) {
      throw new CanvasSyncJobRepositoryError(
        "canvas_sync_job_idempotency_conflict",
        "This synchronization key was already used for different work.",
        false,
      );
    }
    if (message.includes("canvas_sync_job_in_progress")) {
      throw new CanvasSyncJobRepositoryError(
        "canvas_sync_job_in_progress",
        "This Canvas course is already synchronizing.",
        true,
      );
    }
    if (message.includes("canvas_sync_job_course_not_selected")) {
      throw new CanvasSyncJobRepositoryError(
        "canvas_course_not_selected",
        "Select the Canvas course before synchronizing it.",
        false,
      );
    }
    throw new CanvasSyncJobRepositoryError(
      "canvas_sync_job_creation_failed",
      "Canvas synchronization could not be accepted.",
      true,
    );
  }
  return data[0];
}

export async function findOwnedCanvasSyncJob(
  client: CanvasSyncJobServiceClient,
  userId: string,
  jobId: string,
): Promise<CanvasSyncJobDatabaseRow | null> {
  const { data, error } = await client
    .from("canvas_sync_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw new CanvasSyncJobRepositoryError(
      "canvas_sync_job_status_unavailable",
      "Canvas synchronization status is temporarily unavailable.",
      true,
    );
  }
  return data;
}

export async function findCanvasSyncJob(
  client: CanvasSyncJobServiceClient,
  jobId: string,
): Promise<CanvasSyncJobDatabaseRow | null> {
  const { data, error } = await client
    .from("canvas_sync_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  if (error) {
    throw new CanvasSyncJobRepositoryError(
      "canvas_sync_job_status_unavailable",
      "Canvas synchronization status is temporarily unavailable.",
      true,
    );
  }
  return data;
}

export async function prepareCanvasSyncJobWorkflowDispatch(
  client: CanvasSyncJobServiceClient,
  jobId: string,
): Promise<CanvasSyncJobDatabaseRow> {
  return requireRpcRow(
    client.rpc("prepare_canvas_sync_job_workflow_dispatch_v1", {
      p_job_id: jobId,
    }),
    "canvas_sync_workflow_prepare_failed",
  );
}

export async function attachCanvasSyncJobWorkflow(
  client: CanvasSyncJobServiceClient,
  jobId: string,
  workflowRunId: string,
): Promise<CanvasSyncJobDatabaseRow> {
  return requireRpcRow(
    client.rpc("attach_canvas_sync_job_workflow_v1", {
      p_job_id: jobId,
      p_workflow_run_id: workflowRunId,
    }),
    "canvas_sync_workflow_attach_failed",
  );
}

export async function markCanvasSyncJobDispatchFailed(
  client: CanvasSyncJobServiceClient,
  jobId: string,
): Promise<CanvasSyncJobDatabaseRow | null> {
  return optionalRpcRow(
    client.rpc("mark_canvas_sync_job_dispatch_failed_v1", {
      p_job_id: jobId,
    }),
    "canvas_sync_workflow_dispatch_failure_record_failed",
  );
}

export async function claimCanvasSyncJob(
  client: CanvasSyncJobServiceClient,
  jobId: string,
  workerId: string,
): Promise<CanvasSyncJobDatabaseRow | null> {
  return optionalRpcRow(
    client.rpc("claim_canvas_sync_job_v1", {
      p_job_id: jobId,
      p_worker_id: workerId,
    }),
    "canvas_sync_job_claim_failed",
  );
}

export async function updateCanvasSyncJobProgress(
  client: CanvasSyncJobServiceClient,
  input: {
    readonly completedUnits: number;
    readonly jobId: string;
    readonly message: string;
    readonly stage: CanvasSyncJobStage;
    readonly totalUnits: number;
    readonly workerId: string;
  },
): Promise<CanvasSyncJobDatabaseRow | null> {
  return optionalRpcRow(
    client.rpc("update_canvas_sync_job_progress_v1", {
      p_completed_units: input.completedUnits,
      p_job_id: input.jobId,
      p_stage: input.stage,
      p_status_message: input.message,
      p_total_units: input.totalUnits,
      p_worker_id: input.workerId,
    }),
    "canvas_sync_job_progress_failed",
  );
}

export async function completeCanvasSyncJob(
  client: CanvasSyncJobServiceClient,
  input: {
    readonly jobId: string;
    readonly resultSummary: Json;
    readonly workerId: string;
  },
): Promise<CanvasSyncJobDatabaseRow | null> {
  return optionalRpcRow(
    client.rpc("complete_canvas_sync_job_v1", {
      p_job_id: input.jobId,
      p_result_summary: input.resultSummary,
      p_worker_id: input.workerId,
    }),
    "canvas_sync_job_complete_failed",
  );
}

export async function failCanvasSyncJob(
  client: CanvasSyncJobServiceClient,
  input: {
    readonly code: string;
    readonly jobId: string;
    readonly message: string;
    readonly retryable: boolean;
    readonly workerId: string;
  },
): Promise<CanvasSyncJobDatabaseRow | null> {
  return optionalRpcRow(
    client.rpc("fail_canvas_sync_job_v1", {
      p_error_code: input.code,
      p_job_id: input.jobId,
      p_retryable: input.retryable,
      p_safe_error_message: input.message,
      p_worker_id: input.workerId,
    }),
    "canvas_sync_job_failure_record_failed",
  );
}

export async function requestCanvasSyncJobCancellation(
  client: CanvasSyncJobServiceClient,
  userId: string,
  jobId: string,
): Promise<CanvasSyncJobDatabaseRow | null> {
  return optionalRpcRow(
    client.rpc("request_canvas_sync_job_cancellation_v1", {
      p_job_id: jobId,
      p_user_id: userId,
    }),
    "canvas_sync_job_cancel_failed",
  );
}

export async function retryCanvasSyncJob(
  client: CanvasSyncJobServiceClient,
  userId: string,
  jobId: string,
  idempotencyKey: string,
): Promise<CanvasSyncJobDatabaseRow | null> {
  return optionalRpcRow(
    client.rpc("retry_canvas_sync_job_v2", {
      p_idempotency_key: idempotencyKey,
      p_job_id: jobId,
      p_user_id: userId,
    }),
    "canvas_sync_job_retry_failed",
  );
}

export async function recoverStaleCanvasSyncOperation(
  client: CanvasSyncJobServiceClient,
  jobId: string,
  workerId: string,
): Promise<number> {
  const { data, error } = await client.rpc(
    "recover_stale_canvas_sync_operation_v1",
    {
      p_job_id: jobId,
      p_stale_after_seconds: 300,
      p_worker_id: workerId,
    },
  );
  if (error) {
    throw new CanvasSyncJobRepositoryError(
      "canvas_sync_job_progress_failed",
      "Canvas synchronization recovery is temporarily unavailable.",
      true,
    );
  }
  return data ?? 0;
}

export class CanvasSyncJobRepositoryError extends Error {
  public readonly code: CanvasApiErrorCode;
  public readonly safeMessage: string;
  public readonly retryable: boolean;

  public constructor(
    code: CanvasApiErrorCode,
    safeMessage: string,
    retryable: boolean,
  ) {
    super(code);
    this.name = "CanvasSyncJobRepositoryError";
    this.code = code;
    this.safeMessage = safeMessage;
    this.retryable = retryable;
  }
}

async function requireRpcRow(
  query: PromiseLike<{
    readonly data: readonly CanvasSyncJobDatabaseRow[] | null;
    readonly error: unknown;
  }>,
  code: CanvasApiErrorCode,
): Promise<CanvasSyncJobDatabaseRow> {
  const row = await optionalRpcRow(query, code);
  if (!row) {
    throw new CanvasSyncJobRepositoryError(
      code,
      "Canvas synchronization is temporarily unavailable.",
      true,
    );
  }
  return row;
}

async function optionalRpcRow(
  query: PromiseLike<{
    readonly data: readonly CanvasSyncJobDatabaseRow[] | null;
    readonly error: unknown;
  }>,
  code: CanvasApiErrorCode,
): Promise<CanvasSyncJobDatabaseRow | null> {
  const { data, error } = await query;
  if (error) {
    throw new CanvasSyncJobRepositoryError(
      code,
      "Canvas synchronization is temporarily unavailable.",
      true,
    );
  }
  return data?.[0] ?? null;
}

function readDatabaseMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }
  return "";
}
