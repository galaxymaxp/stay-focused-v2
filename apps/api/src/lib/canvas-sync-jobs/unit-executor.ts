import {
  CanvasClientError,
  type CanvasAnnouncement,
  type CanvasAssignment,
  type CanvasAssignmentGroup,
  type CanvasCourseGradeSummary,
  type CanvasFile,
  type CanvasGradeAssignment,
  type CanvasJsonObject,
  type CanvasModule,
  type CanvasModuleItem,
  type CanvasOwnSubmission,
  type CanvasPageDetail,
  type CanvasPageSummary,
} from "@stay-focused/canvas";
import type {
  CanvasSyncJobUnitRow,
  CanvasSyncScope,
  Json,
} from "@stay-focused/db";

import {
  createCanvasClient,
  decryptConnectionToken,
} from "@/lib/canvas-routes";
import {
  beginCanvasSyncUnitAttempt,
  CANVAS_SYNC_JOB_DEADLINE_MS,
  CANVAS_SYNC_MAX_RETRY_AFTER_MS,
  canvasSyncItemKeyHash,
  completeCanvasSyncUnit,
  createCanvasSyncUnit,
  deferCanvasSyncUnit,
  failCanvasSyncUnit,
  fingerprintCanvasSyncItem,
  loadCanvasSyncCheckpointContext,
  type CanvasSyncUnitPlan,
} from "./checkpoints";
import type { CanvasSyncJobServiceClient } from "./repository";

export type CanvasSyncUnitExecutionResult =
  | { readonly status: "succeeded" | "cancelled" | "skipped" }
  | {
      readonly status: "retry";
      readonly retryAfterMs: number;
      readonly code: string;
    }
  | {
      readonly status: "failed";
      readonly code: string;
      readonly retryable: boolean;
    };

export async function executeCanvasSyncUnit(
  client: CanvasSyncJobServiceClient,
  input: {
    readonly unitId: string;
    readonly workerId: string;
  },
): Promise<CanvasSyncUnitExecutionResult> {
  const unit = await beginCanvasSyncUnitAttempt(
    client,
    input.unitId,
    input.workerId,
  );
  if (!unit) return { status: "skipped" };

  const context = await loadCanvasSyncCheckpointContext(client, unit.job_id);
  if (!context) {
    await failCanvasSyncUnit(client, {
      code: "canvas_sync_context_missing",
      message: "Canvas synchronization context is unavailable.",
      retryable: false,
      unitId: unit.id,
      workerId: input.workerId,
    });
    return {
      status: "failed",
      code: "canvas_sync_context_missing",
      retryable: false,
    };
  }

  const deadlineAt = context.job.deadline_at
    ? Date.parse(context.job.deadline_at)
    : Date.parse(context.job.accepted_at) + CANVAS_SYNC_JOB_DEADLINE_MS;
  if (Date.now() >= deadlineAt) {
    await failCanvasSyncUnit(client, {
      code: "canvas_sync_deadline_exceeded",
      message: "Canvas synchronization exceeded its processing deadline.",
      retryable: context.job.attempt_count < context.job.max_attempts,
      unitId: unit.id,
      workerId: input.workerId,
    });
    return {
      status: "failed",
      code: "canvas_sync_deadline_exceeded",
      retryable: context.job.attempt_count < context.job.max_attempts,
    };
  }

  try {
    const token = decryptConnectionToken(context.connection);
    const canvas = createCanvasClient(context.connection.base_url, token);
    const result = await runUnit({
      canvas,
      client,
      courseCanvasId: context.course.canvas_course_id,
      courseId: context.course.id,
      unit,
      userId: context.job.user_id,
    });
    await assertDiscoveredUnitsAreSafe(client, unit, result.discoveredUnits);
    const completed = await completeCanvasSyncUnit(client, {
      discoveredUnits: result.discoveredUnits,
      payload: result.payload,
      payloadKind: result.payloadKind,
      unitId: unit.id,
      workerId: input.workerId,
    });
    return {
      status: completed?.status === "cancelled" ? "cancelled" : "succeeded",
    };
  } catch (error) {
    return handleUnitFailure(client, unit, input.workerId, error);
  }
}

