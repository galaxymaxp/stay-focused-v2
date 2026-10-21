import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DayOrb } from './DayOrb';
import { createOrbInteraction, pushOrbSpin } from '@stay-focused/shared';
import * as THREE from 'three';
const mocks = vi.hoisted(() => ({ update: vi.fn(), aura: vi.fn(), render: vi.fn(), glass: vi.fn(),
  atlas: null as ((texture: import('three').Texture) => void) | null, fail: false }));
vi.mock('@stay-focused/shared/clock-glass-renderer', () => ({ createClockGlass: () => ({ render: mocks.glass, dispose() {} }) }));
vi.mock('../knowledge-core/orbBody', async original => {
  const actual = await original<typeof import('../knowledge-core/orbBody')>();
  return { ...actual, createOrbBody: () => { const body = actual.createOrbBody();
    return { ...body, update: (frame: Parameters<typeof body.update>[0]) => { mocks.update(frame); body.update(frame); } };
  } };
});
vi.mock('../knowledge-core/orbAura', async original => { const actual = await original<typeof import('../knowledge-core/orbAura')>(); return { ...actual, createOrbAura: () => {
  const aura = actual.createOrbAura(); return { ...aura, update: (frame: Parameters<typeof aura.update>[0]) => { mocks.aura(frame); aura.update(frame); } };
} }; });
vi.mock('three', async original => ({ ...await original<typeof import('three')>(),
  TextureLoader: class { load(_url: string, ready: (texture: import('three').Texture) => void) { mocks.atlas = ready; } },
  WebGLRenderer: class { constructor() { if (mocks.fail) throw new Error('private renderer error'); } setSize() {} setPixelRatio() {} setClearColor() {} getRenderTarget() { return null; } setRenderTarget() {} render = mocks.render; dispose() {} forceContextLoss() {} } }));
let visibility: (() => void) | undefined, blur: (() => void) | undefined, focus: (() => void) | undefined;
let themeChange: () => void;
let tree: ReactTestRenderer | undefined, frames: Map<number, FrameRequestCallback>, serial: number, reduced: boolean;
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); frames = new Map(); serial = 0; reduced = false;
  mocks.atlas = null; mocks.fail = false;
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { frames.set(++serial, fn); return serial; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal('window', { matchMedia: () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} }), addEventListener(name: string, fn: () => void) { if (name === 'blur') blur = fn; if (name === 'focus') focus = fn; }, removeEventListener() {} });
  vi.stubGlobal('localStorage', { getItem: () => 'pearl', setItem() {} });
  vi.stubGlobal('document', { documentElement: { dataset: { theme: 'dark' } }, visibilityState: 'visible', addEventListener(name: string, fn: () => void) { if (name === 'visibilitychange') visibility = fn; }, removeEventListener() {},
    createElement: () => ({ clientWidth: 320, setAttribute() {}, remove() {} }) });
  vi.stubGlobal('MutationObserver', class { constructor(callback: () => void) { themeChange = callback; } observe() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.useRealTimers(); vi.unstubAllGlobals(); });
