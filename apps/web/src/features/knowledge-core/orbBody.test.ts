import { Matrix3, ShaderMaterial } from "three";
import { describe, expect, it, vi } from "vitest";

import { createOrbBody } from "./orbBody";

const frame = {
  time: 3,
  life: 0.8,
  stir: 0.6,
  glow: 1,
  level: 0.2,
  error: 0,
  spin: new Matrix3(),
  mode: "dark" as const,
};

describe("orb body", () => {
  it("renders as premultiplied glass that does not hide what is behind it", () => {
    const material = createOrbBody().mesh.material as ShaderMaterial;
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.premultipliedAlpha).toBe(true);
  });

  it("passes the frame through and puts the inner light out on failure", () => {
    const body = createOrbBody();
    body.update(frame);
    expect(body.uniforms.uTime.value).toBe(3);
    expect(body.uniforms.uLife.value).toBe(0.8);
    expect(body.uniforms.uStir.value).toBe(0.6);
    expect(body.uniforms.uGlow.value).toBe(1);
    body.update({ ...frame, error: 1 });
    expect(body.uniforms.uGlow.value).toBe(0);
    expect(body.uniforms.uError.value).toBe(1);
  });

  it("disposes its geometry and material", () => {
    const body = createOrbBody();
    const geometry = vi.spyOn(body.mesh.geometry, "dispose");
    const material = vi.spyOn(body.mesh.material as ShaderMaterial, "dispose");
    body.dispose();
    expect(geometry).toHaveBeenCalledOnce();
    expect(material).toHaveBeenCalledOnce();
  });
});

it('defaults bulge to zero and resets idle overrides before a generation state', () => {
  const body = createOrbBody();
  body.update(frame);
  const base = body.uniforms.uBase.value.clone();
  expect(body.uniforms.uBulgeAmount.value).toBe(0);
  body.update({ ...frame, idleColor: '#F4C542', bulgeDir: { x: 1, y: 0, z: 0 }, bulgeAmount: 0.8 });
  expect(body.uniforms.uBase.value.equals(base)).toBe(false);
  expect(body.uniforms.uBulgeAmount.value).toBe(0.8);
  expect(body.uniforms.uBulgeDir.value.x).toBe(1);
  expect((body.mesh.material as ShaderMaterial).vertexShader).toContain('position + normal * height');
  body.update(frame);
  expect(body.uniforms.uBase.value.equals(base)).toBe(true);
  expect(body.uniforms.uBulgeAmount.value).toBe(0);
  body.dispose();
});
