import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { createOrbInteraction } from '@stay-focused/shared';
const mocks = vi.hoisted(() => ({ get: vi.fn(async () => 'data:image/png;base64,local') }));
vi.mock('../features/queue-orb-still', () => ({ queueOrbStills: { get: mocks.get } }));
const { QueueOrb } = await import('./queue-orb');
let tree: ReactTestRenderer | undefined;
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.clearAllMocks(); vi.unstubAllGlobals(); });
async function render(live = true) {
  const interaction = { state: { current: createOrbInteraction() }, wake: { current: null as (() => void) | null } };
  const node = { style: { backgroundImage: '', setProperty: vi.fn() }, dataset: {} as Record<string, string>,
    classList: { add: vi.fn(), remove: vi.fn() }, offsetWidth: 26 };
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible', hasFocus: () => true, documentElement: { dataset: { theme: 'dark' } } });
  const win = Object.assign(new EventTarget(), { devicePixelRatio: 3 });
  vi.stubGlobal('document', doc); vi.stubGlobal('window', win);
  vi.stubGlobal('MutationObserver', class { observe() {} disconnect() {} });
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  await act(async () => { tree = create(createElement(QueueOrb, { interaction, live }), { createNodeMock: () => node }); });
  return { interaction, node, doc, win };
}
it('requests one palette/theme/physical-size still and discards hidden wakeups until focus returns', async () => {
  const { interaction, node, win } = await render();
  expect(mocks.get).toHaveBeenCalledWith({ color: '#E6EAF1', mode: 'dark', pixels: 78 });
  expect(node.style.backgroundImage).toContain('data:image/png');
  win.dispatchEvent(new Event('blur')); mocks.get.mockClear(); interaction.state.current = createOrbInteraction(1);
  await act(async () => interaction.wake.current?.()); expect(mocks.get).not.toHaveBeenCalled();
  await act(async () => { win.dispatchEvent(new Event('focus')); });
  expect(mocks.get).toHaveBeenCalledWith({ color: '#F4C542', mode: 'dark', pixels: 78 });
});
it('retains same-scene fallback on GL failure and switches palette/theme', async () => {
  mocks.get.mockRejectedValueOnce(new Error('no GL'));
  const { interaction, node, doc } = await render();
  expect(node.style.backgroundImage).toContain('ql1-v1-e6eaf1-dark.png');
  doc.documentElement.dataset.theme = 'light'; interaction.state.current = createOrbInteraction(2);
  mocks.get.mockRejectedValueOnce(new Error('no GL'));
  await act(async () => interaction.wake.current?.());
  expect(node.style.backgroundImage).toContain('ql1-v1-91d5b1-light.png');
});
it('does no rendering on hidden mount, releases subscriptions and ignores stale completions', async () => {
  const hidden = await render(false); expect(mocks.get).not.toHaveBeenCalled();
  await act(async () => tree!.unmount()); tree = undefined; expect(hidden.interaction.wake.current).toBeNull();
  let finish!: (image: string) => void;
  mocks.get.mockImplementationOnce(() => new Promise<string>(r => { finish = r; }));
  const shown = await render(); const fallback = shown.node.style.backgroundImage;
  await act(async () => tree!.unmount()); tree = undefined;
  await act(async () => finish('late')); expect(shown.node.style.backgroundImage).toBe(fallback);
});
