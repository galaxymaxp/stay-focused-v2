import type {
  CanvasCourseSyncScopeStateRow,
  CanvasSyncJobDatabaseRow,
  CanvasSyncScope,
} from "@stay-focused/db";

import {
  createCanvasSyncJobServiceClient,
} from "@/lib/canvas-sync-jobs/repository";

export type CanvasCourseSyncOverallHealth =
  | "not_synced"
  | "syncing"
  | "healthy"
  | "needs_attention"
  | "stale";

export interface CanvasCourseSyncScopeHealthView {
  readonly scope: CanvasSyncScope;
  readonly health:
    | "not_synced"
    | "syncing"
    | "healthy"
    | "needs_attention"
    | "stale";
  readonly lastCheckedAt: string | null;
  readonly lastSuccessfulAt: string | null;
  readonly counts: {
    readonly synced: number;
    readonly metadataOnly: number;
    readonly temporarilyFailed: number;
    readonly stale: number;
    readonly deleted: number;
  };
  readonly safeMessage: string | null;
  readonly safeErrorCode: string | null;
  readonly retryable: boolean;
}

export interface CanvasCourseSyncHealthView {
  readonly courseId: string;
  readonly overallHealth: CanvasCourseSyncOverallHealth;
  readonly lastCheckedAt: string | null;
  readonly lastSuccessfulAt: string | null;
  readonly activeJob: {
    readonly id: string;
    readonly jobType: CanvasSyncJobDatabaseRow["job_type"];
    readonly status: CanvasSyncJobDatabaseRow["status"];
    readonly stage: CanvasSyncJobDatabaseRow["stage"];
  } | null;
  readonly scopes: Readonly<Record<CanvasSyncScope, CanvasCourseSyncScopeHealthView>>;
  readonly attentionScopeCount: number;
  readonly staleScopeCount: number;
  readonly retryGuidance: string | null;
}

export interface CanvasCourseInventoryHealthSummary {
  readonly overallHealth: CanvasCourseSyncOverallHealth;
  readonly attentionScopeCount: number;
  readonly staleScopeCount: number;
}

const SCOPES: readonly CanvasSyncScope[] = [
  "content",
  "announcements",
  "files",
  "grades",
];

