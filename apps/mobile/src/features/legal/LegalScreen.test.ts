import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '@stay-focused/shared';
import PrivacyRoute from '../../../app/privacy';
import TermsRoute from '../../../app/terms';

const mocks = vi.hoisted(() => ({ back: vi.fn(), replace: vi.fn(), canGoBack: vi.fn(() => true) }));
vi.mock('expo-router', () => ({ Link: 'Link', router: mocks }));
vi.mock('react-native', () => ({ Text: 'Text', View: 'View', Pressable: 'Pressable' }));
vi.mock('../../components/Screen', () => ({ Screen: 'Screen' }));
vi.mock('../../design/theme', () => ({ useTheme: () => ({ colors: { textPrimary: '#111', textSecondary: '#62615e' } }) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let tree: ReactTestRenderer | undefined;
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.unstubAllGlobals(); });

it.each([
  { Route: PrivacyRoute, document: PRIVACY_POLICY, path: '/privacy' },
  { Route: TermsRoute, document: TERMS_OF_SERVICE, path: '/terms' },
])('bundles every $path section without network access and keeps native links reachable', async ({ Route, document, path }) => {
  const fetch = vi.fn(() => { throw new Error('offline'); });
  vi.stubGlobal('fetch', fetch);
  await act(async () => { tree = create(createElement(Route)); });
  const copy = JSON.stringify(tree!.toJSON());
  for (const section of document.sections) {
    expect(copy).toContain(section.heading);
    for (const paragraph of section.paragraphs) expect(copy).toContain(JSON.stringify(paragraph).slice(1, -1));
    for (const bullet of section.bullets ?? []) expect(copy).toContain(JSON.stringify(bullet).slice(1, -1));
  }
  expect(copy).toContain(`Also at stay-focused-ten.vercel.app`);
  expect(copy).toContain(path);
  expect(fetch).not.toHaveBeenCalled();
  const links = tree!.root.findAll(node => String(node.type) === 'Link');
  expect(links.map(link => link.props.href)).toEqual(['/privacy', '/terms']);
  for (const link of links) expect(link.props.style.minHeight).toBeGreaterThanOrEqual(44);
  const back = tree!.root.findByProps({ accessibilityLabel: 'Back' });
  mocks.canGoBack.mockReturnValue(true); back.props.onPress(); expect(mocks.back).toHaveBeenCalled();
  mocks.canGoBack.mockReturnValue(false); back.props.onPress(); expect(mocks.replace).toHaveBeenCalledWith('/sign-in');
});
