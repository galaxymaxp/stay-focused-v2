import type {
  FeatureCapability,
  GenerateCoursePeriod,
  GenerateCourseSummary,
  GenerationState,
  LearningMaterial,
  TodayItem,
} from "@stay-focused/shared";
import type { StudyPlanningRequest } from "@stay-focused/shared/task-planning";

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
