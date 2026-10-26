import { createElement } from 'react';
import { act, create } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { TodayWelcome } from './today-welcome';
it.each(['saved','around','last','first-run'])('shows only ready, undismissed first-run windows (%s)', async source => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); const dismiss = vi.fn(); let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(createElement(TodayWelcome, { source, ready:true, dismissed:false, onDismiss:dismiss })); });
  expect(tree.root.findAllByType('aside')).toHaveLength(source === 'first-run' ? 1 : 0);
  if(source === 'first-run') { await act(async () => tree.root.findByType('button').props.onClick()); expect(dismiss).toHaveBeenCalledTimes(1); }
  for(const props of [{ready:false,dismissed:false},{ready:true,dismissed:true}]) { await act(async () => tree.update(createElement(TodayWelcome, { source, ...props, onDismiss: dismiss }))); expect(tree.toJSON()).toBeNull(); }
  await act(async () => tree.unmount()); vi.unstubAllGlobals();
});
