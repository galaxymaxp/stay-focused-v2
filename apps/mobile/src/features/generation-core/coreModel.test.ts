import { describe, expect, it } from "vitest";

import { CORE_MOTION_PROFILES, CORE_STATES, coreAccessibilityLabel, coreMotionRate, coreRibbonPalette } from "./coreModel";

describe("Knowledge Core state model", () => {
  it("uses three bounded theme-specific colors instead of a rainbow cycle", () => {
    for (const accent of ["#245DC8", "#AACBFF", "#9E1B32", "#F08C99"]) {
      for (const mode of ["light", "dark"] as const) {
        const palette = coreRibbonPalette(accent, mode);
        expect(palette).toHaveLength(3);
        palette.forEach((color) => expect(color).toMatch(/^#[0-9A-F]{6}$/));
      }
    }
    expect(coreRibbonPalette("#9E1B32", "dark")).toEqual(coreRibbonPalette("#f08c99", "dark"));
    expect(coreRibbonPalette("#9E1B32", "dark")).not.toEqual(coreRibbonPalette("#AACBFF", "dark"));
    expect(coreRibbonPalette("#AACBFF", "light")).not.toEqual(coreRibbonPalette("#AACBFF", "dark"));
  });

  it("keeps every successful state moving, including slow settled completion", () => {
    for (const state of CORE_STATES.filter((value) => value !== "error")) {
      expect(coreMotionRate(state, false, CORE_MOTION_PROFILES[state].completion)).toBeGreaterThan(0);
    }
    expect(coreMotionRate("complete", false, 1)).toBeCloseTo(0.28);
    expect(coreMotionRate("complete", false, 0.5)).toBeGreaterThan(coreMotionRate("complete", false, 1));
  });

  it("stops on failure and respects Reduced Motion in every state", () => {
    expect(coreMotionRate("error", false, 0)).toBe(0);
    for (const state of CORE_STATES) expect(coreMotionRate(state, true, 0)).toBe(0);
  });

  it("defines a complete bounded profile for every lab state", () => {
    expect(Object.keys(CORE_MOTION_PROFILES)).toEqual(CORE_STATES);
    for (const profile of Object.values(CORE_MOTION_PROFILES)) {
      for (const value of Object.values(profile)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it("uses purposeful fragments only while material is being ingested", () => {
    expect(CORE_MOTION_PROFILES.reading.intake).toBe(1);
    expect(CORE_MOTION_PROFILES.generating.intake).toBeLessThan(0.3);
    expect(CORE_MOTION_PROFILES.idle.intake).toBe(0);
    expect(CORE_MOTION_PROFILES.finalizing.intake).toBe(0);
  });

  it("announces each state without presenting invented progress", () => {
    for (const state of CORE_STATES) {
      expect(coreAccessibilityLabel(state)).not.toMatch(/\d+%/);
    }
  });
});
