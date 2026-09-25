import { describe, expect, it } from "vitest";

import { CORE_MOTION_PROFILES, CORE_STATES, coreAccessibilityLabel, coreMotionRate, coreRibbonPalette, coreSpinTarget } from "./coreModel";

describe("Knowledge Core state model", () => {
  it("uses an achromatic palette with equal RGB channels in every mode", () => {
    for (const mode of ["light", "dark"] as const) {
      const palette = coreRibbonPalette(mode);
      expect(palette).toHaveLength(3);
      palette.forEach((color) => {
        expect(color).toMatch(/^#[0-9A-F]{6}$/);
        expect(color.slice(1, 3)).toBe(color.slice(3, 5));
        expect(color.slice(3, 5)).toBe(color.slice(5, 7));
      });
    }
    expect(coreRibbonPalette("light")).not.toEqual(coreRibbonPalette("dark"));
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

  it("spins the central star with the work and stops it only on failure", () => {
    const spin = (state: (typeof CORE_STATES)[number]) => coreSpinTarget(state, false);
    expect(spin("generating")).toBe(1);
    for (const state of CORE_STATES.filter((value) => value !== "generating")) {
      expect(spin(state)).toBeLessThan(spin("generating"));
    }
    expect(spin("reading")).toBeGreaterThan(spin("idle"));
    expect(spin("finalizing")).toBeLessThan(spin("generating"));
    expect(spin("complete")).toBeGreaterThan(0);
    expect(spin("complete")).toBeLessThan(spin("idle"));
    expect(spin("error")).toBe(0);
    for (const state of CORE_STATES) expect(coreSpinTarget(state, true)).toBe(0);
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
