import type {
  CanvasAnnouncement,
  CanvasAssignment,
  CanvasAssignmentGroup,
  CanvasClient,
  CanvasCourse,
  CanvasFile,
  CanvasModule,
  CanvasModuleItem,
  CanvasPageDetail,
  CanvasPlannerItem,
} from "@stay-focused/canvas";
import { CanvasClientError } from "@stay-focused/canvas";
import { createHmac } from "node:crypto";
import type {
  CanvasAnnouncementsSnapshotResult,
  CanvasCourseAcademicSnapshotWithSyncStateResult,
  CanvasConnectionRow,
  CanvasCourseSyncStateRow,
  CanvasFilesInventorySnapshotResult,
  CanvasPlannerItemsSnapshotResult,
  CanvasSyncRunRow,
  Database,
  Json,
} from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";

import { fingerprintCanvasCourseSnapshot } from "@/lib/canvas-sync-fingerprint";
import {
  createCanvasFileInventoryPayload,
  type CanvasFileInventoryPayload,
  type CanvasSyncFilePayload,
  type CanvasSyncFileReferencePayload,
} from "@/lib/canvas-file-normalize";
import {
  CONNECTION_SECRET_COLUMNS,
  createCanvasClient,
  decryptConnectionToken,
  mapCanvasClientError,
  readConnection,
} from "@/lib/canvas-routes";
import {
  addResourceCounts,
  createCanvasAnnouncementsSnapshotPayload,
  createCanvasCourseSnapshotPayload,
  createCanvasPlannerItemsSnapshotPayload,
  emptyResourceCounts,
  resourceCountsForSnapshot,
  type CanvasSyncAnnouncementPayload,
  type CanvasCourseSnapshotPayload,
  type CanvasSyncFailureCode,
  type CanvasSyncPlannerItemPayload,
  type CanvasSyncResourceCounts,
} from "@/lib/canvas-sync-normalize";
import type { CanvasApiErrorCode } from "@/types/canvas";

const COURSE_CONCURRENCY_LIMIT = 2;
const MODULE_ITEM_CONCURRENCY_LIMIT = 3;
const PAGE_DETAIL_CONCURRENCY_LIMIT = 3;
const ANNOUNCEMENT_COURSE_CONCURRENCY_LIMIT = 2;
const CANVAS_SECONDARY_SYNC_PAST_DAYS = 30;
const CANVAS_SECONDARY_SYNC_FUTURE_DAYS = 120;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_BASE_DELAY_MS = 250;
const DEFAULT_RETRY_DELAY_CAP_MS = 2_000;

export type CanvasAcademicSyncStatus = "succeeded" | "partial" | "failed";
export type CanvasAcademicSyncMode = "full" | "incremental";

type CanvasCourseResultStatus = "succeeded" | "unchanged" | "failed";
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
  readonly mode: CanvasAcademicSyncMode;
  readonly syncWindow: CanvasSecondarySyncWindow;
  readonly courses: {
    readonly discovered: number;
    readonly succeeded: number;
    readonly changed: number;
    readonly unchanged: number;
    readonly failed: number;
  };
  readonly plannerItems: CanvasPlannerSyncSummary;
  readonly announcements: CanvasAnnouncementsSyncSummary;
  readonly files: CanvasFilesSyncSummary;
  readonly resources: CanvasSyncResourceCounts;
  readonly retryAttempts: number;
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

interface CanvasSecondarySyncWindow {
  readonly startDate: string;
  readonly endDate: string;
}

interface CanvasPlannerSyncSummary {
  readonly discovered: number;
  readonly inserted: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly pruned: number;
  readonly failed: number;
}

interface CanvasAnnouncementsSyncSummary {
  readonly discovered: number;
  readonly inserted: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly pruned: number;
  readonly coursesSucceeded: number;
  readonly coursesFailed: number;
}

interface CanvasFilesSyncSummary {
  readonly coursesSucceeded: number;
  readonly coursesFailed: number;
  readonly discovered: number;
  readonly inserted: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly deactivated: number;
  readonly references: number;
  readonly referencesInserted: number;
  readonly referencesDeleted: number;
  readonly moduleFileReferences: number;
  readonly htmlFileReferences: number;
  readonly metadataOnly: number;
  readonly blocked: number;
}

interface CanvasPlannerSyncResult extends CanvasPlannerSyncSummary {
  readonly retryCount: number;
  readonly failureCode: CanvasSyncFailureCode | null;
}

interface CanvasAnnouncementsSyncResult extends CanvasAnnouncementsSyncSummary {
  readonly retryCount: number;
  readonly failureCodes: readonly CanvasSyncFailureCode[];
  readonly announcementsByCourse: readonly CanvasAnnouncementsForCourse[];
}

interface CanvasFilesSyncResult extends CanvasFilesSyncSummary {
  readonly retryCount: number;
  readonly failureCodes: readonly CanvasSyncFailureCode[];
}

interface CanvasAnnouncementsForCourse {
  readonly canvasCourseId: string;
  readonly announcements: readonly CanvasAnnouncement[];
}

interface CanvasAnnouncementCourseSyncResult {
  readonly retryCount: number;
  readonly failureCode: CanvasSyncFailureCode | null;
  readonly counts: CanvasAnnouncementsSyncSummary;
  readonly announcementsForCourse: CanvasAnnouncementsForCourse;
}

