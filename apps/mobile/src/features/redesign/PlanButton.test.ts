import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PlanButton } from './PlanButton';
vi.mock('../../components/GlassPill', () => ({ GlassPill: 'GlassPill' }));
let tree: ReactTestRenderer | undefined;
beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; vi.unstubAllGlobals(); });
it('keeps Plan accessible, forwards the exact count and opens the existing sheet action', async () => {
  const open = vi.fn(); await act(async () => { tree = create(createElement(PlanButton, { onPress: open, blocks: 3 })); });
  const pill = () => tree!.root.findByType('GlassPill' as never);
  expect(pill().props).toMatchObject({ size: 'lg', label: 'Plan', sub: '3 blocks ready', accessibilityLabel: 'Plan your free time' });
  await act(async () => pill().props.onPress()); expect(open).toHaveBeenCalledOnce();
  await act(async () => tree!.update(createElement(PlanButton, { onPress: open, blocks: 0, adjusting: true })));
  expect(pill().props.sub).toBe('Updating…'); expect(pill().props.label).toBe('Plan');
  await act(async () => tree!.update(createElement(PlanButton, { onPress: open, blocks: 2, disabled: true })));
  expect(pill().props).toMatchObject({ sub: '2 blocks ready', disabled: true });
});
