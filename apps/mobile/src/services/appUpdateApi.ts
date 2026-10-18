import { isLatestRelease, type LatestRelease } from '@stay-focused/shared';

async function request(baseUrl: string, path: string, fetchImpl: typeof fetch): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}${path}`, { signal: controller.signal, cache: 'no-store' });
    // Consume the body under the same timeout, including slow/incomplete transfers.
    const body = await response.text();
    return new Response(body || null, { status: response.status });
  } finally { clearTimeout(timeout); }
}

export async function appUpdateOnline(baseUrl: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  try { return (await request(baseUrl, '/api/health', fetchImpl)).ok; } catch { return false; }
}

export async function loadAppUpdate(baseUrl: string, fetchImpl: typeof fetch = fetch): Promise<LatestRelease | null> {
  const response = await request(baseUrl, '/api/app/latest-release', fetchImpl);
  if (response.status === 204) return null;
  if (!response.ok) throw new Error('release_unavailable');
  const value: unknown = await response.json();
  if (!isLatestRelease(value)) throw new Error('invalid_release');
  return value;
}
