import { createElement } from 'react';
import { act, create } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { TodayWelcome } from './TodayWelcome';
vi.mock('react-native', () => ({ View: 'View', Pressable: 'Pressable' }));
vi.mock('../../design/primitives', () => ({ Copy: 'Copy' }));
vi.mock('../../design/theme', async () => { const { palettes } = await import('../../design/themeTokens'); return { useTheme: () => ({ colors: palettes.light }) }; });
it.each(['saved','around','last','first-run'])('shows only ready, undismissed first-run windows (%s)', async source => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); const dismiss = vi.fn(); let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(createElement(TodayWelcome, { source, ready: true, dismissed: false, onDismiss: dismiss })); });
  expect(tree.root.findAll(node => node.props.testID === 'today-welcome')).toHaveLength(source === 'first-run' ? 1 : 0);
  if(source === 'first-run') { const button=tree.root.findByType('Pressable' as never); expect(button.props.style.width).toBe(44); await act(async () => button.props.onPress()); expect(dismiss).toHaveBeenCalledTimes(1); }
  for(const props of [{ready:false,dismissed:false},{ready:true,dismissed:true}]) { await act(async () => tree.update(createElement(TodayWelcome, { source, ...props, onDismiss: dismiss }))); expect(tree.toJSON()).toBeNull(); }
  await act(async () => tree.unmount()); vi.unstubAllGlobals();
});
