import type {
  CanvasAnnouncementRow,
  CanvasAssignmentRow,
  CanvasCourseSyncStateRow,
  CanvasFileRow,
  CanvasPageRow,
  CanvasSyncCourseResultRow,
  CanvasSyncRunRow,
  Database,
  ReviewerRow,
  ReviewerSourceSnapshotItemRow,
  ReviewerSourceSnapshotRow,
} from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  classifyStoredCanvasFileKind,
  isPreparedCanvasFileReadyForOcr,
} from "@/lib/canvas-stored-file-extraction";
import { normalizeCanvasHtmlToText } from "@/lib/canvas-reviewer-sources";
import { sha256Utf8Hex } from "@/lib/reviewer-source-provenance";

export type ReviewerSourceItemStatus =
  | "current"
  | "changed"
  | "unavailable"
  | "unsupported"
  | "missing_after_sync"
  | "unknown";

export type ReviewerSourceOverallStatus =
  | "current"
  | "changed"
  | "attention_required"
  | "unknown";

export type ReviewerRegenerationReadiness =
  | "ready_current"
  | "ready_with_changes"
  | "blocked_missing_sources"
  | "blocked_unavailable_sources"
  | "blocked_unsupported_sources"
  | "unknown";

export type ReviewerSourceStatusAction =
  | "prepare_updated_file"
  | "sync_canvas_course"
  | "choose_replacement_source"
  | "check_canvas_access"
  | "unsupported_source_type"
  | "status_unknown";

export interface ReviewerSourceStatusItem {
  readonly ordinal: number;
  readonly sourceType: "page" | "assignment" | "announcement" | "file";
  readonly title: string;
  readonly fileKind?: "pdf" | "image";
  readonly status: ReviewerSourceItemStatus;
  readonly action?: ReviewerSourceStatusAction;
  readonly message: string;
}

export interface ReviewerSourceStatusResponse {
  readonly checkedAt: string;
  readonly overallStatus: ReviewerSourceOverallStatus;
  readonly regenerationReadiness: ReviewerRegenerationReadiness;
  readonly counts: {
    readonly total: number;
    readonly current: number;
    readonly changed: number;
    readonly unavailable: number;
    readonly unsupported: number;
    readonly missingAfterSync: number;
    readonly unknown: number;
  };
  readonly actions: readonly ReviewerSourceStatusAction[];
  readonly items: readonly ReviewerSourceStatusItem[];
}

export type ReviewerSourceStatusErrorCode =
  | "reviewer_not_found"
  | "source_snapshot_storage_failed";

export type ReviewerSourceStatusResult =
  | { readonly ok: true; readonly value: ReviewerSourceStatusResponse }
  | {
      readonly ok: false;
      readonly status: 404 | 500;
      readonly code: ReviewerSourceStatusErrorCode;
      readonly message: string;
    };

const REVIEWER_STATUS_COLUMNS =
  "id,user_id,source_snapshot_id,source_metadata,created_at,updated_at";
const SNAPSHOT_COLUMNS =
  "id,user_id,preview_session_id,canvas_connection_id,course_id,source_mode,source_title,source_count,normalization_version,created_at";
const SNAPSHOT_ITEM_COLUMNS =
  "id,user_id,source_snapshot_id,ordinal,source_type,source_title,source_row_id,canvas_connection_id,course_id,canvas_course_id,canvas_source_object_id,module_id,module_item_id,file_id,file_kind,mime_type,page_count,canvas_updated_at,local_synced_at,normalized_content_sha256,stored_content_sha256,parser_version,ocr_version,created_at";
const SYNC_RUN_COLUMNS =
  "id,user_id,canvas_connection_id,scope_course_id,sync_mode,status,started_at,completed_at,heartbeat_at,discovered_course_count,successful_course_count,failed_course_count,resource_counts,failure_code,failure_summary,created_at,updated_at";
const COURSE_RESULT_COLUMNS =
  "id,sync_run_id,user_id,canvas_connection_id,course_fingerprint,status,failure_code,failed_operation,failure_category,http_status_class,retryable,retry_count,duration_ms,created_at,updated_at";
const SYNC_STATE_COLUMNS =
  "id,user_id,canvas_connection_id,canvas_course_id,course_id,snapshot_fingerprint,fingerprint_version,last_checked_at,last_changed_at,last_successful_sync_at,consecutive_failure_count,last_failure_code,created_at,updated_at";

