import type { LearningMaterial, LibraryArtifactSummary } from "@stay-focused/shared";
import type { LibraryCourseGroup } from "./libraryPresentation";
import type { LibrarySort } from "./listPreferences";

export const LIBRARY_GRID_SORT_KEY = "__courses__";
export interface LibraryCourseSequence { readonly materials: readonly { id: string; reviewerArtifactId: string | null }[] }
export function courseSequence(materials: readonly LearningMaterial[]): LibraryCourseSequence {
  return { materials: materials.map(({ id, reviewerArtifactId }) => ({ id, reviewerArtifactId })) };
}
const titleOrder = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
const timestamp = (value: string) => Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
function dates(a: number | null, b: number | null, descending: boolean): number {
  if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1;
  return descending ? b - a : a - b;
}
/** Uses the API's complete Canvas module/material sequence, never title guesses. */
export function libraryCourseRanks(items: readonly LibraryArtifactSummary[], sequence: LibraryCourseSequence | null): ReadonlyMap<string, number> {
  const ranks = new Map<string, number>();
  const materials = new Map(sequence?.materials.map((material, index) => [material.id, index]));
  sequence?.materials.forEach((material, index) => { if (material.reviewerArtifactId) ranks.set(`artifact:${material.reviewerArtifactId}`, index); });
  for (const item of items) {
    const rank = materials.get(item.sourceMaterialId ?? "") ?? materials.get(item.sourceId ?? "");
    if (rank !== undefined) ranks.set(item.id, rank);
  }
  for (const item of items) {
    if (ranks.has(item.id)) continue;
    const related = item.relatedArtifactIds.map(id => ranks.get(id)).filter((rank): rank is number => rank !== undefined);
    if (related.length) ranks.set(item.id, Math.min(...related));
  }
  return ranks;
}
export function sortLibraryItems<T extends LibraryArtifactSummary>(items: readonly T[], sort: LibrarySort, sequence: LibraryCourseSequence | null): readonly T[] {
  if (sort === "custom") return items;
  const ranks = libraryCourseRanks(items, sequence);
  return [...items].sort((a, b) => {
    const byTitle = titleOrder(a.title, b.title) || a.id.localeCompare(b.id);
    if (sort === "title_asc" || sort === "title_desc") return (sort === "title_desc" ? -1 : 1) * byTitle;
    if (sort === "course") {
      const left = ranks.get(a.id), right = ranks.get(b.id);
      return (left === undefined || right === undefined ? left === right ? 0 : left === undefined ? 1 : -1 : left - right) || byTitle;
    }
    return dates(timestamp(a.updatedAt), timestamp(b.updatedAt), sort === "updated_desc") || byTitle;
  });
}
export function sortLibraryGroups(items: readonly LibraryCourseGroup[], sort: LibrarySort): readonly LibraryCourseGroup[] {
  if (sort === "custom") return items;
  return [...items].sort((a, b) => {
    const name = titleOrder(a.course?.name ?? "Personal & other", b.course?.name ?? "Personal & other") || a.key.localeCompare(b.key);
    return sort === "title_asc" ? name : sort === "title_desc" ? -name : dates(a.latestAt || null, b.latestAt || null, sort !== "updated_asc") || name;
  });
}
