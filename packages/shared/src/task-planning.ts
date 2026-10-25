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
export const MAX_PLANNING_REVIEWERS = 200;
export const MAX_AVAILABILITY_WINDOWS = 100;

/** What the Today plan schedules. Requests that omit it plan tasks only. */
export const PLAN_MODES = ["reviewers", "tasks", "reviewers_tasks"] as const;
export type PlanMode = (typeof PLAN_MODES)[number];
/** The saved choice for users who never picked one. */
export const DEFAULT_PLAN_MODE: PlanMode = "reviewers_tasks";
export const PLAN_MODE_LABELS: Readonly<Record<PlanMode, string>> = {
  reviewers: "Reviewers",
  tasks: "Tasks",
  reviewers_tasks: "Reviewers & tasks",
};
export const PLAN_EMPTY_COPY: Readonly<Record<PlanMode, string>> = {
  reviewers: "No saved reviewers to plan yet.",
  tasks: "No open tasks to plan.",
  reviewers_tasks: "No open tasks or saved reviewers to plan.",
};
export const REVIEWER_BLOCK_MIN_MINUTES = 10;
export const REVIEWER_BLOCK_MAX_MINUTES = 45;
export const REVIEWER_BLOCK_DEFAULT_MINUTES = 20;
/** Combined plans give tasks at most this share of the free time first. */
export const TASK_BUDGET_SHARE = 0.6;
export const REVIEWER_REOPEN_AFTER_MS = 24 * 60 * 60_000;

export function isPlanMode(value: unknown): value is PlanMode {
  return PLAN_MODES.some((mode) => mode === value);
}

/** The saved study-time estimate clamped to 10–45 minutes, or 20 without one. */
export function reviewerBlockMinutes(estimate: number | null): number {
  if (estimate === null || !Number.isFinite(estimate)) return REVIEWER_BLOCK_DEFAULT_MINUTES;
  return Math.min(REVIEWER_BLOCK_MAX_MINUTES, Math.max(REVIEWER_BLOCK_MIN_MINUTES, Math.round(estimate)));
}

const MAX_TASK_TITLE_LENGTH = 200;
const MAX_TASK_NOTES_LENGTH = 5_000;
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TaskEstimateSource = "default" | "heuristic" | "ai" | "user";

const SUBMISSION_BASE_MINUTES: Readonly<Record<string, number>> = {
  online_quiz: 30,
  discussion_topic: 30,
  online_text_entry: 60,
  online_url: 45,
  media_recording: 45,
  external_tool: 45,
  online_upload: 90,
  on_paper: 60,
};

/** Deterministic fallback when the AI estimate is unavailable. Always 15–240, multiple of 5. */
export function heuristicTaskEstimateMinutes(input: {
  readonly submissionTypes: readonly string[];
  readonly pointsPossible: number | null;
  readonly descriptionCharacters: number;
}): number {
  const bases = input.submissionTypes
    .map((type) => SUBMISSION_BASE_MINUTES[type.trim().toLowerCase()])
    .filter((value): value is number => value !== undefined);
  let minutes = bases.length > 0 ? Math.max(...bases) : 60;
  if (input.pointsPossible !== null && input.pointsPossible >= 50) minutes *= 1.5;
  if (input.descriptionCharacters >= 1500) minutes *= 1.25;
  return Math.min(240, Math.max(15, Math.round(minutes / 5) * 5));
}

