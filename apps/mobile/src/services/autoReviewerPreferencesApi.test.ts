import { describe, expect, it, vi } from 'vitest';
import { getAutoReviewerPreference, setAutoReviewerPreference } from './autoReviewerPreferencesApi';
describe('automatic reviewer preferences client', () => {
  it('saves and reloads the preference across bearer sessions', async () => {
    let enabled = true;
    const fetchImpl = vi.fn(async (_url: string | URL | Request, options?: RequestInit) => {
      if (options?.method === 'PATCH' && typeof options.body === 'string') enabled = JSON.parse(options.body).enabled;
      return new Response(JSON.stringify({ ok: true, data: { enabled } }));
    });
    const client = { baseUrl: 'https://app.example', accessToken: 'first', fetchImpl };
    expect(await getAutoReviewerPreference(client)).toBe(true);
    expect(await setAutoReviewerPreference(client, false)).toBe(false);
    expect(await getAutoReviewerPreference({ ...client, accessToken: 'second' })).toBe(false);
    expect(new Headers(fetchImpl.mock.calls.at(-1)?.[1]?.headers).get('Authorization')).toBe('Bearer second');
    expect(fetchImpl.mock.calls[1]?.[1]?.body).toBe('{"enabled":false}');
  });
  it.each([null, {}, { enabled: 'false' }])('rejects malformed success data %s', async data => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true, data })));
    await expect(getAutoReviewerPreference({ baseUrl: 'https://app.example', accessToken: 'token', fetchImpl })).rejects.toMatchObject({ code: 'invalid_response' });
  });
  it('reports offline failure and never pretends to save', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('offline'); });
    await expect(setAutoReviewerPreference({ baseUrl: 'https://app.example', accessToken: 'token', fetchImpl }, false)).rejects.toMatchObject({ code: 'connection' });
  });
  it('uses the shared request timeout for settings', async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = vi.fn((_url: string | URL | Request, options?: RequestInit) => new Promise<Response>((_resolve, reject) => options?.signal?.addEventListener('abort', () => reject(new Error('aborted')))));
      const pending = expect(getAutoReviewerPreference({ baseUrl: 'https://app.example', accessToken: 'token', fetchImpl })).rejects.toMatchObject({ code: 'connection' });
      await vi.advanceTimersByTimeAsync(15000); await pending;
    } finally { vi.useRealTimers(); }
  });
});
