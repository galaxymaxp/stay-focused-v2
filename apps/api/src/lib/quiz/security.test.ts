import { PATCH as answerPatch,POST as attemptComplete,GET as attemptGet } from '@/../app/api/experience/quiz-attempts/[...attemptPath]/route';
import { POST as attemptStart,GET as quizGet,DELETE as quizDelete } from '@/../app/api/experience/quizzes/[...quizPath]/route';
import { POST as generate } from '@/../app/api/experience/quizzes/route';
import type { Database,Json } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach,describe,expect,it,vi } from 'vitest';
import type { ExperienceRepository,ExperienceRow,ExperienceTable } from '../experience/repository';
import { ExperienceService } from '../experience/service';
import { candidate,fixturePlan,request as input,validateCandidate } from './fixtures';
import { attemptView,learnerQuestion,resultView,type AttemptRow,type QuizRow } from './service';
import { assembleQuizSources } from './sources';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), client: vi.fn(), prepare: vi.fn(), structure: vi.fn() }));
vi.mock('@/lib/auth', () => ({ verifyBearerToken: mocks.auth }));
vi.mock('@/lib/canvas-db', () => ({ createCanvasServiceClient: mocks.client }));
vi.mock('@/lib/reviewer-db', () => ({ createReviewerUserClient: mocks.client }));
vi.mock('@/lib/canvas-reviewer-sources', () => ({ prepareCanvasReviewerSources: mocks.prepare, structureCanvasReviewerSources: mocks.structure }));
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222', id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const plan = fixturePlan(), questions = plan.allocation.map(s => validateCandidate(candidate(plan, s.id), plan));
const asJson = (v: unknown) => JSON.parse(JSON.stringify(v)) as Json;
const quiz: QuizRow = { id, user_id: A, course_id: id, reviewer_id: null, reviewer_artifact_id: id, source_version_id: null, generation_id: id, title: 'Academic quiz', source_material_ids: asJson(['page:' + id]), question_count: 5, difficulty: 'mixed', questions: asJson(questions.map(learnerQuestion)), created_at: '2026-09-12T00:00:00Z', updated_at: '2026-09-12T00:00:00Z' };
const attempt: AttemptRow = { id, user_id: A, quiz_id: id, request_key: 'test-request', status: 'in_progress', answers: [], started_at: quiz.created_at, completed_at: null, percentage: null, study_state: { currentQuestion: 0, skipped: [], revealed: [] }, updated_at: quiz.created_at };
type Data = Record<string, Record<string, unknown>[]>;
function client(data: Data = {}) {
    return { from: vi.fn((table: string) => {
            const filters: [
                string,
                unknown
            ][] = [];
            const query = { select: vi.fn(), delete: vi.fn(), eq: vi.fn(), is: vi.fn(), order: vi.fn(), limit: vi.fn(), range: vi.fn(), maybeSingle: vi.fn(), then: vi.fn() };
            const rows = () => ({ data: (data[table] ?? []).filter(r => filters.every(([k, v]) => r[k] === v)), error: null });
            query.select.mockReturnValue(query);
            query.delete.mockReturnValue(query);
            query.eq.mockImplementation((key: string, value: unknown) => { filters.push([key, value]); return query; });
            query.is.mockImplementation((key: string, value: unknown) => { filters.push([key, value]); return query; });
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
        () => quizDelete(request('DELETE'), { params: Promise.resolve({ quizPath: [id] }) }),
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
    it.each([1, 2, 3, 4, 5, 6, 7])('denies foreign user on route %i', async (i) => { mocks.auth.mockResolvedValue({ id: B }); const response = await routes[i]!(); expect(response.status).toBeGreaterThanOrEqual(400); expect(await response.text()).not.toContain('correctOptionIds'); });
    it('removes an owned Quiz through the Quiz-only route', async () => {
        expect((await routes[7]!()).status).toBe(200);
        const db = mocks.client.mock.results[0]?.value;
        expect(db.from).toHaveBeenCalledWith('quizzes');
        const query = db.from.mock.results[0]?.value;
        expect(query.delete).toHaveBeenCalled();
        expect(query.eq).toHaveBeenCalledWith('user_id', A);
        expect(query.eq).toHaveBeenCalledWith('id', id);
    });
    it('rejects oversized generation input before source/provider work', async () => { const response = await generate(request('POST', { ...input, padding: 'x'.repeat(5000) })); expect(response.status).toBe(400); expect(mocks.prepare).not.toHaveBeenCalled(); });
    it('normalizes private storage errors', async () => { mocks.client.mockImplementation(() => { throw new Error('Canvas PAT sk-secret provider response'); }); const response = await routes[1]!(); expect(response.status).toBe(503); expect(await response.text()).not.toMatch(/PAT|sk-secret|provider response/); });
});
describe('Quiz source selection', () => {
    const canonical = (owner = A, artifactType = 'reviewer', snapshot = id) => ({
        generated_artifacts: [{ id, user_id: owner, artifact_type: artifactType, latest_version_id: B, deleted_at: null }],
        generated_artifact_versions: [{ id: B, user_id: owner, artifact_id: id, artifact_type: artifactType, source_version_id: A, payload: { reviewer: { sections: [{ id: 'section-1', title: 'Topic', items: [{ id: 'item-1', title: 'Fact', sourceCore: { explanation: 'Persisted Reviewer establishes this fact.', keyPoints: ['Grounded point'], evidence: [] } }] }] } } }],
        source_versions: [{ id: A, user_id: owner, metadata: snapshot ? { reviewerSourceSnapshotId: snapshot } : {} }],
        reviewer_source_snapshots: snapshot ? [{ id: snapshot, user_id: owner, course_id: id, was_edited: false }] : [],
        reviewer_source_snapshot_items: snapshot ? [{ id: B, user_id: owner, source_snapshot_id: snapshot, source_type: 'page', source_row_id: id }] : [],
        canvas_pages: [{ id, user_id: owner, course_id: id, canvas_connection_id: id }],
    });
    it('loads Quiz regions from the owned persisted Reviewer payload', async () => {
        const c = client(canonical());
        const value = await assembleQuizSources(c, A, input);
        expect(value.materialIds).toEqual([`page:${id}`]);
        expect(value.regions).toHaveLength(1);
        expect(value.regions[0]!.text).toContain('Persisted Reviewer');
        expect(value.capacity.maximum).toBe(0);
        expect(value.capacity.topicCount).toBe(0);
        expect(value.reviewerArtifactId).toBe(id);
        expect(mocks.structure).not.toHaveBeenCalled();
    });
    it.each(['text', 'camera', 'local_file'] as const)('uses an owned %s source for the same Quiz capacity and regions', async kind => {
        const data = canonical(A, 'reviewer', '');
        Object.assign(data.source_versions[0]!, { source_text: 'Mitochondria produce ATP. Ribosomes synthesize proteins. Nuclei contain DNA.', metadata: { sourceType: kind, sourceTitle: 'Cell notes' } });
        data.generated_artifact_versions[0]!.payload.reviewer.sections[0]!.items[0]!.sourceCore.keyPoints = ['Mitochondria produce ATP', 'Ribosomes synthesize proteins', 'Nuclei contain DNA'];
        const resolved = await assembleQuizSources(client(data), A, input);
        expect(resolved.courseId).toBeNull();
        expect(resolved.materialIds).toEqual([`source:${A}`]);
        expect(resolved.sourceVersionId).toBe(A);
        expect(resolved.capacity.maximum).toBeGreaterThanOrEqual(5);
        expect(resolved.regions[0]!.sourceRefs[0]!.materialId).toBe(`source:${A}`);
    });
    it('refuses a snapshotless source without a canonical non-Canvas type', async () => {
        const data = canonical(A, 'reviewer', '');
        Object.assign(data.source_versions[0]!, { source_text: 'Some notes' });
        await expect(assembleQuizSources(client(data), A, input)).rejects.toThrow('quiz_source_unavailable');
    });
    it('limits Quiz context to selected owned Reviewer topics', async () => {
        const data = canonical();
        data.generated_artifact_versions[0]!.payload.reviewer.sections.push({ id: 'section-2', title: 'Other topic', items: [{ id: 'item-2', title: 'Other fact', sourceCore: { explanation: 'A different grounded fact.', keyPoints: ['Other point'], evidence: [] } }] });
        const selected = await assembleQuizSources(client(data), A, { ...input, selectedTopicIds: ['section-1'] });
        expect(selected.regions).toHaveLength(1);
        expect(selected.regions[0]!.text).not.toContain('different grounded fact');
        await expect(assembleQuizSources(client(data), A, { ...input, selectedTopicIds: ['section-outside'] })).rejects.toThrow('invalid_request');
    });
    it('Study Assist is invisible to Quiz context, even if unrelated cache data is present', async () => {
        const data = canonical();
        const version = data.generated_artifact_versions[0]!;
        const marker = 'AI_ASSIST_MUST_NEVER_GROUND_QUIZZES';
        Object.assign(version.payload, { studyAssist: marker });
        Object.assign(version.payload.reviewer, { studyAssist: marker });
        Object.assign(version.payload.reviewer.sections[0]!.items[0]!, { studyAssist: marker, enrichment: { analogy: marker } });
        const c = client({ ...data, study_assists: [{ text: marker, user_id: A }] });
        const value = await assembleQuizSources(c, A, input);
        expect(JSON.stringify(value.regions)).not.toContain(marker);
        expect(vi.mocked(c.from).mock.calls.map(call => call[0])).not.toContain('study_assists');
    });
    it('denies a foreign Reviewer artifact', async () => { await expect(assembleQuizSources(client(canonical(B)), A, input)).rejects.toThrow('quiz_source_unavailable'); expect(mocks.structure).not.toHaveBeenCalled(); });
    it('denies a non-Reviewer artifact', async () => { await expect(assembleQuizSources(client(canonical(A, 'summary')), A, input)).rejects.toThrow('quiz_source_unavailable'); });
    it('refuses Reviewer without its durable source relationship', async () => { await expect(assembleQuizSources(client(canonical(A, 'reviewer', '')), A, input)).rejects.toThrow('quiz_source_unavailable'); });
    it('rejects unrelated cross-course multi-material selection', async () => {
        const other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
        const data = canonical();
        const c = client({ ...data, reviewer_source_snapshot_items: [...data.reviewer_source_snapshot_items, { id: other, user_id: A, source_snapshot_id: id, source_type: 'page', source_row_id: other }], canvas_pages: [...data.canvas_pages, { id: other, user_id: A, course_id: other, canvas_connection_id: id }] });
        await expect(assembleQuizSources(c, A, { ...input, sourceType: 'material', sourceIds: [`page:${id}`, `page:${other}`], reviewerArtifactId: id })).rejects.toThrow('quiz_source_unavailable');
    });
});
describe('Quiz Library and weak areas', () => {
    it('Library reopens persisted quiz with history without generation and filters other owners', async () => {
        const repository: ExperienceRepository = { async rows<T extends ExperienceTable>(table: T) { return (table === 'quizzes' ? [quiz] : table === 'quiz_attempts' ? [{ ...attempt, status: 'completed', percentage: 80 }] : []) as unknown as ExperienceRow<T>[]; } };
        const service = new ExperienceService({ repository, materials: vi.fn() });
        const library = await service.getLibrary(A, { type: 'quiz' });
        expect(library.items[0]).toMatchObject({ id: `quiz:${id}`, type: 'quiz', quiz: { attemptCount: 1, latestScore: 80 } });
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
