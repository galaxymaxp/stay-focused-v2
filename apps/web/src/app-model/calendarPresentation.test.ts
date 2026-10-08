import { describe, expect, it } from "vitest";

import { groupByDueDay, monthWeeks, startOfWeek, weekDays, weekLabel } from "./calendarPresentation";
import { localDate, stalledInQueue, STALLED_QUEUE_MS } from "./presentation";

describe("Today calendar", () => {
  it("builds Sunday-first weeks around any day", () => {
    const days = weekDays(new Date(2026, 8, 30)); // Wednesday
    expect(days.map(localDate)).toEqual(["2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(localDate(startOfWeek(new Date(2026, 8, 27)))).toBe("2026-09-27");
  });
  it("covers the whole month in full weeks", () => {
    const weeks = monthWeeks(new Date(2026, 8, 15));
    expect(localDate(weeks[0]![0]!)).toBe("2026-08-30");
    expect(localDate(weeks.at(-1)![6]!)).toBe("2026-10-03");
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });
  it("groups due work by local day in time order and skips undated work", () => {
    const at = (day: number, hour: number) => new Date(2026, 8, day, hour).toISOString();
    const days = groupByDueDay([
      { id: "late", dueAt: at(30, 23) },
      { id: "none", dueAt: null },
      { id: "early", dueAt: at(30, 9) },
      { id: "next", dueAt: new Date(2026, 9, 1, 12).toISOString() },
    ]);
    expect(days.get("2026-09-30")!.map((item) => item.id)).toEqual(["early", "late"]);
    expect([...days.values()].flat().some((item) => item.id === "none")).toBe(false);
  });
  it("names nearby weeks", () => {
    const today = new Date(2026, 8, 30);
    expect(weekLabel(today, today)).toBe("This week");
    expect(weekLabel(new Date(2026, 9, 5), today)).toBe("Next week");
    expect(weekLabel(new Date(2026, 8, 22), today)).toBe("Last week");
  });
});

describe("stalled queue", () => {
  it("flags only work that has waited to start for too long", () => {
    const now = Date.parse("2026-09-27T02:00:00Z");
    const since = (ms: number) => new Date(now - ms).toISOString();
    expect(stalledInQueue({ status: "queued", since: since(STALLED_QUEUE_MS + 1) }, now)).toBe(true);
    expect(stalledInQueue({ status: "queued", since: since(30_000) }, now)).toBe(false);
    expect(stalledInQueue({ status: "running", since: since(STALLED_QUEUE_MS * 3) }, now)).toBe(false);
    expect(stalledInQueue({ status: "queued", since: null }, now)).toBe(false);
  });
});
