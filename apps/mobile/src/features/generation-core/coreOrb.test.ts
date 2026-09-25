import { Mesh, PerspectiveCamera, ShaderMaterial } from "three";
import { describe, expect, it, vi } from "vitest";

import { createCoreOrb, ORB_MAX_SPIN, orbShimmerLevel, SHIMMER_SPEED } from "./coreOrb";

const frame = { heat: 1, glow: 1, error: 0, mode: "dark" as const, camera: new PerspectiveCamera(), shimmer: 0, shimmerAmount: 1 };

function spinner(orb: ReturnType<typeof createCoreOrb>) {
  return orb.orb.children[0] as Mesh;
}

describe("core orb", () => {
  it("turns at the requested share of its maximum spin and stops at zero", () => {
    const orb = createCoreOrb();
    orb.update({ ...frame, delta: 0.5, spin: 1 });
    expect(spinner(orb).rotation.y).toBeCloseTo(ORB_MAX_SPIN * 0.5);
    const before = spinner(orb).rotation.y;
    orb.update({ ...frame, delta: 0.5, spin: 0.12 });
    expect(spinner(orb).rotation.y - before).toBeCloseTo(ORB_MAX_SPIN * 0.5 * 0.12);
    const settled = spinner(orb).rotation.y;
    orb.update({ ...frame, delta: 0.5, spin: 0, error: 1 });
    expect(spinner(orb).rotation.y).toBe(settled);
  });

  it("wavers the light without a regular beat, within its bounds", () => {
    const levels = Array.from({ length: 400 }, (_, index) => orbShimmerLevel(index * 0.05));
    levels.forEach((level) => expect(Math.abs(level)).toBeLessThanOrEqual(1));
    expect(Math.max(...levels) - Math.min(...levels)).toBeGreaterThan(1);
    // Peaks differ in height: overlapping rhythms, not a single repeating pulse.
    const peaks = levels.filter((level, index) => index > 0 && level > levels[index - 1]! && level > (levels[index + 1] ?? Infinity));
    expect(new Set(peaks.map((peak) => peak.toFixed(2))).size).toBeGreaterThan(3);
  });

  it("advances the shimmer with its speed and holds the light still and dark on failure", () => {
    const orb = createCoreOrb();
    orb.update({ ...frame, delta: 0.25, spin: 0, shimmer: 1 });
    expect(orb.shimmer.time).toBeCloseTo(0.25 * SHIMMER_SPEED);
    expect(orb.shimmer.amount).toBe(1);
    const held = orb.shimmer.time;
    orb.update({ ...frame, delta: 0.25, spin: 0, shimmer: 0, error: 1 });
    expect(orb.shimmer.time).toBe(held);
    expect(orb.shimmer.level).toBeCloseTo(0);
    for (const glow of orb.glows) {
      expect((glow.material as ShaderMaterial).uniforms.uStrength!.value).toBe(0);
    }
  });

  it("disposes every geometry and material it created", () => {
    const orb = createCoreOrb();
    const meshes: Mesh[] = [];
    orb.orb.traverse((node) => { if (node instanceof Mesh) meshes.push(node); });
    meshes.push(...orb.glows);
    const spies = [...new Set(meshes.flatMap((mesh) => [mesh.geometry, mesh.material as ShaderMaterial]))]
      .map((resource) => vi.spyOn(resource, "dispose"));
    orb.dispose();
    spies.forEach((spy) => expect(spy).toHaveBeenCalledOnce());
  });
});
