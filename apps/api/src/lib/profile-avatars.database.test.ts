import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
const owner = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222';
const path = `${owner}/avatar-33333333-3333-4333-8333-333333333333.png`;
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth,storage to anon,authenticated,service_role;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant all on storage.objects to anon,authenticated,service_role;
    create policy broad_existing_policy on storage.objects for all to anon,authenticated using(true) with check(true);
    insert into storage.objects values('profile-avatars','${path}'),('another-bucket','other');
    insert into auth.users values('${owner}'),('${other}');`);
  await db.exec(readFileSync(resolve(__dirname, '../../../../packages/db/migrations/20261018000300_profile_avatars.sql'), 'utf8'));
}, 30_000);
afterAll(async () => { await db?.close(); });
beforeEach(async () => { await db.exec('reset role; truncate user_profiles;'); });
it('creates a private 2MiB type-limited bucket', async () => {
  expect((await db.query('select public,file_size_limit::int,allowed_mime_types from storage.buckets')).rows).toEqual([{ public: false, file_size_limit: 2097152, allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'] }]);
});
it('isolates own-row metadata reads and denies client writes, cleanup reads and RPC execution', async () => {
  await db.query('insert into user_profiles(user_id,avatar_path) values($1,$2),($3,null)', [owner,path,other]);
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${owner}'`);
  expect((await db.query('select user_id,avatar_path from user_profiles')).rows).toEqual([{ user_id: owner, avatar_path: path }]);
  await expect(db.query('select * from user_profiles')).rejects.toThrow(/permission denied/);
  await expect(db.query('update user_profiles set avatar_path=null')).rejects.toThrow(/permission denied/);
  await expect(db.query('select commit_profile_avatar_v1($1,null,null)', [owner])).rejects.toThrow(/permission denied/);
  await db.exec('reset role; set role anon');
  await expect(db.query('select user_id from user_profiles')).rejects.toThrow(/permission denied/);
});
it('performs a service-only compare-and-swap and durable retirement without losing a winner', async () => {
  await db.exec('set role service_role');
  const commit = async (expected: string | null, next: string | null) => (await db.query<{ ok: boolean }>('select commit_profile_avatar_v1($1,$2,$3) as ok', [owner,expected,next])).rows[0]!.ok;
  expect(await commit(null,path)).toBe(true); expect(await commit(null,null)).toBe(false);
  expect(await commit(path,null)).toBe(true);
  expect((await db.query('select avatar_path,avatar_cleanup_paths from user_profiles')).rows).toEqual([{ avatar_path: null, avatar_cleanup_paths: [path] }]);
  await db.query('select finish_profile_avatar_cleanup_v1($1,$2)', [owner,[path]]);
  expect((await db.query('select avatar_cleanup_paths from user_profiles')).rows).toEqual([{ avatar_cleanup_paths: [] }]);
});
it('rejects cross-owner paths at the database boundary', async () => {
  await expect(db.query('insert into user_profiles(user_id,avatar_path) values($1,$2)', [other,path])).rejects.toThrow(/user_profiles_avatar_owner/);
});
it.each(['anon', 'authenticated'])('denies %s direct Storage access even with an unrelated permissive policy', async role => {
  await db.exec(`set role ${role}`);
  expect((await db.query('select bucket_id from storage.objects')).rows).toEqual([{ bucket_id: 'another-bucket' }]);
  await expect(db.query("insert into storage.objects values('profile-avatars','injected')")).rejects.toThrow(/row-level security/);
  expect((await db.query("delete from storage.objects where bucket_id='profile-avatars' returning name")).rows).toEqual([]);
});
