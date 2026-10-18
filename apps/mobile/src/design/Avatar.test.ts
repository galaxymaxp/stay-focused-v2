import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { Avatar } from './Avatar';
vi.mock('react-native', () => ({ Image: 'Image', Text: 'Text', View: 'View' }));
vi.mock('./theme', () => ({ useTheme: () => ({ colors: { blueSoft: 'blue', blue: 'blue', separator: 'grey' } }) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('falls back to initials on image errors and retries a new source', async () => {
  let rendered!: ReactTestRenderer;
  await act(async () => { rendered = create(createElement(Avatar, { uri: 'https://a.test/a', initial: 'A' })); });
  const find = (type: string) => rendered.root.findAll(node => node.type === type);
  expect(find('Image')[0]!.props.accessible).toBe(false);
  await act(async () => find('Image')[0]!.props.onError());
  expect(find('Image')).toHaveLength(0); expect(find('Text')[0]!.children).toEqual(['A']);
  await act(async () => rendered.update(createElement(Avatar, { uri: 'https://a.test/b', initial: 'A' })));
  expect(find('Image')[0]!.props.source.uri).toBe('https://a.test/b');
  await act(async () => rendered.unmount());
});
