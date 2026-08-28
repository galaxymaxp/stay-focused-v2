export const TASK_STATUSES = ["pending", "completed"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_SOURCE_TYPES = ["manual", "canvas"] as const;
export type TaskSourceType = (typeof TASK_SOURCE_TYPES)[number];

export const STUDY_SESSION_STATUSES = ["planned", "completed", "skipped"] as const;
export type StudySessionStatus = (typeof STUDY_SESSION_STATUSES)[number];

export const DEFAULT_MANUAL_TASK_ESTIMATE_MINUTES = 30;
export const DEFAULT_CANVAS_TASK_ESTIMATE_MINUTES = 60;
export const DEFAULT_TASK_PRIORITY: TaskPriority = "medium";
export const MAX_TASK_ESTIMATE_MINUTES = 24 * 60;
export const MAX_STUDY_SESSION_MINUTES = 90;
export const MAX_PLANNING_TASKS = 200;
export const MAX_AVAILABILITY_WINDOWS = 100;

const MAX_TASK_TITLE_LENGTH = 200;
const MAX_TASK_NOTES_LENGTH = 5_000;
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface TaskView {
  readonly id: string;
  readonly title: string;
  readonly notes: string | null;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly dueAt: string | null;
  readonly estimatedMinutes: number;
  readonly sourceType: TaskSourceType;
  readonly canvasConnectionId: string | null;
  readonly canvasCourseId: string | null;
  readonly canvasAssignmentId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | null;
}

export interface CreateTaskInput {
  readonly title: string;
  readonly notes: string | null;
  readonly priority: TaskPriority;
  readonly dueAt: string | null;
  readonly estimatedMinutes: number;
}

export interface PatchTaskInput {
  readonly title?: string;
  readonly notes?: string | null;
  readonly status?: TaskStatus;
  readonly priority?: TaskPriority;
  readonly dueAt?: string | null;
  readonly estimatedMinutes?: number;
}

/**
 * The minimum owned task information a schedule surface needs to render a
 * persisted study session. Deliberately narrower than {@link TaskView}: notes,
 * estimates, and Canvas identifiers are excluded so a 200-session response
 * cannot carry hundreds of kilobytes of task bodies. `/api/tasks/:taskId`
 * remains the canonical task resource.
 */
export interface StudySessionTaskSummary {
  readonly id: string;
  readonly title: string;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly dueAt: string | null;
  readonly canvasCourseId: string | null;
}

export interface StudySessionView {
  readonly id: string;
  readonly studyPlanId: string | null;
  readonly taskId: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly status: StudySessionStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  /**
   * Null only when the owned task could not be resolved alongside the session.
   * The owner-scoped foreign key makes that an invariant violation rather than
   * an expected state, so schedule surfaces should treat it as a degraded row
   * instead of hiding the block.
   */
  readonly task: StudySessionTaskSummary | null;
}

export interface AvailabilityWindow {
  readonly startsAt: string;
  readonly endsAt: string;
}

export interface PlanningRange {
  readonly startsAt: string;
  readonly endsAt: string;
}

export interface StudyPlanningRequest {
  readonly planningRange: PlanningRange;
  readonly availability: readonly AvailabilityWindow[];
  readonly taskIds?: readonly string[];
}

export interface PlannerTask {
  readonly id: string;
  readonly title: string;
  readonly dueAt: string | null;
  readonly estimatedMinutes: number;
  readonly priority: TaskPriority;
  readonly createdAt: string;
}

export interface ProposedStudySession {
  readonly proposalId: string;
  readonly taskId: string;
  readonly taskTitle: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly durationMinutes: number;
  readonly scheduledAfterDeadline: boolean;
}

export interface UnscheduledTaskWork {
  readonly taskId: string;
  readonly taskTitle: string;
  readonly estimatedMinutes: number;
  readonly scheduledMinutes: number;
  readonly unscheduledMinutes: number;
  readonly reason: "insufficient_availability";
}

export interface DeterministicStudyPlan {
  readonly algorithmVersion: "deterministic-v1";
  readonly planningRange: PlanningRange;
  readonly availability: readonly AvailabilityWindow[];
  readonly sessions: readonly ProposedStudySession[];
  readonly unscheduledWork: readonly UnscheduledTaskWork[];
}

export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly code: "invalid_request";
      readonly message: string;
    };

export class PlanningValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanningValidationError";
  }
}

