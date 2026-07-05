import type {
  CanvasAssignment,
  CanvasAssignmentGroup,
  CanvasCourse,
  CanvasModule,
  CanvasModuleItem,
  CanvasPageDetail,
} from "@stay-focused/canvas";
import { CanvasClientError } from "@stay-focused/canvas";
import type {
  CanvasCourseAcademicSnapshotResult,
  CanvasConnectionRow,
  CanvasSyncRunRow,
  Database,
} from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  CONNECTION_SECRET_COLUMNS,
  createCanvasClient,
  decryptConnectionToken,
  mapCanvasClientError,
  readConnection,
} from "@/lib/canvas-routes";
import {
  addResourceCounts,
  createCanvasCourseSnapshotPayload,
  emptyResourceCounts,
  resourceCountsForSnapshot,
  type CanvasCourseSnapshotPayload,
  type CanvasSyncFailureCode,
  type CanvasSyncResourceCounts,
} from "@/lib/canvas-sync-normalize";
import type { CanvasApiErrorCode } from "@/types/canvas";

const COURSE_CONCURRENCY_LIMIT = 2;
const MODULE_ITEM_CONCURRENCY_LIMIT = 3;
const PAGE_DETAIL_CONCURRENCY_LIMIT = 3;

export type CanvasAcademicSyncStatus = "succeeded" | "partial" | "failed";

export interface CanvasAcademicSyncSummary {
  readonly status: CanvasAcademicSyncStatus;
  readonly courses: {
    readonly discovered: number;
    readonly succeeded: number;
    readonly failed: number;
  };
  readonly resources: CanvasSyncResourceCounts;
  readonly failures?: readonly CanvasAcademicSyncFailureSummary[];
}

export interface CanvasAcademicSyncFailureSummary {
  readonly code: CanvasSyncFailureCode;
  readonly count: number;
}

export type CanvasAcademicSyncResult =
  | {
      readonly ok: true;
      readonly summary: CanvasAcademicSyncSummary;
    }
  | {
      readonly ok: false;
      readonly status: 400 | 401 | 403 | 404 | 409 | 429 | 500 | 502 | 503 | 504;
      readonly code: CanvasApiErrorCode;
      readonly message: string;
      readonly summary?: CanvasAcademicSyncSummary;
    };

interface CourseSnapshot {
  readonly course: CanvasCourse;
  readonly modules: readonly CanvasModule[];
  readonly moduleItemsByModule: readonly {
    readonly module: CanvasModule;
    readonly items: readonly CanvasModuleItem[];
  }[];
  readonly pages: readonly CanvasPageDetail[];
  readonly assignmentGroups: readonly CanvasAssignmentGroup[];
  readonly assignments: readonly CanvasAssignment[];
}

interface CourseSyncSuccess {
  readonly ok: true;
  readonly counts: CanvasSyncResourceCounts;
  readonly persistence: CanvasCourseAcademicSnapshotResult;
}

interface CourseSyncFailure {
  readonly ok: false;
  readonly code: CanvasSyncFailureCode;
}

type CourseSyncResult = CourseSyncSuccess | CourseSyncFailure;

interface CanvasSyncLimiters {
  readonly moduleItems: ConcurrencyLimiter;
  readonly pageDetails: ConcurrencyLimiter;
}

interface ConcurrencyLimiter {
  run<TOutput>(action: () => Promise<TOutput>): Promise<TOutput>;
}

export function getCanvasSyncConcurrencyLimits(): {
  readonly courses: number;
  readonly moduleItems: number;
  readonly pageDetails: number;
} {
  return {
    courses: COURSE_CONCURRENCY_LIMIT,
    moduleItems: MODULE_ITEM_CONCURRENCY_LIMIT,
    pageDetails: PAGE_DETAIL_CONCURRENCY_LIMIT,
  };
}

