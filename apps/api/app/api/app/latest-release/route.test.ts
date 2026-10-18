import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { middleware } from '../../../../middleware';
import { NextRequest } from 'next/server';

const github = {
  tag_name: 'v2.2.0+6', body: 'versionCode: 6\nruntime: 2.2.0-sdk57\n\nA calm release.',
  html_url: 'https://github.com/galaxymaxp/stay-focused-releases/releases/tag/v2.2.0+6',
  published_at: '2026-10-18T00:00:00Z',
  assets: [{ name: 'stay-focused-2.2.0-6.apk', browser_download_url: 'https://github.com/galaxymaxp/stay-focused-releases/releases/download/v2.2.0+6/stay-focused-2.2.0-6.apk' }],
};
describe('public latest-release route', () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(1000000); vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  it('maps JSON, requires no auth and caches a second call', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(github)));
    const { GET } = await import('./route');
    expect(middleware(new NextRequest('https://local.invalid/api/app/latest-release')).headers.get('x-middleware-next')).toBe('1');
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
    expect(await response.json()).toMatchObject({ versionName: '2.2.0', versionCode: 6, runtimeVersion: '2.2.0-sdk57', notes: 'A calm release.', minSupportedVersionCode: null });
    await GET(); expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).not.toHaveProperty('Authorization');
  });
  it('serves stale on error, backs off, then refreshes', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(github))).mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce(new Response(JSON.stringify(github)));
    const { GET } = await import('./route');
    const first = await (await GET()).json();
    vi.advanceTimersByTime(600001);
    expect(await (await GET()).json()).toEqual(first);
    await GET(); expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(600001); await GET(); expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it.each(['error', 'http', 'invalid'])('returns 204 when never fetched: %s', async kind => {
    if (kind === 'error') fetchMock.mockRejectedValue(new Error('private provider detail'));
    else fetchMock.mockResolvedValue(new Response(JSON.stringify(kind === 'invalid' ? {} : github), { status: kind === 'http' ? 429 : 200 }));
    const { GET } = await import('./route');
    const response = await GET(); expect(response.status).toBe(204); expect(await response.text()).toBe('');
  });
  it('bounds timeout at five seconds', async () => {
    fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }));
    const { GET } = await import('./route');
    const result = GET(); await vi.advanceTimersByTimeAsync(5000);
    expect((await result).status).toBe(204);
  });
  it('coalesces concurrent requests', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(github)));
    const { GET } = await import('./route');
    const responses = await Promise.all([GET(), GET(), GET()]);
    expect(responses.map(response => response.status)).toEqual([200, 200, 200]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
