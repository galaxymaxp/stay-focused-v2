import type {
  Database,
  Json,
  StudySessionRow,
  StudySessionUpdate,
  TaskInsert,
  TaskRow,
  TaskUpdate,
} from "@stay-focused/db";
import type {
  DeterministicStudyPlan,
  PlannerReviewer,
  PlannerTask,
  PlanningCandidates,
  PlanningCandidate,
  PlanningRange,
  ReviewerCandidateSource,
  StudySessionTaskSummary,
  StudySessionView,
  TaskStatus,
  TaskView,
} from "@stay-focused/shared/task-planning";
import { isReviewerProposal, selectReviewerCandidates, reviewerBlockMinutes, REVIEWER_REOPEN_AFTER_MS, DEFAULT_CANVAS_TASK_ESTIMATE_MINUTES } from "@stay-focused/shared/task-planning";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isPastStoredCourse } from "@/lib/course-state";
import { experienceRepository, readOwnedReviewerTargets, type ReviewerTarget } from "@/lib/experience/repository";
import { readActivityContext } from "@/lib/experience/task-state";
import { readStoredPlanningCourseInventory } from '@/lib/canvas-course-selection';
import { orderGenerateCourses } from '@/lib/experience/mappers';

const TASK_COLUMNS =
  "id,user_id,title,notes,status,priority,due_at,estimated_minutes,estimate_source,estimate_note,source_type,canvas_connection_id,canvas_course_id,canvas_assignment_id,canvas_assignment_row_id,created_at,updated_at,completed_at";
const SESSION_BASE_COLUMNS =
  "id,user_id,study_plan_id,task_id,starts_at,ends_at,status,created_at,updated_at";
const SESSION_COLUMNS = `${SESSION_BASE_COLUMNS},block_kind,reviewer_artifact_id`;
const SESSION_TASK_SUMMARY_COLUMNS =
  "id,title,status,priority,due_at,canvas_course_id,source_type,canvas_assignment_row_id";

// The embedded task summary is resolved through the composite owner foreign key
// so PostgREST applies the caller's own `tasks` RLS policy to the joined rows.
// `Database` is maintained by hand and carries no relationship metadata, so the
// literal-type select parser cannot describe this shape; the widened `string`
// keeps the call compiling and the result is narrowed explicitly below.
const withTaskEmbed = (columns: string): string =>
  `${columns},task:tasks!study_sessions_task_owner_fkey(${SESSION_TASK_SUMMARY_COLUMNS})`;

type StudySessionTaskSummaryRow = Pick<
  TaskRow,
  "id" | "title" | "status" | "priority" | "due_at" | "canvas_course_id" | "source_type" | "canvas_assignment_row_id"
>;

export interface StudySessionWithTaskRow extends StudySessionRow {
  readonly task: StudySessionTaskSummaryRow | null;
  readonly reviewer?: ReviewerTarget | null;
}

/**
 * The TP1 block columns arrive with a migration the owner applies during
 * rollout. Until then PostgreSQL reports the columns missing; reads fall back
 * to the task-only columns once per instance instead of failing Schedule.
 */
let sessionBlockColumnsSupported = true;

// Undefined column/table/function in PostgreSQL or PostgREST's schema cache.
// Codes only: an unresolved embed (PGRST200) also mentions the schema cache.
const MISSING_SCHEMA_CODES = new Set(["42703", "42P01", "42883", "PGRST202", "PGRST204", "PGRST205"]);
function isMissingSchemaError(error: { readonly code?: string } | null): boolean {
  return MISSING_SCHEMA_CODES.has(error?.code ?? "");
}

async function withSessionColumns<T extends { readonly error: { readonly code?: string } | null }>(
  run: (columns: string) => PromiseLike<T>,
): Promise<T> {
  const result = await run(sessionBlockColumnsSupported ? SESSION_COLUMNS : SESSION_BASE_COLUMNS);
  if (!sessionBlockColumnsSupported || !isMissingSchemaError(result.error)) return result;
  sessionBlockColumnsSupported = false;
  return run(SESSION_BASE_COLUMNS);
}

/**
 * PostgREST rejects an embed it cannot resolve rather than returning partial
 * rows. Composite-foreign-key embedding is the intended path, but when a
 * deployment cannot resolve the hint we fall back to one bounded lookup keyed
 * by the already-capped session page. The outcome is memoized per instance so
 * the probe costs at most one extra round trip, never one per request.
 */
