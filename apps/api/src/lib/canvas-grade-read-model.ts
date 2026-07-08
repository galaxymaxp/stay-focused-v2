import type {
  CanvasAssignmentNormalizedStatus,
  CanvasAssignmentRow,
  CanvasAssignmentSubmissionRow,
  CanvasCourseGradeSummaryRow,
  CanvasCourseGradeSyncFamilyState,
  CanvasCourseGradeSyncStateRow,
  CanvasCourseGradeSyncStatus,
  CanvasGradeVisibilityState as DbCanvasGradeVisibilityState,
  CanvasLatePolicyStatus,
  Database,
} from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CanvasApiErrorCode,
  CanvasCourseGradeSummaryDto,
  CanvasGradeAssignmentDetailDto,
  CanvasGradeAssignmentListItemDto,
  CanvasGradeSyncStatusDto,
  CanvasGradeVisibilityState,
  CanvasNormalizedAssignmentStatus,
  CanvasVisibleGradeDto,
  CanvasVisibleScoreDto,
} from "@/types/canvas";

export const CANVAS_GRADE_LIST_DEFAULT_LIMIT = 50;
export const CANVAS_GRADE_LIST_MAX_LIMIT = 100;
export const CANVAS_GRADE_SYNC_STALE_AFTER_MS = 24 * 60 * 60 * 1000;

const CONNECTION_AUTH_COLUMNS = "id,user_id,status";
const COURSE_AUTH_COLUMNS = "id,user_id,canvas_connection_id";
const SELECTED_PREFERENCE_COLUMNS = "id,selected";
const ASSIGNMENT_COLUMNS =
  "id,user_id,canvas_connection_id,course_id,name,points_possible,grading_type,submission_types,due_at,unlock_at,lock_at,published,last_synced_at";
const SUBMISSION_COLUMNS =
  "id,user_id,canvas_connection_id,course_id,assignment_id,workflow_state,normalized_status,submitted_at,graded_at,posted_at,attempt,submission_type,grade_matches_current_submission,late,missing,excused,assignment_visible,late_policy_status,seconds_late,score,grade,score_visibility_state,grade_visibility_state,points_possible_at_sync,last_synced_at,absent_after_sync_at";
const COURSE_GRADE_SUMMARY_COLUMNS =
  "id,user_id,canvas_connection_id,course_id,current_score,current_score_visibility_state,current_grade,current_grade_visibility_state,final_score,final_score_visibility_state,final_grade,final_grade_visibility_state,last_synced_at";
const SYNC_STATE_COLUMNS =
  "id,user_id,canvas_connection_id,course_id,sync_status,last_checked_at,last_completed_at,last_successful_sync_at,last_completed_snapshot_authoritative,consecutive_failure_count,last_failure_code,last_failure_category,synced_assignment_count,synced_submission_count,synced_course_grade_summary_count,assignment_family_state,submission_family_state,course_grade_summary_family_state";

const NORMALIZED_ASSIGNMENT_STATUSES = [
  "unknown",
  "excused",
  "unavailable",
  "locked",
  "missing",
  "graded_hidden",
  "graded",
  "submitted_late",
  "submitted",
  "late_unsubmitted",
  "available",
  "upcoming",
  "no_due_date",
] as const satisfies readonly CanvasNormalizedAssignmentStatus[];

const GRADE_VISIBILITY_STATES = [
  "unknown",
  "visible",
  "hidden",
  "unavailable",
  "not_applicable",
] as const satisfies readonly CanvasGradeVisibilityState[];

const SYNC_STATUSES = [
  "never_synced",
  "running",
  "succeeded",
  "partial",
  "failed",
] as const satisfies readonly CanvasCourseGradeSyncStatus[];

const SYNC_FAMILY_STATES = [
  "not_started",
  "succeeded",
  "partial",
  "failed",
  "skipped",
] as const satisfies readonly CanvasCourseGradeSyncFamilyState[];

const WORKFLOW_STATES = [
  "submitted",
  "unsubmitted",
  "graded",
  "pending_review",
] as const;

const LATE_POLICY_STATUSES = ["late", "missing", "extended", "none"] as const;

