import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { SourcePageSnapshotRow } from '@stay-focused/db';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const version = '33333333-3333-4333-8333-333333333333';
const snapshot = '44444444-4444-4444-8444-444444444444';
const item = '55555555-5555-4555-8555-555555555555';
const token = '66666666-6666-4666-8666-666666666666';
const localVersion = '88888888-8888-4888-8888-888888888888';
const parentVersion = '99999999-9999-4999-8999-999999999999';
const assetId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const extractionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create role anon; create role authenticated; create role service_role bypassrls;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    create schema storage;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table public.source_versions(id uuid primary key, user_id uuid, revision_kind text, metadata jsonb,
      document_asset_id uuid, extraction_result_id uuid, parent_source_version_id uuid, content_sha256 text, unique(id,user_id));
    create table public.document_assets(id uuid primary key,user_id uuid,mime_type text,upload_status text,deleted_at timestamptz);
    create table public.extraction_results(id uuid primary key,user_id uuid,document_asset_id uuid,status text,page_count integer);
    create table public.reviewer_source_snapshots(id uuid primary key,user_id uuid,source_mode text,was_edited boolean,source_count integer);
    create table public.reviewer_source_snapshot_blocks(source_snapshot_item_id uuid,user_id uuid,parser_version text,page_number integer,slide_number integer);
    create table public.canvas_files(id uuid,user_id uuid,canvas_connection_id uuid,course_id uuid,content_version_fingerprint text,current_sha256 text,
      unique(id,user_id,canvas_connection_id,course_id));
    create table public.reviewer_source_snapshot_items(id uuid primary key,source_snapshot_id uuid,user_id uuid,source_type text,file_kind text,page_count integer,
      source_row_id uuid,canvas_connection_id uuid,course_id uuid,mime_type text,parser_version text,stored_content_sha256 text,
      unique(id,source_snapshot_id,user_id));
    insert into auth.users values('${owner}'),('${other}');
    insert into public.source_versions(id,user_id,revision_kind,metadata)
      values('${version}','${owner}','canvas_resolved','{"reviewerSourceSnapshotId":"${snapshot}"}');
    insert into public.reviewer_source_snapshots values('${snapshot}','${owner}','canvas',false,1);
    insert into public.reviewer_source_snapshot_items(id,source_snapshot_id,user_id,source_type,file_kind,page_count)
      values('${item}','${snapshot}','${owner}','file','pdf',40);`);
  await db.exec(readFileSync(resolve('../../packages/db/migrations/20261013000300_source_page_snapshots.sql'), 'utf8'));
  await db.exec(readFileSync(resolve('../../packages/db/migrations/20261013000400_local_pdf_page_snapshots.sql'), 'utf8'));
  const existing = await reserve();
  await db.exec(readFileSync(resolve('../../packages/db/migrations/20261014000300_system_page_snapshot_prerender.sql'), 'utf8'));
  expect((await db.query<{ origin: string }>('select origin from public.source_page_snapshots where id=$1', [existing.id])).rows[0]?.origin).toBe('student');
  await db.exec(readFileSync(resolve('../../packages/db/migrations/20261014000600_office_page_snapshots.sql'), 'utf8'));
  await db.exec('delete from public.source_page_snapshots');
}, 30000);
beforeEach(async () => { await db.exec('begin'); });
afterEach(async () => { await db.exec('rollback'); });
afterAll(async () => { await db?.close(); });
async function reserve(page = 1, user = owner): Promise<SourcePageSnapshotRow> {
  return (await db.query<SourcePageSnapshotRow>('select * from public.reserve_source_page_snapshot_v1($1,$2,$3,$4)', [user, version, item, page])).rows[0]!;
}
async function claim(row: SourcePageSnapshotRow, lease = token) {
  return (await db.query<SourcePageSnapshotRow>('select * from public.claim_source_page_snapshot_v1($1,$2,$3)', [row.id, row.dispatch_id, lease])).rows[0]!;
}
async function finish(row: SourcePageSnapshotRow, lease = token) {
  return (await db.query<{ finished: boolean }>('select public.finish_source_page_snapshot_v1($1,$2,$3,1400,1867,null) finished', [row.id, lease, `${row.id}/${lease}.png`])).rows[0]!.finished;
}
async function denied(sql: string, values: unknown[] = []) {
  await db.exec('savepoint denied'); await expect(db.query(sql, values)).rejects.toThrow(); await db.exec('rollback to savepoint denied');
}

async function reserveSystem(page: number): Promise<SourcePageSnapshotRow> {
  return (await db.query<SourcePageSnapshotRow>('select * from public.reserve_source_page_snapshot_system_v1($1,$2,$3,$4)',
    [owner, version, item, page])).rows[0]!;
}

async function seedOffice() {
  const hash = 'a'.repeat(64); const revision = 'b'.repeat(64);
  await db.exec(`
    insert into public.canvas_files values('${assetId}','${owner}','${token}','${extractionId}','${revision}','${hash}');
    delete from public.reviewer_source_snapshot_items;
    insert into public.reviewer_source_snapshot_items(id,source_snapshot_id,user_id,source_type,file_kind,page_count,
      source_row_id,canvas_connection_id,course_id,mime_type,parser_version,stored_content_sha256)
    values('${item}','${snapshot}','${owner}','file',null,null,'${assetId}','${token}','${extractionId}',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation','canvas-office-structured-v2','${hash}');
    insert into public.office_pdf_conversions(id,user_id,source_file_id,canvas_connection_id,course_id,revision_fingerprint,
      original_sha256,pdf_sha256,byte_size,page_count,storage_path)
    values('${parentVersion}','${owner}','${assetId}','${token}','${extractionId}','${revision}','${hash}','${'c'.repeat(64)}',100,3,'${owner}/${parentVersion}.pdf');
    insert into public.reviewer_source_snapshot_blocks values('${item}','${owner}','canvas-office-structured-v2',2,2);
  `);
}
describe('Office exact-revision migration through shared snapshot reservations', () => {
  it('captures the fingerprint server-side and reserves/renders with existing student and system accounting', async () => {
    await seedOffice();
    expect((await db.query<{ office_revision_fingerprint: string }>('select office_revision_fingerprint from public.reviewer_source_snapshot_items')).rows[0]?.office_revision_fingerprint).toBe('b'.repeat(64));
    const row = await reserveSystem(2); expect(row.origin).toBe('system');
    expect(await reserve(2)).toEqual(row); expect((await claim(row)).attempt_count).toBe(1); expect(await finish(row)).toBe(true);
  });
  it('keeps an accepted old conversion when current file metadata and hash change', async () => {
    await seedOffice();
    await db.exec(`update public.canvas_files set current_sha256='${'d'.repeat(64)}',content_version_fingerprint='${'e'.repeat(64)}'`);
    expect((await reserve(2)).page_number).toBe(2);
    await denied('delete from public.canvas_files');
    expect((await reserve(2)).page_number).toBe(2);
  });
  it('never uses an old conversion for a new accepted metadata revision, even with identical bytes', async () => {
    await seedOffice();
    await db.exec(`update public.canvas_files set content_version_fingerprint='${'d'.repeat(64)}';
      delete from public.reviewer_source_snapshot_items;
      insert into public.reviewer_source_snapshot_items(id,source_snapshot_id,user_id,source_type,file_kind,source_row_id,
        canvas_connection_id,course_id,mime_type,parser_version,stored_content_sha256)
      values('${item}','${snapshot}','${owner}','file',null,'${assetId}','${token}','${extractionId}',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation','canvas-office-structured-v2','${'a'.repeat(64)}');`);
    await denied('select * from public.reserve_source_page_snapshot_system_v1($1,$2,$3,2)', [owner, version, item]);
  });
  it.each(['missing conversion', 'missing fingerprint', 'wrong hash', 'wrong owner', 'wrong page', 'edited', 'composite', 'wrong block mapping'])('denies %s', async failure => {
    await seedOffice(); let user = owner; let page = 2;
    if (failure === 'missing conversion') await db.exec('delete from public.office_pdf_conversions');
    if (failure === 'missing fingerprint') await db.exec('update public.reviewer_source_snapshot_items set office_revision_fingerprint=null');
    if (failure === 'wrong hash') await db.exec(`update public.reviewer_source_snapshot_items set stored_content_sha256='${'d'.repeat(64)}'`);
    if (failure === 'wrong owner') user = other;
    if (failure === 'wrong page') page = 4;
    if (failure === 'edited') await db.exec('update public.reviewer_source_snapshots set was_edited=true');
    if (failure === 'composite') await db.exec('update public.reviewer_source_snapshots set source_count=2');
    if (failure === 'wrong block mapping') await db.exec('update public.reviewer_source_snapshot_blocks set slide_number=3');
    await denied('select * from public.reserve_source_page_snapshot_v1($1,$2,$3,$4)', [user, version, item, page]);
  });
  it('keeps conversion locators service-only, immutable, RLS enabled and bucket private', async () => {
    await seedOffice();
    expect((await db.query<{ public: boolean }>("select public from storage.buckets where id='office-source-pdfs'")).rows[0]?.public).toBe(false);
    expect((await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where relname='office_pdf_conversions'")).rows[0]?.relrowsecurity).toBe(true);
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set local role ${role}`);
      await denied('select * from public.office_pdf_conversions');
      await denied('select public.bind_office_snapshot_revision_v1()');
      await denied("select * from public.reserve_source_page_snapshot_pdf_origin_v1($1,$2,$3,2,'student')", [owner, version, item]);
    }
    await db.exec('set local role service_role');
    expect((await db.query('select * from public.office_pdf_conversions')).rows).toHaveLength(1);
    await denied('update public.office_pdf_conversions set page_count=1');
    await denied('delete from public.office_pdf_conversions');
  });
});
describe('system pre-render quota exemption', () => {
  beforeEach(async () => { await db.exec('update public.reviewer_source_snapshot_items set page_count=100'); });
  it('reserves, claims and finishes 25 system pages without spending later student budgets', async () => {
    for (let page = 1; page <= 25; page++) {
      const row = await reserveSystem(page);
      expect(row.origin).toBe('system');
      expect((await claim(row)).attempt_count).toBe(1);
      expect(await finish(row)).toBe(true);
    }
    for (let page = 26; page <= 45; page++) {
      const row = await reserve(page);
      expect(row.origin).toBe('student');
      expect((await claim(row)).status).toBe('pending');
    }
    await denied('select * from public.reserve_source_page_snapshot_v1($1,$2,$3,46)', [owner, version, item]);
    const row = await reserve(26);
    await db.exec("update public.source_page_snapshots set lease_expires_at=now()-interval '1 second' where id='" + row.id + "'");
    expect((await claim(row)).error_code).toBe('render_limit_reached');
    expect((await db.query('select * from public.source_page_snapshot_render_attempts')).rows).toHaveLength(45);
  });
  it('claims and finishes a system row even after the student claim cap is exhausted', async () => {
    for (let page = 1; page <= 20; page++) await claim(await reserve(page));
    const row = await reserveSystem(21);
    expect((await claim(row)).error_code).toBeNull();
    expect(await finish(row)).toBe(true);
  });
  it('reuses student rows unchanged and never promotes their origin or dispatch', async () => {
    const student = await reserve(1);
    expect(await reserveSystem(1)).toEqual(student);
    for (let page = 2; page <= 20; page++) await reserve(page);
    expect(await reserveSystem(1)).toEqual(student);
    await denied('select * from public.reserve_source_page_snapshot_v1($1,$2,$3,21)', [owner, version, item]);
  });
  it('reuses system rows for student opens without changing origin', async () => {
    const system = await reserveSystem(1);
    expect(await reserve(1)).toEqual(system);
    expect(await reserveSystem(1)).toEqual(system);
  });
  it('still bounds system retries to three and fences expired/stale completion', async () => {
    const row = await reserveSystem(1);
    for (let attempt = 1; attempt <= 3; attempt++) {
      expect((await claim(row)).attempt_count).toBe(attempt);
      await db.query("update public.source_page_snapshots set lease_expires_at=now()-interval '1 second' where id=$1", [row.id]);
      expect(await finish(row)).toBe(false);
    }
    expect((await claim(row)).status).toBe('failed');
    expect((await db.query('select * from public.source_page_snapshot_render_attempts')).rows).toHaveLength(3);
  });
  it('preserves system local PDF provenance and deletion fencing', async () => {
    await seedLocal();
    const row = (await db.query<SourcePageSnapshotRow>('select * from public.reserve_source_page_snapshot_system_v1($1,$2,null,2)', [owner, localVersion])).rows[0]!;
    expect(row.origin).toBe('system');
    await claim(row);
    await db.exec("update public.document_assets set deleted_at=now(),upload_status='cleanup_pending'");
    expect(await finish(row)).toBe(false);
    await denied('select * from public.reserve_source_page_snapshot_system_v1($1,$2,null,2)', [owner, localVersion]);
  });
  it('denies system and origin helper RPCs to authenticated/anon and grants only service role', async () => {
    const args = [owner, version, item];
    await db.exec('set local role authenticated');
    await denied('select * from public.reserve_source_page_snapshot_system_v1($1,$2,$3,1)', args);
    await denied("select * from public.reserve_source_page_snapshot_origin_v1($1,$2,$3,1,'system')", args);
    await db.exec('set local role anon');
    await denied('select * from public.reserve_source_page_snapshot_system_v1($1,$2,$3,1)', args);
    await db.exec('set local role service_role');
    expect((await reserveSystem(1)).origin).toBe('system');
  });
  it('does not exempt invalid Canvas sources or foreign owners from admission checks', async () => {
    const call = 'select * from public.reserve_source_page_snapshot_system_v1($1,$2,$3,$4)';
    await denied(call, [other, version, item, 1]);
    await denied(call, [owner, version, item, 101]);
    await db.exec('update public.reviewer_source_snapshots set source_count=2');
    await denied(call, [owner, version, item, 1]);
    await denied("select * from public.reserve_source_page_snapshot_origin_v1($1,$2,$3,1,'invalid')", [owner, version, item]);
  });
});
describe('snapshot migration ownership, idempotency and render budgets', () => {
  it('reuses exactly one pending row for an owner/version/page', async () => {
    const first = await reserve(); const second = await reserve();
    expect(second.id).toBe(first.id); expect(second.dispatch_id).toBe(first.dispatch_id);
    expect((await db.query('select * from public.source_page_snapshots')).rows).toHaveLength(1);
  });
  it('rejects foreign ownership, edited sources, non-PDFs and out-of-range pages', async () => {
    const call = 'select * from public.reserve_source_page_snapshot_v1($1,$2,$3,$4)';
    await denied(call, [other, version, item, 1]); await denied(call, [owner, version, item, 41]);
    await db.exec(`update public.source_versions set revision_kind='user_edited'`); await denied(call, [owner, version, item, 1]);
    await db.exec(`update public.source_versions set revision_kind='canvas_resolved'; update public.reviewer_source_snapshots set was_edited=true`);
    await denied(call, [owner, version, item, 1]);
    await db.exec(`update public.reviewer_source_snapshots set was_edited=false; update public.reviewer_source_snapshot_items set file_kind='docx'`);
    await denied(call, [owner, version, item, 1]);
  });
  it('caps fresh reservations at 20 per rolling 24h but allows idempotent reconnect', async () => {
    for (let page = 1; page <= 20; page++) await reserve(page);
    await denied('select * from public.reserve_source_page_snapshot_v1($1,$2,$3,21)', [owner, version, item]);
    expect((await reserve(1)).status).toBe('pending');
  });
  it('fences duplicate claims and stale completion', async () => {
    const row = await reserve(); await claim(row);
    const stale = '77777777-7777-4777-8777-777777777777';
    expect((await claim(row, stale)).lease_token).toBe(token); expect(await finish(row, stale)).toBe(false);
    expect(await finish(row)).toBe(true); expect((await claim(row)).status).toBe('ready');
    expect((await db.query('select * from public.source_page_snapshot_render_attempts')).rows).toHaveLength(1);
  });
  it('counts retries against the render budget and never publishes an expired lease', async () => {
    const row = await reserve(); await claim(row);
    await db.exec(`update public.source_page_snapshots set lease_expires_at=now()-interval '1 second'`);
    expect(await finish(row)).toBe(false);
    const next = await claim(row, '77777777-7777-4777-8777-777777777777'); expect(next.attempt_count).toBe(2);
    expect((await db.query('select * from public.source_page_snapshot_render_attempts')).rows).toHaveLength(2);
  });
  it('reserves at most 20 actual render attempts including redeliveries', async () => {
    let row: SourcePageSnapshotRow | undefined;
    for (let page = 1; page <= 20; page++) { row = await reserve(page); await claim(row); }
    await db.exec(`update public.source_page_snapshots set lease_expires_at=now()-interval '1 second'`);
    expect((await claim(row!)).status).toBe('failed');
    expect((await db.query('select * from public.source_page_snapshot_render_attempts')).rows).toHaveLength(20);
  });
  it('owner select omits private locators; foreign, anon and client writes are denied', async () => {
    await reserve();
    await db.exec(`set local role authenticated; select set_config('request.jwt.claim.sub','${owner}',true)`);
    expect((await db.query('select id,status,page_number from public.source_page_snapshots')).rows).toHaveLength(1);
    await denied('select storage_path from public.source_page_snapshots');
    await denied("update public.source_page_snapshots set status='failed'");
    await denied('select * from public.reserve_source_page_snapshot_v1($1,$2,$3,1)', [owner, version, item]);
    await db.exec(`select set_config('request.jwt.claim.sub','${other}',true)`);
    expect((await db.query('select id from public.source_page_snapshots')).rows).toHaveLength(0);
    await db.exec('set local role anon'); await denied('select id from public.source_page_snapshots');
  });
  it('creates a private image-only bucket and enables RLS on both tables', async () => {
    expect((await db.query("select public,allowed_mime_types from storage.buckets where id='source-page-snapshots'")).rows).toEqual([{ public: false, allowed_mime_types: ['image/png'] }]);
    expect((await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where relname in ('source_page_snapshots','source_page_snapshot_render_attempts')")).rows.every(row => row.relrowsecurity)).toBe(true);
  });
});

async function seedLocal() {
  await db.exec(`insert into public.document_assets values('${assetId}','${owner}','application/pdf','available',null);
    insert into public.extraction_results values('${extractionId}','${owner}','${assetId}','succeeded',100);
    insert into public.source_versions(id,user_id,revision_kind,metadata,document_asset_id,extraction_result_id,parent_source_version_id,content_sha256)
      values('${parentVersion}','${owner}','normalized','{}','${assetId}','${extractionId}',null,'accepted-text'),
        ('${localVersion}','${owner}','user_edited',
        '{"sourceType":"local_file","mimeType":"application/pdf","pageProvenance":"extracted","reviewerSourceBlocks":[{"id":"page-2","pageNumber":2,"text":"Evidence"}]}',
        '${assetId}','${extractionId}','${parentVersion}','accepted-text');`);
}
async function reserveLocal(page = 2, user = owner) {
  return (await db.query<SourcePageSnapshotRow>('select * from public.reserve_source_page_snapshot_v1($1,$2,null,$3)',
    [user, localVersion, page])).rows[0]!;
}
describe('local snapshot reservations respect accepted provenance and deletion', () => {
  beforeEach(seedLocal);
  it('binds directly to the owned accepted version and reuses the same cache/dispatch', async () => {
    const row = await reserveLocal();
    expect(row.source_snapshot_id).toBeNull(); expect(row.source_snapshot_item_id).toBeNull();
    expect(row.source_version_id).toBe(localVersion); expect((await reserveLocal()).id).toBe(row.id);
    expect((await claim(row)).attempt_count).toBe(1); expect(await finish(row)).toBe(true);
  });
  it('shares the Canvas reservation and actual render budgets', async () => {
    const local = await reserveLocal(); await claim(local);
    for (let page = 1; page <= 19; page++) { const row = await reserve(page); await claim(row); }
    await denied('select * from public.reserve_source_page_snapshot_v1($1,$2,$3,20)', [owner, version, item]);
    expect((await db.query('select * from public.source_page_snapshot_render_attempts')).rows).toHaveLength(20);
    expect((await reserveLocal()).id).toBe(local.id);
  });
  it.each(['deleted', 'cleanup_pending', 'preserve_artifacts'])('denies %s before budget reservation', async state => {
    await db.query('update public.document_assets set upload_status=$1,deleted_at=$2',
      [state === 'preserve_artifacts' ? 'cleanup_pending' : state, state === 'preserve_artifacts' ? '2026-10-13' : null]);
    await denied('select * from public.reserve_source_page_snapshot_v1($1,$2,null,2)', [owner, localVersion]);
    expect((await db.query('select * from public.source_page_snapshots')).rows).toHaveLength(0);
  });
  it.each(['source', 'parent', 'asset', 'extraction'])('denies foreign %s', async field => {
    if (field === 'source' || field === 'parent') await db.query('update public.source_versions set user_id=$1 where id=$2',
      [other, field === 'source' ? localVersion : parentVersion]);
    else await db.query(`update public.${field === 'asset' ? 'document_assets' : 'extraction_results'} set user_id=$1`, [other]);
    await denied('select * from public.reserve_source_page_snapshot_v1($1,$2,null,2)', [owner, localVersion]);
  });
  it.each(['edited', 'unavailable', 'missing blocks', 'invalid blocks', 'duplicate blocks', 'wrong parent hash', 'uncited page'])('denies %s', async gap => {
    if (gap === 'edited' || gap === 'unavailable') await db.query(
      "update public.source_versions set metadata=jsonb_set(metadata,'{pageProvenance}',to_jsonb($1::text)) where id=$2", [gap, localVersion]);
    if (gap === 'missing blocks') await db.query("update public.source_versions set metadata=metadata-'reviewerSourceBlocks' where id=$1", [localVersion]);
    if (gap === 'invalid blocks') await db.query("update public.source_versions set metadata=jsonb_set(metadata,'{reviewerSourceBlocks}','[{\"id\":\"page-2\",\"pageNumber\":3,\"text\":\"Evidence\"}]') where id=$1", [localVersion]);
    if (gap === 'duplicate blocks') await db.query("update public.source_versions set metadata=jsonb_set(metadata,'{reviewerSourceBlocks}',(metadata->'reviewerSourceBlocks') || (metadata->'reviewerSourceBlocks')) where id=$1", [localVersion]);
    if (gap === 'wrong parent hash') await db.query("update public.source_versions set content_sha256='changed' where id=$1", [parentVersion]);
    await denied(`select * from public.reserve_source_page_snapshot_v1($1,$2,null,${gap === 'uncited page' ? 3 : 2})`, [owner, localVersion]);
  });
  it('fences deletion after download/upload and leaves a terminal unavailable row', async () => {
    const row = await reserveLocal(); await claim(row);
    await db.exec("update public.document_assets set deleted_at=now(),upload_status='cleanup_pending'");
    expect(await finish(row)).toBe(false);
    const terminal = (await db.query<SourcePageSnapshotRow>('select * from public.source_page_snapshots where id=$1', [row.id])).rows[0]!;
    expect(terminal.status).toBe('failed'); expect(terminal.error_code).toBe('source_revision_unavailable');
    expect(terminal.storage_path).toBeNull(); expect((await claim(row)).attempt_count).toBe(1);
  });
  it('rejects partial Canvas/local bindings and retains owner-only local cache access', async () => {
    const row = await reserveLocal();
    await denied('update public.source_page_snapshots set source_snapshot_id=$1 where id=$2', [snapshot, row.id]);
    await db.exec(`set local role authenticated; select set_config('request.jwt.claim.sub','${owner}',true)`);
    expect((await db.query('select id from public.source_page_snapshots')).rows).toHaveLength(1);
    await denied('select * from public.reserve_source_page_snapshot_v1($1,$2,null,2)', [owner, localVersion]);
    await db.exec(`select set_config('request.jwt.claim.sub','${other}',true)`);
    expect((await db.query('select id from public.source_page_snapshots')).rows).toHaveLength(0);
  });
});
