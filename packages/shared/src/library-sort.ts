import type { CourseReference, LibraryArtifactSummary, LibraryArtifactType } from './experience';

export type TopLevelSort = 'recent' | 'course' | 'title' | 'opened';
export type CourseSort = 'canvas' | 'recent' | 'title';
export const TOP_LEVEL_SORTS: readonly { value: TopLevelSort; label: string }[] = [
  { value: 'recent', label: 'Recently added' }, { value: 'course', label: 'Course' },
  { value: 'title', label: 'Title A\u2013Z' }, { value: 'opened', label: 'Recently opened' },
];
export const COURSE_SORTS: readonly { value: CourseSort; label: string }[] = [
  { value: 'canvas', label: 'Canvas order' }, { value: 'recent', label: 'Recently added' }, { value: 'title', label: 'Title A\u2013Z' },
];
function timestamp(value: string | null | undefined): number {
  const result = value ? Date.parse(value) : 0;
  return Number.isFinite(result) ? result : 0;
}
const collator = new Intl.Collator(undefined, { sensitivity: 'base' });
/** Route key for saved work that belongs to no course (text, camera, local files). */
export const PERSONAL_LIBRARY_KEY = "personal";

export type LibraryFilter = "all" | LibraryArtifactType;

export const librarySegments: readonly { value: LibraryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "reviewer", label: "Reviewers" },
  { value: "quiz", label: "Quizzes" },
  { value: "activity_output", label: "Drafts" },
];

export function libraryCourseKey(item: Pick<LibraryArtifactSummary, "course">): string {
  return item.course?.id ?? PERSONAL_LIBRARY_KEY;
}

export interface LibraryCourseGroup {
  readonly key: string;
  readonly course: CourseReference | null;
  readonly counts: Readonly<Record<LibraryArtifactType, number>>;
  readonly total: number;
  readonly latestAt: number;
  readonly latestOpenedAt: number;
}

/** Aggregate creation/open times without changing or fetching saved work. */
export function groupLibraryByCourse(items: readonly LibraryArtifactSummary[], opened: Readonly<Record<string, string>> = {}): LibraryCourseGroup[] {
  const groups = new Map<string, { course: CourseReference | null; counts: Record<LibraryArtifactType, number>; total: number; latestAt: number; latestOpenedAt: number }>();
  for (const item of items) {
    const key = libraryCourseKey(item);
    const group = groups.get(key) ?? { course: item.course, counts: { reviewer: 0, quiz: 0, activity_output: 0 }, total: 0, latestAt: 0, latestOpenedAt: 0 };
    group.counts[item.type] += 1;
    group.total += 1;
    const updated = timestamp(item.createdAt);
    if (Number.isFinite(updated) && updated > group.latestAt) group.latestAt = updated;
    group.latestOpenedAt = Math.max(group.latestOpenedAt, timestamp(item.lastOpenedAt), timestamp(opened[item.id]));
    groups.set(key, group);
  }
  return sortLibraryGroups([...groups.entries()].map(([key, group]) => ({ key, ...group })), 'recent');
}

export function filterCourseLibrary<T extends LibraryArtifactSummary>(
  items: readonly T[],
  courseKey: string,
  filter: LibraryFilter,
): T[] {
  return items.filter((item) => libraryCourseKey(item) === courseKey && (filter === "all" || item.type === filter));
}


/** Copy-only sorting; callers partition pins before applying the same comparator. */
export function sortLibraryGroups<T extends LibraryCourseGroup>(groups: readonly T[], sort: TopLevelSort): T[] {
  return [...groups].sort((a, b) => {
    if ((sort === 'course' || sort === 'title') && !!a.course !== !!b.course) return a.course ? -1 : 1;
    const order = sort === 'recent' ? b.latestAt - a.latestAt : sort === 'opened' ? b.latestOpenedAt - a.latestOpenedAt
      : collator.compare(sort === 'course' ? a.course?.code?.trim() || a.course?.name || '' : a.course?.name || '',
        sort === 'course' ? b.course?.code?.trim() || b.course?.name || '' : b.course?.name || '');
    return order || a.key.localeCompare(b.key);
  });
}
export function sortCourseLibrary<T extends LibraryArtifactSummary>(items: readonly T[], sort: CourseSort): T[] {
  return [...items].sort((a, b) => {
    let order = 0;
    if (sort === 'title') order = collator.compare(a.title, b.title);
    else if (sort === 'recent') order = timestamp(b.createdAt) - timestamp(a.createdAt);
    else {
      const left = a.sourcePosition, right = b.sourcePosition;
      if (!!left !== !!right) return left ? -1 : 1;
      order = left && right ? left.moduleIndex - right.moduleIndex || left.itemIndex - right.itemIndex : 0;
      order ||= timestamp(a.createdAt) - timestamp(b.createdAt);
    }
    return order || a.id.localeCompare(b.id);
  });
}
