import { describe, expect, it } from "vitest";

import type { CanvasCourseInventoryItem } from "../../services/canvasApi";
import { matchesCourseQuery, orderSyncCourses, syncRowState, visibleSyncCourses } from "./canvasSyncPresentation";

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