export interface CanvasGradeListQuery {
  readonly limit: number;
  readonly offset: number;
}

export type CanvasGradeReadResult<TValue> =
  | { readonly ok: true; readonly value: TValue }
  | {
      readonly ok: false;
      readonly status: 400 | 404 | 500;
      readonly code: CanvasApiErrorCode;
      readonly message: string;
    };

interface CanvasGradeCourseContext {
  readonly connectionId: string;
  readonly courseId: string;
  readonly userId: string;
}

interface ConnectionAuthRow {
  readonly id: string;
  readonly user_id: string;
  readonly status: string | null;
}

type CourseAuthRow = Pick<
  CanvasAssignmentRow,
  "canvas_connection_id" | "id" | "user_id"
>;

type AssignmentReadRow = Pick<
  CanvasAssignmentRow,
  | "course_id"
  | "due_at"
  | "grading_type"
  | "id"
  | "last_synced_at"
  | "lock_at"
  | "name"
  | "points_possible"
  | "published"
  | "submission_types"
  | "unlock_at"
>;

type SubmissionReadRow = Pick<
  CanvasAssignmentSubmissionRow,
  | "absent_after_sync_at"
  | "assignment_id"
  | "assignment_visible"
  | "attempt"
  | "course_id"
  | "excused"
  | "grade"
  | "grade_matches_current_submission"
  | "grade_visibility_state"
  | "graded_at"
  | "id"
  | "last_synced_at"
  | "late"
  | "late_policy_status"
  | "missing"
  | "normalized_status"
  | "points_possible_at_sync"
  | "posted_at"
  | "score"
  | "score_visibility_state"
  | "seconds_late"
  | "submitted_at"
  | "submission_type"
  | "workflow_state"
>;

type CourseGradeSummaryReadRow = Pick<
  CanvasCourseGradeSummaryRow,
  | "current_grade"
  | "current_grade_visibility_state"
  | "current_score"
  | "current_score_visibility_state"
  | "final_grade"
  | "final_grade_visibility_state"
  | "final_score"
  | "final_score_visibility_state"
  | "last_synced_at"
>;

type SyncStateReadRow = Pick<
  CanvasCourseGradeSyncStateRow,
  | "assignment_family_state"
  | "course_grade_summary_family_state"
  | "last_checked_at"
  | "last_completed_snapshot_authoritative"
  | "last_failure_code"
  | "last_successful_sync_at"
  | "submission_family_state"
  | "sync_status"
>;

class CanvasGradeReadModelError extends Error {
  public readonly code: CanvasApiErrorCode;
  public readonly status: 500;

  public constructor(message = "Synchronized Canvas grade data is unavailable.") {
    super(message);
    this.name = "CanvasGradeReadModelError";
    this.status = 500;
    this.code = "canvas_grade_data_unavailable";
  }
}

export function parseCanvasGradeListQuery(
  searchParams: URLSearchParams,
): CanvasGradeReadResult<CanvasGradeListQuery> {
  const allowed = new Set(["limit", "offset"]);
  for (const key of searchParams.keys()) {
    if (!allowed.has(key)) {
      return invalidRequest("Unsupported grade list query parameter.");
    }
  }

  const limit = parseBoundedInteger({
    maximum: CANVAS_GRADE_LIST_MAX_LIMIT,
    minimum: 1,
    name: "limit",
    value: searchParams.get("limit"),
  });
  if (!limit.ok) {
    return invalidRequest(limit.message);
  }

  const offset = parseBoundedInteger({
    maximum: Number.MAX_SAFE_INTEGER,
    minimum: 0,
    name: "offset",
    value: searchParams.get("offset"),
  });
  if (!offset.ok) {
    return invalidRequest(offset.message);
  }

  return {
    ok: true,
    value: {
      limit: limit.value ?? CANVAS_GRADE_LIST_DEFAULT_LIMIT,
      offset: offset.value ?? 0,
    },
  };
}

