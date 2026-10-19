import { parseProfilePreferences, PROFILE_PREFERENCES_UNAVAILABLE } from '@stay-focused/shared';
import { verifyBearerToken } from '@/lib/auth';
import { readBoundedText } from '@/lib/bounded-body';
import { createCanvasServiceClient } from '@/lib/canvas-db';
import { createCorsHeaders, optionsResponse } from '@/lib/canvas-routes';

export const runtime = 'nodejs';
const METHODS = 'GET, PATCH, OPTIONS';
function json(request: Request, body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: {
    ...createCorsHeaders(request.headers.get('origin'), METHODS), 'Cache-Control': 'private, no-store',
  } });
}
async function handle(request: Request, write: boolean): Promise<Response> {
  const fail = (status: number, code: string) => json(request, { ok: false, error: {
    code, message: status === 401 ? 'Please sign in again.' : 'Preferences are unavailable.',
  } }, status);
  try {
    const user = await verifyBearerToken(request);
    if (!user) return fail(401, 'unauthorized');
    if (new URL(request.url).search) return fail(400, 'invalid_request');
    let patch;
    if (write) {
      const body = await readBoundedText(request, 1024);
      if (!body.ok) return fail(body.reason === 'too_large' ? 413 : 400, 'invalid_request');
      try { patch = parseProfilePreferences(JSON.parse(body.text)); }
      catch { return fail(400, 'invalid_request'); }
    }
    const client = createCanvasServiceClient();
    const result = patch
      ? await client.from('user_profiles').upsert({ user_id: user.id, orb_color: patch.orbColor }, { onConflict: 'user_id' }).select('orb_color').single()
      : await client.from('user_profiles').select('orb_color').eq('user_id', user.id).maybeSingle();
    if (result.error) {
      // PostgreSQL missing column or PostgREST's stale schema cache. Never inspect
      // or expose provider message/details (which can contain private content).
      return fail(503, ['42703', 'PGRST204'].includes(result.error.code) ? PROFILE_PREFERENCES_UNAVAILABLE : 'unavailable');
    }
    const data = parseProfilePreferences({ orbColor: result.data?.orb_color ?? 'pearl' });
    return json(request, { ok: true, data });
  } catch { return fail(503, 'unavailable'); }
}
export const GET = (request: Request) => handle(request, false);
export const PATCH = (request: Request) => handle(request, true);
export function OPTIONS(request: Request): Response {
  const response = optionsResponse(request, METHODS);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
