import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanvasClient } from '@stay-focused/canvas';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { mapCanvasFile } from './canvas-file-normalize';
import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';

const mocks = vi.hoisted(() => ({ readConnection: vi.fn(), decrypt: vi.fn(), references: vi.fn() }));
vi.mock('./canvas-file-access', () => ({ readCanvasFileAccessReferences: mocks.references }));
vi.mock('@/lib/canvas-routes', () => ({
  CONNECTION_SECRET_COLUMNS: 'id,user_id,status,base_url',
  readConnection: mocks.readConnection,
  decryptConnectionToken: mocks.decrypt,
  createCanvasClient: (baseUrl: string, personalAccessToken: string) => new CanvasClient({ baseUrl, personalAccessToken }),
}));
import { ingestCanvasFiles } from './canvas-file-ingestion';

const connection = { id: 'connection', user_id: 'owner', status: 'active', base_url: 'https://canvas.test' };
const file = { id: 'file-row', user_id: 'owner', canvas_connection_id: 'connection', canvas_course_id: '101',
  canvas_file_id: '42', ingestion_eligibility: 'eligible_document', size_bytes: 5 };
const query = { select: vi.fn(), eq: vi.fn(), in: vi.fn(), update: vi.fn(), maybeSingle: vi.fn() };
const rpc = vi.fn();
const upload = vi.fn();
const exists = vi.fn();
const remove = vi.fn();
const from = vi.fn(() => query);
const client = { from, rpc, storage: { from: () => ({ upload, exists, remove }) } } as unknown as SupabaseClient<Database>;
const request = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.resetAllMocks();
  mocks.references.mockResolvedValue(new Map());
  vi.stubGlobal('fetch', request);
  mocks.readConnection.mockResolvedValue({ ok: true, row: connection });
  mocks.decrypt.mockReturnValue('decrypted-token');
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockResolvedValue({ data: [file], error: null });
  // Updates retain the real owner/connection predicates while completing locally.
  query.update.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue({ data: { id: file.id }, error: null });
  rpc.mockResolvedValue({ error: null });
  upload.mockResolvedValue({ error: null });
  exists.mockResolvedValue({ data: false, error: null });
  remove.mockResolvedValue({ error: null });
  request.mockResolvedValueOnce(Response.json({ id: 42, display_name: 'Lesson.pdf', filename: 'Lesson.pdf',
    'content-type': 'application/pdf', size: 5, url: 'https://canvas.test/files/42/download',
    locked: false, hidden: false, hidden_for_user: false }))
    .mockResolvedValueOnce(new Response(new Uint8Array([37, 80, 68, 70, 45]), { headers: { 'Content-Type': 'application/pdf' } }));
});

