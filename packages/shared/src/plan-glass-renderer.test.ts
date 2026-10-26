import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPlanGlassLoop, createPlanShell, planImpulse, type PlanGlassFrame } from './plan-glass-renderer';
import { createOrbInteraction, ORB_MAX_IMPULSES, orbWaveHeight } from './orb-interaction';
import { orbAppearance } from './orb-appearance';
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
  const pill = createPlanShell(width, height, 999);
  expect(pill.cornerRadius).toBe(0.5);
  pill.geometry.computeBoundingBox();
  expect(pill.geometry.boundingBox!.max.y - pill.geometry.boundingBox!.min.y).toBeCloseTo(1, 4);
  pill.geometry.dispose();
  shell.geometry.dispose();
});
it('retains the orb impulse model, maps both press axes and bounds rapid taps without changing colour', () => {
  const palette = createOrbInteraction();
  let impulses = planImpulse([], -1, 1, 0, false);
  expect(impulses[0]!.direction.x).toBeLessThan(0); expect(impulses[0]!.direction.y).toBeGreaterThan(0);
  expect(Math.hypot(...Object.values(impulses[0]!.direction))).toBeCloseTo(1);
  for (let i = 0; i < 20; i++) impulses = planImpulse(impulses, 0, 0, i, false);
  expect(impulses).toHaveLength(ORB_MAX_IMPULSES);
  expect(planImpulse(impulses, 0, 0, 2000, false)).toHaveLength(1);
  expect(planImpulse(impulses, 0, 0, 0, true)).toEqual([]);
  expect(palette).toEqual(createOrbInteraction());
  expect(orbWaveHeight(1, .6)).toBeGreaterThan(0);
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
  let state: PlanGlassFrame = { width: 358, height: 52, radius: 12, palette: () => createOrbInteraction(), light: { x: 0, y: 0, z: .28 }, glow: .9875, mode: 'dark', running: true,
    reducedMotion: false, impulses: planImpulse([], 1, 0, Date.now(), false) };
  const render = vi.fn(), ready = vi.fn(), fail = vi.fn();
  const renderer = { extensions: { has: () => true }, getDrawingBufferSize: (v: THREE.Vector2) => v.set(215, 31),
    setClearColor() {}, setRenderTarget() {}, getRenderTarget: () => null, render } as unknown as THREE.WebGLRenderer;
  const loop = createPlanGlassLoop(renderer, new THREE.Texture(), metrics, () => state, ready, fail);
  const mesh = () => render.mock.calls.map(([scene]) => scene as THREE.Scene).flatMap(scene => scene.children)
    .find(node => node instanceof THREE.Group)!.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  return { loop, render, ready, fail, mesh, update: (patch: Partial<PlanGlassFrame>) => { state = { ...state, ...patch }; loop.wake(); } };
}
it('moves liquid only, uses the orb palette/appearance across themes, and releases all targets/geometry', () => {
  const f = fixture(); f.loop.wake(); flush(70);
  const mesh = f.mesh(), vertices = mesh.geometry.getAttribute('position').array.slice(), geometry = mesh.geometry;
  const dispose = vi.spyOn(geometry, 'dispose');
  expect(mesh.material.uniforms.uWaveCount!.value).toBe(1);
  for (const mode of ['light', 'dark'] as const) {
    f.update({ mode }); flush();
    expect(mesh.material.uniforms.uBase!.value.getHexString()).toBe('e6eaf1');
    expect(mesh.material.uniforms.uDeep!.value.getHexString()).toBe(new THREE.Color(orbAppearance(mode, '#e6eaf1').deep).getHexString());
    expect(mesh.material.uniforms.uWaveCount!.value).toBe(1);
    expect(mesh.geometry).toBe(geometry); expect(mesh.geometry.getAttribute('position').array).toEqual(vertices);
  }
  flush(1800); expect(mesh.material.uniforms.uWaveCount!.value).toBe(0);
  f.loop.dispose(); f.loop.dispose(); expect(dispose).toHaveBeenCalledOnce(); expect(pending.size).toBe(0);
});
it('cancels background frames and draws one static reduced-motion pose per explicit change', () => {
  const f = fixture(); f.loop.wake(); flush(); const count = f.render.mock.calls.length;
  f.update({ running: false }); expect(pending.size).toBe(0); flush(1000); expect(f.render).toHaveBeenCalledTimes(count);
  f.update({ running: true, reducedMotion: true }); flush(); expect(pending.size).toBe(0);
  expect(f.mesh().material.uniforms.uWaveCount!.value).toBe(0);
  const time = f.mesh().material.uniforms.uTime!.value;
  f.update({ mode: 'light' }); flush(1000); expect(f.mesh().material.uniforms.uTime!.value).toBe(time);
  expect(f.fail).not.toHaveBeenCalled(); f.loop.dispose();
});
it('reports a failed draw and stops scheduling instead of publishing readiness', () => {
  const f = fixture(); f.render.mockImplementation(() => { throw new Error('synthetic_gl_failure'); });
  f.loop.wake(); flush(); expect(f.fail).toHaveBeenCalledOnce(); expect(f.ready).not.toHaveBeenCalled();
  expect(pending.size).toBe(0); f.loop.dispose();
});