export async function syncCanvasAcademicGraph({
  client,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly userId: string;
}): Promise<CanvasAcademicSyncResult> {
  const connection = await readConnection(client, userId, CONNECTION_SECRET_COLUMNS);
  if (!connection.ok) {
    return {
      ok: false,
      status: 500,
      code: "canvas_storage_failed",
      message: "Canvas connection could not be loaded.",
    };
  }
  if (!connection.row) {
    return {
      ok: false,
      status: 404,
      code: "canvas_connection_missing",
      message: "Connect Canvas before synchronizing academic data.",
    };
  }
  const connectionRow = connection.row;

  const startedAt = new Date().toISOString();
  const run = await beginSyncRun({
    client,
    connectionId: connectionRow.id,
    startedAt,
    userId,
  });
  if (!run.ok) {
    return { ok: false, ...run.error };
  }

  let token: string;
  try {
    token = decryptConnectionToken(connectionRow);
  } catch {
    await finishSyncRun({
      client,
      connectionId: connectionRow.id,
      failureCode: "canvas_connection_corrupt",
      failureSummary: "Canvas connection credentials could not be used.",
      resourceCounts: emptyResourceCounts(),
      runId: run.row.id,
      status: "failed",
      totals: {
        discovered: 0,
        failed: 0,
        succeeded: 0,
      },
      userId,
    });
    return {
      ok: false,
      status: 500,
      code: "canvas_connection_corrupt",
      message: "Canvas connection credentials could not be used.",
      summary: createSummary({
        failures: [{ code: "canvas_connection_corrupt", count: 1 }],
        resourceCounts: emptyResourceCounts(),
        status: "failed",
        totals: { discovered: 0, failed: 0, succeeded: 0 },
      }),
    };
  }

  const canvas = createCanvasClient(connectionRow.base_url, token);
  let courses: readonly CanvasCourse[];
  try {
    courses = await canvas.listCourses();
  } catch (error) {
    const mapped = mapCanvasClientError(error);
    const failureCode = syncFailureCodeForCanvasError(error);
    const resourceCounts = emptyResourceCounts();
    const totals = { discovered: 0, failed: 0, succeeded: 0 };
    await finishSyncRun({
      client,
      connectionId: connectionRow.id,
      failureCode,
      failureSummary: "Canvas course discovery failed.",
      resourceCounts,
      runId: run.row.id,
      status: "failed",
      totals,
      userId,
    });
    return {
      ok: false,
      status: mapped.status,
      code: mapped.code,
      message: mapped.message,
      summary: createSummary({
        failures: [{ code: failureCode, count: 1 }],
        resourceCounts,
        status: "failed",
        totals,
      }),
    };
  }

  const totals = {
    discovered: courses.length,
    failed: 0,
    succeeded: 0,
  };
  let resourceCounts = emptyResourceCounts();
  const failures = new Map<CanvasSyncFailureCode, number>();
  let progressChain: Promise<void> = Promise.resolve();
  const limiters: CanvasSyncLimiters = {
    moduleItems: createConcurrencyLimiter(MODULE_ITEM_CONCURRENCY_LIMIT),
    pageDetails: createConcurrencyLimiter(PAGE_DETAIL_CONCURRENCY_LIMIT),
  };

  const results = await mapWithConcurrency(
    courses,
    COURSE_CONCURRENCY_LIMIT,
    async (course): Promise<CourseSyncResult> => {
      const result = await syncOneCourse({
        canvas,
        client,
        connection: connectionRow,
        course,
        limiters,
        runId: run.row.id,
        userId,
      });

      if (result.ok) {
        totals.succeeded += 1;
        resourceCounts = addResourceCounts(resourceCounts, result.counts);
      } else {
        totals.failed += 1;
        failures.set(result.code, (failures.get(result.code) ?? 0) + 1);
      }

      progressChain = progressChain
        .then(() =>
          updateSyncRunProgress({
            client,
            connectionId: connectionRow.id,
            resourceCounts,
            runId: run.row.id,
            totals,
            userId,
          }),
        )
        .catch(() => undefined);
      await progressChain;
      return result;
    },
  );

  await progressChain;

  const status = statusForTotals(totals);
  const failureSummaries = summarizeFailures(failures);
  const summary = createSummary({
    failures: failureSummaries,
    resourceCounts,
    status,
    totals,
  });

  await finishSyncRun({
    client,
    connectionId: connectionRow.id,
    failureCode: failureSummaries[0]?.code ?? null,
    failureSummary:
      status === "failed" || status === "partial"
        ? "One or more courses could not be synchronized."
        : null,
    resourceCounts,
    runId: run.row.id,
    status,
    totals,
    userId,
  });

  if (status === "succeeded" || status === "partial") {
    return { ok: true, summary };
  }

  const hadPersistenceFailure = results.some(
    (result) => !result.ok && result.code === "canvas_course_persist_failed",
  );

  return {
    ok: false,
    status: hadPersistenceFailure ? 500 : 502,
    code: hadPersistenceFailure ? "canvas_storage_failed" : "canvas_unavailable",
    message: hadPersistenceFailure
      ? "Canvas academic data could not be saved."
      : "Canvas academic data could not be synchronized.",
    summary,
  };
}