async function assertDiscoveredUnitsAreSafe(
  client: CanvasSyncJobServiceClient,
  unit: CanvasSyncJobUnitRow,
  discoveredUnits: readonly CanvasSyncUnitPlan[],
): Promise<void> {
  if (discoveredUnits.length === 0) return;
  if (
    discoveredUnits.some((discovered) =>
      discovered.isDiscovery && discovered.pageIndex >= 10
    )
  ) {
    throw new CanvasClientError(
      "canvas_pagination_rejected",
      "Canvas pagination exceeded the configured page limit.",
    );
  }

  const exactKeys = new Set<string>();
  const cursorKeys = new Set<string>();
  for (const discovered of discoveredUnits) {
    if (exactKeys.has(discovered.unitKey)) {
      throw new CanvasClientError(
        "canvas_pagination_rejected",
        "Canvas returned a duplicated synchronization unit.",
      );
    }
    exactKeys.add(discovered.unitKey);
    const cursorKey = paginationCursorKey(
      discovered.unitKind,
      discovered.checkpoint,
    );
    if (cursorKey && cursorKeys.has(cursorKey)) {
      throw new CanvasClientError(
        "canvas_pagination_rejected",
        "Canvas returned a repeated pagination cursor.",
      );
    }
    if (cursorKey) cursorKeys.add(cursorKey);
  }

  const { data, error } = await client
    .from("canvas_sync_job_units")
    .select("unit_key,unit_kind,checkpoint")
    .eq("job_id", unit.job_id);
  if (error) throw new Error("canvas_sync_plan_unavailable");
  const existingExact = new Set((data ?? []).map((row) => row.unit_key));
  const existingCursors = new Set(
    (data ?? [])
      .map((row) => paginationCursorKey(row.unit_kind, row.checkpoint))
      .filter((value): value is string => value !== null),
  );
  if (
    discoveredUnits.some((discovered) =>
      existingExact.has(discovered.unitKey) ||
      (
        paginationCursorKey(discovered.unitKind, discovered.checkpoint) !== null &&
        existingCursors.has(
          paginationCursorKey(discovered.unitKind, discovered.checkpoint) as string,
        )
      )
    )
  ) {
    throw new CanvasClientError(
      "canvas_pagination_rejected",
      "Canvas pagination repeated previously discovered work.",
    );
  }
}

function paginationCursorKey(
  unitKind: string,
  checkpoint: Json,
): string | null {
  const record = readRecord(checkpoint);
  const cursor = readString(record.cursor);
  if (!cursor) return null;
  return JSON.stringify([
    unitKind,
    readString(record.parentSourceId),
    cursor,
  ]);
}

interface UnitRunResult {
  readonly payloadKind: string;
  readonly payload: Json | null;
  readonly discoveredUnits: readonly CanvasSyncUnitPlan[];
}

