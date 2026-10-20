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
