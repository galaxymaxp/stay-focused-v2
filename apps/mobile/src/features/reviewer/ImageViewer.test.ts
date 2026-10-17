import { createElement, type ComponentProps } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Animated, Modal, ScrollView, Text } from 'react-native';
import { ImageViewer } from './ImageViewer';

const mocks = vi.hoisted(() => ({ reduced: true, spring: vi.fn(() => ({ start: vi.fn() })) }));
vi.mock('react-native', () => ({
  View: 'View', Text: 'Text', Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView',
  Animated: { View: 'AnimatedView', Value: class { setValue() {} stopAnimation() {} }, spring: mocks.spring },
}));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
vi.mock('../../design/theme', async () => {
  const { palettes } = await import('../../design/themeTokens');
  return { useTheme: () => ({ colors: palettes.light, reducedMotion: mocks.reduced }), motion: { sheet: {} } };
});
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let tree: ReactTestRenderer | undefined;
const close = vi.fn();
let setZoom: (scale: number) => void;
async function mount() {
  const props: ComponentProps<typeof ImageViewer> = { visible: true, title: 'Image', onClose: close,
    children: onZoomChange => { setZoom = onZoomChange; return createElement(Text, {}, 'Long caption and actions'); },
  };
  await act(async () => { tree = create(createElement(ImageViewer, props)); });
}
const touch = (x: number, y: number, timestamp: number, count = 1) => ({ nativeEvent: {
  pageX: x, pageY: y, timestamp, touches: Array.from({ length: count }, () => ({ pageX: x, pageY: y })),
} });
async function drag(dy: number, duration = 300) {
  const panel = tree!.root.findByType(Animated.View);
  await act(async () => panel.props.onTouchStart(touch(10, 10, 0)));
  await act(async () => panel.props.onTouchMove(touch(10, 10 + dy, duration)));
  await act(async () => panel.props.onTouchEnd(touch(10, 10 + dy, duration, 0)));
}
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; mocks.reduced = true; vi.clearAllMocks(); });

describe('isolated scrollable image viewer', () => {
  it('scrolls image/details/actions together and closes through Android back with no Reduce Motion slide', async () => {
    await mount();
    expect(tree!.root.findByType(ScrollView).findByType(Text).props.children).toBe('Long caption and actions');
    expect(tree!.root.findByType(ScrollView).props.scrollEnabled).toBe(true);
    const modal = tree!.root.findByType(Modal);
    expect(modal.props.animationType).toBe('none');
    await act(async () => modal.props.onRequestClose()); expect(close).toHaveBeenCalledOnce();
    await drag(140); expect(close).toHaveBeenCalledTimes(2); expect(mocks.spring).not.toHaveBeenCalled();
    expect(tree!.root.findByType(Animated.View).props.style.transform).toEqual([{ translateY: 0 }]);
  });
  it('dismisses deliberate downward distance or a fast flick; settles a short drag', async () => {
    mocks.reduced = false; await mount();
    expect(tree!.root.findByType(Modal).props.animationType).toBe('fade');
    await drag(40, 300); expect(close).not.toHaveBeenCalled(); expect(mocks.spring).toHaveBeenCalled();
    await drag(40, 30); expect(close).toHaveBeenCalledOnce();
    await drag(120); expect(close).toHaveBeenCalledTimes(2);
  });
  it('never dismisses a zoomed pan, and restores scrolling after zoom resets', async () => {
    await mount(); await act(async () => setZoom(2));
    expect(tree!.root.findByType(ScrollView).props.scrollEnabled).toBe(false);
    await drag(160); expect(close).not.toHaveBeenCalled();
    await act(async () => setZoom(1)); await drag(160); expect(close).toHaveBeenCalledOnce();
  });
  it('does not dismiss a gesture beginning below the top even if scrolling reaches the top', async () => {
    await mount(); const panel = tree!.root.findByType(Animated.View), scroll = tree!.root.findByType(ScrollView);
    await act(async () => scroll.props.onScroll({ nativeEvent: { contentOffset: { y: 80 } } }));
    await act(async () => panel.props.onTouchStart(touch(10, 10, 0)));
    await act(async () => scroll.props.onScroll({ nativeEvent: { contentOffset: { y: 0 } } }));
    await act(async () => panel.props.onTouchMove(touch(10, 180, 200)));
    await act(async () => panel.props.onTouchEnd(touch(10, 180, 200, 0)));
    expect(close).not.toHaveBeenCalled();
    await drag(160); expect(close).toHaveBeenCalledOnce();
  });
  it.each(['pinch', 'horizontal', 'upward', 'cancel'] as const)('does not reuse a %s gesture for dismissal', async kind => {
    await mount(); const panel = tree!.root.findByType(Animated.View);
    await act(async () => panel.props.onTouchStart(touch(10, 100, 0)));
    await act(async () => {
      if (kind === 'cancel') panel.props.onTouchCancel();
      else panel.props.onTouchMove(touch(kind === 'horizontal' ? 80 : 10, kind === 'upward' ? 50 : 110, 30, kind === 'pinch' ? 2 : 1));
    });
    await act(async () => panel.props.onTouchMove(touch(10, 300, 200)));
    await act(async () => panel.props.onTouchEnd(touch(10, 300, 200, 0)));
    expect(close).not.toHaveBeenCalled();
  });
  it('expires flick velocity if the finger pauses before release', async () => {
    await mount(); const panel = tree!.root.findByType(Animated.View);
    await act(async () => panel.props.onTouchStart(touch(10, 10, 0)));
    await act(async () => panel.props.onTouchMove(touch(10, 50, 30)));
    await act(async () => panel.props.onTouchEnd(touch(10, 50, 500, 0)));
    expect(close).not.toHaveBeenCalled();
  });
});
