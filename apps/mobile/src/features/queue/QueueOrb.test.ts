import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { createOrbInteraction } from '@stay-focused/shared';
const mocks = vi.hoisted(() => ({ get: vi.fn(async () => 'file:///orb.png'), timing: vi.fn(() => ({ start() {} })) }));
vi.mock('./queueOrbStill', () => ({ queueOrbStills: { get: mocks.get } }));
vi.mock('./queueOrbAssets', () => ({ queueOrbAsset: (color: string, mode: string) => ({ uri: `${color}-${mode}` }) }));
vi.mock('react-native', () => ({ View: 'View', Image: 'Image', PixelRatio: { get: () => 3 },
  Animated: { Image: 'AnimatedImage', timing: mocks.timing, Value: class { stopAnimation() {} setValue() {} } } }));
const { QueueOrb } = await import('./QueueOrb');
let tree: ReactTestRenderer | undefined;
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.clearAllMocks(); });
const interaction = () => ({ state: { current: createOrbInteraction() }, wake: { current: null as (() => void) | null } });
async function render(live = true, reducedMotion = false) {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const handle = interaction();
  const props = { interaction: handle, size: 26, mode: 'dark' as const, live, reducedMotion };
  await act(async () => { tree = create(createElement(QueueOrb, props)); });
  return { handle, props };
}
it('uses one physical-size cached image, no GLView or spill, and ignores hidden palette changes', async () => {
  const { handle, props } = await render();
  expect(mocks.get).toHaveBeenCalledWith({ color: '#E6EAF1', mode: 'dark', pixels: 78 });
  expect(tree!.root.findByType('Image' as never).props.source).toEqual({ uri: 'file:///orb.png' });
  await act(async () => tree!.update(createElement(QueueOrb, { ...props, live: false })));
  mocks.get.mockClear(); handle.state.current = createOrbInteraction(1);
  await act(async () => handle.wake.current?.());
  expect(mocks.get).not.toHaveBeenCalled();
  await act(async () => tree!.update(createElement(QueueOrb, props)));
  expect(mocks.get).toHaveBeenCalledWith({ color: '#F4C542', mode: 'dark', pixels: 78 });
});
it('keeps the same-scene palette fallback on GL failure and changes theme', async () => {
  mocks.get.mockRejectedValueOnce(new Error('no GL'));
  const { props } = await render();
  expect(tree!.root.findByType('Image' as never).props.source).toEqual({ uri: '#E6EAF1-dark' });
  mocks.get.mockRejectedValueOnce(new Error('no GL'));
  await act(async () => tree!.update(createElement(QueueOrb, { ...props, mode: 'light' })));
  expect(tree!.root.findByType('Image' as never).props.source).toEqual({ uri: '#E6EAF1-light' });
});
it('fades palette stills for 600ms; Reduce Motion never starts a fade', async () => {
  const { handle } = await render(); handle.state.current = createOrbInteraction(2);
  await act(async () => handle.wake.current?.());
  expect(mocks.timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ duration: 600, useNativeDriver: true }));
  await act(async () => tree!.unmount()); tree = undefined; mocks.timing.mockClear();
  const reduced = await render(true, true); reduced.handle.state.current = createOrbInteraction(1);
  await act(async () => reduced.handle.wake.current?.()); expect(mocks.timing).not.toHaveBeenCalled();
});
it('does not draw on hidden mount or publish a late snapshot after unmount', async () => {
  const hidden = await render(false); expect(mocks.get).not.toHaveBeenCalled();
  await act(async () => tree!.unmount()); tree = undefined; expect(hidden.handle.wake.current).toBeNull();
  let finish!: (uri: string) => void;
  mocks.get.mockImplementationOnce(() => new Promise<string>(resolve => { finish = resolve; }));
  const mounted = await render(); await act(async () => tree!.unmount()); tree = undefined;
  await act(async () => finish('late')); expect(mounted.handle.wake.current).toBeNull();
});
