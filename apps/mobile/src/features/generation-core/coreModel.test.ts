import { describe, expect, it } from "vitest";

import { CORE_MOTION_PROFILES, CORE_STATES, coreAccessibilityLabel, coreMotionRate, coreShimmerTarget, coreSpinTarget, REDUCED_MOTION_RATE } from "./coreModel";

describe("Knowledge Core state model", () => {
  it("keeps every successful state moving, including slow settled completion", () => {
    for (const state of CORE_STATES.filter((value) => value !== "error")) {
      expect(coreMotionRate(state, false, CORE_MOTION_PROFILES[state].completion)).toBeGreaterThan(0);
    }
    expect(coreMotionRate("complete", false, 1)).toBeCloseTo(0.28);
    expect(coreMotionRate("complete", false, 0.5)).toBeGreaterThan(coreMotionRate("complete", false, 1));
  });

  it("stops ambient motion on failure and under Reduce Motion", () => {
    expect(coreMotionRate("error", false, 0)).toBe(0);
    expect(coreMotionRate("error", true, 0)).toBe(0);
    for (const state of CORE_STATES.filter((value) => value !== "error")) {
      const reduced = coreMotionRate(state, true, CORE_MOTION_PROFILES[state].completion);
      expect(reduced).toBe(0);
      expect(reduced).toBeLessThanOrEqual(REDUCED_MOTION_RATE);
    }
  });

  it("spins the orb with the work and stops it only on failure", () => {
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
    for (const state of CORE_STATES.filter((value) => value !== "error")) {
      expect(coreSpinTarget(state, true)).toBe(0);
      expect(coreSpinTarget(state, true)).toBeLessThanOrEqual(spin("complete"));
    }
    expect(coreSpinTarget("error", true)).toBe(0);
  });

  it("wavers the light with the work, softly once complete, never on failure or under Reduced Motion", () => {
    const shimmer = (state: (typeof CORE_STATES)[number]) => coreShimmerTarget(state, false);
    for (const state of CORE_STATES.filter((value) => value !== "generating")) {
      expect(shimmer(state)).toBeLessThan(shimmer("generating"));
    }
    expect(shimmer("complete")).toBeGreaterThan(0);
    expect(shimmer("complete")).toBeLessThan(shimmer("idle"));
    expect(shimmer("error")).toBe(0);
    for (const state of CORE_STATES) expect(coreShimmerTarget(state, true)).toBe(0);
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

  it("announces each state without presenting invented progress", () => {
    for (const state of CORE_STATES) {
      expect(coreAccessibilityLabel(state)).not.toMatch(/\d+%/);
    }
  });
});

describe("Today orb generation levels", () => {
  it("adds nothing for idle or settled completion and winds failure down to still", async () => {
    const { createCoreLevels, coreLevelsExtra, stepCoreLevels } = await import("./coreModel");
    const idle = coreLevelsExtra(createCoreLevels("idle", false), false);
    expect(idle).toMatchObject({ life: 0, glow: 0, rate: 0, shimmerAmount: 0, error: 0, lively: false });
    let levels = stepCoreLevels(createCoreLevels("generating", false), "complete", 0.016, false);
    expect(levels.flash).toBe(1);
    for (let i = 0; i < 200; i++) levels = stepCoreLevels(levels, "complete", 0.016, false);
    expect(levels.flash).toBe(0);
    for (let i = 0; i < 200; i++) levels = stepCoreLevels(levels, "error", 0.016, false);
    const failed = coreLevelsExtra(levels, false);
    expect(failed.error).toBeCloseTo(1, 3);
    expect(0.12 + failed.spin).toBeLessThanOrEqual(0);
  });
  it("snaps under Reduce Motion without a completion brighten", async () => {
    const { createCoreLevels, stepCoreLevels } = await import("./coreModel");
    expect(stepCoreLevels(createCoreLevels("generating", true), "complete", 0.016, true).flash).toBe(0);
  });
});
