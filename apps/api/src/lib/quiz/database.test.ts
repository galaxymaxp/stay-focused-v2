import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fixturePlan, candidate, request } from './fixtures';
import { generateQuiz, makeQuizPlan, validateCandidate, type StoredQuestion } from './generation';
import { regionsFromBlocks } from './sources';
import { createServerOpenAIProvider } from '@/providers';
import { structuredBlockText, type StructuredDocument } from '../../../../../packages/engine/src/structured-document';
import { ExperienceService } from '../experience/service';
import type { ExperienceRepository, ExperienceRow, ExperienceTable } from '../experience/repository';
import { attemptView, resultView, quizView, type AttemptRow, type QuizRow } from './service';
import { mixedQuestions } from './matching.fixtures';
import type { QuizMatchPair } from '@stay-focused/shared';
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
const course = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', reviewer = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
let db: PGlite, quizId: string, jobId: string, legacyAttemptId: string;
const plan = fixturePlan(), questions = plan.allocation.map(s => validateCandidate(candidate(plan, s.id), plan));
const payload = { courseId: course, reviewerId: reviewer, title: 'Safe course quiz', materialIds: request.sourceIds, questions, provenance: { plan, policy: 'test' } };
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
    create table reviewers(id uuid primary key,user_id uuid references auth.users(id) on delete cascade);insert into reviewers values('${reviewer}','${A}');
    create table canvas_assignments(id uuid primary key,user_id uuid,course_id uuid,canvas_connection_id uuid,name text,unique(id,user_id,canvas_connection_id,course_id));
    create table processing_policy_config(id text primary key,max_queued_generation_jobs_per_user int,max_daily_generation_jobs int,event_retention_days int,failed_job_retention_days int,completed_job_retention_days int);
    insert into processing_policy_config values('default',100,1000,7,7,7);`);
    await db.exec(migration('20260722225243_durable_processing_jobs.sql').split('create table public.processing_job_events')[0]!.replace('create extension if not exists pgcrypto;', ''));
    await db.exec('create table processing_job_events(id uuid primary key,created_at timestamptz,delivered_at timestamptz,delivery_eligible boolean);create table processing_cleanup_queue(status text,not_before timestamptz);');
    await db.exec(migration('20260912100000_activity_maker.sql'));
    await db.exec(migration('20260912110000_quiz_maker.sql'));
    jobId = await queue('quiz-generation-1');
    await finish(jobId);
    quizId = (await db.query<{
        id: string;
    }>('select id from quizzes where generation_id=$1', [jobId])).rows[0]!.id;
    const legacy = await start('legacy-before-matching');
    legacyAttemptId = legacy.id;
    await answer(legacy.id, 'q1', ['b'], false);
    await db.exec(migration('20261007155114_quiz_matching.sql'));
}, 30000);
afterAll(async () => { await db?.close(); });
describe('Quiz real Postgres transactions, RLS and history', () => {
    it('reopens and completes choice-only data created before the Matching migration', async () => {
        const persisted = (await db.query<AttemptRow>('select * from quiz_attempts where id=$1', [legacyAttemptId])).rows[0]!;
        expect(attemptView(persisted, questions).answers[0]).toMatchObject({ type: 'choice', selectedOptionIds: ['b'], finalizedAt: null });
        for (const q of questions) await answer(legacyAttemptId, q.id, q.correctOptionIds);
        expect(resultView(attemptView(await complete(legacyAttemptId), questions), questions).percentage).toBe(100);
        expect((await start('legacy-before-matching')).id).toBe(legacyAttemptId);
    });
    it('persists Matching privately, edits/reloads partial drafts, rejects invalid finalization and preserves mixed history', async () => {
        await db.exec('begin');
        try {
            const mixed = mixedQuestions(), matching = mixed.find(q => q.type === 'matching')!;
            if (matching.type !== 'matching') throw new Error('Expected Matching');
            const generation = await queue('matching-integration');
            await db.query("update processing_jobs set status='running',lease_owner='worker',lease_expires_at=now()+interval '5 minutes' where id=$1", [generation]);
            const matchingPayload = { ...payload, questions: mixed };
            await db.query('select * from complete_quiz_processing_job($1,$2,$3,$4)', [generation, 'worker', 'quiz_generation', JSON.stringify(matchingPayload)]);
            const q = (await db.query<QuizRow>('select * from quizzes where generation_id=$1', [generation])).rows[0]!;
            const privateRow = (await db.query<{ questions: unknown }>('select questions from quiz_keys where quiz_id=$1', [q.id])).rows[0]!;
            expect(JSON.stringify(privateRow.questions)).toContain('correctPairs');
            expect(JSON.stringify(q.questions)).not.toMatch(/correctPairs|sourceEvidence|correctOptionIds|explanation/);
            expect(JSON.stringify(q.questions)).toContain('Confidentiality');
            const fresh = async (key: string) => (await db.query<AttemptRow>('select * from start_quiz_attempt($1,$2,$3)', [A, q.id, key])).rows[0]!;
            const save = async (attemptId: string, pairs: readonly QuizMatchPair[], finalize = false, user = A) =>
                (await db.query<AttemptRow>('select * from save_quiz_answer($1,$2,$3,$4,$5)', [user, attemptId, matching.id, JSON.stringify({ type: 'matching', pairs }), finalize])).rows[0]!;
            const rejects = async (action: () => Promise<unknown>, code: string) => {
                await db.exec('savepoint matching_reject');
                try { await expect(action()).rejects.toThrow(code); }
                finally { await db.exec('rollback to savepoint matching_reject;release savepoint matching_reject'); }
            };
            const a = await fresh('matching-draft');
            const partial = await save(a.id, matching.correctPairs.slice(0, 1));
            expect(attemptView(partial, mixed).feedback).toEqual([]);
            expect(attemptView(partial, mixed).answers[0]).toMatchObject({ type: 'matching', pairs: matching.correctPairs.slice(0, 1), finalizedAt: null });
            const reread = (await db.query<AttemptRow>('select * from quiz_attempts where id=$1', [a.id])).rows[0]!;
            expect(reread.answers).toEqual(partial.answers);
            expect(quizView(q, [partial])).toMatchObject({ learningState: 'in_progress', answeredCount: 1 });
            const editedPair = [{ ...matching.correctPairs[0]!, rightItemId: matching.correctPairs[1]!.rightItemId }];
            const edited = await save(a.id, editedPair);
            expect(attemptView(edited, mixed).answers[0]).toMatchObject({ pairs: editedPair });
            await rejects(() => save(a.id, editedPair, true), 'quiz_answer_invalid');
            await rejects(() => complete(a.id), 'quiz_result_unavailable');
            for (const pairs of [
                [{ leftItemId: 'unknown', rightItemId: matching.correctPairs[0]!.rightItemId }],
                [{ leftItemId: matching.correctPairs[0]!.leftItemId, rightItemId: 'unknown' }],
                [matching.correctPairs[0]!, matching.correctPairs[0]!],
                [matching.correctPairs[0]!, { ...matching.correctPairs[1]!, rightItemId: matching.correctPairs[0]!.rightItemId }],
            ]) await rejects(() => save(a.id, pairs), 'quiz_answer_invalid');
            await rejects(() => save(a.id, [], false, B), 'quiz_attempt_not_found');
            await rejects(() => complete(a.id, false, B), 'quiz_attempt_not_found');
            const wrong = matching.correctPairs.map((p, i, all) => i < 2 ? { ...p, rightItemId: all[1 - i]!.rightItemId } : p);
            const finalized = await save(a.id, [...wrong].reverse(), true);
            expect(attemptView(finalized, mixed).feedback[0]).toMatchObject({ type: 'matching', correct: false, correctPairs: matching.correctPairs });
            const finalizedReload = (await db.query<AttemptRow>('select * from quiz_attempts where id=$1', [a.id])).rows[0]!;
            expect(finalizedReload.answers).toEqual(finalized.answers);
            await rejects(() => save(a.id, matching.correctPairs), 'quiz_answer_already_finalized');
            for (const choice of mixed) if (choice.type !== 'matching') await answer(a.id, choice.id, choice.correctOptionIds);
            const completed = await complete(a.id);
            expect(Number(completed.percentage)).toBe(80);
            expect(resultView(attemptView(completed, mixed), mixed)).toMatchObject({ percentage: 80, correctCount: 4, totalQuestions: 5 });
            for (const [key, pairs, expected] of [
                ['matching-correct', matching.correctPairs, true],
                ['matching-all-wrong', matching.correctPairs.map((p, i, all) => ({ ...p, rightItemId: all[(i + 1) % all.length]!.rightItemId })), false],
            ] as const) {
                const retry = await fresh(key);
                expect(retry.id).not.toBe(a.id); expect(retry.answers).toEqual([]);
                const saved = await save(retry.id, pairs, true);
                expect(attemptView(saved, mixed).feedback[0]?.correct).toBe(expected);
                for (const choice of mixed) if (choice.type !== 'matching') await answer(retry.id, choice.id, choice.correctOptionIds);
                expect(Number((await complete(retry.id)).percentage)).toBe(expected ? 100 : 80);
            }
            const history = (await db.query<AttemptRow>('select * from quiz_attempts where quiz_id=$1', [q.id])).rows;
            expect(history).toHaveLength(3); expect(history.every(a => a.status === 'completed' && a.completed_at !== null)).toBe(true);
            const repository: ExperienceRepository = { async rows<T extends ExperienceTable>(table: T, userId: string) {
                return (table === 'quizzes' || table === 'quiz_attempts') ? (await db.query(`select * from ${table} where user_id=$1`, [userId])).rows as unknown as ExperienceRow<T>[] : [];
            } };
            const library = new ExperienceService({ repository, materials: async () => { throw new Error('No generation during reads'); } });
            const reopened = await library.getLibraryArtifact(A, `quiz:${q.id}`);
            expect(reopened).toMatchObject({ quiz: { learningState: 'completed', completedAttemptCount: 3, bestScore: 100 } });
            expect(JSON.stringify(reopened)).not.toMatch(/correctPairs|sourceEvidence|correctOptionIds/);
            await expect(library.getLibraryArtifact(B, `quiz:${q.id}`)).rejects.toThrow('not_found');
            await db.exec(`set local role authenticated;select set_config('request.jwt.claim.sub','${B}',true);`);
            expect((await db.query('select * from quiz_attempts where quiz_id=$1', [q.id])).rows).toEqual([]);
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
        if (process.env.B24_7_LIVE_OUTPUT)
            writeFileSync(resolve(process.env.B24_7_LIVE_OUTPUT, `b24-7-live-${name}-plan.json`), JSON.stringify(livePlan, null, 2));
        let calls = 0;
        const seedDir = process.env.B24_7_SEED_DIR;
        const initial = seedDir ? (JSON.parse(readFileSync(resolve(seedDir, `b24-7-live-${name}-seed.json`), 'utf8')) as {
            questions: StoredQuestion[];
        }).questions : [];
        let checkpointQuestions = initial;
        const liveQuestions = await generateQuiz({ async generate<T>(r: import('@stay-focused/engine').GenerationRequest<T>) {
                calls++;
                const replay = process.env.B24_7_REPLAY_DIR;
                const value = replay ? (JSON.parse(readFileSync(resolve(replay, `b24-7-live-${name}-call-${calls}.json`), 'utf8')) as {
                    value: T;
                }).value : await provider.generate<T>(r);
                if (process.env.B24_7_LIVE_OUTPUT)
                    writeFileSync(resolve(process.env.B24_7_LIVE_OUTPUT!, `b24-7-live-${name}-call-${calls}.json`), JSON.stringify({ schema: r.schema.name, value }, null, 2));
                return value;
            } }, livePlan, async (accepted) => {
            checkpointQuestions = accepted;
            if (process.env.B24_7_LIVE_OUTPUT)
                writeFileSync(resolve(process.env.B24_7_LIVE_OUTPUT, `b24-7-live-${name}-checkpoint.json`), JSON.stringify({ questions: checkpointQuestions }, null, 2));
        }, initial);
        expect(liveQuestions).toHaveLength(5);
        const id = await queue(`live-${name}`);
        await db.query("update processing_jobs set status='running',lease_owner='worker',lease_expires_at=now()+interval '5 minutes' where id=$1", [id]);
        await db.query('select * from complete_quiz_processing_job($1,$2,$3,$4)', [id, 'worker', 'quiz_generation', JSON.stringify({ ...payload, questions: liveQuestions, provenance: { plan: livePlan, policy: 'quiz-v1' } })]);
        const row = (await db.query<QuizRow>('select * from quizzes where generation_id=$1', [id])).rows[0]!;
        const attempt = (await db.query<AttemptRow>('select * from start_quiz_attempt($1,$2,$3)', [A, row.id, `live-attempt-${name}`])).rows[0]!;
        for (const [i, q] of liveQuestions.entries()) {
            if (q.type === 'matching') throw new Error('This legacy live fixture requests choice questions');
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
    it('Library reload follows real persisted start, draft, zero-score completion and retry without regeneration', async () => {
        await db.exec('begin');
        try {
            const generation = await queue('learning-projection');
            await finish(generation);
            const q = (await db.query<QuizRow>('select * from quizzes where generation_id=$1', [generation])).rows[0]!;
            const repository: ExperienceRepository = { async rows<T extends ExperienceTable>(table: T, userId: string) {
                if (table === 'quizzes' || table === 'quiz_attempts')
                    return (await db.query(`select * from ${table} where user_id=$1`, [userId])).rows as unknown as ExperienceRow<T>[];
                return [];
            } };
            const materials = () => { throw new Error('Library must not regenerate'); };
            const library = new ExperienceService({ repository, materials });
            const reload = async () => (await library.getLibrary(A, { type: 'quiz' })).items.find(i => i.id === `quiz:${q.id}`)!;
            expect(await reload()).toMatchObject({ status: 'completed', quiz: { learningState: 'not_started', attemptCount: 0, bestScore: null } });
            const started = (await db.query<AttemptRow>('select * from start_quiz_attempt($1,$2,$3)', [A, q.id, 'progress-start'])).rows[0]!;
            expect(await reload()).toMatchObject({ quiz: { learningState: 'in_progress', activeAttemptId: started.id, answeredCount: 0 } });
            await answer(started.id, 'q1', ['b'], false);
            expect(await reload()).toMatchObject({ quiz: { learningState: 'in_progress', answeredCount: 1 } });
            for (const question of questions) {
                const wrong = [question.options.find(o => !question.correctOptionIds.includes(o.id))!.id];
                await answer(started.id, question.id, wrong);
            }
            const completed = await complete(started.id);
            expect(Number(completed.percentage)).toBe(0);
            expect(await reload()).toMatchObject({ status: 'completed', quiz: { learningState: 'completed', answeredCount: 5,
                completedAttemptCount: 1, latestCompletedAt: completed.completed_at, bestScore: 0, latestScore: 0 } });
            const retry = (await db.query<AttemptRow>('select * from start_quiz_attempt($1,$2,$3)', [A, q.id, 'progress-retry'])).rows[0]!;
            expect(await reload()).toMatchObject({ quiz: { learningState: 'in_progress', activeAttemptId: retry.id, completedAttemptCount: 1, bestScore: 0 } });
            await complete(retry.id, true);
            expect(await reload()).toMatchObject({ quiz: { learningState: 'completed', activeAttemptId: null, attemptCount: 2, completedAttemptCount: 1, bestScore: 0 } });
            expect((await library.getLibrary(B, { type: 'quiz' })).items).toEqual([]);
            expect((await db.query('select id from quizzes where generation_id=$1', [generation])).rows).toHaveLength(1);
        } finally {
            await db.exec('rollback');
        }
    });
    it.each([['a', 'a'], ['missing'], [], ['a', 'b']].map(selected => [selected]))('rejects invalid finalized single-select %j', async (selected) => {
        const a = await start(`bad-answer-${selected.join('-') || 'empty'}`);
        await expect(answer(a.id, 'q1', selected)).rejects.toThrow('quiz_answer_invalid');
    });
    it('refuses incomplete results, foreign answer/complete, and unknown question', async () => {
        const a = await start('incomplete-attempt');
        await expect(complete(a.id)).rejects.toThrow('quiz_result_unavailable');
        await expect(answer(a.id, 'q1', ['a'], true, B)).rejects.toThrow('quiz_attempt_not_found');
        await expect(complete(a.id, false, B)).rejects.toThrow('quiz_attempt_not_found');
        await expect(answer(a.id, 'q99', ['a'])).rejects.toThrow('quiz_question_not_found');
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