export async function listCanvasGradeAssignments({
  client,
  courseId,
  limit = CANVAS_GRADE_LIST_DEFAULT_LIMIT,
  now = new Date(),
  offset = 0,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly courseId: string;
  readonly limit?: number;
  readonly now?: Date;
  readonly offset?: number;
  readonly userId: string;
}): Promise<
  CanvasGradeReadResult<{
    readonly items: readonly CanvasGradeAssignmentListItemDto[];
    readonly page: {
      readonly limit: number;
      readonly offset: number;
      readonly nextOffset: number | null;
      readonly hasMore: boolean;
    };
    readonly sync: CanvasGradeSyncStatusDto;
  }>
> {
  return withReadModelErrors<{
    readonly items: readonly CanvasGradeAssignmentListItemDto[];
    readonly page: {
      readonly limit: number;
      readonly offset: number;
      readonly nextOffset: number | null;
      readonly hasMore: boolean;
    };
    readonly sync: CanvasGradeSyncStatusDto;
  }>(async () => {
    const course = await authorizeSelectedGradeCourse({ client, courseId, userId });
    if (!course.ok) {
      return course;
    }
    const sync = await readSyncStatusDto({ client, course: course.value, now });
    if (!sync.ok) {
      return sync;
    }

    const submissions = await readSubmissionRows({ client, course: course.value });
    if (!submissions.ok) {
      return submissions;
    }
    if (submissions.value.length === 0) {
      return {
        ok: true,
        value: {
          items: [],
          page: {
            hasMore: false,
            limit,
            nextOffset: null,
            offset,
          },
          sync: sync.value,
        },
      };
    }

    const assignments = await readAssignmentRowsByIds({
      assignmentIds: submissions.value.map((submission) => submission.assignment_id),
      client,
      course: course.value,
    });
    if (!assignments.ok) {
      return assignments;
    }

    const assignmentsById = new Map(
      assignments.value.map((assignment) => [assignment.id, assignment]),
    );
    const items = submissions.value.map((submission) => {
      const assignment = assignmentsById.get(submission.assignment_id);
      if (!assignment) {
        throw new CanvasGradeReadModelError();
      }
      return mapAssignmentListItem({ assignment, submission });
    });
    const orderedItems = items.sort(compareGradeAssignmentItems);
    const boundedLimit = Math.min(limit, CANVAS_GRADE_LIST_MAX_LIMIT);
    const pageItems = orderedItems.slice(offset, offset + boundedLimit);
    const hasMore = offset + boundedLimit < orderedItems.length;

    return {
      ok: true,
      value: {
        items: pageItems,
        page: {
          hasMore,
          limit: boundedLimit,
          nextOffset: hasMore ? offset + boundedLimit : null,
          offset,
        },
        sync: sync.value,
      },
    };
  });
}

export async function getCanvasGradeAssignmentDetail({
  assignmentId,
  client,
  courseId,
  now = new Date(),
  userId,
}: {
  readonly assignmentId: string;
  readonly client: SupabaseClient<Database>;
  readonly courseId: string;
  readonly now?: Date;
  readonly userId: string;
}): Promise<CanvasGradeReadResult<CanvasGradeAssignmentDetailDto>> {
  return withReadModelErrors<CanvasGradeAssignmentDetailDto>(async () => {
    if (!isUuid(assignmentId.trim())) {
      return assignmentNotFound();
    }
    const course = await authorizeSelectedGradeCourse({ client, courseId, userId });
    if (!course.ok) {
      return course;
    }
    const sync = await readSyncStatusDto({ client, course: course.value, now });
    if (!sync.ok) {
      return sync;
    }
    const assignment = await readAssignmentRowById({
      assignmentId: assignmentId.trim(),
      client,
      course: course.value,
    });
    if (!assignment.ok) {
      return assignment;
    }
    if (!assignment.value) {
      return assignmentNotFound();
    }
    const submission = await readSubmissionRowByAssignmentId({
      assignmentId: assignment.value.id,
      client,
      course: course.value,
    });
    if (!submission.ok) {
      return submission;
    }
    if (!submission.value) {
      return assignmentNotFound();
    }

    const listItem = mapAssignmentListItem({
      assignment: assignment.value,
      submission: submission.value,
    });
    return {
      ok: true,
      value: {
        ...listItem,
        allowedAttempts: null,
        gradeMatchesCurrentSubmission:
          submission.value.grade_matches_current_submission,
        hideInGradebook: null,
        latePolicyStatus: parseLatePolicyStatus(
          submission.value.late_policy_status,
        ),
        pointsPossibleAtSync: nullableNumber(
          submission.value.points_possible_at_sync,
        ),
        postManually: null,
        postedAt: safeTimestamp(submission.value.posted_at),
        secondsLate: nullableNonNegativeInteger(submission.value.seconds_late),
        submissionType: nullableBoundedText(submission.value.submission_type),
        sync: sync.value,
      },
    };
  });
}