// Promoted from the accepted PV1b rollback audit; accepted objects must survive.
describe('Canvas object retention and rollback', () => {
  const acceptedBytes = new Uint8Array([37, 80, 68, 70, 45]);
  const acceptedHash = createHash('sha256').update(acceptedBytes).digest('hex');
  const acceptedKey = `canvas/owner/${file.id}/${acceptedHash}`;
  it.each(['current', 'historical'])('keeps the accepted %s revision after an upsert and failed row update', async revision => {
    const storedObjects = new Set([acceptedKey]);
    query.in.mockResolvedValue({ data: [{ ...file,
      current_sha256: revision === 'current' ? acceptedHash : 'b'.repeat(64),
      storage_bucket: 'canvas-source-files',
      storage_object_key: revision === 'current' ? acceptedKey : `canvas/owner/${file.id}/${'b'.repeat(64)}`,
      content_version_fingerprint: 'previous-metadata-fingerprint',
    }], error: null });
    query.maybeSingle.mockResolvedValue({ data: null, error: { code: 'synthetic_row_update_failure' } });
    exists.mockImplementation(async (key: string) => ({ data: storedObjects.has(key), error: null }));
    remove.mockImplementation(async (keys: string[]) => {
      for (const key of keys) storedObjects.delete(key);
      return { error: null };
    });
    expect(await ingestCanvasFiles({ client, userId: 'owner', fileIds: [file.id], brokeredCanvasToken: 'synthetic-token' }))
      .toMatchObject({ ok: true, response: { failed: 1 } });
    expect(upload).toHaveBeenCalledWith(acceptedKey, acceptedBytes, expect.objectContaining({ upsert: true }));
    expect(remove).not.toHaveBeenCalled();
    expect(storedObjects.has(acceptedKey)).toBe(true);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it.each([true, false])('removes a new rollback object only with an unreferenced claim (%s)', async claimed => {
    query.maybeSingle.mockResolvedValue({ data: null, error: { code: 'row_update_failed' } });
    rpc.mockImplementation(async (name: string) => ({ data: name === 'claim_canvas_object_cleanup_v1' ? claimed : true, error: null }));
    await ingestCanvasFiles({ client, userId: 'owner', fileIds: [file.id] });
    expect(rpc).toHaveBeenCalledWith('claim_canvas_object_cleanup_v1', { p_bucket: 'canvas-source-files', p_key: acceptedKey });
    expect(remove).toHaveBeenCalledTimes(claimed ? 1 : 0);
    if (claimed) expect(rpc).toHaveBeenCalledWith('finish_canvas_object_cleanup_v1', expect.anything());
  });
  it('recognizes an explicit Storage 404 as new before uploading', async () => {
    exists.mockResolvedValue({ data: false, error: { status: 404 } });
    query.maybeSingle.mockResolvedValue({ data: null, error: { code: 'row_update_failed' } });
    rpc.mockResolvedValue({ data: true, error: null });
    await ingestCanvasFiles({ client, userId: 'owner', fileIds: [file.id] });
    expect(exists.mock.invocationCallOrder[0]).toBeLessThan(upload.mock.invocationCallOrder[0]!);
    expect(remove).toHaveBeenCalledWith([acceptedKey]);
  });
  it.each(['response', 'throw'])('keeps a new object when the cleanup claim fails (%s)', async kind => {
    query.maybeSingle.mockResolvedValue({ data: null, error: { code: 'row_update_failed' } });
    rpc.mockImplementation(async (name: string) => {
      if (name !== 'claim_canvas_object_cleanup_v1') return { error: null };
      if (kind === 'throw') throw new Error('private key/provider error');
      return { error: { message: 'private key/provider error' } };
    });
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await ingestCanvasFiles({ client, userId: 'owner', fileIds: [file.id] });
    expect(remove).not.toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toContain('private');
    expect(log).toHaveBeenCalledWith('canvas_file_ingestion.cleanup_failed', { code: expect.stringMatching(/^canvas_object_cleanup_/) });
  });
  it.each(['response', 'throw'])('keeps pre-existing or unknown bytes on an existence error (%s)', async kind => {
    if (kind === 'throw') exists.mockRejectedValue(new Error('private error'));
    else exists.mockResolvedValue({ data: false, error: { status: 500 } });
    query.maybeSingle.mockResolvedValue({ data: null, error: { code: 'row_update_failed' } });
    await ingestCanvasFiles({ client, userId: 'owner', fileIds: [file.id] });
    expect(remove).not.toHaveBeenCalled();
    expect(rpc.mock.calls.map(call => call[0])).not.toContain('claim_canvas_object_cleanup_v1');
  });
  it.each([true, false])('uses the same claim for old revisions after successful ingestion (%s)', async claimed => {
    const oldKey = `canvas/owner/${file.id}/${'b'.repeat(64)}`;
    query.in.mockResolvedValue({ data: [{ ...file, storage_bucket: 'canvas-source-files', storage_object_key: oldKey }], error: null });
    rpc.mockResolvedValue({ data: claimed, error: null });
    await ingestCanvasFiles({ client, userId: 'owner', fileIds: [file.id] });
    expect(rpc).toHaveBeenCalledWith('claim_canvas_object_cleanup_v1', { p_bucket: 'canvas-source-files', p_key: oldKey });
    expect(remove).toHaveBeenCalledTimes(claimed ? 1 : 0);
    if (claimed) expect(remove).toHaveBeenCalledWith([oldKey]);
  });
  it('keeps the durable claim after a Storage removal error', async () => {
    query.maybeSingle.mockResolvedValue({ data: null, error: { code: 'row_update_failed' } });
    rpc.mockResolvedValue({ data: true, error: null });
    remove.mockResolvedValue({ error: { message: 'private provider error' } });
    await ingestCanvasFiles({ client, userId: 'owner', fileIds: [file.id] });
    expect(rpc.mock.calls.map(call => call[0])).not.toContain('finish_canvas_object_cleanup_v1');
  });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('Canvas file ingestion credentials', () => {
  it.each([undefined, 'brokered-sync-token'])('downloads with the expected Canvas token (%s)', async brokeredCanvasToken => {
    const result = await ingestCanvasFiles({ client, userId: 'owner', fileIds: [file.id], brokeredCanvasToken });
    expect(result).toMatchObject({ ok: true, response: { succeeded: 1, totalBytesStored: 5 } });
    expect(mocks.decrypt).toHaveBeenCalledTimes(brokeredCanvasToken ? 0 : 1);
    expect(request).toHaveBeenCalledTimes(2);
    for (const [, options] of request.mock.calls) {
      expect(new Headers(options?.headers).get('Authorization')).toBe(`Bearer ${brokeredCanvasToken ?? 'decrypted-token'}`);
    }
    expect(query.eq).toHaveBeenCalledWith('user_id', 'owner');
    expect(query.eq).toHaveBeenCalledWith('canvas_connection_id', connection.id);
  });
  it('retains the safe decrypt failure when no brokered token is provided', async () => {
    mocks.decrypt.mockImplementation(() => { throw new Error('private credentials'); });
    expect(await ingestCanvasFiles({ client, userId: 'owner', fileIds: [file.id] }))
      .toMatchObject({ ok: false, code: 'canvas_connection_corrupt' });
    expect(request).not.toHaveBeenCalled();
  });
  it.each([{ ...connection, status: 'disconnected' }, { ...connection, user_id: 'other-owner' }])(
    'rejects an inactive or foreign connection even with a brokered token (%s)', async row => {
      mocks.readConnection.mockResolvedValue({ ok: true, row });
      expect(await ingestCanvasFiles({ client, userId: 'owner', fileIds: [file.id], brokeredCanvasToken: 'brokered-sync-token' }))
        .toMatchObject({ ok: false, code: 'canvas_connection_corrupt' });
      expect(mocks.decrypt).not.toHaveBeenCalled();
      expect(request).not.toHaveBeenCalled();
      expect(from).not.toHaveBeenCalled();
    });
});
it.each([false, true])('binds retained bytes to the actual inventory revision (same revision: %s)', async sameRevision => {
  const db = new PGlite();
  try {
    const ids = { owner:'11111111-1111-4111-8111-111111111111', connection:'22222222-2222-4222-8222-222222222222',
      course:'33333333-3333-4333-8333-333333333333', run:'44444444-4444-4444-8444-444444444444', file:'55555555-5555-4555-8555-555555555555' };
    await db.exec(`create schema auth; create table auth.users(id uuid primary key);
      create table canvas_connections(id uuid,user_id uuid,unique(id,user_id));
      create table canvas_courses(id uuid,user_id uuid,canvas_connection_id uuid,canvas_course_id text,unique(id,user_id,canvas_connection_id,canvas_course_id));
      create table canvas_sync_runs(id uuid,user_id uuid,canvas_connection_id uuid,status text,resource_counts jsonb);
      create table canvas_modules(id uuid,course_id uuid,canvas_module_id text);
      create table canvas_module_items(id uuid,module_id uuid,canvas_module_item_id text);
      create table canvas_pages(id uuid,course_id uuid,canvas_page_url text);
      create table canvas_assignments(id uuid,course_id uuid,canvas_assignment_id text);
      create table canvas_announcements(id uuid,course_id uuid,canvas_announcement_id text);`);
    const migration = readFileSync(resolve(__dirname, '../../../../packages/db/migrations/202607060003_add_canvas_file_ingestion_foundation.sql'),'utf8');
    await db.exec(migration.slice(0,migration.indexOf('create or replace function public.set_canvas_files_updated_at')));
    await db.exec(migration.slice(migration.indexOf('create or replace function public.replace_canvas_course_files_inventory('),
      migration.indexOf('create or replace function public.record_canvas_file_ingestion_result(')));
    await db.query('insert into auth.users values ($1)',[ids.owner]);
    await db.query('insert into canvas_connections values ($1,$2)',[ids.connection,ids.owner]);
    await db.query('insert into canvas_courses values ($1,$2,$3,$4)',[ids.course,ids.owner,ids.connection,'101']);
    await db.query('insert into canvas_sync_runs(id,user_id,canvas_connection_id,status) values ($1,$2,$3,$4)',[ids.run,ids.owner,ids.connection,'running']);
    const providerB = { id:42, display_name:'Lesson.pdf',filename:'Lesson.pdf','content-type':'application/pdf',size:6,
      url:'https://canvas.test/files/42/download',locked:false,hidden:false,hidden_for_user:false,
      updated_at:'2026-10-14T01:00:00Z',modified_at:'2026-10-14T01:00:00Z' };
    request.mockReset().mockResolvedValueOnce(Response.json(providerB));
    const fresh = await new CanvasClient({baseUrl:connection.base_url,personalAccessToken:'synthetic-token'}).getCourseFile('101','42');
    const versionB = mapCanvasFile(fresh);
    const versionA = mapCanvasFile({...fresh,updatedAt:'2026-10-13T01:00:00Z',modifiedAt:'2026-10-13T01:00:00Z'});
    const bytesA = new Uint8Array([37,80,68,70,45,65]);
    const bytesB = new Uint8Array([37,80,68,70,45,66]);
    const hashA = createHash('sha256').update(bytesA).digest('hex');
    const hashB = createHash('sha256').update(bytesB).digest('hex');
    const keyA = 'canvas/'+ids.owner+'/'+ids.file+'/'+hashA;
    expect(versionA.content_version_fingerprint).not.toBe(versionB.content_version_fingerprint);
    await db.query(`insert into canvas_files(id,user_id,canvas_connection_id,course_id,canvas_course_id,canvas_file_id,
      display_name,filename,content_type,size_bytes,metadata_fingerprint,content_version_fingerprint,ingestion_eligibility,ingestion_status,
      current_sha256,storage_bucket,storage_object_key,stored_byte_count,stored_content_type)
      values ($1,$2,$3,$4,'101','42','Lesson.pdf','Lesson.pdf','application/pdf',6,$5,$6,'eligible_document','stored',$7,'canvas-source-files',$8,6,'application/pdf')`,
      [ids.file,ids.owner,ids.connection,ids.course,versionA.metadata_fingerprint,versionA.content_version_fingerprint,hashA,keyA]);
    await db.query('select * from replace_canvas_course_files_inventory($1,$2,$3,now(),$4,$5::jsonb,$6::jsonb)',
      [ids.owner,ids.connection,ids.run,'101',JSON.stringify([sameRevision ? versionA : versionB]),'[]']);
    const row = (await db.query<{ content_version_fingerprint: string }>('select * from canvas_files')).rows[0]!;
    expect(row).toMatchObject({content_version_fingerprint:sameRevision ? versionA.content_version_fingerprint : versionB.content_version_fingerprint,
      ingestion_status:sameRevision ? 'stored' : 'not_requested',current_sha256:hashA,storage_object_key:keyA});
    mocks.readConnection.mockResolvedValue({ok:true,row:{...connection,id:ids.connection,user_id:ids.owner}});
    query.in.mockResolvedValue({data:[row],error:null});
    request.mockReset().mockResolvedValueOnce(Response.json(sameRevision ? {...providerB, updated_at:'2026-10-13T01:00:00Z', modified_at:'2026-10-13T01:00:00Z'} : providerB)).mockResolvedValueOnce(new Response(bytesB,{headers:{'Content-Type':'application/pdf'}}));
    const outcome = await ingestCanvasFiles({client,userId:ids.owner,fileIds:[ids.file],brokeredCanvasToken:'synthetic-token'});
    if (sameRevision) {
      expect(outcome).toMatchObject({ok:true,response:{unchanged:1,succeeded:0,totalBytesStored:0}});
      expect(request).toHaveBeenCalledTimes(1);
      expect(upload).not.toHaveBeenCalled();
    } else {
      expect(outcome).toMatchObject({ok:true,response:{unchanged:0,succeeded:1,totalBytesStored:6}});
      expect(request).toHaveBeenCalledTimes(2);
      expect(upload).toHaveBeenCalledWith(`canvas/${ids.owner}/${ids.file}/${hashB}`, bytesB, expect.anything());
      expect(query.update).toHaveBeenCalledWith(expect.objectContaining({
        ingestion_status:'stored',content_version_fingerprint:versionB.content_version_fingerprint,current_sha256:hashB,
      }));
    }
    expect(remove).not.toHaveBeenCalled(); // no historical removal without a positive cleanup claim
    expect(hashA).not.toBe(hashB);
    expect(query.eq).toHaveBeenCalledWith('content_version_fingerprint', row.content_version_fingerprint);
  } finally { await db.close(); }
}, 15_000);
describe('hidden referenced file ingestion', () => {
  it.each([
    { linked: true, locked: false, expected: 'stored' },
    { linked: false, locked: false, expected: 'unavailable' },
    { linked: true, locked: true, expected: 'blocked' },
  ])('uses current source evidence for hidden files (%s)', async ({ linked, locked, expected }) => {
    mocks.references.mockResolvedValue(new Map(linked ? [[file.id, [{ current: true, published: true, visible: true }]]] : []));
    query.in.mockResolvedValue({ data: [{ ...file, course_id: 'synthetic-course', hidden_for_user: true,
      ingestion_eligibility: 'blocked_unavailable', ingestion_status: 'unavailable', storage_object_key: null }], error: null });
    request.mockReset().mockResolvedValueOnce(Response.json({ id: 42, display_name: 'Lesson.pdf', filename: 'Lesson.pdf',
      'content-type': 'application/pdf', size: 5, url: 'https://canvas.test/files/42/download', locked, hidden_for_user: true }))
      .mockResolvedValueOnce(new Response(new Uint8Array([37, 80, 68, 70, 45]), { headers: { 'Content-Type': 'application/pdf' } }));
    expect(await ingestCanvasFiles({ client, userId: 'owner', fileIds: [file.id], brokeredCanvasToken: 'synthetic-token' }))
      .toMatchObject({ ok: true, response: { results: [{ status: expected }] } });
    expect(request).toHaveBeenCalledTimes(expected === 'stored' ? 2 : 1);
    if (expected === 'stored') expect(query.update).toHaveBeenCalledWith(expect.objectContaining({
      hidden_for_user: true, ingestion_eligibility: 'eligible_document', ingestion_status: 'stored', availability_status: 'available' }));
  });
  it('fails closed before provider access if course reference evidence cannot be loaded', async () => {
    mocks.references.mockRejectedValue(new Error('synthetic unavailable inventory'));
    expect(await ingestCanvasFiles({ client, userId: 'owner', fileIds: [file.id], brokeredCanvasToken: 'synthetic-token' }))
      .toMatchObject({ ok: false, code: 'canvas_storage_failed' });
    expect(request).not.toHaveBeenCalled();
  });
});
