import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createOrbInteraction, pushOrbSpin, ringOrbRadians } from '@stay-focused/shared';
import type { OrbInteractionHandle } from '../generation-core/orbInteraction';
import { DayRingClock } from './DayRingClock';
import { ringPoint } from './dayClock';
let handle: OrbInteractionHandle, tree: ReactTestRenderer | undefined;
vi.mock('@stay-focused/shared', async original => {
  const shared = await original<typeof import('@stay-focused/shared')>();
  return { ...shared, pushOrbSpin: vi.fn(shared.pushOrbSpin) };
});
vi.mock('../generation-core/orbInteraction', () => ({ useOrbInteraction: () => handle, OrbTouchLayer: () => null }));

vi.mock('./DayOrb', () => ({ DAY_ORB_FILL: 0.64, DayOrb: 'DayOrb' }));
vi.mock('./ClockOptions', () => ({ ClockOptions: () => null }));
vi.mock('./clockFonts', () => ({ useClockFonts: () => true }));
vi.mock('expo-router/react-navigation', () => ({ useIsFocused: () => true }));
vi.mock('../../design/haptics', () => ({ haptic: { press() {}, select() {}, tap() {} } }));
vi.mock('../../design/primitives', () => ({ Copy: 'Copy' }));
vi.mock('../../design/theme', async () => { const { palettes } = await import('../../design/themeTokens'); return { motion: { spring: {} }, useTheme: () => ({ colors: palettes.dark, active: true, mode: 'dark', reducedMotion: false }) }; });
vi.mock('react-native-svg', () => ({ default: 'Svg', Circle: 'Circle', Line: 'Line', Path: 'Path', Text: 'Text' }));
vi.mock('react-native', () => ({ View: 'View', Text: 'Text', useWindowDimensions: () => ({ width: 380 }),
  PanResponder: { create: (config: unknown) => ({ panHandlers: config }) },
  Animated: { Value: class { setValue() {} }, View: 'AnimatedView', spring: () => ({ start() {} }) } }));
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => setTimeout(() => fn(Date.now()), 16));
  handle = { state: { current: createOrbInteraction() }, wake: { current: vi.fn() }, ringDragging: { current: false } };
});
it('centers an accessible Inter time without a weekday, retaining plain text until GL succeeds and after failure', async () => {
  vi.setSystemTime(new Date(2026, 9, 19, 15, 30));
  await act(async () => { tree = create(createElement(DayRingClock, { date: '2026-10-19', timeline: [], start: 0, end: 720, onChange: vi.fn(), onCommit: vi.fn() })); });
  const time = () => tree!.root.findByProps({ testID: 'clock-time' });
  expect(time().props.accessibilityLabel).toBe('3:30 PM');
  expect(time().props.style).toMatchObject({ fontFamily: 'InterClock700', opacity: 1 });
  expect(JSON.stringify(tree!.toJSON())).not.toContain('Monday');
  const orb = tree!.root.find(node => typeof node.props.onGlassReady === 'function');
  expect(orb.props.clock).toEqual({ text: '3:30 PM', fontSize: 32 });
  await act(async () => orb.props.onGlassReady(true));
  expect(time().props.style.opacity).toBe(0);
  expect(time().props.accessible).toBe(true);
  expect(time().children).toEqual(['3:30 PM']);
  await act(async () => orb.props.onGlassReady(false));
  expect(time().props.style.opacity).toBe(1);
});
it.each([[0, 'Free from'], [720, 'Free until'], [360, 'Free time']] as const)('shows Inter label, dragged time and sub at %i', async (minute, label) => {
  await act(async () => { tree = create(createElement(DayRingClock, { date: '2026-10-19', timeline: [], start: 0, end: 720, onChange: vi.fn(), onCommit: vi.fn() })); });
  const target = tree!.root.findByProps({ testID: 'day-ring-touch' }).props;
  const point = ringPoint(minute);
  await act(async () => { target.onPanResponderGrant({ nativeEvent: { locationX: point.x, locationY: point.y } }); vi.advanceTimersByTime(250); });
  const copies = tree!.root.findAll(node => String(node.type) === 'Copy');
  expect(copies.map(node => node.children.join('')).join(' ')).toContain(label);
  expect(copies[0]!.props.style.fontFamily).toBe('InterClock600');
  expect(copies.at(-1)!.props.style.fontFamily).toBe('InterClock500');
  expect(tree!.root.findByProps({ testID: 'clock-time' }).props.accessibilityLabel).toBe(minute === 720 ? '12:00 PM' : '12:00 AM');
  expect(copies.at(-1)!.children.join('')).toContain('12 h');
});
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.useRealTimers(); vi.unstubAllGlobals(); });
it.each([0, 720, 360])('feeds only physical ring movement at %s, never the release snap', async minute => {
  const commit = vi.fn();
  await act(async () => { tree = create(createElement(DayRingClock, { date: '2026-10-19', timeline: [], start: 0, end: 720, onChange: vi.fn(), onCommit: commit })); });
  const target = tree!.root.findByProps({ testID: 'day-ring-touch' }).props;
  const point = ringPoint(minute), next = ringPoint(minute + 127);
  const event = { nativeEvent: { locationX: point.x, locationY: point.y } };
  expect(target.onStartShouldSetPanResponder(event)).toBe(true);
  await act(async () => { target.onPanResponderGrant(event); vi.advanceTimersByTime(250); });
  expect(handle.ringDragging!.current).toBe(true);
  await act(async () => target.onPanResponderMove(event, { dx: next.x - point.x, dy: next.y - point.y }));
  expect(pushOrbSpin).toHaveBeenCalledOnce(); expect(vi.mocked(pushOrbSpin).mock.calls[0]![1]).toBeCloseTo(ringOrbRadians(127));
  expect(handle.state.current.spin.velocityY).toBeGreaterThan(0);
  await act(async () => { target.onPanResponderRelease(); vi.advanceTimersByTime(250); });
  expect(handle.ringDragging!.current).toBe(false); expect(pushOrbSpin).toHaveBeenCalledOnce(); expect(commit).toHaveBeenCalledOnce();
  await act(async () => { target.onPanResponderGrant(event); vi.advanceTimersByTime(250); target.onPanResponderTerminate(); });
  expect(handle.state.current.spin.velocityY).toBe(0);
});
