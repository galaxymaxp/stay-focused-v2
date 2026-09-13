import { describe, expect, it } from "vitest";
import type { LearningMaterial, TodayItem } from "@stay-focused/shared";
import {
  available,
  clockMinutes,
  generationMessages,
  moduleGroups,
  planningRequest,
  primaryTabs,
  ringDragMinutes,
  snapMinutes,
  timelineSegments,
} from "./presentation";
import {
  palettes,
  resolveTheme,
  shouldAnimate,
} from "../../design/themeTokens";

describe("B25 navigation and truthful presentation", () => {
  it("exposes exactly the four primary destinations in approved order", () => {
    expect(primaryTabs.map((tab) => tab.title)).toEqual([
      "Today",
      "Generate",
      "Tasks",
      "Library",
    ]);
    expect(primaryTabs.map((tab) => tab.route)).not.toContain("generation");
  });
  it("fails closed for missing and unavailable capabilities", () => {
    expect(available(undefined)).toBe(false);
    expect(available({ status: "unavailable" })).toBe(false);
    expect(available({ status: "temporarily_unavailable" })).toBe(false);
    expect(available({ status: "available" })).toBe(true);
  });
  it("preserves contiguous Canvas groups and order including ungrouped materials", () => {
    const items = [
      { id: "b", moduleTitle: "Module 2" },
      { id: "a", moduleTitle: "Module 2" },
      { id: "d", moduleTitle: null },
      { id: "c", moduleTitle: "Module 1" },
    ] as LearningMaterial[];
    const groups = moduleGroups(items);
    expect(groups.map((group) => group.title)).toEqual([
      "Module 2",
      null,
      "Module 1",
    ]);
    expect(
      groups.flatMap((group) => group.items.map((item) => item.id)),
    ).toEqual(["b", "a", "d", "c"]);
  });
  it("maps only backend states, with no timer-derived percentage", () => {
    expect(generationMessages.preparing).toBe("Reading your material…");
    expect(generationMessages.finalizing).toBe("Saving your work…");
    expect(Object.values(generationMessages).join(" ")).not.toMatch(/\d+%/);
  });
});
describe("day-ring input and planner boundary", () => {
  it.each([
    [0, -1, 0],
    [1, 0, 360],
    [0, 1, 720],
    [-1, 0, 1080],
  ])("maps (%s,%s) around the day", (x, y, minutes) =>
    expect(clockMinutes(x, y)).toBe(minutes),
  );
  it("keeps a midnight drag on the nearest boundary", () => {
    expect(ringDragMinutes(1425, 0)).toBe(1440);
    expect(ringDragMinutes(15, 1430)).toBe(0);
  });
  it("snaps and bounds fifteen-minute adjustments", () => {
    expect(snapMinutes(368)).toBe(375);
    expect(snapMinutes(-10)).toBe(0);
    expect(snapMinutes(1500)).toBe(1440);
  });
  it("sends availability to the authoritative planner without client sessions", () => {
    const request = planningRequest("2026-09-13", 600, 720);
    expect(request.availability).toEqual([request.planningRange]);
    expect(Object.keys(request)).toEqual(["planningRange", "availability"]);
    expect(
      Date.parse(request.planningRange.endsAt) -
        Date.parse(request.planningRange.startsAt),
    ).toBe(120 * 60000);
    expect(() => planningRequest("2026-09-13", 720, 600)).toThrow();
  });
  it("draws only real timed blocks and excludes skipped sessions", () => {
    const items = [
      {
        id: "timed",
        kind: "study_session",
        title: "Study",
        startAt: "2026-09-13T10:00:00",
        endAt: "2026-09-13T11:00:00",
        status: "planned",
      },
      {
        id: "skipped",
        startAt: "2026-09-13T12:00:00",
        endAt: "2026-09-13T13:00:00",
        status: "skipped",
      },
      { id: "deadline", startAt: null, endAt: null },
    ] as TodayItem[];
    expect(timelineSegments(items, "2026-09-13")).toEqual([
      {
        id: "timed",
        from: 600,
        to: 660,
        kind: "study_session",
        title: "Study",
      },
    ]);
  });
});
describe("appearance and ambient lifecycle", () => {
  it("supports explicit themes and follows the system", () => {
    expect(resolveTheme("system", "dark")).toBe("dark");
    expect(resolveTheme("light", "dark")).toBe("light");
    expect(resolveTheme("dark", "light")).toBe("dark");
    expect(resolveTheme("system", null)).toBe("light");
  });
  it("uses neutral dark surfaces and an independent warm light canvas", () => {
    expect(palettes.dark.backgroundPrimary).toBe("#000000");
    expect(palettes.dark.surfacePrimary).toBe("#1C1C1E");
    expect(palettes.light.backgroundPrimary).toBe("#F7F6F2");
  });
  it.each([
    [true, true, true],
    [false, false, true],
    [false, true, false],
  ])(
    "stops ambient motion for reduced=%s active=%s focused=%s",
    (reduced, active, focused) =>
      expect(shouldAnimate(reduced, active, focused)).toBe(false),
  );
  it("animates only a visible active screen without reduced motion", () =>
    expect(shouldAnimate(false, true, true)).toBe(true));
});