let sessionTaskEmbedSupported = true;

function isUnresolvedEmbedError(error: { readonly code?: string; readonly message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "PGRST200") return true;
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("could not find a relationship") ||
    message.includes("could not embed");
}

export class TaskPlanningRepositoryError extends Error {
  constructor(
    readonly code: string,
    readonly safeMessage: string,
  ) {
    super(safeMessage);
    this.name = "TaskPlanningRepositoryError";
  }
}

export interface TaskListCursor {
  readonly createdAt: string;
  readonly id: string;
}

export async function listOwnedTasks(
  client: SupabaseClient<Database>,
  userId: string,
  options: {
    readonly limit: number;
    readonly status?: TaskStatus;
    readonly cursor?: TaskListCursor;
  },
): Promise<readonly TaskRow[]> {
  let query = client
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(options.limit);
  if (options.status) query = query.eq("status", options.status);
  if (options.cursor) {
    query = query.or(
      `created_at.lt.${options.cursor.createdAt},and(created_at.eq.${options.cursor.createdAt},id.lt.${options.cursor.id})`,
    );
  }
  const { data, error } = await query;
  if (error || !data) throw storageFailure("Tasks could not be loaded.");
  return data as TaskRow[];
}

export async function createOwnedTask(
  client: SupabaseClient<Database>,
  row: TaskInsert,
): Promise<TaskRow> {
  const { data, error } = await client
    .from("tasks")
    .insert(row)
    .select(TASK_COLUMNS)
    .single();
  if (error || !data) throw storageFailure("Task could not be created.");
  return data as TaskRow;
}

export async function findOwnedTask(
  client: SupabaseClient<Database>,
  userId: string,
  taskId: string,
): Promise<TaskRow | null> {
  const { data, error } = await client
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("user_id", userId)
    .eq("id", taskId)
    .maybeSingle();
  if (error) throw storageFailure("Task could not be loaded.");
  return data as TaskRow | null;
}

export async function updateOwnedTask(
  client: SupabaseClient<Database>,
  userId: string,
  taskId: string,
  update: TaskUpdate,
): Promise<TaskRow | null> {
  const { data, error } = await client
    .from("tasks")
    .update(update)
    .eq("user_id", userId)
    .eq("id", taskId)
    .select(TASK_COLUMNS)
    .maybeSingle();
  if (error) throw storageFailure("Task could not be updated.");
  return data as TaskRow | null;
}

export async function deleteOwnedTask(
  client: SupabaseClient<Database>,
  userId: string,
  taskId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("tasks")
    .delete()
    .eq("user_id", userId)
    .eq("id", taskId)
    .select("id")
    .maybeSingle();
  if (error) throw storageFailure("Task could not be deleted.");
  return data !== null;
}

export async function importOwnedCanvasAssignments(
  client: SupabaseClient<Database>,
  userId: string,
  assignmentIds: readonly string[],
): Promise<readonly TaskRow[]> {
  const { data, error } = await client.rpc("import_canvas_assignments_as_tasks_v1", {
    p_user_id: userId,
    p_assignment_ids: [...assignmentIds],
  });
  if (error) {
    if (error.message.includes("canvas_assignment_not_found")) {
      throw new TaskPlanningRepositoryError(
        "canvas_assignment_not_found",
        "One or more synchronized Canvas assignments were not found.",
      );
    }
    throw storageFailure("Canvas assignments could not be imported.");
  }
  return (data ?? []) as TaskRow[];
}

const CANVAS_IMPORT_BATCH = 100;

/**
 * Makes synchronized Canvas work schedulable before planning, so the student
 * never has to add an ordinary assignment to Tasks first. The import RPC is
 * idempotent (existing tasks are left untouched, including their status and
 * estimate); only eligible IDs from the canonical activity model are sent. Returns how many assignments were considered new.
 */
export async function importSchedulableCanvasAssignments(
  client: SupabaseClient<Database>,
  userId: string,
  now: number,
): Promise<number> {
  const { activities } = await readActivityContext(experienceRepository(client), userId, now, now + 86_400_000);
  const ids = activities.filter(activity => activity.source === "canvas" && !activity.taskId &&
    activity.status !== "submitted" && activity.status !== "completed" &&
    activity.dueAt && Date.parse(activity.dueAt) > now).map(activity => activity.id.slice("canvas:".length)).sort();
  for (let index = 0; index < ids.length; index += CANVAS_IMPORT_BATCH) {
    await importOwnedCanvasAssignments(client, userId, ids.slice(index, index + CANVAS_IMPORT_BATCH));
  }
  return ids.length;
}

