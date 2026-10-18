import { expect, it, vi } from 'vitest';
import { profileAvatarRequest } from './profileAvatarApi';
const response = (data: unknown) => new Response(JSON.stringify({ ok: true, data }));
it('sends bearer-authenticated bounded binary bytes, without client owner/path fields', async () => {
  const file = new Blob(['photo'], { type: 'image/png' });
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ url: null, expiresAt: null }));
  await profileAvatarRequest({ baseUrl: 'https://api.test', accessToken: 'jwt', method: 'PUT', photo: { uri: 'blob:local', mimeType: 'image/png', file } }, fetcher);
  expect(fetcher.mock.calls[0]![0]).toBe('https://api.test/api/profile/avatar');
  expect(fetcher.mock.calls[0]![1]).toMatchObject({ method: 'PUT', headers: { Authorization: 'Bearer jwt', 'Content-Type': 'image/png' } });
  expect(fetcher.mock.calls[0]![1]!.body).toBeInstanceOf(Uint8Array);
});
it('denies remote image fetches, missing configuration and oversized files before network', async () => {
  const fetcher = vi.fn<typeof fetch>();
  for (const input of [
    { baseUrl: '', accessToken: 'jwt' },
    { baseUrl: 'https://api.test', accessToken: '' },
    { baseUrl: 'https://api.test', accessToken: 'jwt', photo: { uri: 'https://other.test/image', mimeType: 'image/png' } },
    { baseUrl: 'https://api.test', accessToken: 'jwt', photo: { uri: 'blob:local', mimeType: 'image/png', file: new Blob([new Uint8Array(2097153)]) } },
  ]) await expect(profileAvatarRequest(input, fetcher)).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
it('does not expose provider diagnostics and rejects unsafe signed URLs', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'private secret' } }), { status: 503 })).mockResolvedValueOnce(response({ url: 'http://unsafe.test/photo', expiresAt: 'bad' }));
  await expect(profileAvatarRequest({ baseUrl: 'https://api.test', accessToken: 'jwt' }, fetcher)).rejects.not.toThrow('private secret');
  await expect(profileAvatarRequest({ baseUrl: 'https://api.test', accessToken: 'jwt' }, fetcher)).rejects.toThrow();
});
