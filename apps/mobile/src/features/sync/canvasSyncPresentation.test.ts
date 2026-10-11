import { describe, expect, it } from "vitest";

import type { CanvasCourseInventoryItem } from "../../services/canvasApi";
import { matchesCourseQuery, orderSyncCourses, splitSyncCourses, syncRowState, visibleSyncCourses } from "./canvasSyncPresentation";

function course(id: string, overrides: Partial<CanvasCourseInventoryItem> = {}): CanvasCourseInventoryItem {
  return {
    id,
    displayName: id,
    courseCode: null,
    workflowState: "available",
    startAt: null,
    endAt: null,
    term: null,
    classification: "likely_current",
    selectable: true,
    unavailableReason: null,
    selected: false,
    lastSync: null,
    ...overrides,
  };
}
const synced = { status: "success" as const, startedAt: null, completedAt: "2026-09-25T00:00:00.000Z", lastCheckedAt: null, lastSuccessfulSyncAt: "2026-09-25T00:00:00.000Z", failureCode: null };

describe("Canvas sync presentation", () => {
  it("separates uncertain and unavailable spaces while keeping selected spaces in the main list", () => {
    const items = [
      course("current"),
      course("career", { classification: "other_or_uncertain" }),
      course("past", { classification: "past_or_concluded" }),
      course("selected-career", { classification: "other_or_uncertain", selected: true }),
      course("bulletin", { classification: "unavailable", selectable: false }),
      course("selected-unavailable", { classification: "unavailable", selectable: false, selected: true }),
    ];
    const groups = splitSyncCourses(items);
    expect(groups.courses.map((item) => item.id)).toEqual(["current", "past", "selected-career", "selected-unavailable"]);
    expect(groups.otherSpaces.map((item) => item.id)).toEqual(["career", "bulletin"]);
    expect(items.map((item) => item.id)).toEqual(["current", "career", "past", "selected-career", "bulletin", "selected-unavailable"]);
  });

  it("searches both groups before the main course disclosure limits the list", () => {
    const items = ["a", "b", "c", "d"].map((id) => course(id));
    items.push(course("career", { displayName: "Career Center", classification: "other_or_uncertain" }));
    const groups = splitSyncCourses(items);
    expect(visibleSyncCourses(groups.courses, "", false).items).toHaveLength(3);
    expect(groups.otherSpaces).toHaveLength(1);
    const matches = splitSyncCourses(items.filter((item) => matchesCourseQuery(item, " career ")));
    expect(matches.courses).toEqual([]);
    expect(matches.otherSpaces.map((item) => item.id)).toEqual(["career"]);
    expect(splitSyncCourses(items.filter((item) => matchesCourseQuery(item, "no-match")))).toEqual({ courses: [], otherSpaces: [] });
  });
  it("finds a course by code however it is typed, or by part of its name", () => {
    const web = course("web", { displayName: "CIT17 | CITCS 3F Group A | Web Information Systems", courseCode: "CIT17 | CITCS 3F Group A" });
    for (const query of ["CIT17", "cit 17", "cit-17", "web info", "information systems"]) {
      expect(matchesCourseQuery(web, query)).toBe(true);
    }
    expect(matchesCourseQuery(web, "CIT16")).toBe(false);
  });

  it("shows three courses until the student asks for all of them, and every match while searching", () => {
    const ordered = ["a", "b", "c", "d", "e"].map((id) => course(id));
    expect(visibleSyncCourses(ordered, "", false)).toEqual({ items: ordered.slice(0, 3), hiddenCount: 2 });
    expect(visibleSyncCourses(ordered, "", true)).toEqual({ items: ordered, hiddenCount: 0 });
    expect(visibleSyncCourses(ordered, "d", false).items.map((item) => item.id)).toEqual(["d"]);
  });

  it("puts the course the student came for first, then synced, then this term, with unavailable last", () => {
    const ordered = orderSyncCourses([
      course("zz-unavailable", { selectable: false, classification: "unavailable" }),
      course("past", { classification: "past_or_concluded" }),
      course("current"),
      course("synced", { selected: true, classification: "past_or_concluded" }),
      course("focus", { classification: "past_or_concluded" }),
    ], "focus");
    expect(ordered.map((item) => item.id)).toEqual(["focus", "synced", "current", "past", "zz-unavailable"]);
  });

  it("tells the student what is true and what a tap does, preferring live sync state", () => {
    expect(syncRowState(course("a"), undefined)).toBe("not_synced");
    expect(syncRowState(course("a", { selected: true, lastSync: synced }), undefined)).toBe("synced");
    expect(syncRowState(course("a"), "syncing")).toBe("syncing");
    expect(syncRowState(course("a", { selected: true }), "synced")).toBe("synced");
    expect(syncRowState(course("a", { selected: true }), "failed")).toBe("failed");
    // Selected but never completed a sync: one tap finishes it.
    expect(syncRowState(course("a", { selected: true }), undefined)).toBe("not_synced");
    expect(syncRowState(course("a", { selectable: false }), undefined)).toBe("unavailable");
    // Jobs finished before the course list refreshed: stay "Synced", never flash back to "Sync".
    expect(syncRowState(course("a", { selected: false }), "synced")).toBe("synced");
    // A first tap that failed before selection still offers Retry, not a silent reset.
    expect(syncRowState(course("a"), "failed")).toBe("failed");
  });
});
