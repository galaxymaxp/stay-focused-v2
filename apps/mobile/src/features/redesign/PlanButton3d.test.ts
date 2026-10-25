import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createOrbInteraction } from '@stay-focused/shared';
import { PlanButton } from './PlanButton';

vi.mock('../generation-core/orbInteraction', () => ({ useOrbInteraction: () => ({ state: { current: createOrbInteraction() }, wake: { current: null } }) }));
const mocks = vi.hoisted(() => ({ reduced: false, active: true, focused: true, appState: null as ((state: string) => void) | null,
  timing: vi.fn(), stop: vi.fn(), press: vi.fn() }));
vi.mock('expo-router/react-navigation', () => ({ useIsFocused: () => mocks.focused }));
vi.mock('../../design/theme', () => ({ useTheme: () => ({ mode: 'dark', active: mocks.active, reducedMotion: mocks.reduced }) }));
vi.mock('./PlanGlassView', () => ({ PlanGlassView: 'PlanGL' }));
vi.mock('./PlanButtonFallback', () => ({ PlanButtonFallback: 'Fallback' }));
vi.mock('react-native', () => ({ Pressable: 'Pressable',
  AppState: { currentState: 'active', addEventListener: (_event: string, listener: (state: string) => void) => { mocks.appState = listener; return { remove() {} }; } },
  Animated: { View: 'AnimatedView', Value: class { setValue() {} },
    timing: (_value: unknown, options: unknown) => { mocks.timing(options); return { start() {}, stop: mocks.stop }; },
    sequence: () => ({ start() {}, stop: mocks.stop }) },
}));
let tree: ReactTestRenderer | undefined;
const pressable = () => tree!.root.findByType('Pressable' as never);
const gl = () => tree!.root.findByType('PlanGL' as never);
beforeEach(() => {
  vi.useFakeTimers(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.clearAllMocks();
  mocks.reduced = false; mocks.active = true; mocks.focused = true;
});
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; vi.useRealTimers(); vi.unstubAllGlobals(); });
async function mount(open = vi.fn()) {
  await act(async () => { tree = create(createElement(PlanButton, { onPress: open })); });
  await act(async () => pressable().props.onLayout({ nativeEvent: { layout: { width: 358 } } }));
  return open;
}
it('keeps a 52px accessible action, displays GL only after a complete frame and directs the wave toward the press', async () => {
  const open = await mount(); const shell = pressable().props.style;
  expect(shell).toMatchObject({ height: 52, width: '100%', borderRadius: 12 });
  expect(pressable().props.accessibilityLabel).toBe('Plan your free time');
  expect(gl().props.interaction.state.current.colorIndex).toBe(0); expect(gl().parent!.props.style.opacity).toBe(0);
  gl().props.handle.current = { press: mocks.press };
  await act(async () => gl().props.onReady()); expect(gl().parent!.props.style.opacity).toBe(1);
  await act(async () => pressable().props.onPress({ nativeEvent: { locationX: 0 } }));
  expect(mocks.press).toHaveBeenCalledWith(-1, 0); expect(open).toHaveBeenCalledOnce();
  expect(pressable().props.style).toEqual(shell); expect(mocks.timing).not.toHaveBeenCalled();
});
it('passes Reduce Motion into GL and gives the press only a 0.85 opacity dip', async () => {
  mocks.reduced = true; await mount(); expect(gl().props.reducedMotion).toBe(true);
  await act(async () => pressable().props.onPress({ nativeEvent: { locationX: 180 } }));
  expect(mocks.timing.mock.calls.map(([options]) => options.toValue)).toEqual([0.85, 1]);
});
it.each(['active', 'focused', 'background'] as const)('pauses live GL on %s and resumes without replacing the action', async field => {
  await mount(); expect(gl().props.live).toBe(true);
  await act(async () => {
    if (field === 'background') mocks.appState?.('background'); else mocks[field] = false;
    tree!.update(createElement(PlanButton, { onPress() {} }));
  });
  expect(gl().props.live).toBe(false);
});
it.each(['failure', 'timeout'] as const)('retains the TP2 action on %s and rejects late readiness', async kind => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  await mount(); const late = gl().props.onReady;
  await act(async () => { if (kind === 'failure') gl().props.onFailure(); else vi.advanceTimersByTime(12_000); });
  expect(tree!.root.findByType('Fallback' as never)).toBeTruthy();
  await act(async () => late()); expect(tree!.root.findAllByType('PlanGL' as never)).toHaveLength(0);
});
