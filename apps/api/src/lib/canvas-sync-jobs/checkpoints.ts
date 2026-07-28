import { createHash } from "node:crypto";

import type {
  CanvasConnectionRow,
  CanvasCourseRow,
  CanvasCourseSyncScopeStateRow,
  CanvasSyncItemState,
  CanvasSyncJobDatabaseRow,
  CanvasSyncJobOutcome,
  CanvasSyncJobStagingRow,
  CanvasSyncJobUnitRow,
  CanvasSyncScope,
  CanvasSyncScopeHealthStatus,
  Database,
  Json,
} from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";

import { CONNECTION_SECRET_COLUMNS } from "@/lib/canvas-routes";
import type { CanvasSyncJobServiceClient } from "./repository";

export const CANVAS_SYNC_CHECKPOINT_VERSION = "canvas-sync-v2";
export const CANVAS_SYNC_UNIT_LEASE_SECONDS = 90;
export const CANVAS_SYNC_CONTENT_CONCURRENCY = 3;
export const CANVAS_SYNC_GRADE_CONCURRENCY = 2;
export const CANVAS_SYNC_JOB_DEADLINE_MS = 30 * 60_000;
export const CANVAS_SYNC_MAX_RETRY_AFTER_MS = 5 * 60_000;

export type CanvasSyncUnitKind =
  | "modules_page"
  | "module_items_page"
  | "pages_page"
  | "page_detail"
  | "page_detail_reuse"
  | "assignment_groups_page"
  | "assignments_page"
  | "announcements_page"
  | "files_page"
  | "grade_assignments_page"
  | "submissions_page"
  | "grade_summary_page";

export interface CanvasSyncUnitPlan {
  readonly unitKey: string;
  readonly unitKind: CanvasSyncUnitKind;
  readonly scope: CanvasSyncScope;
  readonly pageIndex: number;
  readonly isDiscovery: boolean;
  readonly checkpoint: Json;
}

export interface CanvasSyncCheckpointContext {
  readonly job: CanvasSyncJobDatabaseRow;
  readonly connection: CanvasConnectionRow;
  readonly course: CanvasCourseRow;
}

export interface CanvasSyncHealthScopeInput {
  readonly scope: CanvasSyncScope;
  readonly healthStatus: CanvasSyncScopeHealthStatus;
  readonly authoritative: boolean;
  readonly syncedCount: number;
  readonly metadataOnlyCount: number;
  readonly temporarilyFailedCount: number;
  readonly staleCount: number;
  readonly deletedCount: number;
  readonly safeMessage: string | null;
  readonly safeErrorCode: string | null;
  readonly retryable: boolean;
}

export interface CanvasSyncHealthItemInput {
  readonly scope: CanvasSyncScope;
  readonly itemKind: string;
  readonly itemKeyHash: string;
  readonly itemState: CanvasSyncItemState;
  readonly sourceUpdatedAt: string | null;
  readonly sourceFingerprint: string | null;
  readonly safeErrorCode: string | null;
}

export interface CanvasSyncPlanState {
  readonly job: CanvasSyncJobDatabaseRow | null;
  readonly units: readonly CanvasSyncJobUnitRow[];
  readonly nextAvailableAt: string | null;
}

export function createInitialCanvasSyncUnits(
  job: CanvasSyncJobDatabaseRow,
): readonly CanvasSyncUnitPlan[] {
  const acceptedAt = new Date(job.accepted_at);
  const windowStart = new Date(acceptedAt);
  windowStart.setUTCDate(windowStart.getUTCDate() - 30);
  const windowEnd = new Date(acceptedAt);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 120);

  if (job.job_type === "course_grades") {
    return [
      createCanvasSyncUnit("grade_assignments_page", "grades", 0, true, {}),
      createCanvasSyncUnit("submissions_page", "grades", 0, true, {}),
      createCanvasSyncUnit("grade_summary_page", "grades", 0, true, {}),
    ];
  }

  return [
    createCanvasSyncUnit("modules_page", "content", 0, true, {}),
    createCanvasSyncUnit("pages_page", "content", 0, true, {}),
    createCanvasSyncUnit("assignment_groups_page", "content", 0, true, {}),
    createCanvasSyncUnit("assignments_page", "content", 0, true, {}),
    createCanvasSyncUnit("announcements_page", "announcements", 0, true, {
      endDate: windowEnd.toISOString(),
      startDate: windowStart.toISOString(),
    }),
    createCanvasSyncUnit("files_page", "files", 0, true, {}),
  ];
}

export function createCanvasSyncUnit(
  unitKind: CanvasSyncUnitKind,
  scope: CanvasSyncScope,
  pageIndex: number,
  isDiscovery: boolean,
  checkpoint: Json,
): CanvasSyncUnitPlan {
  return {
    unitKey: createHash("sha256")
      .update(
        JSON.stringify({
          checkpoint,
          pageIndex,
          scope,
          unitKind,
          version: CANVAS_SYNC_CHECKPOINT_VERSION,
        }),
      )
      .digest("hex"),
    unitKind,
    scope,
    pageIndex,
    isDiscovery,
    checkpoint,
  };
}

