import { beforeEach, expect, it, vi } from 'vitest';
import { selectTopic, TOPIC_ACTIONS, type ReviewerReaderModel } from '@stay-focused/shared';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), detail: vi.fn(), saved: vi.fn(), client: vi.fn(), provider: vi.fn(), generate: vi.fn(), image: vi.fn(), context: vi.fn() }));
vi.mock('@/lib/study-image',()=>({resolveStudyImage:mocks.image}));
vi.mock('@/lib/auth', () => ({ verifyBearerToken: mocks.auth }));
vi.mock('@/lib/canvas-db', () => ({ createCanvasServiceClient: () => ({}) }));
vi.mock('@/lib/experience/service', () => ({ ExperienceService: class { getLibraryArtifact = mocks.detail; } }));
vi.mock('@/lib/reviewer-db', () => ({ createReviewerUserClient: mocks.client }));
vi.mock('@/lib/canonical-reviewers', () => ({ readCanonicalReviewerRecord: mocks.saved }));
vi.mock('@/providers', () => ({ createServerOpenAIProvider: mocks.provider }));

const { POST, OPTIONS } = await import('./route');
const { resetStudyAdmission } = await import('@/lib/study-tools');
const reviewer: ReviewerReaderModel = { id: 'artifact:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', title: 'Cells', course: null,
  source: { id: 'source', title: 'Cells' }, generatedAt: '2026-09-27T00:00:00Z', freshness: 'current',
  sections: [{ id: 'section', title: 'Cells', blocks: [{ id: 'block', title: 'Nucleus', explanation: 'The nucleus contains DNA.', keyPoints: [], evidence: [] }] }] };
const selection = selectTopic(reviewer, 'section')!;
const input = { reviewerId: reviewer.id, sectionId: 'section', action: 'topic_simplify' };
const request = (body: unknown = input) => new Request('https://example.test/api/experience/study-tools', { method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const context = { reviewerTitle: 'Cells', sectionTitle: 'Cells', block: { title: 'Nucleus', explanation: 'x', keyPoints: [], evidence: [] }, nearby: [], sourceExcerpts: ['DNA'] };
beforeEach(() => {
  vi.clearAllMocks(); resetStudyAdmission(); mocks.auth.mockResolvedValue({ id: 'verified-owner' });
  mocks.detail.mockResolvedValue({ reviewer }); mocks.saved.mockResolvedValue({ ok: true, value: { version: {} } }); mocks.context.mockResolvedValue(context);
  mocks.provider.mockReturnValue({ generate: mocks.generate }); mocks.generate.mockResolvedValue({ text: 'Lead\n- **DNA** is inside.' });
});
it('verifies auth and owner reads before every cache lookup; preserves canonical content', async () => {
  const before = JSON.stringify(reviewer);
  for (const action of TOPIC_ACTIONS) {
    for (let i = 0; i < 2; i++) expect((await POST(request({ ...input, action }))).status).toBe(200);
  }
  expect(mocks.generate).toHaveBeenCalledTimes(3);
  expect(mocks.detail).toHaveBeenCalledWith('verified-owner', reviewer.id);
  expect(mocks.saved).toHaveBeenCalledWith(undefined, 'verified-owner', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  expect(JSON.stringify(reviewer)).toBe(before);
  mocks.saved.mockResolvedValue({ ok: true, value: null });
  expect((await POST(request())).status).toBe(404); expect(mocks.generate).toHaveBeenCalledTimes(3);
});
it('denies missing auth and another owner reviewer/section before generation', async () => {
  mocks.auth.mockResolvedValue(null); expect((await POST(request())).status).toBe(401); expect(mocks.detail).not.toHaveBeenCalled();
  mocks.auth.mockResolvedValue({ id: 'other-owner' }); mocks.saved.mockResolvedValue({ ok: true, value: null });
  expect((await POST(request())).status).toBe(404);
  expect((await POST(request({ ...input, sectionId: 'another-users-section' }))).status).toBe(404);
  mocks.detail.mockResolvedValue({ quiz: {} }); expect((await POST(request())).status).toBe(404);
  expect(mocks.generate).not.toHaveBeenCalled();
});
it('rejects Original and client text; responses are private and preflight works', async () => {
  expect((await POST(request({ ...input, action: 'original' }))).status).toBe(400);
  expect((await POST(request({ ...input, text: selection.canonicalContent }))).status).toBe(400);
  mocks.auth.mockResolvedValue({ id: 'fresh-owner' });
  expect((await POST(request())).headers.get('Cache-Control')).toBe('private, no-store');
  expect(OPTIONS().status).toBe(204);
});
it('new owner uncached topics share the existing burst guard and safe logs', async () => {
  mocks.auth.mockResolvedValue({ id: 'limited-owner' });
  const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
  for (let i = 0; i < 21; i++) {
    const sectionId = 'section-' + i;
    mocks.detail.mockResolvedValue({ reviewer: { ...reviewer, sections: [{ ...reviewer.sections[0]!, id: sectionId }] } });
    expect((await POST(request({ ...input, sectionId }))).status).toBe(i < 20 ? 200 : 429);
  }
  expect(mocks.generate).toHaveBeenCalledTimes(20);
  expect(JSON.stringify(info.mock.calls)).not.toContain('nucleus'); info.mockRestore();
});