export interface TaskView {
  readonly id: string;
  readonly title: string;
  readonly notes: string | null;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly dueAt: string | null;
  readonly estimatedMinutes: number;
  readonly estimateSource: TaskEstimateSource;
  readonly estimateNote: string | null;
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

export type StudyBlockKind = "task" | "reviewer";

/** The saved reviewer a reviewer block opens. `id` is the Library artifact ID. */
export interface StudySessionReviewerSummary {
  readonly id: string;
  readonly title: string;
  readonly courseId: string | null;
}

export interface StudySessionView {
  readonly id: string;
  readonly studyPlanId: string | null;
  /** Null for reviewer blocks, which never reference (or complete) a task. */
  readonly taskId: string | null;
  /** Absent from pre-TP1 servers, which only stored task blocks. */
  readonly kind?: StudyBlockKind;
  /** Present for reviewer blocks; null when the reviewer is no longer saved. */
  readonly reviewer?: StudySessionReviewerSummary | null;
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
  /** Omitted keeps the original tasks-only plan and response shape. */
  readonly mode?: PlanMode;
  readonly selection?: PlanSelection;
}

export interface PlanSelection {
  readonly courseIds?: readonly string[];
  readonly items?: readonly { readonly kind: StudyBlockKind; readonly id: string }[];
  readonly order: "smart" | "manual";
}

export interface PlanningCandidate {
  readonly smartRank?: number;
  readonly kind: StudyBlockKind;
  readonly id: string;
  readonly title: string;
  readonly courseId: string | null;
  readonly estimateMinutes: number;
  readonly openedWithin24h: boolean;
  readonly dueAt: string | null;
  readonly priority: TaskPriority;
  readonly createdAt: string;
}
export interface PlanningCandidates {
  readonly courses: readonly { readonly id: string; readonly name: string; readonly items: readonly PlanningCandidate[] }[];
  readonly personalItems: readonly PlanningCandidate[];
  readonly freeWindowMinutes: number;
  readonly planningRange: PlanningRange;
  readonly availability: readonly AvailabilityWindow[];
}
export interface PlanNotFit {
  readonly kind: StudyBlockKind;
  readonly id: string;
  readonly minutes: number;
}

export interface PlannerTask {
  readonly courseId?: string | null;
  readonly id: string;
  readonly title: string;
  readonly dueAt: string | null;
  readonly estimatedMinutes: number;
  readonly priority: TaskPriority;
  readonly createdAt: string;
}

/** An eligible saved reviewer, already filtered and ordered by the selector. */
export interface PlannerReviewer {
  /** generated_artifacts.id (UUID). */
  readonly id: string;
  readonly title: string;
  readonly courseId: string | null;
  readonly estimatedMinutes: number | null;
}

interface ProposedSessionTiming {
  readonly proposalId: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly durationMinutes: number;
}

export interface ProposedTaskSession extends ProposedSessionTiming {
  /** Omitted in tasks-only responses, which keep their original shape. */
  readonly kind?: "task";
  readonly taskId: string;
  readonly taskTitle: string;
  readonly scheduledAfterDeadline: boolean;
}

export interface ProposedReviewerSession extends ProposedSessionTiming {
  readonly kind: "reviewer";
  readonly reviewerId: string;
  readonly reviewerTitle: string;
  readonly courseId: string | null;
  readonly scheduledAfterDeadline: false;
}

export type ProposedStudySession = ProposedTaskSession | ProposedReviewerSession;

export function isReviewerProposal(session: ProposedStudySession): session is ProposedReviewerSession {
  return session.kind === "reviewer";
}
export function proposalTitle(session: ProposedStudySession): string {
  return isReviewerProposal(session) ? session.reviewerTitle : session.taskTitle;
}
/** One stable key per planned target, for colors and grouping. */
export function proposalTargetKey(session: ProposedStudySession): string {
  return isReviewerProposal(session) ? `reviewer:${session.reviewerId}` : session.taskId;
}

export interface UnscheduledTaskWork {
  readonly taskId: string;
  readonly taskTitle: string;
  readonly estimatedMinutes: number;
  readonly scheduledMinutes: number;
  readonly unscheduledMinutes: number;
  readonly reason: "insufficient_availability";
}

export interface DeterministicStudyPlan<S extends ProposedStudySession = ProposedStudySession> {
  readonly algorithmVersion: "deterministic-v1";
  readonly planningRange: PlanningRange;
  readonly availability: readonly AvailabilityWindow[];
  readonly sessions: readonly S[];
  readonly unscheduledWork: readonly UnscheduledTaskWork[];
  /** Present only when the request chose a mode. */
  readonly mode?: PlanMode;
  /** Eligible candidates considered for each kind, for empty-state copy. */
  readonly candidates?: { readonly tasks: number; readonly reviewers: number };
  /** Only selection requests extend the legacy response. */
  readonly notFit?: readonly PlanNotFit[];
}

/** The decided empty-state copy when the chosen kind has nothing to plan. */
export function planEmptyMessage(plan: Pick<DeterministicStudyPlan, "mode" | "candidates">): string | null {
  if (!plan.mode || !plan.candidates) return null;
  const { tasks, reviewers } = plan.candidates;
  if (plan.mode === "reviewers") return reviewers === 0 ? PLAN_EMPTY_COPY.reviewers : null;
  if (plan.mode === "tasks") return tasks === 0 ? PLAN_EMPTY_COPY.tasks : null;
  return tasks === 0 && reviewers === 0 ? PLAN_EMPTY_COPY.reviewers_tasks : null;
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
  const allowed = new Set(["planningRange", "availability", "taskIds", "mode", "selection"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    return invalid("Request body contains unsupported planning fields.");
  }
  if ("mode" in value && !isPlanMode(value.mode)) {
    return invalid("mode must be reviewers, tasks, or reviewers_tasks.");
  }
  const mode = isPlanMode(value.mode) ? value.mode : undefined;
  const selection = value.selection === undefined ? undefined : validatePlanSelection(value.selection);
  if (selection && !selection.ok) return selection;
  if (selection && value.taskIds !== undefined) return invalid("Use selection or taskIds, not both.");
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
      ...(mode ? { mode } : {}),
      ...(selection?.ok ? { selection: selection.value } : {}),
    },
  };
}

