import {
  CanvasClientError,
  type CanvasAnnouncement,
  type CanvasAssignment,
  type CanvasAssignmentGroup,
  type CanvasCourse,
  type CanvasCourseGradeSummary,
  type CanvasFile,
  type CanvasGradeAssignment,
  type CanvasModule,
  type CanvasModuleItem,
  type CanvasOwnSubmission,
  type CanvasPageDetail,
  type CanvasPageSummary,
} from "@stay-focused/canvas";
import type {
  CanvasSyncItemState,
  CanvasSyncJobStagingRow,
  CanvasSyncJobUnitRow,
  CanvasSyncScope,
  Json,
} from "@stay-focused/db";

import { syncCanvasCourseGrades } from "@/lib/canvas-grade-sync";
import {
  syncSelectedCanvasCourse,
  type CanvasCourseSyncProvider,
} from "@/lib/canvas-sync";
import {
  beginCanvasSyncPromotion,
  cancelCheckpointedCanvasSyncJob,
  canvasSyncItemKeyHash,
  completeCheckpointedCanvasSyncJob,
  failCheckpointedCanvasSyncJob,
  fingerprintCanvasSyncItem,
  loadCanvasSyncCheckpointContext,
  readCanvasSyncPlanState,
  readCanvasSyncStaging,
  recordCanvasSyncHealth,
  type CanvasSyncHealthItemInput,
  type CanvasSyncHealthScopeInput,
} from "./checkpoints";
import type { CanvasSyncJobServiceClient } from "./repository";

export type CanvasSyncFinalizeResult =
  | { readonly status: "succeeded"; readonly outcome: "success" | "unchanged" | "partial" }
  | { readonly status: "failed"; readonly retryable: boolean }
  | { readonly status: "cancelled" | "pending" };

