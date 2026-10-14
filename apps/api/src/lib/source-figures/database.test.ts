import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let db: PGlite;
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create role anon; create role authenticated; create role service_role bypassrls;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    insert into auth.users values ('${owner}'),('${other}');`);
  await db.exec(readFileSync(resolve('../../packages/db/migrations/20261014000400_source_figures.sql'), 'utf8'));
  await db.exec(readFileSync(resolve('../../packages/db/migrations/20261014000500_source_figure_extraction_receipts.sql'), 'utf8'));
  await db.exec(`set role service_role; insert into public.source_figures
    (user_id,source_kind,source_row_id,original_sha256,page_number,position,width,height,byte_size,sha256,storage_path)
    values ('${owner}','canvas_file','${owner}','${'a'.repeat(64)}',1,0,200,200,100,'${'b'.repeat(64)}','${owner}/${owner}.png'); reset role;`);
}, 30000);
afterAll(async () => { await db?.close(); });
async function asRole(role: string, user: string, sql: string) {
  await db.exec('begin');
  try {
    await db.exec(`set local role ${role}; set local request.jwt.claim.sub='${user}';`);
    return await db.query(sql);
  } finally { await db.exec('rollback'); }
}
describe('source figure database contract', () => {
  it('allows only owner safe-column reads', async () => {
    expect((await asRole('authenticated', owner, 'select id,width,page_number from source_figures')).rows).toHaveLength(1);
    expect((await asRole('authenticated', other, 'select id from source_figures')).rows).toHaveLength(0);
    await expect(asRole('anon', owner, 'select id from source_figures')).rejects.toThrow();
  });
  it('hides private image keys and hashes from direct owner reads', async () => {
    for (const column of ['storage_path', 'sha256', 'original_sha256'])
      await expect(asRole('authenticated', owner, `select ${column} from source_figures`)).rejects.toThrow();
  });
  it('denies anonymous/authenticated writes and service mutation of immutable rows', async () => {
    for (const role of ['anon', 'authenticated']) {
      await expect(asRole(role, owner, 'delete from source_figures')).rejects.toThrow();
      await expect(asRole(role, owner, 'update source_figures set width=100')).rejects.toThrow();
      await expect(asRole(role, owner, 'insert into source_figures default values')).rejects.toThrow();
    }
    await expect(asRole('service_role', owner, 'update source_figures set width=100')).rejects.toThrow();
    await expect(asRole('service_role', owner, 'delete from source_figures')).rejects.toThrow();
  });
  it('keeps empty-result receipts service-only', async () => {
    for (const role of ['anon','authenticated']) {
      await expect(asRole(role,owner,'select * from source_figure_extractions')).rejects.toThrow();
      await expect(asRole(role,owner,'insert into source_figure_extractions default values')).rejects.toThrow();
    }
    expect((await asRole('service_role',owner,'select * from source_figure_extractions')).rows).toEqual([]);
  });
  it('keeps the bucket private with no direct client storage policy', async () => {
    const bucket = (await db.query('select * from storage.buckets')).rows[0];
    expect(bucket).toMatchObject({ id: 'source-figures', public: false, file_size_limit: 5242880 });
    expect((await db.query("select * from pg_policies where schemaname='storage'")).rows).toEqual([]);
  });
  it('retains distinct historical revisions and enforces idempotency', async () => {
    await db.exec('begin');
    try {
      await db.exec(`insert into source_figures (user_id,source_kind,source_row_id,original_sha256,page_number,position,width,height,byte_size,sha256,storage_path)
        select user_id,source_kind,source_row_id,'${'c'.repeat(64)}',page_number,position,width,height,byte_size,sha256,storage_path from source_figures;`);
      expect((await db.query('select id from source_figures')).rows).toHaveLength(2);
      await expect(db.exec(`insert into source_figures (user_id,source_kind,source_row_id,original_sha256,page_number,position,width,height,byte_size,sha256,storage_path)
        select user_id,source_kind,source_row_id,original_sha256,page_number,position,width,height,byte_size,sha256,storage_path from source_figures limit 1;`)).rejects.toThrow();
    } finally { await db.exec('rollback'); }
  });
});
