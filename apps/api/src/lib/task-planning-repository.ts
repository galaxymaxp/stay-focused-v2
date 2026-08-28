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
  PlannerTask,
  StudySessionTaskSummary,
  StudySessionView,
  TaskStatus,
  TaskView,
} from "@stay-focused/shared/task-planning";
import type { SupabaseClient } from "@supabase/supabase-js";

const TASK_COLUMNS =
  "id,user_id,title,notes,status,priority,due_at,estimated_minutes,source_type,canvas_connection_id,canvas_course_id,canvas_assignment_id,canvas_assignment_row_id,created_at,updated_at,completed_at";
const SESSION_COLUMNS =
  "id,user_id,study_plan_id,task_id,starts_at,ends_at,status,created_at,updated_at";
const SESSION_TASK_SUMMARY_COLUMNS =
  "id,title,status,priority,due_at,canvas_course_id";

// The embedded task summary is resolved through the composite owner foreign key
// so PostgREST applies the caller's own `tasks` RLS policy to the joined rows.
// `Database` is maintained by hand and carries no relationship metadata, so the
// literal-type select parser cannot describe this shape; the widened `string`
// keeps the call compiling and the result is narrowed explicitly below.
const SESSION_WITH_TASK_COLUMNS: string =
  `${SESSION_COLUMNS},task:tasks!study_sessions_task_owner_fkey(${SESSION_TASK_SUMMARY_COLUMNS})`;

type StudySessionTaskSummaryRow = Pick<
  TaskRow,
  "id" | "title" | "status" | "priority" | "due_at" | "canvas_course_id"
>;

export interface StudySessionWithTaskRow extends StudySessionRow {
  readonly task: StudySessionTaskSummaryRow | null;
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

export async function loadOwnedPlannerTasks(
  client: SupabaseClient<Database>,
  userId: string,
  taskIds?: readonly string[],
): Promise<readonly PlannerTask[]> {
  if (taskIds?.length === 0) return [];
  let query = client
    .from("tasks")
    .select("id,title,due_at,estimated_minutes,priority,created_at")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (taskIds) query = query.in("id", [...taskIds]);
  const { data, error } = await query;
  if (error || !data) throw storageFailure("Tasks could not be prepared for planning.");
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    dueAt: row.due_at,
    estimatedMinutes: row.estimated_minutes,
    priority: row.priority,
    createdAt: row.created_at,
  }));
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
  const sessionPayload: Json = plan.sessions.map((session) => ({
    task_id: session.taskId,
    starts_at: session.startsAt,
    ends_at: session.endsAt,
  }));
  const { data, error } = await client.rpc("apply_study_plan_v1", {
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
  if (sessionTaskEmbedSupported) {
    const embedded = await selectOwnedStudySessions(
      client,
      userId,
      options,
      SESSION_WITH_TASK_COLUMNS,
    );
    if (!embedded.error) {
      return (embedded.data ?? []) as unknown as StudySessionWithTaskRow[];
    }
    if (!isUnresolvedEmbedError(embedded.error)) {
      throw storageFailure("Study sessions could not be loaded.");
    }
    sessionTaskEmbedSupported = false;
  }

  const plain = await selectOwnedStudySessions(client, userId, options, SESSION_COLUMNS);
  if (plain.error || !plain.data) {
    throw storageFailure("Study sessions could not be loaded.");
  }
  return attachOwnedTaskSummaries(
    client,
    userId,
    plain.data as unknown as StudySessionRow[],
  );
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
  const taskIds = [...new Set(sessions.map((session) => session.task_id))];
  if (taskIds.length === 0) return [];
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
    task: summaries.get(session.task_id) ?? null,
  }));
}

export async function findOwnedStudySession(
  client: SupabaseClient<Database>,
  userId: string,
  sessionId: string,
): Promise<StudySessionRow | null> {
  const { data, error } = await client
    .from("study_sessions")
    .select(SESSION_COLUMNS)
    .eq("user_id", userId)
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw storageFailure("Study session could not be loaded.");
  return data as StudySessionRow | null;
}

export async function updateOwnedStudySession(
  client: SupabaseClient<Database>,
  userId: string,
  sessionId: string,
  update: StudySessionUpdate,
): Promise<StudySessionWithTaskRow | null> {
  const { data, error } = await client
    .from("study_sessions")
    .update(update)
    .eq("user_id", userId)
    .eq("id", sessionId)
    .select(SESSION_COLUMNS)
    .maybeSingle();
  if (error) throw storageFailure("Study session could not be updated.");
  const row = data as StudySessionRow | null;
  if (!row) return null;
  // One decorated row: the shared lookup keeps the moved block's response
  // identical in shape to the list contract without a second embed path.
  const [decorated] = await attachOwnedTaskSummaries(client, userId, [row]);
  return decorated ?? { ...row, task: null };
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
  return {
    id: row.id,
    studyPlanId: row.study_plan_id,
    taskId: row.task_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
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