export function validateCreateTaskInput(
  value: unknown,
): ValidationResult<CreateTaskInput> {
  if (!isRecord(value)) {
    return invalid("Request body must be a JSON object.");
  }
  const allowed = new Set([
    "title",
    "notes",
    "priority",
    "dueAt",
    "estimatedMinutes",
  ]);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    return invalid("Request body contains unsupported task fields.");
  }

  const title = readTitle(value.title);
  if (!title.ok) return title;
  const notes = readNotes(value.notes);
  if (!notes.ok) return notes;
  const priority = readPriority(value.priority ?? DEFAULT_TASK_PRIORITY);
  if (!priority.ok) return priority;
  const dueAt = readNullableTimestamp(value.dueAt, "dueAt");
  if (!dueAt.ok) return dueAt;
  const estimate = readEstimate(
    value.estimatedMinutes ?? DEFAULT_MANUAL_TASK_ESTIMATE_MINUTES,
  );
  if (!estimate.ok) return estimate;

  return {
    ok: true,
    value: {
      title: title.value,
      notes: notes.value,
      priority: priority.value,
      dueAt: dueAt.value,
      estimatedMinutes: estimate.value,
    },
  };
}

export function validatePatchTaskInput(
  value: unknown,
): ValidationResult<PatchTaskInput> {
  if (!isRecord(value)) {
    return invalid("Request body must be a JSON object.");
  }
  const allowed = new Set([
    "title",
    "notes",
    "status",
    "priority",
    "dueAt",
    "estimatedMinutes",
  ]);
  const keys = Object.keys(value);
  if (keys.length === 0 || keys.some((key) => !allowed.has(key))) {
    return invalid("Provide at least one supported task field.");
  }

  const result: {
    title?: string;
    notes?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueAt?: string | null;
    estimatedMinutes?: number;
  } = {};
  if ("title" in value) {
    const parsed = readTitle(value.title);
    if (!parsed.ok) return parsed;
    result.title = parsed.value;
  }
  if ("notes" in value) {
    const parsed = readNotes(value.notes);
    if (!parsed.ok) return parsed;
    result.notes = parsed.value;
  }
  if ("status" in value) {
    const parsed = readStatus(value.status);
    if (!parsed.ok) return parsed;
    result.status = parsed.value;
  }
  if ("priority" in value) {
    const parsed = readPriority(value.priority);
    if (!parsed.ok) return parsed;
    result.priority = parsed.value;
  }
  if ("dueAt" in value) {
    const parsed = readNullableTimestamp(value.dueAt, "dueAt");
    if (!parsed.ok) return parsed;
    result.dueAt = parsed.value;
  }
  if ("estimatedMinutes" in value) {
    const parsed = readEstimate(value.estimatedMinutes);
    if (!parsed.ok) return parsed;
    result.estimatedMinutes = parsed.value;
  }
  return { ok: true, value: result };
}