interface CurrentSourceRows {
  readonly pages: readonly CanvasPageRow[];
  readonly assignments: readonly CanvasAssignmentRow[];
  readonly announcements: readonly CanvasAnnouncementRow[];
  readonly files: readonly CanvasFileRow[];
}

interface SyncAuthority {
  readonly latestRun: CanvasSyncRunRow | null;
  readonly latestCourseResult: CanvasSyncCourseResultRow | null;
  readonly syncState: CanvasCourseSyncStateRow | null;
}

export async function readReviewerSourceStatus({
  checkedAt = new Date().toISOString(),
  client,
  reviewerId,
  userId,
}: {
  readonly checkedAt?: string;
  readonly client: SupabaseClient<Database>;
  readonly reviewerId: string;
  readonly userId: string;
}): Promise<ReviewerSourceStatusResult> {
  const reviewer = await readOwnedReviewer({ client, reviewerId, userId });
  if (!reviewer.ok) {
    return reviewer;
  }
  if (!reviewer.value.source_snapshot_id) {
    return {
      ok: true,
      value: buildResponse({
        checkedAt,
        items: [],
      }),
    };
  }

  const snapshot = await readOwnedSnapshot({
    client,
    sourceSnapshotId: reviewer.value.source_snapshot_id,
    userId,
  });
  if (!snapshot.ok) {
    return snapshot;
  }

  const items = await readSnapshotItems({
    client,
    sourceSnapshotId: snapshot.value.id,
    userId,
  });
  if (!items.ok) {
    return storageFailed("Canvas source snapshot items could not be loaded.");
  }

  const [currentRows, syncAuthority] = await Promise.all([
    readCurrentSourceRows({
      client,
      connectionId: snapshot.value.canvas_connection_id,
      courseId: snapshot.value.course_id,
      items: items.value,
      userId,
    }),
    readSyncAuthority({
      client,
      connectionId: snapshot.value.canvas_connection_id,
      courseId: snapshot.value.course_id,
      userId,
    }),
  ]);
  if (!currentRows.ok || !syncAuthority.ok) {
    return storageFailed("Current Canvas source state could not be loaded.");
  }

  return {
    ok: true,
    value: buildResponse({
      checkedAt,
      items: items.value.map((item) =>
        evaluateSnapshotItem({
          authority: syncAuthority.value,
          currentRows: currentRows.value,
          item,
          snapshot: snapshot.value,
        }),
      ),
    }),
  };
}

function evaluateSnapshotItem({
  authority,
  currentRows,
  item,
  snapshot,
}: {
  readonly authority: SyncAuthority;
  readonly currentRows: CurrentSourceRows;
  readonly item: ReviewerSourceSnapshotItemRow;
  readonly snapshot: ReviewerSourceSnapshotRow;
}): ReviewerSourceStatusItem {
  switch (item.source_type) {
    case "page":
      return evaluateTextSource({
        bodyHtml: (row) => row.body_html,
        currentRow: findCurrentPage(currentRows.pages, item),
        item,
        snapshot,
        unavailable: (row) =>
          row.published === false ||
          row.lock_info !== null ||
          isLockedByDate(row.unlock_at, row.lock_at),
        authority,
      });
    case "assignment":
      return evaluateTextSource({
        bodyHtml: (row) => row.description_html,
        currentRow: findCurrentAssignment(currentRows.assignments, item),
        item,
        snapshot,
        unavailable: (row) =>
          row.published === false || isLockedByDate(row.unlock_at, row.lock_at),
        authority,
      });
    case "announcement":
      return evaluateTextSource({
        bodyHtml: (row) => row.message_html,
        currentRow: findCurrentAnnouncement(currentRows.announcements, item),
        item,
        snapshot,
        unavailable: (row) =>
          row.published === false ||
          row.locked === true ||
          isLockedByDate(null, row.lock_at),
        authority,
      });
    case "file":
      return evaluateFileSource({
        authority,
        currentRow: findCurrentFile(currentRows.files, item),
        item,
        snapshot,
      });
  }
}

