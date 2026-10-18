import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { expect, it } from 'vitest';
import { Avatar } from './avatar';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('renders decorative images, falls back on error and retries a changed URL', async () => {
  let rendered!: ReactTestRenderer;
  await act(async () => { rendered = create(createElement(Avatar, { url: 'https://a.test/a', initial: 'A' })); });
  expect(rendered.root.findByType('img').props.alt).toBe('');
  await act(async () => rendered.root.findByType('img').props.onError());
  expect(rendered.root.findAllByType('img')).toHaveLength(0); expect(rendered.root.findByType('span').children).toEqual(['A']);
  await act(async () => rendered.update(createElement(Avatar, { url: 'https://a.test/b', initial: 'A' })));
  expect(rendered.root.findByType('img').props.src).toBe('https://a.test/b');
  await act(async () => rendered.unmount());
});
