import type { ActivitySummary, CourseReference } from "@stay-focused/shared";

/** Route key for tasks that belong to no Canvas course. */
export const PERSONAL_COURSE_KEY = "personal";
const DUE_SOON_MS = 7 * 24 * 60 * 60 * 1_000;

export type TaskGroupKey = "missing" | "due_soon" | "upcoming" | "completed";

export const taskGroupTitles: Record<TaskGroupKey, string> = {
  missing: "Past due",
  due_soon: "Due soon",
  upcoming: "Upcoming",
  completed: "Completed",
};

export function isDone(item: Pick<ActivitySummary, "status">): boolean {
  return item.status === "completed" || item.status === "submitted";
}

/**
 * "Past due" means the deadline passed and the work is neither completed nor
 * submitted (the server's `isOverdue`). It is not called "missing": submission
 * status is only known after a grade sync, so the app claims only what it
 * knows. Everything else is classified only
 * from the real due date; nothing is inferred from titles.
 */
export function taskGroupOf(item: ActivitySummary, now: number): TaskGroupKey {
  if (isDone(item)) return "completed";
  if (item.isOverdue) return "missing";
  const due = item.dueAt ? Date.parse(item.dueAt) : Number.NaN;
  if (Number.isFinite(due) && due - now <= DUE_SOON_MS) return "due_soon";
  return "upcoming";
}

function dueValue(item: ActivitySummary): number {
  const due = item.dueAt ? Date.parse(item.dueAt) : Number.NaN;
  return Number.isFinite(due) ? due : Number.POSITIVE_INFINITY;
}

/**
 * Attention order: missing (most recently missed first, the likeliest to still
 * be recoverable), then due soon and upcoming by nearest deadline with
 * undated work last, then completed (most recent first).
 */
export function groupCourseTasks(items: readonly ActivitySummary[], now: number) {
  const groups: Record<TaskGroupKey, ActivitySummary[]> = { missing: [], due_soon: [], upcoming: [], completed: [] };
  for (const item of items) groups[taskGroupOf(item, now)].push(item);
  groups.missing.sort((a, b) => dueValue(b) - dueValue(a));
  groups.due_soon.sort((a, b) => dueValue(a) - dueValue(b));
  groups.upcoming.sort((a, b) => dueValue(a) - dueValue(b));
  groups.completed.sort((a, b) => {
    const left = dueValue(a), right = dueValue(b);
    if (left === right) return 0;
    if (left === Number.POSITIVE_INFINITY) return 1;
    if (right === Number.POSITIVE_INFINITY) return -1;
    return right - left;
  });
  return (["missing", "due_soon", "upcoming", "completed"] as const).map((key) => ({ key, title: taskGroupTitles[key], items: groups[key] }));
}

export interface TaskCourseSummary {
  readonly key: string;
  readonly course: CourseReference | null;
  readonly due: number;
  readonly missing: number;
  readonly completed: number;
  readonly total: number;
  readonly nextDueAt: string | null;
}

export function courseKeyOf(item: Pick<ActivitySummary, "course">): string {
  return item.course?.id ?? PERSONAL_COURSE_KEY;
}

/** Counts come only from the returned activities; nothing is estimated. */
export function summarizeTaskCourses(items: readonly ActivitySummary[]): TaskCourseSummary[] {
  const byCourse = new Map<string, { course: CourseReference | null; items: ActivitySummary[] }>();
  for (const item of items) {
    const key = courseKeyOf(item);
    const entry = byCourse.get(key) ?? { course: item.course, items: [] };
    entry.items.push(item);
    byCourse.set(key, entry);
  }
  const summaries = [...byCourse.entries()].map(([key, entry]) => {
    const pending = entry.items.filter((item) => !isDone(item));
    const next = pending
      .filter((item) => !item.isOverdue && item.dueAt)
      .sort((a, b) => dueValue(a) - dueValue(b))[0];
    return {
      key,
      course: entry.course,
      due: pending.filter((item) => !item.isOverdue).length,
      missing: pending.filter((item) => item.isOverdue).length,
      completed: entry.items.length - pending.length,
      total: entry.items.length,
      nextDueAt: next?.dueAt ?? null,
    };
  });
  // Courses needing attention first, then the nearest deadline; personal last.
  return summaries.sort((a, b) => {
    if ((a.key === PERSONAL_COURSE_KEY) !== (b.key === PERSONAL_COURSE_KEY)) return a.key === PERSONAL_COURSE_KEY ? 1 : -1;
    if ((a.missing > 0) !== (b.missing > 0)) return a.missing > 0 ? -1 : 1;
    const left = a.nextDueAt ? Date.parse(a.nextDueAt) : Number.POSITIVE_INFINITY;
    const right = b.nextDueAt ? Date.parse(b.nextDueAt) : Number.POSITIVE_INFINITY;
    if (left !== right) return left - right;
    return (a.course?.name ?? "").localeCompare(b.course?.name ?? "");
  });
}

export function relativeDue(dueAt: string | null, now: number): string {
  if (!dueAt) return "No deadline";
  const due = Date.parse(dueAt);
  if (!Number.isFinite(due)) return "No deadline";
  const date = new Date(due);
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const dayDiff = Math.floor((due - startOfToday.getTime()) / 86_400_000);
  if (dayDiff === 0) return `Today, ${time}`;
  if (dayDiff === 1) return `Tomorrow, ${time}`;
  if (dayDiff === -1) return `Yesterday, ${time}`;
  if (dayDiff > 1 && dayDiff < 7) return `${date.toLocaleDateString([], { weekday: "long" })}, ${time}`;
  return date.toLocaleDateString([], { month: "short", day: "numeric", ...(date.getFullYear() !== new Date(now).getFullYear() ? { year: "numeric" } : {}) });
}
