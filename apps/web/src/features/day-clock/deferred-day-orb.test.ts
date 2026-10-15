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
  frames = new Map(); serial = 0; reduced = false;
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('window', { matchMedia: () => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { frames.set(++serial, fn); return serial; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; vi.unstubAllGlobals(); });
async function frame() { await act(async () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(0)); }); }
it('renders a same-size still before useful content and before requesting the orb module', async () => {
  const props = { minutes: 720, size: 240, ready: false };
  expect(renderToStaticMarkup(createElement(DeferredDayOrb, props))).toContain('width:240px;height:240px');
  await act(async () => { root = create(createElement(DeferredDayOrb, props)); });
  expect(root!.root.findByProps({ 'data-testid': 'day-orb-still' })).toBeTruthy();
  expect(mocks.load).not.toHaveBeenCalled();
  expect(frames.size).toBe(0);
  await act(async () => root!.update(createElement(DeferredDayOrb, { ...props, ready: true })));
  expect(mocks.load).not.toHaveBeenCalled();
  await frame();
  expect(mocks.load).not.toHaveBeenCalled();
  await frame();
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(mocks.load).toHaveBeenCalledOnce();
  expect(mocks.render).toHaveBeenCalledWith({ minutes: 720, size: 240 });
});
it('keeps the static frame without requesting animation for reduced motion', async () => {
  reduced = true;
  await act(async () => { root = create(createElement(DeferredDayOrb, { minutes: 0, size: 240, ready: true })); });
  await frame(); await frame();
  expect(mocks.render).not.toHaveBeenCalled();
  expect(root!.root.findByProps({ 'data-testid': 'day-orb-still' })).toBeTruthy();
});