export function validatePlanSelection(value: unknown): ValidationResult<PlanSelection> {
  if (!isRecord(value) || Object.keys(value).some(key => !["courseIds", "items", "order"].includes(key)) ||
    (value.order !== "smart" && value.order !== "manual")) return invalid("Invalid plan selection.");
  let courseIds: string[] | undefined;
  if (value.courseIds !== undefined) {
    if (!Array.isArray(value.courseIds) || value.courseIds.length > 1000 ||
      value.courseIds.some(id => typeof id !== "string" || !isUuid(id))) return invalid("Invalid selected courses.");
    courseIds = value.courseIds.map(id => (id as string).trim().toLowerCase());
    if (new Set(courseIds).size !== courseIds.length) return invalid("Duplicate selected courses.");
  }
  let items: { kind: StudyBlockKind; id: string }[] | undefined;
  if (value.items !== undefined) {
    if (!Array.isArray(value.items) || value.items.length > MAX_PLANNING_TASKS + MAX_PLANNING_REVIEWERS) return invalid("Invalid selected items.");
    items = [];
    for (const item of value.items) {
      if (!isRecord(item) || Object.keys(item).some(key => key !== "kind" && key !== "id") ||
        (item.kind !== "task" && item.kind !== "reviewer") || typeof item.id !== "string" || !isUuid(item.id)) return invalid("Invalid selected item.");
      items.push({ kind: item.kind, id: item.id.trim().toLowerCase() });
    }
    if (new Set(items.map(item => `${item.kind}:${item.id}`)).size !== items.length) return invalid("Duplicate selected items.");
  }
  if (value.order === "manual" && !items) return invalid("Manual order requires items.");
  return { ok: true, value: { order: value.order, ...(courseIds ? { courseIds } : {}), ...(items ? { items } : {}) } };
}

export function generateDeterministicStudyPlan({
  tasks,
  planningRange,
  availability,
}: {
  readonly tasks: readonly PlannerTask[];
  readonly planningRange: PlanningRange;
  readonly availability: readonly AvailabilityWindow[];
}): DeterministicStudyPlan<ProposedTaskSession> {
  const prepared = preparePlan(tasks, planningRange, availability);
  for (const task of prepared.tasks) {
    fillTask(prepared.state, task, task.estimatedMinutes, Number.POSITIVE_INFINITY);
  }
  // Without reviewers every session is a task session.
  return finishPlan(prepared, prepared.tasks.map((task) => [task, task.estimatedMinutes - scheduledFor(prepared.state, task.id)])) as DeterministicStudyPlan<ProposedTaskSession>;
}

/**
 * The Today plan for a chosen content mode. Tasks mode is the deterministic
 * task plan. Reviewer blocks are one contiguous block per reviewer (never
 * split, never repeated) in the selector's order. Combined plans give tasks at
 * most 60% of the free time first, then reviewers, then any time left to tasks
 * that still have work. Windows are consumed from a single cursor each, so
 * blocks never overlap and never exceed the free time.
 */