async function syncOneCourse({
  canvas,
  client,
  connection,
  course,
  limiters,
  runId,
  userId,
}: {
  readonly canvas: ReturnType<typeof createCanvasClient>;
  readonly client: SupabaseClient<Database>;
  readonly connection: CanvasConnectionRow;
  readonly course: CanvasCourse;
  readonly limiters: CanvasSyncLimiters;
  readonly runId: string;
  readonly userId: string;
}): Promise<CourseSyncResult> {
  let snapshot: CourseSnapshot;
  try {
    snapshot = await fetchCourseSnapshot(canvas, course, limiters);
  } catch (error) {
    return {
      ok: false,
      code: syncFailureCodeForCanvasError(error),
    };
  }

  let payload: CanvasCourseSnapshotPayload;
  try {
    payload = createCanvasCourseSnapshotPayload(snapshot);
  } catch {
    return {
      ok: false,
      code: "canvas_sync_normalization_failed",
    };
  }

  const persistence = await persistCourseSnapshot({
    client,
    connectionId: connection.id,
    payload,
    runId,
    syncedAt: new Date().toISOString(),
    userId,
  });
  if (!persistence.ok) {
    return {
      ok: false,
      code: "canvas_course_persist_failed",
    };
  }

  return {
    ok: true,
    counts: resourceCountsForSnapshot(payload),
    persistence: persistence.row,
  };
}

async function fetchCourseSnapshot(
  canvas: ReturnType<typeof createCanvasClient>,
  course: CanvasCourse,
  limiters: CanvasSyncLimiters,
): Promise<CourseSnapshot> {
  const [modules, pages, assignmentGroups, assignments] = await Promise.all([
    canvas.listModules(course.id),
    canvas.listPages(course.id),
    canvas.listAssignmentGroups(course.id),
    canvas.listAssignments(course.id),
  ]);

  const moduleItemsByModule = await mapWithConcurrency(
    modules,
    MODULE_ITEM_CONCURRENCY_LIMIT,
    async (module) => ({
      module,
      items: await limiters.moduleItems.run(() =>
        canvas.listModuleItems(course.id, module.id),
      ),
    }),
  );

  const pageDetails = await mapWithConcurrency(
    pages,
    PAGE_DETAIL_CONCURRENCY_LIMIT,
    (page) => limiters.pageDetails.run(() => canvas.getPage(course.id, page.url)),
  );

  return {
    assignmentGroups,
    assignments,
    course,
    moduleItemsByModule,
    modules,
    pages: pageDetails,
  };
}