async function runUnit({
  canvas,
  client,
  courseCanvasId,
  courseId,
  unit,
  userId,
}: {
  readonly canvas: ReturnType<typeof createCanvasClient>;
  readonly client: CanvasSyncJobServiceClient;
  readonly courseCanvasId: string;
  readonly courseId: string;
  readonly unit: CanvasSyncJobUnitRow;
  readonly userId: string;
}): Promise<UnitRunResult> {
  const checkpoint = readRecord(unit.checkpoint);
  const cursor = readString(checkpoint.cursor);
  const next = (
    nextCursor: string | null,
    checkpointValues: Record<string, Json> = {},
  ): readonly CanvasSyncUnitPlan[] =>
    nextCursor
      ? [
          createCanvasSyncUnit(
            unit.unit_kind as Parameters<typeof createCanvasSyncUnit>[0],
            unit.scope,
            unit.page_index + 1,
            true,
            {
              ...checkpointValues,
              cursor: nextCursor,
            },
          ),
        ]
      : [];

  switch (unit.unit_kind) {
    case "modules_page": {
      const page = await canvas.listModulesPage(courseCanvasId, cursor);
      return pageResult(
        unit,
        page.items,
        [
          ...next(page.nextCursor),
          ...page.items.map((module) =>
            createCanvasSyncUnit(
              "module_items_page",
              "content",
              0,
              true,
              { parentSourceId: module.id },
            ),
          ),
        ],
      );
    }
    case "module_items_page": {
      const parentSourceId = requireCheckpointString(
        checkpoint,
        "parentSourceId",
      );
      const page = await canvas.listModuleItemsPage(
        courseCanvasId,
        parentSourceId,
        cursor,
      );
      return pageResult(
        unit,
        page.items,
        next(page.nextCursor, { parentSourceId }),
        { parentSourceId },
      );
    }
    case "pages_page": {
      const page = await canvas.listPagesPage(courseCanvasId, cursor);
      const details = await Promise.all(
        page.items.map(async (summary) =>
          createCanvasSyncUnit(
            (await canReusePageDetail({
              client,
              courseId,
              summary,
              userId,
            }))
              ? "page_detail_reuse"
              : "page_detail",
            "content",
            0,
            false,
            { pageSummary: toJson(summary), pageUrl: summary.url },
          ),
        ),
      );
      return pageResult(unit, page.items, [
        ...next(page.nextCursor),
        ...details,
      ]);
    }
    case "page_detail": {
      const pageUrl = requireCheckpointString(checkpoint, "pageUrl");
      const detail = await canvas.getPage(courseCanvasId, pageUrl);
      return itemResult(unit, detail);
    }
    case "page_detail_reuse": {
      const summary = readPageSummary(checkpoint.pageSummary);
      const detail = await loadReusablePageDetail({
        client,
        courseId,
        summary,
        userId,
      });
      if (!detail) {
        const page = await canvas.getPage(courseCanvasId, summary.url);
        return itemResult(unit, page);
      }
      return itemResult(unit, detail);
    }
    case "assignment_groups_page": {
      const page = await canvas.listAssignmentGroupsPage(courseCanvasId, cursor);
      return pageResult(unit, page.items, next(page.nextCursor));
    }
    case "assignments_page": {
      const page = await canvas.listAssignmentsPage(courseCanvasId, cursor);
      return pageResult(unit, page.items, next(page.nextCursor));
    }
    case "announcements_page": {
      const startDate = requireCheckpointString(checkpoint, "startDate");
      const endDate = requireCheckpointString(checkpoint, "endDate");
      const page = await canvas.listAnnouncementsPage(
        { courseId: courseCanvasId, endDate, startDate },
        cursor,
      );
      return pageResult(
        unit,
        page.items,
        next(page.nextCursor, { endDate, startDate }),
      );
    }
    case "files_page": {
      const page = await canvas.listCourseFilesPage(courseCanvasId, cursor);
      return pageResult(unit, page.items, next(page.nextCursor));
    }
    case "grade_assignments_page": {
      const page = await canvas.listCourseAssignmentsPage(courseCanvasId, cursor);
      return pageResult(unit, page.items, next(page.nextCursor));
    }
    case "submissions_page": {
      const page = await canvas.listOwnCourseSubmissionsPage(
        courseCanvasId,
        cursor,
      );
      return pageResult(unit, page.items, next(page.nextCursor));
    }
    case "grade_summary_page": {
      const page = await canvas.getOwnCourseGradeSummaryPage(
        courseCanvasId,
        cursor,
      );
      return pageResult(unit, page.items, next(page.nextCursor));
    }
    default:
      throw new Error("canvas_sync_unit_kind_unsupported");
  }
}

function pageResult<TItem>(
  unit: CanvasSyncJobUnitRow,
  items: readonly TItem[],
  discoveredUnits: readonly CanvasSyncUnitPlan[],
  metadata: Record<string, Json> = {},
): UnitRunResult {
  return {
    payloadKind: unit.unit_kind,
    payload: toJson({ ...metadata, items }),
    discoveredUnits,
  };
}

