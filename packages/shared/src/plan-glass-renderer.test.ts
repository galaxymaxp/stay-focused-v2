import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPlanGlassLoop, createPlanShell, planSlosh, PLAN_ACCENT, type PlanGlassFrame } from './plan-glass-renderer';
import { layoutClockGlyphs, type ClockGlyphMetrics } from './clock-glyphs';

const mobile = new URL('../../../apps/mobile/assets/clock/plan-atlas.json', import.meta.url);
const web = new URL('../../../apps/web/public/clock/plan-atlas.json', import.meta.url);
const metrics: ClockGlyphMetrics = JSON.parse(readFileSync(mobile, 'utf8'));
it('ships the same complete label MSDF on both platforms with full-size P', () => {
  expect(readFileSync(mobile)).toEqual(readFileSync(web));
  expect(readFileSync(new URL('plan-atlas.png', mobile))).toEqual(readFileSync(new URL('plan-atlas.png', web)));
  expect(Object.keys(metrics.glyphs).sort()).toEqual([... 'Plan'].sort());
  const label = layoutClockGlyphs('Plan', metrics, true);
  expect(label.quads.map(q => q.char).join('')).toBe('Plan');
  expect(label.quads.every(q => q.scale === 1 && q.width > 0 && q.height > 0)).toBe(true);
});
it.each([[358, 48, 12], [358, 52, 12], [300, 48, 8]])('creates a closed slab with thickness and token bounds (%i/%i/%i)', (width, height, radius) => {
  const shell = createPlanShell(width, height, radius);
  shell.geometry.computeBoundingBox(); const box = shell.geometry.boundingBox!;
  expect(box.max.x - box.min.x).toBeCloseTo(width / height, 4);
  expect(box.max.y - box.min.y).toBeCloseTo(1, 4);
  expect(box.max.z - box.min.z).toBeGreaterThan(0.25);
  expect(shell.cornerRadius).toBe(radius / height);
  shell.geometry.dispose();
});
it('tilts toward either press side, damps, settles at 600ms and respects Reduce Motion', () => {
  expect(planSlosh(70, 1, false)).toBeGreaterThan(0);
  expect(planSlosh(70, -1, false)).toBeLessThan(0);
  expect(planSlosh(70, 0, false)).toBeGreaterThan(0); // centered and keyboard presses still give feedback
  expect(Math.abs(planSlosh(450, 1, false))).toBeLessThan(Math.abs(planSlosh(70, 1, false)));
  for (const ms of [-1, 600, 700, Infinity]) expect(planSlosh(ms, 1, false)).toBe(0);
  for (let ms = 0; ms < 600; ms += 20) expect(planSlosh(ms, -1, true)).toBe(0);
});

let pending: Map<number, FrameRequestCallback>, serial: number;
beforeEach(() => {
  vi.useFakeTimers(); pending = new Map(); serial = 0;
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { pending.set(++serial, fn); return serial; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => pending.delete(id));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
function flush(ms = 80) { vi.advanceTimersByTime(ms); const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(fn => fn(Date.now())); }
function fixture() {
  let state: PlanGlassFrame = { width: 358, height: 52, radius: 12, accent: PLAN_ACCENT, mode: 'dark', running: true,
    reducedMotion: false, pressAt: Date.now(), pressSide: 1 };
  const render = vi.fn(), ready = vi.fn(), fail = vi.fn();
  const renderer = { extensions: { has: () => true }, getDrawingBufferSize: (v: THREE.Vector2) => v.set(215, 31),
    setClearColor() {}, setRenderTarget() {}, getRenderTarget: () => null, render } as unknown as THREE.WebGLRenderer;
  const loop = createPlanGlassLoop(renderer, new THREE.Texture(), metrics, () => state, ready, fail);
  const mesh = () => render.mock.calls.map(([scene]) => scene as THREE.Scene).flatMap(scene => scene.children)
    .find(node => node instanceof THREE.Group)!.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  return { loop, render, ready, fail, mesh, update: (patch: Partial<PlanGlassFrame>) => { state = { ...state, ...patch }; loop.wake(); } };
}
it('moves liquid only, keeps its accent across themes, and releases all targets/geometry', () => {
  const f = fixture(); f.loop.wake(); flush(70);
  const mesh = f.mesh(), vertices = mesh.geometry.getAttribute('position').array.slice(), geometry = mesh.geometry;
  const dispose = vi.spyOn(geometry, 'dispose');
  expect(mesh.material.uniforms.uSlosh!.value).not.toBe(0);
  for (const mode of ['light', 'dark'] as const) {
    f.update({ mode }); flush();
    expect(mesh.material.uniforms.uBase!.value.getHexString()).toBe('d7aa38');
    expect(mesh.material.uniforms.uGlowColor!.value.getHexString()).toBe('d7aa38');
    expect(mesh.material.uniforms.uWaveCount!.value).toBe(0);
    expect(mesh.geometry).toBe(geometry); expect(mesh.geometry.getAttribute('position').array).toEqual(vertices);
  }
  flush(600); expect(mesh.material.uniforms.uSlosh!.value).toBe(0);
  f.loop.dispose(); f.loop.dispose(); expect(dispose).toHaveBeenCalledOnce(); expect(pending.size).toBe(0);
});
it('cancels background frames and draws one static reduced-motion pose per explicit change', () => {
  const f = fixture(); f.loop.wake(); flush(); const count = f.render.mock.calls.length;
  f.update({ running: false }); expect(pending.size).toBe(0); flush(1000); expect(f.render).toHaveBeenCalledTimes(count);
  f.update({ running: true, reducedMotion: true }); flush(); expect(pending.size).toBe(0);
  expect(f.mesh().material.uniforms.uSlosh!.value).toBe(0);
  const time = f.mesh().material.uniforms.uTime!.value;
  f.update({ mode: 'light' }); flush(1000); expect(f.mesh().material.uniforms.uTime!.value).toBe(time);
  expect(f.fail).not.toHaveBeenCalled(); f.loop.dispose();
});
it('reports a failed draw and stops scheduling instead of publishing readiness', () => {
  const f = fixture(); f.render.mockImplementation(() => { throw new Error('synthetic_gl_failure'); });
  f.loop.wake(); flush(); expect(f.fail).toHaveBeenCalledOnce(); expect(f.ready).not.toHaveBeenCalled();
  expect(pending.size).toBe(0); f.loop.dispose();
});
