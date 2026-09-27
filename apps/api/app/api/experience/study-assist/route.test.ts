import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assistRequest, selectAssistBlock, type ReviewerReaderModel } from '@stay-focused/shared';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), detail: vi.fn(), saved: vi.fn(), source: vi.fn(), generate: vi.fn(), client: vi.fn(), provider: vi.fn() }));
vi.mock('@/lib/auth', () => ({ verifyBearerToken: mocks.auth }));
vi.mock('@/lib/canvas-db', () => ({ createCanvasServiceClient: () => ({}) }));
vi.mock('@/lib/experience/service', () => ({ ExperienceService: class { getLibraryArtifact = mocks.detail; } }));
vi.mock('@/lib/reviewer-db', () => ({ createReviewerUserClient: mocks.client }));
vi.mock('@/lib/canonical-reviewers', () => ({ readCanonicalReviewerRecord: mocks.saved }));
vi.mock('@/providers', () => ({ createServerOpenAIProvider: mocks.provider }));
vi.mock('@/lib/study-assist', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/study-assist')>(), assistSourceExcerpt: mocks.source, generateStudyAssist: mocks.generate }));
const { POST, OPTIONS } = await import('./route');
const reviewer: ReviewerReaderModel = { id: 'artifact:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', title: 'Cells', course: null,
  source: { id: 'source', title: 'Cells' }, generatedAt: '2026-09-27T00:00:00Z', freshness: 'current',
  sections: [{ id: 'section', title: 'Cells', blocks: [{ id: 'block', title: 'Cells', explanation: 'Cells contain DNA.', keyPoints: [], evidence: [] }] }] };
const input = assistRequest(selectAssistBlock(reviewer, 'section', 'block')!, 'example');
const request = (body: unknown = input) => new Request('https://example.test/api/experience/study-assist', { method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks(); mocks.auth.mockResolvedValue({ id: 'verified-owner' });
  mocks.detail.mockResolvedValue({ reviewer }); mocks.saved.mockResolvedValue({ ok: true, value: { version: {} } });
  mocks.source.mockResolvedValue('Original source'); mocks.generate.mockResolvedValue({ ...input, text: 'AI example', createdAt: '2026-09-27T00:00:00Z' });
});
describe('authenticated Study Assist endpoint', () => {
  it('verifies the bearer identity and uses owner-scoped canonical reads', async () => {
    expect((await POST(request())).status).toBe(200);
    expect(mocks.auth).toHaveBeenCalledOnce();
    expect(mocks.detail).toHaveBeenCalledWith('verified-owner', input.reviewerId);
    expect(mocks.client).toHaveBeenCalledWith('test-token');
    expect(mocks.saved).toHaveBeenCalledWith(undefined, 'verified-owner', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(mocks.provider).toHaveBeenCalledWith({ timeoutMs: 45000, maxRetries: 0 });
  });
  it('denies missing/expired auth before reading private content or charging', async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.detail).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('denies deleted/other-owner Reviewers without provider use', async () => {
    mocks.saved.mockResolvedValue({ ok: true, value: null });
    expect((await POST(request())).status).toBe(404); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('rejects stale blocks before looking up provenance or calling the provider', async () => {
    expect((await POST(request({ ...input, contentHash: 'a'.repeat(16) }))).status).toBe(409);
    expect(mocks.source).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('rejects unknown blocks', async () => {
    expect((await POST(request({ ...input, blockId: 'gone' }))).status).toBe(404);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it.each([{ canonicalContent: 'client facts' }, { userId: 'other-owner' }, { studyAssist: 'quiz contamination' }])('rejects extra client context: %j', extra => {
    return POST(request({ ...input, ...extra })).then(response => { expect(response.status).toBe(400); expect(mocks.generate).not.toHaveBeenCalled(); });
  });
  it('bounds request bodies and rejects malformed JSON', async () => {
    expect((await POST(request({ ...input, blockId: 'x'.repeat(3000) }))).status).toBe(400);
    expect((await POST(new Request('https://example.test', { method: 'POST', body: '{bad' }))).status).toBe(400);
  });
  it('returns safe provider failure text without secrets', async () => {
    mocks.generate.mockRejectedValue(new Error('PRIVATE_PROVIDER_SECRET'));
    const response = await POST(request());
    expect(response.status).toBe(503); expect(await response.text()).not.toContain('PRIVATE_PROVIDER_SECRET');
  });
  it('supports preflight and prohibits shared response caching', async () => {
    expect(OPTIONS().status).toBe(204);
    expect((await POST(request())).headers.get('Cache-Control')).toBe('private, no-store');
  });
});
