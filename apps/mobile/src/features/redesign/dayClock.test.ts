import type { TodayItem } from "@stay-focused/shared";
import { describe, expect, it } from "vitest";

import {
  CLOCK,
  angleMinutes,
  celestialBody,
  dayStateAt,
  dayOrbTones,
  dragEdge,
  followMinutes,
  hitTest,
  HORIZON_Y,
  luminance,
  moveRange,
  ringPoint,
  snapRange,
} from "./dayClock";
import { todayHideKey } from "./listPreferences";
import { arrangeToday, greetingFor, matchesCourseQuery } from "./presentation";

const at = (minutes: number, radius: number = CLOCK.ring) => ringPoint(minutes, radius);

describe("glass clock ring input", () => {
  it("reads like a wall clock: midnight at the top, 6 AM right, noon bottom, 6 PM left", () => {
    for (const minutes of [0, 360, 720, 1080]) {
      const p = at(minutes);
      expect(angleMinutes(p.x - CLOCK.center, p.y - CLOCK.center)).toBeCloseTo(minutes % 1440, 5);
    }
    expect(at(0).y).toBeLessThan(CLOCK.center - 100);
    expect(at(360).x).toBeGreaterThan(CLOCK.center + 100);
    expect(at(720).y).toBeGreaterThan(CLOCK.center + 100);
    expect(at(1080).x).toBeLessThan(CLOCK.center - 100);
  });

  it("keeps a middle to hold on even a short block", () => {
    const middle = at(615);
    expect(hitTest(middle.x, middle.y, 600, 630)).toBe("move");
    const nearStart = at(603);
    expect(hitTest(nearStart.x, nearStart.y, 600, 630)).toBe("start");
  });

  it("follows the finger continuously, with no snapping while held", () => {
    expect(followMinutes(600, 607.3)).toBeCloseTo(607.3);
    expect(followMinutes(600, 611.9)).toBeCloseTo(611.9);
    // Near midnight the nearest reading wins, so a range never flips inside out.
    expect(followMinutes(1430, 5)).toBe(1440);
    expect(followMinutes(10, 1435)).toBe(0);
  });

  it("snaps only on release, keeping a moved block's duration", () => {
    expect(snapRange(607.3, 731.9, "start")).toEqual({ start: 600, end: 735 });
    expect(snapRange(601, 721, "move")).toEqual({ start: 600, end: 720 });
    expect(snapRange(1330, 1450, "move").end).toBeLessThanOrEqual(1440);
    // A resize can never collapse the range below one step.
    expect(snapRange(700, 704, "end")).toEqual({ start: 705, end: 720 });
  });

  it("moves a whole block without changing its length or leaving the day", () => {
    expect(moveRange(600, 720, 45)).toEqual({ start: 645, end: 765 });
    expect(moveRange(600, 720, -900)).toEqual({ start: 0, end: 120 });
    expect(moveRange(600, 720, 2000)).toEqual({ start: 1320, end: 1440 });
  });

  it("keeps a dragged edge from crossing the other", () => {
    expect(dragEdge("start", 800, 600, 720)).toEqual({ start: 705, end: 720 });
    expect(dragEdge("end", 500, 600, 720)).toEqual({ start: 600, end: 615 });
  });

  it("gives handles and the middle of the block generous touch areas", () => {
    // Exactly on a handle, and well off the visible ring but still near it.
    expect(hitTest(at(600).x, at(600).y, 600, 900)).toBe("start");
    const nearEnd = at(912, CLOCK.ring + 26);
    expect(hitTest(nearEnd.x, nearEnd.y, 600, 900)).toBe("end");
    const inside = at(900, CLOCK.ring - 38);
    expect(hitTest(inside.x, inside.y, 600, 900)).toBe("end");
    // The middle of the arc drags the whole block.
    const middle = at(750, CLOCK.ring + 10);
    expect(hitTest(middle.x, middle.y, 600, 900)).toBe("move");
    // Away from the block, and inside the glass, the page keeps the touch.
    const away = at(200);
    expect(hitTest(away.x, away.y, 600, 900)).toBeNull();
    expect(hitTest(CLOCK.center, CLOCK.center + 40, 600, 900)).toBeNull();
  });
});