export function generateContentStudyPlan({
  mode,
  tasks,
  reviewers,
  planningRange,
  availability,
  selection,
}: {
  readonly mode: PlanMode;
  readonly tasks: readonly PlannerTask[];
  readonly reviewers: readonly PlannerReviewer[];
  readonly planningRange: PlanningRange;
  readonly availability: readonly AvailabilityWindow[];
  readonly selection?: PlanSelection;
}): DeterministicStudyPlan {
  if (!isPlanMode(mode)) throw new PlanningValidationError("Unsupported plan mode.");
  if (selection) return generateSelectedStudyPlan({ mode, tasks, reviewers, planningRange, availability, selection });
  const plannedTasks = mode === "reviewers" ? [] : tasks;
  const plannedReviewers = mode === "tasks" ? [] : reviewers.map(normalizePlannerReviewer);
  if (plannedReviewers.length > MAX_PLANNING_REVIEWERS) {
    throw new PlanningValidationError(`At most ${MAX_PLANNING_REVIEWERS} reviewers may be planned at once.`);
  }
  if (new Set(plannedReviewers.map((reviewer) => reviewer.id)).size !== plannedReviewers.length) {
    throw new PlanningValidationError("Planner reviewer IDs must be unique.");
  }
  const candidates = { tasks: plannedTasks.length, reviewers: plannedReviewers.length };
  if (mode === "tasks") {
    return { ...generateDeterministicStudyPlan({ tasks: plannedTasks, planningRange, availability }), mode, candidates };
  }
  const prepared = preparePlan(plannedTasks, planningRange, availability);
  const { state } = prepared;
  const budget = state.windows.reduce((sum, window) => sum + Math.floor((window.end - window.cursor) / 60_000), 0);
  const remaining = new Map(prepared.tasks.map((task) => [task.id, task.estimatedMinutes]));
  let taskCap = Math.floor(budget * TASK_BUDGET_SHARE);
  for (const task of prepared.tasks) {
    if (taskCap <= 0) break;
    const used = fillTask(state, task, remaining.get(task.id)!, taskCap);
    remaining.set(task.id, remaining.get(task.id)! - used);
    taskCap -= used;
  }
  for (const reviewer of plannedReviewers) {
    const minutes = reviewerBlockMinutes(reviewer.estimatedMinutes);
    const window = state.windows.find((candidate) => candidate.end - candidate.cursor >= minutes * 60_000);
    if (!window) continue;
    const startsAtMs = window.cursor, endsAtMs = startsAtMs + minutes * 60_000;
    state.sessions.push({
      kind: "reviewer",
      proposalId: "",
      reviewerId: reviewer.id,
      reviewerTitle: reviewer.title,
      courseId: reviewer.courseId,
      startsAt: new Date(startsAtMs).toISOString(),
      endsAt: new Date(endsAtMs).toISOString(),
      durationMinutes: minutes,
      scheduledAfterDeadline: false,
    });
    window.cursor = endsAtMs;
  }
  for (const task of prepared.tasks) {
    const left = remaining.get(task.id)!;
    if (left > 0) remaining.set(task.id, left - fillTask(state, task, left, Number.POSITIVE_INFINITY, true));
  }
  state.sessions.sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  state.sessions.forEach((session, index) => {
    state.sessions[index] = { ...session, proposalId: proposalId(index + 1) };
  });
  return {
    ...finishPlan(prepared, prepared.tasks.map((task) => [task, remaining.get(task.id)!])),
    mode,
    candidates,
  };
}

function generateSelectedStudyPlan(input: {
  mode: PlanMode; tasks: readonly PlannerTask[]; reviewers: readonly PlannerReviewer[];
  planningRange: PlanningRange; availability: readonly AvailabilityWindow[]; selection: PlanSelection;
}): DeterministicStudyPlan {
  const parsed = validatePlanSelection(input.selection);
  if (!parsed.ok) throw new PlanningValidationError(parsed.message);
  const selection = parsed.value;
  const courses = selection.courseIds ? new Set(selection.courseIds) : null;
  const selected = selection.items ? new Set(selection.items.map(item => `${item.kind}:${item.id}`)) : null;
  const eligible = (kind: StudyBlockKind, item: { id: string; courseId?: string | null }) =>
    (!courses || (!!item.courseId && courses.has(item.courseId))) && (!selected || selected.has(`${kind}:${item.id}`));
  const tasks = input.mode === "reviewers" ? [] : input.tasks.filter(item => eligible("task", item));
  const reviewers = input.mode === "tasks" ? [] : input.reviewers.filter(item => eligible("reviewer", item));
  let plan: DeterministicStudyPlan;
  if (selection.order === "smart") {
    plan = generateContentStudyPlan({ ...input, tasks, reviewers, selection: undefined });
  } else {
    const prepared = preparePlan(tasks, input.planningRange, input.availability);
    const taskMap = new Map(prepared.tasks.map(item => [item.id, item]));
    const reviewerMap = new Map(reviewers.map(item => [item.id, normalizePlannerReviewer(item)]));
    let exhausted = false;
    for (const item of selection.items ?? []) {
      if (exhausted) break;
      if (item.kind === "task") {
        const task = taskMap.get(item.id);
        if (!task) continue;
        exhausted = fillTask(prepared.state, task, task.estimatedMinutes, Infinity) < task.estimatedMinutes;
      } else {
        const reviewer = reviewerMap.get(item.id);
        if (!reviewer) continue;
        const minutes = reviewerBlockMinutes(reviewer.estimatedMinutes);
        const window = prepared.state.windows.find(window => window.end - window.cursor >= minutes * 60_000);
        if (!window) { exhausted = true; continue; }
        prepared.state.sessions.push({ kind: "reviewer", proposalId: proposalId(prepared.state.sessions.length + 1),
          reviewerId: reviewer.id, reviewerTitle: reviewer.title, courseId: reviewer.courseId,
          startsAt: new Date(window.cursor).toISOString(), endsAt: new Date(window.cursor + minutes * 60_000).toISOString(),
          durationMinutes: minutes, scheduledAfterDeadline: false });
        window.cursor += minutes * 60_000;
      }
    }
    plan = { ...finishPlan(prepared, prepared.tasks.map(task => [task, task.estimatedMinutes - scheduledFor(prepared.state, task.id)])),
      mode: input.mode, candidates: { tasks: tasks.length, reviewers: reviewers.length } };
  }
  const scheduledReviewers = new Set(plan.sessions.filter(isReviewerProposal).map(item => item.reviewerId));
  return { ...plan, notFit: [
    ...plan.unscheduledWork.map(item => ({ kind: "task" as const, id: item.taskId, minutes: item.unscheduledMinutes })),
    ...reviewers.filter(item => !scheduledReviewers.has(item.id)).map(item => ({ kind: "reviewer" as const, id: item.id, minutes: reviewerBlockMinutes(item.estimatedMinutes) })),
  ] };
}

