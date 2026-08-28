import type { TaskPriority, TaskView } from "@stay-focused/shared/task-planning";

/**
 * Deterministic grouping and derivation for the Work surface.
 *
 * Every value here comes from persisted task fields. Nothing infers schedule
 * fit, recommendation, or course identity, because the task contract cannot
 * support those claims.
 */

export type WorkGroupId = "overdue" | "today" | "upcoming" | "later" | "undated";

export interface WorkGroup {
  readonly id: WorkGroupId;
  readonly title: string;
  readonly tasks: readonly TaskView[];
}

export interface WorkSummary {
  readonly pendingCount: number;
  readonly overdueCount: number;
  readonly dueTodayCount: number;
  readonly completedCount: number;
}

export interface WorkDueLabel {
  readonly text: string;
  /** True when the deadline has passed; callers must pair this with a word or
   *  icon, never colour alone. */
  readonly isOverdue: boolean;
}

const GROUP_TITLES: Readonly<Record<WorkGroupId, string>> = {
  overdue: "Overdue",
  today: "Due today",
  upcoming: "Next 7 days",
  later: "Later",
  undated: "No deadline",
};

const GROUP_ORDER: readonly WorkGroupId[] = [
  "overdue",
  "today",
  "upcoming",
  "later",
  "undated",
];

const PRIORITY_RANK: Readonly<Record<TaskPriority, number>> = {
  high: 0,
  medium: 1,
  low: 2,
};

const DAY_MS = 86_400_000;
const UPCOMING_WINDOW_DAYS = 7;

export const PRIORITY_LABELS: Readonly<Record<TaskPriority, string>> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function isPending(task: TaskView): boolean {
  return task.status === "pending";
}

/**
 * Mirrors the planner's own ordering — deadline, then priority, then creation —
 * so the backlog reads in the same order the planner would schedule it. Undated
 * work sorts last, exactly as a null deadline does in the planner.
 */
export function compareTasks(left: TaskView, right: TaskView): number {
  const leftDue = left.dueAt ? Date.parse(left.dueAt) : Number.POSITIVE_INFINITY;
  const rightDue = right.dueAt ? Date.parse(right.dueAt) : Number.POSITIVE_INFINITY;
  if (leftDue !== rightDue) return leftDue - rightDue;
  if (PRIORITY_RANK[left.priority] !== PRIORITY_RANK[right.priority]) {
    return PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority];
  }
  const created = Date.parse(left.createdAt) - Date.parse(right.createdAt);
  return created || left.id.localeCompare(right.id);
}

export function groupPendingTasks(
  tasks: readonly TaskView[],
  now: Date,
): readonly WorkGroup[] {
  const buckets = new Map<WorkGroupId, TaskView[]>();
  for (const task of tasks) {
    if (!isPending(task)) continue;
    const id = resolveGroup(task, now);
    const bucket = buckets.get(id);
    if (bucket) bucket.push(task);
    else buckets.set(id, [task]);
  }
  return GROUP_ORDER.flatMap((id) => {
    const bucket = buckets.get(id);
    if (!bucket || bucket.length === 0) return [];
    return [{ id, title: GROUP_TITLES[id], tasks: [...bucket].sort(compareTasks) }];
  });
}

export function resolveGroup(task: TaskView, now: Date): WorkGroupId {
  if (!task.dueAt) return "undated";
  const due = Date.parse(task.dueAt);
  if (!Number.isFinite(due)) return "undated";
  if (due < now.getTime()) return "overdue";
  if (isSameCalendarDay(new Date(due), now)) return "today";
  // Compared in whole calendar days so the seventh day counts in full rather
  // than ending at its midnight boundary.
  return calendarDayDifference(new Date(due), now) <= UPCOMING_WINDOW_DAYS
    ? "upcoming"
    : "later";
}