describe("day state inside the glass", () => {
  it("moves the sun from the left horizon, over the top at noon, to the right at 6 PM", () => {
    const rise = celestialBody(360);
    const noon = celestialBody(720);
    const set = celestialBody(1079);
    expect(rise).toMatchObject({ kind: "sun" });
    expect(rise.x).toBeLessThan(-0.7);
    expect(rise.y).toBeCloseTo(HORIZON_Y, 2);
    expect(noon.x).toBeCloseTo(0, 5);
    expect(noon.y).toBeLessThan(-0.6);
    expect(set.x).toBeGreaterThan(0.7);
    expect(celestialBody(1380).kind).toBe("moon");
    expect(celestialBody(180).kind).toBe("moon");
  });

  it("keeps the sun and moon inside the glass all day", () => {
    for (let minutes = 0; minutes < 1440; minutes += 5) {
      const body = celestialBody(minutes);
      expect(Math.hypot(body.x, body.y)).toBeLessThan(0.92);
    }
  });

  it("blends continuously, with no hard switch between phases", () => {
    const channel = (value: string) => value.match(/\d+/g)!.map(Number);
    for (let minutes = 0; minutes < 1440; minutes += 1) {
      const a = channel(dayStateAt(minutes).top);
      const b = channel(dayStateAt(minutes + 1).top);
      const jump = Math.max(...a.map((value, index) => Math.abs(value - b[index]!)));
      expect(jump, `minute ${minutes}`).toBeLessThanOrEqual(3);
    }
  });

  it("shows night with stars at midnight, none at noon, and warm light at sunset", () => {
    expect(dayStateAt(0).night).toBe(1);
    expect(dayStateAt(720).night).toBe(0);
    expect(dayStateAt(1060).warmth).toBeGreaterThan(0.3);
    expect(dayStateAt(720).warmth).toBe(0);
  });

  it("keeps daylight deep enough for white time text", () => {
    for (let minutes = 0; minutes < 1440; minutes += 10) {
      const mid = dayStateAt(minutes).mid.match(/\d+/g)!.map(Number) as [number, number, number];
      // White on the sky reaches large-text contrast (3:1) before any scrim.
      expect(1.05 / (luminance(mid) + 0.05)).toBeGreaterThanOrEqual(3);
    }
  });
});

const item = (id: string): TodayItem => ({
  id, kind: "canvas_activity", title: id, course: null, startAt: null, endAt: null, dueAt: null,
  estimatedMinutes: null, priority: "medium", status: "unknown", source: "canvas", deepLinkTarget: { surface: "activity", id },
} as unknown as TodayItem);

describe("Today pins and hides", () => {
  const sections = { next: item("a"), later: [item("b"), item("c")], dueSoon: [item("d")] };

  it("keeps a pinned item in Up Next and still shows the real next item under it", () => {
    const pinnedLater = arrangeToday(sections, ["c"], [], "2026-09-26");
    expect(pinnedLater.pinned.map((i) => i.id)).toEqual(["c"]);
    expect(pinnedLater.next?.id).toBe("a");
    expect(pinnedLater.later.map((i) => i.id)).toEqual(["b"]);

    // Pinning the recommendation itself promotes the next one in line.
    const pinnedNext = arrangeToday(sections, ["a"], [], "2026-09-26");
    expect(pinnedNext.pinned.map((i) => i.id)).toEqual(["a"]);
    expect(pinnedNext.next?.id).toBe("b");
    expect(pinnedNext.later.map((i) => i.id)).toEqual(["c"]);
  });

  it("pins from any section, including Due soon", () => {
    const result = arrangeToday(sections, ["d"], [], "2026-09-26");
    expect(result.pinned.map((i) => i.id)).toEqual(["d"]);
    expect(result.dueSoon).toEqual([]);
  });

  it("hides only for the day it was hidden on, and keeps it recoverable", () => {
    const hidden = [todayHideKey("2026-09-26", "a"), todayHideKey("2026-09-26", "d")];
    const today = arrangeToday(sections, [], hidden, "2026-09-26");
    expect(today.next?.id).toBe("b");
    expect(today.dueSoon).toEqual([]);
    expect(today.hidden.map((i) => i.id)).toEqual(["a", "d"]);
    const tomorrow = arrangeToday(sections, [], hidden, "2026-09-27");
    expect(tomorrow.next?.id).toBe("a");
    expect(tomorrow.hidden).toEqual([]);
  });
});

describe("Today greeting", () => {
  it("never says good morning at night", () => {
    expect(greetingFor(1)).toBe("Good evening");
    expect(greetingFor(4)).toBe("Good evening");
    expect(greetingFor(6)).toBe("Good morning");
    expect(greetingFor(13)).toBe("Good afternoon");
    expect(greetingFor(19)).toBe("Good evening");
  });
});

describe("day orb", () => {
  it("lights the orb with the sun by day and a cool moon by night, inside the ball", () => {
    const noon = dayOrbTones(720);
    const night = dayOrbTones(60);
    expect(noon.position.y).toBeGreaterThan(0.3);
    expect(night.light.toLowerCase()).toBe("#c8d6ff");
    expect(noon.strength).toBeGreaterThan(night.strength);
    for (let minutes = 0; minutes < 1440; minutes += 30) {
      const { position } = dayOrbTones(minutes);
      expect(Math.hypot(position.x, position.y, position.z)).toBeLessThan(0.7);
    }
  });
});

