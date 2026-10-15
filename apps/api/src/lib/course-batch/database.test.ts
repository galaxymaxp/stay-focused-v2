import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, expect, it } from 'vitest';
const owner = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222';
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create role anon; create role authenticated; create role service_role bypassrls;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    create table canvas_courses(id uuid,user_id uuid,canvas_connection_id uuid,unique(id,user_id,canvas_connection_id));
    create table processing_jobs(id uuid primary key,user_id uuid,idempotency_key text,job_type text,retry_of_job_id uuid,status text,source_snapshot_id uuid,created_at timestamptz default now(),unique(id,user_id),unique(user_id,idempotency_key));
    create table processing_job_sources(id uuid,user_id uuid,page_count int);
    create table canvas_material_preparations(id uuid default gen_random_uuid(),user_id uuid,course_id uuid,material_id text,revision_fingerprint text,state text);
    create table canvas_material_preparation_evidence(job_id uuid,evidence jsonb);
    create function canvas_preparation_evidence_current_v1(uuid,uuid,jsonb) returns boolean language sql as $$select true$$;
    create table processing_policy_config(id text,max_jobs_created_per_hour int,max_daily_generation_jobs int,
      max_active_jobs_per_user int default 20,max_queued_extraction_jobs_per_user int default 5,
      max_queued_generation_jobs_per_user int default 5,max_daily_extraction_jobs int default 20,max_daily_ocr_pages_per_user int default 100);
    insert into processing_policy_config(id,max_jobs_created_per_hour,max_daily_generation_jobs) values('default',10,20);
    insert into auth.users values('${owner}'),('${other}');
    insert into canvas_courses values('${owner}','${owner}','${owner}');`);
  await db.exec(readFileSync(resolve('../../supabase/migrations/20261016010000_course_reviewer_batch_requests.sql'), 'utf8'));
  await db.exec(readFileSync(resolve('../../packages/db/migrations/20260723090006_processing_quota_concurrency_hardening.sql'), 'utf8'));
  await db.exec('create trigger processing_quota before insert on processing_jobs for each row execute function enforce_processing_daily_page_quota()');
}, 30000);
afterAll(async () => { await db?.close(); });
async function seed(id: string, state = 'waiting') {
  await db.query(`insert into course_reviewer_requests(id,user_id,course_id,canvas_connection_id,material_id,revision,batch_key,title,state)
    values($1,$2,$2,$2,$3,$4,$4,'Lesson',$5)`, [id, owner, `page:${id}`, 'a'.repeat(64), state]);
  await db.query('with p as (insert into canvas_material_preparations(user_id,course_id,material_id,revision_fingerprint,state) values($1,$1,$2,$3,\'prepared\') returning id) insert into canvas_material_preparation_evidence select id,\'[]\'::jsonb from p', [owner, `page:${id}`, 'a'.repeat(64)]);
}
async function role(name: string, user: string, sql: string) {
  await db.exec('begin');
  try { await db.exec(`set local role ${name}; set local request.jwt.claim.sub='${user}'`); return await db.query(sql); }
  finally { await db.exec('rollback'); }
}
it('owner isolation and explicit grants deny anonymous and direct admission-state changes', async () => {
  await seed(owner);
  expect((await role('authenticated', owner, 'select * from course_reviewer_requests')).rows).toHaveLength(1);
  expect((await role('authenticated', other, 'select * from course_reviewer_requests')).rows).toHaveLength(0);
  await expect(role('anon', owner, 'select * from course_reviewer_requests')).rejects.toThrow('permission denied');
  await expect(role('authenticated', owner, "update course_reviewer_requests set state='admitted'")).rejects.toThrow('permission denied');
  await expect(role('authenticated', owner, `select course_reviewer_next_available_v1('${other}')`)).rejects.toThrow('permission denied');
});
it('overlapping batches share a request while retaining each stable summary key', async () => {
  const key = 'b'.repeat(64);
  for (let i=0;i<2;i++) await db.query('select link_course_reviewer_batch_v1($1,$2,$3)', [owner, owner, key]);
  expect((await db.query<{ batch_keys:string[] }>('select batch_keys from course_reviewer_requests where id=$1',[owner])).rows[0]!.batch_keys).toEqual([key]);
  expect((await db.query<{ allowed:boolean }>('select link_course_reviewer_batch_v1($1,$2,$3) as allowed', [other,owner,'c'.repeat(64)])).rows[0]!.allowed).toBe(false);
});
it('atomic receipt follows one canonical job and ordinary retry without bypassing creation', async () => {
  await db.query('insert into processing_jobs(id,user_id,idempotency_key,job_type,status) values($1,$2,$3,\'reviewer_generation\',\'queued\')', [owner, owner, `course-batch:${owner}`]);
  expect((await db.query<{ state: string; job_id: string }>('select state,job_id from course_reviewer_requests where id=$1', [owner])).rows[0]).toEqual({ state: 'admitted', job_id: owner });
  await expect(db.query('insert into processing_jobs(id,user_id,idempotency_key,job_type) values($1,$2,$3,\'reviewer_generation\')', [other, owner, `course-batch:${owner}`])).rejects.toThrow();
  await db.query('insert into processing_jobs(id,user_id,idempotency_key,job_type,retry_of_job_id) values($1,$2,\'normal-retry\',\'reviewer_generation\',$3)', [other, owner, owner]);
  expect((await db.query<{ job_id: string }>('select job_id from course_reviewer_requests where id=$1', [owner])).rows[0]!.job_id).toBe(other);
});
it('cancellation wins before admission and failed insert cannot leave an admitted request', async () => {
  const id = '33333333-3333-4333-8333-333333333333'; await seed(id, 'cancelled');
  await expect(db.query('insert into processing_jobs(id,user_id,idempotency_key,job_type) values($1,$2,$3,\'reviewer_generation\')', [id, owner, `course-batch:${id}`])).rejects.toThrow('course_batch_request_closed');
  expect((await db.query<{ state: string }>('select state from course_reviewer_requests where id=$1', [id])).rows[0]!.state).toBe('cancelled');
  expect((await db.query('select id from processing_jobs where id=$1', [id])).rows).toHaveLength(0);
});
it('rejects cross-owner course bindings and duplicate source-version receipts', async () => {
  await expect(db.query(`insert into course_reviewer_requests(user_id,course_id,canvas_connection_id,material_id,revision,batch_key,title)
    values($1,$2,$2,$3,$4,$4,'foreign')`, [other, owner, `page:${other}`, 'a'.repeat(64)])).rejects.toThrow('foreign key');
  await expect(seed(owner)).rejects.toThrow();
});
it('the existing server quota caps batch insertion and leaves the overflow request open', async () => {
  const id = '44444444-4444-4444-8444-444444444444'; await seed(id);
  await db.exec('update processing_policy_config set max_daily_generation_jobs=2');
  await expect(db.query('insert into processing_jobs(id,user_id,idempotency_key,job_type) values($1,$2,$3,\'reviewer_generation\')', [id, owner, `course-batch:${id}`])).rejects.toThrow('processing_job_daily_generation_limit_reached');
  expect((await db.query<{ state: string }>('select state from course_reviewer_requests where id=$1', [id])).rows[0]!.state).toBe('waiting');
  const next = (await db.query<{ next: string }>('select course_reviewer_next_available_v1($1)::text as next', [owner])).rows[0]!.next;
  expect(next).toBeTruthy();
});
