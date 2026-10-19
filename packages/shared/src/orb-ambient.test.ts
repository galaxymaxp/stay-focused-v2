import { Color, Matrix3, ShaderMaterial, Vector3 } from 'three';
import { expect, it, vi } from 'vitest';
import { orbAmbientEase } from './orb-ambient';
import { createOrbAmbient, type OrbAmbientSource } from './orb-ambient-renderer';

const source = (): OrbAmbientSource => ({
  uTime: { value: 8.4 }, uLife: { value: 0.4 }, uStir: { value: 0 },
  uGlow: { value: 1 }, uError: { value: 0 },
  uSpin: { value: new Matrix3() }, uLight: { value: new Vector3(0.4, 0.2, 0.1) },
  uBase: { value: new Color('#e6eaf1') }, uDeep: { value: new Color('#161b26') },
  uGlowColor: { value: new Color('#cfddff') },
});
it('eases by elapsed time, with identical 12.5/30/60Hz responses', () => {
  const response = (hz: number) => {
    let value = 0;
    for (let i = 0; i < hz * 2; i++) value += (1 - value) * orbAmbientEase(1 / hz, false);
    return value;
  };
  expect(response(12.5)).toBeCloseTo(response(60), 12);
  expect(response(30)).toBeCloseTo(response(60), 12);
  expect(orbAmbientEase(0, false)).toBe(0);
  expect(orbAmbientEase(NaN, false)).toBe(0);
  expect(orbAmbientEase(-1, false)).toBe(0);
  expect(orbAmbientEase(0, true)).toBe(1);
});
it('uses resolved body colors, spatial light, inverse spin and liquid clock; never mutates the source', () => {
  const a = createOrbAmbient(), s = source();
  a.update(s, 0, 'dark', false);
  const u = (a.mesh.material as ShaderMaterial).uniforms;
  expect(u.uBase!.value.equals(s.uBase.value)).toBe(true);
  expect(u.uDeep!.value.equals(s.uDeep.value)).toBe(true);
  expect(u.uGlowColor!.value.equals(s.uGlowColor.value)).toBe(true);
  expect(u.uTime!.value).toBe(8.4);
  expect(u.uLight!.value.equals(s.uLight.value)).toBe(true);
  s.uBase.value.set('#f4c542'); s.uSpin.value.set(0, 1, 0, -1, 0, 0, 0, 0, 1); s.uTime.value = 10;
  a.update(s, 0.08, 'dark', false);
  expect(u.uBase!.value.equals(s.uBase.value)).toBe(false);
  expect(s.uBase.value.getHexString()).toBe('f4c542');
  expect(u.uSpin!.value.equals(s.uSpin.value)).toBe(true);
  expect(u.uTime!.value).toBe(10);
  a.update(s, 0, 'light', true);
  expect(u.uBase!.value.equals(s.uBase.value)).toBe(true);
  expect(u.uStrength!.value).toBe(0.18);
  s.uError.value = 1; a.update(s, 0.08, 'dark', false);
  expect(u.uStrength!.value).toBe(0);
  a.dispose();
});
it('is stable in reduced motion and owns no scheduling or readback; disposal is idempotent', () => {
  const a = createOrbAmbient(), s = source();
  a.update(s, 0, 'dark', true);
  const u = (a.mesh.material as ShaderMaterial).uniforms;
  const snapshot = JSON.stringify(u);
  for (let i = 0; i < 3; i++) a.update(s, 10, 'dark', true);
  expect(JSON.stringify(u)).toBe(snapshot);
  const geometry = vi.spyOn(a.mesh.geometry, 'dispose');
  const material = vi.spyOn(a.mesh.material as ShaderMaterial, 'dispose');
  a.dispose(); a.dispose();
  s.uTime.value = 100; a.update(s, 1, 'dark', false);
  expect(u.uTime!.value).toBe(8.4);
  expect(geometry).toHaveBeenCalledOnce(); expect(material).toHaveBeenCalledOnce();
});