export function validateStudyPlanningRequest(
  value: unknown,
): ValidationResult<StudyPlanningRequest> {
  if (!isRecord(value)) {
    return invalid("Request body must be a JSON object.");
  }
  const allowed = new Set(["planningRange", "availability", "taskIds"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    return invalid("Request body contains unsupported planning fields.");
  }
  if (!isRecord(value.planningRange)) {
    return invalid("planningRange is required.");
  }
  const range = normalizeRange(value.planningRange);
  if (!range.ok) return range;
  if (!Array.isArray(value.availability) || value.availability.length === 0) {
    return invalid("availability must contain at least one window.");
  }
  if (value.availability.length > MAX_AVAILABILITY_WINDOWS) {
    return invalid(`availability must contain at most ${MAX_AVAILABILITY_WINDOWS} windows.`);
  }
  const windows: AvailabilityWindow[] = [];
  for (const entry of value.availability) {
    if (!isRecord(entry)) return invalid("Every availability window must be an object.");
    const window = normalizeRange(entry);
    if (!window.ok) return invalid(`Invalid availability window: ${window.message}`);
    windows.push(window.value);
  }
  const normalized = normalizeAvailability(range.value, windows);

  let taskIds: readonly string[] | undefined;
  if (value.taskIds !== undefined) {
    if (!Array.isArray(value.taskIds) || value.taskIds.length > MAX_PLANNING_TASKS) {
      return invalid(`taskIds must be an array of at most ${MAX_PLANNING_TASKS} UUIDs.`);
    }
    if (value.taskIds.some((id) => typeof id !== "string" || !isUuid(id))) {
      return invalid("taskIds must contain valid UUIDs.");
    }
    const trimmed = value.taskIds.map((id) => id.trim());
    if (new Set(trimmed).size !== trimmed.length) {
      return invalid("taskIds must not contain duplicates.");
    }
    taskIds = [...trimmed].sort((left, right) => left.localeCompare(right));
  }

  return {
    ok: true,
    value: {
      planningRange: range.value,
      availability: normalized,
      ...(taskIds ? { taskIds } : {}),
    },
  };
}

export function generateDeterministicStudyPlan({
  tasks,
  planningRange,
  availability,
}: {
  readonly tasks: readonly PlannerTask[];
  readonly planningRange: PlanningRange;
  readonly availability: readonly AvailabilityWindow[];
}): DeterministicStudyPlan {
  const normalizedRange = requireRange(planningRange, "planning range");
  if (tasks.length > MAX_PLANNING_TASKS) {
    throw new PlanningValidationError(
      `At most ${MAX_PLANNING_TASKS} tasks may be planned at once.`,
    );
  }
  if (availability.length === 0) {
    throw new PlanningValidationError("At least one availability window is required.");
  }
  const normalizedWindows = normalizeAvailability(
    normalizedRange,
    availability.map((window) => requireRange(window, "availability window")),
  );
  const normalizedTasks = tasks.map(normalizePlannerTask);
  if (new Set(normalizedTasks.map((task) => task.id)).size !== normalizedTasks.length) {
    throw new PlanningValidationError("Planner task IDs must be unique.");
  }
  const orderedTasks = [...normalizedTasks].sort(comparePlannerTasks);
  const workingWindows = normalizedWindows.map((window) => ({
    cursor: Date.parse(window.startsAt),
    end: Date.parse(window.endsAt),
  }));
  const sessions: ProposedStudySession[] = [];
  const unscheduledWork: UnscheduledTaskWork[] = [];
  let proposalSequence = 1;

  for (const task of orderedTasks) {
    let remaining = task.estimatedMinutes;
    const dueTime = task.dueAt ? Date.parse(task.dueAt) : null;
    for (const window of workingWindows) {
      while (remaining > 0) {
        const availableMinutes = Math.floor((window.end - window.cursor) / 60_000);
        if (availableMinutes <= 0) break;
        let duration = Math.min(
          remaining,
          availableMinutes,
          MAX_STUDY_SESSION_MINUTES,
        );
        if (dueTime !== null && window.cursor < dueTime) {
          const beforeDeadline = Math.floor((dueTime - window.cursor) / 60_000);
          if (beforeDeadline > 0 && beforeDeadline < duration) {
            duration = beforeDeadline;
          }
        }
        if (duration <= 0) break;
        const startsAtMs = window.cursor;
        const endsAtMs = startsAtMs + duration * 60_000;
        sessions.push({
          proposalId: `session-${String(proposalSequence).padStart(3, "0")}`,
          taskId: task.id,
          taskTitle: task.title,
          startsAt: new Date(startsAtMs).toISOString(),
          endsAt: new Date(endsAtMs).toISOString(),
          durationMinutes: duration,
          scheduledAfterDeadline: dueTime !== null && endsAtMs > dueTime,
        });
        proposalSequence += 1;
        window.cursor = endsAtMs;
        remaining -= duration;
      }
      if (remaining === 0) break;
    }
    if (remaining > 0) {
      unscheduledWork.push({
        taskId: task.id,
        taskTitle: task.title,
        estimatedMinutes: task.estimatedMinutes,
        scheduledMinutes: task.estimatedMinutes - remaining,
        unscheduledMinutes: remaining,
        reason: "insufficient_availability",
      });
    }
  }

  return {
    algorithmVersion: "deterministic-v1",
    planningRange: normalizedRange,
    availability: normalizedWindows,
    sessions,
    unscheduledWork,
  };
}

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value.trim());
}

function normalizePlannerTask(task: PlannerTask): PlannerTask {
  if (!isUuid(task.id)) throw new PlanningValidationError("Planner task IDs must be UUIDs.");
  const title = readTitle(task.title);
  if (!title.ok) throw new PlanningValidationError(title.message);
  const estimate = readEstimate(task.estimatedMinutes);
  if (!estimate.ok) throw new PlanningValidationError(estimate.message);
  const priority = readPriority(task.priority);
  if (!priority.ok) throw new PlanningValidationError(priority.message);
  const dueAt = readNullableTimestamp(task.dueAt, "dueAt");
  if (!dueAt.ok) throw new PlanningValidationError(dueAt.message);
  const createdAt = readTimestamp(task.createdAt, "createdAt");
  if (!createdAt.ok) throw new PlanningValidationError(createdAt.message);
  return {
    id: task.id.trim(),
    title: title.value,
    estimatedMinutes: estimate.value,
    priority: priority.value,
    dueAt: dueAt.value,
    createdAt: createdAt.value,
  };
}

