import type { LibraryArtifactType } from "@stay-focused/shared";

export { PERSONAL_LIBRARY_KEY, librarySegments, libraryCourseKey, groupLibraryByCourse, filterCourseLibrary } from '@stay-focused/shared';
export type { LibraryFilter, LibraryCourseGroup } from '@stay-focused/shared';

/** "3 reviewers · 1 quiz" — only non-zero kinds, never invented. */
export function describeLibraryCounts(counts: Readonly<Record<LibraryArtifactType, number>>): string {
  const parts: string[] = [];
  if (counts.reviewer) parts.push(`${counts.reviewer} reviewer${counts.reviewer === 1 ? "" : "s"}`);
  if (counts.quiz) parts.push(`${counts.quiz} quiz${counts.quiz === 1 ? "" : "zes"}`);
  if (counts.activity_output) parts.push(`${counts.activity_output} draft${counts.activity_output === 1 ? "" : "s"}`);
  return parts.join(" · ");
}


export const OFFLINE_LIBRARY_NOTICE = "You're offline. Items marked Saved offline still open.";
export const OFFLINE_MISSING_NOTICE = "This one isn't saved on your device yet. Connect once and it will be saved for offline use.";
export function offlineLibraryCaption(stats: { readonly total: number; readonly current: number; readonly failedPermanent?: number } | null, saving: boolean): string | null {
  if (!stats?.total) return null;
  if (stats.current === stats.total) return stats.total + ' saved for offline use';
  const failed = stats.failedPermanent ?? 0;
  if (saving && stats.current + failed < stats.total) return 'Saving for offline use… ' + stats.current + ' of ' + stats.total;
  if (failed && stats.current + failed >= stats.total) return stats.current + ' saved for offline use · ' + failed + ' need a connection to open';
  return stats.current + ' of ' + stats.total + " saved for offline use · the rest saves when you're online";
}
