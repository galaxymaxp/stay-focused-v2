import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), rows: vi.fn(), client: vi.fn() }));
vi.mock('@/lib/auth', () => ({ verifyBearerToken: mocks.auth }));
vi.mock('@/lib/reviewer-db', () => ({ createReviewerUserClient: mocks.client }));
vi.mock('@/lib/experience/repository', async importOriginal => {
  const original = await importOriginal<typeof import('./repository')>();
  return { ...original, experienceRepository: () => ({ rows: mocks.rows }) };
});
import { GET as todayGet } from '@/../app/api/today/route';
import { GET, POST, OPTIONS } from '@/../app/api/experience/[...path]/route';
import { experienceRepository } from './repository';
const id = '11111111-1111-4111-8111-111111111111';
function request(path: string, method = 'GET', body?: string) { return new Request(`https://app.example/api/experience/${path}`, { method, headers: { authorization: 'Bearer token', 'content-type': 'application/json' }, ...(body ? { body } : {}) }); }
function context(path: string) { return { params: Promise.resolve({ path: path.split('?')[0]!.split('/') }) }; }
beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue({ id: 'owner' }); mocks.client.mockReturnValue({}); mocks.rows.mockResolvedValue([]); });
describe('authenticated student routes', () => {
  it.each(['capabilities', 'courses', `courses/${id}`, `courses/${id}/materials`, 'activities', `activities/canvas:${id}`, 'library', `library/reviewer:${id}`, `generations/${id}`])('rejects missing JWT for %s', async path => {
    mocks.auth.mockResolvedValue(null);
    const response = await GET(request(path), context(path));
    expect(response.status).toBe(401); expect((await response.json()).error.action).toBe('sign_in'); expect(mocks.rows).not.toHaveBeenCalled();
  });
  it('rejects unauthenticated Today and generation admission', async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await todayGet(request('today'))).status).toBe(401);
    expect((await POST(request('generations', 'POST', '{}'), context('generations'))).status).toBe(401);
  });
  it('binds Today reads to verified owner and authenticated client', async () => {
    const response = await todayGet(new Request('https://app.example/api/today?date=2026-09-12&utcOffsetMinutes=480&userId=other', { headers: { authorization: 'Bearer token' } }));
    expect(response.status).toBe(200); expect(mocks.client).toHaveBeenCalledWith('token');
    expect(mocks.rows.mock.calls.every(call => call[1] === 'owner')).toBe(true);
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
  it.each([`courses/${id}`, `activities/canvas:${id}`, `library/reviewer:${id}`, `generations/${id}`])('uses indistinguishable not-found for absent/foreign %s', async path => {
    const response = await GET(request(path), context(path));
    expect(response.status).toBe(404); expect((await response.json()).error.code).toBe('not_found');
  });
  it.each(['library?type=invalid', 'library?limit=0', 'courses/bad/materials', 'activities?status=secret'])('rejects invalid input %s', async path => {
    expect((await GET(request(path), context(path))).status).toBeGreaterThanOrEqual(400);
  });
  it('normalizes storage failures and hides private details', async () => {
    mocks.rows.mockRejectedValue(new Error('encrypted_token raw OCR provider stack'));
    const response = await GET(request('courses'), context('courses'));
    expect(response.status).toBe(503); expect(await response.text()).not.toMatch(/encrypted_token|OCR|provider|stack/);
  });
  it('returns empty missing Library categories', async () => {
    const response = await GET(request('library?type=quiz'), context('library'));
    const body = await response.json(); expect(body.data.items).toEqual([]); expect(body.data.categories.quiz.status).toBe('unavailable');
  });
  it('returns CORS options without exposing data', () => { expect(OPTIONS().status).toBe(204); });
});
describe('repository owner predicates and pagination', () => {
  it('executes explicit owner filters and removes foreign rows defensively', async () => {
    // Exercise the real adapter separately from HTTP composition mocks.
    const original = await vi.importActual<typeof import('./repository')>('./repository');
    const chain = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn() };
    chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain); chain.order.mockReturnValue(chain);
    chain.range.mockResolvedValue({ data: [{ id: 'owned', user_id: 'owner' }, { id: 'foreign', user_id: 'other' }], error: null });
    const client = { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>;
    const repository = original.experienceRepository(client);
    for (const table of ['tasks', 'study_sessions', 'study_plans', 'canvas_assignments', 'reviewers', 'processing_jobs', 'processing_job_results', 'generated_artifact_versions'] as const) {
      expect((await repository.rows(table, 'owner')).map(r => r.id)).toEqual(['owned']);
    }
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'owner');
  });
  it('continues beyond a full page', async () => {
    const original = await vi.importActual<{ experienceRepository: typeof experienceRepository }>('./repository');
    const chain = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn() };
    chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain); chain.order.mockReturnValue(chain);
    chain.range.mockResolvedValueOnce({ data: Array.from({ length: 200 }, (_, i) => ({ id: String(i), user_id: 'owner' })), error: null }).mockResolvedValueOnce({ data: [], error: null });
    await original.experienceRepository({ from: () => chain } as unknown as SupabaseClient<Database>).rows('tasks', 'owner');
    expect(chain.range.mock.calls).toEqual([[0, 199], [200, 399]]);
  });
});
