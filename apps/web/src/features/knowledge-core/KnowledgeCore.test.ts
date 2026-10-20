import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { KnowledgeCore } from './KnowledgeCore';
import type { CoreState } from './coreModel';
const mocks = vi.hoisted(() => ({ update: vi.fn(), aura: vi.fn(), render: vi.fn() }));
vi.mock('./orbBody', async original => {
  const actual = await original<typeof import('./orbBody')>();
  return { ...actual, createOrbBody: () => { const body = actual.createOrbBody();
    return { ...body, update: (frame: Parameters<typeof body.update>[0]) => { mocks.update(frame); body.update(frame); } };
  } };
});
vi.mock('./orbAura', async original => { const actual = await original<typeof import('./orbAura')>(); return { ...actual, createOrbAura: () => {
  const aura = actual.createOrbAura(); return { ...aura, update: (frame: Parameters<typeof aura.update>[0]) => { mocks.aura(frame); aura.update(frame); } };
} }; });
vi.mock('three', async original => ({ ...await original<typeof import('three')>(), WebGLRenderer: class { setSize() {} setPixelRatio() {} setClearColor() {} getRenderTarget() { return null; } setRenderTarget() {} render = mocks.render; dispose() {} forceContextLoss() {} } }));
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
async function mount(state: CoreState, reducedMotion = false) {
  reduced = reducedMotion;
  await act(async () => { tree = create(createElement(KnowledgeCore, { state }), { createNodeMock: () => ({ prepend() {}, addEventListener() {}, removeEventListener() {} }) }); });
}
function draw() { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(Date.now())); }
const target = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100 }), hasPointerCapture: () => false };
const event = { pointerId: 1, isPrimary: true, button: 0, clientX: 50, clientY: 50, currentTarget: target };
it.each<CoreState>(['reading', 'generating', 'finalizing', 'complete', 'error'])('keeps %s colors authoritative while tapping ripples', async state => {
  await mount(state); draw();
  const p = tree!.root.findByProps({ 'data-testid': 'orb-touch' }).props;
  p.onPointerDown(event); vi.advanceTimersByTime(50); p.onPointerUp(event);
  vi.advanceTimersByTime(100); draw();
  expect(mocks.update.mock.lastCall![0].idleColor).toBeUndefined();
  expect(mocks.aura.mock.lastCall![0].source.uBase.value.getHexString()).toBe('dde3ee');
  expect(mocks.update.mock.lastCall![0].waves[0].time).toBeCloseTo(0.1);
});
it('uses the same crossfade for the body and aura, then restores generation colors', async () => {
  await mount('idle'); draw();
  const p = tree!.root.findByProps({ 'data-testid': 'orb-touch' }).props;
  p.onPointerDown(event); vi.advanceTimersByTime(50); p.onPointerUp(event);
  vi.advanceTimersByTime(300); draw();
  expect('#' + mocks.aura.mock.lastCall![0].source.uBase.value.getHexString()).toBe(mocks.update.mock.lastCall![0].idleColor);
  expect(mocks.aura.mock.lastCall![0].source.uBase.value.getHexString()).not.toBe('e6eaf1');
  await act(async () => tree!.update(createElement(KnowledgeCore, { state: 'reading' }))); draw();
  expect(mocks.update.mock.lastCall![0].idleColor).toBeUndefined(); expect(mocks.aura.mock.lastCall![0].source.uBase.value.getHexString()).toBe('dde3ee');
});
it('renders reduced-motion color once and sleeps with no ripple or momentum', async () => {
  await mount('idle', true); draw(); expect(frames.size).toBe(0);
  const p = tree!.root.findByProps({ 'data-testid': 'orb-touch' }).props;
  p.onPointerDown(event); vi.advanceTimersByTime(50); p.onPointerUp(event); draw();
  expect(mocks.update.mock.lastCall![0].idleColor).toBe('#f4c542');
  expect(mocks.aura.mock.lastCall![0].source.uBase.value.getHexString()).toBe('f4c542');
  expect(mocks.update.mock.lastCall![0].waves).toEqual([]); expect(frames.size).toBe(0);
});