export function fingerprintCanvasSyncItem(
  value: unknown,
): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

export function canvasSyncItemKeyHash(
  scope: CanvasSyncScope,
  itemKind: string,
  sourceId: string,
): string {
  return createHash("sha256")
    .update(`${scope}:${itemKind}:${sourceId}`)
    .digest("hex");
}

export async function loadCanvasSyncCheckpointContext(
  client: CanvasSyncJobServiceClient,
  jobId: string,
): Promise<CanvasSyncCheckpointContext | null> {
  const { data: job, error: jobError } = await client
    .from("canvas_sync_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  if (jobError || !job) return null;

  const [{ data: connection, error: connectionError }, { data: course, error: courseError }] =
    await Promise.all([
      client
        .from("canvas_connections")
        .select(CONNECTION_SECRET_COLUMNS)
        .eq("id", job.canvas_connection_id)
        .eq("user_id", job.user_id)
        .maybeSingle(),
      client
        .from("canvas_courses")
        .select("*")
        .eq("id", job.course_id)
        .eq("user_id", job.user_id)
        .maybeSingle(),
    ]);
  if (connectionError || courseError || !connection || !course) return null;
  return {
    job,
    connection: connection as CanvasConnectionRow,
    course: course as CanvasCourseRow,
  };
}

export async function initializeCanvasSyncPlan(
  client: CanvasSyncJobServiceClient,
  input: {
    readonly jobId: string;
    readonly workerId: string;
    readonly units: readonly CanvasSyncUnitPlan[];
  },
): Promise<CanvasSyncJobDatabaseRow | null> {
  return firstRow(
    client.rpc("initialize_canvas_sync_job_plan_v2", {
      p_checkpoint_version: CANVAS_SYNC_CHECKPOINT_VERSION,
      p_job_id: input.jobId,
      p_units: toJson(input.units),
      p_worker_id: input.workerId,
    }),
  );
}

export async function claimCanvasSyncUnitBatch(
  client: CanvasSyncJobServiceClient,
  input: {
    readonly jobId: string;
    readonly workerId: string;
    readonly limit: number;
  },
): Promise<readonly CanvasSyncJobUnitRow[]> {
  const { data, error } = await client.rpc("claim_canvas_sync_job_units_v2", {
    p_job_id: input.jobId,
    p_lease_seconds: CANVAS_SYNC_UNIT_LEASE_SECONDS,
    p_limit: input.limit,
    p_worker_id: input.workerId,
  });
  if (error) throw new Error("canvas_sync_unit_claim_failed");
  return data ?? [];
}

export async function beginCanvasSyncUnitAttempt(
  client: CanvasSyncJobServiceClient,
  unitId: string,
  workerId: string,
): Promise<CanvasSyncJobUnitRow | null> {
  return firstRow(
    client.rpc("begin_canvas_sync_job_unit_attempt_v2", {
      p_lease_seconds: CANVAS_SYNC_UNIT_LEASE_SECONDS,
      p_unit_id: unitId,
      p_worker_id: workerId,
    }),
  );
}

export async function completeCanvasSyncUnit(
  client: CanvasSyncJobServiceClient,
  input: {
    readonly unitId: string;
    readonly workerId: string;
    readonly payloadKind: string;
    readonly payload: Json | null;
    readonly discoveredUnits: readonly CanvasSyncUnitPlan[];
  },
): Promise<CanvasSyncJobUnitRow | null> {
  return firstRow(
    client.rpc("complete_canvas_sync_job_unit_v2", {
      p_discovered_units: toJson(input.discoveredUnits),
      p_payload: input.payload,
      p_payload_kind: input.payloadKind,
      p_unit_id: input.unitId,
      p_worker_id: input.workerId,
    }),
  );
}

export async function deferCanvasSyncUnit(
  client: CanvasSyncJobServiceClient,
  input: {
    readonly unitId: string;
    readonly workerId: string;
    readonly code: string;
    readonly message: string;
    readonly availableAt: string;
  },
): Promise<CanvasSyncJobUnitRow | null> {
  return firstRow(
    client.rpc("defer_canvas_sync_job_unit_v2", {
      p_available_at: input.availableAt,
      p_error_code: input.code,
      p_safe_error_message: input.message,
      p_unit_id: input.unitId,
      p_worker_id: input.workerId,
    }),
  );
}

export async function failCanvasSyncUnit(
  client: CanvasSyncJobServiceClient,
  input: {
    readonly unitId: string;
    readonly workerId: string;
    readonly code: string;
    readonly message: string;
    readonly retryable: boolean;
  },
): Promise<CanvasSyncJobUnitRow | null> {
  return firstRow(
    client.rpc("fail_canvas_sync_job_unit_v2", {
      p_error_code: input.code,
      p_retryable: input.retryable,
      p_safe_error_message: input.message,
      p_unit_id: input.unitId,
      p_worker_id: input.workerId,
    }),
  );
}

export async function readCanvasSyncPlanState(
  client: CanvasSyncJobServiceClient,
  jobId: string,
): Promise<CanvasSyncPlanState> {
  const [{ data: job, error: jobError }, { data: units, error: unitsError }] =
    await Promise.all([
      client
        .from("canvas_sync_jobs")
        .select("*")
        .eq("id", jobId)
        .maybeSingle(),
      client
        .from("canvas_sync_job_units")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: true }),
    ]);
  if (jobError || unitsError) throw new Error("canvas_sync_plan_unavailable");
  const rows = units ?? [];
  const waiting = rows
    .filter((unit) => unit.status === "retry_wait")
    .map((unit) => unit.available_at)
    .sort();
  return {
    job,
    units: rows,
    nextAvailableAt: waiting[0] ?? null,
  };
}