function evaluateTextSource<TRow>({
  authority,
  bodyHtml,
  currentRow,
  item,
  snapshot,
  unavailable,
}: {
  readonly authority: SyncAuthority;
  readonly bodyHtml: (row: TRow) => string | null;
  readonly currentRow: TRow | null;
  readonly item: ReviewerSourceSnapshotItemRow;
  readonly snapshot: ReviewerSourceSnapshotRow;
  readonly unavailable: (row: TRow) => boolean;
}): ReviewerSourceStatusItem {
  if (!hasStableIdentity(item)) {
    return statusItem(item, "unknown", {
      action: "status_unknown",
      message: "This historical source does not have enough identity data to compare safely.",
    });
  }
  if (!currentRow) {
    return missingOrUnknownStatus({ authority, item, snapshot });
  }

  const currentText = normalizeCanvasHtmlToText(bodyHtml(currentRow));
  if (unavailable(currentRow) || currentText.length === 0) {
    return statusItem(item, "unavailable", {
      action: "check_canvas_access",
      message: "This source is currently unavailable for reviewer rebuilds.",
    });
  }

  const currentHash = sha256Utf8Hex(currentText);
  if (currentHash === item.normalized_content_sha256) {
    return statusItem(item, "current", {
      message: "This source still matches the saved snapshot.",
    });
  }

  return statusItem(item, "changed", {
    action: "sync_canvas_course",
    message: "This source has changed since the reviewer was saved.",
  });
}

function evaluateFileSource({
  authority,
  currentRow,
  item,
  snapshot,
}: {
  readonly authority: SyncAuthority;
  readonly currentRow: CanvasFileRow | null;
  readonly item: ReviewerSourceSnapshotItemRow;
  readonly snapshot: ReviewerSourceSnapshotRow;
}): ReviewerSourceStatusItem {
  if (!hasStableIdentity(item)) {
    return statusItem(item, "unknown", {
      action: "status_unknown",
      message: "This historical file source does not have enough identity data to compare safely.",
    });
  }
  if (!currentRow) {
    return missingOrUnknownStatus({ authority, item, snapshot });
  }

  if (isFileUnavailable(currentRow)) {
    return statusItem(item, "unavailable", {
      action: "check_canvas_access",
      message: "This file is currently unavailable for reviewer rebuilds.",
    });
  }

  const currentKind = classifyStoredCanvasFileKind(currentRow);
  if (currentKind === "unsupported") {
    return statusItem(item, "unsupported", {
      action: "unsupported_source_type",
      message: "This file type is not supported by the current source parser.",
    });
  }

  const snapshotHash = normalizeSha256(item.stored_content_sha256);
  const currentHash = normalizeSha256(currentRow.current_sha256);
  if (!snapshotHash || !currentHash) {
    return statusItem(item, "unknown", {
      action: "status_unknown",
      message: "This file cannot be compared without additional prepared content metadata.",
    });
  }

  if (!isPreparedCanvasFileReadyForOcr(currentRow)) {
    if (currentHash !== snapshotHash) {
      return statusItem(item, "changed", {
        action: "prepare_updated_file",
        message: "This file appears updated and needs preparation before rebuilds.",
      });
    }
    return statusItem(item, "unavailable", {
      action: "prepare_updated_file",
      message: "This file needs preparation before it can be reused.",
    });
  }

  if (currentHash === snapshotHash) {
    return statusItem(item, "current", {
      message: "This prepared file still matches the saved snapshot.",
    });
  }

  return statusItem(item, "changed", {
    message: "This prepared file has changed since the reviewer was saved.",
  });
}

function missingOrUnknownStatus({
  authority,
  item,
  snapshot,
}: {
  readonly authority: SyncAuthority;
  readonly item: ReviewerSourceSnapshotItemRow;
  readonly snapshot: ReviewerSourceSnapshotRow;
}): ReviewerSourceStatusItem {
  if (hasAuthoritativeLaterSync({ authority, item, snapshot })) {
    return statusItem(item, "missing_after_sync", {
      action: "choose_replacement_source",
      message: "This source was not found after the latest complete synchronization.",
    });
  }
  return statusItem(item, "unknown", {
    action: "sync_canvas_course",
    message: "This source was not found, but the current synchronization evidence is incomplete.",
  });
}

