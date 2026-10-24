import { parsePlannerPreferences, PROFILE_PREFERENCES_UNAVAILABLE } from '@stay-focused/shared';
import { DEFAULT_PLAN_MODE, isPlanMode } from '@stay-focused/shared/task-planning';
import { verifyBearerToken } from '@/lib/auth';
import { readBoundedText } from '@/lib/bounded-body';
import { createCanvasServiceClient } from '@/lib/canvas-db';
import { createCorsHeaders, optionsResponse } from '@/lib/canvas-routes';

// The Today "Plan with" choice. A sibling of /api/profile/preferences, whose
// strict single-key orb contract shipped clients already parse.
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
      try { patch = parsePlannerPreferences(JSON.parse(body.text)); }
      catch { return fail(400, 'invalid_request'); }
    }
    const client = createCanvasServiceClient();
    const result = patch
      ? await client.from('user_profiles').upsert({ user_id: user.id, plan_mode: patch.planMode }, { onConflict: 'user_id' }).select('plan_mode').single()
      : await client.from('user_profiles').select('plan_mode').eq('user_id', user.id).maybeSingle();
    if (result.error) {
      // Missing column or stale schema cache before the TP1 migration. Never
      // inspect or expose provider message/details.
      return fail(503, ['42703', 'PGRST204'].includes(result.error.code) ? PROFILE_PREFERENCES_UNAVAILABLE : 'unavailable');
    }
    const stored = result.data?.plan_mode;
    // Never chosen (no row or null) plans both kinds.
    const data = parsePlannerPreferences({ planMode: isPlanMode(stored) ? stored : DEFAULT_PLAN_MODE });
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
