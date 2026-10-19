import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { DownloadPage } from './DownloadPage';
import Page, { metadata } from '../../../app/download/page';
import ReleasePage from '../../../app/release/page';
import type { LatestRelease } from '@stay-focused/shared';

const mocks = vi.hoisted(() => ({ redirect: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: import('react').ReactNode; href: string }) => createElement('a', { href }, children) }));
const release: LatestRelease = {
  versionName: '2.3.0', versionCode: 7, runtimeVersion: '2.3.0',
  apkUrl: 'https://github.com/galaxymaxp/stay-focused-releases/releases/download/v2.3.0+7/app.apk',
  releaseUrl: 'https://github.com/galaxymaxp/stay-focused-releases/releases/tag/v2.3.0+7',
  publishedAt: '2026-10-18T23:30:00Z', notes: 'First line.\nSecond line.\nThird line.\n<script>plain text only</script>', minSupportedVersionCode: null,
};
let tree: ReactTestRenderer | undefined;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(async () => {
  if (tree) await act(async () => tree!.unmount());
  tree = undefined;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
async function mount() {
  await act(async () => { tree = create(createElement(DownloadPage)); });
  return tree!.root;
}
function expectFallback() {
  const root = tree!.root;
  expect(root.findByType('h1').children).toEqual(['Download Stay Focused']);
  expect(root.findAllByType('time')).toHaveLength(0);
  expect(root.findAllByType('svg')).toHaveLength(0);
  expect(root.findAllByType('a').map(node => [node.children.join(''), node.props.href])).toEqual([
    ['All versions', 'https://github.com/galaxymaxp/stay-focused-releases/releases'],
    ['Privacy', '/privacy'],
    ['Terms', '/terms'],
  ]);
}

it('renders validated release metadata, one primary download and a local QR for the same APK', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json(release));
  vi.stubGlobal('fetch', fetch);
  const root = await mount();
  expect(fetch).toHaveBeenCalledWith('/api/app/latest-release', expect.objectContaining({ credentials: 'omit', signal: expect.any(AbortSignal) }));
  expect(root.findByType('h1').children).toEqual(['Stay Focused 2.3.0']);
  expect(root.findByType('time').props.dateTime).toBe(release.publishedAt);
  expect(root.findByType('time').children).toEqual(['October 18, 2026']);
  expect(root.findAllByType('a').filter(node => node.props.className === 'button primary').map(node => node.props.href)).toEqual([release.apkUrl]);
  expect(root.findByType('svg').props['aria-label']).toBe('Scan to download the Android APK');
  expect(root.findByType('path').props.d.length).toBeGreaterThan(100);
  const { DownloadQr } = await import('./DownloadQr');
  expect(root.findByType(DownloadQr).props.url).toBe(release.apkUrl);
  expect(root.findAllByType('li')).toHaveLength(3);
  expect(root.findAllByType('script')).toHaveLength(0);
  expect(root.findByProps({ id: 'release-notes' }).children).toEqual([release.notes]);
  expect(root.findByProps({ id: 'release-notes' }).props.style.WebkitLineClamp).toBe(3);
  await act(async () => root.findByType('button').props.onClick());
  expect(root.findByType('button').props['aria-expanded']).toBe(true);
  expect(root.findByProps({ id: 'release-notes' }).props.style.WebkitLineClamp).toBeUndefined();
});

it.each([204, 500])('shows only the releases link for HTTP %i', async status => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status })));
  await mount(); expectFallback();
});
it('shows the fallback after a network error', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private provider details')));
  await mount(); expectFallback();
  expect(JSON.stringify(tree!.toJSON())).not.toContain('private provider details');
});
it('rejects invalid metadata and unsafe APK destinations', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ...release, apkUrl: 'javascript:alert(1)' })));
  await mount(); expectFallback();
});
it('falls back on malformed JSON', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{')));
  await mount(); expectFallback();
});
it('bounds the metadata request and cancels it on unmount', async () => {
  vi.useFakeTimers();
  let signal: AbortSignal | undefined;
  vi.stubGlobal('fetch', vi.fn((_url, init: RequestInit) => {
    signal = init.signal ?? undefined;
    return new Promise<Response>((_resolve, reject) => signal?.addEventListener('abort', () => reject(new Error('aborted'))));
  }));
  await mount();
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
  expect(signal?.aborted).toBe(true); expectFallback();
  await act(async () => { tree!.unmount(); }); tree = undefined;
  await mount();
  await act(async () => { tree!.unmount(); }); tree = undefined;
  expect(signal?.aborted).toBe(true);
});
it('keeps metadata on the public page and redirects the old release route', () => {
  expect(metadata.title).toBe('Download Stay Focused');
  expect(Page().type).toBe(DownloadPage);
  ReleasePage(); expect(mocks.redirect).toHaveBeenCalledWith('/download');
});