export async function getCanvasCourseGradeSummary({
  client,
  courseId,
  now = new Date(),
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly courseId: string;
  readonly now?: Date;
  readonly userId: string;
}): Promise<CanvasGradeReadResult<CanvasCourseGradeSummaryDto>> {
  return withReadModelErrors<CanvasCourseGradeSummaryDto>(async () => {
    const course = await authorizeSelectedGradeCourse({ client, courseId, userId });
    if (!course.ok) {
      return course;
    }
    const sync = await readSyncStatusDto({ client, course: course.value, now });
    if (!sync.ok) {
      return sync;
    }
    const summary = await readCourseGradeSummaryRow({
      client,
      course: course.value,
    });
    if (!summary.ok) {
      return summary;
    }
    if (!summary.value) {
      return {
        ok: true,
        value: {
          currentGrade: { state: "unknown", value: null },
          currentScore: { state: "unknown", value: null },
          finalGrade: { state: "unknown", value: null },
          finalScore: { state: "unknown", value: null },
          lastSyncedAt: null,
          sync: sync.value,
        },
      };
    }

    return {
      ok: true,
      value: {
        currentGrade: visibleGrade(
          summary.value.current_grade_visibility_state,
          summary.value.current_grade,
        ),
        currentScore: visibleScore(
          summary.value.current_score_visibility_state,
          summary.value.current_score,
        ),
        finalGrade: visibleGrade(
          summary.value.final_grade_visibility_state,
          summary.value.final_grade,
        ),
        finalScore: visibleScore(
          summary.value.final_score_visibility_state,
          summary.value.final_score,
        ),
        lastSyncedAt: safeTimestamp(summary.value.last_synced_at),
        sync: sync.value,
      },
    };
  });
}

export async function getCanvasGradeSyncStatus({
  client,
  courseId,
  now = new Date(),
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly courseId: string;
  readonly now?: Date;
  readonly userId: string;
}): Promise<CanvasGradeReadResult<CanvasGradeSyncStatusDto>> {
  return withReadModelErrors<CanvasGradeSyncStatusDto>(async () => {
    const course = await authorizeSelectedGradeCourse({ client, courseId, userId });
    if (!course.ok) {
      return course;
    }
    return readSyncStatusDto({ client, course: course.value, now });
  });
}

export async function authorizeSelectedCanvasGradeCourse({
  client,
  courseId,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly courseId: string;
  readonly userId: string;
}): Promise<CanvasGradeReadResult<null>> {
  return withReadModelErrors<null>(async () => {
    const course = await authorizeSelectedGradeCourse({ client, courseId, userId });
    if (!course.ok) {
      return course;
    }
    return { ok: true, value: null };
  });
}

