import { parseProfilePreferences, type OrbColorKey, type ProfilePreferences } from '@stay-focused/shared';
import { requireApiBaseUrl } from '../config/apiBaseUrlResolution';

export class ProfilePreferencesError extends Error {
  constructor(readonly code: string) { super('Preferences are unavailable.'); }
}
export async function profilePreferencesRequest(input: {
  baseUrl: string; accessToken: string; orbColor?: OrbColorKey;
}, fetcher: typeof fetch = fetch): Promise<ProfilePreferences> {
  if (!input.accessToken) throw new Error('sign_in_required');
  const baseUrl = requireApiBaseUrl(input.baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetcher(`${baseUrl}/api/profile/preferences`, {
      method: input.orbColor ? 'PATCH' : 'GET',
      headers: { Authorization: `Bearer ${input.accessToken}`, 'Content-Type': 'application/json' },
      ...(input.orbColor ? { body: JSON.stringify({ orbColor: input.orbColor }) } : {}),
      cache: 'no-store', signal: controller.signal,
    });
    const value: unknown = await response.json();
    if (!response.ok || !value || typeof value !== 'object' || !('ok' in value) || value.ok !== true || !('data' in value)) {
      const code = value && typeof value === 'object' && 'error' in value && value.error && typeof value.error === 'object' && 'code' in value.error && value.error.code === 'profile_preferences_unavailable'
        ? 'profile_preferences_unavailable' : 'unavailable';
      throw new ProfilePreferencesError(code);
    }
    return parseProfilePreferences(value.data);
  } finally { clearTimeout(timer); }
}
