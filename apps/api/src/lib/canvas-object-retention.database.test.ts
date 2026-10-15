import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const owner = '11111111-1111-4111-8111-111111111111';
const file = '22222222-2222-4222-8222-222222222222';
const hash = 'a'.repeat(64);
const bucket = 'canvas-source-files';
const key = `canvas/${owner}/${file}/${hash}`;
const migration = readFileSync(resolve('../../packages/db/migrations/20261013000200_canvas_source_provenance_retention.sql'), 'utf8');
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    grant usage on schema public to anon,authenticated,service_role;
    create schema storage;
    create table storage.objects(bucket_id text, name text, primary key(bucket_id,name));
    create table public.canvas_files(id uuid primary key, user_id uuid, storage_bucket text, storage_object_key text);
    create table public.reviewer_source_snapshot_items(id uuid default gen_random_uuid(), user_id uuid,
      source_row_id uuid, source_type text, file_kind text, stored_content_sha256 text);
    grant select on public.canvas_files,public.reviewer_source_snapshot_items to service_role;`);
  await db.exec(migration);
}, 30000);
beforeEach(async () => {
  await db.exec('truncate storage.objects,public.canvas_files,public.reviewer_source_snapshot_items,public.canvas_object_cleanup_claims');
  await db.exec('begin');
  await db.query('insert into storage.objects values($1,$2)', [bucket, key]);
});
afterEach(async () => { await db.exec('rollback'); });
afterAll(async () => { await db?.close(); });
async function claim() {
  return (await db.query<{ claimed: boolean }>('select public.claim_canvas_object_cleanup_v1($1,$2) claimed', [bucket, key])).rows[0]!.claimed;
}
async function insertReference() {
  await db.query(`insert into public.reviewer_source_snapshot_items(user_id,source_row_id,source_type,file_kind,stored_content_sha256)
    values($1,$2,'file','pdf',$3)`, [owner, file, hash]);
}
async function removeIfClaimed() {
  if (!await claim()) return false;
  // Local Storage stand-in: only a successful claim authorizes object removal.
  await db.query('delete from storage.objects where bucket_id=$1 and name=$2', [bucket, key]);
  return true;
}
async function denied(sql: string, values: string[] = []) {
  await db.exec('savepoint denied');
  await expect(db.query(sql, values)).rejects.toThrow();
  await db.exec('rollback to savepoint denied');
}

describe('Canvas cleanup database claims and reference acceptance', () => {
  it('deletes an unreferenced old object and completes its claim only after disappearance', async () => {
    expect(await removeIfClaimed()).toBe(true);
    expect((await db.query('select * from storage.objects')).rows).toHaveLength(0);
    expect((await db.query<{ finished: boolean }>('select public.finish_canvas_object_cleanup_v1($1,$2) finished', [bucket, key])).rows[0]!.finished).toBe(true);
    expect((await db.query('select * from public.canvas_object_cleanup_claims')).rows).toHaveLength(0);
  });
  it('keeps the exact historical object referenced by a snapshot after a newer file revision exists', async () => {
    await insertReference();
    const newerKey = `canvas/${owner}/${file}/${'b'.repeat(64)}`;
    await db.query('insert into storage.objects values($1,$2)', [bucket, newerKey]);
    await db.query('insert into public.canvas_files values($1,$2,$3,$4)', [file, owner, bucket, newerKey]);
    expect(await removeIfClaimed()).toBe(false);
    expect((await db.query('select name from storage.objects where name=$1', [key])).rows).toHaveLength(1);
  });
  it('keeps an object referenced by a current file', async () => {
    await db.query('insert into public.canvas_files values($1,$2,$3,$4)', [file, owner, bucket, key]);
    expect(await removeIfClaimed()).toBe(false);
  });
  it('keeps a reference inserted while cleanup holds the advisory lock', async () => {
    // A deterministic database interleaving inserts a reference at claim
    // insertion, after the initial reference check while its lock is held.
    // PGlite has one connection; this tests the reentrant transaction case.
    await db.exec(`create function public.test_reference_during_claim() returns trigger language plpgsql as $$
      begin
        if not exists(select 1 from pg_locks where locktype='advisory' and granted) then
          raise exception 'cleanup must hold advisory lock';
        end if;
        insert into public.reviewer_source_snapshot_items(user_id,source_row_id,source_type,file_kind,stored_content_sha256)
          values('${owner}','${file}','file','pdf','${hash}');
        return new;
      end; $$;
      create trigger test_reference_during_claim before insert on public.canvas_object_cleanup_claims
        for each row execute function public.test_reference_during_claim();`);
    expect(await removeIfClaimed()).toBe(false);
    expect((await db.query('select * from public.reviewer_source_snapshot_items')).rows).toHaveLength(1);
    expect((await db.query('select * from storage.objects')).rows).toHaveLength(1);
    expect((await db.query('select * from public.canvas_object_cleanup_claims')).rows).toHaveLength(0);
  });
  it('rejects a late snapshot after cleanup commits its claim, before HTTP deletion', async () => {
    expect(await claim()).toBe(true);
    // The claim persists across transactions, unlike the advisory lock.
    await db.exec('commit; begin');
    await denied(`insert into public.reviewer_source_snapshot_items(user_id,source_row_id,source_type,file_kind,stored_content_sha256)
      values($1,$2,'file','pdf',$3)`, [owner, file, hash]);
    expect((await db.query('select * from storage.objects')).rows).toHaveLength(1);
  });
  it('rejects reintroducing a current file reference during a claim', async () => {
    expect(await claim()).toBe(true);
    await denied('insert into public.canvas_files values($1,$2,$3,$4)', [file, owner, bucket, key]);
  });
  it('never grants a second concurrent remover or expires an uncertain claim', async () => {
    expect(await claim()).toBe(true);
    expect(await claim()).toBe(false);
    await db.exec(`update public.canvas_object_cleanup_claims set claimed_at=now()-interval '1 year'`);
    expect(await claim()).toBe(false);
    expect((await db.query<{ finished: boolean }>('select public.finish_canvas_object_cleanup_v1($1,$2) finished', [bucket, key])).rows[0]!.finished).toBe(false);
    await denied(`insert into public.reviewer_source_snapshot_items(user_id,source_row_id,source_type,file_kind,stored_content_sha256)
      values($1,$2,'file','pdf',$3)`, [owner, file, hash]);
  });
  it('rejects absent PDF bytes and permits unrelated Page provenance', async () => {
    await db.query('delete from storage.objects where bucket_id=$1 and name=$2', [bucket, key]);
    await denied(`insert into public.reviewer_source_snapshot_items(user_id,source_row_id,source_type,file_kind,stored_content_sha256)
      values($1,$2,'file','pdf',$3)`, [owner, file, hash]);
    await db.query(`insert into public.reviewer_source_snapshot_items(user_id,source_row_id,source_type) values($1,$2,'page')`, [owner, file]);
  });
  it.each(['anon','authenticated'])('denies %s cleanup execution and claim table access', async role => {
    await db.exec(`set local role ${role}`);
    await denied('select public.claim_canvas_object_cleanup_v1($1,$2)', [bucket, key]);
    await denied('select public.finish_canvas_object_cleanup_v1($1,$2)', [bucket, key]);
    await denied('select * from public.canvas_object_cleanup_claims');
  });
  it('allows service-only claim execution but prevents direct claim mutation', async () => {
    await db.exec('set local role service_role');
    expect(await claim()).toBe(true);
    await denied('delete from public.canvas_object_cleanup_claims');
  });
  it('declines keys outside the private Canvas namespace', async () => {
    expect((await db.query<{ claimed: boolean }>('select public.claim_canvas_object_cleanup_v1($1,$2) claimed', ['other-bucket',key])).rows[0]!.claimed).toBe(false);
  });
});