export interface ReviewerCandidateSource {
  readonly id: string;
  readonly title: string;
  readonly courseId: string | null;
  readonly createdAt: string;
  readonly reviewMinutes: number | null;
  readonly lastOpenedAt: string | null;
}

/**
 * Saved reviewers from current courses, skipping any opened in the last 24
 * hours or already holding a kept block in this plan's day. Ordered by the
 * course with the nearest upcoming incomplete task, then least recently opened
 * (never opened first), then newest.
 */
export function selectReviewerCandidates({
  reviewers,
  currentCourseIds,
  nextDueByCourse,
  excludedIds,
  now,
  explicitlySelectedIds,
}: {
  readonly reviewers: readonly ReviewerCandidateSource[];
  readonly currentCourseIds: ReadonlySet<string>;
  readonly nextDueByCourse: ReadonlyMap<string, number>;
  readonly excludedIds: ReadonlySet<string>;
  readonly now: number;
  readonly explicitlySelectedIds?: ReadonlySet<string>;
}): PlannerReviewer[] {
  const seen = new Set<string>();
  const eligible = reviewers.filter((reviewer) => {
    if (seen.has(reviewer.id) || !reviewer.courseId || !currentCourseIds.has(reviewer.courseId)) return false;
    if (excludedIds.has(reviewer.id) || !isUuid(reviewer.id)) return false;
    seen.add(reviewer.id);
    const opened = reviewer.lastOpenedAt ? Date.parse(reviewer.lastOpenedAt) : Number.NaN;
    return explicitlySelectedIds?.has(reviewer.id) || !Number.isFinite(opened) || now - opened >= REVIEWER_REOPEN_AFTER_MS;
  });
  const due = (reviewer: ReviewerCandidateSource) =>
    nextDueByCourse.get(reviewer.courseId!) ?? Number.POSITIVE_INFINITY;
  const opened = (reviewer: ReviewerCandidateSource) => {
    const value = reviewer.lastOpenedAt ? Date.parse(reviewer.lastOpenedAt) : Number.NaN;
    return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
  };
  return eligible
    .sort((left, right) =>
      compareNumbers(due(left), due(right)) ||
      compareNumbers(opened(left), opened(right)) ||
      compareNumbers(Date.parse(right.createdAt) || 0, Date.parse(left.createdAt) || 0) ||
      left.id.localeCompare(right.id))
    .slice(0, MAX_PLANNING_REVIEWERS)
    .map((reviewer) => ({
      id: reviewer.id,
      title: reviewer.title,
      courseId: reviewer.courseId,
      estimatedMinutes: reviewer.reviewMinutes,
    }));
}

function compareNumbers(left: number, right: number): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

interface PlanState {
  readonly windows: { cursor: number; readonly end: number }[];
  readonly sessions: ProposedStudySession[];
}

function proposalId(sequence: number): string {
  return `session-${String(sequence).padStart(3, "0")}`;
}