async function authorizeSelectedGradeCourse({
  client,
  courseId,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly courseId: string;
  readonly userId: string;
}): Promise<CanvasGradeReadResult<CanvasGradeCourseContext>> {
  const normalizedCourseId = courseId.trim();
  if (!isUuid(normalizedCourseId)) {
    return courseNotFound();
  }

  const { data: connection, error: connectionError } = await client
    .from("canvas_connections")
    .select(CONNECTION_AUTH_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (connectionError) {
    return storageFailure("Canvas connection could not be loaded.");
  }
  const connectionRow = connection as ConnectionAuthRow | null;
  if (!connectionRow || connectionRow.user_id !== userId) {
    return {
      ok: false,
      status: 404,
      code: "canvas_connection_missing",
      message: "Connect Canvas before reading synchronized grade data.",
    };
  }
  if (connectionRow.status !== "active") {
    return {
      ok: false,
      status: 404,
      code: "canvas_connection_missing",
      message: "Connect Canvas before reading synchronized grade data.",
    };
  }

  const { data: course, error: courseError } = await client
    .from("canvas_courses")
    .select(COURSE_AUTH_COLUMNS)
    .eq("user_id", userId)
    .eq("canvas_connection_id", connectionRow.id)
    .eq("id", normalizedCourseId)
    .maybeSingle();
  if (courseError) {
    return storageFailure("Canvas course could not be loaded.");
  }
  const courseRow = course as CourseAuthRow | null;
  if (!courseRow) {
    return courseNotFound();
  }

  const { data: preference, error: preferenceError } = await client
    .from("canvas_course_sync_preferences")
    .select(SELECTED_PREFERENCE_COLUMNS)
    .eq("user_id", userId)
    .eq("canvas_connection_id", connectionRow.id)
    .eq("course_id", normalizedCourseId)
    .eq("selected", true)
    .maybeSingle();
  if (preferenceError) {
    return storageFailure("Canvas course selection could not be loaded.");
  }
  if (!preference) {
    return {
      ok: false,
      status: 400,
      code: "canvas_course_not_selected",
      message: "Select the Canvas course before reading synchronized grade data.",
    };
  }

  return {
    ok: true,
    value: {
      connectionId: connectionRow.id,
      courseId: courseRow.id,
      userId,
    },
  };
}

async function readSyncStatusDto({
  client,
  course,
  now,
}: {
  readonly client: SupabaseClient<Database>;
  readonly course: CanvasGradeCourseContext;
  readonly now: Date;
}): Promise<CanvasGradeReadResult<CanvasGradeSyncStatusDto>> {
  const row = await readSyncStateRow({ client, course });
  if (!row.ok) {
    return row;
  }
  return { ok: true, value: mapSyncStatus(row.value, now) };
}

async function readSyncStateRow({
  client,
  course,
}: {
  readonly client: SupabaseClient<Database>;
  readonly course: CanvasGradeCourseContext;
}): Promise<CanvasGradeReadResult<SyncStateReadRow | null>> {
  const { data, error } = await client
    .from("canvas_course_grade_sync_states")
    .select(SYNC_STATE_COLUMNS)
    .eq("user_id", course.userId)
    .eq("canvas_connection_id", course.connectionId)
    .eq("course_id", course.courseId)
    .maybeSingle();
  if (error) {
    return storageFailure("Canvas grade synchronization state could not be loaded.");
  }
  return { ok: true, value: data as SyncStateReadRow | null };
}

async function readSubmissionRows({
  client,
  course,
}: {
  readonly client: SupabaseClient<Database>;
  readonly course: CanvasGradeCourseContext;
}): Promise<CanvasGradeReadResult<readonly SubmissionReadRow[]>> {
  const { data, error } = await client
    .from("canvas_assignment_submissions")
    .select(SUBMISSION_COLUMNS)
    .eq("user_id", course.userId)
    .eq("canvas_connection_id", course.connectionId)
    .eq("course_id", course.courseId);
  if (error || !data) {
    return storageFailure("Synchronized Canvas grade data could not be loaded.");
  }
  return { ok: true, value: data as readonly SubmissionReadRow[] };
}

async function readSubmissionRowByAssignmentId({
  assignmentId,
  client,
  course,
}: {
  readonly assignmentId: string;
  readonly client: SupabaseClient<Database>;
  readonly course: CanvasGradeCourseContext;
}): Promise<CanvasGradeReadResult<SubmissionReadRow | null>> {
  const { data, error } = await client
    .from("canvas_assignment_submissions")
    .select(SUBMISSION_COLUMNS)
    .eq("user_id", course.userId)
    .eq("canvas_connection_id", course.connectionId)
    .eq("course_id", course.courseId)
    .eq("assignment_id", assignmentId)
    .maybeSingle();
  if (error) {
    return storageFailure("Synchronized Canvas grade data could not be loaded.");
  }
  return { ok: true, value: data as SubmissionReadRow | null };
}

async function readAssignmentRowsByIds({
  assignmentIds,
  client,
  course,
}: {
  readonly assignmentIds: readonly string[];
  readonly client: SupabaseClient<Database>;
  readonly course: CanvasGradeCourseContext;
}): Promise<CanvasGradeReadResult<readonly AssignmentReadRow[]>> {
  const { data, error } = await client
    .from("canvas_assignments")
    .select(ASSIGNMENT_COLUMNS)
    .eq("user_id", course.userId)
    .eq("canvas_connection_id", course.connectionId)
    .eq("course_id", course.courseId)
    .in("id", [...new Set(assignmentIds)]);
  if (error || !data) {
    return storageFailure("Synchronized Canvas assignments could not be loaded.");
  }
  return { ok: true, value: data as readonly AssignmentReadRow[] };
}

async function readAssignmentRowById({
  assignmentId,
  client,
  course,
}: {
  readonly assignmentId: string;
  readonly client: SupabaseClient<Database>;
  readonly course: CanvasGradeCourseContext;
}): Promise<CanvasGradeReadResult<AssignmentReadRow | null>> {
  const { data, error } = await client
    .from("canvas_assignments")
    .select(ASSIGNMENT_COLUMNS)
    .eq("user_id", course.userId)
    .eq("canvas_connection_id", course.connectionId)
    .eq("course_id", course.courseId)
    .eq("id", assignmentId)
    .maybeSingle();
  if (error) {
    return storageFailure("Synchronized Canvas assignment could not be loaded.");
  }
  return { ok: true, value: data as AssignmentReadRow | null };
}

async function readCourseGradeSummaryRow({
  client,
  course,
}: {
  readonly client: SupabaseClient<Database>;
  readonly course: CanvasGradeCourseContext;
}): Promise<CanvasGradeReadResult<CourseGradeSummaryReadRow | null>> {
  const { data, error } = await client
    .from("canvas_course_grade_summaries")
    .select(COURSE_GRADE_SUMMARY_COLUMNS)
    .eq("user_id", course.userId)
    .eq("canvas_connection_id", course.connectionId)
    .eq("course_id", course.courseId)
    .maybeSingle();
  if (error) {
    return storageFailure("Synchronized Canvas course grade summary could not be loaded.");
  }
  return { ok: true, value: data as CourseGradeSummaryReadRow | null };
}

function mapAssignmentListItem({
  assignment,
  submission,
}: {
  readonly assignment: AssignmentReadRow;
  readonly submission: SubmissionReadRow;
}): CanvasGradeAssignmentListItemDto {
  return {
    assignmentVisible:
      submission.assignment_visible ?? (assignment.published === false ? false : null),
    attempt: nullableNonNegativeInteger(submission.attempt),
    dueAt: safeTimestamp(assignment.due_at),
    excused: submission.excused === true,
    grade: visibleGrade(
      submission.grade_visibility_state,
      submission.grade,
    ),
    gradedAt: safeTimestamp(submission.graded_at),
    gradingType: nullableBoundedText(assignment.grading_type),
    id: assignment.id,
    lastSyncedAt: safeTimestamp(submission.last_synced_at),
    late: submission.late === true,
    lockAt: safeTimestamp(assignment.lock_at),
    missing: submission.missing === true,
    normalizedStatus: parseNormalizedStatus(submission.normalized_status),
    pointsPossible: nullableNumber(assignment.points_possible),
    score: visibleScore(
      submission.score_visibility_state,
      submission.score,
    ),
    submissionTypes: safeStringArray(assignment.submission_types),
    submittedAt: safeTimestamp(submission.submitted_at),
    title: requiredNonBlankText(assignment.name),
    unlockAt: safeTimestamp(assignment.unlock_at),
    workflowState: parseWorkflowState(submission.workflow_state),
  };
}

function mapSyncStatus(
  row: SyncStateReadRow | null,
  now: Date,
): CanvasGradeSyncStatusDto {
  if (!row) {
    return {
      assignmentSubmissionState: "not_started",
      authoritativeAssignmentSubmission: false,
      courseGradeSummaryState: "not_started",
      failureCode: null,
      lastCheckedAt: null,
      lastSuccessfulSyncAt: null,
      stale: false,
      status: "never_synced",
    };
  }

  const lastSuccessfulSyncAt = safeTimestamp(row.last_successful_sync_at);
  return {
    assignmentSubmissionState: summarizeAssignmentSubmissionFamily({
      assignment: parseSyncFamilyState(row.assignment_family_state),
      submission: parseSyncFamilyState(row.submission_family_state),
    }),
    authoritativeAssignmentSubmission:
      row.last_completed_snapshot_authoritative === true,
    courseGradeSummaryState: parseSyncFamilyState(
      row.course_grade_summary_family_state,
    ),
    failureCode: safeFailureCode(row.last_failure_code),
    lastCheckedAt: safeTimestamp(row.last_checked_at),
    lastSuccessfulSyncAt,
    stale: isStale({ lastSuccessfulSyncAt, now }),
    status: parseSyncStatus(row.sync_status),
  };
}

function summarizeAssignmentSubmissionFamily({
  assignment,
  submission,
}: {
  readonly assignment: CanvasCourseGradeSyncFamilyState;
  readonly submission: CanvasCourseGradeSyncFamilyState;
}): CanvasCourseGradeSyncFamilyState {
  if (assignment === submission) {
    return assignment;
  }
  if (
    assignment === "failed" ||
    submission === "failed" ||
    assignment === "partial" ||
    submission === "partial"
  ) {
    return "partial";
  }
  if (assignment === "succeeded" || submission === "succeeded") {
    return "partial";
  }
  return "not_started";
}

function compareGradeAssignmentItems(
  left: CanvasGradeAssignmentListItemDto,
  right: CanvasGradeAssignmentListItemDto,
): number {
  const leftDue = left.dueAt ? Date.parse(left.dueAt) : null;
  const rightDue = right.dueAt ? Date.parse(right.dueAt) : null;
  if (leftDue !== null && rightDue === null) {
    return -1;
  }
  if (leftDue === null && rightDue !== null) {
    return 1;
  }
  if (leftDue !== null && rightDue !== null && leftDue !== rightDue) {
    return leftDue - rightDue;
  }

  const titleComparison = left.title.localeCompare(right.title);
  if (titleComparison !== 0) {
    return titleComparison;
  }
  return left.id.localeCompare(right.id);
}

function visibleScore(
  stateValue: DbCanvasGradeVisibilityState,
  value: number | string | null,
): CanvasVisibleScoreDto {
  const state = parseVisibilityState(stateValue);
  if (state === "visible") {
    const numeric = nullableNumber(value);
    if (numeric === null) {
      throw new CanvasGradeReadModelError();
    }
    return { state, value: numeric };
  }
  return { state, value: null };
}

function visibleGrade(
  stateValue: DbCanvasGradeVisibilityState,
  value: string | null,
): CanvasVisibleGradeDto {
  const state = parseVisibilityState(stateValue);
  if (state === "visible") {
    if (typeof value !== "string") {
      throw new CanvasGradeReadModelError();
    }
    return { state, value };
  }
  return { state, value: null };
}

function parseNormalizedStatus(
  value: string,
): CanvasAssignmentNormalizedStatus {
  if (NORMALIZED_ASSIGNMENT_STATUSES.includes(value as CanvasNormalizedAssignmentStatus)) {
    return value as CanvasAssignmentNormalizedStatus;
  }
  throw new CanvasGradeReadModelError();
}

function parseVisibilityState(value: string): CanvasGradeVisibilityState {
  if (GRADE_VISIBILITY_STATES.includes(value as CanvasGradeVisibilityState)) {
    return value as CanvasGradeVisibilityState;
  }
  throw new CanvasGradeReadModelError();
}

function parseSyncStatus(value: string): CanvasCourseGradeSyncStatus {
  if (SYNC_STATUSES.includes(value as CanvasCourseGradeSyncStatus)) {
    return value as CanvasCourseGradeSyncStatus;
  }
  throw new CanvasGradeReadModelError();
}

function parseSyncFamilyState(value: string): CanvasCourseGradeSyncFamilyState {
  if (SYNC_FAMILY_STATES.includes(value as CanvasCourseGradeSyncFamilyState)) {
    return value as CanvasCourseGradeSyncFamilyState;
  }
  throw new CanvasGradeReadModelError();
}

function parseWorkflowState(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  if (WORKFLOW_STATES.includes(value as (typeof WORKFLOW_STATES)[number])) {
    return value;
  }
  throw new CanvasGradeReadModelError();
}

function parseLatePolicyStatus(value: CanvasLatePolicyStatus | null): string | null {
  if (value === null) {
    return null;
  }
  if (LATE_POLICY_STATUSES.includes(value)) {
    return value;
  }
  throw new CanvasGradeReadModelError();
}

function safeFailureCode(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  if (/^[a-z0-9_]{1,80}$/.test(value)) {
    return value;
  }
  throw new CanvasGradeReadModelError();
}

function safeTimestamp(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new CanvasGradeReadModelError();
  }
  return new Date(parsed).toISOString();
}

