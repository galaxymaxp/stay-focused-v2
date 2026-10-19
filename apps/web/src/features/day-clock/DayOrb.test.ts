import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DayOrb } from './DayOrb';
import { createOrbInteraction, pushOrbSpin } from '@stay-focused/shared';
const mocks = vi.hoisted(() => ({ update: vi.fn(), aura: vi.fn(), render: vi.fn() }));
vi.mock('../knowledge-core/orbBody', async () => { const THREE = await import('three'); return { ORB_RADIUS: 0.95, createOrbBody: () => ({ mesh: new THREE.Object3D(), update: mocks.update, dispose() {} }) }; });
vi.mock('../knowledge-core/orbAura', async original => { const actual = await original<typeof import('../knowledge-core/orbAura')>(); return { ...actual, createOrbAura: () => {
  const aura = actual.createOrbAura(); return { ...aura, update: (frame: Parameters<typeof aura.update>[0]) => { mocks.aura(frame); aura.update(frame); } };
} }; });
vi.mock('three', async original => ({ ...await original<typeof import('three')>(), WebGLRenderer: class { setSize() {} setPixelRatio() {} setClearColor() {} render = mocks.render; dispose() {} forceContextLoss() {} } }));
let tree: ReactTestRenderer | undefined, frames: Map<number, FrameRequestCallback>, serial: number, reduced: boolean;
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); frames = new Map(); serial = 0; reduced = false;
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { frames.set(++serial, fn); return serial; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal('window', { matchMedia: () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} }), addEventListener() {}, removeEventListener() {} });
  vi.stubGlobal('localStorage', { getItem: () => 'pearl', setItem() {} });
  vi.stubGlobal('document', { documentElement: { dataset: { theme: 'dark' } }, visibilityState: 'visible', addEventListener() {}, removeEventListener() {},
    createElement: () => ({ clientWidth: 320, setAttribute() {}, remove() {} }) });
  vi.stubGlobal('MutationObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.useRealTimers(); vi.unstubAllGlobals(); });
async function mount(reducedMotion = false) {
  reduced = reducedMotion;
  const interaction = { state: { current: createOrbInteraction() }, wake: { current: null as (() => void) | null }, ringDragging: { current: false } };
  await act(async () => { tree = create(createElement(DayOrb, { minutes: 720, size: 320, interaction }), { createNodeMock: () => ({ prepend() {} }) }); });
  return interaction;
}
function draw() { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(Date.now())); }
it('removes the Today aura and renders a single Reduce Motion frame', async () => {
  await mount(true); draw();
  expect(mocks.aura).not.toHaveBeenCalled(); expect(mocks.render.mock.lastCall![0].children).toHaveLength(1);
  expect(frames.size).toBe(0); expect(mocks.update.mock.lastCall![0].idleColor).toBe('#e6eaf1');
});
it('returns to the original 80ms cadence after ring momentum ends', async () => {
  const interaction = await mount();
  interaction.state.current = pushOrbSpin(interaction.state.current, 0.2, Date.now());
  interaction.wake.current?.();
  for (let i = 0; i < 350; i++) { vi.advanceTimersByTime(16); draw(); }
  expect(interaction.state.current.spin.velocityY).toBe(0);
  let previous = mocks.render.mock.calls.length, slept = false;
  for (let i = 0; i < 5; i++) { vi.advanceTimersByTime(16); draw(); if (mocks.render.mock.calls.length === previous) slept = true; previous = mocks.render.mock.calls.length; }
  expect(slept).toBe(true); expect(mocks.aura).not.toHaveBeenCalled();
});
async function mountState(state: 'generating' | 'error' | 'complete' | 'idle', reducedMotion = false) {
  reduced = reducedMotion;
  const interaction = { state: { current: createOrbInteraction() }, wake: { current: null as (() => void) | null }, ringDragging: { current: false } };
  await act(async () => { tree = create(createElement(DayOrb, { minutes: 720, size: 320, state, interaction }), { createNodeMock: () => ({ prepend() {} }) }); });
  return interaction;
}
const frame = () => mocks.update.mock.lastCall![0] as { life: number; glow: number; error: number; idleColor?: string };
it('keeps Today exactly when no generation state is given', async () => {
  await mount(); vi.advanceTimersByTime(100); draw();
  expect(frame()).toMatchObject({ life: 0.22, error: 0, level: 0 });
});
it('shows running work by livelier motion at full frame rate, keeping the remembered color', async () => {
  await mountState('generating');
  for (let i = 0; i < 5; i++) { vi.advanceTimersByTime(16); draw(); }
  expect(mocks.render.mock.calls.length).toBeGreaterThanOrEqual(5);
  expect(frame().life).toBeGreaterThan(0.6);
  expect(frame().idleColor).toBe('#e6eaf1');
  expect(frame().error).toBe(0);
});
it('dims a failure to still and stops rendering once settled', async () => {
  await mountState('error');
  for (let i = 0; i < 40; i++) { vi.advanceTimersByTime(16); draw(); }
  expect(frame().error).toBe(1);
  expect(frames.size).toBe(0);
});
it('brightens briefly when a live job completes, then renders as idle Today', async () => {
  const interaction = await mountState('generating');
  for (let i = 0; i < 3; i++) { vi.advanceTimersByTime(16); draw(); }
  await act(async () => { tree!.update(createElement(DayOrb, { minutes: 720, size: 320, state: 'complete', interaction })); });
  vi.advanceTimersByTime(16); draw();
  const today = 0.35 + 0.75 * (await import('./dayClock')).dayOrbTones(720).strength;
  expect(frame().glow).toBeGreaterThan(today + 0.2);
  for (let i = 0; i < 300; i++) { vi.advanceTimersByTime(16); draw(); }
  expect(frame().glow).toBeCloseTo(today, 2);
  expect(frame().life).toBeCloseTo(0.22, 2);
});
it('snaps state levels under Reduce Motion with no brighten or ambient loop', async () => {
  await mountState('complete', true); draw();
  expect(frames.size).toBe(0);
  expect(frame()).toMatchObject({ life: 0.22, error: 0 });
});