async function persistCourseSnapshot({
  client,
  connectionId,
  payload,
  runId,
  syncedAt,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly payload: CanvasCourseSnapshotPayload;
  readonly runId: string;
  readonly syncedAt: string;
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly row: CanvasCourseAcademicSnapshotResult }
  | { readonly ok: false }
> {
  const { data, error } = await client
    .rpc("replace_canvas_course_academic_snapshot", {
      p_assignments: payload.assignments,
      p_assignment_groups: payload.assignmentGroups,
      p_canvas_connection_id: connectionId,
      p_course: payload.course,
      p_module_items: payload.moduleItems,
      p_modules: payload.modules,
      p_pages: payload.pages,
      p_sync_run_id: runId,
      p_synced_at: syncedAt,
      p_user_id: userId,
    })
    .single();

  if (error || !data) {
    return { ok: false };
  }
  return { ok: true, row: data };
}

async function beginSyncRun({
  client,
  connectionId,
  startedAt,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly startedAt: string;
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly row: CanvasSyncRunRow }
  | {
      readonly ok: false;
      readonly error: {
        readonly status: 409 | 500;
        readonly code: CanvasApiErrorCode;
        readonly message: string;
      };
    }
> {
  const { data, error } = await client
    .rpc("begin_canvas_sync_run", {
      p_canvas_connection_id: connectionId,
      p_started_at: startedAt,
      p_user_id: userId,
    })
    .single();

  if (error || !data) {
    if (isRpcMessage(error, "canvas_sync_in_progress")) {
      return {
        ok: false,
        error: {
          status: 409,
          code: "canvas_sync_in_progress",
          message: "A Canvas synchronization is already running.",
        },
      };
    }
    return {
      ok: false,
      error: {
        status: 500,
        code: "canvas_storage_failed",
        message: "Canvas synchronization could not be started.",
      },
    };
  }

  return { ok: true, row: data };
}

async function updateSyncRunProgress({
  client,
  connectionId,
  resourceCounts,
  runId,
  totals,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly resourceCounts: CanvasSyncResourceCounts;
  readonly runId: string;
  readonly totals: {
    readonly discovered: number;
    readonly failed: number;
    readonly succeeded: number;
  };
  readonly userId: string;
}): Promise<void> {
  await client.rpc("update_canvas_sync_run_progress", {
    p_canvas_connection_id: connectionId,
    p_discovered_course_count: totals.discovered,
    p_failed_course_count: totals.failed,
    p_heartbeat_at: new Date().toISOString(),
    p_resource_counts: resourceCounts,
    p_successful_course_count: totals.succeeded,
    p_sync_run_id: runId,
    p_user_id: userId,
  });
}

async function finishSyncRun({
  client,
  connectionId,
  failureCode,
  failureSummary,
  resourceCounts,
  runId,
  status,
  totals,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly failureCode: CanvasSyncFailureCode | null;
  readonly failureSummary: string | null;
  readonly resourceCounts: CanvasSyncResourceCounts;
  readonly runId: string;
  readonly status: CanvasAcademicSyncStatus;
  readonly totals: {
    readonly discovered: number;
    readonly failed: number;
    readonly succeeded: number;
  };
  readonly userId: string;
}): Promise<void> {
  await client.rpc("finish_canvas_sync_run", {
    p_canvas_connection_id: connectionId,
    p_completed_at: new Date().toISOString(),
    p_discovered_course_count: totals.discovered,
    p_failed_course_count: totals.failed,
    p_failure_code: failureCode,
    p_failure_summary: failureSummary,
    p_resource_counts: resourceCounts,
    p_status: status,
    p_successful_course_count: totals.succeeded,
    p_sync_run_id: runId,
    p_user_id: userId,
  });
}

function createConcurrencyLimiter(limit: number): ConcurrencyLimiter {
  const queue: Array<() => void> = [];
  let active = 0;

  function releaseSlot(): void {
    active -= 1;
    const next = queue.shift();
    if (next) {
      next();
    }
  }

  return {
    async run<TOutput>(action: () => Promise<TOutput>): Promise<TOutput> {
      if (active >= limit) {
        await new Promise<void>((resolve) => {
          queue.push(resolve);
        });
      }
      active += 1;
      try {
        return await action();
      } finally {
        releaseSlot();
      }
    },
  };
}

async function mapWithConcurrency<TInput, TOutput>(
  items: readonly TInput[],
  limit: number,
  mapper: (item: TInput, index: number) => Promise<TOutput>,
): Promise<TOutput[]> {
  if (items.length === 0) {
    return [];
  }

  const safeLimit = Math.max(1, Math.min(limit, items.length));
  const results: TOutput[] = new Array<TOutput>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      const item = items[index];
      if (item !== undefined) {
        results[index] = await mapper(item, index);
      }
    }
  }

  await Promise.all(
    Array.from({ length: safeLimit }, async () => {
      await worker();
    }),
  );

  return results;
}

function statusForTotals(totals: {
  readonly discovered: number;
  readonly failed: number;
  readonly succeeded: number;
}): CanvasAcademicSyncStatus {
  if (totals.failed === 0) {
    return "succeeded";
  }
  if (totals.succeeded > 0) {
    return "partial";
  }
  return "failed";
}

function createSummary({
  failures,
  resourceCounts,
  status,
  totals,
}: {
  readonly failures: readonly CanvasAcademicSyncFailureSummary[];
  readonly resourceCounts: CanvasSyncResourceCounts;
  readonly status: CanvasAcademicSyncStatus;
  readonly totals: {
    readonly discovered: number;
    readonly failed: number;
    readonly succeeded: number;
  };
}): CanvasAcademicSyncSummary {
  return {
    status,
    courses: {
      discovered: totals.discovered,
      succeeded: totals.succeeded,
      failed: totals.failed,
    },
    resources: resourceCounts,
    ...(failures.length > 0 ? { failures } : {}),
  };
}

function summarizeFailures(
  failures: ReadonlyMap<CanvasSyncFailureCode, number>,
): readonly CanvasAcademicSyncFailureSummary[] {
  return Array.from(failures.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([code, count]) => ({ code, count }));
}

function syncFailureCodeForCanvasError(error: unknown): CanvasSyncFailureCode {
  if (error instanceof CanvasClientError) {
    return error.code === "canvas_timeout" ||
      error.code === "canvas_rate_limited" ||
      error.code === "canvas_unavailable"
      ? "canvas_unavailable"
      : "canvas_course_fetch_failed";
  }
  return "canvas_course_fetch_failed";
}

function isRpcMessage(error: unknown, message: string): boolean {
  return (
    isRecord(error) &&
    typeof error.message === "string" &&
    error.message.includes(message)
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