function safeStringArray(value: readonly string[]): readonly string[] {
  if (!Array.isArray(value)) {
    throw new CanvasGradeReadModelError();
  }
  return value.map((item) => requiredNonBlankText(item));
}

function requiredNonBlankText(value: string): string {
  const text = value.trim();
  if (!text) {
    throw new CanvasGradeReadModelError();
  }
  return text;
}

function nullableBoundedText(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 120) {
    throw new CanvasGradeReadModelError();
  }
  return trimmed;
}

function nullableNonNegativeInteger(value: number | null): number | null {
  if (value === null) {
    return null;
  }
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new CanvasGradeReadModelError();
  }
  return value;
}

function nullableNumber(value: number | string | null): number | null {
  if (value === null) {
    return null;
  }
  const parsed = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(parsed)) {
    throw new CanvasGradeReadModelError();
  }
  return parsed;
}

function isStale({
  lastSuccessfulSyncAt,
  now,
}: {
  readonly lastSuccessfulSyncAt: string | null;
  readonly now: Date;
}): boolean {
  if (!lastSuccessfulSyncAt) {
    return false;
  }
  if (!Number.isFinite(now.getTime())) {
    throw new CanvasGradeReadModelError();
  }
  return now.getTime() - Date.parse(lastSuccessfulSyncAt) > CANVAS_GRADE_SYNC_STALE_AFTER_MS;
}

