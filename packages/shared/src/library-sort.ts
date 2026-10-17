import type { CourseReference, LibraryArtifactSummary, LibraryArtifactType } from "./experience";

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
}

/** One tile per course, most recently updated first; personal work last. */
export function groupLibraryByCourse(items: readonly LibraryArtifactSummary[]): LibraryCourseGroup[] {
  const groups = new Map<string, { course: CourseReference | null; counts: Record<LibraryArtifactType, number>; total: number; latestAt: number }>();
  for (const item of items) {
    const key = libraryCourseKey(item);
    const group = groups.get(key) ?? { course: item.course, counts: { reviewer: 0, quiz: 0, activity_output: 0 }, total: 0, latestAt: 0 };
    group.counts[item.type] += 1;
    group.total += 1;
    const updated = Date.parse(item.updatedAt);
    if (Number.isFinite(updated) && updated > group.latestAt) group.latestAt = updated;
    groups.set(key, group);
  }
  return [...groups.entries()]
    .map(([key, group]) => ({ key, ...group }))
    .sort((a, b) => {
      if ((a.key === PERSONAL_LIBRARY_KEY) !== (b.key === PERSONAL_LIBRARY_KEY)) return a.key === PERSONAL_LIBRARY_KEY ? 1 : -1;
      return b.latestAt - a.latestAt;
    });
}

export function filterCourseLibrary<T extends LibraryArtifactSummary>(
  items: readonly T[],
  courseKey: string,
  filter: LibraryFilter,
): T[] {
  return items.filter((item) => libraryCourseKey(item) === courseKey && (filter === "all" || item.type === filter));
}
