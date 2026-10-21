import { afterEach, expect, it, vi } from 'vitest';
import { createOrbLoadGate, ORB_LOAD_TIMEOUT_MS } from './orb-load';
afterEach(() => vi.useRealTimers());
it('keeps the poster on timeout, logs once and rejects late frames', () => {
  vi.useFakeTimers(); const publish = vi.fn(), log = vi.fn();
  const gate = createOrbLoadGate(publish, log);
  vi.advanceTimersByTime(ORB_LOAD_TIMEOUT_MS - 1); expect(publish).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1); gate.ready(); gate.fail();
  expect(publish.mock.calls).toEqual([['failed']]); expect(log).toHaveBeenCalledOnce();
  gate.dispose(); expect(vi.getTimerCount()).toBe(0);
});
it('clears the deadline on a complete frame and still handles later context loss', () => {
  vi.useFakeTimers(); const publish = vi.fn(), log = vi.fn();
  const gate = createOrbLoadGate(publish, log); gate.ready(); gate.ready();
  vi.advanceTimersByTime(ORB_LOAD_TIMEOUT_MS * 2);
  expect(publish.mock.calls).toEqual([['ready']]); expect(log).not.toHaveBeenCalled();
  gate.fail(); gate.ready(); gate.fail(); expect(publish.mock.calls).toEqual([['ready'], ['failed']]);
  expect(log).toHaveBeenCalledOnce();
});
it('disposal cancels the timer and ignores asynchronous atlas/frame callbacks', () => {
  vi.useFakeTimers(); const publish = vi.fn(), log = vi.fn();
  const gate = createOrbLoadGate(publish, log); gate.dispose(); gate.ready(); gate.fail();
  vi.advanceTimersByTime(ORB_LOAD_TIMEOUT_MS * 2);
  expect(publish).not.toHaveBeenCalled(); expect(log).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
});
it('does not time out a hidden scene while its existing rendering loop is paused', () => {
  vi.useFakeTimers(); const publish = vi.fn(), log = vi.fn();
  const gate = createOrbLoadGate(publish, log); gate.setActive(false);
  vi.advanceTimersByTime(ORB_LOAD_TIMEOUT_MS * 2); expect(publish).not.toHaveBeenCalled();
  gate.setActive(true); vi.advanceTimersByTime(ORB_LOAD_TIMEOUT_MS);
  expect(publish).toHaveBeenCalledWith('failed'); gate.dispose();
});
