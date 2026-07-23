import type {
  Database,
  Json,
  ProcessingJobDatabaseRow,
  ProcessingJobResultRow,
  ProcessingJobSourceRow,
} from "@stay-focused/db";
import type {
  GeneratedArtifactType,
  ProcessingJobSourceMetadata,
  ProcessingJobStatusView,
  ProcessingJobType,
} from "@stay-focused/shared";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type ProcessingJobServiceClient = SupabaseClient<Database>;

export interface CreateProcessingJobRecordInput {
  readonly userId: string;
  readonly jobType: ProcessingJobType;
  readonly idempotencyKey: string;
  readonly requestFingerprint: string;
  readonly sourceKind: "pdf" | "image" | "text";
  readonly displayName: string;
  readonly mimeType: string;
  readonly storageBucket?: string;
  readonly storageObjectPath?: string;
  readonly sourceText?: string;
  readonly byteSize?: number;
  readonly sourceCharacterCount?: number;
  readonly pageCount?: number;
  readonly sourceMetadata: ProcessingJobSourceMetadata;
  readonly sourcePrivateMetadata?: Json;
  readonly contract: Json;
  readonly expiresAt: string;
}

export function createProcessingJobServiceClient(): ProcessingJobServiceClient {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Processing job Supabase service configuration is missing.");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export async function createProcessingJobRecord(
  client: ProcessingJobServiceClient,
  input: CreateProcessingJobRecordInput,
): Promise<ProcessingJobDatabaseRow> {
  const { data, error } = await client.rpc("create_processing_job_v2", {
    p_user_id: input.userId,
    p_job_type: input.jobType,
    p_idempotency_key: input.idempotencyKey,
    p_request_fingerprint: input.requestFingerprint,
    p_source_kind: input.sourceKind,
    p_display_name: input.displayName,
    p_mime_type: input.mimeType,
    p_storage_bucket: input.storageBucket ?? null,
    p_storage_object_path: input.storageObjectPath ?? null,
    p_source_text: input.sourceText ?? null,
    p_byte_size: input.byteSize ?? null,
    p_source_character_count: input.sourceCharacterCount ?? null,
    p_page_count: input.pageCount ?? null,
    p_source_metadata: input.sourceMetadata as unknown as Json,
    p_source_private_metadata: input.sourcePrivateMetadata ?? {},
    p_contract: input.contract,
    p_expires_at: input.expiresAt,
  });

  if (error) {
    throw new ProcessingJobRepositoryError(mapDatabaseErrorCode(error.message));
  }

  const job = data?.[0];
  if (!job) {
    throw new ProcessingJobRepositoryError("processing_job_persistence_failed");
  }
  return job;
}

export async function findProcessingJobByIdempotencyKey(
  client: ProcessingJobServiceClient,
  userId: string,
  idempotencyKey: string,
): Promise<ProcessingJobDatabaseRow | null> {
  const { data, error } = await client
    .from("processing_jobs")
    .select("*")
    .eq("user_id", userId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) {
    throw new ProcessingJobRepositoryError("processing_job_read_failed");
  }
  return data;
}

export async function findOwnedProcessingJob(
  client: ProcessingJobServiceClient,
  userId: string,
  jobId: string,
): Promise<ProcessingJobDatabaseRow | null> {
  const { data, error } = await client
    .from("processing_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new ProcessingJobRepositoryError("processing_job_read_failed");
  }
  return data;
}

export async function listOwnedActiveProcessingJobs(
  client: ProcessingJobServiceClient,
  userId: string,
): Promise<readonly ProcessingJobDatabaseRow[]> {
  const { data, error } = await client
    .from("processing_jobs")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["queued", "running", "cancellation_requested"])
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new ProcessingJobRepositoryError("processing_job_read_failed");
  }
  return data ?? [];
}

export interface ProcessingJobListOptions {
  readonly scope: "active" | "all";
  readonly limit: number;
  readonly cursor?: {
    readonly createdAt: string;
    readonly id: string;
  };
}