function parseBoundedInteger({
  maximum,
  minimum,
  name,
  value,
}: {
  readonly maximum: number;
  readonly minimum: number;
  readonly name: string;
  readonly value: string | null;
}): { readonly ok: true; readonly value: number | undefined } | { readonly ok: false; readonly message: string } {
  if (value === null || value.trim() === "") {
    return { ok: true, value: undefined };
  }
  if (!/^[0-9]+$/.test(value.trim())) {
    return { ok: false, message: `${name} must be a safe integer.` };
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    return { ok: false, message: `${name} is outside the allowed range.` };
  }
  return { ok: true, value: parsed };
}

async function withReadModelErrors<TValue>(
  operation: () => Promise<CanvasGradeReadResult<TValue>>,
): Promise<CanvasGradeReadResult<TValue>> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof CanvasGradeReadModelError) {
      return {
        ok: false,
        status: error.status,
        code: error.code,
        message: error.message,
      };
    }
    return {
      ok: false,
      status: 500,
      code: "canvas_storage_failed",
      message: "Synchronized Canvas grade data could not be loaded.",
    };
  }
}

function invalidRequest(message: string): CanvasGradeReadResult<never> {
  return {
    ok: false,
    status: 400,
    code: "invalid_request",
    message,
  };
}

function storageFailure(message: string): CanvasGradeReadResult<never> {
  return {
    ok: false,
    status: 500,
    code: "canvas_storage_failed",
    message,
  };
}

function courseNotFound(): CanvasGradeReadResult<never> {
  return {
    ok: false,
    status: 404,
    code: "canvas_course_not_found",
    message: "Canvas course was not found for this connection.",
  };
}

function assignmentNotFound(): CanvasGradeReadResult<never> {
  return {
    ok: false,
    status: 404,
    code: "canvas_assignment_not_found",
    message: "Canvas assignment grade data was not found.",
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