function itemResult(
  unit: CanvasSyncJobUnitRow,
  item: CanvasPageDetail,
): UnitRunResult {
  return {
    payloadKind: unit.unit_kind,
    payload: toJson({ item }),
    discoveredUnits: [],
  };
}

async function handleUnitFailure(
  client: CanvasSyncJobServiceClient,
  unit: CanvasSyncJobUnitRow,
  workerId: string,
  error: unknown,
): Promise<CanvasSyncUnitExecutionResult> {
  const failure = classifyUnitFailure(error);
  const canRetry =
    failure.retryable && unit.attempt_count < unit.max_attempts;
  if (canRetry) {
    const retryAfterMs = retryDelayMs(error, unit.attempt_count);
    const availableAt = new Date(Date.now() + retryAfterMs).toISOString();
    const deferred = await deferCanvasSyncUnit(client, {
      availableAt,
      code: failure.code,
      message: failure.message,
      unitId: unit.id,
      workerId,
    });
    if (deferred) {
      return { status: "retry", retryAfterMs, code: failure.code };
    }
  }

  await failCanvasSyncUnit(client, {
    code: failure.code,
    message: failure.message,
    retryable: failure.retryable,
    unitId: unit.id,
    workerId,
  });
  return {
    status: "failed",
    code: failure.code,
    retryable: failure.retryable,
  };
}

function classifyUnitFailure(error: unknown): {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
} {
  if (error instanceof CanvasClientError) {
    switch (error.code) {
      case "canvas_unauthorized":
      case "missing_access_token":
        return {
          code: "canvas_authentication_failed",
          message: "Reconnect Canvas and try synchronization again.",
          retryable: false,
        };
      case "canvas_forbidden":
        return {
          code: "canvas_permission_denied",
          message: "Canvas did not permit access to part of this course.",
          retryable: false,
        };
      case "canvas_not_found":
        return {
          code: "canvas_resource_not_found",
          message: "A Canvas item was no longer available.",
          retryable: false,
        };
      case "canvas_rate_limited":
        return {
          code: "canvas_rate_limited",
          message: "Canvas asked synchronization to wait before retrying.",
          retryable: true,
        };
      case "canvas_timeout":
        return {
          code: "canvas_timeout",
          message: "A Canvas request timed out and can be retried.",
          retryable: true,
        };
      case "canvas_network_error":
      case "canvas_unavailable":
      case "canvas_request_failed":
        return {
          code: "canvas_unavailable",
          message: "Canvas is temporarily unavailable.",
          retryable: true,
        };
      case "canvas_pagination_rejected":
        return {
          code: "canvas_pagination_rejected",
          message: "Canvas pagination could not be completed safely.",
          retryable: false,
        };
      default:
        return {
          code: "canvas_sync_unit_failed",
          message: "A Canvas synchronization operation failed safely.",
          retryable: false,
        };
    }
  }
  if (error instanceof Error && error.message === "canvas_sync_unit_kind_unsupported") {
    return {
      code: "canvas_sync_unit_unsupported",
      message: "A Canvas synchronization operation was unsupported.",
      retryable: false,
    };
  }
  return {
    code: "canvas_sync_unit_interrupted",
    message: "A Canvas synchronization operation was interrupted.",
    retryable: true,
  };
}

function retryDelayMs(error: unknown, attemptCount: number): number {
  const providerDelay =
    error instanceof CanvasClientError ? error.retryAfterMs : null;
  if (providerDelay !== null) {
    return Math.min(
      CANVAS_SYNC_MAX_RETRY_AFTER_MS,
      Math.max(1_000, providerDelay),
    );
  }
  return Math.min(
    CANVAS_SYNC_MAX_RETRY_AFTER_MS,
    Math.max(2_000, 2 ** Math.max(0, attemptCount - 1) * 2_000),
  );
}

