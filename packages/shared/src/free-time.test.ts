import { describe, expect, it } from "vitest";
import { containsMinute, freeTimeDuration, freeTimeEnd, freeTimePlanningRange, localMinuteIso, todayClockWindow, validFreeTime } from "./free-time";

describe("start-date-owned free time", () => {
  it.each([[1320, 240, 360], [1410, 30, 60], [540, 660, 120]])("measures %i to %i", (start, end, duration) => {
    expect(freeTimeDuration(start, end)).toBe(duration);
    const plan = freeTimePlanningRange("2026-10-17", start, end);
    expect(plan.availability).toEqual([{ startsAt: localMinuteIso("2026-10-17", start), endsAt: localMinuteIso("2026-10-17", freeTimeEnd(start, end)) }]);
    expect(plan.planningRange.endsAt).toBe(localMinuteIso("2026-10-17", Math.max(1440, freeTimeEnd(start, end))));
  });
  it("contains both sides of midnight and excludes daytime", () => {
    expect(containsMinute(1320, 240, 1380)).toBe(true);
    expect(containsMinute(1320, 240, 180)).toBe(true);
    expect(containsMinute(1320, 240, 720)).toBe(false);
    expect(containsMinute(1320, 240, 240)).toBe(false);
  });
  it.each([{ start: 1, end: 1 }, { start: 0, end: 1440 }, { start: -1, end: 4 }, { start: 1440, end: 10 }, { start: 4, end: -1 }, { start: 1, end: 1441 }, { start: 1.5, end: 2 }, null])("rejects invalid windows %j", value => {
    expect(validFreeTime(value)).toBe(false);
  });
  it("switches ownership exactly at the wrapped end", () => {
    const previous = { start: 1320, end: 240 };
    const current = { start: 540, end: 660 };
    const early = todayClockWindow(new Date(2026, 9, 18, 1, 30), previous, current);
    expect(early.date).toBe("2026-10-17");
    expect(early.window).toEqual(previous);
    expect(early.override).toEqual({ endsAt: localMinuteIso("2026-10-18", 240) });
    for (const hour of [4, 5]) {
      const later = todayClockWindow(new Date(2026, 9, 18, hour), previous, current);
      expect(later.date).toBe("2026-10-18");
      expect(later.override).toEqual({ startsAt: localMinuteIso("2026-10-18", 240) });
    }
  });
});
