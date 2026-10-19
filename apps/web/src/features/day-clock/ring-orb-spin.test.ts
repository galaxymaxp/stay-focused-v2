import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createOrbInteraction, pushOrbSpin, ringOrbRadians } from '@stay-focused/shared';
import type { OrbInteractionHandle } from '../knowledge-core/orbInteraction';
import { DayRingClock } from './DayRingClock';
import { CLOCK, ringPoint } from './dayClock';
let handle: OrbInteractionHandle, tree: ReactTestRenderer | undefined;
vi.mock('@stay-focused/shared', async original => {
  const shared = await original<typeof import('@stay-focused/shared')>();
  return { ...shared, pushOrbSpin: vi.fn(shared.pushOrbSpin) };
});
vi.mock('../knowledge-core/orbInteraction', () => ({ useOrbInteraction: () => handle, OrbPointerLayer: () => null }));

vi.mock('./DeferredDayOrb', () => ({ DeferredDayOrb: () => null }));
vi.mock('./clock-options', () => ({ ClockOptions: () => null }));
vi.mock('../../lib/motion', () => ({ useSpringNumber: () => 1 }));
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => setTimeout(() => fn(performance.now()), 16));
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  handle = { state: { current: createOrbInteraction() }, wake: { current: vi.fn() }, ringDragging: { current: false } };
});
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.useRealTimers(); vi.unstubAllGlobals(); });
it.each([0, 720, 360])('feeds only physical ring movement at %s, never the release snap', async minute => {
  const commit = vi.fn();
  await act(async () => { tree = create(createElement(DayRingClock, { date: '2026-10-19', timeline: [], start: 0, end: 720, onCommit: commit }), {
    createNodeMock: () => ({ clientWidth: CLOCK.size, getBoundingClientRect: () => ({ left: 0, top: 0, width: CLOCK.size, height: CLOCK.size }) }),
  }); });
  const target = tree!.root.findByProps({ className: 'day-clock-touch' }).props;
  const point = ringPoint(minute), next = ringPoint(minute + 127);
  const event = (p: { x: number; y: number }) => ({ button: 0, pointerType: 'mouse', pointerId: 1, clientX: p.x, clientY: p.y, currentTarget: { setPointerCapture() {} } });
  await act(async () => target.onPointerDown(event(point)));
  expect(handle.ringDragging!.current).toBe(true);
  await act(async () => { vi.advanceTimersByTime(100); target.onPointerMove(event(next)); });
  expect(pushOrbSpin).toHaveBeenCalledOnce(); expect(vi.mocked(pushOrbSpin).mock.calls[0]![1]).toBeCloseTo(ringOrbRadians(127));
  expect(handle.state.current.spin.velocityY).toBeGreaterThan(0);
  await act(async () => { target.onPointerUp(); vi.advanceTimersByTime(250); });
  expect(handle.ringDragging!.current).toBe(false); expect(pushOrbSpin).toHaveBeenCalledOnce(); expect(commit).toHaveBeenCalledOnce();
  await act(async () => { target.onPointerDown(event(point)); target.onPointerCancel(); });
  expect(handle.state.current.spin.velocityY).toBe(0);
});
