import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createOrbInteraction } from '@stay-focused/shared';
import { PlanButtonFallback as PlanButton } from './PlanButtonFallback';
vi.mock('../generation-core/orbInteraction', () => ({ useOrbInteraction: () => ({ state: { current: createOrbInteraction() }, wake: { current: null } }) }));
const mocks = vi.hoisted(() => ({ reduced: false, active: true, focused: true, timing: vi.fn(), loop: vi.fn(), stop: vi.fn(), start: vi.fn() }));
vi.mock('expo-router/react-navigation', () => ({ useIsFocused: () => mocks.focused }));
vi.mock('./clockFonts', () => ({ useClockFonts: () => true }));
vi.mock('../../design/theme', () => ({ useTheme: () => ({ colors: { textPrimary: '#111', accent: '#random' }, active: mocks.active, reducedMotion: mocks.reduced }) }));
vi.mock('react-native-svg', () => ({ default: 'Svg', Path: 'Path' }));
vi.mock('react-native', () => ({ View: 'View', Text: 'Text', Pressable: 'Pressable', Easing: { linear: 'linear' }, Animated: {
  View: 'AnimatedView', Value: class { setValue() {} interpolate() { return 'interpolated'; } },
  timing: (_value: unknown, options: unknown) => { mocks.timing(options); return { start: mocks.start, stop: mocks.stop }; },
  loop: () => { mocks.loop(); return { start: mocks.start, stop: mocks.stop }; },
  sequence: () => ({ start: mocks.start, stop: mocks.stop }),
} }));
let tree: ReactTestRenderer | undefined;
const press = () => tree!.root.findByType('Pressable' as never);
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.clearAllMocks(); mocks.reduced = false; mocks.active = true; mocks.focused = true; });
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; vi.unstubAllGlobals(); });
it('keeps a 52px palette-coloured flat shell and never changes colour on press', async () => {
  const open = vi.fn(); await act(async () => { tree = create(createElement(PlanButton, { onPress: open })); });
  const shell = press().props.style; expect(shell).toMatchObject({ height: 52, width: '100%', borderColor: '#e6eaf1' });
  expect(press().props.accessibilityLabel).toBe('Plan your free time'); expect(mocks.loop).not.toHaveBeenCalled();
  mocks.timing.mockClear(); await act(async () => press().props.onPress()); expect(open).toHaveBeenCalledOnce();
  expect(mocks.timing.mock.calls.map(([options]) => options.duration)).toEqual([70, 110]);
  expect(press().props.style).toEqual(shell);
});
it('Reduce Motion is static and uses only a brief 0.85 opacity dip', async () => {
  mocks.reduced = true; await act(async () => { tree = create(createElement(PlanButton, { onPress() {} })); });
  expect(mocks.loop).not.toHaveBeenCalled(); await act(async () => press().props.onPress());
  expect(mocks.timing.mock.calls.map(([options]) => options.toValue)).toEqual([0.85, 1]);
});
it.each(['active', 'focused'] as const)('keeps the flat fallback static when %s becomes false', async field => {
  await act(async () => { tree = create(createElement(PlanButton, { onPress() {} })); });
  expect(mocks.loop).not.toHaveBeenCalled(); mocks[field] = false;
  await act(async () => tree!.update(createElement(PlanButton, { onPress() {} })));
  expect(mocks.loop).not.toHaveBeenCalled();
});