interface CanvasSecondaryOperationErrorDetails {
  readonly failureCode: CanvasSyncFailureCode;
  readonly failureCategory: CanvasCourseFailureCategory;
  readonly httpStatusClass: CanvasHttpStatusClass;
  readonly retryable: boolean;
  readonly retryCount: number;
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
  readonly changed: boolean;
  readonly counts: CanvasSyncResourceCounts;
  readonly diagnostics: CourseResultDiagnostics;
  readonly persistence:
    | CanvasCourseAcademicSnapshotWithSyncStateResult
    | null;
  readonly snapshot: CourseSnapshot;
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

class CanvasSecondaryOperationError extends Error {
  public readonly failureCode: CanvasSyncFailureCode;
  public readonly failureCategory: CanvasCourseFailureCategory;
  public readonly httpStatusClass: CanvasHttpStatusClass;
  public readonly retryable: boolean;
  public readonly retryCount: number;

  public constructor({
    failureCategory,
    failureCode,
    httpStatusClass,
    retryable,
    retryCount,
  }: CanvasSecondaryOperationErrorDetails) {
    super("Canvas secondary operation failed.");
    this.name = "CanvasSecondaryOperationError";
    this.failureCode = failureCode;
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
  readonly announcementCourses: number;
} {
  return {
    courses: COURSE_CONCURRENCY_LIMIT,
    moduleItems: MODULE_ITEM_CONCURRENCY_LIMIT,
    pageDetails: PAGE_DETAIL_CONCURRENCY_LIMIT,
    announcementCourses: ANNOUNCEMENT_COURSE_CONCURRENCY_LIMIT,
  };
}

export function getCanvasSecondarySyncWindowDays(): {
  readonly pastDays: number;
  readonly futureDays: number;
} {
  return {
    pastDays: CANVAS_SECONDARY_SYNC_PAST_DAYS,
    futureDays: CANVAS_SECONDARY_SYNC_FUTURE_DAYS,
  };
}

export async function syncCanvasAcademicGraph({
  client,
  mode = "full",
  retryPolicy: retryPolicyInput,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly mode?: CanvasAcademicSyncMode;
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

  const startedAtDate = new Date();
  const startedAt = startedAtDate.toISOString();
  const syncWindow = createSecondarySyncWindow(startedAtDate);
  const run = await beginSyncRun({
    client,
    connectionId: connectionRow.id,
    mode,
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
        changed: 0,
        discovered: 0,
        failed: 0,
        succeeded: 0,
        unchanged: 0,
      },
      userId,
    });
    return {
      ok: false,
      status: 500,
      code: "canvas_connection_corrupt",
      message: "Canvas connection credentials could not be used.",
      summary: createSummary({
        announcements: emptyAnnouncementsSyncSummary(),
        failures: [{ code: "canvas_connection_corrupt", count: 1 }],
        files: emptyFilesSyncSummary(),
        resourceCounts: emptyResourceCounts(),
        mode,
        plannerItems: emptyPlannerSyncSummary(),
        retryAttempts: 0,
        status: "failed",
        syncWindow,
        totals: {
          changed: 0,
          discovered: 0,
          failed: 0,
          succeeded: 0,
          unchanged: 0,
        },
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
    const totals = {
      changed: 0,
      discovered: 0,
      failed: 0,
      succeeded: 0,
      unchanged: 0,
    };
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
        announcements: emptyAnnouncementsSyncSummary(),
        failures: [{ code: failureCode, count: 1 }],
        files: emptyFilesSyncSummary(),
        mode,
        plannerItems: emptyPlannerSyncSummary(),
        resourceCounts,
        retryAttempts: 0,
        status: "failed",
        syncWindow,
        totals,
      }),
    };
  }

