import { createServerOpenAIProvider } from '@/providers';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll,beforeAll,describe,expect,it } from 'vitest';
import { structuredBlockText,type StructuredDocument } from '../../../../../packages/engine/src/structured-document';
import type { ExperienceRepository,ExperienceRow,ExperienceTable } from '../experience/repository';
import { ExperienceService } from '../experience/service';
import { generateQuizSet } from './ai-first';
import { candidate,fixturePlan,makeQuizPlan,request,validateCandidate } from './fixtures';
import { attemptView,learnerQuestion,quizView,resultView,type AttemptRow,type QuizRow } from './service';
import { regionsFromBlocks } from './sources';
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
const course = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', reviewer = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
let db: PGlite, quizId: string, jobId: string;
const plan = fixturePlan(), questions = plan.allocation.map(s => validateCandidate(candidate(plan, s.id), plan));
const payload = { courseId: course, reviewerArtifactId: reviewer, sourceVersionId: 'ffffffff-ffff-4fff-8fff-ffffffffffff', title: 'Safe course quiz', materialIds: request.sourceIds, questions, provenance: { plan, policy: 'test' } };
const migration = (name: string) => readFileSync(resolve('../../packages/db/migrations', name), 'utf8');
async function asRole<T>(role: string, user: string, action: () => Promise<T>) {
    await db.exec(`begin;set local role ${role};select set_config('request.jwt.claim.sub','${user}',true);`);
    try {
        return await action();
    }
    finally {
        await db.exec('rollback');
    }
}
async function queue(key: string) {
    return (await db.query<{
        id: string;
    }>('select id from create_quiz_processing_job($1,$2,$3,$4,$5)', [A, course, reviewer, key, JSON.stringify(request)])).rows[0]!.id;
}
async function finish(id: string) { await db.query("update processing_jobs set status='running',lease_owner='worker',lease_expires_at=now()+interval '5 minutes' where id=$1", [id]); await db.query('select * from complete_quiz_processing_job($1,$2,$3,$4)', [id, 'worker', 'quiz_generation', JSON.stringify(payload)]); }
async function start(key: string, user = A) { return (await db.query<AttemptRow>('select * from start_quiz_attempt($1,$2,$3)', [user, quizId, key])).rows[0]!; }
async function answer(id: string, q: string, selected: string[], finalize = true, user = A) { return (await db.query<AttemptRow>('select * from save_quiz_answer($1,$2,$3,$4,$5)', [user, id, q, JSON.stringify(selected), finalize])).rows[0]!; }
async function complete(id: string, abandon = false, user = A) { return (await db.query<AttemptRow>('select * from complete_quiz_attempt($1,$2,$3)', [user, id, abandon])).rows[0]!; }
beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role bypassrls;
    create table auth.users(id uuid primary key);insert into auth.users values('${A}'),('${B}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to authenticated,anon,service_role;
    create table canvas_courses(id uuid primary key,user_id uuid references auth.users(id) on delete cascade);
    insert into canvas_courses values('${course}','${A}');
    create table reviewers(id uuid primary key,user_id uuid references auth.users(id) on delete cascade);
    create table source_versions(id uuid primary key,user_id uuid not null,character_count integer not null,metadata jsonb not null,unique(id,user_id));
    create table generated_artifacts(id uuid primary key,user_id uuid not null,artifact_type text not null,safe_title text not null,source_version_id uuid not null,latest_version_id uuid,metadata jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),deleted_at timestamptz,unique(id,user_id));
    create table generated_artifact_versions(id uuid primary key,user_id uuid not null,artifact_id uuid not null,artifact_type text not null,source_version_id uuid not null,payload jsonb not null,unique(id,user_id));
    create table reviewer_source_snapshots(id uuid primary key,user_id uuid not null,course_id uuid not null,was_edited boolean not null,unique(id,user_id));
    insert into reviewer_source_snapshots values('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','${A}','${course}',false);
    insert into source_versions values('ffffffff-ffff-4fff-8fff-ffffffffffff','${A}',42,'{"reviewerSourceSnapshotId":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"}');
    insert into generated_artifacts(id,user_id,artifact_type,safe_title,source_version_id) values('${reviewer}','${A}','reviewer','Safe Reviewer','ffffffff-ffff-4fff-8fff-ffffffffffff');
    insert into generated_artifact_versions values('99999999-9999-4999-8999-999999999999','${A}','${reviewer}','reviewer','ffffffff-ffff-4fff-8fff-ffffffffffff','{"reviewer":{"id":"persisted-reviewer"}}');
    update generated_artifacts set latest_version_id='99999999-9999-4999-8999-999999999999' where id='${reviewer}';
    create table canvas_assignments(id uuid primary key,user_id uuid,course_id uuid,canvas_connection_id uuid,name text,unique(id,user_id,canvas_connection_id,course_id));
    create table processing_policy_config(id text primary key,max_queued_generation_jobs_per_user int,max_daily_generation_jobs int,event_retention_days int,failed_job_retention_days int,completed_job_retention_days int);
    insert into processing_policy_config values('default',100,1000,7,7,7);`);
    await db.exec(migration('20260722225243_durable_processing_jobs.sql').split('create table public.processing_job_events')[0]!.replace('create extension if not exists pgcrypto;', ''));
    await db.exec('create table processing_job_events(id uuid primary key,created_at timestamptz,delivered_at timestamptz,delivery_eligible boolean);create table processing_cleanup_queue(status text,not_before timestamptz);');
    await db.exec(migration('20260912100000_activity_maker.sql'));
    await db.exec(migration('20260912110000_quiz_maker.sql'));
    await db.exec(migration('20260923000000_canonical_reviewer_artifacts.sql'));
    await db.exec(migration('20260927140343_quiz_100_items.sql'));
    await db.exec(migration('20260928131426_quiz_study_state.sql'));
    await db.exec(migration('20260928131513_matching_blocks.sql'));
    await db.exec(migration('20260928134856_quiz_clear_drafts.sql'));
    await db.exec('alter table processing_job_sources add column source_version_id uuid;alter table processing_jobs add column source_version_id uuid;');
    await db.exec(migration('20260928100000_canonical_non_canvas_sources.sql'));
    await db.exec(migration('20260928143546_quiz_matching_public_projection.sql'));
    await db.exec(migration('20261009071002_quiz_two_pair_matching.sql'));
    jobId = await queue('quiz-generation-1');
    await finish(jobId);
    quizId = (await db.query<{
        id: string;
    }>('select id from quizzes where generation_id=$1', [jobId])).rows[0]!.id;
}, 30000);
afterAll(async () => { await db?.close(); });
describe('Quiz real Postgres transactions, RLS and history', () => {
    it('completes an already accepted Canvas Quiz from an older worker payload', async () => {
        await db.exec('begin');
        try {
            const olderJob = await queue('older-canvas-worker');
            await db.query("update processing_jobs set status='running',lease_owner='worker',lease_expires_at=now()+interval '5 minutes' where id=$1", [olderJob]);
            const olderPayload: Partial<typeof payload> = { ...payload };
            delete olderPayload.sourceVersionId;
            await db.query('select * from complete_quiz_processing_job($1,$2,$3,$4)', [olderJob, 'worker', 'quiz_generation', JSON.stringify(olderPayload)]);
            expect((await db.query<QuizRow>('select * from quizzes where generation_id=$1', [olderJob])).rows[0]!.source_version_id).toBe('ffffffff-ffff-4fff-8fff-ffffffffffff');
        } finally { await db.exec('rollback'); }
    });
    it('accepts an owned imported source without a Canvas course and binds its Quiz to the same source', async () => {
        const sourceId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
        const artifactId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
        const versionId = '88888888-8888-4888-8888-888888888888';
        await db.exec('begin');
        try {
            await db.query('insert into source_versions values($1,$2,$3,$4)', [sourceId, A, 80, JSON.stringify({ sourceType: 'text', sourceTitle: 'Own notes' })]);
            await db.query("insert into generated_artifacts(id,user_id,artifact_type,safe_title,source_version_id) values($1,$2,'reviewer','Own notes',$3)", [artifactId, A, sourceId]);
            await db.query("insert into generated_artifact_versions values($1,$2,$3,'reviewer',$4,$5)", [versionId, A, artifactId, sourceId, JSON.stringify({ reviewer: { id: 'own-reviewer' } })]);
            await db.query('update generated_artifacts set latest_version_id=$1 where id=$2', [versionId, artifactId]);
            const localRequest = { ...request, sourceIds: [artifactId], reviewerArtifactId: artifactId };
            const localPayload = { ...payload, courseId: null, reviewerArtifactId: artifactId, sourceVersionId: sourceId, materialIds: [`source:${sourceId}`] };
            await db.exec('savepoint other_user');
            await expect(db.query('select * from create_quiz_processing_job($1,$2,$3,$4,$5)', [B, null, artifactId, 'other-user-local', JSON.stringify(localRequest)])).rejects.toThrow('quiz_source_unavailable');
            await db.exec('rollback to savepoint other_user');
            const localJob = (await db.query<{ id: string }>('select id from create_quiz_processing_job($1,$2,$3,$4,$5)', [A, null, artifactId, 'owner-local-quiz', JSON.stringify(localRequest)])).rows[0]!.id;
            await db.query("update processing_jobs set status='running',lease_owner='worker',lease_expires_at=now()+interval '5 minutes' where id=$1", [localJob]);
            await db.query('select * from complete_quiz_processing_job($1,$2,$3,$4)', [localJob, 'worker', 'quiz_generation', JSON.stringify(localPayload)]);
            const saved = (await db.query<QuizRow>('select * from quizzes where generation_id=$1', [localJob])).rows[0]!;
            expect(saved.course_id).toBeNull();
            expect(saved.source_version_id).toBe(sourceId);
            expect(saved.user_id).toBe(A);
            expect(saved.source_material_ids).toEqual([`source:${sourceId}`]);
            await expect(db.query('update quizzes set user_id=$1 where id=$2', [B, saved.id])).rejects.toThrow();
        } finally { await db.exec('rollback'); }
    });
    it('removes only the owner Quiz and its keys while preserving the source Reviewer', async () => {
        await db.exec('begin');
        try {
            expect((await db.query('delete from quizzes where id=$1 and user_id=$2 returning id', [quizId, B])).rows).toHaveLength(0);
            expect((await db.query('delete from quizzes where id=$1 and user_id=$2 returning id', [quizId, A])).rows).toHaveLength(1);
            expect((await db.query('select quiz_id from quiz_keys where quiz_id=$1', [quizId])).rows).toHaveLength(0);
            expect((await db.query('select id from generated_artifacts where id=$1', [reviewer])).rows).toHaveLength(1);
        } finally { await db.exec('rollback'); }
    });
    it('publishes Matching labels without private associations through the actual completion RPC', async () => {
        await db.exec('begin');
        try {
            const id = await queue('matching-publication');
            const matching = { ...questions[4]!, type: 'matching' as const, leftItem: '',
                matchingPairs: [
                    { id: 'p1', leftItem: 'Confidentiality', rightOptionId: 'a' },
                    { id: 'p2', leftItem: 'Integrity', rightOptionId: 'b' },
                    { id: 'p3', leftItem: 'Availability', rightOptionId: 'c' },
                ], matchingAnswers: [{ id: 'p1', rightOptionId: 'a' }, { id: 'p2', rightOptionId: 'b' }, { id: 'p3', rightOptionId: 'c' }],
                correctOptionIds: ['p1:a', 'p2:b', 'p3:c'] };
            const generated = { ...payload, questions: [...questions.slice(0, 4), matching] };
            await db.query("update processing_jobs set status='running',lease_owner='worker',lease_expires_at=now()+interval '5 minutes' where id=$1", [id]);
            await db.query('select * from complete_quiz_processing_job($1,$2,$3,$4)', [id, 'worker', 'quiz_generation', JSON.stringify(generated)]);
            const row = (await db.query<QuizRow>('select * from quizzes where generation_id=$1', [id])).rows[0]!;
            const learner = quizView(row).questions[4]!;
            expect(learner.matchingPairs).toEqual(matching.matchingPairs.map(({ id, leftItem }) => ({ id, leftItem })));
            expect(learner.selectionInstruction).toBe('Match each term to one meaning.');
            const serialized = JSON.stringify(row.questions);
            for (const field of ['rightOptionId', 'matchingAnswers', 'correctOptionIds', 'explanation', 'sourceRefs']) expect(serialized).not.toContain(field);
            const key = (await db.query<{ questions: unknown }>('select questions from quiz_keys where quiz_id=$1', [row.id])).rows[0]!;
            expect(key.questions).toEqual(generated.questions);
            expect((await db.query('select id from quizzes where generation_id=$1', [id])).rows).toHaveLength(1);
        } finally { await db.exec('rollback'); }
    });
    it('stores 100 questions without truncating the learner projection or private key', async () => {
        await db.exec('begin');
        try {
            const hundred = Array.from({ length: 100 }, (_, index) => ({ ...questions[index % questions.length]!, id: `q${index + 1}` }));
            await db.query('update quizzes set question_count=100,questions=$1 where id=$2', [JSON.stringify(hundred.map(learnerQuestion)), quizId]);
            await db.query('update quiz_keys set questions=$1 where quiz_id=$2', [JSON.stringify(hundred), quizId]);
            expect((await db.query<QuizRow>('select * from quizzes where id=$1', [quizId])).rows[0]!.question_count).toBe(100);
            expect((await db.query<{ questions: unknown[] }>('select questions from quiz_keys where quiz_id=$1', [quizId])).rows[0]!.questions).toHaveLength(100);
            const hundredAttempt = await start('hundred-question-attempt');
            for (const question of hundred) await answer(hundredAttempt.id, question.id, question.correctOptionIds);
            expect(Number((await complete(hundredAttempt.id)).percentage)).toBe(100);
        } finally { await db.exec('rollback'); }
    });
    it('accepts and scores identification, modified true or false, and matching', async () => {
        await db.exec('begin');
        try {
            const variants = questions.map((question, index) => {
                if (index === 1) return { ...question, type: 'identification', prompt: 'Name the CIA triad.', options: [], correctOptionIds: ['CIA triad'], acceptedAnswers: ['CIA triad'], selectionInstruction: 'Type the term.' };
                if (index === 3) return { ...question, type: 'modified_true_false', prompt: 'Availability prevents unauthorized disclosure.', options: [{ id: 'a', text: 'True' }, { id: 'b', text: 'False' }], correctOptionIds: ['b', 'confidentiality'], acceptedAnswers: ['confidentiality'], incorrectTerm: 'Availability', selectionInstruction: 'Mark true, or mark false and correct the wrong term.' };
                if (index === 4) return { ...question, type: 'matching', leftItem: 'Confidentiality', prompt: 'Match the term to its meaning.', options: [{ id: 'a', text: 'Accuracy' }, { id: 'b', text: 'Access' }, { id: 'c', text: 'Protection from unauthorized disclosure' }, { id: 'd', text: 'Uptime' }], correctOptionIds: ['c'], selectionInstruction: 'Match the term to its meaning.' };
                return question;
            });
            const formatJob = await queue('five-format-generation');
            await db.query("update processing_jobs set status='running',lease_owner='worker',lease_expires_at=now()+interval '5 minutes' where id=$1", [formatJob]);
            await db.query('select * from complete_quiz_processing_job($1,$2,$3,$4)', [formatJob, 'worker', 'quiz_generation', JSON.stringify({ ...payload, questions: variants })]);
            const formatQuizId = (await db.query<{ id: string }>('select id from quizzes where generation_id=$1', [formatJob])).rows[0]!.id;
            const attempt = (await db.query<AttemptRow>('select * from start_quiz_attempt($1,$2,$3)', [A, formatQuizId, 'five-format-attempt'])).rows[0]!;
            for (const [index, question] of variants.entries()) await answer(attempt.id, question.id, index === 1 ? ['CIA triad'] : index === 3 ? ['b', 'confidentiality'] : question.correctOptionIds);
            const done = await complete(attempt.id);
            expect(Number(done.percentage)).toBe(100);
            const publicQuestions = (await db.query<QuizRow>('select * from quizzes where id=$1', [formatQuizId])).rows[0]!.questions as unknown as Record<string, unknown>[];
            expect(publicQuestions[1]).not.toHaveProperty('correctOptionIds');
            expect(publicQuestions[3]).not.toHaveProperty('acceptedAnswers');
            expect(publicQuestions[4]).toHaveProperty('leftItem', 'Confidentiality');
        } finally { await db.exec('rollback'); }
    });
    it.skipIf(process.env.B24_7_LIVE !== '1').each(['statistics', 'it-security'])('limited live %s: generation, SQL attempts and Library reopen', async (name) => {
        if (process.env.B24_7_ENV_FILE)
            process.loadEnvFile(process.env.B24_7_ENV_FILE);
        const provider = createServerOpenAIProvider();
        const stats = JSON.parse(readFileSync(process.env.B24_7_STATS_FILE!, 'utf8')) as StructuredDocument;
        const statsRegions = regionsFromBlocks(request.sourceIds[0]!, stats.title ?? 'Statistics', stats.pages.flatMap(p => p.blocks.filter(b => !b.role || b.role === 'content').map(b => ({ id: b.id, kind: b.type, text: structuredBlockText(b), page: p.pageNumber }))));
        const security = readFileSync(resolve('../../packages/engine/scripts/fixtures/it-security.txt'), 'utf8');
        const securityRegions = regionsFromBlocks(request.sourceIds[0]!, 'IT Security', [{ id: 'source-body', kind: 'paragraph', text: security }]);
        const regions = name === 'statistics' ? statsRegions : securityRegions;
        const livePlan = makeQuizPlan(regions, request);
        let calls = 0;
        const liveQuestions = await generateQuizSet({ async generate<T>(r: import('@stay-focused/engine').GenerationRequest<T>) { calls++; return provider.generate<T>(r); } }, request, regions);
        expect(liveQuestions).toHaveLength(5);
        const id = await queue(`live-${name}`);
        await db.query("update processing_jobs set status='running',lease_owner='worker',lease_expires_at=now()+interval '5 minutes' where id=$1", [id]);
        await db.query('select * from complete_quiz_processing_job($1,$2,$3,$4)', [id, 'worker', 'quiz_generation', JSON.stringify({ ...payload, questions: liveQuestions, provenance: { plan: livePlan, policy: 'quiz-v1' } })]);
        const row = (await db.query<QuizRow>('select * from quizzes where generation_id=$1', [id])).rows[0]!;
        const attempt = (await db.query<AttemptRow>('select * from start_quiz_attempt($1,$2,$3)', [A, row.id, `live-attempt-${name}`])).rows[0]!;
        for (const [i, q] of liveQuestions.entries()) {
            const selected = i === 0 ? [q.options.find(o => !q.correctOptionIds.includes(o.id))!.id] : q.correctOptionIds;
            const saved = await answer(attempt.id, q.id, selected);
            expect(attemptView(saved, liveQuestions).feedback).toHaveLength(i + 1);
        }
        const done = await complete(attempt.id), result = resultView(attemptView(done, liveQuestions), liveQuestions);
        expect(Number(done.percentage)).toBe(80);
        expect(result.percentage).toBe(80);
        expect(result.topicPerformance.some(t => t.missed > 0)).toBe(true);
        const repository: ExperienceRepository = { async rows<T extends ExperienceTable>(table: T, userId: string) {
                if (table === 'quizzes' || table === 'quiz_attempts')
                    return (await db.query(`select * from ${table} where user_id=$1`, [userId])).rows as unknown as ExperienceRow<T>[];
                return [];
            } };
        const library = new ExperienceService({ repository, materials: async () => { throw new Error('No generation during reopen'); } });
        const reopened = await library.getLibraryArtifact(A, `quiz:${row.id}`);
        expect(reopened).toMatchObject({ quiz: { id: row.id, attemptCount: 1, latestScore: 80 } });
        expect((await library.getLibrary(A, { type: 'quiz' })).items.some(i => i.id === `quiz:${row.id}`)).toBe(true);
        if (process.env.B24_7_LIVE_OUTPUT)
            writeFileSync(resolve(process.env.B24_7_LIVE_OUTPUT!, `b24-7-live-${name}.json`), JSON.stringify({ name, calls, plan: livePlan, questions: liveQuestions, result, libraryReopened: true }, null, 2));
        console.log(JSON.stringify({ fixture: name, questions: liveQuestions.length, calls, score: result.percentage, topics: result.topicPerformance.length, weakAreas: result.weakAreas.length, libraryReopened: true }));
    }, 300000);
    it('persists safe public projection and private evidence separately', async () => {
        const row = (await db.query<QuizRow>('select * from quizzes where id=$1', [quizId])).rows[0]!;
        const body = JSON.stringify(quizView(row));
        for (const key of ['correctOptionIds', 'correctValues', 'answerKey', 'sourceEvidence', 'validation', 'explanation', 'concept'])
            expect(body).not.toContain(key);
        expect((await db.query('select * from quiz_keys where quiz_id=$1', [quizId])).rows).toHaveLength(1);
        expect((await db.query<{
            payload: unknown;
        }>('select payload from processing_job_results where job_id=$1', [jobId])).rows[0]!.payload).toEqual({ quizId });
    });
    it('owner reads quiz; foreign user sees no quiz or attempts', async () => {
        expect(await asRole('authenticated', A, async () => (await db.query('select * from quizzes')).rows.length)).toBe(1);
        await asRole('authenticated', B, async () => { expect((await db.query('select * from quizzes')).rows).toEqual([]); expect((await db.query('select * from quiz_attempts')).rows).toEqual([]); });
    });
    it.each(['anon', 'authenticated'])('denies all direct key access to %s including owner', async (role) => {
        await expect(asRole(role, A, () => db.query('select * from quiz_keys'))).rejects.toThrow(/permission denied/);
    });
    it.each(['quizzes', 'quiz_attempts'])('denies client tampering with %s', async (table) => {
        await expect(asRole('authenticated', A, () => db.query(`delete from ${table}`))).rejects.toThrow(/permission denied/);
        await expect(asRole('authenticated', A, () => db.query(`update ${table} set user_id=user_id`))).rejects.toThrow(/permission denied/);
    });
    it('denies callable mutation RPCs to client roles', async () => {
        for (const role of ['anon', 'authenticated'])
            await expect(asRole(role, A, () => start('rpc-attack'))).rejects.toThrow(/permission denied/);
    });
    it('rejects foreign owner generation/attempt relationships', async () => {
        await expect(db.query('select * from create_quiz_processing_job($1,$2,$3,$4,$5)', [B, course, reviewer, 'foreign-generation', JSON.stringify(request)])).rejects.toThrow('quiz_source_unavailable');
        await expect(start('foreign-attempt', B)).rejects.toThrow('quiz_not_found');
        await expect(db.query('update quizzes set user_id=$1 where id=$2', [B, quizId])).rejects.toThrow('quiz_not_found');
    });
    it('idempotent generation/start and conflict detection preserve history', async () => {
        expect(await queue('quiz-generation-1')).toBe(jobId);
        const a = await start('idempotent-attempt');
        expect((await start('idempotent-attempt')).id).toBe(a.id);
        await expect(db.query('select * from create_quiz_processing_job($1,$2,$3,$4,$5)', [A, course, reviewer, 'quiz-generation-1', JSON.stringify({ ...request, questionCount: 10 })])).rejects.toThrow('conflict');
    });
    it('saves drafts and reveals only finalized question feedback', async () => {
        const a = await start('draft-attempt');
        const draft = await answer(a.id, 'q1', ['b'], false);
        expect(attemptView(draft, questions).feedback).toEqual([]);
        const finalized = await answer(a.id, 'q1', ['a']);
        expect(attemptView(finalized, questions).feedback).toMatchObject([{ questionId: 'q1', correct: true, explanation: questions[0]!.explanation }]);
        await expect(answer(a.id, 'q1', ['b'])).rejects.toThrow('quiz_answer_already_finalized');
        const resumed = (await db.query<AttemptRow>('select * from quiz_attempts where id=$1', [a.id])).rows[0]!;
        expect(resumed.answers).toEqual(finalized.answers);
    });
    it('clears unfinished identification and correction drafts for offline replay', async () => {
        await db.exec('begin');
        try {
            const modified = questions.map((item, index) => index === 2
                ? { ...item, type: 'identification' as const, options: [], correctOptionIds: ['Firewall'] }
                : index === 3 ? { ...item, type: 'modified_true_false' as const, options: [{ id: 't', text: 'True' }, { id: 'f', text: 'False' }], correctOptionIds: ['t'] } : item);
            await db.query('update quiz_keys set questions=$1 where quiz_id=$2', [JSON.stringify(modified), quizId]);
            const a = await start('clear-text-drafts');
            for (const [questionId, value] of [['q3', 'temporary term'], ['q4', 't']]) {
                await answer(a.id, questionId!, [value!], false);
                const cleared = await answer(a.id, questionId!, [], false);
                expect(attemptView(cleared, modified).answers.find(entry => entry.questionId === questionId)?.selectedOptionIds).toEqual([]);
            }
        } finally { await db.exec('rollback'); }
    });
    it.each([['a', 'a'], ['missing'], [], ['a', 'b']].map(selected => [selected]))('rejects invalid finalized single-select %j', async (selected) => {
        const a = await start(`bad-answer-${selected.join('-') || 'empty'}`);
        await expect(answer(a.id, 'q1', selected)).rejects.toThrow('quiz_answer_invalid');
    });
    it('finishes unanswered questions as skipped and denies foreign or unknown answers', async () => {
        const a = await start('incomplete-attempt');
        await expect(answer(a.id, 'q1', ['a'], true, B)).rejects.toThrow('quiz_attempt_not_found');
        await expect(complete(a.id, false, B)).rejects.toThrow('quiz_attempt_not_found');
        await expect(answer(a.id, 'q99', ['a'])).rejects.toThrow('quiz_question_not_found');
        const done = await complete(a.id);
        expect(Number(done.percentage)).toBe(0);
        expect(resultView(attemptView(done, questions), questions)).toMatchObject({ skippedCount: 5, revealedCount: 0, incorrectCount: 0 });
    });
    it('persists current position, skip and reveal; a pre-answer reveal cannot earn credit', async () => {
        const a = await start('study-state-attempt');
        const state = async (action: string, questionId: string, position: number) =>
            (await db.query<AttemptRow>('select * from update_quiz_attempt_study_state($1,$2,$3,$4,$5)', [A, a.id, action, questionId, position])).rows[0]!;
        await state('navigate', '', 3);
        await state('skip', 'q4', 4);
        const revealed = await state('reveal', 'q5', 4);
        expect(attemptView(revealed, questions)).toMatchObject({ currentQuestion: 4, skippedQuestionIds: ['q4'], revealedQuestionIds: ['q5'], assistedQuestionIds: ['q5'] });
        await answer(a.id, 'q5', questions[4]!.correctOptionIds);
        const done = await complete(a.id);
        expect(Number(done.percentage)).toBe(0);
        expect(resultView(attemptView(done, questions), questions)).toMatchObject({ revealedCount: 1, skippedCount: 4, earnedPoints: 0 });
    });
    it.each([['p1:r1', 'p2:r2'], ['p1:r1', 'p2:r3']])('saves and scores a two-pair matching block %j consistently', async (first, second) => {
        await db.exec('begin');
        try {
            const matching = { ...questions[4]!, type: 'matching' as const,
                options: [{ id: 'r1', text: 'One' }, { id: 'r2', text: 'Two' }, { id: 'r3', text: 'Distractor' }],
                matchingPairs: [{ id: 'p1', leftItem: 'A' }, { id: 'p2', leftItem: 'B' }],
                correctOptionIds: ['p1:r1', 'p2:r2'] };
            const modified = [...questions.slice(0, 4), matching];
            await db.query('update quiz_keys set questions=$1 where quiz_id=$2', [JSON.stringify(modified), quizId]);
            const a = await start('two-pair-attempt');
            await answer(a.id, 'q5', ['p1:r1'], false);
            await db.exec('savepoint invalid_pair');
            await expect(answer(a.id, 'q5', ['p1:r1', 'p2:r1'])).rejects.toThrow('quiz_answer_invalid');
            await db.exec('rollback to savepoint invalid_pair');
            for (const q of modified.slice(0, 4)) await answer(a.id, q.id, q.correctOptionIds);
            await answer(a.id, 'q5', [first, second]);
            const done = await complete(a.id);
            const result = resultView(attemptView(done, modified), modified);
            expect(result.questions.find(q => q.questionId === 'q5')).toMatchObject({ pairCount: 2, pairCorrectCount: second === 'p2:r2' ? 2 : 1 });
            expect(Number(done.percentage)).toBe(result.percentage);
            expect(result.earnedPoints).toBe(second === 'p2:r2' ? 6 : 5);
            expect(result.possiblePoints).toBe(6);
        } finally { await db.exec('rollback'); }
    });
    it('scores a matching block by pairs while preserving one-to-one display IDs', async () => {
        await db.exec('begin');
        try {
            const matching = { ...questions[4]!, type: 'matching' as const, prompt: 'Match each term.', leftItem: '',
                options: [{ id: 'r1', text: 'One' }, { id: 'r2', text: 'Two' }, { id: 'r3', text: 'Three' }, { id: 'r4', text: 'Four' }, { id: 'r5', text: 'Distractor' }],
                matchingPairs: [{ id: 'p1', leftItem: 'A' }, { id: 'p2', leftItem: 'B' }, { id: 'p3', leftItem: 'C' }, { id: 'p4', leftItem: 'D' }],
                matchingAnswers: [{ id: 'p1', rightOptionId: 'r1' }, { id: 'p2', rightOptionId: 'r2' }, { id: 'p3', rightOptionId: 'r3' }, { id: 'p4', rightOptionId: 'r4' }],
                correctOptionIds: ['p1:r1', 'p2:r2', 'p3:r3', 'p4:r4'] };
            const modified = [...questions.slice(0, 4), matching];
            await db.query('update quiz_keys set questions=$1 where quiz_id=$2', [JSON.stringify(modified), quizId]);
            const a = await start('matching-pair-attempt');
            for (const q of modified.slice(0, 4)) await answer(a.id, q.id, q.correctOptionIds);
            await db.exec('savepoint duplicate_match');
            await expect(answer(a.id, 'q5', ['p1:r1', 'p2:r1', 'p3:r3', 'p4:r4'])).rejects.toThrow('quiz_answer_invalid');
            await db.exec('rollback to savepoint duplicate_match');
            const saved = await answer(a.id, 'q5', ['p1:r1', 'p2:r2', 'p3:r3', 'p4:r5']);
            expect(attemptView(saved, modified).feedback.find(item => item.questionId === 'q5')).toMatchObject({ pairCorrectCount: 3, pairCount: 4, correct: false });
            const done = await complete(a.id);
            expect(Number(done.percentage)).toBe(87.5);
            expect(resultView(attemptView(done, modified), modified)).toMatchObject({ earnedPoints: 7, possiblePoints: 8, percentage: 87.5 });
        } finally { await db.exec('rollback'); }
    });
    it('exact-set multi-select and deterministic SQL/API scores agree; second attempt preserved', async () => {
        const a = await start('scored-attempt');
        for (const q of questions)
            await answer(a.id, q.id, q.id === 'q2' ? ['a'] : q.id === 'q4' ? ['b'] : q.correctOptionIds);
        const completed = await complete(a.id), result = resultView(attemptView(completed, questions), questions);
        expect(Number(completed.percentage)).toBe(60);
        const quizRow = (await db.query<QuizRow>('select * from quizzes where id=$1', [quizId])).rows[0]!;
        expect(quizView(quizRow, [completed])).toMatchObject({ latestScore: 60, bestScore: 60 });
        expect(result).toMatchObject({ correctCount: 3, incorrectCount: 2, totalQuestions: 5, percentage: 60 });
        expect(result.weakAreas.map(w => w.kind)).toEqual(['missed_topic', 'missed_topic']);
        expect(result.weakAreas[0]!.reviewerSectionIds.length).toBe(1);
        expect((await complete(a.id)).id).toBe(a.id);
        await expect(answer(a.id, 'q2', ['a', 'c'])).rejects.toThrow('quiz_attempt_completed');
        const second = await start('second-attempt');
        expect(second.id).not.toBe(a.id);
        expect((await db.query('select * from quiz_attempts where id=$1 and status=$2', [a.id, 'completed'])).rows).toHaveLength(1);
    });
    it('abandoned attempts retain finalized work and have no fabricated results', async () => {
        const a = await start('abandoned-attempt');
        await answer(a.id, 'q1', ['b']);
        const abandoned = await complete(a.id, true);
        expect(abandoned.status).toBe('abandoned');
        expect(() => resultView(attemptView(abandoned, questions), questions)).toThrow('quiz_result_unavailable');
        await expect(answer(a.id, 'q2', ['a'])).rejects.toThrow('quiz_attempt_completed');
    });
    it('row locking prevents two finalizations from succeeding', async () => {
        const a = await start('race-attempt');
        const results = await Promise.allSettled([answer(a.id, 'q1', ['a']), answer(a.id, 'q1', ['b'])]);
        expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
        expect(results.filter(r => r.status === 'rejected')).toHaveLength(1);
    });
    it('cancellation and expired leases publish no quiz', async () => {
        for (const status of ['cancelled', 'cancellation_requested', 'running']) {
            const id = await queue(`cancel-${status}`);
            await db.query("update processing_jobs set status=$1,lease_owner='worker',lease_expires_at=now()-interval '1 second' where id=$2", [status, id]);
            await expect(db.query('select * from complete_quiz_processing_job($1,$2,$3,$4)', [id, 'worker', 'quiz_generation', JSON.stringify(payload)])).rejects.toThrow('processing_job_completion_rejected');
            expect((await db.query('select * from quizzes where generation_id=$1', [id])).rows).toEqual([]);
        }
    });
    it('generation retention leaves quiz, keys and attempts available', async () => {
        await db.exec('begin');
        try {
            await db.query('update processing_jobs set result_id=null where id=$1', [jobId]);
            await db.query('delete from processing_job_results where job_id=$1', [jobId]);
            await db.query('delete from processing_jobs where id=$1', [jobId]);
            expect((await db.query('select * from quizzes where id=$1', [quizId])).rows).toHaveLength(1);
            expect((await db.query('select * from quiz_keys where quiz_id=$1', [quizId])).rows).toHaveLength(1);
        }
        finally {
            await db.exec('rollback');
        }
    });
    it('account deletion cascades quizzes, keys and attempt history', async () => {
        await db.exec('begin');
        try {
            await db.query('delete from auth.users where id=$1', [A]);
            expect((await db.query('select * from quizzes')).rows).toEqual([]);
            expect((await db.query('select * from quiz_keys')).rows).toEqual([]);
            expect((await db.query('select * from quiz_attempts')).rows).toEqual([]);
        }
        finally {
            await db.exec('rollback');
        }
    });
});