async function canReusePageDetail({
  client,
  courseId,
  summary,
  userId,
}: {
  readonly client: CanvasSyncJobServiceClient;
  readonly courseId: string;
  readonly summary: CanvasPageSummary;
  readonly userId: string;
}): Promise<boolean> {
  if (!summary.updatedAt) return false;
  const keyHash = canvasSyncItemKeyHash("content", "page", summary.url);
  const fingerprint = fingerprintCanvasSyncItem(summary);
  const { data, error } = await client
    .from("canvas_course_item_sync_states")
    .select("item_state,source_updated_at,source_fingerprint")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .eq("scope", "content")
    .eq("item_kind", "page")
    .eq("item_key_hash", keyHash)
    .maybeSingle();
  return (
    !error &&
    data?.item_state === "synced" &&
    data.source_updated_at === summary.updatedAt &&
    data.source_fingerprint === fingerprint
  );
}

async function loadReusablePageDetail({
  client,
  courseId,
  summary,
  userId,
}: {
  readonly client: CanvasSyncJobServiceClient;
  readonly courseId: string;
  readonly summary: CanvasPageSummary;
  readonly userId: string;
}): Promise<CanvasPageDetail | null> {
  const { data, error } = await client
    .from("canvas_pages")
    .select(
      "canvas_page_id,canvas_page_url,title,body_html,published,front_page,editing_roles,lock_info,unlock_at,lock_at,canvas_created_at,canvas_updated_at",
    )
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .eq("canvas_page_url", summary.url)
    .maybeSingle();
  if (error || !data) return null;
  return {
    pageId: data.canvas_page_id,
    url: data.canvas_page_url,
    title: data.title,
    body: data.body_html,
    published: data.published,
    frontPage: data.front_page,
    editingRoles: data.editing_roles,
    lockInfo: readJsonObject(data.lock_info),
    unlockAt: data.unlock_at,
    lockAt: data.lock_at,
    createdAt: data.canvas_created_at,
    updatedAt: data.canvas_updated_at,
  };
}

function readPageSummary(value: Json | undefined): CanvasPageSummary {
  const record = readRecord(value);
  return {
    pageId: readNullableString(record.pageId),
    url: requireCheckpointString(record, "url"),
    title: requireCheckpointString(record, "title"),
    published: readNullableBoolean(record.published),
    frontPage: readNullableBoolean(record.frontPage),
    editingRoles: readNullableString(record.editingRoles),
    lockInfo: readJsonObject(record.lockInfo),
    unlockAt: readNullableString(record.unlockAt),
    lockAt: readNullableString(record.lockAt),
    createdAt: readNullableString(record.createdAt),
    updatedAt: readNullableString(record.updatedAt),
  };
}

function readRecord(value: Json): Record<string, Json | undefined>;
function readRecord(value: Json | undefined): Record<string, Json | undefined>;
function readRecord(value: Json | undefined): Record<string, Json | undefined> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, Json | undefined>;
}

function readString(value: Json | undefined): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function readNullableString(value: Json | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function readNullableBoolean(value: Json | undefined): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function readJsonObject(
  value: Json | undefined,
): CanvasJsonObject | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as CanvasJsonObject
    : null;
}

function requireCheckpointString(
  checkpoint: Record<string, Json | undefined>,
  key: string,
): string {
  const value = readString(checkpoint[key]);
  if (!value) throw new Error("canvas_sync_checkpoint_invalid");
  return value;
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

export type CanvasStagedPayloadItem =
  | CanvasModule
  | CanvasModuleItem
  | CanvasPageSummary
  | CanvasPageDetail
  | CanvasAssignmentGroup
  | CanvasAssignment
  | CanvasAnnouncement
  | CanvasFile
  | CanvasGradeAssignment
  | CanvasOwnSubmission
  | CanvasCourseGradeSummary;

export function scopeForCanvasUnitKind(
  kind: CanvasSyncJobUnitRow["unit_kind"],
): CanvasSyncScope {
  if (kind === "announcements_page") return "announcements";
  if (kind === "files_page") return "files";
  if (
    kind === "grade_assignments_page" ||
    kind === "submissions_page" ||
    kind === "grade_summary_page"
  ) {
    return "grades";
  }
  return "content";
}
