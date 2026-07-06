import type {
  CanvasCourse,
  CanvasCourseEnrollment,
  CanvasCourseSection,
  CanvasCourseTerm,
} from "@stay-focused/canvas";
import type {
  CanvasCourseInsert,
  CanvasCourseRow,
  CanvasCourseSyncPreferenceRow,
  CanvasCourseSyncPreferencesReplacementResult,
  CanvasCourseSyncStateRow,
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
import type { CanvasApiErrorCode } from "@/types/canvas";

const COURSE_COLUMNS =
  "id,user_id,canvas_connection_id,canvas_course_id,name,course_code,workflow_state,enrollment_term_id,account_id,start_at,end_at,time_zone,public_syllabus,syllabus_body,canvas_updated_at,first_synced_at,last_synced_at,created_at,updated_at";
const PREFERENCE_COLUMNS =
  "id,user_id,canvas_connection_id,course_id,selected,display_order,selected_at,created_at,updated_at";
const SYNC_STATE_COLUMNS =
  "id,user_id,canvas_connection_id,canvas_course_id,course_id,snapshot_fingerprint,fingerprint_version,last_checked_at,last_changed_at,last_successful_sync_at,consecutive_failure_count,last_failure_code,created_at,updated_at";
const SYNC_RUN_COLUMNS =
  "id,user_id,canvas_connection_id,scope_course_id,sync_mode,status,started_at,completed_at,heartbeat_at,discovered_course_count,successful_course_count,failed_course_count,resource_counts,failure_code,failure_summary,created_at,updated_at";

export type CanvasCourseClassification =
  | "likely_current"
  | "past_or_concluded"
  | "other_or_uncertain"
  | "unavailable";

export interface CanvasCourseInventoryItem {
  readonly id: string;
  readonly displayName: string;
  readonly courseCode: string | null;
  readonly workflowState: string | null;
  readonly startAt: string | null;
  readonly endAt: string | null;
  readonly term: CanvasCourseTerm | null;
  readonly classification: CanvasCourseClassification;
  readonly selectable: boolean;
  readonly unavailableReason: string | null;
  readonly selected: boolean;
  readonly lastSync: CanvasCourseLastSync | null;
}

export interface CanvasCourseLastSync {
  readonly status: "running" | "success" | "partial" | "failed";
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly lastCheckedAt: string | null;
  readonly lastSuccessfulSyncAt: string | null;
  readonly failureCode: string | null;
}

export interface CanvasCourseInventoryCounts {
  readonly total: number;
  readonly likelyCurrent: number;
  readonly pastOrConcluded: number;
  readonly otherOrUncertain: number;
  readonly unavailable: number;
}

export interface CanvasCourseInventory {
  readonly connection: CanvasConnectionRow;
  readonly courses: readonly CanvasCourseInventoryItem[];
  readonly counts: CanvasCourseInventoryCounts;
  readonly selectedCourseIds: readonly string[];
}

export type CanvasCourseSelectionResult<TValue> =
  | { readonly ok: true; readonly value: TValue }
  | {
      readonly ok: false;
      readonly status: 400 | 401 | 403 | 404 | 409 | 429 | 500 | 502 | 503 | 504;
      readonly code: CanvasApiErrorCode;
      readonly message: string;
    };

export async function loadCanvasCourseInventory({
  client,
  now = new Date(),
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly now?: Date;
  readonly userId: string;
}): Promise<CanvasCourseSelectionResult<CanvasCourseInventory>> {
  const connection = await loadConnectionAndToken(client, userId);
  if (!connection.ok) {
    return connection;
  }

  let liveCourses: readonly CanvasCourse[];
  try {
    liveCourses = await createCanvasClient(
      connection.value.connection.base_url,
      connection.value.token,
    ).listCourseInventory();
  } catch (error) {
    const mapped = mapCanvasClientError(error);
    return {
      ok: false,
      status: mapped.status,
      code: mapped.code,
      message: mapped.message,
    };
  }

  const courseRows = await upsertCanvasCourseInventory({
    client,
    connection: connection.value.connection,
    courses: liveCourses,
    userId,
  });
  if (!courseRows.ok) {
    return {
      ok: false,
      status: 500,
      code: "canvas_storage_failed",
      message: "Canvas course inventory could not be saved.",
    };
  }

  const preferences = await readCoursePreferences({
    client,
    connectionId: connection.value.connection.id,
    userId,
  });
  if (!preferences.ok) {
    return {
      ok: false,
      status: 500,
      code: "canvas_storage_failed",
      message: "Canvas course preferences could not be loaded.",
    };
  }

  const liveRowIds = new Set(courseRows.value.map((row) => row.id));
  const missingSelectedCourseIds = preferences.value
    .filter((preference) => preference.selected && !liveRowIds.has(preference.course_id))
    .map((preference) => preference.course_id);
  const historicalRows =
    missingSelectedCourseIds.length === 0
      ? ({ ok: true, value: [] } as const)
      : await readCourseRowsByIds({
          client,
          connectionId: connection.value.connection.id,
          courseIds: missingSelectedCourseIds,
          userId,
        });
  if (!historicalRows.ok) {
    return {
      ok: false,
      status: 500,
      code: "canvas_storage_failed",
      message: "Canvas course inventory could not be loaded.",
    };
  }

  const allRows = [...courseRows.value, ...historicalRows.value];
  const syncStates = await readCourseSyncStates({
    client,
    connectionId: connection.value.connection.id,
    userId,
  });
  if (!syncStates.ok) {
    return {
      ok: false,
      status: 500,
      code: "canvas_storage_failed",
      message: "Canvas course status could not be loaded.",
    };
  }

  const scopedRuns = await readLatestScopedRuns({
    client,
    connectionId: connection.value.connection.id,
    courseIds: allRows.map((row) => row.id),
    userId,
  });
  if (!scopedRuns.ok) {
    return {
      ok: false,
      status: 500,
      code: "canvas_storage_failed",
      message: "Canvas course status could not be loaded.",
    };
  }

  const preferencesByCourseId = new Map(
    preferences.value.map((preference) => [preference.course_id, preference]),
  );
  const statesByCourseId = new Map(
    syncStates.value
      .filter((state) => state.course_id)
      .map((state) => [state.course_id as string, state]),
  );
  const runsByCourseId = latestRunByCourseId(scopedRuns.value);
  const liveCoursesByCanvasId = new Map(
    liveCourses.map((course) => [course.id, course]),
  );

  const courses = allRows
    .map((row) => {
      const liveCourse = liveCoursesByCanvasId.get(row.canvas_course_id) ?? null;
      return mapInventoryItem({
        liveCourse,
        now,
        preference: preferencesByCourseId.get(row.id) ?? null,
        row,
        run: runsByCourseId.get(row.id) ?? null,
        state: statesByCourseId.get(row.id) ?? null,
      });
    })
    .sort(compareInventoryItems);

  const selectedCourseIds = preferences.value
    .filter((preference) => preference.selected)
    .sort(comparePreferences)
    .map((preference) => preference.course_id);

  return {
    ok: true,
    value: {
      connection: connection.value.connection,
      courses,
      counts: countClassifications(courses),
      selectedCourseIds,
    },
  };
}

export async function saveCanvasCoursePreferences({
  client,
  selectedCourseIds,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly selectedCourseIds: readonly string[];
  readonly userId: string;
}): Promise<
  CanvasCourseSelectionResult<{
    readonly selectedCourseIds: readonly string[];
    readonly selectedCount: number;
    readonly deselectedCount: number;
  }>
> {
  const inventory = await loadCanvasCourseInventory({ client, userId });
  if (!inventory.ok) {
    return inventory;
  }

  const requested = normalizeCourseIdSelection(selectedCourseIds);
  if (!requested.ok) {
    return requested;
  }

  const coursesById = new Map(
    inventory.value.courses.map((course) => [course.id, course]),
  );
  for (const courseId of requested.value) {
    const course = coursesById.get(courseId);
    if (!course) {
      return {
        ok: false,
        status: 400,
        code: "invalid_request",
        message: "Selected course IDs must belong to the active Canvas connection.",
      };
    }
    if (!course.selectable) {
      return {
        ok: false,
        status: 400,
        code: "invalid_request",
        message: "Unavailable Canvas courses cannot be selected for synchronization.",
      };
    }
  }

  const { data, error } = await client
    .rpc("replace_canvas_course_sync_preferences", {
      p_canvas_connection_id: inventory.value.connection.id,
      p_selected_at: new Date().toISOString(),
      p_selected_course_ids: [...requested.value],
      p_user_id: userId,
    })
    .single();

  if (error || !data) {
    return {
      ok: false,
      status: 500,
      code: "canvas_storage_failed",
      message: "Canvas course preferences could not be saved.",
    };
  }

  const result = data as CanvasCourseSyncPreferencesReplacementResult;
  return {
    ok: true,
    value: {
      deselectedCount: result.deselected_count,
      selectedCount: result.selected_count,
      selectedCourseIds: requested.value,
    },
  };
}

export async function loadSelectedSyncCourse({
  client,
  courseId,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly courseId: string;
  readonly userId: string;
}): Promise<
  CanvasCourseSelectionResult<{
    readonly connection: CanvasConnectionRow;
    readonly course: CanvasCourse;
    readonly courseRow: CanvasCourseRow;
  }>
> {
  const inventory = await loadCanvasCourseInventory({ client, userId });
  if (!inventory.ok) {
    return inventory;
  }

  const course = inventory.value.courses.find((item) => item.id === courseId);
  if (!course) {
    return {
      ok: false,
      status: 404,
      code: "canvas_course_not_found",
      message: "Canvas course was not found for this connection.",
    };
  }
  if (!course.selected) {
    return {
      ok: false,
      status: 400,
      code: "canvas_course_not_selected",
      message: "Select the Canvas course before synchronizing it.",
    };
  }
  if (!course.selectable) {
    return {
      ok: false,
      status: 400,
      code: "canvas_course_unavailable",
      message: "This Canvas course is not currently available for synchronization.",
    };
  }

  const courseRow = await readCourseRowById({
    client,
    connectionId: inventory.value.connection.id,
    courseId,
    userId,
  });
  if (!courseRow.ok || !courseRow.value) {
    return {
      ok: false,
      status: 404,
      code: "canvas_course_not_found",
      message: "Canvas course was not found for this connection.",
    };
  }

  return {
    ok: true,
    value: {
      connection: inventory.value.connection,
      course: courseItemToCanvasCourse(course, courseRow.value),
      courseRow: courseRow.value,
    },
  };
}

async function loadConnectionAndToken(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<
  CanvasCourseSelectionResult<{
    readonly connection: CanvasConnectionRow;
    readonly token: string;
  }>
> {
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
      message: "Connect Canvas before loading courses.",
    };
  }

  try {
    return {
      ok: true,
      value: {
        connection: connection.row,
        token: decryptConnectionToken(connection.row),
      },
    };
  } catch {
    return {
      ok: false,
      status: 500,
      code: "canvas_connection_corrupt",
      message: "Canvas connection credentials could not be used.",
    };
  }
}

