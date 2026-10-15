import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, expect, it } from 'vitest';
let db: PGlite;
const owner = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222';
const version = '33333333-3333-4333-8333-333333333333';
const token = 'a'.repeat(64);
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create role anon; create role authenticated; create role service_role bypassrls;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    create table generated_artifacts(id uuid primary key,user_id uuid,latest_version_id uuid,artifact_type text,deleted_at timestamptz,unique(id,user_id));
    alter table generated_artifacts enable row level security;
    create policy owner_select on generated_artifacts for select to authenticated using ((select auth.uid())=user_id);
    grant select on generated_artifacts to authenticated,service_role;
    insert into auth.users values('${owner}'),('${other}');
    insert into generated_artifacts values('${owner}','${owner}','${version}','reviewer',null);`);
  await db.exec(readFileSync(resolve('../../packages/db/migrations/20261015050000_public_reviewer_shares.sql'), 'utf8'));
}, 30000);
afterAll(async () => { await db?.close(); });
async function mutate(action: string, user = owner, nextToken = token, snapshot = { title: 'Original' }) {
  return (await db.query<{ token: string; snapshot: { title: string }; revoked_at: string | null }>(
    'select * from mutate_reviewer_share_v1($1,$2,$3,$4,$5,$6::jsonb)',
    [user, owner, action, nextToken, version, JSON.stringify(snapshot)])).rows[0]!;
}
async function role(name: string, user: string, sql: string) {
  await db.exec('begin');
  try { await db.exec(`set local role ${name}; set local request.jwt.claim.sub='${user}';`); return await db.query(sql); }
  finally { await db.exec('rollback'); }
}
it('create is idempotent, later reviewer edits are frozen, update retains token, stop and reshare rotates', async () => {
  expect((await mutate('create')).token).toBe(token);
  expect((await mutate('create', owner, 'b'.repeat(64), { title: 'Edited' })).snapshot.title).toBe('Original');
  const updated = await mutate('update', owner, 'b'.repeat(64), { title: 'Edited' });
  expect(updated.token).toBe(token); expect(updated.snapshot.title).toBe('Edited');
  expect((await mutate('revoke')).revoked_at).not.toBeNull();
  await expect(mutate('update')).rejects.toThrow('not_found');
  expect((await mutate('create', owner, 'b'.repeat(64))).token).toBe('b'.repeat(64));
  expect((await db.query('select * from reviewer_shares')).rows).toHaveLength(1);
});
it('denies foreign create/update/revoke and anonymous access including RPC', async () => {
  for (const action of ['create', 'update', 'revoke']) await expect(mutate(action, other)).rejects.toThrow('not_found');
  expect((await role('authenticated', other, 'select * from reviewer_shares')).rows).toEqual([]);
  expect((await role('authenticated', owner, 'select * from reviewer_shares')).rows).toHaveLength(1);
  await expect(role('anon', owner, 'select * from reviewer_shares')).rejects.toThrow('permission denied');
  for (const name of ['anon', 'authenticated']) await expect(role(name, owner,
    `select * from mutate_reviewer_share_v1('${owner}','${owner}','revoke','${token}',null,'{}')`)).rejects.toThrow('permission denied');
});
it('RLS permits only owner writes, forbids reassignment and foreign artifact references', async () => {
  expect((await role('authenticated', other, `update reviewer_shares set revoked_at=now() returning token`)).rows).toEqual([]);
  await expect(role('authenticated', other, `insert into reviewer_shares(user_id,artifact_id,token,snapshot) values('${other}','${owner}','${'c'.repeat(64)}','{}')`)).rejects.toThrow();
  await expect(role('authenticated', owner, `update reviewer_shares set user_id='${other}'`)).rejects.toThrow();
  expect((await role('authenticated', owner, 'update reviewer_shares set revoked_at=now() returning token')).rows).toHaveLength(1);
});
it('fences a changed/deleted/non-reviewer artifact and enforces random-token shape', async () => {
  await expect(db.query(`select * from mutate_reviewer_share_v1('${owner}','${owner}','update','${token}','${other}','{}')`)).rejects.toThrow('not_found');
  await expect(db.exec("update reviewer_shares set token='guessable'")).rejects.toThrow();
  await db.exec('begin');
  try { await db.exec('update generated_artifacts set deleted_at=now()'); await expect(mutate('create')).rejects.toThrow('not_found'); }
  finally { await db.exec('rollback'); }
});