function preparePlan(
  tasks: readonly PlannerTask[],
  planningRange: PlanningRange,
  availability: readonly AvailabilityWindow[],
) {
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
  const state: PlanState = {
    windows: normalizedWindows.map((window) => ({
      cursor: Date.parse(window.startsAt),
      end: Date.parse(window.endsAt),
    })),
    sessions: [],
  };
  return {
    planningRange: normalizedRange,
    availability: normalizedWindows,
    tasks: [...normalizedTasks].sort(comparePlannerTasks),
    state,
  };
}

/**
 * Schedules up to `cap` minutes of one task's `remaining` work into the
 * earliest free time, in ≤90 minute sessions split at the deadline. With
 * `extend`, a session continuing directly after the same task's earlier
 * session joins it (within the session limit) instead of adding a new block.
 * Returns the minutes scheduled.
 */
function fillTask(state: PlanState, task: PlannerTask, remaining: number, cap: number, extend = false): number {
  let scheduled = 0;
  const dueTime = task.dueAt ? Date.parse(task.dueAt) : null;
  for (const window of state.windows) {
    while (remaining - scheduled > 0 && cap - scheduled > 0) {
      const availableMinutes = Math.floor((window.end - window.cursor) / 60_000);
      if (availableMinutes <= 0) break;
      let duration = Math.min(
        remaining - scheduled,
        availableMinutes,
        MAX_STUDY_SESSION_MINUTES,
        cap - scheduled,
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
      const late = dueTime !== null && endsAtMs > dueTime;
      const previousIndex = extend ? state.sessions.findIndex((session) =>
        !isReviewerProposal(session) && session.taskId === task.id &&
        Date.parse(session.endsAt) === startsAtMs && session.scheduledAfterDeadline === late &&
        session.durationMinutes + duration <= MAX_STUDY_SESSION_MINUTES) : -1;
      const previous = previousIndex >= 0 ? state.sessions[previousIndex] : undefined;
      if (previous) {
        state.sessions[previousIndex] = {
          ...previous,
          endsAt: new Date(endsAtMs).toISOString(),
          durationMinutes: previous.durationMinutes + duration,
        };
      } else {
        state.sessions.push({
          proposalId: proposalId(state.sessions.length + 1),
          taskId: task.id,
          taskTitle: task.title,
          startsAt: new Date(startsAtMs).toISOString(),
          endsAt: new Date(endsAtMs).toISOString(),
          durationMinutes: duration,
          scheduledAfterDeadline: late,
        });
      }
      window.cursor = endsAtMs;
      scheduled += duration;
    }
    if (remaining - scheduled === 0 || cap - scheduled === 0) break;
  }
  return scheduled;
}

function scheduledFor(state: PlanState, taskId: string): number {
  return state.sessions.reduce((sum, session) =>
    !isReviewerProposal(session) && session.taskId === taskId ? sum + session.durationMinutes : sum, 0);
}

function finishPlan(
  prepared: ReturnType<typeof preparePlan>,
  left: readonly (readonly [PlannerTask, number])[],
): DeterministicStudyPlan {
  return {
    algorithmVersion: "deterministic-v1",
    planningRange: prepared.planningRange,
    availability: prepared.availability,
    sessions: prepared.state.sessions,
    unscheduledWork: left.filter(([, remaining]) => remaining > 0).map(([task, remaining]) => ({
      taskId: task.id,
      taskTitle: task.title,
      estimatedMinutes: task.estimatedMinutes,
      scheduledMinutes: task.estimatedMinutes - remaining,
      unscheduledMinutes: remaining,
      reason: "insufficient_availability" as const,
    })),
  };
}

function normalizePlannerReviewer(reviewer: PlannerReviewer): PlannerReviewer {
  if (!isUuid(reviewer.id)) throw new PlanningValidationError("Planner reviewer IDs must be UUIDs.");
  const title = readTitle(reviewer.title);
  if (!title.ok) throw new PlanningValidationError(title.message);
  if (reviewer.estimatedMinutes !== null && !(Number.isFinite(reviewer.estimatedMinutes) && reviewer.estimatedMinutes > 0)) {
    throw new PlanningValidationError("Reviewer estimates must be positive minutes or null.");
  }
  return {
    id: reviewer.id.trim(),
    title: title.value,
    courseId: reviewer.courseId,
    estimatedMinutes: reviewer.estimatedMinutes,
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
    ...(task.courseId !== undefined ? { courseId: task.courseId } : {}),
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
