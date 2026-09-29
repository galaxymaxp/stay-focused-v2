import type { LibraryArtifactSummary } from "@stay-focused/shared";
import { describe, expect, it } from "vitest";

import { describeLibraryCounts, filterCourseLibrary, groupLibraryByCourse, librarySegments } from "./libraryPresentation";

const capstone = { id: "capstone", code: "CIT6", name: "Capstone Project 1" };
const mobile = { id: "mobile", code: "CC17", name: "Mobile Application Design" };
function item(id: string, type: LibraryArtifactSummary["type"], course: LibraryArtifactSummary["course"], updatedAt: string): LibraryArtifactSummary {
  return { id, type, title: id, course, sourceId: null, sourceTitle: null, activityId: null, createdAt: updatedAt, updatedAt, lastOpenedAt: null, status: "completed", relatedArtifactIds: [] };
}
const items = [
  item("r1", "reviewer", capstone, "2026-09-20T00:00:00Z"),
  item("q1", "quiz", capstone, "2026-09-22T00:00:00Z"),
  item("r2", "reviewer", mobile, "2026-09-24T00:00:00Z"),
  item("a1", "activity_output", mobile, "2026-09-10T00:00:00Z"),
  item("p1", "reviewer", null, "2026-09-25T00:00:00Z"),
];

describe("Library presentation", () => {
  it("groups saved work into one tile per course, newest first, personal last", () => {
    const groups = groupLibraryByCourse(items);
    expect(groups.map((group) => [group.key, group.total, group.counts])).toEqual([
      ["mobile", 2, { reviewer: 1, quiz: 0, activity_output: 1 }],
      ["capstone", 2, { reviewer: 1, quiz: 1, activity_output: 0 }],
      ["personal", 1, { reviewer: 1, quiz: 0, activity_output: 0 }],
    ]);
  });

  it("filters one course by All / Reviewers / Quizzes / Drafts", () => {
    expect(librarySegments.map((segment) => segment.label)).toEqual(["All", "Reviewers", "Quizzes", "Drafts"]);
    expect(filterCourseLibrary(items, "capstone", "all").map((entry) => entry.id)).toEqual(["r1", "q1"]);
    expect(filterCourseLibrary(items, "capstone", "reviewer").map((entry) => entry.id)).toEqual(["r1"]);
    expect(filterCourseLibrary(items, "capstone", "quiz").map((entry) => entry.id)).toEqual(["q1"]);
    expect(filterCourseLibrary(items, "capstone", "activity_output")).toEqual([]);
    expect(filterCourseLibrary(items, "mobile", "activity_output").map((entry) => entry.id)).toEqual(["a1"]);
    expect(filterCourseLibrary(items, "personal", "all").map((entry) => entry.id)).toEqual(["p1"]);
  });

  it("describes only the kinds a course actually has", () => {
    expect(describeLibraryCounts({ reviewer: 3, quiz: 1, activity_output: 0 })).toBe("3 reviewers · 1 quiz");
    expect(describeLibraryCounts({ reviewer: 0, quiz: 2, activity_output: 1 })).toBe("2 quizzes · 1 draft");
  });
});
