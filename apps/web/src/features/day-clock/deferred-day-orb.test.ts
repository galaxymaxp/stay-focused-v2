import { beginOrbGesture, createOrbInteraction, moveOrbGesture, pushOrbSpin } from '@stay-focused/shared';
import type { OrbInteractionHandle } from '../knowledge-core/orbInteraction';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ load: vi.fn(), render: vi.fn() }));
vi.mock('./DayOrb', () => { mocks.load(); return { DayOrb: (props: { size: number }) => { mocks.render(props); return null; } }; });
import { DeferredDayOrb } from './DeferredDayOrb';
let root: ReactTestRenderer | undefined;
let frames: Map<number, FrameRequestCallback>, serial: number, reduced: boolean;
beforeEach(() => {
  vi.useFakeTimers();
  frames = new Map(); serial = 0; reduced = false;
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('document', { documentElement: { dataset: { theme: 'light' } } });
  vi.stubGlobal('MutationObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn(), matchMedia: () => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { frames.set(++serial, fn); return serial; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; vi.useRealTimers(); vi.unstubAllGlobals(); });
async function frame() { await act(async () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(0)); }); }
it('renders a same-size still and preloads the split module before data is ready', async () => {
  const props = { minutes: 720, size: 240, ready: false };
  expect(renderToStaticMarkup(createElement(DeferredDayOrb, props))).toContain('width:240px;height:240px');
  await act(async () => { root = create(createElement(DeferredDayOrb, props)); });
  expect(root!.root.findByProps({ 'data-testid': 'day-orb-still' })).toBeTruthy();
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(mocks.load).toHaveBeenCalledOnce();
  expect(mocks.render).not.toHaveBeenCalled();
  expect(frames.size).toBe(0);
  await act(async () => root!.update(createElement(DeferredDayOrb, { ...props, ready: true })));
  await frame();
  await frame();
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(mocks.load).toHaveBeenCalledOnce();
  expect(mocks.render).toHaveBeenCalledWith(expect.objectContaining({ minutes: 720, size: 240, interaction: expect.any(Object) }));
});
it('keeps the static frame without requesting animation for reduced motion', async () => {
  reduced = true;
  await act(async () => { root = create(createElement(DeferredDayOrb, { minutes: 0, size: 240, ready: true })); });
  await frame(); await frame();
  expect(mocks.render).not.toHaveBeenCalled();
  expect(root!.root.findByProps({ 'data-testid': 'day-orb-still' })).toBeTruthy();
});
it('preserves the standalone Generation change-only live pose under Reduce Motion', async () => {
  reduced = true;
  await act(async () => { root = create(createElement(DeferredDayOrb, { minutes: 720, size: 240, ready: true, variant: 'standalone' })); });
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(mocks.render).toHaveBeenCalledWith(expect.objectContaining({ variant: 'standalone', size: 240 }));
  expect(frames.size).toBe(0);
});

it('loads a single renderable reduced-motion pose on held rotation, without ambient frames', async () => {
  reduced = true;
  const interaction: OrbInteractionHandle = { state: { current: createOrbInteraction() }, wake: { current: null } };
  await act(async () => { root = create(createElement(DeferredDayOrb, { minutes: 0, size: 240, ready: true, interaction })); });
  interaction.state.current = moveOrbGesture(beginOrbGesture(interaction.state.current, 50, 50, 0), 70, 50, 100, 250, true);
  await act(async () => interaction.wake.current?.());
  await frame(); await frame(); await act(async () => { await vi.dynamicImportSettled(); });
  expect(mocks.render).toHaveBeenCalled();
  expect(interaction.state.current.spin.velocityY).toBe(0);
  expect(frames.size).toBe(0);
});

it('loads a renderable still for deliberate ring input under reduced motion', async () => {
  reduced = true;
  const interaction: OrbInteractionHandle = { state: { current: createOrbInteraction() }, wake: { current: null }, ringDragging: { current: true } };
  await act(async () => { root = create(createElement(DeferredDayOrb, { minutes: 0, size: 240, ready: true, interaction })); });
  interaction.state.current = pushOrbSpin(interaction.state.current, 0.3, 100, true);
  await act(async () => interaction.wake.current?.());
  await frame(); await frame(); await act(async () => { await vi.dynamicImportSettled(); });
  expect(mocks.render).toHaveBeenCalled(); expect(interaction.state.current.spin.y).toBe(0.3);
  expect(interaction.state.current.spin.velocityY).toBe(0); expect(frames.size).toBe(0);
});

it('loads a still glass clock under Reduce Motion without an orb gesture', async () => {
  reduced = true;
  await act(async () => { root = create(createElement(DeferredDayOrb, { minutes: 720, size: 240, ready: true, clock: { text: '12:00 PM', fontSize: 30 } })); });
  await frame(); await frame(); await act(async () => { await vi.dynamicImportSettled(); });
  expect(mocks.render).toHaveBeenCalledWith(expect.objectContaining({ clock: { text: '12:00 PM', fontSize: 30 } }));
  expect(frames.size).toBe(0);
});
it('does not restart deferred loading when time changes on consecutive drag frames', async () => {
  const props = { minutes: 720, size: 240, ready: true };
  await act(async () => { root = create(createElement(DeferredDayOrb, { ...props, clock: { text: '3:00 PM', fontSize: 30 } })); });
  await frame();
  await act(async () => root!.update(createElement(DeferredDayOrb, { ...props, clock: { text: '3:01 PM', fontSize: 30 } })));
  await frame(); await act(async () => { await vi.dynamicImportSettled(); });
  expect(mocks.render).toHaveBeenCalledWith(expect.objectContaining({ clock: { text: '3:01 PM', fontSize: 30 } }));
});
