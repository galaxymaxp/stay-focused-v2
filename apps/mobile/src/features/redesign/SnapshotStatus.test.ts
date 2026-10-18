import { createElement, type ComponentProps } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SnapshotStatus } from './SnapshotStatus';
vi.mock('react-native', () => ({ Pressable: 'Pressable' }));
vi.mock('../../design/primitives', () => ({ Copy: 'Copy' }));
let tree: ReactTestRenderer | undefined;
const refresh = vi.fn(), applyUpdate = vi.fn();
const props: ComponentProps<typeof SnapshotStatus> = { savedAt: '2026-10-18T00:00:00Z', refreshing: false, error: null, refresh, applyUpdate };
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.clearAllMocks(); });
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; });
it('hides only the idle reviewer label and retains default labels for other screens', async () => {
  await act(async () => { tree = create(createElement(SnapshotStatus, { ...props, hideFreshLabel: true })); });
  expect(tree!.toJSON()).toBeNull();
  await act(async () => tree!.update(createElement(SnapshotStatus, props)));
  expect(tree!.root.findByType('Pressable' as never).props.accessibilityLabel).toMatch(/^Updated /);
});
it.each([
  [{ refreshing: true }, 'Syncing…', refresh],
  [{ error: 'offline' }, "Couldn't refresh · Retry", refresh],
  [{ updateAvailable: true }, 'Updated — tap to refresh', applyUpdate],
] as const)('keeps visible actionable state %j', async (status, label, action) => {
  await act(async () => { tree = create(createElement(SnapshotStatus, { ...props, ...status, hideFreshLabel: true })); });
  const button = tree!.root.findByType('Pressable' as never);
  expect(button.props.accessibilityLabel).toContain(label);
  await act(async () => button.props.onPress()); expect(action).toHaveBeenCalledOnce();
});
