import type {
  FeatureCapability,
  GenerateCoursePeriod,
  GenerateCourseSummary,
  GenerationState,
  LearningMaterial,
  TodayItem,
} from "@stay-focused/shared";
import type { StudyPlanningRequest } from "@stay-focused/shared/task-planning";

import type { CoreState } from "../generation-core/coreModel";

export const primaryTabs = [
  { route: "today", title: "Today" },
  { route: "courses", title: "Generate" },
  { route: "work", title: "Tasks" },
  { route: "library", title: "Library" },
] as const;
export const generationMessages: Record<GenerationState, string> = {
  queued: "Waiting to begin…",
  preparing: "Reading your material…",
  generating: "Bringing the important ideas together…",
  finalizing: "Saving your work…",
  completed: "Ready in your Library.",
  failed: "This generation couldn’t finish.",
  cancelling: "Stopping this generation…",
  cancelled: "Generation cancelled.",
};
export function available(capability: FeatureCapability | undefined) {
  return capability?.status === "available";
}
export function capabilityNote(capability: FeatureCapability | undefined) {
  return available(capability)
    ? "Available"
    : capability?.reasonCode === "source_not_ready"
      ? "Prepare this material first"
      : capability?.reasonCode === "unsupported_material"
        ? "Not supported for this material"
        : "Not available right now";
}
export const materialTypes: Record<LearningMaterial["kind"], string> = {
  pdf: "PDF",
  document: "DOCX",
  slides: "PPTX",
  page: "Canvas Page",
  module: "Canvas Module",
  announcement: "Announcement",
  assignment: "Assignment",
  image: "Image",
  text: "Text",
};
/** Preserve contiguous groups and source order; never sort or invent Canvas categories. */
export function moduleGroups(items: readonly LearningMaterial[]) {
  const groups: {
    key: string;
    title: string | null;
    items: LearningMaterial[];
  }[] = [];
  for (const item of items) {
    let group = groups[groups.length - 1];
    if (!group || group.title !== item.moduleTitle) {
      group = {
        key: `${groups.length}-${item.id}`,
        title: item.moduleTitle,
        items: [],
      };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}
/**
 * Sync status decides where a course goes; only synced courses may request
 * materials. Unsynced and incomplete courses go to the existing Sync flow.
 */
export function generateCourseDestination(course: Pick<GenerateCourseSummary, "syncState">): "generate" | "sync" {
  return course.syncState === "synced" ? "generate" : "sync";
}
const periodTitles: Record<GenerateCoursePeriod, string> = {
  current: "Current courses",
  previous: "Previous courses",
  other: "Other courses",
};
/** Groups the server-ordered list by period without re-sorting within a group. */
export function generateCourseGroups(items: readonly GenerateCourseSummary[]) {
  return (["current", "previous", "other"] as const)
    .map((period) => ({ key: period, title: periodTitles[period], items: items.filter((course) => course.period === period) }))
    .filter((group) => group.items.length > 0);
}
export function generateCourseStatus(course: GenerateCourseSummary): string {
  if (course.syncState === "not_synced") return "Not synced · Tap to sync";
  if (course.syncState === "sync_incomplete") return "Sync incomplete · Tap to retry";
  const synced = course.lastSuccessfulSyncAt
    ? `Synced ${new Date(course.lastSuccessfulSyncAt).toLocaleDateString([], { month: "short", day: "numeric" })}`
    : "Synced";
  return course.termName ? `${synced} · ${course.termName}` : synced;
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function clockMinutes(x: number, y: number) {
  return (((Math.atan2(y, x) * 180) / Math.PI + 90 + 360) % 360) * 4;
}
export function snapMinutes(minutes: number) {
  return Math.min(1440, Math.max(0, Math.round(minutes / 15) * 15));
}
export function ringDragMinutes(previous: number, angleMinutes: number) {
  const candidates = [angleMinutes - 1440, angleMinutes, angleMinutes + 1440];
  return snapMinutes(
    candidates.reduce((nearest, value) =>
      Math.abs(value - previous) < Math.abs(nearest - previous)
        ? value
        : nearest,
    ),
  );
}
export function timeLabel(value: string | null) {
  return value
    ? new Date(value).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
}
/**
 * The line under a Today item: when it happens and whether it is finished.
 * Internal states such as "pending" or "unknown" are never shown.
 */
export function todayItemDetail(item: Pick<TodayItem, "startAt" | "dueAt" | "estimatedMinutes" | "status">, now = Date.now()): string {
  const when = item.startAt
    ? [timeLabel(item.startAt), item.estimatedMinutes ? `${item.estimatedMinutes} min` : ""]
    : [item.dueAt ? dueLabel(item.dueAt, now) : ""];
  const state = item.status === "submitted" ? "Submitted" : item.status === "completed" ? "Done" : item.status === "skipped" ? "Skipped" : "";
  return [...when, state].filter(Boolean).join(" · ");
}

/** A time alone means today; any other day names its date, and the past says so. */
function dueLabel(dueAt: string, now: number): string {
  const due = new Date(dueAt);
  if (due.getTime() < now) {
    const otherYear = due.getFullYear() !== new Date(now).getFullYear();
    return `Past due · ${due.toLocaleDateString([], { month: "short", day: "numeric", ...(otherYear ? { year: "numeric" } : {}) })}`;
  }
  return due.toDateString() === new Date(now).toDateString() ? `Due ${timeLabel(dueAt)}` : `Due ${deadline(dueAt)}`;
}
/**
 * Queue sections exist only while they hold something. The generating group
 * is named by what it is doing; the queued group by how many are waiting.
 */
export function queueSections<T extends { readonly status: string }>(jobs: readonly T[]) {
  const generating = jobs.filter((job) => job.status === "running" || job.status === "cancellation_requested");
  const queued = jobs.filter((job) => job.status === "queued");
  const completed = jobs.filter((job) => job.status === "succeeded");
  const attention = jobs.filter((job) => !["running", "cancellation_requested", "queued", "succeeded"].includes(job.status));
  return [
    { key: "generating", title: "Generating", jobs: generating },
    { key: "queued", title: `${queued.length} queued`, jobs: queued },
    { key: "attention", title: "Needs attention", jobs: attention },
    { key: "completed", title: "Completed", jobs: completed },
  ].filter((section) => section.jobs.length > 0);
}
export function deadline(value: string | null) {
  return value
    ? new Date(value).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "No deadline";
}
/** Only describes availability. The existing server planner owns allocation/order. */
export function planningRequest(
  date: string,
  start: number,
  end: number,
): StudyPlanningRequest {
  if (end <= start) throw new Error("Choose an end time after the start time.");
  const midnight = new Date(`${date}T00:00:00`);
  const at = (minutes: number) =>
    new Date(midnight.getTime() + minutes * 60000).toISOString();
  return {
    planningRange: { startsAt: at(start), endsAt: at(end) },
    availability: [{ startsAt: at(start), endsAt: at(end) }],
  };
}
export function timelineSegments(items: readonly TodayItem[], date: string) {
  const start = new Date(`${date}T00:00:00`).getTime();
  return items.flatMap((item) => {
    if (!item.startAt || !item.endAt || item.status === "skipped") return [];
    const from = Math.max(
      0,
      (new Date(item.startAt).getTime() - start) / 60000,
    );
    const to = Math.min(1440, (new Date(item.endAt).getTime() - start) / 60000);
    return to > from
      ? [{ id: item.id, from, to, kind: item.kind, title: item.title }]
      : [];
  });
}

/**
 * The Knowledge Core follows the real job: it reads while the source is
 * prepared, spins fastest while generating, settles while saving, keeps
 * slowly moving once complete, and stops only when the job cannot finish.
 */
export function generationCoreState(state: GenerationState | null, connecting: boolean): CoreState {
  switch (state) {
    case null:
      return connecting ? "reading" : "idle";
    case "queued":
    case "preparing":
      return "reading";
    case "generating":
      return "generating";
    case "finalizing":
    case "cancelling":
      return "finalizing";
    case "completed":
      return "complete";
    case "failed":
    case "cancelled":
      return "error";
  }
}

/** Lowercase letters and digits only, so "cit 17", "CIT-17" and "cit17" agree. */
function compactSearchText(value: string) {
  return value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, "");
}

/**
 * Course filter for Generate: matches the course code, the full Canvas name or
 * the shortened display title, by partial text, ignoring case, spacing and
 * punctuation. A blank query matches everything.
 */
export function matchesCourseQuery(fields: readonly (string | null | undefined)[], query: string): boolean {
  const needle = compactSearchText(query);
  if (!needle) return true;
  return fields.some((field) => !!field && compactSearchText(field).includes(needle));
}

export interface TodayArrangement {
  /** Pinned by the student, newest pin first. Always shown in Up Next. */
  readonly pinned: readonly TodayItem[];
  /** The recommended next item that is neither pinned nor hidden. */
  readonly next: TodayItem | null;
  readonly later: readonly TodayItem[];
  readonly dueSoon: readonly TodayItem[];
  /** Items dismissed from today's plan, still recoverable. */
  readonly hidden: readonly TodayItem[];
}

/**
 * Applies the student's Today pins and hides without changing the planner's
 * own order. A pinned item stays in Up Next and never displaces the real
 * recommendation: when the pinned or hidden item was the recommendation, the
 * next one in line takes its place underneath. Hides are keyed per day.
 */
export function arrangeToday(
  sections: { readonly next: TodayItem | null; readonly later: readonly TodayItem[]; readonly dueSoon: readonly TodayItem[]; readonly others?: readonly TodayItem[] },
  pinnedIds: readonly string[],
  hiddenKeys: readonly string[],
  date: string,
): TodayArrangement {
  const hiddenSet = new Set(hiddenKeys);
  const isHidden = (item: TodayItem) => hiddenSet.has(`${date}|${item.id}`);
  const pinOrder = new Map(pinnedIds.map((id, index) => [id, index]));
  const pool = new Map<string, TodayItem>();
  for (const item of [...(sections.next ? [sections.next] : []), ...sections.later, ...sections.dueSoon, ...(sections.others ?? [])]) {
    if (!pool.has(item.id)) pool.set(item.id, item);
  }
  const pinned = [...pool.values()]
    .filter((item) => pinOrder.has(item.id) && !isHidden(item))
    .sort((a, b) => pinOrder.get(a.id)! - pinOrder.get(b.id)!);
  const shown = new Set(pinned.map((item) => item.id));
  const eligible = (item: TodayItem) => !shown.has(item.id) && !isHidden(item);
  const next = [...(sections.next ? [sections.next] : []), ...sections.later].find(eligible) ?? null;
  if (next) shown.add(next.id);
  const later = sections.later.filter(eligible);
  later.forEach((item) => shown.add(item.id));
  const dueSoon = sections.dueSoon.filter(eligible);
  const hidden = [...pool.values()].filter(isHidden);
  return { pinned, next, later, dueSoon, hidden };
}

/** Morning is 5–11, afternoon 12–16; late night and evening both read as evening. */
export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}