export async function readCanvasSyncStaging(
  client: CanvasSyncJobServiceClient,
  jobId: string,
): Promise<readonly CanvasSyncJobStagingRow[]> {
  const { data, error } = await client
    .from("canvas_sync_job_staging")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });
  if (error) throw new Error("canvas_sync_staging_unavailable");
  return data ?? [];
}

export async function recordCanvasSyncHealth(
  client: CanvasSyncJobServiceClient,
  input: {
    readonly jobId: string;
    readonly scopes: readonly CanvasSyncHealthScopeInput[];
    readonly items: readonly CanvasSyncHealthItemInput[];
  },
): Promise<boolean> {
  const { data, error } = await client.rpc(
    "record_canvas_course_sync_health_v2",
    {
      p_items: toJson(input.items),
      p_job_id: input.jobId,
      p_scopes: toJson(input.scopes),
    },
  );
  if (error) throw new Error("canvas_sync_health_persist_failed");
  return data;
}

export async function beginCanvasSyncPromotion(
  client: CanvasSyncJobServiceClient,
  jobId: string,
  workerId: string,
): Promise<CanvasSyncJobDatabaseRow | null> {
  return firstRow(
    client.rpc("begin_canvas_sync_promotion_v2", {
      p_job_id: jobId,
      p_worker_id: workerId,
    }),
  );
}

export async function completeCheckpointedCanvasSyncJob(
  client: CanvasSyncJobServiceClient,
  input: {
    readonly jobId: string;
    readonly workerId: string;
    readonly outcome: Exclude<CanvasSyncJobOutcome, "failed" | "cancelled">;
    readonly resultSummary: Json;
  },
): Promise<CanvasSyncJobDatabaseRow | null> {
  return firstRow(
    client.rpc("complete_canvas_sync_job_v2", {
      p_job_id: input.jobId,
      p_outcome: input.outcome,
      p_result_summary: input.resultSummary,
      p_worker_id: input.workerId,
    }),
  );
}

export async function failCheckpointedCanvasSyncJob(
  client: CanvasSyncJobServiceClient,
  input: {
    readonly jobId: string;
    readonly workerId: string;
    readonly code: string;
    readonly message: string;
    readonly retryable: boolean;
  },
): Promise<CanvasSyncJobDatabaseRow | null> {
  return firstRow(
    client.rpc("fail_canvas_sync_job_v2", {
      p_error_code: input.code,
      p_job_id: input.jobId,
      p_retryable: input.retryable,
      p_safe_error_message: input.message,
      p_worker_id: input.workerId,
    }),
  );
}

export async function cancelCheckpointedCanvasSyncJob(
  client: CanvasSyncJobServiceClient,
  jobId: string,
  workerId: string,
): Promise<CanvasSyncJobDatabaseRow | null> {
  return firstRow(
    client.rpc("cancel_canvas_sync_job_plan_v2", {
      p_job_id: jobId,
      p_worker_id: workerId,
    }),
  );
}

export async function readCanvasCourseSyncScopeStates(
  client: SupabaseClient<Database>,
  input: { readonly courseId: string; readonly userId: string },
): Promise<readonly CanvasCourseSyncScopeStateRow[]> {
  const { data, error } = await client
    .from("canvas_course_sync_scope_states")
    .select("*")
    .eq("course_id", input.courseId)
    .eq("user_id", input.userId)
    .order("scope");
  if (error) throw new Error("canvas_sync_health_unavailable");
  return data ?? [];
}

async function firstRow<TRow>(
  query: PromiseLike<{
    readonly data: readonly TRow[] | null;
    readonly error: unknown;
  }>,
): Promise<TRow | null> {
  const { data, error } = await query;
  if (error) throw new Error("canvas_sync_checkpoint_storage_failed");
  return data?.[0] ?? null;
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}
