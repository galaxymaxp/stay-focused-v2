import { createServerOpenAIProvider } from '@/providers';
import { PGlite } from '@electric-sql/pglite';
import type { Database } from '@stay-focused/db';
import type { ActivitySource } from '@stay-focused/shared';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll,beforeAll,describe,expect,it } from 'vitest';
import { generateActivityDocument } from './ai-first';
import { draftView,validateEditableContent } from './service';
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
const activity = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const course = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', connection = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
let db: PGlite;
let draftId: string;
let jobId: string;
const content = { title: 'Reflection', sections: [{ id: 'section-1', heading: null, level: 1, content: 'Diffusion moves particles.', order: 1, sourceRefs: ['source-1'] }], slides: [] };
const payload = { activityId: `canvas:${activity}`, courseId: course, type: 'reflection', content, specification: { activityId: `canvas:${activity}` }, sources: [{ id: 'source-1', title: 'Reading', role: 'reference' }], warnings: [] };
async function asUser<T>(id: string, action: () => Promise<T>): Promise<T> { await db.exec(`begin;set local role authenticated;select set_config('request.jwt.claim.sub','${id}',true);`); try {
    return await action();
}
finally {
    await db.exec('rollback');
} }
async function queue(key: string) { return (await db.query<{
    id: string;
}>(`select id from public.create_activity_processing_job($1,$2,$3,'[]')`, [A, activity, key])).rows[0]!.id; }
async function finish(id: string, value: unknown = payload) { await db.query("update processing_jobs set status='running',lease_owner='test-worker',lease_expires_at=now()+interval '5 minutes' where id=$1", [id]); await db.query('select * from complete_activity_processing_job($1,$2,$3,$4::jsonb)', [id, 'test-worker', 'activity_generation', JSON.stringify(value)]); }
beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role bypassrls;
 create table auth.users(id uuid primary key);insert into auth.users values('${A}'),('${B}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to authenticated,anon,service_role;
 create table public.canvas_assignments(id uuid primary key,user_id uuid not null,course_id uuid not null,canvas_connection_id uuid not null,name text not null,unique(id,user_id,canvas_connection_id,course_id));
 insert into canvas_assignments values('${activity}','${A}','${course}','${connection}','Reflection'),('${other}','${B}','${course}','${connection}','Foreign');
 create table processing_policy_config(id text primary key,max_queued_generation_jobs_per_user int,max_daily_generation_jobs int);insert into processing_policy_config values('default',100,1000);`);
    // Execute the real original queue tables and their constraints, then the actual
    // B24.6 migration. Only external auth/Canvas prerequisites are minimal fixtures.
    const original = readFileSync(resolve('../../packages/db/migrations/20260722225243_durable_processing_jobs.sql'), 'utf8').split('create table public.processing_job_events')[0]!.replace('create extension if not exists pgcrypto;', '');
    await db.exec(original);
    await db.exec(`alter table processing_policy_config add column event_retention_days int default 7,add column failed_job_retention_days int default 7,add column completed_job_retention_days int default 7;
 create table processing_job_events(id uuid primary key,created_at timestamptz,delivered_at timestamptz,delivery_eligible boolean);
 create table processing_cleanup_queue(status text,not_before timestamptz);`);
    await db.exec(`alter table processing_jobs enable row level security;grant select on processing_jobs to authenticated;create policy processing_owner on processing_jobs for select to authenticated using(user_id=(select auth.uid()));`);
    await db.exec(readFileSync(resolve('../../packages/db/migrations/20260912100000_activity_maker.sql'), 'utf8'));
    jobId = await queue('initial-request');
    await finish(jobId);
    draftId = (await db.query<{
        id: string;
    }>('select id from activity_drafts where generation_id=$1', [jobId])).rows[0]!.id;
}, 30000);
afterAll(async () => { await db?.close(); });
describe('Activity Maker real Postgres ownership and transactions', () => {
    it('owner can reopen; foreign user cannot SELECT or UPDATE or DELETE', async () => {
        expect(await asUser(A, async () => (await db.query('select * from activity_drafts')).rows.length)).toBe(1);
        await asUser(B, async () => {
            expect((await db.query('select * from activity_drafts')).rows).toEqual([]);
            expect((await db.query('update activity_drafts set revision=revision+1 where id=$1 returning id', [draftId])).rows).toEqual([]);
            expect((await db.query('delete from activity_drafts where id=$1 returning id', [draftId])).rows).toEqual([]);
        });
    });
    it('owner updates content with revision conflict protection', async () => {
        await asUser(A, async () => {
            const updated = await db.query<{
                revision: number;
                status: string;
            }>('update activity_drafts set content=$1,revision=2 where id=$2 and revision=1 returning revision,status', [JSON.stringify({ ...content, title: 'Edited' }), draftId]);
            expect(updated.rows[0]).toMatchObject({ revision: 2, status: 'edited' });
            expect((await db.query('update activity_drafts set revision=2 where id=$1 and revision=1 returning id', [draftId])).rows).toEqual([]);
        });
    });
    it('owner can delete own draft', async () => expect(await asUser(A, async () => (await db.query('delete from activity_drafts where id=$1 returning id', [draftId])).rows.length)).toBe(1));
    it('client cannot mutate generation, owner or creation metadata', async () => {
        for (const column of ['user_id', 'activity_id', 'course_id', 'generation_id', 'created_at'])
            await expect(asUser(A, async () => db.query(`update activity_drafts set ${column}=${column} where id=$1`, [draftId]))).rejects.toThrow(/permission denied/i);
    });
    it('foreign INSERT cannot attach to another owner generation or assignment', async () => {
        await expect(asUser(B, async () => db.query(`insert into activity_drafts(user_id,activity_id,course_id,canvas_connection_id,generation_id,activity_type,content,specification,sources) values($1,$2,$3,$4,$5,'custom',$6,'{}','[]')`, [B, activity, course, connection, jobId, JSON.stringify(content)]))).rejects.toThrow();
    });
    it('owner can INSERT against their completed generation after deleting their own draft', async () => {
        await asUser(A, async () => {
            await db.query('delete from activity_drafts where id=$1', [draftId]);
            const inserted = await db.query(`insert into activity_drafts(user_id,activity_id,course_id,canvas_connection_id,generation_id,activity_type,content,specification,sources) values($1,$2,$3,$4,$5,'custom',$6,'{}','[]') returning id`, [A, activity, course, connection, jobId, JSON.stringify({ ...content, sections: [{ ...content.sections[0], sourceRefs: [] }] })]);
            expect(inserted.rows).toHaveLength(1);
        });
    });
    it('anonymous cannot read drafts or invoke service-only admission', async () => {
        await db.exec('begin;set local role anon');
        try {
            await expect(db.query('select * from activity_drafts')).rejects.toThrow(/permission denied/i);
        }
        finally {
            await db.exec('rollback');
        }
        await expect(asUser(A, async () => db.query("select * from create_activity_processing_job($1,$2,'forbidden-client','[]')", [A, activity]))).rejects.toThrow(/permission denied/i);
    });
    it('service admission enforces assignment ownership and idempotency', async () => {
        await expect(db.query("select * from create_activity_processing_job($1,$2,'foreign-assignment','[]')", [A, other])).rejects.toThrow(/activity_not_found/);
        expect(await queue('initial-request')).toBe(jobId);
        await expect(db.query("select * from create_activity_processing_job($1,$2,'initial-request','[\"file:other\"]')", [A, activity])).rejects.toThrow(/activity_draft_conflict/);
    });
    it('cancelled jobs cannot publish drafts', async () => {
        const id = await queue('cancelled-request');
        await db.query("update processing_jobs set status='cancellation_requested',lease_owner='test-worker',lease_expires_at=now()+interval '5 minutes' where id=$1", [id]);
        await expect(db.query('select * from complete_activity_processing_job($1,$2,$3,$4)', [id, 'test-worker', 'activity_generation', JSON.stringify(payload)])).rejects.toThrow(/completion_rejected/);
        expect((await db.query('select id from activity_drafts where generation_id=$1', [id])).rows).toEqual([]);
    });
    it('regeneration creates a new recoverable draft and keeps student edits', async () => {
        await db.query('update activity_drafts set content=$1,revision=revision+1 where id=$2', [JSON.stringify({ ...content, title: 'Student edit' }), draftId]);
        const id = await queue('regenerate-request');
        await finish(id);
        const rows = (await db.query<{
            title: string;
        }>('select content->>\'title\' as title from activity_drafts order by created_at')).rows;
        expect(rows.map(r => r.title)).toEqual(['Student edit', 'Reflection']);
    });
    it('missing and expired leases cannot publish', async () => {
        for (const expires of [null, '2000-01-01']) {
            const id = await queue(`lease-${expires ?? 'null'}`);
            await db.query("update processing_jobs set status='running',lease_owner=$3,lease_expires_at=$1 where id=$2", [expires, id, expires ? 'test-worker' : null]);
            await expect(db.query('select * from complete_activity_processing_job($1,$2,$3,$4)', [id, 'test-worker', 'activity_generation', JSON.stringify(payload)])).rejects.toThrow(/completion_rejected/);
        }
    });
    it('routine retention preserves saved drafts and their generation records', async () => {
        const result = await db.query<{
            result: {
                deletedCompletedJobRows: number;
            };
        }>("select run_processing_lifecycle_cleanup(now()+interval '90 days',false) as result");
        expect(result.rows[0]?.result.deletedCompletedJobRows).toBe(0);
        expect((await db.query('select id from activity_drafts')).rows).toHaveLength(2);
    });
    it('account deletion can cascade drafts and jobs together', async () => {
        await db.exec('begin');
        try {
            await db.query('delete from auth.users where id=$1', [A]);
            await db.exec('set constraints all immediate');
            expect((await db.query('select id from activity_drafts where user_id=$1', [A])).rows).toEqual([]);
        }
        finally {
            await db.exec('rollback');
        }
    });
    it.runIf(process.env.B24_6_LIVE === '1')('LIVE: structured document and Q&A generate, persist, reopen, edit and regenerate safely', async () => {
        // Explicit opt-in only. Credentials and provider prompts are never logged.
        process.loadEnvFile(resolve('../../.env.local'));
        const provider = createServerOpenAIProvider();
        const reference: ActivitySource = { id: 'reading', title: 'Fictional biology reading', role: 'reference', materialId: null, text: 'Diffusion moves particles from high concentration to low concentration. Osmosis is the movement of water across a selectively permeable membrane.' };
        for (const kind of ['document', 'qa'] as const) {
            const sources: ActivitySource[] = [{ id: 'instructions', title: 'Biology activity', role: 'instructions', materialId: null, text: kind === 'document' ? 'Use this template to explain diffusion and osmosis using only the reading. No conclusion required.' : 'Answer questions 1–2 using only the reading.\n1. What is diffusion?\n2. What is osmosis?' }, reference];
            if (kind === 'document')
                sources.push({ id: 'template', title: 'Teacher structure', role: 'template', materialId: null, text: '# Diffusion\n[Write the explanation from the reading]\n# Osmosis\n[Write the explanation from the reading]' });
            const generated = await generateActivityDocument(provider, 'Biology activity', sources);
            validateEditableContent(generated.content, sources.map(s => s.id));
            expect(generated.content.sections).toHaveLength(2);
            expect(generated.warnings).toEqual([]);
            if (kind === 'document')
                expect(generated.content.sections.map(s => s.heading)).toEqual(['Diffusion', 'Osmosis']);
            expect(generated.content.sections.every(s => s.sourceRefs.includes('reading'))).toBe(true);
            const value = { ...payload, type: generated.activityType, content: generated.content, specification: { policy: 'ai-first' }, sources: sources.map(({ id, title, role }) => ({ id, title, role })), warnings: generated.warnings };
            const first = await queue(`b24-6-live-${kind}`);
            await finish(first, value);
            const reopen = async (id: string) => asUser(A, async () => draftView((await db.query<Database['public']['Tables']['activity_drafts']['Row']>('select * from activity_drafts where generation_id=$1', [id])).rows[0]!));
            const saved = await reopen(first);
            expect(saved.sections).toEqual(generated.content.sections);
            await db.exec(`begin;set local role authenticated;select set_config('request.jwt.claim.sub','${A}',true);`);
            try {
                await db.query('update activity_drafts set content=$1,revision=revision+1 where id=$2 and revision=1', [JSON.stringify({ ...generated.content, title: 'Student edit' }), saved.id]);
                await db.exec('commit');
            }
            catch (error) {
                await db.exec('rollback');
                throw error;
            }
            expect((await reopen(first)).title).toBe('Student edit');
            // Persist another generation of the validated provider content; no extra
            // provider call is needed to exercise regeneration's storage semantics.
            const second = await queue(`b24-6-live-${kind}-regenerate`);
            await finish(second, value);
            expect((await reopen(second)).id).not.toBe(saved.id);
            expect((await reopen(first)).title).toBe('Student edit');
        }
    }, 180000);
});