function hasAuthoritativeLaterSync({
  authority,
  item,
  snapshot,
}: {
  readonly authority: SyncAuthority;
  readonly item: ReviewerSourceSnapshotItemRow;
  readonly snapshot: ReviewerSourceSnapshotRow;
}): boolean {
  const threshold = Math.max(
    Date.parse(snapshot.created_at),
    item.local_synced_at ? Date.parse(item.local_synced_at) : 0,
  );
  if (!Number.isFinite(threshold)) {
    return false;
  }

  if (item.source_type === "announcement" || item.source_type === "file") {
    const completedAt = Date.parse(authority.latestRun?.completed_at ?? "");
    return (
      authority.latestRun?.status === "succeeded" &&
      Number.isFinite(completedAt) &&
      completedAt > threshold
    );
  }

  const resultCompletedAt = Date.parse(authority.latestRun?.completed_at ?? "");
  const stateCompletedAt = Date.parse(
    authority.syncState?.last_successful_sync_at ?? "",
  );
  return (
    ((authority.latestCourseResult?.status === "succeeded" ||
      authority.latestCourseResult?.status === "unchanged") &&
      Number.isFinite(resultCompletedAt) &&
      resultCompletedAt > threshold) ||
    (Number.isFinite(stateCompletedAt) && stateCompletedAt > threshold)
  );
}

function buildResponse({
  checkedAt,
  items,
}: {
  readonly checkedAt: string;
  readonly items: readonly ReviewerSourceStatusItem[];
}): ReviewerSourceStatusResponse {
  const counts = {
    changed: countStatus(items, "changed"),
    current: countStatus(items, "current"),
    missingAfterSync: countStatus(items, "missing_after_sync"),
    total: items.length,
    unavailable: countStatus(items, "unavailable"),
    unknown: countStatus(items, "unknown"),
    unsupported: countStatus(items, "unsupported"),
  };
  const regenerationReadiness = readinessForCounts(counts);
  return {
    actions: collectActions(items),
    checkedAt,
    counts,
    items,
    overallStatus: overallStatusForCounts(counts),
    regenerationReadiness,
  };
}

function overallStatusForCounts(
  counts: ReviewerSourceStatusResponse["counts"],
): ReviewerSourceOverallStatus {
  if (counts.total === 0) {
    return "unknown";
  }
  if (
    counts.missingAfterSync > 0 ||
    counts.unavailable > 0 ||
    counts.unsupported > 0
  ) {
    return "attention_required";
  }
  if (counts.unknown > 0) {
    return "unknown";
  }
  if (counts.changed > 0) {
    return "changed";
  }
  return "current";
}

function readinessForCounts(
  counts: ReviewerSourceStatusResponse["counts"],
): ReviewerRegenerationReadiness {
  if (counts.total === 0) {
    return "unknown";
  }
  if (counts.missingAfterSync > 0) {
    return "blocked_missing_sources";
  }
  if (counts.unavailable > 0) {
    return "blocked_unavailable_sources";
  }
  if (counts.unsupported > 0) {
    return "blocked_unsupported_sources";
  }
  if (counts.unknown > 0) {
    return "unknown";
  }
  if (counts.changed > 0) {
    return "ready_with_changes";
  }
  return "ready_current";
}

function countStatus(
  items: readonly ReviewerSourceStatusItem[],
  status: ReviewerSourceItemStatus,
): number {
  return items.filter((item) => item.status === status).length;
}

function collectActions(
  items: readonly ReviewerSourceStatusItem[],
): readonly ReviewerSourceStatusAction[] {
  return [
    ...new Set(
      items
        .map((item) => item.action)
        .filter((action): action is ReviewerSourceStatusAction => Boolean(action)),
    ),
  ].sort();
}

function statusItem(
  item: ReviewerSourceSnapshotItemRow,
  status: ReviewerSourceItemStatus,
  details: {
    readonly action?: ReviewerSourceStatusAction;
    readonly message: string;
  },
): ReviewerSourceStatusItem {
  return {
    ...(item.file_kind ? { fileKind: item.file_kind } : {}),
    ...(details.action ? { action: details.action } : {}),
    message: details.message,
    ordinal: item.ordinal,
    sourceType: item.source_type,
    status,
    title: item.source_title,
  };
}

function findCurrentPage(
  rows: readonly CanvasPageRow[],
  item: ReviewerSourceSnapshotItemRow,
): CanvasPageRow | null {
  return (
    rows.find(
      (row) =>
        row.canvas_page_id === item.canvas_source_object_id ||
        row.canvas_page_url === item.canvas_source_object_id,
    ) ?? null
  );
}