export async function listOwnedProcessingJobs(
  client: ProcessingJobServiceClient,
  userId: string,
  options: ProcessingJobListOptions,
): Promise<readonly ProcessingJobDatabaseRow[]> {
  let query = client
    .from("processing_jobs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(options.limit);

  if (options.scope === "active") {
    query = query.in("status", ["queued", "running", "cancellation_requested"]);
  }
  if (options.cursor) {
    query = query.or(
      `created_at.lt.${options.cursor.createdAt},and(created_at.eq.${options.cursor.createdAt},id.lt.${options.cursor.id})`,
    );
  }

  const { data, error } = await query;
  if (error) {
    throw new ProcessingJobRepositoryError("processing_job_read_failed");
  }
  return data ?? [];
}

export async function findOwnedProcessingJobResult(
  client: ProcessingJobServiceClient,
  userId: string,
  jobId: string,
): Promise<ProcessingJobResultRow | null> {
  const job = await findOwnedProcessingJob(client, userId, jobId);
  if (!job || job.status !== "succeeded" || !job.result_id) {
    return null;
  }

  const { data, error } = await client
    .from("processing_job_results")
    .select("*")
    .eq("id", job.result_id)
    .eq("job_id", job.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new ProcessingJobRepositoryError("processing_job_result_read_failed");
  }
  return data;
}

export async function findProcessingJobSource(
  client: ProcessingJobServiceClient,
  job: ProcessingJobDatabaseRow,
): Promise<ProcessingJobSourceRow> {
  const { data, error } = await client
    .from("processing_job_sources")
    .select("*")
    .eq("id", job.source_snapshot_id)
    .eq("user_id", job.user_id)
    .single();

  if (error || !data) {
    throw new ProcessingJobRepositoryError("processing_job_source_read_failed");
  }
  return data;
}

export async function requestProcessingJobCancellation(
  client: ProcessingJobServiceClient,
  userId: string,
  jobId: string,
): Promise<ProcessingJobDatabaseRow | null> {
  const { data, error } = await client.rpc(
    "request_processing_job_cancellation",
    { p_user_id: userId, p_job_id: jobId },
  );
  if (error) {
    throw new ProcessingJobRepositoryError("processing_job_cancel_failed");
  }
  return data?.[0] ?? null;
}

export async function retryProcessingJob(
  client: ProcessingJobServiceClient,
  userId: string,
  jobId: string,
  idempotencyKey: string,
): Promise<ProcessingJobDatabaseRow | null> {
  const { data, error } = await client.rpc("retry_processing_job", {
    p_user_id: userId,
    p_job_id: jobId,
    p_idempotency_key: idempotencyKey,
  });
  if (error) {
    throw new ProcessingJobRepositoryError(mapDatabaseErrorCode(error.message));
  }
  return data?.[0] ?? null;
}

export function toProcessingJobStatusView(
  job: ProcessingJobDatabaseRow,
): ProcessingJobStatusView {
  const source = readSourceMetadata(job.source_metadata);
  return {
    id: job.id,
    jobType: job.job_type,
    status: job.status,
    stage: job.stage,
    progress: {
      completedUnits: job.completed_units,
      totalUnits: job.total_units,
      unitLabel: job.unit_label,
      message: job.status_message,
    },
    source,
    createdAt: job.created_at,
    acceptedAt: job.accepted_at,
    startedAt: job.started_at,
    updatedAt: job.updated_at,
    completedAt: job.completed_at,
    failedAt: job.failed_at,
    cancellationRequestedAt: job.cancellation_requested_at,
    errorCode: job.error_code,
    safeErrorMessage: job.safe_error_message,
    retryable: job.retryable,
    attemptCount: job.attempt_count,
    resultAvailable: job.status === "succeeded" && job.result_id !== null,
    retryOfJobId: job.retry_of_job_id,
    sourceVersionId: job.source_version_id,
    artifactType: readArtifactType(job.artifact_type),
    reuseMode: job.reuse_mode,
    reusedFromJobId: job.reuse_of_job_id,
    reuseCandidateArtifactVersionId: job.reuse_candidate_artifact_version_id,
    provenance: readProvenance(job),
  };
}

function readArtifactType(value: string | null): GeneratedArtifactType | null {
  return value === "reviewer" ||
    value === "flashcards" ||
    value === "quiz" ||
    value === "summary" ||
    value === "practice_test" ||
    value === "study_guide"
    ? value
    : null;
}

function readProvenance(
  job: ProcessingJobDatabaseRow,
): ProcessingJobStatusView["provenance"] {
  if (
    !job.generation_policy_version ||
    !job.engine_version ||
    !job.schema_version ||
    !job.provider_id ||
    !job.settings_fingerprint ||
    !job.language ||
    !job.output_mode
  ) {
    return null;
  }
  return {
    generationPolicyVersion: job.generation_policy_version,
    engineVersion: job.engine_version,
    schemaVersion: job.schema_version,
    providerId: job.provider_id,
    settingsFingerprint: job.settings_fingerprint,
    language: job.language,
    outputMode: job.output_mode,
  };
}

function readSourceMetadata(value: Json): ProcessingJobSourceMetadata {
  const record = isRecord(value) ? value : {};
  const sourceKind =
    record.sourceKind === "pdf" ||
    record.sourceKind === "image" ||
    record.sourceKind === "text"
      ? record.sourceKind
      : "text";

  return {
    displayName:
      typeof record.displayName === "string" ? record.displayName : "Source",
    sourceKind,
    mimeType:
      typeof record.mimeType === "string" ? record.mimeType : "text/plain",
    ...(typeof record.byteSize === "number"
      ? { byteSize: record.byteSize }
      : {}),
    ...(typeof record.characterCount === "number"
      ? { characterCount: record.characterCount }
      : {}),
    ...(typeof record.pageCount === "number"
      ? { pageCount: record.pageCount }
      : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapDatabaseErrorCode(message: string): string {
  if (message.includes("processing_job_idempotency_conflict")) {
    return "processing_job_idempotency_conflict";
  }
  if (message.includes("processing_job_not_retryable")) {
    return "processing_job_not_retryable";
  }
  for (const code of [
    "processing_job_active_limit_reached",
    "processing_job_rate_limit_reached",
    "processing_job_extraction_queue_limit_reached",
    "processing_job_generation_queue_limit_reached",
    "processing_job_daily_extraction_limit_reached",
    "processing_job_daily_ocr_page_limit_reached",
    "processing_job_daily_generation_limit_reached",
    "processing_source_version_not_found",
    "processing_generation_contract_invalid",
  ]) {
    if (message.includes(code)) return code;
  }
  return "processing_job_persistence_failed";
}

export class ProcessingJobRepositoryError extends Error {
  public readonly code: string;

  public constructor(code: string) {
    super(code);
    this.name = "ProcessingJobRepositoryError";
    this.code = code;
  }
}