export async function loadOwnedPlannerTasks(
  client: SupabaseClient<Database>,
  userId: string,
  taskIds?: readonly string[],
): Promise<readonly PlannerTask[]> {
  if (taskIds?.length === 0) return [];
  const now = Date.now();
  const { activities, tasks } = await readActivityContext(experienceRepository(client), userId, now, now + 86_400_000);
  const eligible = new Map(activities.filter(activity => activity.status !== "submitted" && activity.status !== "completed").map(activity => [activity.taskId, activity]));
  const requested = taskIds ? new Set(taskIds) : null;
  return tasks.filter(row => row.status === "pending" && eligible.has(row.id) && (!requested || requested.has(row.id)))
    .map(row => ({ id: row.id, title: eligible.get(row.id)!.title, dueAt: eligible.get(row.id)!.dueAt, estimatedMinutes: row.estimated_minutes, priority: row.priority, createdAt: row.created_at }));
}

const LIBRARY_PAGE = 200;
const MAX_LIBRARY_ROWS = 10_000;

/**
 * Saved reviewers the Today plan may schedule, filtered and ordered by the
 * shared selector: successfully generated (latest version present), not
 * superseded, from current courses, not opened in the last 24 hours and not
 * already holding a kept block inside this planning range (the local day).
 */
export async function loadOwnedReviewerCandidates(
  client: SupabaseClient<Database>,
  userId: string,
  range: PlanningRange,
  now: number,
  explicitlySelectedIds?: ReadonlySet<string>,
): Promise<readonly PlannerReviewer[]> {
  const repository = experienceRepository(client);
  const [library, courses, context, opens, kept] = await Promise.all([
    readOwnedLibraryReviewers(client, userId),
    repository.rows("canvas_courses", userId),
    readActivityContext(repository, userId, now, now + 86_400_000),
    readOwnedReviewerOpens(client, userId),
    readKeptReviewerBlocks(client, userId, range),
  ]);
  const nextDueByCourse = new Map<string, number>();
  for (const activity of context.activities) {
    if (activity.status === "submitted" || activity.status === "completed" || !activity.course || !activity.dueAt) continue;
    const due = Date.parse(activity.dueAt);
    if (!(due > now)) continue;
    nextDueByCourse.set(activity.course.id, Math.min(due, nextDueByCourse.get(activity.course.id) ?? Number.POSITIVE_INFINITY));
  }
  return selectReviewerCandidates({
    reviewers: library.map((summary) => ({ ...summary, lastOpenedAt: opens.get(summary.id) ?? null })),
    currentCourseIds: new Set(courses.filter((course) => course.user_id === userId && !isPastStoredCourse(course, now)).map((course) => course.id)),
    nextDueByCourse,
    excludedIds: kept,
    now,
    explicitlySelectedIds,
  });
}