describe("Generate course search", () => {
  const cit17 = ["CIT17", "CIT17 | Web Information Systems", "Web Information Systems"];
  it("matches by code, name and partial text, ignoring case and spacing", () => {
    expect(matchesCourseQuery(cit17, "cit17")).toBe(true);
    expect(matchesCourseQuery(cit17, "CIT 17")).toBe(true);
    expect(matchesCourseQuery(cit17, "web info")).toBe(true);
    expect(matchesCourseQuery(cit17, "systems")).toBe(true);
    expect(matchesCourseQuery(cit17, "cc11")).toBe(false);
  });
  it("treats a blank query as the full list", () => {
    expect(matchesCourseQuery(cit17, "")).toBe(true);
    expect(matchesCourseQuery(cit17, "   ")).toBe(true);
  });
});

describe("Today urgency and de-duplication", () => {
  const now = new Date(2026, 8, 27, 10, 0).getTime();
  const due = (days: number, hour = 23) => new Date(2026, 8, 27 + days, hour, 0).toISOString();
  it("colors by calendar day: past due and today urgent, tomorrow next, this week soon", async () => {
    const { urgencyOf } = await import("./presentation");
    expect(urgencyOf({ dueAt: due(0, 8), status: "unknown" } as never, now)).toBe("overdue");
    expect(urgencyOf({ dueAt: due(0), status: "unknown" } as never, now)).toBe("today");
    expect(urgencyOf({ dueAt: due(1), status: "unknown" } as never, now)).toBe("tomorrow");
    expect(urgencyOf({ dueAt: due(4), status: "unknown" } as never, now)).toBe("week");
    expect(urgencyOf({ dueAt: due(12), status: "unknown" } as never, now)).toBeNull();
    expect(urgencyOf({ dueAt: due(0), status: "completed" } as never, now)).toBeNull();
  });

  it("shows an activity once: a work session for it never repeats in Later Today or Due soon", () => {
    const course = { id: "cc17", code: "CC17", name: "CC17" };
    const activity = { ...item("canvas:dice"), title: "Lab Activity 2: Dice Roller", course } as TodayItem;
    const session = { ...item("session:1"), kind: "study_session", title: "Lab Activity 2: Dice Roller", course } as TodayItem;
    const other = { ...item("canvas:other"), title: "Other", course } as TodayItem;
    const result = arrangeToday({ next: activity, later: [session, other], dueSoon: [activity] }, [], [], "2026-09-27");
    expect(result.next?.id).toBe("canvas:dice");
    expect(result.later.map((i) => i.id)).toEqual(["canvas:other"]);
    expect(result.dueSoon).toEqual([]);
    // Two sessions for the same activity in Later Today show once.
    const twice = arrangeToday({ next: other, later: [session, { ...session, id: "session:2" }], dueSoon: [] }, [], [], "2026-09-27");
    expect(twice.later.map((i) => i.id)).toEqual(["session:1"]);
  });
});

describe("clock blocks", () => {
  it("finds the scheduled block under a touch on the inner lane, but leaves handles to the handles", async () => {
    const { segmentAt } = await import("./dayClock");
    const blocks = [{ id: "b1", from: 900, to: 960 }];
    const onLane = ringPoint(930, CLOCK.lane);
    expect(segmentAt(onLane.x, onLane.y, blocks, [600, 720])?.id).toBe("b1");
    const outside = ringPoint(930, CLOCK.ring + 20);
    expect(segmentAt(outside.x, outside.y, blocks, [600, 720])).toBeNull();
    const nearHandle = ringPoint(930, CLOCK.lane);
    expect(segmentAt(nearHandle.x, nearHandle.y, blocks, [930])).toBeNull();
  });
});

describe("announcement read state", () => {
  it("records reads and survives storage", async () => {
    const { EMPTY_LIST_PREFERENCES, setRead, parseListPreferences } = await import("./listPreferences");
    const prefs = setRead(EMPTY_LIST_PREFERENCES, "a1", true);
    expect(prefs.read.announcements).toEqual(["a1"]);
    expect(parseListPreferences(JSON.stringify(prefs)).read.announcements).toEqual(["a1"]);
    expect(setRead(prefs, "a1", false).read.announcements).toEqual([]);
  });
});

describe("free time holds the day's blocks", () => {
  it("wraps a missing free time around the planned blocks, on the quarter hour", async () => {
    const { freeTimeAround } = await import("./presentation");
    expect(freeTimeAround([{ from: 722, to: 780 }, { from: 780, to: 845 }])).toEqual({ start: 720, end: 855 });
    expect(freeTimeAround([])).toBeNull();
  });
});