async function upsertCanvasCourseInventory({
  client,
  connection,
  courses,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connection: CanvasConnectionRow;
  readonly courses: readonly CanvasCourse[];
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly value: readonly CanvasCourseRow[] }
  | { readonly ok: false }
> {
  if (courses.length === 0) {
    return { ok: true, value: [] };
  }

  const rows: CanvasCourseInsert[] = courses.map((course) => ({
    account_id: course.accountId,
    canvas_connection_id: connection.id,
    canvas_course_id: course.id,
    canvas_updated_at: safeDate(course.updatedAt),
    course_code: course.courseCode,
    end_at: safeDate(course.endAt),
    enrollment_term_id: course.enrollmentTermId,
    name: course.name,
    public_syllabus: course.publicSyllabus,
    start_at: safeDate(course.startAt),
    syllabus_body: course.syllabusBody,
    time_zone: course.timeZone,
    user_id: userId,
    workflow_state: course.workflowState,
  }));

  const { data, error } = await client
    .from("canvas_courses")
    .upsert(rows, {
      onConflict: "user_id,canvas_connection_id,canvas_course_id",
    })
    .select(COURSE_COLUMNS);

  if (error || !data) {
    return { ok: false };
  }

  return { ok: true, value: data as readonly CanvasCourseRow[] };
}

async function readCoursePreferences({
  client,
  connectionId,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly value: readonly CanvasCourseSyncPreferenceRow[] }
  | { readonly ok: false }
> {
  const { data, error } = await client
    .from("canvas_course_sync_preferences")
    .select(PREFERENCE_COLUMNS)
    .eq("user_id", userId)
    .eq("canvas_connection_id", connectionId)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (error || !data) {
    return { ok: false };
  }
  return {
    ok: true,
    value: data as readonly CanvasCourseSyncPreferenceRow[],
  };
}

async function readCourseSyncStates({
  client,
  connectionId,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly value: readonly CanvasCourseSyncStateRow[] }
  | { readonly ok: false }
> {
  const { data, error } = await client
    .from("canvas_course_sync_states")
    .select(SYNC_STATE_COLUMNS)
    .eq("user_id", userId)
    .eq("canvas_connection_id", connectionId);

  if (error || !data) {
    return { ok: false };
  }
  return { ok: true, value: data as readonly CanvasCourseSyncStateRow[] };
}

async function readLatestScopedRuns({
  client,
  connectionId,
  courseIds,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly courseIds: readonly string[];
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly value: readonly CanvasSyncRunRow[] }
  | { readonly ok: false }
> {
  if (courseIds.length === 0) {
    return { ok: true, value: [] };
  }

  const { data, error } = await client
    .from("canvas_sync_runs")
    .select(SYNC_RUN_COLUMNS)
    .eq("user_id", userId)
    .eq("canvas_connection_id", connectionId)
    .eq("sync_mode", "course")
    .in("scope_course_id", [...courseIds])
    .order("started_at", { ascending: false });

  if (error || !data) {
    return { ok: false };
  }
  return { ok: true, value: data as readonly CanvasSyncRunRow[] };
}

async function readCourseRowsByIds({
  client,
  connectionId,
  courseIds,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly courseIds: readonly string[];
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly value: readonly CanvasCourseRow[] }
  | { readonly ok: false }
> {
  const { data, error } = await client
    .from("canvas_courses")
    .select(COURSE_COLUMNS)
    .eq("user_id", userId)
    .eq("canvas_connection_id", connectionId)
    .in("id", [...courseIds]);

  if (error || !data) {
    return { ok: false };
  }
  return { ok: true, value: data as readonly CanvasCourseRow[] };
}

async function readCourseRowById({
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
  | { readonly ok: true; readonly value: CanvasCourseRow | null }
  | { readonly ok: false }
> {
  const { data, error } = await client
    .from("canvas_courses")
    .select(COURSE_COLUMNS)
    .eq("user_id", userId)
    .eq("canvas_connection_id", connectionId)
    .eq("id", courseId)
    .maybeSingle();

  if (error) {
    return { ok: false };
  }
  return { ok: true, value: data as CanvasCourseRow | null };
}

function mapInventoryItem({
  liveCourse,
  now,
  preference,
  row,
  run,
  state,
}: {
  readonly liveCourse: CanvasCourse | null;
  readonly now: Date;
  readonly preference: CanvasCourseSyncPreferenceRow | null;
  readonly row: CanvasCourseRow;
  readonly run: CanvasSyncRunRow | null;
  readonly state: CanvasCourseSyncStateRow | null;
}): CanvasCourseInventoryItem {
  const classification = liveCourse
    ? classifyCanvasCourse(liveCourse, now)
    : {
        classification: "unavailable" as const,
        reason: "Canvas no longer returns this course for the current connection.",
      };

  return {
    id: row.id,
    displayName: liveCourse?.name ?? row.name,
    courseCode: liveCourse?.courseCode ?? row.course_code,
    workflowState: liveCourse?.workflowState ?? row.workflow_state,
    startAt: liveCourse?.startAt ?? row.start_at,
    endAt: liveCourse?.endAt ?? row.end_at,
    term: liveCourse?.term ?? null,
    classification: classification.classification,
    selectable: classification.classification !== "unavailable",
    unavailableReason: classification.reason,
    selected: preference?.selected ?? false,
    lastSync: mapLastSync({ run, state }),
  };
}

function classifyCanvasCourse(
  course: CanvasCourse,
  now: Date,
): {
  readonly classification: CanvasCourseClassification;
  readonly reason: string | null;
} {
  const workflowState = normalizeState(course.workflowState);
  if (workflowState === "deleted") {
    return {
      classification: "unavailable",
      reason: "Canvas marks this course unavailable.",
    };
  }
  if (workflowState === "unpublished") {
    return {
      classification: "unavailable",
      reason: "Canvas marks this course unpublished.",
    };
  }

  if (
    course.concluded === true ||
    workflowState === "completed" ||
    hasCompletedEnrollment(course.enrollments ?? []) ||
    isPastDate(course.endAt, now) ||
    isPastDate(course.term?.endAt ?? null, now) ||
    allSectionsEnded(course.sections ?? [], now)
  ) {
    return { classification: "past_or_concluded", reason: null };
  }

  if (
    hasActiveEnrollment(course.enrollments ?? []) ||
    (workflowState === "available" &&
      isInCurrentDateWindow({
        endAt: course.endAt ?? course.term?.endAt ?? null,
        now,
        startAt: course.startAt ?? course.term?.startAt ?? null,
      }))
  ) {
    return { classification: "likely_current", reason: null };
  }

  return { classification: "other_or_uncertain", reason: null };
}

function mapLastSync({
  run,
  state,
}: {
  readonly run: CanvasSyncRunRow | null;
  readonly state: CanvasCourseSyncStateRow | null;
}): CanvasCourseLastSync | null {
  if (run) {
    return {
      status: run.status === "succeeded" ? "success" : run.status,
      startedAt: run.started_at,
      completedAt: run.completed_at,
      failureCode: run.failure_code,
      lastCheckedAt: state?.last_checked_at ?? null,
      lastSuccessfulSyncAt: state?.last_successful_sync_at ?? null,
    };
  }

  if (!state) {
    return null;
  }

  return {
    status:
      state.consecutive_failure_count > 0 && state.last_failure_code
        ? "failed"
        : "success",
    completedAt: state.last_checked_at,
    failureCode: state.last_failure_code,
    lastCheckedAt: state.last_checked_at,
    lastSuccessfulSyncAt: state.last_successful_sync_at,
    startedAt: null,
  };
}

function latestRunByCourseId(
  runs: readonly CanvasSyncRunRow[],
): ReadonlyMap<string, CanvasSyncRunRow> {
  const byCourse = new Map<string, CanvasSyncRunRow>();
  for (const run of runs) {
    const courseId = run.scope_course_id;
    if (courseId && !byCourse.has(courseId)) {
      byCourse.set(courseId, run);
    }
  }
  return byCourse;
}

function normalizeCourseIdSelection(
  selectedCourseIds: readonly string[],
): CanvasCourseSelectionResult<readonly string[]> {
  if (!Array.isArray(selectedCourseIds)) {
    return {
      ok: false,
      status: 400,
      code: "invalid_request",
      message: "selectedCourseIds must be an array.",
    };
  }

  const normalized = selectedCourseIds.map((id) =>
    typeof id === "string" ? id.trim() : "",
  );
  if (normalized.some((id) => !isUuid(id))) {
    return {
      ok: false,
      status: 400,
      code: "invalid_request",
      message: "selectedCourseIds must contain internal course IDs.",
    };
  }

  const distinct = new Set(normalized);
  if (distinct.size !== normalized.length) {
    return {
      ok: false,
      status: 400,
      code: "invalid_request",
      message: "selectedCourseIds must not contain duplicates.",
    };
  }

  return { ok: true, value: normalized };
}

function courseItemToCanvasCourse(
  item: CanvasCourseInventoryItem,
  row: CanvasCourseRow,
): CanvasCourse {
  return {
    accountId: row.account_id,
    courseCode: item.courseCode,
    endAt: item.endAt,
    enrollmentTermId: row.enrollment_term_id,
    id: row.canvas_course_id,
    name: item.displayName,
    publicSyllabus: row.public_syllabus,
    startAt: item.startAt,
    syllabusBody: row.syllabus_body,
    timeZone: row.time_zone,
    updatedAt: row.canvas_updated_at,
    workflowState: item.workflowState,
  } as CanvasCourse;
}

function countClassifications(
  courses: readonly CanvasCourseInventoryItem[],
): CanvasCourseInventoryCounts {
  return {
    total: courses.length,
    likelyCurrent: courses.filter((course) => course.classification === "likely_current").length,
    pastOrConcluded: courses.filter((course) => course.classification === "past_or_concluded").length,
    otherOrUncertain: courses.filter((course) => course.classification === "other_or_uncertain").length,
    unavailable: courses.filter((course) => course.classification === "unavailable").length,
  };
}

function compareInventoryItems(
  left: CanvasCourseInventoryItem,
  right: CanvasCourseInventoryItem,
): number {
  if (left.selected !== right.selected) {
    return left.selected ? -1 : 1;
  }
  const leftRank = classificationRank(left.classification);
  const rightRank = classificationRank(right.classification);
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }
  return left.displayName.localeCompare(right.displayName);
}

function comparePreferences(
  left: CanvasCourseSyncPreferenceRow,
  right: CanvasCourseSyncPreferenceRow,
): number {
  const leftOrder = left.display_order ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.display_order ?? Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }
  return left.updated_at.localeCompare(right.updated_at);
}

function classificationRank(classification: CanvasCourseClassification): number {
  switch (classification) {
    case "likely_current":
      return 0;
    case "past_or_concluded":
      return 1;
    case "other_or_uncertain":
      return 2;
    case "unavailable":
      return 3;
  }
}

function hasActiveEnrollment(
  enrollments: readonly CanvasCourseEnrollment[],
): boolean {
  return enrollments.some((enrollment) => {
    const enrollmentState = normalizeState(enrollment.enrollmentState);
    const workflowState = normalizeState(enrollment.workflowState);
    return enrollmentState === "active" || workflowState === "active";
  });
}

function hasCompletedEnrollment(
  enrollments: readonly CanvasCourseEnrollment[],
): boolean {
  return enrollments.some((enrollment) => {
    const enrollmentState = normalizeState(enrollment.enrollmentState);
    const workflowState = normalizeState(enrollment.workflowState);
    return (
      enrollmentState === "completed" ||
      enrollmentState === "concluded" ||
      workflowState === "completed" ||
      workflowState === "concluded"
    );
  });
}

function allSectionsEnded(
  sections: readonly CanvasCourseSection[],
  now: Date,
): boolean {
  return sections.length > 0 && sections.every((section) => isPastDate(section.endAt, now));
}

function isInCurrentDateWindow({
  endAt,
  now,
  startAt,
}: {
  readonly endAt: string | null;
  readonly now: Date;
  readonly startAt: string | null;
}): boolean {
  return !isFutureDate(startAt, now) && !isPastDate(endAt, now);
}

function isFutureDate(value: string | null, now: Date): boolean {
  const parsed = parseTime(value);
  return parsed !== null && parsed > now.getTime();
}

function isPastDate(value: string | null, now: Date): boolean {
  const parsed = parseTime(value);
  return parsed !== null && parsed < now.getTime();
}

function parseTime(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeDate(value: string | null): string | null {
  return parseTime(value) === null ? null : value;
}

function normalizeState(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
