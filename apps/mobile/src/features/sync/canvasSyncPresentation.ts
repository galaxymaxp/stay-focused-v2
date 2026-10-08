import type { CourseSyncState } from "../../services/canvasAccountSync";
import type { CanvasCourseInventoryItem } from "../../services/canvasApi";

/** Courses shown before "Show all courses" when nothing is being searched. */
export const COLLAPSED_COURSE_COUNT = 3;

/** What a student needs to know about one course, and what a tap will do. */
export type SyncRowState = "synced" | "syncing" | "not_synced" | "failed" | "unavailable";

export function syncRowState(
  course: CanvasCourseInventoryItem,
  live: CourseSyncState | undefined,
): SyncRowState {
  if (live === "syncing") return "syncing";
  if (!course.selectable) return course.selected && hasSynced(course) ? "synced" : "unavailable";
  // Live job results win over the course list, which may predate this sync:
  // a finished sync never flickers back to "Sync" while the list refreshes.
  if (live === "synced") return "synced";
  // A tap that could not finish (even before the course was selected) offers Retry.
  if (live === "failed") return "failed";
  if (!course.selected) return "not_synced";
  if (course.lastSync?.status === "running") return "syncing";
  if (course.lastSync?.status === "failed" && !course.lastSync.lastSuccessfulSyncAt) return "failed";
  // Selected but never finished a sync: tapping Sync completes it.
  return hasSynced(course) ? "synced" : "not_synced";
}

function hasSynced(course: CanvasCourseInventoryItem): boolean {
  const last = course.lastSync;
  if (!last || last.status === "running") return Boolean(last?.lastSuccessfulSyncAt);
  if (last.status === "success" || last.status === "partial") return Boolean(last.completedAt ?? last.lastCheckedAt);
  return Boolean(last.lastSuccessfulSyncAt);
}

const classificationRank: Record<CanvasCourseInventoryItem["classification"], number> = {
  likely_current: 0,
  other_or_uncertain: 1,
  past_or_concluded: 2,
  unavailable: 3,
};

/**
 * The course the student came for first (from Generate), then courses they
 * already sync, then this term, then everything else. Unavailable courses sink.
 */
export function orderSyncCourses(
  courses: readonly CanvasCourseInventoryItem[],
  focusCourseId: string | null = null,
): CanvasCourseInventoryItem[] {
  return [...courses].sort((a, b) =>
    Number(b.id === focusCourseId) - Number(a.id === focusCourseId) ||
    Number(b.selectable) - Number(a.selectable) ||
    Number(b.selected) - Number(a.selected) ||
    classificationRank[a.classification] - classificationRank[b.classification] ||
    a.displayName.localeCompare(b.displayName) ||
    a.id.localeCompare(b.id),
  );
}

/** "CIT 17", "cit17" and "CIT-17" all find the same course. */
function compact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function matchesCourseQuery(course: CanvasCourseInventoryItem, query: string): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = [course.displayName, course.courseCode ?? "", course.term?.name ?? ""].join(" ").toLowerCase();
  const compactHaystack = compact(haystack);
  return words.every((word) => haystack.includes(word) || compactHaystack.includes(compact(word))) ||
    compactHaystack.includes(compact(query));
}

/**
 * Search shows every match immediately. Without a search, only the first few
 * courses show until the student asks for the rest.
 */
export function visibleSyncCourses(
  ordered: readonly CanvasCourseInventoryItem[],
  query: string,
  expanded: boolean,
): { readonly items: readonly CanvasCourseInventoryItem[]; readonly hiddenCount: number } {
  if (query.trim()) {
    return { items: ordered.filter((course) => matchesCourseQuery(course, query)), hiddenCount: 0 };
  }
  if (expanded || ordered.length <= COLLAPSED_COURSE_COUNT) return { items: ordered, hiddenCount: 0 };
  return { items: ordered.slice(0, COLLAPSED_COURSE_COUNT), hiddenCount: ordered.length - COLLAPSED_COURSE_COUNT };
}
