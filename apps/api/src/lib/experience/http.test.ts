import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  inventory: vi.fn(),
  materials: vi.fn(),
  rows: vi.fn(),
  serviceClient: vi.fn(),
  sourceStatus: vi.fn(),
  trustedRepository: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ verifyBearerToken: mocks.auth }));
vi.mock('@/lib/canvas-db', () => ({ createCanvasServiceClient: mocks.serviceClient }));
vi.mock('@/lib/canvas-reviewer-sources', () => ({ listCanvasReviewerSources: mocks.materials }));
vi.mock('@/lib/canvas-course-selection', () => ({ loadCanvasCourseInventory: mocks.inventory }));
vi.mock('@/lib/reviewer-source-status', () => ({ readReviewerSourceStatus: mocks.sourceStatus }));
vi.mock('@/lib/experience/repository', async importOriginal => {
  const original = await importOriginal<typeof import('./repository')>();
  return { ...original, trustedExperienceReadRepository: mocks.trustedRepository };
});
import { GET as todayGet } from '@/../app/api/today/route';
import { GET, POST, OPTIONS } from '@/../app/api/experience/[...path]/route';
import { experienceRepository } from './repository';
import { ExperienceService } from './service';
const id = '11111111-1111-4111-8111-111111111111';
const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
function request(path: string, method = 'GET', body?: string) { return new Request(`https://app.example/api/experience/${path}`, { method, headers: { authorization: 'Bearer token', 'content-type': 'application/json' }, ...(body ? { body } : {}) }); }
function context(path: string) { return { params: Promise.resolve({ path: path.split('?')[0]!.split('/') }) }; }
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ id: 'owner' });
  mocks.serviceClient.mockReturnValue({ kind: 'trusted-service-read-client' });
  mocks.trustedRepository.mockImplementation((_client, owner) => ({ rows: (table: string) => mocks.rows(table, owner) }));
  mocks.rows.mockResolvedValue([]);
  mocks.materials.mockResolvedValue({ ok: true, value: { sources: [], pagination: { hasMore: false, offset: 0, returned: 0, totalKnown: 0 } } });
  mocks.sourceStatus.mockResolvedValue({ ok: false });
});
afterEach(() => {
  if (originalServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
});
describe('authenticated student routes', () => {
  it.each(['quiz', 'activity'])('opens persisted %s aliases through the Library service', async prefix => {
    const artifactId = `${prefix}:${id}`;
    const open = vi.spyOn(ExperienceService.prototype, 'getLibraryArtifact').mockResolvedValue({
      artifact: { id: artifactId, type: prefix === 'quiz' ? 'quiz' : 'activity_output', title: 'Saved output', course: null, sourceId: null, sourceTitle: null, activityId: null, createdAt: '2026-09-13', updatedAt: '2026-09-13', lastOpenedAt: null, status: 'completed', relatedArtifactIds: [] },
      reviewer: { id: artifactId, title: 'Saved output', course: null, source: { id: null, title: null }, generatedAt: '2026-09-13', freshness: 'unknown', sections: [] },
    });
    const path = `library/${artifactId}`;
    try { const response = await GET(request(path), context(path)); expect(response.status).toBe(200); expect(open).toHaveBeenCalledWith('owner', artifactId); }
    finally { open.mockRestore(); }
  });
  it.each(['capabilities', 'courses', `courses/${id}`, `courses/${id}/materials`, 'activities', `activities/canvas:${id}`, 'library', `library/reviewer:${id}`, `generations/${id}`])('rejects missing JWT for %s', async path => {
    mocks.auth.mockResolvedValue(null);
    const response = await GET(request(path), context(path));
    expect(response.status).toBe(401); expect((await response.json()).error.action).toBe('sign_in');
    expect(mocks.serviceClient).not.toHaveBeenCalled(); expect(mocks.rows).not.toHaveBeenCalled();
  });
  it('rejects an invalid bearer token before creating the trusted read client', async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await GET(new Request('https://app.example/api/experience/courses', { headers: { authorization: 'Bearer invalid-token' } }), context('courses'));
    expect(response.status).toBe(401); expect(mocks.auth).toHaveBeenCalledOnce(); expect(mocks.serviceClient).not.toHaveBeenCalled();
  });
  it('rejects unauthenticated Today and generation admission', async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await todayGet(request('today'))).status).toBe(401);
    expect((await POST(request('generations', 'POST', '{}'), context('generations'))).status).toBe(401);
  });
  it('binds Today reads to the verified owner and trusted server read client', async () => {
    const response = await todayGet(new Request('https://app.example/api/today?date=2026-09-12&utcOffsetMinutes=480&userId=other', { headers: { authorization: 'Bearer token' } }));
    expect(response.status).toBe(200); expect(mocks.serviceClient).toHaveBeenCalledOnce();
    expect(mocks.trustedRepository).toHaveBeenCalledWith({ kind: 'trusted-service-read-client' }, 'owner');
    expect(mocks.rows.mock.calls.every(call => call[1] === 'owner')).toBe(true);
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
  it('returns only the authenticated owner courses with sync state from the course inventory', async () => {
    mocks.inventory.mockResolvedValue({ ok: true, value: { classificationSource: 'canvas', selectedCourseIds: ['course-a'], counts: {}, connection: {}, courses: [
      { id: 'course-a', displayName: 'Owner course', courseCode: 'A', workflowState: 'available', startAt: null, endAt: null, term: { id: 't', name: '2026-27-1T', startAt: null, endAt: null }, classification: 'likely_current', selectable: true, unavailableReason: null, selected: true,
        lastSync: { status: 'success', startedAt: null, completedAt: '2026-09-20T00:00:00Z', lastCheckedAt: null, lastSuccessfulSyncAt: '2026-09-20T00:00:00Z', failureCode: null } },
    ] } });
    const response = await GET(request('courses?user_id=other'), context('courses'));
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual({ classificationSource: 'canvas', items: [{ id: 'course-a', code: 'A', name: 'Owner course', status: 'available', materialCount: null, reviewerCount: null,
      lastActivityAt: '2026-09-20T00:00:00Z', syncState: 'synced', period: 'current', termName: '2026-27-1T', lastSuccessfulSyncAt: '2026-09-20T00:00:00Z' }] });
    expect(mocks.inventory).toHaveBeenCalledWith({ client: { kind: 'trusted-service-read-client' }, userId: 'owner', allowStoredFallback: true });
  });
  it('returns an empty course list without a Canvas connection and a retryable error on storage failure', async () => {
    mocks.inventory.mockResolvedValueOnce({ ok: false, status: 404, code: 'canvas_connection_missing', message: 'Connect Canvas.' });
    const empty = await GET(request('courses'), context('courses'));
    expect(empty.status).toBe(200); expect((await empty.json()).data.items).toEqual([]);
    mocks.inventory.mockResolvedValueOnce({ ok: false, status: 500, code: 'canvas_storage_failed', message: 'private detail' });
    const failed = await GET(request('courses'), context('courses'));
    expect(failed.status).toBe(503);
    const body = await failed.json();
    expect(body.error).toMatchObject({ code: 'unavailable', retryable: true }); expect(JSON.stringify(body)).not.toContain('private detail');
  });
  it('reports an unselected course as not synced instead of a server outage', async () => {
    mocks.rows.mockImplementation(async (table, owner) => table === 'canvas_courses' ? [{ id, user_id: owner, course_code: 'A', name: 'Owner course', workflow_state: 'available', last_synced_at: null }] : []);
    mocks.materials.mockResolvedValue({ ok: false, status: 400, code: 'canvas_course_not_selected', message: 'Select this Canvas course.' });
    const response = await GET(request(`courses/${id}`), context(`courses/${id}`));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatchObject({ code: 'course_not_synced', retryable: false });
    mocks.materials.mockResolvedValue({ ok: false, status: 500, code: 'canvas_storage_failed', message: 'private detail' });
    const failed = await GET(request(`courses/${id}`), context(`courses/${id}`));
    expect(failed.status).toBe(503); expect((await failed.json()).error.code).toBe('unavailable');
  });
  it('keeps Canvas material and Library reads scoped to the verified owner', async () => {
    mocks.rows.mockImplementation(async (table, owner) => table === 'canvas_courses' ? [{ id, user_id: owner, course_code: 'A', name: 'Owner course', workflow_state: 'available', last_synced_at: null }] : []);
    const materials = await GET(request(`courses/${id}/materials?userId=other`), context(`courses/${id}/materials`));
    expect(materials.status).toBe(200);
    expect(mocks.materials).toHaveBeenCalledWith(expect.objectContaining({ client: { kind: 'trusted-service-read-client' }, userId: 'owner', courseId: id }));
    mocks.rows.mockClear();
    const library = await GET(request('library?user_id=other'), context('library'));
    expect(library.status).toBe(200);
    expect(mocks.rows.mock.calls.length).toBeGreaterThan(0);
    expect(mocks.rows.mock.calls.every(call => call[1] === 'owner')).toBe(true);
  });
  it.each([`courses/${id}`, `activities/canvas:${id}`, `library/reviewer:${id}`, `generations/${id}`])('uses indistinguishable not-found for absent/foreign %s', async path => {
    const response = await GET(request(path), context(path));
    expect(response.status).toBe(404); expect((await response.json()).error.code).toBe('not_found');
  });
  it.each(['library?type=invalid', 'library?limit=0', 'courses/bad/materials', 'activities?status=secret'])('rejects invalid input %s', async path => {
    expect((await GET(request(path), context(path))).status).toBeGreaterThanOrEqual(400);
  });
  it('normalizes storage failures and hides private details', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-secret-must-not-leak';
    mocks.rows.mockRejectedValue(new Error('server-secret-must-not-leak encrypted_token raw OCR provider stack'));
    const response = await GET(request('courses'), context('courses'));
    expect(response.status).toBe(503); expect(await response.text()).not.toMatch(/server-secret-must-not-leak|encrypted_token|OCR|provider|stack/);
  });
  it('returns empty missing Library categories', async () => {
    const response = await GET(request('library?type=quiz'), context('library'));
    const body = await response.json(); expect(body.data.items).toEqual([]); expect(body.data.categories.quiz.status).toBe('available');
  });
  it('returns CORS options without exposing data', () => { expect(OPTIONS().status).toBe(204); });
});
describe('repository owner predicates and pagination', () => {
  it('cannot switch the trusted owner through a repository argument', async () => {
    const original = await vi.importActual<typeof import('./repository')>('./repository');
    const chain = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn() };
    chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain); chain.order.mockReturnValue(chain);
    chain.range.mockResolvedValue({ data: [{ id: 'owned-a', user_id: 'user-a' }, { id: 'foreign-b', user_id: 'user-b' }], error: null });
    const client = { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>;
    const repository = original.trustedExperienceReadRepository(client, 'user-a');
    expect((await repository.rows('canvas_courses', 'user-b')).map(row => row.id)).toEqual(['owned-a']);
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-a');
    expect(chain.eq).not.toHaveBeenCalledWith('user_id', 'user-b');
  });
  it('executes explicit owner filters and removes foreign rows defensively', async () => {
    // Exercise the real adapter separately from HTTP composition mocks.
    const original = await vi.importActual<typeof import('./repository')>('./repository');
    const chain = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn() };
    chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain); chain.order.mockReturnValue(chain);
    chain.range.mockResolvedValue({ data: [{ id: 'owned', user_id: 'owner' }, { id: 'foreign', user_id: 'other' }], error: null });
    const client = { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>;
    const repository = original.experienceRepository(client);
    for (const table of ['tasks', 'study_sessions', 'study_plans', 'canvas_assignments', 'source_versions', 'processing_jobs', 'processing_job_results', 'generated_artifact_versions'] as const) {
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
  it('performs read-only operations at the trusted repository boundary', async () => {
    const original = await vi.importActual<typeof import('./repository')>('./repository');
    const insert = vi.fn(), update = vi.fn(), remove = vi.fn();
    const chain = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn(), insert, update, delete: remove };
    chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain); chain.order.mockReturnValue(chain);
    chain.range.mockResolvedValue({ data: [], error: null });
    const client = { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>;
    await original.trustedExperienceReadRepository(client, 'owner').rows('generated_artifacts', 'other');
    expect(chain.select).toHaveBeenCalledWith('*');
    expect(insert).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled();
  });
});
