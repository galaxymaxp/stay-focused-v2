import { describe, expect, it } from "vitest";

import {
  MAX_ESTIMATE_MINUTES,
  formatDueInput,
  parseDueInput,
  parseEstimateInput,
} from "./taskEditorInput";

describe("parseDueInput", () => {
  it("accepts a date with and without a time", () => {
    expect(parseDueInput("2026-09-14")).toBe(new Date(2026, 8, 14, 0, 0).toISOString());
    expect(parseDueInput("2026-09-14 17:00")).toBe(
      new Date(2026, 8, 14, 17, 0).toISOString(),
    );
    expect(parseDueInput("2026-09-14T17:00")).toBe(
      new Date(2026, 8, 14, 17, 0).toISOString(),
    );
  });

  it("treats an empty field as no deadline rather than an error", () => {
    expect(parseDueInput("")).toBeNull();
    expect(parseDueInput("   ")).toBeNull();
  });

  it("reports unparseable input instead of silently discarding it", () => {
    for (const value of ["next friday", "14/09/2026", "2026-9-14", "2026-09"]) {
      expect(parseDueInput(value)).toBe("invalid");
    }
  });

  it("rejects impossible dates that would otherwise roll forward", () => {
    // Date would turn this into March 2nd without the explicit check.
    expect(parseDueInput("2026-02-30")).toBe("invalid");
    expect(parseDueInput("2026-13-01")).toBe("invalid");
    expect(parseDueInput("2026-09-14 25:00")).toBe("invalid");
  });

  it("keeps a real leap day", () => {
    expect(parseDueInput("2028-02-29")).toBe(new Date(2028, 1, 29, 0, 0).toISOString());
  });
});

describe("formatDueInput", () => {
  it("round-trips a deadline through the editor field", () => {
    const iso = new Date(2026, 8, 14, 17, 30).toISOString();
    expect(formatDueInput(iso)).toBe("2026-09-14 17:30");
    expect(parseDueInput(formatDueInput(iso))).toBe(iso);
  });

  it("omits a midnight time so a date-only deadline stays date-only", () => {
    expect(formatDueInput(new Date(2026, 8, 14, 0, 0).toISOString())).toBe("2026-09-14");
  });

  it("renders nothing for a missing or unusable timestamp", () => {
    expect(formatDueInput(null)).toBe("");
    expect(formatDueInput("not-a-date")).toBe("");
  });
});

describe("parseEstimateInput", () => {
  it("accepts whole minutes inside the range the backend allows", () => {
    expect(parseEstimateInput("1")).toBe(1);
    expect(parseEstimateInput("30")).toBe(30);
    expect(parseEstimateInput(String(MAX_ESTIMATE_MINUTES))).toBe(MAX_ESTIMATE_MINUTES);
  });

  it("rejects values the create and patch routes would refuse", () => {
    for (const value of ["0", "1441", "-5", "12.5", "", "abc", " "]) {
      expect(parseEstimateInput(value)).toBeNull();
    }
  });
});
