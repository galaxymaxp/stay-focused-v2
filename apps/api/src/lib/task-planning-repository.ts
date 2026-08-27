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
  TaskStatus,
  TaskView,
} from "@stay-focused/shared/task-planning";
import type { SupabaseClient } from "@supabase/supabase-js";

const TASK_COLUMNS =
  "id,user_id,title,notes,status,priority,due_at,estimated_minutes,source_type,canvas_connection_id,canvas_course_id,canvas_assignment_id,canvas_assignment_row_id,created_at,updated_at,completed_at";
const SESSION_COLUMNS =
  "id,user_id,study_plan_id,task_id,starts_at,ends_at,created_at,updated_at";

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
  readonly sessions: readonly StudySessionRow[];
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

export async function listOwnedStudySessions(
  client: SupabaseClient<Database>,
  userId: string,
  options: {
    readonly startsBefore?: string;
    readonly endsAfter?: string;
    readonly studyPlanId?: string;
    readonly limit: number;
  },
): Promise<readonly StudySessionRow[]> {
  let query = client
    .from("study_sessions")
    .select(SESSION_COLUMNS)
    .eq("user_id", userId)
    .order("starts_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(options.limit);
  if (options.startsBefore) query = query.lt("starts_at", options.startsBefore);
  if (options.endsAfter) query = query.gt("ends_at", options.endsAfter);
  if (options.studyPlanId) query = query.eq("study_plan_id", options.studyPlanId);
  const { data, error } = await query;
  if (error || !data) throw storageFailure("Study sessions could not be loaded.");
  return data as StudySessionRow[];
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
): Promise<StudySessionRow | null> {
  const { data, error } = await client
    .from("study_sessions")
    .update(update)
    .eq("user_id", userId)
    .eq("id", sessionId)
    .select(SESSION_COLUMNS)
    .maybeSingle();
  if (error) throw storageFailure("Study session could not be updated.");
  return data as StudySessionRow | null;
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

export function toStudySessionView(row: StudySessionRow) {
  return {
    id: row.id,
    studyPlanId: row.study_plan_id,
    taskId: row.task_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as const;
}

function storageFailure(message: string): TaskPlanningRepositoryError {
  return new TaskPlanningRepositoryError("task_storage_failed", message);
}
