import { Camera, Scene, ShaderMaterial, WebGLRenderTarget, type WebGLRenderer } from 'three';
import { expect, it, vi } from 'vitest';
import { orbAmbientEase } from './orb-ambient';
import { createOrbAmbient, type OrbAmbientSource } from './orb-ambient-renderer';

const source = (): OrbAmbientSource => ({
  uGlow: { value: 1 }, uError: { value: 0 },
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
it('captures the same resolved body scene without feedback and restores target/visibility even on failure', () => {
  const a = createOrbAmbient(), s = source();
  a.update(s, 0, 'dark', false);
  const u = (a.mesh.material as ShaderMaterial).uniforms;
  const previous = new WebGLRenderTarget(3, 3), scene = new Scene(), camera = new Camera();
  scene.add(a.mesh);
  const setRenderTarget = vi.fn();
  const render = vi.fn((actualScene: Scene, actualCamera: Camera) => {
    expect(actualScene).toBe(scene); expect(actualCamera).toBe(camera);
    expect(a.mesh.visible).toBe(false);
  });
  const renderer = { getRenderTarget: () => previous, setRenderTarget, render } as unknown as WebGLRenderer;
  a.capture(renderer, scene, camera);
  const target = setRenderTarget.mock.calls[0]![0] as WebGLRenderTarget;
  expect(target.width).toBe(64); expect(target.height).toBe(64);
  expect(u.uSource!.value).toBe(target.texture);
  expect(setRenderTarget).toHaveBeenLastCalledWith(previous); expect(a.mesh.visible).toBe(true);
  render.mockImplementationOnce(() => { throw Error('draw_failed'); });
  expect(() => a.capture(renderer, scene, camera)).toThrow('draw_failed');
  expect(setRenderTarget).toHaveBeenLastCalledWith(previous); expect(a.mesh.visible).toBe(true);
  a.update(s, 0, 'light', true);
  expect(u.uStrength!.value).toBe(0.5);
  s.uError.value = 1; a.update(s, 0.08, 'dark', false);
  expect(u.uStrength!.value).toBe(0);
  const dispose = vi.spyOn(target, 'dispose');
  a.dispose(); a.dispose(); expect(dispose).toHaveBeenCalledOnce(); previous.dispose();
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
  s.uGlow.value = 100; a.update(s, 1, 'dark', false);
  expect(JSON.stringify(u)).toBe(snapshot);
  expect(geometry).toHaveBeenCalledOnce(); expect(material).toHaveBeenCalledOnce();
});

it('retains clock geometry and explicitly starts standalone under the body with a padded transparent boundary', async () => {
  const { ORB_AMBIENT_PROFILES } = await import('./orb-ambient');
  expect(ORB_AMBIENT_PROFILES.clock).toEqual({ size: 2.92, inner: 0.975, rise: 1.2,
    fade: 1.06, outer: 1.44, maskGain: 1, intensity: 1, canvasScale: 1 });
  const p = ORB_AMBIENT_PROFILES.standalone;
  expect(p.inner / .95).toBeCloseTo(.9); expect(p.outer / .95).toBeCloseTo(1.7);
  expect(p.rise).toBe(.95); expect(p.fade).toBe(.95);
  expect(p.outer).toBeLessThan(p.size / 2);
  expect(p.outer).toBeLessThan(4.55 * Math.tan(Math.PI / 10) * p.canvasScale);
  for (const variant of ['clock', 'standalone'] as const) {
    const a = createOrbAmbient(variant), u = (a.mesh.material as ShaderMaterial).uniforms;
    const profile = ORB_AMBIENT_PROFILES[variant];
    expect(u.uProfile!.value.toArray()).toEqual([profile.inner, profile.rise, profile.fade, profile.outer]);
    expect(a.mesh.geometry.parameters.width).toBe(profile.size);
    expect(u.uSampleScale!.value * profile.canvasScale).toBeCloseTo(.18);
    a.dispose();
  }
});
it.each(['dark', 'light'] as const)('halves peak standalone coverage in %s without changing easing or error shutdown', mode => {
  const clock = createOrbAmbient('clock'), alone = createOrbAmbient('standalone');
  const c = (clock.mesh.material as ShaderMaterial).uniforms, a = (alone.mesh.material as ShaderMaterial).uniforms;
  const smooth = (lo: number, hi: number, x: number) => { const t = Math.max(0, Math.min(1, (x - lo) / (hi - lo))); return t * t * (3 - 2 * t); };
  const peak = (u: typeof a) => {
    const p = u.uProfile!.value; let max = 0;
    for (let i = 0; i <= 20000; i++) { const r = i / 10000;
      max = Math.max(max, smooth(p.x, p.y, r) * (1 - smooth(p.z, p.w, r)) * u.uMaskGain!.value); }
    return max * u.uStrength!.value;
  };
  const s = source(); clock.update(s, 0, mode, true); alone.update(s, 0, mode, true);
  expect(a.uStrength!.value / c.uStrength!.value).toBe(.5);
  expect(peak(a) / peak(c)).toBeCloseTo(.5, 3);
  s.uGlow.value = 1.4; clock.update(s, .08, mode, false); alone.update(s, .08, mode, false);
  expect(a.uStrength!.value / c.uStrength!.value).toBeCloseTo(.5, 12);
  s.uError.value = 1; alone.update(s, .08, mode, false); expect(a.uStrength!.value).toBe(0);
  clock.dispose(); alone.dispose();
});
