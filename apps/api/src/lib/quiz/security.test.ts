import { beforeEach, describe, it, expect, vi } from 'vitest';
import type { Database, Json } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExperienceRepository, ExperienceRow, ExperienceTable } from '../experience/repository';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), client: vi.fn(), prepare: vi.fn(), structure: vi.fn() }));
vi.mock('@/lib/auth', () => ({ verifyBearerToken: mocks.auth }));
vi.mock('@/lib/canvas-db', () => ({ createCanvasServiceClient: mocks.client }));
vi.mock('@/lib/reviewer-db', () => ({ createReviewerUserClient: mocks.client }));
vi.mock('@/lib/canvas-reviewer-sources', () => ({ prepareCanvasReviewerSources: mocks.prepare, structureCanvasReviewerSources: mocks.structure }));
import { GET as quizGet, POST as attemptStart } from '@/../app/api/experience/quizzes/[...quizPath]/route';
import { POST as generate } from '@/../app/api/experience/quizzes/route';
import { GET as attemptGet, PATCH as answerPatch, POST as attemptComplete } from '@/../app/api/experience/quiz-attempts/[...attemptPath]/route';
import { assembleQuizSources } from './sources';
import { fixturePlan, candidate, request as input } from './fixtures';
import { validateCandidate } from './generation';
import { learnerQuestion, attemptView, resultView, type QuizRow, type AttemptRow } from './service';
import { ExperienceService } from '../experience/service';
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222', id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const plan = fixturePlan(), questions = plan.allocation.map(s => validateCandidate(candidate(plan, s.id), plan));
const asJson = (v: unknown) => JSON.parse(JSON.stringify(v)) as Json;
const quiz: QuizRow = { id, user_id: A, course_id: id, reviewer_id: null, generation_id: id, title: 'Academic quiz', source_material_ids: asJson(input.sourceIds), question_count: 5, difficulty: 'mixed', questions: asJson(questions.map(learnerQuestion)), created_at: '2026-09-12T00:00:00Z', updated_at: '2026-09-12T00:00:00Z' };
const attempt: AttemptRow = { id, user_id: A, quiz_id: id, request_key: 'test-request', status: 'in_progress', answers: [], started_at: quiz.created_at, completed_at: null, percentage: null };
type Data = Record<string, Record<string, unknown>[]>;
function client(data: Data = {}) {
    return { from: vi.fn((table: string) => {
            const filters: [
                string,
                unknown
            ][] = [];
            const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(), range: vi.fn(), maybeSingle: vi.fn(), then: vi.fn() };
            const rows = () => ({ data: (data[table] ?? []).filter(r => filters.every(([k, v]) => r[k] === v)), error: null });
            query.select.mockReturnValue(query);
            query.eq.mockImplementation((key: string, value: unknown) => { filters.push([key, value]); return query; });
            query.order.mockReturnValue(query);
            query.limit.mockImplementation(async () => rows());
            query.range.mockImplementation(async () => rows());
            query.maybeSingle.mockImplementation(async () => ({ ...rows(), data: rows().data[0] ?? null }));
            query.then.mockImplementation((resolve: (v: unknown) => unknown) => resolve(rows()));
            return query;
        }), rpc: vi.fn(async () => ({ data: null, error: { message: 'quiz_attempt_not_found' } })) } as unknown as SupabaseClient<Database>;
}
const request = (method = 'GET', body?: unknown) => new Request('https://example.test/api/experience/quizzes', { method, headers: { authorization: 'Bearer test', 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue({ id: A }); mocks.client.mockReturnValue(client({ quizzes: [quiz], quiz_attempts: [attempt], quiz_keys: [{ quiz_id: id, user_id: A, questions }] })); });
describe('Quiz authenticated HTTP surfaces', () => {
    const routes = [
        () => generate(request('POST', input)), () => quizGet(request(), { params: Promise.resolve({ quizPath: [id] }) }),
        () => attemptStart(request('POST'), { params: Promise.resolve({ quizPath: [id, 'attempts'] }) }),
        () => attemptGet(request(), { params: Promise.resolve({ attemptPath: [id] }) }),
        () => attemptGet(request(), { params: Promise.resolve({ attemptPath: [id, 'result'] }) }),
        () => answerPatch(request('PATCH', { selectedOptionIds: ['a'], finalize: true }), { params: Promise.resolve({ attemptPath: [id, 'answers', 'q1'] }) }),
        () => attemptComplete(request('POST'), { params: Promise.resolve({ attemptPath: [id, 'complete'] }) }),
        () => quizGet(request(), { params: Promise.resolve({ quizPath: [id, 'attempts'] }) }),
    ];
    it.each(routes.map((run, i) => [i, run] as const))('requires verified JWT on route %i', async (_i, run) => { mocks.auth.mockResolvedValue(null); const response = await run(); expect(response.status).toBe(401); expect(mocks.client).not.toHaveBeenCalled(); });
    it('quiz and unanswered attempt serialization have no key/evidence/validation hints', async () => {
        for (const response of [await routes[1]!(), await routes[3]!()]) {
            expect(response.status).toBe(200);
            expect(response.headers.get('cache-control')).toContain('no-store');
            const body = await response.text();
            for (const key of ['correctOptionIds', 'correctValues', 'answerKey', 'sourceEvidence', 'explanation', 'validation', 'provenance'])
                expect(body).not.toContain(key);
        }
    });
    it('incomplete result reveals nothing', async () => { const response = await routes[4]!(); expect(response.status).toBe(409); expect(await response.text()).not.toContain('correctOptionIds'); });
    it('history is owner/quiz scoped and serializes shared completion metadata without keys', async () => {
        const completedAt = '2026-10-02T12:30:00Z';
        mocks.client.mockReturnValue(client({ quizzes: [quiz], quiz_attempts: [
            { ...attempt, status: 'completed', completed_at: completedAt, percentage: 0 },
            { ...attempt, id: 'foreign-active', user_id: B },
            { ...attempt, id: 'foreign-score', user_id: B, status: 'completed', completed_at: '2026-10-03T00:00:00Z', percentage: 100 },
            { ...attempt, id: 'unrelated', quiz_id: B },
        ] }));
        const response = await quizGet(request(), { params: Promise.resolve({ quizPath: [id, 'attempts'] }) });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ ok: true, data: [{ id, quizId: id, status: 'completed', startedAt: attempt.started_at, completedAt, percentage: 0 }] });
        const projection = await quizGet(request(), { params: Promise.resolve({ quizPath: [id] }) });
        expect(await projection.json()).toMatchObject({ ok: true, data: { learningState: 'completed', activeAttemptId: null, attemptCount: 1, completedAttemptCount: 1, bestScore: 0, latestScore: 0, latestCompletedAt: completedAt } });
        mocks.auth.mockResolvedValue({ id: B });
        expect((await quizGet(request(), { params: Promise.resolve({ quizPath: [id, 'attempts'] }) })).status).toBe(404);
    });
    it.each([1, 2, 3, 4, 5, 6, 7])('denies foreign user on route %i', async (i) => { mocks.auth.mockResolvedValue({ id: B }); const response = await routes[i]!(); expect(response.status).toBeGreaterThanOrEqual(400); expect(await response.text()).not.toContain('correctOptionIds'); });
    it('rejects oversized generation input before source/provider work', async () => { const response = await generate(request('POST', { ...input, padding: 'x'.repeat(5000) })); expect(response.status).toBe(400); expect(mocks.prepare).not.toHaveBeenCalled(); });
    it('normalizes private storage errors', async () => { mocks.client.mockImplementation(() => { throw new Error('Canvas PAT sk-secret provider response'); }); const response = await routes[1]!(); expect(response.status).toBe(503); expect(await response.text()).not.toMatch(/PAT|sk-secret|provider response/); });
});
describe('Quiz source selection', () => {
    it('uses owned prepared material blocks, never course-wide sources', async () => {
        const c = client({ canvas_pages: [{ id, user_id: A, course_id: id, canvas_connection_id: id }] });
        mocks.structure.mockResolvedValue({ ok: true, value: { sources: [{ title: 'Topic', blocks: [{ id: 'b', kind: 'paragraph', text: 'Academic source contains a meaningful factual statement.', selectable: true }] }] } });
        const value = await assembleQuizSources(c, A, input);
        expect(value.materialIds).toEqual(input.sourceIds);
        expect(value.regions).toHaveLength(1);
        expect(mocks.structure).toHaveBeenCalledWith({ client: c, userId: A, courseId: id, sourceIds: input.sourceIds });
    });
    it('denies a foreign material before preparation', async () => { await expect(assembleQuizSources(client({ canvas_pages: [{ id, user_id: B, course_id: id, canvas_connection_id: id }] }), A, input)).rejects.toThrow('quiz_source_unavailable'); expect(mocks.structure).not.toHaveBeenCalled(); });
    it('does not use reviewer prose as source evidence', async () => {
        const c = client({ reviewers: [{ id, user_id: A, source_snapshot_id: id, reviewer_output: { sections: [{ id: 'section-1', title: 'Topic' }] } }], reviewer_source_snapshots: [{ id, user_id: A, course_id: id, was_edited: false }], reviewer_source_snapshot_items: [{ id, user_id: A, source_snapshot_id: id, source_type: 'page', source_row_id: id }], canvas_pages: [{ id, user_id: A, course_id: id, canvas_connection_id: id }] });
        mocks.structure.mockResolvedValue({ ok: true, value: { sources: [{ title: 'Topic', blocks: [{ id: 'b', kind: 'paragraph', text: 'The underlying prepared source establishes this fact.', selectable: true }] }] } });
        const value = await assembleQuizSources(c, A, { ...input, sourceType: 'reviewer', sourceIds: [id] });
        expect(value.regions[0]!.text).toContain('underlying prepared source');
        expect(value.reviewerId).toBe(id);
    });
    it('refuses reviewer without original source relationship', async () => { await expect(assembleQuizSources(client({ reviewers: [{ id, user_id: A, source_snapshot_id: null, reviewer_output: { invented: 'facts' } }] }), A, { ...input, sourceType: 'reviewer', sourceIds: [id] })).rejects.toThrow('quiz_source_unavailable'); });
    it('rejects unrelated cross-course multi-material selection', async () => {
        const other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
        const c = client({ canvas_pages: [{ id, user_id: A, course_id: id, canvas_connection_id: id }, { id: other, user_id: A, course_id: other, canvas_connection_id: id }] });
        await expect(assembleQuizSources(c, A, { ...input, sourceIds: [...input.sourceIds, `page:${other}`] })).rejects.toThrow('quiz_source_unavailable');
    });
});
describe('Quiz Library and weak areas', () => {
    it('Library reopens persisted quiz with history without generation and filters other owners', async () => {
        const repository: ExperienceRepository = { async rows<T extends ExperienceTable>(table: T) { return (table === 'quizzes' ? [quiz] : table === 'quiz_attempts' ? [{ ...attempt, status: 'completed', completed_at: '2026-09-12T12:00:00Z', percentage: 80 }, { ...attempt, user_id: B, id: 'foreign', percentage: 100 }] : []) as unknown as ExperienceRow<T>[]; } };
        const service = new ExperienceService({ repository, materials: vi.fn() });
        const library = await service.getLibrary(A, { type: 'quiz' });
        expect(library.items[0]).toMatchObject({ id: `quiz:${id}`, type: 'quiz', status: 'completed', quiz: { learningState: 'completed', activeAttemptId: null, attemptCount: 1, latestScore: 80, bestScore: 80, latestCompletedAt: '2026-09-12T12:00:00Z' } });
        expect(await service.getLibraryArtifact(A, `quiz:${id}`)).toMatchObject({ quiz: { id, questionCount: 5 } });
        expect((await service.getLibrary(B)).items).toEqual([]);
        await expect(service.getLibraryArtifact(B, `quiz:${id}`)).rejects.toThrow('not_found');
        expect(mocks.structure).not.toHaveBeenCalled();
    });
    it.each([0, 1, 2, 3, 4, 5])('computes repeated-topic threshold with %i misses', misses => {
        const grouped = questions.map(q => ({ ...q, topicId: 'topic', topic: 'Source topic' }));
        const a = { ...attempt, status: 'completed', completed_at: quiz.created_at, answers: asJson(grouped.map((q, i) => ({ questionId: q.id, selectedOptionIds: i < misses ? ['b'] : q.correctOptionIds, finalizedAt: quiz.created_at }))) };
        const result = resultView(attemptView(a, grouped), grouped);
        expect(result.percentage).toBe((5 - misses) * 20);
        expect(result.weakAreas).toHaveLength(misses >= 3 ? 1 : 0);
        if (misses >= 3)
            expect(result.weakAreas[0]!.kind).toBe('weak_area');
    });
    it('single missed item is a missed topic, and perfect quiz has no weak areas', () => {
        const build = (miss: boolean) => ({ ...attempt, status: 'completed', completed_at: quiz.created_at, answers: asJson(questions.map((q, i) => ({ questionId: q.id, selectedOptionIds: miss && i === 1 ? ['a'] : q.correctOptionIds, finalizedAt: quiz.created_at }))) });
        expect(resultView(attemptView(build(true), questions), questions).weakAreas).toMatchObject([{ kind: 'missed_topic', asked: 1, missed: 1 }]);
        expect(resultView(attemptView(build(false), questions), questions).weakAreas).toEqual([]);
    });
});