function findCurrentAssignment(
  rows: readonly CanvasAssignmentRow[],
  item: ReviewerSourceSnapshotItemRow,
): CanvasAssignmentRow | null {
  return (
    rows.find((row) => row.canvas_assignment_id === item.canvas_source_object_id) ??
    null
  );
}

function findCurrentAnnouncement(
  rows: readonly CanvasAnnouncementRow[],
  item: ReviewerSourceSnapshotItemRow,
): CanvasAnnouncementRow | null {
  return (
    rows.find(
      (row) => row.canvas_announcement_id === item.canvas_source_object_id,
    ) ?? null
  );
}

function findCurrentFile(
  rows: readonly CanvasFileRow[],
  item: ReviewerSourceSnapshotItemRow,
): CanvasFileRow | null {
  return rows.find((row) => row.canvas_file_id === item.canvas_source_object_id) ?? null;
}

function hasStableIdentity(item: ReviewerSourceSnapshotItemRow): boolean {
  return Boolean(item.canvas_source_object_id?.trim());
}

function isFileUnavailable(row: CanvasFileRow): boolean {
  return (
    row.availability_status !== "available" ||
    row.locked === true ||
    row.hidden === true ||
    row.hidden_for_user === true ||
    row.ingestion_eligibility === "blocked_locked" ||
    row.ingestion_eligibility === "blocked_unavailable"
  );
}

function isLockedByDate(
  unlockAt: string | null,
  lockAt: string | null,
): boolean {
  const now = Date.now();
  const unlockTime = Date.parse(unlockAt ?? "");
  if (Number.isFinite(unlockTime) && unlockTime > now) {
    return true;
  }
  const lockTime = Date.parse(lockAt ?? "");
  return Number.isFinite(lockTime) && lockTime <= now;
}