/** Stored owner-scoped evidence only: no provider, sync, estimate refresh or Library endpoint. */
export async function loadOwnedPlanningCandidates(
  client: SupabaseClient<Database>, userId: string,
  request: { planningRange: PlanningRange; availability: readonly PlanningRange[] }, now: number,
): Promise<PlanningCandidates> {
  const repository = experienceRepository(client);
  const [context, library, opens, kept] = await Promise.all([
    readActivityContext(repository, userId, now, now + 86_400_000),
    readOwnedLibraryReviewers(client, userId), readOwnedReviewerOpens(client, userId),
    readKeptReviewerBlocks(client, userId, request.planningRange),
  ]);
  const current = context.courses.filter(course => course.user_id === userId && !isPastStoredCourse(course, now));
  let courses: ReturnType<typeof orderGenerateCourses>;
  try { courses = orderGenerateCourses(await readStoredPlanningCourseInventory(client, userId, current, new Date(now))); }
  catch { throw storageFailure('Courses could not be loaded.'); }
  const courseIds = new Set(courses.map(course => course.id));
  const eligibleTasks = new Map(context.activities.filter(item => item.status !== "submitted" && item.status !== "completed")
    .map(item => [item.taskId, item]));
  const tasks: PlanningCandidate[] = context.tasks.filter(task => task.user_id === userId && task.status === "pending" && eligibleTasks.has(task.id))
    .map(task => ({ kind: "task", id: task.id, title: eligibleTasks.get(task.id)!.title,
      ...(task.canvas_assignment_row_id ? { canvasAssignmentId: task.canvas_assignment_row_id } : {}),
      courseId: eligibleTasks.get(task.id)!.course?.id ?? null, estimateMinutes: task.estimated_minutes,
      openedWithin24h: false, dueAt: eligibleTasks.get(task.id)!.dueAt, priority: task.priority, createdAt: task.created_at }));
  // A read must not materialize tasks. List synchronized future assignments
  // using their owned UUID until Build admits only the selected local rows.
  for (const activity of context.activities) {
    if (activity.source !== 'canvas' || activity.taskId || activity.status === 'submitted' || activity.status === 'completed' ||
      !activity.dueAt || Date.parse(activity.dueAt) <= now) continue;
    const assignmentId = activity.id.slice('canvas:'.length);
    const assignment = context.assignments.find(row => row.id === assignmentId && row.user_id === userId);
    if (!assignment) continue;
    tasks.push({ kind: 'task', id: assignmentId, canvasAssignmentId: assignmentId, needsTaskImport: true,
      title: activity.title, courseId: activity.course?.id ?? null, estimateMinutes: DEFAULT_CANVAS_TASK_ESTIMATE_MINUTES,
      openedWithin24h: false, dueAt: activity.dueAt, priority: activity.priority, createdAt: assignment.created_at });
  }
  const nextDueByCourse = new Map<string, number>();
  for (const activity of context.activities) {
    if (!activity.course || !activity.dueAt || activity.status === "completed" || activity.status === "submitted") continue;
    const due = Date.parse(activity.dueAt);
    if (due > now) nextDueByCourse.set(activity.course.id, Math.min(due, nextDueByCourse.get(activity.course.id) ?? Infinity));
  }
  const sources = library.map(item => ({ ...item, lastOpenedAt: opens.get(item.id) ?? null }));
  // Include recent opens in this read; the sheet defaults them off. The same
  // selector still enforces current courses, successful saved work and kept blocks.
  const reviewers: PlanningCandidate[] = selectReviewerCandidates({ reviewers: sources, currentCourseIds: courseIds,
    nextDueByCourse, excludedIds: kept, now, explicitlySelectedIds: new Set(sources.map(item => item.id)) })
    .map((item, smartRank) => ({ kind: "reviewer", smartRank, id: item.id, title: item.title, courseId: item.courseId,
      estimateMinutes: reviewerBlockMinutes(item.estimatedMinutes), openedWithin24h: opens.has(item.id) && now - Date.parse(opens.get(item.id)!) < REVIEWER_REOPEN_AFTER_MS,
      dueAt: null, priority: "medium", createdAt: sources.find(source => source.id === item.id)!.createdAt }));
  const items = [...tasks, ...reviewers];
  return { courses: courses.map(course => ({ id: course.id, name: course.name, items: items.filter(item => item.courseId === course.id) })),
    personalItems: items.filter(item => item.courseId === null), planningRange: request.planningRange, availability: request.availability,
    freeWindowMinutes: request.availability.reduce((sum, window) => sum + Math.floor((Date.parse(window.endsAt) - Date.parse(window.startsAt)) / 60000), 0) };
}

