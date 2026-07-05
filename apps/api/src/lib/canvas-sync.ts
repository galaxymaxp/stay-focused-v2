import type {
  CanvasAssignment,
  CanvasAssignmentGroup,
  CanvasClient,
  CanvasCourse,
  CanvasModule,
  CanvasModuleItem,
  CanvasPageDetail,
} from "@stay-focused/canvas";
import { CanvasClientError } from "@stay-focused/canvas";
import { createHmac } from "node:crypto";
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
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_BASE_DELAY_MS = 250;
const DEFAULT_RETRY_DELAY_CAP_MS = 2_000;

export type CanvasAcademicSyncStatus = "succeeded" | "partial" | "failed";

type CanvasCourseResultStatus = "succeeded" | "failed";
type CanvasCourseFailedOperation =
  | "modules"
  | "module_items"
  | "pages"
  | "page_detail"
  | "assignment_groups"
  | "assignments"
  | "response_parsing"
  | "persistence"
  | "unknown";
type CanvasCourseFailureCategory =
  | "authentication_failure"
  | "permission_denied"
  | "resource_not_found"
  | "rate_limited"
  | "server_error"
  | "network_error"
  | "timeout"
  | "malformed_response"
  | "pagination_rejected"
  | "redirect_rejected"
  | "persistence_failure"
  | "normalization_failure"
  | "unknown";
type CanvasHttpStatusClass = "none" | "1xx" | "2xx" | "3xx" | "4xx" | "5xx";

interface CanvasSyncRetryPolicy {
  readonly maxRetries: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly sleep: (durationMs: number) => Promise<void>;
}

interface CanvasSyncRetryPolicyInput {
  readonly maxRetries?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly sleep?: (durationMs: number) => Promise<void>;
}

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

interface CourseSnapshotResult {
  readonly snapshot: CourseSnapshot;
  readonly retryCount: number;
  readonly recoveredByRetry: boolean;
}

interface CanvasOperationResult<TValue> {
  readonly value: TValue;
  readonly retryCount: number;
  readonly recoveredByRetry: boolean;
}

interface CourseResultDiagnostics {
  readonly courseFingerprint: string;
  readonly status: CanvasCourseResultStatus;
  readonly failureCode: CanvasSyncFailureCode | null;
  readonly failedOperation: CanvasCourseFailedOperation | null;
  readonly failureCategory: CanvasCourseFailureCategory | null;
  readonly httpStatusClass: CanvasHttpStatusClass | null;
  readonly retryable: boolean | null;
  readonly retryCount: number;
  readonly durationMs: number;
}

interface CourseSyncSuccess {
  readonly ok: true;
  readonly counts: CanvasSyncResourceCounts;
  readonly diagnostics: CourseResultDiagnostics;
  readonly persistence: CanvasCourseAcademicSnapshotResult;
}

interface CourseSyncFailure {
  readonly ok: false;
  readonly code: CanvasSyncFailureCode;
  readonly diagnostics: CourseResultDiagnostics;
}

type CourseSyncResult = CourseSyncSuccess | CourseSyncFailure;

interface CanvasSyncLimiters {
  readonly moduleItems: ConcurrencyLimiter;
  readonly pageDetails: ConcurrencyLimiter;
}

interface ConcurrencyLimiter {
  run<TOutput>(action: () => Promise<TOutput>): Promise<TOutput>;
}

class CanvasCourseOperationError extends Error {
  public readonly failureCode: CanvasSyncFailureCode;
  public readonly failedOperation: CanvasCourseFailedOperation;
  public readonly failureCategory: CanvasCourseFailureCategory;
  public readonly httpStatusClass: CanvasHttpStatusClass;
  public readonly retryable: boolean;
  public readonly retryCount: number;

