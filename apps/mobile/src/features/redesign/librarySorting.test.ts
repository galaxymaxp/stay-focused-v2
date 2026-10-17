import { expect, it } from "vitest";
import type { LibraryArtifactSummary } from "@stay-focused/shared";
import { sortLibraryItems, sortLibraryGroups, type LibraryCourseSequence } from "./librarySorting";
import { EMPTY_LIST_PREFERENCES, parseListPreferences, setLibraryOrder, setLibrarySort } from "./listPreferences";
const item = (id: string, title: string, updatedAt = "2026-10-01"): LibraryArtifactSummary => ({
  id, title, updatedAt, createdAt: updatedAt, type: "reviewer", course: null, sourceId: null, sourceTitle: null,
  activityId: null, lastOpenedAt: null, status: "completed", relatedArtifactIds: [],
});
const ids = (items: readonly LibraryArtifactSummary[]) => items.map(item => item.id);
it("sorts both date directions with malformed dates last and stable ties", () => {
  const items = [item("b", "b", "2026-10-02"), item("bad", "invalid", "broken"), item("a", "a", "2026-10-01")];
  expect(ids(sortLibraryItems(items, "updated_desc", null))).toEqual(["b", "a", "bad"]);
  expect(ids(sortLibraryItems(items, "updated_asc", null))).toEqual(["a", "b", "bad"]);
  expect(ids(items)).toEqual(["b", "bad", "a"]);
});
it("sorts alphabetically and naturally numbered titles in either direction", () => {
  const items = [item("c", "Unit 10"), item("b", "unit 2"), item("a", "Alpha")];
  expect(ids(sortLibraryItems(items, "title_asc", null))).toEqual(["a", "b", "c"]);
  expect(ids(sortLibraryItems(items, "title_desc", null))).toEqual(["c", "b", "a"]);
});
it("follows material sequence and keeps quizzes with their source Reviewer, including older summaries", () => {
  const sequence: LibraryCourseSequence = { materials: [{ id: "file:2", reviewerArtifactId: "two" }, { id: "file:1", reviewerArtifactId: "one" }] };
  const items = [item("unknown", "A unlinked draft"), { ...item("artifact:one", "B second"), sourceMaterialId: "file:1" },
    { ...item("quiz:two", "B first quiz"), type: "quiz" as const, relatedArtifactIds: ["artifact:two"] }, item("artifact:two", "A first")];
  expect(ids(sortLibraryItems(items, "course", sequence))).toEqual(["artifact:two", "quiz:two", "artifact:one", "unknown"]);
});
it("keeps the manual order intact when switching away and back, with course-isolated preferences", () => {
  const prefs = setLibrarySort(setLibraryOrder(EMPTY_LIST_PREFERENCES, "a", ["b", "a"]), "a", "title_asc");
  const restored = parseListPreferences(JSON.stringify(setLibrarySort(prefs, "b", "updated_asc")));
  expect(restored.libraryOrder.a).toEqual(["b", "a"]);
  expect(restored.librarySort).toEqual({ a: "title_asc", b: "updated_asc" });
  expect(parseListPreferences('{"librarySort":{"a":"invented","b":2,"c":"course"}}').librarySort).toEqual({ c: "course" });
  const items = [item("b", "B"), item("a", "A")];
  expect(sortLibraryItems(items, "custom", null)).toBe(items);
});
it("sorts course tiles by latest saved work and course name", () => {
  const groups = ["Zulu", "Alpha"].map((name, index) => ({ key: name, course: { id: name, name, code: null }, latestAt: index + 1, total: 1, counts: { reviewer: 1, quiz: 0, activity_output: 0 } }));
  expect(sortLibraryGroups(groups, "title_asc").map(group => group.key)).toEqual(["Alpha", "Zulu"]);
  expect(sortLibraryGroups(groups, "updated_asc").map(group => group.key)).toEqual(["Zulu", "Alpha"]);
});
it("alphabetizes the visible course titles instead of hidden Canvas code/section prefixes", () => {
  const groups = ["AA | Group A | ZULU", "ZZ | Group B | ALPHA"].map(name => ({ key: name, course: { id: name, name, code: null }, latestAt: 1, total: 1, counts: { reviewer: 1, quiz: 0, activity_output: 0 } }));
  expect(sortLibraryGroups(groups, "title_asc").map(group => group.key)).toEqual([groups[1]!.key, groups[0]!.key]);
  expect(sortLibraryGroups(groups, "title_desc").map(group => group.key)).toEqual([groups[0]!.key, groups[1]!.key]);
});