async function mount(reducedMotion = false, extra: Partial<Parameters<typeof DayOrb>[0]> = {}) {
  reduced = reducedMotion;
  const interaction = { state: { current: createOrbInteraction() }, wake: { current: null as (() => void) | null }, ringDragging: { current: false } };
  await act(async () => { tree = create(createElement(DayOrb, { minutes: 720, size: 320, interaction, ...extra }), { createNodeMock: () => ({ prepend() {}, dataset: {}, style: { setProperty() {} } }) }); });
  return interaction;
}
function draw() { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(Date.now())); }
it('keeps the poster until a complete atlas/body/aura draw, including Reduce Motion', async () => {
  const ready = vi.fn(); await mount(true, { clock: { text: '12:00 PM', fontSize: 40 }, onGlassReady: ready });
  await act(async () => draw());
  expect(mocks.render).not.toHaveBeenCalled(); expect(ready).not.toHaveBeenCalledWith(true);
  expect(tree!.root.findByProps({ 'data-orb-load': 'loading' })).toBeTruthy();
  mocks.atlas!(new THREE.Texture());
  await act(async () => draw());
  expect(mocks.aura).toHaveBeenCalled(); expect(mocks.glass).toHaveBeenCalledOnce();
  expect(tree!.root.findByProps({ 'data-orb-load': 'ready' })).toBeTruthy();
  expect(ready).toHaveBeenLastCalledWith(true); expect(frames.size).toBe(0);
});
it('keeps the final poster on missing atlas timeout and ignores a late texture', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  await mount(true, { clock: { text: '12:00 PM', fontSize: 40 } });
  await act(async () => { draw(); vi.advanceTimersByTime(12_000); });
  expect(tree!.root.findByProps({ 'data-orb-load': 'failed' })).toBeTruthy();
  const texture = new THREE.Texture(), dispose = vi.spyOn(texture, 'dispose'); mocks.atlas!(texture);
  await act(async () => { vi.advanceTimersByTime(12_000); draw(); });
  expect(dispose).toHaveBeenCalledOnce(); expect(mocks.render).not.toHaveBeenCalled(); expect(warn).toHaveBeenCalledOnce();
});
it('keeps the poster on WebGL initialization failure without logging the raw error', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {}); mocks.fail = true;
  await mount(); expect(tree!.root.findByProps({ 'data-orb-load': 'failed' })).toBeTruthy();
  vi.advanceTimersByTime(24_000); expect(warn.mock.calls).toEqual([['Orb unavailable; keeping static poster.']]);
  expect(mocks.render).not.toHaveBeenCalled();
});
it('updates the existing scene on theme changes without resetting momentum or palette', async () => {
  const interaction = await mount();
  interaction.state.current = pushOrbSpin(interaction.state.current, 0.2, Date.now());
  interaction.wake.current?.(); vi.advanceTimersByTime(16); draw();
  const scene = mocks.render.mock.lastCall![0];
  document.documentElement.dataset.theme = 'light'; themeChange();
  expect(interaction.state.current.spin.velocityY).not.toBe(0);
  vi.advanceTimersByTime(16); draw();
  expect(mocks.update.mock.lastCall![0]).toMatchObject({ mode: 'light', idleColor: '#e6eaf1' });
  expect(mocks.render.mock.lastCall![0]).toBe(scene);
  expect(interaction.state.current.spin.velocityY).not.toBe(0);
  expect(interaction.state.current.colorIndex).toBe(0);
});
it('adds exactly one source-coupled spill and renders a single Reduce Motion frame', async () => {
  await mount(true); draw();
  expect(mocks.aura).toHaveBeenCalledOnce(); expect(mocks.render.mock.lastCall![0].children).toHaveLength(2);
  expect(mocks.aura.mock.lastCall![0].source.uBase.value.getHexString()).toBe('e6eaf1');
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
  expect(slept).toBe(true); expect(mocks.aura).toHaveBeenCalled();
});
async function mountState(state: 'generating' | 'error' | 'complete' | 'idle', reducedMotion = false) {
  reduced = reducedMotion;
  const interaction = { state: { current: createOrbInteraction() }, wake: { current: null as (() => void) | null }, ringDragging: { current: false } };
  await act(async () => { tree = create(createElement(DayOrb, { minutes: 720, size: 320, state, interaction }), { createNodeMock: () => ({ prepend() {}, style: { setProperty() {} } }) }); });
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

it('cancels hidden frames, resumes on visibility and disposes the one ambient resource', async () => {
  await mount(); vi.advanceTimersByTime(80); draw();
  const aura = mocks.render.mock.lastCall![0].children[1];
  const dispose = vi.spyOn(aura.geometry, 'dispose');
  blur?.(); expect(frames.size).toBe(0);
  focus?.(); expect(frames.size).toBe(1);
  const count = mocks.render.mock.calls.length;
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); visibility?.();
  expect(frames.size).toBe(0); vi.advanceTimersByTime(1000); draw();
  expect(mocks.render).toHaveBeenCalledTimes(count);
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); visibility?.();
  expect(frames.size).toBe(1); vi.advanceTimersByTime(80); draw();
  expect(mocks.render.mock.calls.length).toBe(count + 2);
  await act(async () => tree!.unmount()); tree = undefined;
  expect(frames.size).toBe(0); expect(dispose).toHaveBeenCalledOnce();
});
