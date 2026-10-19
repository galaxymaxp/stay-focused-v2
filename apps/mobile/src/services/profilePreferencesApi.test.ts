import { expect, it, vi } from 'vitest';
import { profilePreferencesRequest } from './profilePreferencesApi';
const input = { baseUrl: 'https://api.test', accessToken: 'jwt' };
it('sends bearer auth and parses preferences on GET and PATCH', async () => {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ ok: true, data: { orbColor: 'gold' } }));
  expect(await profilePreferencesRequest(input, fetcher)).toEqual({ orbColor: 'gold' });
  expect(fetcher).toHaveBeenLastCalledWith('https://api.test/api/profile/preferences', expect.objectContaining({ method: 'GET', headers: { Authorization: 'Bearer jwt', 'Content-Type': 'application/json' }, cache: 'no-store' }));
  await profilePreferencesRequest({ ...input, orbColor: 'gold' }, fetcher);
  expect(fetcher).toHaveBeenLastCalledWith('https://api.test/api/profile/preferences', expect.objectContaining({ method: 'PATCH', body: '{"orbColor":"gold"}' }));
});
it('keeps the unavailable-column code and hides raw provider errors', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: false, error: { code: 'profile_preferences_unavailable', message: 'private' } }, { status: 503 }));
  await expect(profilePreferencesRequest(input, fetcher)).rejects.toMatchObject({ code: 'profile_preferences_unavailable', message: 'Preferences are unavailable.' });
});
it('rejects missing tokens and invalid successful payloads', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true, data: { orbColor: 'blue' } }));
  await expect(profilePreferencesRequest({ ...input, accessToken: '' }, fetcher)).rejects.toThrow('sign_in_required');
  expect(fetcher).not.toHaveBeenCalled();
  await expect(profilePreferencesRequest(input, fetcher)).rejects.toThrow('invalid_profile_preferences');
});