async function readOwnedReviewer({
  client,
  reviewerId,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly reviewerId: string;
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly value: ReviewerRow }
  | Extract<ReviewerSourceStatusResult, { readonly ok: false }>
> {
  const { data, error } = await client
    .from("reviewers")
    .select(REVIEWER_STATUS_COLUMNS)
    .eq("id", reviewerId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return storageFailed("Saved reviewer could not be checked.");
  }
  if (!data) {
    return {
      ok: false,
      status: 404,
      code: "reviewer_not_found",
      message: "Saved reviewer was not found.",
    };
  }
  return { ok: true, value: data as ReviewerRow };
}

async function readOwnedSnapshot({
  client,
  sourceSnapshotId,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly sourceSnapshotId: string;
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly value: ReviewerSourceSnapshotRow }
  | Extract<ReviewerSourceStatusResult, { readonly ok: false }>
> {
  const { data, error } = await client
    .from("reviewer_source_snapshots")
    .select(SNAPSHOT_COLUMNS)
    .eq("id", sourceSnapshotId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return storageFailed("Canvas source snapshot could not be loaded.");
  }
  if (!data) {
    return storageFailed("Canvas source snapshot could not be loaded.");
  }
  return { ok: true, value: data as ReviewerSourceSnapshotRow };
}

async function readSnapshotItems({
  client,
  sourceSnapshotId,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly sourceSnapshotId: string;
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly value: readonly ReviewerSourceSnapshotItemRow[] }
  | { readonly ok: false }
> {
  const { data, error } = await client
    .from("reviewer_source_snapshot_items")
    .select(SNAPSHOT_ITEM_COLUMNS)
    .eq("source_snapshot_id", sourceSnapshotId)
    .eq("user_id", userId)
    .order("ordinal", { ascending: true });

  if (error || !data) {
    return { ok: false };
  }
  return { ok: true, value: data as readonly ReviewerSourceSnapshotItemRow[] };
}

async function readCurrentSourceRows({
  client,
  connectionId,
  courseId,
  items,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly courseId: string;
  readonly items: readonly ReviewerSourceSnapshotItemRow[];
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly value: CurrentSourceRows }
  | { readonly ok: false }
> {
  const needs = new Set(items.map((item) => item.source_type));
  const [pages, assignments, announcements, files] = await Promise.all([
    needs.has("page")
      ? readCurrentRows<CanvasPageRow>({ client, connectionId, courseId, table: "canvas_pages", userId })
      : ({ ok: true, value: [] } as const),
    needs.has("assignment")
      ? readCurrentRows<CanvasAssignmentRow>({
          client,
          connectionId,
          courseId,
          table: "canvas_assignments",
          userId,
        })
      : ({ ok: true, value: [] } as const),
    needs.has("announcement")
      ? readCurrentRows<CanvasAnnouncementRow>({
          client,
          connectionId,
          courseId,
          table: "canvas_announcements",
          userId,
        })
      : ({ ok: true, value: [] } as const),
    needs.has("file")
      ? readCurrentRows<CanvasFileRow>({ client, connectionId, courseId, table: "canvas_files", userId })
      : ({ ok: true, value: [] } as const),
  ]);

  if (!pages.ok || !assignments.ok || !announcements.ok || !files.ok) {
    return { ok: false };
  }
  return {
    ok: true,
    value: {
      announcements: announcements.value,
      assignments: assignments.value,
      files: files.value,
      pages: pages.value,
    },
  };
}

async function readCurrentRows<TRow>({
  client,
  connectionId,
  courseId,
  table,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly courseId: string;
  readonly table:
    | "canvas_pages"
    | "canvas_assignments"
    | "canvas_announcements"
    | "canvas_files";
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly value: readonly TRow[] }
  | { readonly ok: false }
> {
  const { data, error } = await client
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .eq("canvas_connection_id", connectionId)
    .eq("course_id", courseId);

  if (error || !data) {
    return { ok: false };
  }
  return { ok: true, value: data as unknown as readonly TRow[] };
}

async function readSyncAuthority({
  client,
  connectionId,
  courseId,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly courseId: string;
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly value: SyncAuthority }
  | { readonly ok: false }
> {
  const latestRun = await readLatestCourseRun({
    client,
    connectionId,
    courseId,
    userId,
  });
  if (!latestRun.ok) {
    return { ok: false };
  }
  const latestCourseResult = latestRun.value
    ? await readLatestCourseResult({
        client,
        connectionId,
        syncRunId: latestRun.value.id,
        userId,
      })
    : ({ ok: true, value: null } as const);
  const syncState = await readCourseSyncState({
    client,
    connectionId,
    courseId,
    userId,
  });
  if (!latestCourseResult.ok || !syncState.ok) {
    return { ok: false };
  }
  return {
    ok: true,
    value: {
      latestCourseResult: latestCourseResult.value,
      latestRun: latestRun.value,
      syncState: syncState.value,
    },
  };
}

async function readLatestCourseRun({
  client,
  connectionId,
  courseId,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly courseId: string;
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly value: CanvasSyncRunRow | null }
  | { readonly ok: false }
> {
  const { data, error } = await client
    .from("canvas_sync_runs")
    .select(SYNC_RUN_COLUMNS)
    .eq("user_id", userId)
    .eq("canvas_connection_id", connectionId)
    .eq("scope_course_id", courseId)
    .eq("sync_mode", "course")
    .neq("status", "running")
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false };
  }
  return { ok: true, value: data as CanvasSyncRunRow | null };
}

async function readLatestCourseResult({
  client,
  connectionId,
  syncRunId,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly syncRunId: string;
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly value: CanvasSyncCourseResultRow | null }
  | { readonly ok: false }
> {
  const { data, error } = await client
    .from("canvas_sync_course_results")
    .select(COURSE_RESULT_COLUMNS)
    .eq("user_id", userId)
    .eq("canvas_connection_id", connectionId)
    .eq("sync_run_id", syncRunId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false };
  }
  return { ok: true, value: data as CanvasSyncCourseResultRow | null };
}

async function readCourseSyncState({
  client,
  connectionId,
  courseId,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly courseId: string;
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly value: CanvasCourseSyncStateRow | null }
  | { readonly ok: false }
> {
  const { data, error } = await client
    .from("canvas_course_sync_states")
    .select(SYNC_STATE_COLUMNS)
    .eq("user_id", userId)
    .eq("canvas_connection_id", connectionId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (error) {
    return { ok: false };
  }
  return { ok: true, value: data as CanvasCourseSyncStateRow | null };
}

function normalizeSha256(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized && /^[a-f0-9]{64}$/.test(normalized) ? normalized : null;
}

function storageFailed(message: string): Extract<
  ReviewerSourceStatusResult,
  { readonly ok: false }
> {
  return {
    ok: false,
    status: 500,
    code: "source_snapshot_storage_failed",
    message,
  };
}
