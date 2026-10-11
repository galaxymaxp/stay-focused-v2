import { afterEach, describe, expect, it, vi } from "vitest";
import { fromTimeInput, readFreeTime, toTimeInput, writeFreeTime } from "./free-time-store";

afterEach(() => vi.unstubAllGlobals());

describe("shared date-specific free time", () => {
  it("keeps the existing Today key and isolates different days", () => {
    const entries = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => entries.set(key, value) });
    writeFreeTime("2026-10-11", { start: 1290, end: 1410 });
    expect(entries.has("sf.today.free-time.2026-10-11")).toBe(true);
    expect(readFreeTime("2026-10-11")).toEqual({ start: 1290, end: 1410 });
    expect(readFreeTime("2026-10-12")).toBeNull();
  });

  it.each(['{', '{"start":-1,"end":120}', '{"start":0,"end":1441}', '{"start":120,"end":120}', '{"start":"90","end":120}'])("ignores malformed or out-of-day saved data: %s", saved => {
    vi.stubGlobal("localStorage", { getItem: () => saved });
    expect(readFreeTime("2026-10-11")).toBeNull();
  });

  it("tolerates blocked storage", () => {
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } });
    expect(readFreeTime("2026-10-11")).toBeNull();
    expect(() => writeFreeTime("2026-10-11", { start: 1290, end: 1440 })).not.toThrow();
  });

  it("accepts next midnight and formats clock input without wrapping the saved value", () => {
    vi.stubGlobal("localStorage", { getItem: () => '{"start":1290,"end":1440}' });
    expect(readFreeTime("2026-10-11")).toEqual({ start: 1290, end: 1440 });
    expect(toTimeInput(1290)).toBe("21:30");
    expect(toTimeInput(1440)).toBe("00:00");
    expect(fromTimeInput("23:30")).toBe(1410);
    expect(fromTimeInput("")).toBeNaN();
  });
});
