import { PerspectiveCamera, ShaderMaterial, Vector3 } from "three";
import { describe, expect, it, vi } from "vitest";

import { createOrbAura, orbShimmerLevel, SHIMMER_SPEED } from "./orbAura";

const frame = {
  glow: 1,
  error: 0,
  mode: "dark" as const,
  camera: new PerspectiveCamera(),
  center: new Vector3(),
  shimmerAmount: 1,
};

describe("orb aura", () => {
  it("wavers the light without a regular beat, within its bounds", () => {
    const levels = Array.from({ length: 400 }, (_, index) =>
      orbShimmerLevel(index * 0.05),
    );
    levels.forEach((level) => expect(Math.abs(level)).toBeLessThanOrEqual(1));
    expect(Math.max(...levels) - Math.min(...levels)).toBeGreaterThan(1);
    // Peaks differ in height: overlapping rhythms, not a single repeating pulse.
    const peaks = levels.filter(
      (level, index) =>
        index > 0 &&
        level > levels[index - 1]! &&
        level > (levels[index + 1] ?? Infinity),
    );
    expect(new Set(peaks.map((peak) => peak.toFixed(2))).size).toBeGreaterThan(
      3,
    );
  });

  it("advances the shimmer with its speed and holds the light still and dark on failure", () => {
    const aura = createOrbAura();
    aura.update({ ...frame, delta: 0.25, shimmer: 1 });
    expect(aura.shimmer.time).toBeCloseTo(0.25 * SHIMMER_SPEED);
    expect(aura.shimmer.amount).toBe(1);
    const held = aura.shimmer.time;
    aura.update({ ...frame, delta: 0.25, shimmer: 0, error: 1 });
    expect(aura.shimmer.time).toBe(held);
    expect(aura.shimmer.level).toBeCloseTo(0);
    expect(
      (aura.mesh.material as ShaderMaterial).uniforms.uStrength!.value,
    ).toBe(0);
  });

  it("disposes its geometry and material", () => {
    const aura = createOrbAura();
    const geometry = vi.spyOn(aura.mesh.geometry, "dispose");
    const material = vi.spyOn(aura.mesh.material as ShaderMaterial, "dispose");
    aura.dispose();
    expect(geometry).toHaveBeenCalledOnce();
    expect(material).toHaveBeenCalledOnce();
  });
});