async function readOwnedLibraryReviewers(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<readonly Omit<ReviewerCandidateSource, "lastOpenedAt">[]> {
  const reviewers: Omit<ReviewerCandidateSource, "lastOpenedAt">[] = [];
  for (let offset = 0; offset < MAX_LIBRARY_ROWS; offset += LIBRARY_PAGE) {
    const { data, error } = await client.from("experience_library_v1").select("id,user_id,summary")
      .eq("user_id", userId).eq("artifact_type", "reviewer").eq("superseded", false)
      .order("updated_at", { ascending: false }).order("id").range(offset, offset + LIBRARY_PAGE - 1);
    if (error || !data) throw storageFailure("Saved reviewers could not be loaded.");
    for (const row of data) {
      if (row.user_id !== userId || !row.id.startsWith("artifact:")) continue;
      const summary = readRecord(row.summary);
      const course = readRecord(summary.course);
      const minutes = summary.reviewMinutes;
      reviewers.push({
        id: row.id.slice("artifact:".length),
        title: typeof summary.title === "string" ? summary.title : "",
        courseId: typeof course.id === "string" ? course.id : null,
        createdAt: typeof summary.createdAt === "string" ? summary.createdAt : "",
        reviewMinutes: typeof minutes === "number" && Number.isFinite(minutes) && minutes > 0 ? minutes : null,
      });
    }
    if (data.length < LIBRARY_PAGE) return reviewers.filter((reviewer) => reviewer.title.trim());
  }
  throw storageFailure("Saved reviewers could not be loaded.");
}

/** Missing until the TP1 migration is applied: then nothing counts as opened. */
async function readOwnedReviewerOpens(client: SupabaseClient<Database>, userId: string): Promise<ReadonlyMap<string, string>> {
  const opens = new Map<string, string>();
  for (let offset = 0; offset < MAX_LIBRARY_ROWS; offset += LIBRARY_PAGE) {
    const { data, error } = await client.from("reviewer_opens").select("user_id,artifact_id,last_opened_at")
      .eq("user_id", userId).order("artifact_id").range(offset, offset + LIBRARY_PAGE - 1);
    if (error && isMissingSchemaError(error)) return opens;
    if (error || !data) throw storageFailure("Reviewer history could not be loaded.");
    for (const row of data) if (row.user_id === userId) opens.set(row.artifact_id, row.last_opened_at);
    if (data.length < LIBRARY_PAGE) return opens;
  }
  throw storageFailure("Reviewer history could not be loaded.");
}

/** Reviewers whose block in this range survives a replan (done or skipped). */
async function readKeptReviewerBlocks(client: SupabaseClient<Database>, userId: string, range: PlanningRange): Promise<ReadonlySet<string>> {
  const { data, error } = await client.from("study_sessions").select("user_id,reviewer_artifact_id,status")
    .eq("user_id", userId).eq("block_kind", "reviewer").neq("status", "planned")
    .lt("starts_at", range.endsAt).gt("ends_at", range.startsAt).limit(1000);
  if (error && isMissingSchemaError(error)) return new Set();
  if (error || !data) throw storageFailure("Study sessions could not be loaded.");
  return new Set(data.flatMap((row) => row.user_id === userId && row.reviewer_artifact_id ? [row.reviewer_artifact_id] : []));
}

/** Records that the owner opened one of their saved reviewers. False when it is not theirs. */
export async function recordOwnedReviewerOpen(
  client: SupabaseClient<Database>,
  userId: string,
  artifactId: string,
): Promise<boolean> {
  const { data, error } = await client.rpc("record_reviewer_open_v1", { p_user_id: userId, p_artifact_id: artifactId });
  if (error) throw storageFailure("Reviewer history could not be saved.");
  return data === true;
}

function readRecord(value: unknown): Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function persistOwnedStudyPlan(
  client: SupabaseClient<Database>,
  userId: string,
  plan: DeterministicStudyPlan,
  inputHash: string,
): Promise<{
  readonly studyPlanId: string;
  readonly sessions: readonly StudySessionWithTaskRow[];
}> {
  // Task-only plans keep the original RPC, so they never depend on the TP1
  // migration. Reviewer blocks need the typed v2 RPC and its ownership checks.
  const typed = plan.sessions.some(isReviewerProposal);
  const sessionPayload: Json = plan.sessions.map((session) => isReviewerProposal(session)
    ? { kind: "reviewer", reviewer_artifact_id: session.reviewerId, starts_at: session.startsAt, ends_at: session.endsAt }
    : {
      ...(typed ? { kind: "task" } : {}),
      task_id: session.taskId,
      starts_at: session.startsAt,
      ends_at: session.endsAt,
    });
  const { data, error } = await client.rpc(typed ? "apply_study_plan_v2" : "apply_study_plan_v1", {
    p_user_id: userId,
    p_planning_starts_at: plan.planningRange.startsAt,
    p_planning_ends_at: plan.planningRange.endsAt,
    p_algorithm_version: plan.algorithmVersion,
    p_input_hash: inputHash,
    p_sessions: sessionPayload,
  });
  const applied = data?.[0];
  if (error || !applied) throw storageFailure("Study plan could not be applied.");
  const sessions = await listOwnedStudySessions(client, userId, {
    studyPlanId: applied.study_plan_id,
    limit: Math.max(applied.session_count, 1),
  });
  if (sessions.length !== applied.session_count) {
    throw storageFailure("Applied study sessions could not be confirmed.");
  }
  return { studyPlanId: applied.study_plan_id, sessions };
}

export interface StudySessionListOptions {
  readonly startsBefore?: string;
  readonly endsAfter?: string;
  readonly studyPlanId?: string;
  readonly limit: number;
}

export async function listOwnedStudySessions(
  client: SupabaseClient<Database>,
  userId: string,
  options: StudySessionListOptions,
): Promise<readonly StudySessionWithTaskRow[]> {
  return attachOwnedReviewerTargets(client, userId, await reconcileCanvasSessions(client, userId, await readOwnedStudySessions(client, userId, options)));
}

async function readOwnedStudySessions(
  client: SupabaseClient<Database>,
  userId: string,
  options: StudySessionListOptions,
): Promise<readonly StudySessionWithTaskRow[]> {
  if (sessionTaskEmbedSupported) {
    const embedded = await withSessionColumns((columns) => selectOwnedStudySessions(
      client,
      userId,
      options,
      withTaskEmbed(columns),
    ));
    if (!embedded.error) {
      return (embedded.data ?? []) as unknown as StudySessionWithTaskRow[];
    }
    if (!isUnresolvedEmbedError(embedded.error)) {
      throw storageFailure("Study sessions could not be loaded.");
    }
    sessionTaskEmbedSupported = false;
  }

  const plain = await withSessionColumns((columns) => selectOwnedStudySessions(client, userId, options, columns));
  if (plain.error || !plain.data) {
    throw storageFailure("Study sessions could not be loaded.");
  }
  return attachOwnedTaskSummaries(client, userId, plain.data as unknown as StudySessionRow[]);
}

/**
 * Reviewer blocks carry the saved reviewer they open. A block whose reviewer
 * was deleted has nothing left to open, so it is no longer shown.
 */
async function attachOwnedReviewerTargets(
  client: SupabaseClient<Database>,
  userId: string,
  sessions: readonly StudySessionWithTaskRow[],
): Promise<readonly StudySessionWithTaskRow[]> {
  const ids = sessions.flatMap((session) => session.block_kind === "reviewer" && session.reviewer_artifact_id ? [session.reviewer_artifact_id] : []);
  if (ids.length === 0) return sessions;
  const targets = await readOwnedReviewerTargets(client, userId, ids);
  return sessions.flatMap((session) => {
    if (session.block_kind !== "reviewer") return [session];
    const reviewer = session.reviewer_artifact_id ? targets.get(session.reviewer_artifact_id) : undefined;
    return reviewer ? [{ ...session, task: null, reviewer }] : [];
  });
}

/** Reconcile the display without overwriting the student's saved task/session state. */
async function reconcileCanvasSessions(client: SupabaseClient<Database>, userId: string, sessions: readonly StudySessionWithTaskRow[]): Promise<readonly StudySessionWithTaskRow[]> {
  if (!sessions.some(session => session.task?.source_type === "canvas" || session.task?.canvas_assignment_row_id)) return sessions;
  const now = Date.now();
  const { activities } = await readActivityContext(experienceRepository(client), userId, now, now + 86_400_000);
  const byTask = new Map(activities.filter(activity => activity.taskId).map(activity => [activity.taskId, activity]));
  return sessions.flatMap(session => {
    if (session.task?.source_type !== "canvas" && !session.task?.canvas_assignment_row_id) return [session];
    const activity = session.task_id ? byTask.get(session.task_id) : undefined;
    if (!activity) return [];
    const done = activity.status === "submitted" || activity.status === "completed";
    return [{ ...session, status: session.status === "planned" && done ? "completed" as const : session.status,
      task: session.task ? { ...session.task, title: activity.title, due_at: activity.dueAt, status: done ? "completed" as const : session.task.status } : null }];
  });
}

function selectOwnedStudySessions(
  client: SupabaseClient<Database>,
  userId: string,
  options: StudySessionListOptions,
  columns: string,
) {
  let query = client
    .from("study_sessions")
    .select(columns)
    .eq("user_id", userId)
    .order("starts_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(options.limit);
  if (options.startsBefore) query = query.lt("starts_at", options.startsBefore);
  if (options.endsAfter) query = query.gt("ends_at", options.endsAfter);
  if (options.studyPlanId) query = query.eq("study_plan_id", options.studyPlanId);
  return query;
}

/**
 * Bounded by the caller's already-capped session page, so this is one extra
 * query per request in the fallback path and never a paginated task walk. The
 * lookup stays owner-scoped independently of the sessions it decorates.
 */
async function attachOwnedTaskSummaries(
  client: SupabaseClient<Database>,
  userId: string,
  sessions: readonly StudySessionRow[],
): Promise<readonly StudySessionWithTaskRow[]> {
  const taskIds = [...new Set(sessions.flatMap((session) => session.task_id ? [session.task_id] : []))];
  if (taskIds.length === 0) return sessions.map((session) => ({ ...session, task: null }));
  const { data, error } = await client
    .from("tasks")
    .select(SESSION_TASK_SUMMARY_COLUMNS)
    .eq("user_id", userId)
    .in("id", taskIds);
  if (error || !data) throw storageFailure("Study sessions could not be loaded.");
  const summaries = new Map(
    (data as StudySessionTaskSummaryRow[]).map((task) => [task.id, task]),
  );
  return sessions.map((session) => ({
    ...session,
    task: session.task_id ? summaries.get(session.task_id) ?? null : null,
  }));
}

export async function findOwnedStudySession(
  client: SupabaseClient<Database>,
  userId: string,
  sessionId: string,
): Promise<StudySessionRow | null> {
  const { data, error } = await withSessionColumns((columns) => client
    .from("study_sessions")
    .select(columns)
    .eq("user_id", userId)
    .eq("id", sessionId)
    .maybeSingle());
  if (error) throw storageFailure("Study session could not be loaded.");
  return data as unknown as StudySessionRow | null;
}

export async function updateOwnedStudySession(
  client: SupabaseClient<Database>,
  userId: string,
  sessionId: string,
  update: StudySessionUpdate,
): Promise<StudySessionWithTaskRow | null> {
  // A failed RETURNING list fails the whole statement, so the column fallback
  // retry never applies the update twice.
  const { data, error } = await withSessionColumns((columns) => client
    .from("study_sessions")
    .update(update)
    .eq("user_id", userId)
    .eq("id", sessionId)
    .select(columns)
    .maybeSingle());
  if (error) throw storageFailure("Study session could not be updated.");
  const row = data as unknown as StudySessionRow | null;
  if (!row) return null;
  // One decorated row: the shared lookups keep the moved block's response
  // identical in shape to the list contract without a second embed path.
  const [decorated] = await attachOwnedTaskSummaries(client, userId, [row]);
  const [withReviewer] = await attachOwnedReviewerTargets(client, userId, [decorated ?? { ...row, task: null }]);
  return withReviewer ?? { ...row, task: null, reviewer: null };
}

export async function deleteOwnedStudySession(
  client: SupabaseClient<Database>,
  userId: string,
  sessionId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("study_sessions")
    .delete()
    .eq("user_id", userId)
    .eq("id", sessionId)
    .select("id")
    .maybeSingle();
  if (error) throw storageFailure("Study session could not be deleted.");
  return data !== null;
}

export function toTaskView(row: TaskRow): TaskView {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    status: row.status,
    priority: row.priority,
    dueAt: row.due_at,
    estimatedMinutes: row.estimated_minutes,
    estimateSource: row.estimate_source,
    estimateNote: row.estimate_note,
    sourceType: row.source_type,
    canvasConnectionId: row.canvas_connection_id,
    canvasCourseId: row.canvas_course_id,
    canvasAssignmentId: row.canvas_assignment_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

export function toStudySessionView(row: StudySessionWithTaskRow): StudySessionView {
  if (row.block_kind === "reviewer") {
    // A reviewer block's status is its own: it never reads or completes a task.
    return {
      id: row.id,
      studyPlanId: row.study_plan_id,
      taskId: null,
      kind: "reviewer",
      reviewer: row.reviewer
        ? { id: row.reviewer.id, title: row.reviewer.title, courseId: row.reviewer.course?.id ?? null }
        : null,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      task: null,
    };
  }
  return {
    id: row.id,
    studyPlanId: row.study_plan_id,
    taskId: row.task_id,
    kind: "task",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status === "planned" && row.task?.status === "completed" ? "completed" : row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    task: row.task ? toStudySessionTaskSummary(row.task) : null,
  };
}

function toStudySessionTaskSummary(
  row: StudySessionTaskSummaryRow,
): StudySessionTaskSummary {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    dueAt: row.due_at,
    canvasCourseId: row.canvas_course_id,
  };
}

function storageFailure(message: string): TaskPlanningRepositoryError {
  return new TaskPlanningRepositoryError("task_storage_failed", message);
}
