import { NextResponse } from 'next/server';
import { toLatestRelease, type LatestRelease } from '@stay-focused/shared';

export const dynamic = 'force-dynamic';

const SOURCE = 'https://api.github.com/repos/galaxymaxp/stay-focused-releases/releases/latest';
const CACHE_MS = 10 * 60_000;
const headers = { 'Cache-Control': 'public, max-age=300' };
let cached: LatestRelease | null = null;
let nextAttemptAt = 0;
let pending: Promise<void> | null = null;

async function refresh(): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(SOURCE, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Stay-Focused-Release-Checker' },
    });
    if (!response.ok) return;
    const release = toLatestRelease(await response.json());
    if (release) cached = release;
  } catch {
    // A provider outage must neither leak details nor interrupt app use.
  } finally {
    clearTimeout(timeout);
    // Back off even on failure; a cold/error burst must not exhaust GitHub's limit.
    nextAttemptAt = Date.now() + CACHE_MS;
  }
}

/** Public metadata only, like /api/health. Protected handlers keep their JWT wrappers. */
export async function GET() {
  if (Date.now() >= nextAttemptAt) {
    pending ??= refresh().finally(() => { pending = null; });
    await pending;
  }
  return cached ? NextResponse.json(cached, { headers }) : new NextResponse(null, { status: 204, headers });
}