  const totals = {
    changed: 0,
    discovered: courses.length,
    failed: 0,
    succeeded: 0,
    unchanged: 0,
  };
  let resourceCounts = emptyResourceCounts();
  const failures = new Map<CanvasSyncFailureCode, number>();
  let retryAttempts = 0;
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
        mode,
        retryPolicy,
        runId: run.row.id,
        userId,
      });

      if (result.ok) {
        if (result.changed) {
          totals.changed += 1;
        } else {
          totals.unchanged += 1;
        }
        totals.succeeded = totals.changed + totals.unchanged;
        resourceCounts = addResourceCounts(resourceCounts, result.counts);
      } else {
        totals.failed += 1;
        failures.set(result.code, (failures.get(result.code) ?? 0) + 1);
      }
      retryAttempts += result.diagnostics.retryCount;

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

  const successfulCourseResults = results.filter(
    (result): result is CourseSyncSuccess => result.ok,
  );
  const announcements = await syncAnnouncements({
    canvas,
    client,
    connection: connectionRow,
    courses,
    retryPolicy,
    runId: run.row.id,
    syncedAt: startedAt,
    syncWindow,
    userId,
  });
  retryAttempts += announcements.retryCount;
  for (const failureCode of announcements.failureCodes) {
    failures.set(failureCode, (failures.get(failureCode) ?? 0) + 1);
  }
  resourceCounts = addResourceCounts(resourceCounts, {
    ...emptyResourceCounts(),
    announcements: announcements.discovered,
  });

  const files = await syncCourseFiles({
    announcementsByCourse: new Map(
      announcements.announcementsByCourse.map((courseAnnouncements) => [
        courseAnnouncements.canvasCourseId,
        courseAnnouncements.announcements,
      ]),
    ),
    canvas,
    client,
    connection: connectionRow,
    courseResults: successfulCourseResults,
    retryPolicy,
    runId: run.row.id,
    syncedAt: startedAt,
    userId,
  });
  retryAttempts += files.retryCount;
  for (const failureCode of files.failureCodes) {
    failures.set(failureCode, (failures.get(failureCode) ?? 0) + 1);
  }
  resourceCounts = addResourceCounts(resourceCounts, {
    ...emptyResourceCounts(),
    fileReferences: files.references,
    files: files.discovered,
  });

  const courseContextCodes = createCourseContextCodes(courses);
  const plannerItems = await syncPlannerItems({
    canvas,
    client,
    connection: connectionRow,
    contextCodes: courseContextCodes,
    retryPolicy,
    runId: run.row.id,
    syncedAt: startedAt,
    syncWindow,
    userId,
  });
  retryAttempts += plannerItems.retryCount;
  if (plannerItems.failureCode) {
    failures.set(
      plannerItems.failureCode,
      (failures.get(plannerItems.failureCode) ?? 0) + 1,
    );
  }
  resourceCounts = addResourceCounts(resourceCounts, {
    ...emptyResourceCounts(),
    plannerItems: plannerItems.discovered,
  });

  await updateSyncRunProgress({
    client,
    connectionId: connectionRow.id,
    resourceCounts,
    runId: run.row.id,
    totals,
    userId,
  }).catch(() => undefined);

  const status = statusForScopes({
    announcements,
    files,
    plannerItems,
    totals,
  });
  const failureSummaries = summarizeFailures(failures);
  const summary = createSummary({
    announcements,
    failures: failureSummaries,
    files,
    mode,
    plannerItems,
    resourceCounts,
    retryAttempts,
    status,
    syncWindow,
    totals,
  });

  await finishSyncRun({
    client,
    connectionId: connectionRow.id,
    failureCode: failureSummaries[0]?.code ?? null,
    failureSummary:
      status === "failed" || status === "partial"
        ? "One or more Canvas synchronization scopes could not be synchronized."
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
  ) ||
    files.failureCodes.includes("canvas_file_persistence_failed") ||
    plannerItems.failureCode === "canvas_planner_persistence_failed" ||
    announcements.failureCodes.includes("canvas_announcement_persistence_failed");

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
  mode,
  retryPolicy,
  runId,
  userId,
}: {
  readonly canvas: CanvasClient;
  readonly client: SupabaseClient<Database>;
  readonly connection: CanvasConnectionRow;
  readonly course: CanvasCourse;
  readonly limiters: CanvasSyncLimiters;
  readonly mode: CanvasAcademicSyncMode;
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
    await recordCourseSnapshotFailed({
      canvasCourseId: course.id,
      checkedAt: new Date().toISOString(),
      client,
      connectionId: connection.id,
      failureCode: diagnostics.failureCode ?? "canvas_course_fetch_failed",
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
    await recordCourseSnapshotFailed({
      canvasCourseId: course.id,
      checkedAt: new Date().toISOString(),
      client,
      connectionId: connection.id,
      failureCode: "canvas_course_response_invalid",
      runId,
      userId,
    });
    return {
      ok: false,
      code: "canvas_course_response_invalid",
      diagnostics,
    };
  }

  const snapshotFingerprint = fingerprintCanvasCourseSnapshot(payload);
  if (mode === "incremental") {
    const state = await readCourseSyncState({
      canvasCourseId: payload.course.canvas_course_id,
      client,
      connectionId: connection.id,
      userId,
    });
    if (!state.ok) {
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
      await recordCourseSnapshotFailed({
        canvasCourseId: payload.course.canvas_course_id,
        checkedAt: new Date().toISOString(),
        client,
        connectionId: connection.id,
        failureCode: "canvas_course_persistence_failed",
        runId,
        userId,
      });
      return {
        ok: false,
        code: "canvas_course_persistence_failed",
        diagnostics,
      };
    }

    if (
      state.row?.snapshot_fingerprint === snapshotFingerprint.value &&
      state.row.fingerprint_version === snapshotFingerprint.version
    ) {
      const checkedAt = new Date().toISOString();
      const unchanged = await recordCourseSnapshotUnchanged({
        canvasCourseId: payload.course.canvas_course_id,
        checkedAt,
        client,
        connectionId: connection.id,
        fingerprint: snapshotFingerprint.value,
        fingerprintVersion: snapshotFingerprint.version,
        runId,
        userId,
      });

      if (!unchanged.ok) {
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
        await recordCourseSnapshotFailed({
          canvasCourseId: payload.course.canvas_course_id,
          checkedAt,
          client,
          connectionId: connection.id,
          failureCode: "canvas_course_persistence_failed",
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
        status: "unchanged",
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
        changed: false,
        counts: resourceCountsForSnapshot(payload),
        diagnostics,
        persistence: null,
        snapshot: snapshotResult.snapshot,
      };
    }
  }

  const persistence = await persistCourseSnapshotWithSyncState({
    client,
    connectionId: connection.id,
    fingerprint: snapshotFingerprint.value,
    fingerprintVersion: snapshotFingerprint.version,
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
    await recordCourseSnapshotFailed({
      canvasCourseId: payload.course.canvas_course_id,
      checkedAt: new Date().toISOString(),
      client,
      connectionId: connection.id,
      failureCode: "canvas_course_persistence_failed",
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
    changed: true,
    counts: resourceCountsForSnapshot(payload),
    diagnostics,
    persistence: persistence.row,
    snapshot: snapshotResult.snapshot,
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

async function syncPlannerItems({
  canvas,
  client,
  connection,
  contextCodes,
  retryPolicy,
  runId,
  syncedAt,
  syncWindow,
  userId,
}: {
  readonly canvas: CanvasClient;
  readonly client: SupabaseClient<Database>;
  readonly connection: CanvasConnectionRow;
  readonly contextCodes: readonly string[];
  readonly retryPolicy: CanvasSyncRetryPolicy;
  readonly runId: string;
  readonly syncedAt: string;
  readonly syncWindow: CanvasSecondarySyncWindow;
  readonly userId: string;
}): Promise<CanvasPlannerSyncResult> {
  if (contextCodes.length === 0) {
    return {
      ...emptyPlannerSyncSummary(),
      failureCode: null,
      retryCount: 0,
    };
  }

  let operation: CanvasOperationResult<readonly CanvasPlannerItem[]>;
  try {
    operation = await runSecondaryCanvasOperation({
      action: () =>
        canvas.listPlannerItems({
          contextCodes,
          endDate: syncWindow.endDate,
          startDate: syncWindow.startDate,
        }),
      failureCode: "canvas_planner_items_failed",
      retryPolicy,
    });
  } catch (error) {
    return {
      ...emptyPlannerSyncSummary(),
      failed: 1,
      failureCode: secondaryFailureCode(error, "canvas_planner_items_failed"),
      retryCount: secondaryRetryCount(error),
    };
  }

  let payload: readonly CanvasSyncPlannerItemPayload[];
  try {
    payload = createCanvasPlannerItemsSnapshotPayload(operation.value);
  } catch {
    return {
      ...emptyPlannerSyncSummary(),
      failed: 1,
      failureCode: "canvas_planner_items_failed",
      retryCount: operation.retryCount,
    };
  }

  const persistence = await persistPlannerItemsSnapshot({
    client,
    connectionId: connection.id,
    contextCodes,
    items: payload,
    runId,
    syncedAt,
    syncWindow,
    userId,
  });
  if (!persistence.ok) {
    return {
      ...emptyPlannerSyncSummary(),
      discovered: payload.length,
      failed: 1,
      failureCode: "canvas_planner_persistence_failed",
      retryCount: operation.retryCount,
    };
  }

  return {
    discovered: payload.length,
    failed: 0,
    failureCode: null,
    inserted: persistence.row.planner_items_inserted,
    pruned: persistence.row.planner_items_pruned,
    retryCount: operation.retryCount,
    unchanged: persistence.row.planner_items_unchanged,
    updated: persistence.row.planner_items_updated,
  };
}

async function syncCourseFiles({
  announcementsByCourse,
  canvas,
  client,
  connection,
  courseResults,
  retryPolicy,
  runId,
  syncedAt,
  userId,
}: {
  readonly announcementsByCourse: ReadonlyMap<string, readonly CanvasAnnouncement[]>;
  readonly canvas: CanvasClient;
  readonly client: SupabaseClient<Database>;
  readonly connection: CanvasConnectionRow;
  readonly courseResults: readonly CourseSyncSuccess[];
  readonly retryPolicy: CanvasSyncRetryPolicy;
  readonly runId: string;
  readonly syncedAt: string;
  readonly userId: string;
}): Promise<CanvasFilesSyncResult> {
  if (courseResults.length === 0) {
    return {
      ...emptyFilesSyncSummary(),
      failureCodes: [],
      retryCount: 0,
    };
  }

  const results = await mapWithConcurrency(
    courseResults,
    COURSE_CONCURRENCY_LIMIT,
    async (courseResult) =>
      syncOneCourseFiles({
        canvas,
        client,
        connection,
        courseAnnouncements:
          announcementsByCourse.get(courseResult.snapshot.course.id) ?? [],
        courseResult,
        retryPolicy,
        runId,
        syncedAt,
        userId,
      }),
  );

  return results.reduce<CanvasFilesSyncResult>(
    (summary, result) => ({
      blocked: summary.blocked + result.blocked,
      coursesFailed: summary.coursesFailed + result.coursesFailed,
      coursesSucceeded: summary.coursesSucceeded + result.coursesSucceeded,
      deactivated: summary.deactivated + result.deactivated,
      discovered: summary.discovered + result.discovered,
      failureCodes: [...summary.failureCodes, ...result.failureCodes],
      htmlFileReferences:
        summary.htmlFileReferences + result.htmlFileReferences,
      inserted: summary.inserted + result.inserted,
      metadataOnly: summary.metadataOnly + result.metadataOnly,
      moduleFileReferences:
        summary.moduleFileReferences + result.moduleFileReferences,
      references: summary.references + result.references,
      referencesDeleted:
        summary.referencesDeleted + result.referencesDeleted,
      referencesInserted:
        summary.referencesInserted + result.referencesInserted,
      retryCount: summary.retryCount + result.retryCount,
      unchanged: summary.unchanged + result.unchanged,
      updated: summary.updated + result.updated,
    }),
    {
      ...emptyFilesSyncSummary(),
      failureCodes: [],
      retryCount: 0,
    },
  );
}

async function syncOneCourseFiles({
  canvas,
  client,
  connection,
  courseAnnouncements,
  courseResult,
  retryPolicy,
  runId,
  syncedAt,
  userId,
}: {
  readonly canvas: CanvasClient;
  readonly client: SupabaseClient<Database>;
  readonly connection: CanvasConnectionRow;
  readonly courseAnnouncements: readonly CanvasAnnouncement[];
  readonly courseResult: CourseSyncSuccess;
  readonly retryPolicy: CanvasSyncRetryPolicy;
  readonly runId: string;
  readonly syncedAt: string;
  readonly userId: string;
}): Promise<CanvasFilesSyncResult> {
  let operation: CanvasOperationResult<readonly CanvasFile[]>;
  try {
    operation = await runSecondaryCanvasOperation({
      action: () => canvas.listCourseFiles(courseResult.snapshot.course.id),
      failureCode: "canvas_course_files_failed",
      retryPolicy,
    });
  } catch (error) {
    return {
      ...emptyFilesSyncSummary(),
      coursesFailed: 1,
      failureCodes: [secondaryFailureCode(error, "canvas_course_files_failed")],
      retryCount: secondaryRetryCount(error),
    };
  }

  let payload: CanvasFileInventoryPayload;
  try {
    payload = createCanvasFileInventoryPayload({
      announcements: courseAnnouncements,
      assignments: courseResult.snapshot.assignments,
      canvasBaseUrl: connection.base_url,
      canvasCourseId: courseResult.snapshot.course.id,
      files: operation.value,
      moduleItemsByModule: courseResult.snapshot.moduleItemsByModule,
      pages: courseResult.snapshot.pages,
    });
  } catch {
    return {
      ...emptyFilesSyncSummary(),
      coursesFailed: 1,
      failureCodes: ["canvas_file_metadata_invalid"],
      retryCount: operation.retryCount,
    };
  }

  const persistence = await persistCourseFilesInventory({
    client,
    connectionId: connection.id,
    files: payload.files,
    references: payload.references,
    canvasCourseId: courseResult.snapshot.course.id,
    runId,
    syncedAt,
    userId,
  });
  if (!persistence.ok) {
    return {
      ...emptyFilesSyncSummary(),
      coursesFailed: 1,
      discovered: payload.files.length,
      failureCodes: ["canvas_file_persistence_failed"],
      retryCount: operation.retryCount,
    };
  }

  return {
    blocked: persistence.row.blocked_files,
    coursesFailed: 0,
    coursesSucceeded: 1,
    deactivated: persistence.row.files_deactivated,
    discovered: payload.files.length,
    failureCodes: [],
    htmlFileReferences: persistence.row.html_file_references,
    inserted: persistence.row.files_inserted,
    metadataOnly: persistence.row.metadata_only_files,
    moduleFileReferences: persistence.row.module_file_references,
    references: payload.references.length,
    referencesDeleted: persistence.row.references_deleted,
    referencesInserted: persistence.row.references_inserted,
    retryCount: operation.retryCount,
    unchanged: persistence.row.files_unchanged,
    updated: persistence.row.files_updated,
  };
}

async function syncAnnouncements({
  canvas,
  client,
  connection,
  courses,
  retryPolicy,
  runId,
  syncedAt,
  syncWindow,
  userId,
}: {
  readonly canvas: CanvasClient;
  readonly client: SupabaseClient<Database>;
  readonly connection: CanvasConnectionRow;
  readonly courses: readonly CanvasCourse[];
  readonly retryPolicy: CanvasSyncRetryPolicy;
  readonly runId: string;
  readonly syncedAt: string;
  readonly syncWindow: CanvasSecondarySyncWindow;
  readonly userId: string;
}): Promise<CanvasAnnouncementsSyncResult> {
  const results = await mapWithConcurrency(
    courses,
    ANNOUNCEMENT_COURSE_CONCURRENCY_LIMIT,
    (course) =>
      syncOneCourseAnnouncements({
        canvas,
        client,
        connection,
        course,
        retryPolicy,
        runId,
        syncedAt,
        syncWindow,
        userId,
      }),
  );

  return {
    ...results.reduce(
      (summary, result) => addAnnouncementSummaries(summary, result.counts),
      emptyAnnouncementsSyncSummary(),
    ),
    announcementsByCourse: results.map((result) => result.announcementsForCourse),
    failureCodes: results.flatMap((result) =>
      result.failureCode ? [result.failureCode] : [],
    ),
    retryCount: results.reduce((sum, result) => sum + result.retryCount, 0),
  };
}

async function syncOneCourseAnnouncements({
  canvas,
  client,
  connection,
  course,
  retryPolicy,
  runId,
  syncedAt,
  syncWindow,
  userId,
}: {
  readonly canvas: CanvasClient;
  readonly client: SupabaseClient<Database>;
  readonly connection: CanvasConnectionRow;
  readonly course: CanvasCourse;
  readonly retryPolicy: CanvasSyncRetryPolicy;
  readonly runId: string;
  readonly syncedAt: string;
  readonly syncWindow: CanvasSecondarySyncWindow;
  readonly userId: string;
}): Promise<CanvasAnnouncementCourseSyncResult> {
  let operation: CanvasOperationResult<readonly CanvasAnnouncement[]>;
  try {
    operation = await runSecondaryCanvasOperation({
      action: () =>
        canvas.listAnnouncements({
          courseId: course.id,
          endDate: syncWindow.endDate,
          startDate: syncWindow.startDate,
        }),
      failureCode: "canvas_course_announcements_failed",
      retryPolicy,
    });
  } catch (error) {
    return {
      announcementsForCourse: {
        announcements: [],
        canvasCourseId: course.id,
      },
      counts: {
        ...emptyAnnouncementsSyncSummary(),
        coursesFailed: 1,
      },
      failureCode: secondaryFailureCode(
        error,
        "canvas_course_announcements_failed",
      ),
      retryCount: secondaryRetryCount(error),
    };
  }

  let payload: readonly CanvasSyncAnnouncementPayload[];
  try {
    payload = createCanvasAnnouncementsSnapshotPayload({
      announcements: operation.value,
      canvasCourseId: course.id,
    });
  } catch {
    return {
      announcementsForCourse: {
        announcements: [],
        canvasCourseId: course.id,
      },
      counts: {
        ...emptyAnnouncementsSyncSummary(),
        coursesFailed: 1,
      },
      failureCode: "canvas_course_announcements_failed",
      retryCount: operation.retryCount,
    };
  }

  const persistence = await persistAnnouncementsSnapshot({
    announcements: payload,
    canvasCourseId: course.id,
    client,
    connectionId: connection.id,
    runId,
    syncedAt,
    syncWindow,
    userId,
  });
  if (!persistence.ok) {
    return {
      announcementsForCourse: {
        announcements: operation.value,
        canvasCourseId: course.id,
      },
      counts: {
        ...emptyAnnouncementsSyncSummary(),
        coursesFailed: 1,
        discovered: payload.length,
      },
      failureCode: "canvas_announcement_persistence_failed",
      retryCount: operation.retryCount,
    };
  }

  return {
    announcementsForCourse: {
      announcements: operation.value,
      canvasCourseId: course.id,
    },
    counts: {
      coursesFailed: 0,
      coursesSucceeded: 1,
      discovered: payload.length,
      inserted: persistence.row.announcements_inserted,
      pruned: persistence.row.announcements_pruned,
      unchanged: persistence.row.announcements_unchanged,
      updated: persistence.row.announcements_updated,
    },
    failureCode: null,
    retryCount: operation.retryCount,
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

async function runSecondaryCanvasOperation<TValue>({
  action,
  failureCode,
  retryPolicy,
}: {
  readonly action: () => Promise<TValue>;
  readonly failureCode: CanvasSyncFailureCode;
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
      const classified = classifySecondaryOperationFailure({
        error,
        failureCode,
        retryCount,
      });
      if (!classified.retryable || retryCount >= retryPolicy.maxRetries) {
        throw new CanvasSecondaryOperationError(classified);
      }

      const delayMs = retryDelayMs(error, retryCount, retryPolicy);
      retryCount += 1;
      await retryPolicy.sleep(delayMs);
    }
  }
}

function classifySecondaryOperationFailure({
  error,
  failureCode,
  retryCount,
}: {
  readonly error: unknown;
  readonly failureCode: CanvasSyncFailureCode;
  readonly retryCount: number;
}): CanvasSecondaryOperationErrorDetails {
  if (!(error instanceof CanvasClientError)) {
    return {
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
      return {
        failureCategory: "authentication_failure",
        failureCode,
        httpStatusClass,
        retryable: false,
        retryCount,
      };
    case "canvas_forbidden":
      return {
        failureCategory: "permission_denied",
        failureCode,
        httpStatusClass,
        retryable: false,
        retryCount,
      };
    case "canvas_not_found":
      return {
        failureCategory: "resource_not_found",
        failureCode,
        httpStatusClass,
        retryable: false,
        retryCount,
      };
    case "canvas_rate_limited":
      return {
        failureCategory: "rate_limited",
        failureCode,
        httpStatusClass,
        retryable: true,
        retryCount,
      };
    case "canvas_unavailable":
      return {
        failureCategory: "server_error",
        failureCode,
        httpStatusClass,
        retryable: true,
        retryCount,
      };
    case "canvas_timeout":
    case "canvas_file_download_timeout":
      return {
        failureCategory: "timeout",
        failureCode,
        httpStatusClass,
        retryable: true,
        retryCount,
      };
    case "canvas_network_error":
      return {
        failureCategory: "network_error",
        failureCode,
        httpStatusClass,
        retryable: true,
        retryCount,
      };
    case "canvas_malformed_json":
    case "canvas_invalid_response":
      return {
        failureCategory: "malformed_response",
        failureCode,
        httpStatusClass,
        retryable: false,
        retryCount,
      };
    case "canvas_pagination_rejected":
      return {
        failureCategory: "pagination_rejected",
        failureCode,
        httpStatusClass,
        retryable: false,
        retryCount,
      };
    case "canvas_redirect_rejected":
    case "canvas_file_redirect_rejected":
      return {
        failureCategory: "redirect_rejected",
        failureCode,
        httpStatusClass,
        retryable: false,
        retryCount,
      };
    case "invalid_base_url":
    case "canvas_file_download_failed":
    case "canvas_file_too_large":
    case "canvas_request_failed":
      return {
        failureCategory: "unknown",
        failureCode,
        httpStatusClass,
        retryable: false,
        retryCount,
      };
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
    case "canvas_file_download_timeout":
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
    case "canvas_file_redirect_rejected":
      return classifiedCourseFailure({
        failureCategory: "redirect_rejected",
        failureCode: "canvas_course_response_invalid",
        httpStatusClass,
        operation,
        retryCount,
        retryable: false,
      });
    case "invalid_base_url":
    case "canvas_file_download_failed":
    case "canvas_file_too_large":
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

async function readCourseSyncState({
  canvasCourseId,
  client,
  connectionId,
  userId,
}: {
  readonly canvasCourseId: string;
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly userId: string;
}): Promise<
  | {
      readonly ok: true;
      readonly row: Pick<
        CanvasCourseSyncStateRow,
        | "snapshot_fingerprint"
        | "fingerprint_version"
        | "last_successful_sync_at"
      > | null;
    }
  | { readonly ok: false }
> {
  const { data, error } = await client
    .from("canvas_course_sync_states")
    .select("snapshot_fingerprint,fingerprint_version,last_successful_sync_at")
    .eq("user_id", userId)
    .eq("canvas_connection_id", connectionId)
    .eq("canvas_course_id", canvasCourseId)
    .maybeSingle();

  if (error) {
    return { ok: false };
  }
  return {
    ok: true,
    row: data as Pick<
      CanvasCourseSyncStateRow,
      "snapshot_fingerprint" | "fingerprint_version" | "last_successful_sync_at"
    > | null,
  };
}

async function persistCourseSnapshotWithSyncState({
  client,
  connectionId,
  fingerprint,
  fingerprintVersion,
  payload,
  runId,
  syncedAt,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly fingerprint: string;
  readonly fingerprintVersion: string;
  readonly payload: CanvasCourseSnapshotPayload;
  readonly runId: string;
  readonly syncedAt: string;
  readonly userId: string;
}): Promise<
  | {
      readonly ok: true;
      readonly row: CanvasCourseAcademicSnapshotWithSyncStateResult;
    }
  | { readonly ok: false }
> {
  const { data, error } = await client
    .rpc("replace_canvas_course_academic_snapshot_with_sync_state", {
      p_assignments: payload.assignments,
      p_assignment_groups: payload.assignmentGroups,
      p_canvas_connection_id: connectionId,
      p_course: payload.course,
      p_fingerprint_version: fingerprintVersion,
      p_module_items: payload.moduleItems,
      p_modules: payload.modules,
      p_pages: payload.pages,
      p_snapshot_fingerprint: fingerprint,
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

async function persistPlannerItemsSnapshot({
  client,
  connectionId,
  contextCodes,
  items,
  runId,
  syncedAt,
  syncWindow,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly contextCodes: readonly string[];
  readonly items: readonly CanvasSyncPlannerItemPayload[];
  readonly runId: string;
  readonly syncedAt: string;
  readonly syncWindow: CanvasSecondarySyncWindow;
  readonly userId: string;
}): Promise<
  | {
      readonly ok: true;
      readonly row: CanvasPlannerItemsSnapshotResult;
    }
  | { readonly ok: false }
> {
  const { data, error } = await client
    .rpc("replace_canvas_planner_items_snapshot", {
      p_canvas_connection_id: connectionId,
      p_context_codes: [...contextCodes],
      p_items: items as unknown as Json,
      p_sync_run_id: runId,
      p_synced_at: syncedAt,
      p_user_id: userId,
      p_window_end_at: syncWindow.endDate,
      p_window_start_at: syncWindow.startDate,
    })
    .single();

  if (error || !data) {
    return { ok: false };
  }
  return { ok: true, row: data };
}

async function persistAnnouncementsSnapshot({
  announcements,
  canvasCourseId,
  client,
  connectionId,
  runId,
  syncedAt,
  syncWindow,
  userId,
}: {
  readonly announcements: readonly CanvasSyncAnnouncementPayload[];
  readonly canvasCourseId: string;
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly runId: string;
  readonly syncedAt: string;
  readonly syncWindow: CanvasSecondarySyncWindow;
  readonly userId: string;
}): Promise<
  | {
      readonly ok: true;
      readonly row: CanvasAnnouncementsSnapshotResult;
    }
  | { readonly ok: false }
> {
  const { data, error } = await client
    .rpc("replace_canvas_course_announcements_snapshot", {
      p_announcements: announcements as unknown as Json,
      p_canvas_connection_id: connectionId,
      p_canvas_course_id: canvasCourseId,
      p_sync_run_id: runId,
      p_synced_at: syncedAt,
      p_user_id: userId,
      p_window_end_at: syncWindow.endDate,
      p_window_start_at: syncWindow.startDate,
    })
    .single();

  if (error || !data) {
    return { ok: false };
  }
  return { ok: true, row: data };
}

async function persistCourseFilesInventory({
  canvasCourseId,
  client,
  connectionId,
  files,
  references,
  runId,
  syncedAt,
  userId,
}: {
  readonly canvasCourseId: string;
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly files: readonly CanvasSyncFilePayload[];
  readonly references: readonly CanvasSyncFileReferencePayload[];
  readonly runId: string;
  readonly syncedAt: string;
  readonly userId: string;
}): Promise<
  | {
      readonly ok: true;
      readonly row: CanvasFilesInventorySnapshotResult;
    }
  | { readonly ok: false }
> {
  const { data, error } = await client
    .rpc("replace_canvas_course_files_inventory", {
      p_canvas_connection_id: connectionId,
      p_canvas_course_id: canvasCourseId,
      p_files: files as unknown as Json,
      p_references: references as unknown as Json,
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

async function recordCourseSnapshotUnchanged({
  canvasCourseId,
  checkedAt,
  client,
  connectionId,
  fingerprint,
  fingerprintVersion,
  runId,
  userId,
}: {
  readonly canvasCourseId: string;
  readonly checkedAt: string;
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly fingerprint: string;
  readonly fingerprintVersion: string;
  readonly runId: string;
  readonly userId: string;
}): Promise<{ readonly ok: true } | { readonly ok: false }> {
  const { data, error } = await client
    .rpc("record_canvas_course_snapshot_unchanged", {
      p_canvas_connection_id: connectionId,
      p_canvas_course_id: canvasCourseId,
      p_checked_at: checkedAt,
      p_fingerprint_version: fingerprintVersion,
      p_snapshot_fingerprint: fingerprint,
      p_sync_run_id: runId,
      p_user_id: userId,
    })
    .single();

  if (error || !data) {
    return { ok: false };
  }
  return { ok: true };
}

async function recordCourseSnapshotFailed({
  canvasCourseId,
  checkedAt,
  client,
  connectionId,
  failureCode,
  runId,
  userId,
}: {
  readonly canvasCourseId: string;
  readonly checkedAt: string;
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly failureCode: CanvasSyncFailureCode;
  readonly runId: string;
  readonly userId: string;
}): Promise<void> {
  try {
    await client
      .rpc("record_canvas_course_snapshot_failed", {
        p_canvas_connection_id: connectionId,
        p_canvas_course_id: canvasCourseId,
        p_checked_at: checkedAt,
        p_failure_code: failureCode,
        p_sync_run_id: runId,
        p_user_id: userId,
      })
      .single();
  } catch {
    return;
  }
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
  mode,
  startedAt,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly mode: CanvasAcademicSyncMode;
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
    .rpc("begin_canvas_sync_run_with_mode", {
      p_canvas_connection_id: connectionId,
      p_sync_mode: mode,
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
    readonly changed: number;
    readonly discovered: number;
    readonly failed: number;
    readonly succeeded: number;
    readonly unchanged: number;
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
    readonly changed: number;
    readonly discovered: number;
    readonly failed: number;
    readonly succeeded: number;
    readonly unchanged: number;
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

function createSecondarySyncWindow(now: Date): CanvasSecondarySyncWindow {
  const millisecondsPerDay = 24 * 60 * 60 * 1_000;
  return {
    startDate: new Date(
      now.getTime() - CANVAS_SECONDARY_SYNC_PAST_DAYS * millisecondsPerDay,
    ).toISOString(),
    endDate: new Date(
      now.getTime() + CANVAS_SECONDARY_SYNC_FUTURE_DAYS * millisecondsPerDay,
    ).toISOString(),
  };
}

function createCourseContextCodes(
  courses: readonly CanvasCourse[],
): readonly string[] {
  return courses
    .map((course) => `course_${course.id}`)
    .sort((left, right) => left.localeCompare(right));
}

function emptyPlannerSyncSummary(): CanvasPlannerSyncSummary {
  return {
    discovered: 0,
    failed: 0,
    inserted: 0,
    pruned: 0,
    unchanged: 0,
    updated: 0,
  };
}

function emptyAnnouncementsSyncSummary(): CanvasAnnouncementsSyncSummary {
  return {
    coursesFailed: 0,
    coursesSucceeded: 0,
    discovered: 0,
    inserted: 0,
    pruned: 0,
    unchanged: 0,
    updated: 0,
  };
}

function emptyFilesSyncSummary(): CanvasFilesSyncSummary {
  return {
    blocked: 0,
    coursesFailed: 0,
    coursesSucceeded: 0,
    deactivated: 0,
    discovered: 0,
    htmlFileReferences: 0,
    inserted: 0,
    metadataOnly: 0,
    moduleFileReferences: 0,
    references: 0,
    referencesDeleted: 0,
    referencesInserted: 0,
    unchanged: 0,
    updated: 0,
  };
}

function addAnnouncementSummaries(
  left: CanvasAnnouncementsSyncSummary,
  right: CanvasAnnouncementsSyncSummary,
): CanvasAnnouncementsSyncSummary {
  return {
    coursesFailed: left.coursesFailed + right.coursesFailed,
    coursesSucceeded: left.coursesSucceeded + right.coursesSucceeded,
    discovered: left.discovered + right.discovered,
    inserted: left.inserted + right.inserted,
    pruned: left.pruned + right.pruned,
    unchanged: left.unchanged + right.unchanged,
    updated: left.updated + right.updated,
  };
}

function secondaryFailureCode(
  error: unknown,
  fallback: CanvasSyncFailureCode,
): CanvasSyncFailureCode {
  return error instanceof CanvasSecondaryOperationError
    ? error.failureCode
    : fallback;
}

function secondaryRetryCount(error: unknown): number {
  return error instanceof CanvasSecondaryOperationError ? error.retryCount : 0;
}

function statusForScopes({
  announcements,
  files,
  plannerItems,
  totals,
}: {
  readonly announcements: CanvasAnnouncementsSyncSummary;
  readonly files: CanvasFilesSyncSummary;
  readonly plannerItems: CanvasPlannerSyncSummary;
  readonly totals: {
    readonly changed: number;
    readonly discovered: number;
    readonly failed: number;
    readonly succeeded: number;
    readonly unchanged: number;
  };
}): CanvasAcademicSyncStatus {
  const hasFailure =
    totals.failed > 0 ||
    files.coursesFailed > 0 ||
    plannerItems.failed > 0 ||
    announcements.coursesFailed > 0;
  if (!hasFailure) {
    return "succeeded";
  }

  const plannerHadUsefulSnapshot =
    plannerItems.failed === 0 &&
    (totals.succeeded > 0 ||
      plannerItems.discovered > 0 ||
      plannerItems.unchanged > 0 ||
      plannerItems.pruned > 0);
  const hasUsefulSuccess =
    totals.succeeded > 0 ||
    files.coursesSucceeded > 0 ||
    plannerHadUsefulSnapshot ||
    announcements.coursesSucceeded > 0;
  if (hasUsefulSuccess) {
    return "partial";
  }
  return "failed";
}

function createSummary({
  announcements,
  failures,
  files,
  mode,
  plannerItems,
  resourceCounts,
  retryAttempts,
  status,
  syncWindow,
  totals,
}: {
  readonly announcements: CanvasAnnouncementsSyncSummary;
  readonly failures: readonly CanvasAcademicSyncFailureSummary[];
  readonly files: CanvasFilesSyncSummary;
  readonly mode: CanvasAcademicSyncMode;
  readonly plannerItems: CanvasPlannerSyncSummary;
  readonly resourceCounts: CanvasSyncResourceCounts;
  readonly retryAttempts: number;
  readonly status: CanvasAcademicSyncStatus;
  readonly syncWindow: CanvasSecondarySyncWindow;
  readonly totals: {
    readonly changed: number;
    readonly discovered: number;
    readonly failed: number;
    readonly succeeded: number;
    readonly unchanged: number;
  };
}): CanvasAcademicSyncSummary {
  return {
    status,
    mode,
    syncWindow,
    courses: {
      discovered: totals.discovered,
      succeeded: totals.succeeded,
      changed: totals.changed,
      unchanged: totals.unchanged,
      failed: totals.failed,
    },
    plannerItems: {
      discovered: plannerItems.discovered,
      inserted: plannerItems.inserted,
      updated: plannerItems.updated,
      unchanged: plannerItems.unchanged,
      pruned: plannerItems.pruned,
      failed: plannerItems.failed,
    },
    announcements: {
      discovered: announcements.discovered,
      inserted: announcements.inserted,
      updated: announcements.updated,
      unchanged: announcements.unchanged,
      pruned: announcements.pruned,
      coursesSucceeded: announcements.coursesSucceeded,
      coursesFailed: announcements.coursesFailed,
    },
    files: {
      coursesSucceeded: files.coursesSucceeded,
      coursesFailed: files.coursesFailed,
      discovered: files.discovered,
      inserted: files.inserted,
      updated: files.updated,
      unchanged: files.unchanged,
      deactivated: files.deactivated,
      references: files.references,
      referencesInserted: files.referencesInserted,
      referencesDeleted: files.referencesDeleted,
      moduleFileReferences: files.moduleFileReferences,
      htmlFileReferences: files.htmlFileReferences,
      metadataOnly: files.metadataOnly,
      blocked: files.blocked,
    },
    resources: resourceCounts,
    retryAttempts,
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
