import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ORB_COLOR_KEY } from '@stay-focused/shared';
import type { GestureResponderEvent, PanResponderInstance } from 'react-native';
import { OrbTouchLayer, readOrbColor, rememberOrbColor, useOrbInteraction, type OrbInteractionHandle } from './orbInteraction';
import { CLOCK, hitTest } from '../redesign/dayClock';
const storage = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn() }));
vi.mock('../../auth/sessionStore', () => ({ sessionStore: storage }));
vi.mock('react-native', () => ({ View: 'View' }));
let tree: ReactTestRenderer | undefined, handle: OrbInteractionHandle;
let delegate: Partial<PanResponderInstance['panHandlers']> | undefined;
function Host() { handle = useOrbInteraction(); return createElement(OrbTouchLayer, { interaction: handle, size: 204, left: 68, top: 68, reducedMotion: false, delegate }); }
const event = (x: number, y: number) => ({ nativeEvent: { locationX: x, locationY: y } }) as GestureResponderEvent;
const target = () => tree!.root.findByProps({ testID: 'orb-touch' });
beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); storage.getItem.mockResolvedValue('0'); storage.setItem.mockResolvedValue(undefined); vi.clearAllMocks(); delegate = undefined; });
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.useRealTimers(); vi.unstubAllGlobals(); });
async function mount() { await act(async () => { tree = create(createElement(Host)); }); }
it('covers only the ball footprint, stays decorative, and persists a short tap', async () => {
  await mount(); const p = target().props;
  expect(p.style).toMatchObject({ left: 68, top: 68, width: 204, height: 204, borderRadius: 102 });
  expect(p.accessible).toBe(false); expect(p.accessibilityElementsHidden).toBe(true);
  expect(p.onStartShouldSetResponder(event(0, 0))).toBe(false);
  expect(p.onStartShouldSetResponder(event(102, 102))).toBe(true);
  await act(async () => { p.onResponderGrant(event(102, 102)); vi.advanceTimersByTime(100); p.onResponderRelease(event(102, 102)); });
  expect(handle.state.current.colorIndex).toBe(1);
  expect(storage.getItem).toHaveBeenCalledWith(ORB_COLOR_KEY);
  expect(storage.setItem).toHaveBeenCalledWith(ORB_COLOR_KEY, '1');
});
it('lets early vertical movement terminate for scrolling and rejects termination after rotation starts', async () => {
  await mount(); const p = target().props;
  p.onResponderGrant(event(102, 102)); vi.advanceTimersByTime(100); p.onResponderMove(event(102, 130));
  expect(p.onResponderTerminationRequest(event(102, 130))).toBe(true);
  p.onResponderTerminate(event(102, 130));
  expect(storage.setItem).not.toHaveBeenCalled();
  p.onResponderGrant(event(102, 102)); vi.advanceTimersByTime(250); p.onResponderMove(event(130, 110));
  expect(p.onResponderTerminationRequest(event(130, 110))).toBe(false);
  expect(handle.state.current.spin.y).toBeGreaterThan(0);
  p.onResponderRelease(event(130, 110)); expect(storage.setItem).not.toHaveBeenCalled();
});
it('gives the existing ring responder immediate priority in the overlapping band', async () => {
  const grant = vi.fn(), move = vi.fn(), release = vi.fn();
  delegate = { onStartShouldSetResponder: e => hitTest(e.nativeEvent.locationX, e.nativeEvent.locationY, 0, 720) !== null,
    onResponderGrant: grant, onResponderMove: move, onResponderRelease: release, onResponderTerminationRequest: () => false };
  await mount(); const p = target().props;
  // Top of the ball overlaps the existing invisible midnight handle band (radius 102 > inner 92).
  const e = event(102, 0);
  expect(CLOCK.touchInner).toBeLessThan(102);
  expect(p.onStartShouldSetResponder(e)).toBe(true);
  p.onResponderGrant(e);
  expect(grant).toHaveBeenCalledWith(expect.objectContaining({ nativeEvent: { locationX: 170, locationY: 68 } }));
  expect(handle.state.current.gesture).toBeNull();
  expect(p.onResponderTerminationRequest(e)).toBe(false);
  p.onResponderMove(e); p.onResponderRelease(e);
  expect(move).toHaveBeenCalledOnce(); expect(release).toHaveBeenCalledOnce();
  expect(storage.setItem).not.toHaveBeenCalled();
});
it('restores the device color and tolerates unavailable storage', async () => {
  storage.getItem.mockResolvedValue('3'); await mount();
  expect(handle.state.current.colorIndex).toBe(3);
  storage.getItem.mockRejectedValue(new Error('blocked')); expect(await readOrbColor()).toBe(3);
  storage.setItem.mockRejectedValue(new Error('blocked')); rememberOrbColor(2); await Promise.resolve();
});
