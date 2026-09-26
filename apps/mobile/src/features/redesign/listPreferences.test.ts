import { describe, expect, it } from "vitest";

import { countActiveJobs } from "../../design/appActivity";
import { EMPTY_LIST_PREFERENCES, arrangeList, parseListPreferences, setHidden, setPinned } from "./listPreferences";
import { queueSections, todayItemDetail } from "./presentation";

describe("pin and hide preferences", () => {
  it("surfaces the newest pin first and keeps hidden items recoverable, never deleted", () => {
    let prefs = setPinned(EMPTY_LIST_PREFERENCES, "course", "a", true);
    prefs = setPinned(prefs, "course", "c", true);
    prefs = setHidden(prefs, "generate", "b", true);
    const arranged = arrangeList(["a", "b", "c", "d"], (id) => id, prefs.pinned.course, prefs.hidden.generate);
    expect(arranged).toEqual({ pinned: ["c", "a"], rest: ["d"], hidden: ["b"] });
    prefs = setHidden(prefs, "generate", "b", false);
    expect(arrangeList(["a", "b"], (id) => id, [], prefs.hidden.generate).hidden).toEqual([]);
  });

  it("hides per surface, so hiding in Generate leaves Library untouched", () => {
    const prefs = setHidden(EMPTY_LIST_PREFERENCES, "generate", "course", true);
    expect(prefs.hidden.library).toEqual([]);
    expect(arrangeList(["course"], (id) => id, [], prefs.hidden.library).rest).toEqual(["course"]);
  });

  it("round-trips through storage and ignores damaged data", () => {
    const prefs = setPinned(EMPTY_LIST_PREFERENCES, "artifact", "quiz:1", true);
    expect(parseListPreferences(JSON.stringify(prefs))).toEqual(prefs);
    expect(parseListPreferences("{not json")).toEqual(EMPTY_LIST_PREFERENCES);
    expect(parseListPreferences(JSON.stringify({ pinned: { course: [1, "x"] } })).pinned.course).toEqual(["x"]);
  });
});

describe("Queue status", () => {
  it("shows a status only when it is relevant", () => {
    expect(queueSections([])).toEqual([]);
    expect(queueSections([{ status: "succeeded" }]).map((section) => section.title)).toEqual(["Completed"]);
    expect(queueSections([{ status: "running" }, { status: "queued" }, { status: "queued" }]).map((section) => section.title)).toEqual(["Generating", "2 queued"]);
  });

  it("counts active work for the header orb", () => {
    expect(countActiveJobs([{ status: "running" }, { status: "queued" }, { status: "cancellation_requested" }, { status: "succeeded" }])).toEqual({ generating: 2, queued: 1 });
    expect(countActiveJobs([])).toEqual({ generating: 0, queued: 0 });
  });
});

describe("Today item detail", () => {
  it("never shows internal states and always uses a clean separator", () => {
    const now = Date.parse("2026-09-26T08:00:00");
    const due = todayItemDetail({ startAt: null, dueAt: "2026-09-26T23:59:00", estimatedMinutes: null, status: "unknown" }, now);
    expect(due).toMatch(/^Due \d/);
    expect(due).not.toContain("unknown");
    expect(todayItemDetail({ startAt: "2026-09-26T09:00:00", dueAt: null, estimatedMinutes: 45, status: "planned" }, now)).toMatch(/ · 45 min$/);
    expect(todayItemDetail({ startAt: null, dueAt: "2026-09-26T23:59:00", estimatedMinutes: null, status: "submitted" }, now)).toMatch(/ · Submitted$/);
  });

  it("never lets an old deadline read as tonight", () => {
    const now = Date.parse("2026-09-26T08:00:00");
    const old = todayItemDetail({ startAt: null, dueAt: "2023-10-12T23:59:00", estimatedMinutes: null, status: "unknown" }, now);
    expect(old).toMatch(/^Past due · /);
    expect(old).toContain("Oct");
    expect(old).toContain("2023");
    expect(todayItemDetail({ startAt: null, dueAt: "2026-09-29T23:59:00", estimatedMinutes: null, status: "pending" }, now)).toMatch(/^Due Sep 29/);
  });
});