function comparePlannerTasks(left: PlannerTask, right: PlannerTask): number {
  const leftDue = left.dueAt ? Date.parse(left.dueAt) : Number.POSITIVE_INFINITY;
  const rightDue = right.dueAt ? Date.parse(right.dueAt) : Number.POSITIVE_INFINITY;
  if (leftDue !== rightDue) return leftDue - rightDue;
  const ranks: Readonly<Record<TaskPriority, number>> = { high: 0, medium: 1, low: 2 };
  if (ranks[left.priority] !== ranks[right.priority]) {
    return ranks[left.priority] - ranks[right.priority];
  }
  const createdDifference = Date.parse(left.createdAt) - Date.parse(right.createdAt);
  return createdDifference || left.id.localeCompare(right.id);
}

function normalizeAvailability(
  range: PlanningRange,
  windows: readonly AvailabilityWindow[],
): readonly AvailabilityWindow[] {
  const rangeStart = Date.parse(range.startsAt);
  const rangeEnd = Date.parse(range.endsAt);
  const clipped = windows
    .map((window) => {
      const valid = requireRange(window, "availability window");
      return {
        start: Math.max(rangeStart, Date.parse(valid.startsAt)),
        end: Math.min(rangeEnd, Date.parse(valid.endsAt)),
      };
    })
    .filter((window) => window.start < window.end)
    .sort((left, right) => left.start - right.start || left.end - right.end);
  const merged: Array<{ start: number; end: number }> = [];
  for (const window of clipped) {
    const previous = merged.at(-1);
    if (previous && window.start <= previous.end) {
      previous.end = Math.max(previous.end, window.end);
    } else {
      merged.push({ ...window });
    }
  }
  return merged.map((window) => ({
    startsAt: new Date(window.start).toISOString(),
    endsAt: new Date(window.end).toISOString(),
  }));
}

function normalizeRange(value: Readonly<Record<string, unknown>>): ValidationResult<PlanningRange> {
  if (Object.keys(value).some((key) => key !== "startsAt" && key !== "endsAt")) {
    return invalid("Time ranges contain unsupported fields.");
  }
  const startsAt = readTimestamp(value.startsAt, "startsAt");
  if (!startsAt.ok) return startsAt;
  const endsAt = readTimestamp(value.endsAt, "endsAt");
  if (!endsAt.ok) return endsAt;
  if (Date.parse(startsAt.value) >= Date.parse(endsAt.value)) {
    return invalid("startsAt must be earlier than endsAt.");
  }
  return { ok: true, value: { startsAt: startsAt.value, endsAt: endsAt.value } };
}

function requireRange(value: AvailabilityWindow | PlanningRange, label: string): PlanningRange {
  const normalized = normalizeRange(value as unknown as Readonly<Record<string, unknown>>);
  if (!normalized.ok) throw new PlanningValidationError(`Invalid ${label}: ${normalized.message}`);
  return normalized.value;
}

function readTitle(value: unknown): ValidationResult<string> {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > MAX_TASK_TITLE_LENGTH) {
    return invalid(`title must contain between 1 and ${MAX_TASK_TITLE_LENGTH} characters.`);
  }
  return { ok: true, value: value.trim() };
}

function readNotes(value: unknown): ValidationResult<string | null> {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== "string" || value.length > MAX_TASK_NOTES_LENGTH) {
    return invalid(`notes must contain at most ${MAX_TASK_NOTES_LENGTH} characters.`);
  }
  return { ok: true, value: value.trim() || null };
}

function readEstimate(value: unknown): ValidationResult<number> {
  if (!Number.isInteger(value) || typeof value !== "number" || value < 1 || value > MAX_TASK_ESTIMATE_MINUTES) {
    return invalid(`estimatedMinutes must be an integer between 1 and ${MAX_TASK_ESTIMATE_MINUTES}.`);
  }
  return { ok: true, value };
}

function readPriority(value: unknown): ValidationResult<TaskPriority> {
  if (!TASK_PRIORITIES.some((priority) => priority === value)) {
    return invalid("priority must be low, medium, or high.");
  }
  return { ok: true, value: value as TaskPriority };
}

function readStatus(value: unknown): ValidationResult<TaskStatus> {
  if (!TASK_STATUSES.some((status) => status === value)) {
    return invalid("status must be pending or completed.");
  }
  return { ok: true, value: value as TaskStatus };
}

function readNullableTimestamp(value: unknown, field: string): ValidationResult<string | null> {
  if (value === undefined || value === null) return { ok: true, value: null };
  const timestamp = readTimestamp(value, field);
  return timestamp.ok ? timestamp : timestamp;
}

function readTimestamp(value: unknown, field: string): ValidationResult<string> {
  if (typeof value !== "string" || !ISO_TIMESTAMP_PATTERN.test(value) || !Number.isFinite(Date.parse(value))) {
    return invalid(`${field} must be a valid ISO 8601 timestamp with a timezone.`);
  }
  return { ok: true, value: new Date(value).toISOString() };
}

function invalid(message: string): ValidationResult<never> {
  return { ok: false, code: "invalid_request", message };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