export async function finalizeCheckpointedCanvasSync(
  client: CanvasSyncJobServiceClient,
  input: {
    readonly jobId: string;
    readonly workerId: string;
  },
): Promise<CanvasSyncFinalizeResult> {
  const state = await readCanvasSyncPlanState(client, input.jobId);
  if (!state.job) return { status: "failed", retryable: false };
  if (state.job.status === "cancellation_requested") {
    await cancelCheckpointedCanvasSyncJob(
      client,
      input.jobId,
      input.workerId,
    );
    return { status: "cancelled" };
  }
  if (
    state.units.some((unit) =>
      unit.status === "queued" ||
      unit.status === "running" ||
      unit.status === "retry_wait"
    )
  ) {
    return { status: "pending" };
  }

  const promotion = await beginCanvasSyncPromotion(
    client,
    input.jobId,
    input.workerId,
  );
  if (!promotion) {
    const latest = await readCanvasSyncPlanState(client, input.jobId);
    if (latest.job?.status === "cancellation_requested") {
      await cancelCheckpointedCanvasSyncJob(
        client,
        input.jobId,
        input.workerId,
      );
      return { status: "cancelled" };
    }
    await failCheckpointedCanvasSyncJob(client, {
      code: "canvas_sync_promotion_unavailable",
      jobId: input.jobId,
      message: "Canvas synchronization could not safely save its result.",
      retryable: true,
      workerId: input.workerId,
    });
    return { status: "failed", retryable: true };
  }

  const context = await loadCanvasSyncCheckpointContext(client, input.jobId);
  if (!context) {
    await failCheckpointedCanvasSyncJob(client, {
      code: "canvas_sync_context_missing",
      jobId: input.jobId,
      message: "Canvas synchronization context is unavailable.",
      retryable: false,
      workerId: input.workerId,
    });
    return { status: "failed", retryable: false };
  }

  const staging = await readCanvasSyncStaging(client, input.jobId);
  const provider = new StagedCanvasProvider(state.units, staging);
  let outcome: "success" | "unchanged" | "partial" | "failed";
  let resultSummary: Json;
  let promotedScopes: Readonly<Record<CanvasSyncScope, boolean>> = {
    announcements: false,
    content: false,
    files: false,
    grades: false,
  };

  if (context.job.job_type === "course_content") {
    const result = await syncSelectedCanvasCourse({
      canvasClient: provider,
      client,
      connection: context.connection,
      course: courseRowToCanvasCourse(context.course),
      courseRow: context.course,
      retryPolicy: {
        maxRetries: 0,
        sleep: async () => undefined,
      },
      userId: context.job.user_id,
    });
    if (!result.ok) {
      outcome = result.summary?.status === "partial" ? "partial" : "failed";
      if (result.summary) {
        promotedScopes = {
          ...promotedScopes,
          announcements:
            result.summary.scopeOutcomes.announcements === "succeeded",
          content: result.summary.scopeOutcomes.content === "succeeded",
          files: result.summary.scopeOutcomes.files === "succeeded",
        };
      }
      resultSummary = toJson({
        kind: "course_content",
        outcome,
        summary: result.summary ?? null,
      });
    } else {
      const changed =
        result.summary.inserted +
        result.summary.updated +
        result.summary.pruned;
      outcome = result.summary.status === "failed"
        ? "failed"
        : result.summary.status === "partial"
          ? "partial"
          : changed === 0
            ? "unchanged"
            : "success";
      promotedScopes = {
        ...promotedScopes,
        announcements:
          result.summary.scopeOutcomes.announcements === "succeeded",
        content: result.summary.scopeOutcomes.content === "succeeded",
        files: result.summary.scopeOutcomes.files === "succeeded",
      };
      resultSummary = toJson({
        kind: "course_content",
        outcome,
        summary: result.summary,
      });
    }
  } else {
    const result = await syncCanvasCourseGrades({
      client,
      courseId: context.course.id,
      dependencies: {
        createCanvasClient: () => provider,
      },
      userId: context.job.user_id,
    });
    outcome = result.status === "failed"
      ? "failed"
      : result.status === "partial"
        ? "partial"
        : result.assignmentSubmission.status === "unchanged" &&
            (
              result.courseGradeSummary.status === "unchanged" ||
              result.courseGradeSummary.status === "not_applicable"
            )
          ? "unchanged"
          : "success";
    promotedScopes = {
      ...promotedScopes,
      grades: result.status === "succeeded",
    };
    resultSummary = toJson({
      kind: "course_grades",
      outcome,
      summary: result,
    });
  }

  const health = createHealthEvidence(
    state.units,
    staging,
    outcome,
    promotedScopes,
  );
  await recordCanvasSyncHealth(client, {
    items: health.items,
    jobId: input.jobId,
    scopes: health.scopes,
  });

  if (outcome === "failed") {
    const retryable = state.units.some(
      (unit) => unit.status === "failed" && unit.retryable,
    );
    await failCheckpointedCanvasSyncJob(client, {
      code: firstFailureCode(state.units),
      jobId: input.jobId,
      message: "Canvas synchronization could not produce a complete safe result.",
      retryable,
      workerId: input.workerId,
    });
    return { status: "failed", retryable };
  }

  await completeCheckpointedCanvasSyncJob(client, {
    jobId: input.jobId,
    outcome,
    resultSummary,
    workerId: input.workerId,
  });
  return { status: "succeeded", outcome };
}

class StagedCanvasProvider implements CanvasCourseSyncProvider {
  private readonly unitById: ReadonlyMap<string, CanvasSyncJobUnitRow>;
  private readonly staging: readonly CanvasSyncJobStagingRow[];

  public constructor(
    units: readonly CanvasSyncJobUnitRow[],
    staging: readonly CanvasSyncJobStagingRow[],
  ) {
    this.unitById = new Map(units.map((unit) => [unit.id, unit]));
    this.staging = staging;
  }

  public async listModules(): Promise<readonly CanvasModule[]> {
    return this.pageItems<CanvasModule>("modules_page");
  }

