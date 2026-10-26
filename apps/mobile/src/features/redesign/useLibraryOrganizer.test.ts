import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { useLibraryOrganizer } from './useLibraryOrganizer';
const mocks = vi.hoisted(() => ({ handlers: {} as import('react-native').PanResponderCallbacks }));
vi.mock('../../design/haptics', () => ({ haptic: { select: vi.fn(), success: vi.fn() } }));
vi.mock('react-native', () => ({
  Animated: { Value: class { setValue() {} } }, View: 'View', ScrollView: 'ScrollView',
  BackHandler: { addEventListener: () => ({ remove() {} }) },
  PanResponder: { create: (panHandlers: import('react-native').PanResponderCallbacks) => { mocks.handlers = panHandlers; return { panHandlers }; } },
}));
let tree: ReactTestRenderer | undefined;
let current: ReturnType<typeof useLibraryOrganizer>;
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; vi.unstubAllGlobals(); });
it('single timeline drag commits only on drop, cancels without writes and leaves ordinary taps working', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const save = vi.fn(), open = vi.fn();
  function Probe() { current = useLibraryOrganizer('timeline', ['one', 'two'], ['one', 'two'], save, true); return null; }
  await act(async () => { tree = create(createElement(Probe)); });
  current.layouts.current.set('one', { x: 0, y: 0, width: 300, height: 80 });
  current.layouts.current.set('two', { x: 0, y: 88, width: 300, height: 80 });
  const touch = (pageY: number) => ({ nativeEvent: { pageY } }) as Parameters<typeof current.touchStart>[0];
  await act(async () => { current.touchStart(touch(40)); current.hold('one'); });
  expect(current.dragging).toBe('one'); expect(save).not.toHaveBeenCalled();
  await act(async () => mocks.handlers.onPanResponderMove!(touch(160), {} as never));
  await act(async () => current.touchCancel()); expect(save).not.toHaveBeenCalled();
  expect(current.editing).toBe(false);
  await act(async () => { current.touchStart(touch(40)); current.tap('one', open); }); expect(open).toHaveBeenCalledTimes(1);
  await act(async () => { current.touchStart(touch(40)); current.hold('one'); });
  await act(async () => mocks.handlers.onPanResponderMove!(touch(160), {} as never));
  expect(save).not.toHaveBeenCalled(); await act(async () => current.touchEnd());
  expect(save).toHaveBeenCalledExactlyOnceWith(['two', 'one']); expect(current.dragging).toBe(null); expect(current.editing).toBe(false);
  await act(async () => { current.touchStart(touch(40)); current.tap('one', open); }); expect(open).toHaveBeenCalledTimes(2);
});