  public constructor({
    failureCategory,
    failureCode,
    failedOperation,
    httpStatusClass,
    retryable,
    retryCount,
  }: {
    readonly failureCode: CanvasSyncFailureCode;
    readonly failedOperation: CanvasCourseFailedOperation;
    readonly failureCategory: CanvasCourseFailureCategory;
    readonly httpStatusClass: CanvasHttpStatusClass;
    readonly retryable: boolean;
    readonly retryCount: number;
  }) {
    super("Canvas course operation failed.");
    this.name = "CanvasCourseOperationError";
    this.failureCode = failureCode;
    this.failedOperation = failedOperation;
    this.failureCategory = failureCategory;
    this.httpStatusClass = httpStatusClass;
    this.retryable = retryable;
    this.retryCount = retryCount;
  }
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
  retryPolicy: retryPolicyInput,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly retryPolicy?: CanvasSyncRetryPolicyInput;
  readonly userId: string;
}): Promise<CanvasAcademicSyncResult> {
  const retryPolicy = normalizeRetryPolicy(retryPolicyInput);
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
        retryPolicy,
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
    (result) =>
      !result.ok &&
      (result.code === "canvas_course_persist_failed" ||
        result.code === "canvas_course_persistence_failed"),
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
  retryPolicy,
  runId,
  userId,
}: {
  readonly canvas: CanvasClient;
  readonly client: SupabaseClient<Database>;
  readonly connection: CanvasConnectionRow;
  readonly course: CanvasCourse;
  readonly limiters: CanvasSyncLimiters;
  readonly retryPolicy: CanvasSyncRetryPolicy;
  readonly runId: string;
  readonly userId: string;
}): Promise<CourseSyncResult> {
  const startedAt = Date.now();
  const courseFingerprint = createCourseFingerprint({
    canvasCourseId: course.id,
    connectionId: connection.id,
    userId,
  });

  let snapshotResult: CourseSnapshotResult;
  try {
    snapshotResult = await fetchCourseSnapshot(
      canvas,
      course,
      limiters,
      retryPolicy,
    );
  } catch (error) {
    const diagnostics = createCourseFailureDiagnostics({
      courseFingerprint,
      durationMs: elapsedMs(startedAt),
      error,
      fallbackCode: "canvas_course_fetch_failed",
      fallbackOperation: "unknown",
    });
    await recordCourseResult({
      client,
      connectionId: connection.id,
      diagnostics,
      runId,
      userId,
    });
    return {
      ok: false,
      code: diagnostics.failureCode ?? "canvas_course_fetch_failed",
      diagnostics,
    };
  }

  let payload: CanvasCourseSnapshotPayload;
  try {
    payload = createCanvasCourseSnapshotPayload(snapshotResult.snapshot);
  } catch {
    const diagnostics: CourseResultDiagnostics = {
      courseFingerprint,
      durationMs: elapsedMs(startedAt),
      failedOperation: "response_parsing",
      failureCategory: "normalization_failure",
      failureCode: "canvas_course_response_invalid",
      httpStatusClass: "none",
      retryable: false,
      retryCount: snapshotResult.retryCount,
      status: "failed",
    };
    await recordCourseResult({
      client,
      connectionId: connection.id,
      diagnostics,
      runId,
      userId,
    });
    return {
      ok: false,
      code: "canvas_course_response_invalid",
      diagnostics,
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
    const diagnostics: CourseResultDiagnostics = {
      courseFingerprint,
      durationMs: elapsedMs(startedAt),
      failedOperation: "persistence",
      failureCategory: "persistence_failure",
      failureCode: "canvas_course_persistence_failed",
      httpStatusClass: "none",
      retryable: false,
      retryCount: snapshotResult.retryCount,
      status: "failed",
    };
    await recordCourseResult({
      client,
      connectionId: connection.id,
      diagnostics,
      runId,
      userId,
    });
    return {
      ok: false,
      code: "canvas_course_persistence_failed",
      diagnostics,
    };
  }

  const diagnostics: CourseResultDiagnostics = {
    courseFingerprint,
    durationMs: elapsedMs(startedAt),
    failedOperation: null,
    failureCategory: null,
    failureCode: null,
    httpStatusClass: null,
    retryable: null,
    retryCount: snapshotResult.retryCount,
    status: "succeeded",
  };
  await recordCourseResult({
    client,
    connectionId: connection.id,
    diagnostics,
    runId,
    userId,
  });

  return {
    ok: true,
    counts: resourceCountsForSnapshot(payload),
    diagnostics,
    persistence: persistence.row,
  };
}

async function fetchCourseSnapshot(
  canvas: CanvasClient,
  course: CanvasCourse,
  limiters: CanvasSyncLimiters,
  retryPolicy: CanvasSyncRetryPolicy,
): Promise<CourseSnapshotResult> {
  const [modules, pages, assignmentGroups, assignments] = await Promise.all([
    runCanvasOperation({
      action: () => canvas.listModules(course.id),
      failureCode: "canvas_course_modules_failed",
      operation: "modules",
      retryPolicy,
    }),
    runCanvasOperation({
      action: () => canvas.listPages(course.id),
      failureCode: "canvas_course_pages_failed",
      operation: "pages",
      retryPolicy,
    }),
    runCanvasOperation({
      action: () => canvas.listAssignmentGroups(course.id),
      failureCode: "canvas_course_assignment_groups_failed",
      operation: "assignment_groups",
      retryPolicy,
    }),
    runCanvasOperation({
      action: () => canvas.listAssignments(course.id),
      failureCode: "canvas_course_assignments_failed",
      operation: "assignments",
      retryPolicy,
    }),
  ]);

  const moduleItemResults = await mapWithConcurrency(
    modules.value,
    MODULE_ITEM_CONCURRENCY_LIMIT,
    async (module) => {
      const items = await limiters.moduleItems.run(() =>
        runCanvasOperation({
          action: () => canvas.listModuleItems(course.id, module.id),
          failureCode: "canvas_course_module_items_failed",
          operation: "module_items",
          retryPolicy,
        }),
      );
      return {
        value: {
          items: items.value,
          module,
        },
        recoveredByRetry: items.recoveredByRetry,
        retryCount: items.retryCount,
      };
    },
  );

  const pageDetails = await mapWithConcurrency(
    pages.value,
    PAGE_DETAIL_CONCURRENCY_LIMIT,
    (page) =>
      limiters.pageDetails.run(() =>
        runCanvasOperation({
          action: () => canvas.getPage(course.id, page.url),
          failureCode: "canvas_course_page_detail_failed",
          operation: "page_detail",
          retryPolicy,
        }),
      ),
  );

  const operationResults: readonly CanvasOperationResult<unknown>[] = [
    modules,
    pages,
    assignmentGroups,
    assignments,
    ...moduleItemResults,
    ...pageDetails,
  ];

  return {
    recoveredByRetry: operationResults.some((result) => result.recoveredByRetry),
    retryCount: operationResults.reduce(
      (sum, result) => sum + result.retryCount,
      0,
    ),
    snapshot: {
      assignmentGroups: assignmentGroups.value,
      assignments: assignments.value,
      course,
      moduleItemsByModule: moduleItemResults.map((result) => result.value),
      modules: modules.value,
      pages: pageDetails.map((result) => result.value),
    },
  };
}

async function runCanvasOperation<TValue>({
  action,
  failureCode,
  operation,
  retryPolicy,
}: {
  readonly action: () => Promise<TValue>;
  readonly failureCode: CanvasSyncFailureCode;
  readonly operation: CanvasCourseFailedOperation;
  readonly retryPolicy: CanvasSyncRetryPolicy;
}): Promise<CanvasOperationResult<TValue>> {
  let retryCount = 0;

  while (true) {
    try {
      return {
        recoveredByRetry: retryCount > 0,
        retryCount,
        value: await action(),
      };
    } catch (error) {
      const classified = classifyCanvasOperationFailure({
        error,
        failureCode,
        operation,
        retryCount,
      });
      if (!classified.retryable || retryCount >= retryPolicy.maxRetries) {
        throw new CanvasCourseOperationError(classified);
      }

      const delayMs = retryDelayMs(error, retryCount, retryPolicy);
      retryCount += 1;
      await retryPolicy.sleep(delayMs);
    }
  }
}

function classifyCanvasOperationFailure({
  error,
  failureCode,
  operation,
  retryCount,
}: {
  readonly error: unknown;
  readonly failureCode: CanvasSyncFailureCode;
  readonly operation: CanvasCourseFailedOperation;
  readonly retryCount: number;
}): {
  readonly failureCode: CanvasSyncFailureCode;
  readonly failedOperation: CanvasCourseFailedOperation;
  readonly failureCategory: CanvasCourseFailureCategory;
  readonly httpStatusClass: CanvasHttpStatusClass;
  readonly retryable: boolean;
  readonly retryCount: number;
} {
  if (!(error instanceof CanvasClientError)) {
    return {
      failedOperation: operation,
      failureCategory: "unknown",
      failureCode,
      httpStatusClass: "none",
      retryable: false,
      retryCount,
    };
  }

  const httpStatusClass = httpStatusClassForStatus(error.status);
  switch (error.code) {
    case "missing_access_token":
    case "canvas_unauthorized":
      return classifiedCourseFailure({
        failureCategory: "authentication_failure",
        failureCode,
        httpStatusClass,
        operation,
        retryCount,
        retryable: false,
      });
    case "canvas_forbidden":
      return classifiedCourseFailure({
        failureCategory: "permission_denied",
        failureCode,
        httpStatusClass,
        operation,
        retryCount,
        retryable: false,
      });
    case "canvas_not_found":
      return classifiedCourseFailure({
        failureCategory: "resource_not_found",
        failureCode,
        httpStatusClass,
        operation,
        retryCount,
        retryable: false,
      });
    case "canvas_rate_limited":
      return classifiedCourseFailure({
        failureCategory: "rate_limited",
        failureCode,
        httpStatusClass,
        operation,
        retryCount,
        retryable: true,
      });
    case "canvas_unavailable":
      return classifiedCourseFailure({
        failureCategory: "server_error",
        failureCode,
        httpStatusClass,
        operation,
        retryCount,
        retryable: true,
      });
    case "canvas_timeout":
      return classifiedCourseFailure({
        failureCategory: "timeout",
        failureCode,
        httpStatusClass,
        operation,
        retryCount,
        retryable: true,
      });
    case "canvas_network_error":
      return classifiedCourseFailure({
        failureCategory: "network_error",
        failureCode,
        httpStatusClass,
        operation,
        retryCount,
        retryable: true,
      });
    case "canvas_malformed_json":
    case "canvas_invalid_response":
      return classifiedCourseFailure({
        failureCategory: "malformed_response",
        failureCode: "canvas_course_response_invalid",
        httpStatusClass,
        operation,
        retryCount,
        retryable: false,
      });
    case "canvas_pagination_rejected":
      return classifiedCourseFailure({
        failureCategory: "pagination_rejected",
        failureCode: "canvas_course_response_invalid",
        httpStatusClass,
        operation,
        retryCount,
        retryable: false,
      });
    case "canvas_redirect_rejected":
      return classifiedCourseFailure({
        failureCategory: "redirect_rejected",
        failureCode: "canvas_course_response_invalid",
        httpStatusClass,
        operation,
        retryCount,
        retryable: false,
      });
    case "invalid_base_url":
    case "canvas_request_failed":
      return classifiedCourseFailure({
        failureCategory: "unknown",
        failureCode,
        httpStatusClass,
        operation,
        retryCount,
        retryable: false,
      });
  }
}

function classifiedCourseFailure({
  failureCategory,
  failureCode,
  httpStatusClass,
  operation,
  retryCount,
  retryable,
}: {
  readonly failureCode: CanvasSyncFailureCode;
  readonly failureCategory: CanvasCourseFailureCategory;
  readonly httpStatusClass: CanvasHttpStatusClass;
  readonly operation: CanvasCourseFailedOperation;
  readonly retryable: boolean;
  readonly retryCount: number;
}): {
  readonly failureCode: CanvasSyncFailureCode;
  readonly failedOperation: CanvasCourseFailedOperation;
  readonly failureCategory: CanvasCourseFailureCategory;
  readonly httpStatusClass: CanvasHttpStatusClass;
  readonly retryable: boolean;
  readonly retryCount: number;
} {
  return {
    failedOperation: operation,
    failureCategory,
    failureCode,
    httpStatusClass,
    retryable,
    retryCount,
  };
}

function retryDelayMs(
  error: unknown,
  retryCount: number,
  retryPolicy: CanvasSyncRetryPolicy,
): number {
  if (
    error instanceof CanvasClientError &&
    error.retryAfterMs !== null &&
    Number.isFinite(error.retryAfterMs) &&
    error.retryAfterMs >= 0
  ) {
    return Math.min(error.retryAfterMs, retryPolicy.maxDelayMs);
  }

  const exponentialDelay =
    retryPolicy.baseDelayMs * 2 ** Math.max(0, retryCount);
  return Math.min(exponentialDelay, retryPolicy.maxDelayMs);
}

function createCourseFailureDiagnostics({
  courseFingerprint,
  durationMs,
  error,
  fallbackCode,
  fallbackOperation,
}: {
  readonly courseFingerprint: string;
  readonly durationMs: number;
  readonly error: unknown;
  readonly fallbackCode: CanvasSyncFailureCode;
  readonly fallbackOperation: CanvasCourseFailedOperation;
}): CourseResultDiagnostics {
  if (error instanceof CanvasCourseOperationError) {
    return {
      courseFingerprint,
      durationMs,
      failedOperation: error.failedOperation,
      failureCategory: error.failureCategory,
      failureCode: error.failureCode,
      httpStatusClass: error.httpStatusClass,
      retryable: error.retryable,
      retryCount: error.retryCount,
      status: "failed",
    };
  }

  return {
    courseFingerprint,
    durationMs,
    failedOperation: fallbackOperation,
    failureCategory: "unknown",
    failureCode: fallbackCode,
    httpStatusClass: "none",
    retryable: false,
    retryCount: 0,
    status: "failed",
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

async function recordCourseResult({
  client,
  connectionId,
  diagnostics,
  runId,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly diagnostics: CourseResultDiagnostics;
  readonly runId: string;
  readonly userId: string;
}): Promise<void> {
  try {
    await client
      .rpc("record_canvas_sync_course_result", {
        p_canvas_connection_id: connectionId,
        p_course_fingerprint: diagnostics.courseFingerprint,
        p_duration_ms: diagnostics.durationMs,
        p_failed_operation: diagnostics.failedOperation,
        p_failure_category: diagnostics.failureCategory,
        p_failure_code: diagnostics.failureCode,
        p_http_status_class: diagnostics.httpStatusClass,
        p_retry_count: diagnostics.retryCount,
        p_retryable: diagnostics.retryable,
        p_status: diagnostics.status,
        p_sync_run_id: runId,
        p_user_id: userId,
      })
      .single();
  } catch {
    return;
  }
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

function normalizeRetryPolicy(
  input: CanvasSyncRetryPolicyInput | undefined,
): CanvasSyncRetryPolicy {
  return {
    baseDelayMs: boundedInteger(
      input?.baseDelayMs,
      DEFAULT_RETRY_BASE_DELAY_MS,
      0,
      10_000,
    ),
    maxDelayMs: boundedInteger(
      input?.maxDelayMs,
      DEFAULT_RETRY_DELAY_CAP_MS,
      0,
      30_000,
    ),
    maxRetries: boundedInteger(input?.maxRetries, DEFAULT_MAX_RETRIES, 0, 4),
    sleep: input?.sleep ?? sleepForDuration,
  };
}

function boundedInteger(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    return fallback;
  }
  return value;
}

async function sleepForDuration(durationMs: number): Promise<void> {
  if (durationMs <= 0) {
    return;
  }
  await new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

function createCourseFingerprint({
  canvasCourseId,
  connectionId,
  userId,
}: {
  readonly canvasCourseId: string;
  readonly connectionId: string;
  readonly userId: string;
}): string {
  return createHmac("sha256", `${userId}:${connectionId}`)
    .update(canvasCourseId)
    .digest("hex");
}

function elapsedMs(startedAtMs: number): number {
  return Math.max(0, Date.now() - startedAtMs);
}

function httpStatusClassForStatus(
  status: number | null,
): CanvasHttpStatusClass {
  if (status === null) {
    return "none";
  }
  if (status >= 100 && status < 200) {
    return "1xx";
  }
  if (status >= 200 && status < 300) {
    return "2xx";
  }
  if (status >= 300 && status < 400) {
    return "3xx";
  }
  if (status >= 400 && status < 500) {
    return "4xx";
  }
  return "5xx";
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
      error.code === "canvas_network_error" ||
      error.code === "canvas_rate_limited" ||
      error.code === "canvas_unavailable"
      ? "canvas_unavailable"
      : error.code === "canvas_invalid_response" ||
          error.code === "canvas_malformed_json" ||
          error.code === "canvas_pagination_rejected" ||
          error.code === "canvas_redirect_rejected"
        ? "canvas_course_response_invalid"
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