export function summarizeWork(tasks: readonly TaskView[], now: Date): WorkSummary {
  let pendingCount = 0;
  let overdueCount = 0;
  let dueTodayCount = 0;
  let completedCount = 0;
  for (const task of tasks) {
    if (!isPending(task)) {
      completedCount += 1;
      continue;
    }
    pendingCount += 1;
    const group = resolveGroup(task, now);
    if (group === "overdue") overdueCount += 1;
    if (group === "today") dueTodayCount += 1;
  }
  return { pendingCount, overdueCount, dueTodayCount, completedCount };
}

/**
 * One short sentence describing the workload, or null when there is nothing
 * worth saying. Never a recommendation — only a count of what is true.
 */
export function describeWorkload(summary: WorkSummary): string | null {
  if (summary.pendingCount === 0) return null;
  const parts: string[] = [`${summary.pendingCount} open`];
  if (summary.overdueCount > 0) parts.push(`${summary.overdueCount} overdue`);
  if (summary.dueTodayCount > 0) parts.push(`${summary.dueTodayCount} due today`);
  return parts.join(" · ");
}

export function formatDueLabel(
  dueAt: string | null,
  now: Date,
): WorkDueLabel | null {
  if (!dueAt) return null;
  const due = Date.parse(dueAt);
  if (!Number.isFinite(due)) return null;
  const dueDate = new Date(due);
  const days = calendarDayDifference(dueDate, now);
  const time = formatTime(dueDate);

  if (due < now.getTime()) {
    if (days === 0) return { text: `Was due ${time}`, isOverdue: true };
    const overdueDays = Math.abs(days);
    return {
      text: overdueDays === 1 ? "Overdue by 1 day" : `Overdue by ${overdueDays} days`,
      isOverdue: true,
    };
  }
  if (days === 0) return { text: `Today ${time}`, isOverdue: false };
  if (days === 1) return { text: `Tomorrow ${time}`, isOverdue: false };
  // Weekday names stop one day short of a full week: at seven days out the
  // name would repeat today's weekday and read as ambiguous.
  if (days < UPCOMING_WINDOW_DAYS) {
    return { text: `${weekdayName(dueDate)} ${time}`, isOverdue: false };
  }
  return { text: formatDate(dueDate), isOverdue: false };
}

export function formatEstimate(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return hours === 1 ? "1 hour" : `${hours} hours`;
  return `${hours}h ${remainder}m`;
}

/**
 * Canvas provenance is stated in words. The task carries only an opaque
 * `canvasCourseId`, so no course name is claimed.
 */
export function describeSource(task: TaskView): string | null {
  return task.sourceType === "canvas" ? "From Canvas" : null;
}

export function sortCompleted(tasks: readonly TaskView[]): readonly TaskView[] {
  return [...tasks]
    .filter((task) => !isPending(task))
    .sort((left, right) => {
      const leftAt = Date.parse(left.completedAt ?? left.updatedAt);
      const rightAt = Date.parse(right.completedAt ?? right.updatedAt);
      if (leftAt !== rightAt) return rightAt - leftAt;
      return left.id.localeCompare(right.id);
    });
}

/**
 * Planning needs at least one pending task with an estimate; without one the
 * planner has nothing to place and the entry point should stay disabled rather
 * than failing after the user commits to the flow.
 */
export function canStartPlanning(tasks: readonly TaskView[]): boolean {
  return tasks.some(isPending);
}

function isSameCalendarDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function calendarDayDifference(target: Date, now: Date): number {
  return Math.round(
    (startOfDay(target).getTime() - startOfDay(now).getTime()) / DAY_MS,
  );
}

function formatTime(value: Date): string {
  const hours = value.getHours();
  const minutes = value.getMinutes().toString().padStart(2, "0");
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${minutes} ${suffix}`;
}

function weekdayName(value: Date): string {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    value.getDay()
  ] as string;
}

function formatDate(value: Date): string {
  const month = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ][value.getMonth()] as string;
  return `${month} ${value.getDate()}`;
}
