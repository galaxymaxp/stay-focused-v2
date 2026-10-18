import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SnapshotStatus } from './snapshot-status';
let tree: ReactTestRenderer | undefined;
const refresh = vi.fn(), applyUpdate = vi.fn();
const props = { savedAt: '2026-10-18T00:00:00Z', error: null, refresh, applyUpdate };
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.clearAllMocks(); });
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; });
it('opts out of idle freshness without changing default status rows', async () => {
  await act(async () => { tree = create(createElement(SnapshotStatus, { ...props, hideFreshLabel: true })); }); expect(tree!.toJSON()).toBeNull();
  await act(async () => tree!.update(createElement(SnapshotStatus, props))); expect(tree!.root.findByType('button').props.children).toMatch(/^Updated /);
});
it.each([
  [{ refreshing: true }, 'Syncing…', refresh],
  [{ error: 'offline' }, "Couldn't refresh · Retry", refresh],
  [{ updateAvailable: true }, 'Updated — tap to refresh', applyUpdate],
] as const)('keeps reviewer action %j', async (status, label, action) => {
  await act(async () => { tree = create(createElement(SnapshotStatus, { ...props, ...status, hideFreshLabel: true })); });
  const button = tree!.root.findByType('button'); expect(button.props.children).toContain(label);
  await act(async () => button.props.onClick()); expect(action).toHaveBeenCalledOnce();
});