  public async listModuleItems(
    _courseId: string,
    moduleId: string,
  ): Promise<readonly CanvasModuleItem[]> {
    return this.pageItems<CanvasModuleItem>("module_items_page", moduleId);
  }

  public async listPages(): Promise<readonly CanvasPageSummary[]> {
    return this.pageItems<CanvasPageSummary>("pages_page");
  }

  public async getPage(
    _courseId: string,
    pageUrl: string,
  ): Promise<CanvasPageDetail> {
    this.throwIfFailed(["page_detail", "page_detail_reuse"], pageUrl);
    const details = this.itemPayloads<CanvasPageDetail>([
      "page_detail",
      "page_detail_reuse",
    ]);
    const detail = details.find((item) => item.url === pageUrl);
    if (!detail) {
      throw new CanvasClientError(
        "canvas_not_found",
        "Canvas page detail was unavailable.",
      );
    }
    return detail;
  }

  public async listAssignmentGroups(): Promise<readonly CanvasAssignmentGroup[]> {
    return this.pageItems<CanvasAssignmentGroup>("assignment_groups_page");
  }

  public async listAssignments(): Promise<readonly CanvasAssignment[]> {
    return this.pageItems<CanvasAssignment>("assignments_page");
  }

  public async listAnnouncements(): Promise<readonly CanvasAnnouncement[]> {
    return this.pageItems<CanvasAnnouncement>("announcements_page");
  }

  public async listCourseFiles(): Promise<readonly CanvasFile[]> {
    return this.pageItems<CanvasFile>("files_page");
  }

  public async listCourseAssignments(): Promise<readonly CanvasGradeAssignment[]> {
    return this.pageItems<CanvasGradeAssignment>("grade_assignments_page");
  }

  public async listOwnCourseSubmissions(): Promise<readonly CanvasOwnSubmission[]> {
    return this.pageItems<CanvasOwnSubmission>("submissions_page");
  }

  public async getOwnCourseGradeSummary(): Promise<CanvasCourseGradeSummary> {
    const summaries = this.pageItems<CanvasCourseGradeSummary>(
      "grade_summary_page",
    );
    const summary = summaries.at(-1);
    if (!summary) {
      throw new CanvasClientError(
        "canvas_invalid_response",
        "Canvas grade summary was unavailable.",
      );
    }
    return summary;
  }

  private pageItems<TItem>(
    kind: string,
    parentSourceId?: string,
  ): readonly TItem[] {
    this.throwIfFailed([kind], parentSourceId);
    return this.staging
      .filter((row) => {
        const unit = this.unitById.get(row.unit_id);
        if (unit?.unit_kind !== kind) return false;
        if (!parentSourceId) return true;
        return readString(readRecord(row.payload).parentSourceId) === parentSourceId;
      })
      .sort((left, right) => {
        const leftUnit = this.unitById.get(left.unit_id);
        const rightUnit = this.unitById.get(right.unit_id);
        return (leftUnit?.page_index ?? 0) - (rightUnit?.page_index ?? 0);
      })
      .flatMap((row) =>
        readArray(readRecord(row.payload).items)
      ) as unknown as readonly TItem[];
  }

  private itemPayloads<TItem>(kinds: readonly string[]): readonly TItem[] {
    return this.staging
      .filter((row) => kinds.includes(this.unitById.get(row.unit_id)?.unit_kind ?? ""))
      .map((row) => readRecord(row.payload).item)
      .filter((item): item is Json =>
        item !== undefined
      ) as unknown as readonly TItem[];
  }

  private throwIfFailed(
    kinds: readonly string[],
    sourceId?: string,
  ): void {
    const failed = [...this.unitById.values()].find((unit) => {
      if (!kinds.includes(unit.unit_kind) || unit.status !== "failed") return false;
      if (!sourceId) return true;
      const checkpoint = readRecord(unit.checkpoint);
      return (
        readString(checkpoint.parentSourceId) === sourceId ||
        readString(checkpoint.pageUrl) === sourceId
      );
    });
    if (!failed) return;
    throw new CanvasClientError(
      failed.retryable ? "canvas_unavailable" : "canvas_forbidden",
      failed.safe_error_message ?? "Canvas synchronization evidence was incomplete.",
    );
  }
}

