import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isReviewerShareToken, type ReviewerShareSnapshot } from '@stay-focused/shared';
import { createHash } from 'node:crypto';
import { projectShareSnapshot } from './snapshot';

export const SHARE_READ_HEADERS = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer', 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff' };
/** Per-process only, no durable quota; fail closed at capacity until expiry. */
export class ShareReadLimiter {
  private readonly entries = new Map<string, { count: number; expires: number }>();
  constructor(private readonly maximum = 4096, private readonly burst = 60, private readonly windowMs = 60000) {}
  allow(ip: string, token: string, now = Date.now()): boolean {
    for (const [key, value] of this.entries) if (value.expires <= now) this.entries.delete(key);
    const hash = (value: string) => createHash('sha256').update(value).digest('hex');
    const keys = [`ip:${hash(ip)}`, `token:${hash(token)}`];
    if (keys.some(key => (this.entries.get(key)?.count ?? 0) >= this.burst)
      || this.entries.size + keys.filter(key => !this.entries.has(key)).length > this.maximum) return false;
    for (const key of keys) { const previous = this.entries.get(key); this.entries.set(key, { count: (previous?.count ?? 0) + 1, expires: previous?.expires ?? now + this.windowMs }); }
    return true;
  }
}
const limiter = new ShareReadLimiter();
export async function readPublicShare(client: SupabaseClient<Database>, token: string): Promise<ReviewerShareSnapshot | null> {
  const result = await client.from('reviewer_shares').select('snapshot').eq('token', token).is('revoked_at', null).maybeSingle();
  if (result.error) throw new Error('share_unavailable');
  return result.data ? projectShareSnapshot(result.data.snapshot) : null;
}
export async function publicShareResponse(request: Request, token: string,
  read: (token: string) => Promise<ReviewerShareSnapshot | null>, rate = limiter): Promise<Response> {
  // Vercel's trusted forwarding header is used by the deployed API. Other hosts
  // share an unknown-IP bucket unless a trusted proxy supplies the header.
  const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim().slice(0, 200) ?? 'unknown';
  if (!rate.allow(ip, token.slice(0, 128))) return Response.json({ error: 'rate_limited' }, { status: 429,
    headers: { ...SHARE_READ_HEADERS, 'Retry-After': '60' } });
  try {
    const snapshot = isReviewerShareToken(token) ? await read(token) : null;
    if (!snapshot) return Response.json({ error: 'not_shared' }, { status: 404, headers: SHARE_READ_HEADERS });
    return Response.json(projectShareSnapshot(snapshot), { headers: SHARE_READ_HEADERS });
  } catch { return Response.json({ error: 'unavailable' }, { status: 503, headers: SHARE_READ_HEADERS }); }
}
