import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STUDY_LIMITS, STUDY_TOOLS_PROMPT_VERSION, selectAssistBlock, type ReviewerReaderModel } from '@stay-focused/shared';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), detail: vi.fn(), saved: vi.fn(), client: vi.fn(), provider: vi.fn(), generate: vi.fn(), context: vi.fn() }));
vi.mock('@/lib/auth', () => ({ verifyBearerToken: mocks.auth }));
vi.mock('@/lib/canvas-db', () => ({ createCanvasServiceClient: () => ({}) }));
vi.mock('@/lib/experience/service', () => ({ ExperienceService: class { getLibraryArtifact = mocks.detail; } }));
vi.mock('@/lib/reviewer-db', () => ({ createReviewerUserClient: mocks.client }));
vi.mock('@/lib/canonical-reviewers', () => ({ readCanonicalReviewerRecord: mocks.saved }));
vi.mock('@/providers', () => ({ createServerOpenAIProvider: mocks.provider }));
vi.mock('@/lib/study-tools', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/study-tools')>(), buildStudyContext: mocks.context, generateStudyTool: mocks.generate }));
const { POST, OPTIONS } = await import('./route');
const { resetStudyAdmission } = await import('@/lib/study-tools');
const reviewer: ReviewerReaderModel = { id: 'artifact:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', title: 'Cells', course: null,
  source: { id: 'source', title: 'Cells' }, generatedAt: '2026-09-27T00:00:00Z', freshness: 'current',
  sections: [{ id: 'section', title: 'Cells', blocks: [{ id: 'block', title: 'Nucleus', explanation: 'The nucleus contains DNA.', keyPoints: [], evidence: [] }] }] };
const hash = selectAssistBlock(reviewer, 'section', 'block')!.contentHash;
const input = { reviewerId: reviewer.id, sectionId: 'section', blockId: 'block', contentHash: hash, promptVersion: STUDY_TOOLS_PROMPT_VERSION, selection: 'nucleus', action: 'define' };
const request = (body: unknown = input) => new Request('https://example.test/api/experience/study-tools', { method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const context = { reviewerTitle: 'Cells', sectionTitle: 'Cells', block: { title: 'Nucleus', explanation: 'x', keyPoints: [], evidence: [] }, nearby: [], sourceExcerpts: ['DNA'] };
beforeEach(() => {
  vi.clearAllMocks(); resetStudyAdmission(); mocks.auth.mockResolvedValue({ id: 'verified-owner' });
  mocks.detail.mockResolvedValue({ reviewer }); mocks.saved.mockResolvedValue({ ok: true, value: { version: {} } }); mocks.context.mockResolvedValue(context);
  mocks.generate.mockResolvedValue({ action: 'define', outcome: 'answer', grounding: 'source', text: 'The control center.', createdAt: '2026-10-01T00:00:00Z' });
});
describe('authenticated Smart Selection endpoint', () => {
  it('verifies the bearer identity and uses owner-scoped reads', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ grounding: 'source', text: 'The control center.' });
    expect(mocks.detail).toHaveBeenCalledWith('verified-owner', input.reviewerId);
    expect(mocks.client).toHaveBeenCalledWith('test-token');
    expect(mocks.saved).toHaveBeenCalledWith(undefined, 'verified-owner', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ selection: 'nucleus', context, model: 'gpt-5.4-2026-03-05' }));
  });
  it('denies missing auth before reading private content', async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.detail).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('denies another owner\'s or a deleted Reviewer', async () => {
    mocks.saved.mockResolvedValue({ ok: true, value: null });
    expect((await POST(request())).status).toBe(404);
    mocks.detail.mockResolvedValue({ quiz: {} });
    expect((await POST(request())).status).toBe(404);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('rejects unsupported Reviewers and selections outside the block', async () => {
    expect((await POST(request({ ...input, reviewerId: 'reviewer-1' }))).status).toBe(400);
    expect((await POST(request({ ...input, selection: 'not in this Reviewer' }))).status).toBe(400);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('enforces server-side limits even when the client skips them', async () => {
    const tooLarge = await POST(request({ ...input, selection: 'x'.repeat(STUDY_LIMITS.selection * 2 + 1) }));
    expect(tooLarge.status).toBe(422);
    expect((await tooLarge.json()).error).toMatchObject({ code: 'study_selection_too_large', message: 'Select a smaller part of the Reviewer to study.' });
    const longQuestion = await POST(request({ ...input, action: 'ask', question: 'q'.repeat(STUDY_LIMITS.question + 1) }));
    expect((await longQuestion.json()).error.code).toBe('study_question_too_long');
    const turn = { question: 'Why?', answer: 'Because.' };
    expect((await (await POST(request({ ...input, action: 'ask', question: 'More?', followUps: [turn, turn, turn] }))).json()).error.code).toBe('study_follow_up_limit');
    expect((await POST(request({ ...input, selection: 'x'.repeat(STUDY_LIMITS.bodyBytes) }))).status).toBe(400);
    expect(mocks.detail).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('rate limits bursts without signing the student out', async () => {
    for (let index = 0; index < 20; index++) expect((await POST(request())).status).toBe(200);
    const limited = await POST(request());
    expect(limited.status).toBe(429);
    expect((await limited.json()).error).toMatchObject({ code: 'rate_limited', action: 'retry' });
  });
  it('returns safe provider failure text without secrets, logging sizes only', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const { ExperienceFailure } = await import('@/lib/experience/errors');
    mocks.generate.mockRejectedValue(new ExperienceFailure(503, 'unavailable'));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('nucleus');
    expect(JSON.stringify(info.mock.calls)).not.toContain('nucleus');
    expect(info).toHaveBeenCalledWith('study_tools.request', expect.objectContaining({ action: 'define', selectionCharacters: 7 }));
    info.mockRestore();
  });
  it('supports preflight and prohibits shared response caching', async () => {
    expect(OPTIONS().status).toBe(204);
    expect((await POST(request())).headers.get('Cache-Control')).toBe('private, no-store');
  });
});