export async function loadCanvasCourseSyncHealth(input: {
  readonly courseId: string;
  readonly userId: string;
}): Promise<CanvasCourseSyncHealthView | null> {
  const client = createCanvasSyncJobServiceClient();
  const [{ data: course, error: courseError }, { data: scopes, error: scopeError }, {
    data: activeJobs,
    error: jobError,
  }] = await Promise.all([
    client
      .from("canvas_courses")
      .select("id")
      .eq("id", input.courseId)
      .eq("user_id", input.userId)
      .maybeSingle(),
    client
      .from("canvas_course_sync_scope_states")
      .select("*")
      .eq("course_id", input.courseId)
      .eq("user_id", input.userId),
    client
      .from("canvas_sync_jobs")
      .select("*")
      .eq("course_id", input.courseId)
      .eq("user_id", input.userId)
      .in("status", ["queued", "running", "cancellation_requested"])
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  if (courseError || scopeError || jobError) {
    throw new Error("canvas_sync_health_unavailable");
  }
  if (!course) return null;
  return createCanvasCourseSyncHealthView(
    input.courseId,
    scopes ?? [],
    activeJobs?.[0] ?? null,
  );
}

export async function loadCanvasCourseInventoryHealth(input: {
  readonly courseIds: readonly string[];
  readonly userId: string;
}): Promise<ReadonlyMap<string, CanvasCourseInventoryHealthSummary>> {
  if (input.courseIds.length === 0) return new Map();
  const client = createCanvasSyncJobServiceClient();
  const [{ data: scopes, error: scopeError }, { data: activeJobs, error: jobError }] =
    await Promise.all([
      client
        .from("canvas_course_sync_scope_states")
        .select("*")
        .eq("user_id", input.userId)
        .in("course_id", [...input.courseIds]),
      client
        .from("canvas_sync_jobs")
        .select("*")
        .eq("user_id", input.userId)
        .in("course_id", [...input.courseIds])
        .in("status", ["queued", "running", "cancellation_requested"])
        .order("created_at", { ascending: false }),
    ]);
  if (scopeError || jobError) throw new Error("canvas_sync_health_unavailable");

  const byCourse = new Map<string, CanvasCourseSyncScopeStateRow[]>();
  for (const row of scopes ?? []) {
    byCourse.set(row.course_id, [...(byCourse.get(row.course_id) ?? []), row]);
  }
  const activeByCourse = new Map<string, CanvasSyncJobDatabaseRow>();
  for (const row of activeJobs ?? []) {
    if (!activeByCourse.has(row.course_id)) activeByCourse.set(row.course_id, row);
  }

  return new Map(
    input.courseIds.map((courseId) => {
      const health = createCanvasCourseSyncHealthView(
        courseId,
        byCourse.get(courseId) ?? [],
        activeByCourse.get(courseId) ?? null,
      );
      return [
        courseId,
        {
          attentionScopeCount: health.attentionScopeCount,
          overallHealth: health.overallHealth,
          staleScopeCount: health.staleScopeCount,
        },
      ];
    }),
  );
}

export function createCanvasCourseSyncHealthView(
  courseId: string,
  rows: readonly CanvasCourseSyncScopeStateRow[],
  activeJob: CanvasSyncJobDatabaseRow | null,
): CanvasCourseSyncHealthView {
  const rowByScope = new Map(rows.map((row) => [row.scope, row]));
  const scopes = Object.fromEntries(
    SCOPES.map((scope) => [
      scope,
      scopeHealthView(scope, rowByScope.get(scope) ?? null),
    ]),
  ) as Readonly<Record<CanvasSyncScope, CanvasCourseSyncScopeHealthView>>;
  const values = Object.values(scopes);
  const attentionScopeCount = values.filter(
    (scope) => scope.health === "needs_attention",
  ).length;
  const staleScopeCount = values.filter((scope) => scope.health === "stale").length;
  const overallHealth: CanvasCourseSyncOverallHealth = activeJob
    ? "syncing"
    : attentionScopeCount > 0
      ? "needs_attention"
      : staleScopeCount > 0
        ? "stale"
        : rows.length === 0
          ? "not_synced"
          : values.some((scope) => scope.health === "healthy")
            ? "healthy"
            : "not_synced";

  return {
    activeJob: activeJob
      ? {
          id: activeJob.id,
          jobType: activeJob.job_type,
          stage: activeJob.stage,
          status: activeJob.status,
        }
      : null,
    attentionScopeCount,
    courseId,
    lastCheckedAt: latestTimestamp(rows.map((row) => row.last_checked_at)),
    lastSuccessfulAt: latestTimestamp(
      rows.map((row) => row.last_successful_at),
    ),
    overallHealth,
    retryGuidance:
      attentionScopeCount > 0 || staleScopeCount > 0
        ? "Sync again when your Canvas connection is available."
        : null,
    scopes,
    staleScopeCount,
  };
}

function scopeHealthView(
  scope: CanvasSyncScope,
  row: CanvasCourseSyncScopeStateRow | null,
): CanvasCourseSyncScopeHealthView {
  return {
    counts: {
      deleted: row?.deleted_count ?? 0,
      metadataOnly: row?.metadata_only_count ?? 0,
      stale: row?.stale_count ?? 0,
      synced: row?.synced_count ?? 0,
      temporarilyFailed: row?.temporarily_failed_count ?? 0,
    },
    health: !row
      ? "not_synced"
      : row.health_status === "partial" || row.health_status === "failed"
        ? "needs_attention"
        : row.health_status,
    lastCheckedAt: row?.last_checked_at ?? null,
    lastSuccessfulAt: row?.last_successful_at ?? null,
    retryable: row?.retryable ?? false,
    safeErrorCode: row?.safe_error_code ?? null,
    safeMessage: row?.safe_message ?? null,
    scope,
  };
}

function latestTimestamp(values: readonly (string | null)[]): string | null {
  return values
    .filter((value): value is string => value !== null)
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;
}