function createHealthEvidence(
  units: readonly CanvasSyncJobUnitRow[],
  staging: readonly CanvasSyncJobStagingRow[],
  outcome: "success" | "unchanged" | "partial" | "failed",
  promotedScopes: Readonly<Record<CanvasSyncScope, boolean>>,
): {
  readonly scopes: readonly CanvasSyncHealthScopeInput[];
  readonly items: readonly CanvasSyncHealthItemInput[];
} {
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const items = [
    ...staging.flatMap((row) => {
      const unit = unitById.get(row.unit_id);
      if (!unit) return [];
      return healthItemsForStaging(unit, row);
    }),
    ...units.flatMap(healthItemsForFailedUnit),
  ];
  const scopes = applicableScopes(units).map((scope) => {
    const scopeUnits = units.filter((unit) => unit.scope === scope);
    const failures = scopeUnits.filter((unit) => unit.status === "failed");
    const authoritative =
      promotedScopes[scope] &&
      failures.length === 0 &&
      scopeUnits.every((unit) => unit.status === "succeeded");
    const scopeItems = items.filter((item) => item.scope === scope);
    const syncedCount = scopeItems.filter(
      (item) => item.itemState === "synced",
    ).length;
    const metadataOnlyCount = scopeItems.filter((item) =>
      [
        "metadata_only",
        "locked",
        "unpublished",
        "permission_denied",
        "external",
        "unsupported_format",
      ].includes(item.itemState)
    ).length;
    const temporarilyFailedCount = scopeItems.filter(
      (item) => item.itemState === "temporarily_failed",
    ).length;
    return {
      scope,
      healthStatus: authoritative
        ? "healthy"
        : scopeItems.length > 0
          ? "partial"
          : outcome === "failed"
            ? "failed"
            : "stale",
      authoritative,
      syncedCount,
      metadataOnlyCount,
      temporarilyFailedCount,
      staleCount: authoritative ? 0 : Math.max(1, failures.length),
      deletedCount: 0,
      safeMessage: authoritative
        ? null
        : "Some Canvas data could not be refreshed. Last known good data was kept.",
      safeErrorCode: failures[0]?.safe_error_code ?? null,
      retryable: failures.some((unit) => unit.retryable),
    } satisfies CanvasSyncHealthScopeInput;
  });

  return { scopes, items };
}

function healthItemsForFailedUnit(
  unit: CanvasSyncJobUnitRow,
): readonly CanvasSyncHealthItemInput[] {
  if (
    unit.status !== "failed" ||
    (unit.unit_kind !== "page_detail" &&
      unit.unit_kind !== "page_detail_reuse")
  ) {
    return [];
  }
  const checkpoint = readRecord(unit.checkpoint);
  const summary = readRecord(checkpoint.pageSummary ?? {});
  const pageUrl = readString(checkpoint.pageUrl) ?? readString(summary.url);
  if (!pageUrl) return [];
  const itemState: CanvasSyncItemState =
    unit.safe_error_code === "canvas_permission_denied"
      ? "permission_denied"
      : unit.retryable
        ? "temporarily_failed"
        : "stale";
  return [{
    itemKeyHash: canvasSyncItemKeyHash("content", "page", pageUrl),
    itemKind: "page",
    itemState,
    safeErrorCode: unit.safe_error_code,
    scope: "content",
    sourceFingerprint: fingerprintCanvasSyncItem(summary),
    sourceUpdatedAt: readString(summary.updatedAt),
  }];
}

