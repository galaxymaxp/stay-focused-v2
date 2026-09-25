import { Group, Mesh, PerspectiveCamera, ShaderMaterial } from "three";
import { describe, expect, it, vi } from "vitest";

import { createNeutronStar, STAR_MAX_SPIN } from "./neutronStar";

const frame = { heat: 1, beam: 1, glow: 1, error: 0, mode: "dark" as const, camera: new PerspectiveCamera() };

function spinner(star: ReturnType<typeof createNeutronStar>) {
  return star.star.children[0] as Group;
}

describe("neutron star", () => {
  it("turns at the requested share of its maximum spin and stops at zero", () => {
    const star = createNeutronStar();
    star.update({ ...frame, delta: 0.5, spin: 1 });
    expect(spinner(star).rotation.y).toBeCloseTo(STAR_MAX_SPIN * 0.5);
    const before = spinner(star).rotation.y;
    star.update({ ...frame, delta: 0.5, spin: 0.12 });
    expect(spinner(star).rotation.y - before).toBeCloseTo(STAR_MAX_SPIN * 0.5 * 0.12);
    const settled = spinner(star).rotation.y;
    star.update({ ...frame, delta: 0.5, spin: 0, error: 1 });
    expect(spinner(star).rotation.y).toBe(settled);
  });

  it("puts out its light on failure", () => {
    const star = createNeutronStar();
    star.update({ ...frame, delta: 0.016, spin: 0, error: 1 });
    for (const glow of star.glows) {
      expect((glow.material as ShaderMaterial).uniforms.uStrength!.value).toBe(0);
    }
  });

  it("disposes every geometry and material it created", () => {
    const star = createNeutronStar();
    const meshes: Mesh[] = [];
    star.star.traverse((node) => { if (node instanceof Mesh) meshes.push(node); });
    meshes.push(...star.glows);
    const spies = [...new Set(meshes.flatMap((mesh) => [mesh.geometry, mesh.material as ShaderMaterial]))]
      .map((resource) => vi.spyOn(resource, "dispose"));
    star.dispose();
    spies.forEach((spy) => expect(spy).toHaveBeenCalledOnce());
  });
});
