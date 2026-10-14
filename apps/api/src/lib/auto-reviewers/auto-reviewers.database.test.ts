import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const course = '33333333-3333-4333-8333-333333333333';
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create role anon; create role authenticated; create role service_role bypassrls;
    create table auth.users(id uuid primary key); insert into auth.users values('${owner}'),('${other}');
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    create table public.canvas_courses(id uuid primary key);
    create table public.processing_jobs(id uuid primary key);
    insert into public.canvas_courses values('${course}');`);
  await db.exec(readFileSync(resolve('../../packages/db/migrations/20261012000000_canvas_auto_reviewers.sql'), 'utf8'));
  await db.exec(readFileSync(resolve('../../packages/db/migrations/20261012000100_canvas_auto_reviewer_admission_lease.sql'), 'utf8'));
}, 30000);
beforeEach(async () => {
  await db.exec(`begin;
    insert into public.canvas_auto_reviewer_preferences(user_id) values('${other}');
    insert into public.canvas_auto_reviewer_course_state(user_id,course_id) values('${owner}','${course}'),('${other}','${course}');
    insert into public.canvas_auto_reviewer_candidates(user_id,course_id,material_id,material_revision,status)
      values('${owner}','${course}','file:one','v1','pending'),('${other}','${course}','file:two','v1','baseline');`);
});
afterEach(async () => { await db.exec('rollback'); });
afterAll(async () => { await db?.close(); });
async function asOwner() { await db.exec(`set local role authenticated; set local "request.jwt.claim.sub" = '${owner}';`); }
// A savepoint keeps expected PostgreSQL errors from aborting the whole fixture.
async function denied(sql: string) {
  await db.exec('savepoint denied');
  await expect(db.exec(sql)).rejects.toThrow();
  await db.exec('rollback to savepoint denied');
}
describe('automatic reviewer ledger privileges and RLS', () => {
  it('allows only owner preference reads, inserts and updates', async () => {
    await asOwner();
    expect((await db.query('select * from public.canvas_auto_reviewer_preferences')).rows).toHaveLength(0);
    await db.exec(`insert into public.canvas_auto_reviewer_preferences(user_id) values('${owner}');
      update public.canvas_auto_reviewer_preferences set enabled=false;`);
    expect((await db.query('select user_id,enabled from public.canvas_auto_reviewer_preferences')).rows).toEqual([{ user_id: owner, enabled: false }]);
    await denied(`insert into public.canvas_auto_reviewer_preferences(user_id) values('${other}')`);
    await denied(`update public.canvas_auto_reviewer_preferences set user_id='${other}'`);
    await denied('delete from public.canvas_auto_reviewer_preferences');
    await db.exec('reset role');
    expect((await db.query('select enabled from public.canvas_auto_reviewer_preferences where user_id=$1', [other])).rows).toEqual([{ enabled: true }]);
  });
  it.each(['canvas_auto_reviewer_candidates', 'canvas_auto_reviewer_course_state'])('isolates %s and denies all authenticated writes', async table => {
    await asOwner();
    expect((await db.query(`select user_id from public.${table}`)).rows).toEqual([{ user_id: owner }]);
    await denied(`insert into public.${table}(user_id,course_id) values('${owner}','${course}')`);
    await denied(`update public.${table} set user_id='${other}'`);
    await denied(`delete from public.${table}`);
  });
  it.each(['canvas_auto_reviewer_preferences', 'canvas_auto_reviewer_candidates', 'canvas_auto_reviewer_course_state'])('denies every anon operation on %s', async table => {
    await db.exec('set local role anon');
    for (const sql of [`select * from public.${table}`, `insert into public.${table}(user_id) values('${owner}')`, `update public.${table} set user_id='${other}'`, `delete from public.${table}`]) await denied(sql);
  });
  it('rejects duplicate owner/course/material/revision receipts', async () => {
    await denied(`insert into public.canvas_auto_reviewer_candidates(user_id,course_id,material_id,material_revision,status) values('${owner}','${course}','file:one','v1','pending')`);
  });
  it('grants service role ledger writes explicitly', async () => {
    await db.exec(`set local role service_role;
      update public.canvas_auto_reviewer_candidates set status='skipped_existing';`);
    expect((await db.query('select status from public.canvas_auto_reviewer_candidates')).rows).toEqual([{ status: 'skipped_existing' }, { status: 'skipped_existing' }]);
  });
  it('serializes service runs, expires abandoned leases and requires owner identity to release', async () => {
    const first = '44444444-4444-4444-8444-444444444444';
    const second = '55555555-5555-4555-8555-555555555555';
    await db.exec('set local role service_role');
    const claim = async (user: string, run: string) => (await db.query<{ claimed: boolean }>('select public.claim_canvas_auto_reviewer_admission_v1($1,$2) claimed', [user, run])).rows[0]!.claimed;
    expect(await claim(owner, first)).toBe(true);
    expect(await claim(owner, second)).toBe(false);
    expect(await claim(other, second)).toBe(true);
    await db.query('select public.release_canvas_auto_reviewer_admission_v1($1,$2)', [owner, second]);
    expect(await claim(owner, second)).toBe(false);
    expect(await claim(owner, first)).toBe(true);
    await db.query('select public.release_canvas_auto_reviewer_admission_v1($1,$2)', [owner, first]);
    expect(await claim(owner, second)).toBe(true);
    await db.exec(`update public.canvas_auto_reviewer_admission_leases set expires_at=now()-interval '1 second'`);
    expect(await claim(owner, first)).toBe(true);
  });
  it.each(['anon', 'authenticated'])('denies %s access to leases and lease RPCs', async role => {
    await db.exec(`set local role ${role}`);
    await denied('select * from public.canvas_auto_reviewer_admission_leases');
    await denied(`select public.claim_canvas_auto_reviewer_admission_v1('${owner}','${other}')`);
    await denied(`select public.release_canvas_auto_reviewer_admission_v1('${owner}','${other}')`);
  });
});