function healthItemsForStaging(
  unit: CanvasSyncJobUnitRow,
  staging: CanvasSyncJobStagingRow,
): readonly CanvasSyncHealthItemInput[] {
  if (unit.unit_kind === "pages_page") return [];
  const payload = readRecord(staging.payload);
  const items = unit.unit_kind === "page_detail" ||
      unit.unit_kind === "page_detail_reuse"
    ? [payload.item].filter((item): item is Json => item !== undefined)
    : readArray(payload.items);
  return items.flatMap((item) => {
    const identity = readItemIdentity(unit.unit_kind, item);
    if (!identity) return [];
    const record = readRecord(item);
    return [{
      scope: unit.scope,
      itemKind: identity.kind,
      itemKeyHash: canvasSyncItemKeyHash(
        unit.scope,
        identity.kind,
        identity.sourceId,
      ),
      itemState: itemStateForRecord(unit.scope, identity.kind, record),
      sourceUpdatedAt:
        readString(record.updatedAt) ??
        readString(record.modifiedAt) ??
        readString(record.postedAt),
      sourceFingerprint: fingerprintCanvasSyncItem(
        identity.kind === "page"
          ? {
              ...record,
              body: undefined,
            }
          : item,
      ),
      safeErrorCode: null,
    }];
  });
}

function readItemIdentity(
  unitKind: string,
  value: Json,
): { readonly kind: string; readonly sourceId: string } | null {
  const item = readRecord(value);
  switch (unitKind) {
    case "modules_page":
      return identity("module", item.id);
    case "module_items_page":
      return identity("module_item", item.id);
    case "page_detail":
    case "page_detail_reuse":
      return identity("page", item.url);
    case "assignment_groups_page":
      return identity("assignment_group", item.id);
    case "assignments_page":
      return identity("assignment", item.id);
    case "announcements_page":
      return identity("announcement", item.id);
    case "files_page":
      return identity("file", item.id);
    case "grade_assignments_page":
      return identity("grade_assignment", item.canvasAssignmentId);
    case "submissions_page":
      return identity("submission", item.canvasAssignmentId);
    case "grade_summary_page":
      return { kind: "grade_summary", sourceId: "course" };
    default:
      return null;
  }
}

function identity(
  kind: string,
  value: Json | undefined,
): { readonly kind: string; readonly sourceId: string } | null {
  const sourceId = readString(value);
  return sourceId ? { kind, sourceId } : null;
}

function itemStateForRecord(
  scope: CanvasSyncScope,
  kind: string,
  record: Record<string, Json | undefined>,
): CanvasSyncItemState {
  if (readBoolean(record.locked) || readBoolean(record.hiddenForUser)) {
    return "locked";
  }
  if (record.published === false) return "unpublished";
  if (kind === "module_item" && readString(record.externalUrl)) {
    return "external";
  }
  if (scope === "files" && !readString(record.downloadUrl)) {
    return "metadata_only";
  }
  return "synced";
}

function applicableScopes(
  units: readonly CanvasSyncJobUnitRow[],
): readonly CanvasSyncScope[] {
  return [...new Set(units.map((unit) => unit.scope))];
}

function firstFailureCode(units: readonly CanvasSyncJobUnitRow[]): string {
  return units.find((unit) => unit.status === "failed")?.safe_error_code ??
    "canvas_sync_failed";
}

function courseRowToCanvasCourse(
  row: Parameters<typeof syncSelectedCanvasCourse>[0]["courseRow"],
): CanvasCourse {
  return {
    id: row.canvas_course_id,
    name: row.name,
    courseCode: row.course_code,
    workflowState: row.workflow_state,
    enrollmentTermId: row.enrollment_term_id,
    accountId: row.account_id,
    startAt: row.start_at,
    endAt: row.end_at,
    timeZone: row.time_zone,
    publicSyllabus: row.public_syllabus,
    syllabusBody: row.syllabus_body,
    updatedAt: row.canvas_updated_at,
  };
}

function readRecord(value: Json): Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, Json | undefined>
    : {};
}

function readArray(value: Json | undefined): readonly Json[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: Json | undefined): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function readBoolean(value: Json | undefined): boolean {
  return value === true;
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}
