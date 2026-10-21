import { Color, Matrix3, ShaderMaterial } from "three";
import { ORB_IDLE_PALETTE, orbPaletteAppearance } from '@stay-focused/shared';
import { describe, expect, it, vi } from "vitest";

import { createOrbBody } from "./orbBody";

const frame = { time: 3, life: 0.8, stir: 0.6, glow: 1, level: 0.2, error: 0, spin: new Matrix3(), mode: "dark" as const };

describe("orb body", () => {
  it.each(ORB_IDLE_PALETTE)('uses the shared $key appearance in both themes on the existing body', color => {
    const body = createOrbBody();
    for (const mode of ['light', 'dark'] as const) {
      body.update({ ...frame, idleColor: color.hex, mode });
      const appearance = orbPaletteAppearance(color.key, mode);
      for (const [uniform, tone] of [[body.uniforms.uBase, appearance.base], [body.uniforms.uDeep, appearance.deep],
        [body.uniforms.uGlowColor, appearance.glow], [body.uniforms.uEnvFloor, appearance.envFloor], [body.uniforms.uEnvSky, appearance.envSky]] as const) {
        expect(uniform.value.equals(new Color(tone))).toBe(true);
      }
    }
    body.dispose();
  });
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

it('defaults ripple to zero and resets idle overrides before a generation state', () => {
  const body = createOrbBody();
  body.update(frame);
  const base = body.uniforms.uBase.value.clone();
  expect(body.uniforms.uWaves.value[0]!.w).toBe(-1);
  body.update({ ...frame, idleColor: '#F4C542', waves: [{ direction: { x: 1, y: 0, z: 0 }, time: 0.8 }] });
  expect(body.uniforms.uBase.value.equals(base)).toBe(false);
  expect(body.uniforms.uWaves.value[0]!.w).toBe(0.8);
  expect(body.uniforms.uWaves.value[0]!.x).toBe(1);
  expect((body.mesh.material as ShaderMaterial).vertexShader).toContain('position + normal * height');
  body.update(frame);
  expect(body.uniforms.uBase.value.equals(base)).toBe(true);
  expect(body.uniforms.uWaves.value[0]!.w).toBe(-1);
  body.dispose();
});
