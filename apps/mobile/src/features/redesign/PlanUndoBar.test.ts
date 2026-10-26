import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { PlanUndoBar } from './PlanUndoBar';
import { plannerSwipeAction } from '../../design/plannerSwipe';
vi.mock('react-native', () => ({ View: 'View', Pressable: 'Pressable' }));
vi.mock('../../design/primitives', () => ({ Copy: 'Copy' }));
let tree: ReactTestRenderer | undefined;
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; vi.useRealTimers(); vi.unstubAllGlobals(); });
it('Undo restores the exact key, expires at five seconds and cancels stale timers', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.useFakeTimers();
  const undo = vi.fn(), expire = vi.fn();
  const render = async (title: string) => { const props = { removed: { key: title, title, expiresAt: Date.now() + 5000 }, onUndo: undo, onExpire: expire }; await act(async () => { if (tree) tree.update(createElement(PlanUndoBar, props)); else tree = create(createElement(PlanUndoBar, props)); }); };
  await render('Synthetic block');
  const button = () => tree!.root.findByType('Pressable' as never);
  expect(tree!.root.findAllByType('Copy' as never)[0]!.props.numberOfLines).toBe(1);
  await act(async () => vi.advanceTimersByTime(4999)); expect(expire).not.toHaveBeenCalled();
  await act(async () => button().props.onPress()); expect(undo).toHaveBeenLastCalledWith('Synthetic block');
  await render('Replacement'); await act(async () => vi.advanceTimersByTime(1)); expect(expire).toHaveBeenCalledTimes(1);
  await act(async () => vi.advanceTimersByTime(4999)); expect(expire).toHaveBeenCalledTimes(2);
  expect(tree!.root.findAllByType('Pressable' as never)).toHaveLength(0);
  expect(undo).toHaveBeenCalledTimes(1);
});
it.each([[104, null], [-104, null], [104.1, 'skip'], [-104.1, 'remove'], [0, null], [NaN, null], [Infinity, null]])('release %s produces %s', (distance, action) => {
  expect(plannerSwipeAction(distance as number)).toBe(action);
});
