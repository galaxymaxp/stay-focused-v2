import { expect, it, vi } from 'vitest';
import type { CanvasFile, CanvasPageDetail } from '@stay-focused/canvas';
import type { Database, Json } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createCanvasFileInventoryPayload } from './canvas-file-normalize';
import { persistCourseFilesInventory } from './canvas-file-inventory';
import { readCanvasFileAccessReferences } from './canvas-file-access';
import { listCanvasReviewerSources } from './canvas-reviewer-sources';
import { readReviewerSourceStatus } from './reviewer-source-status';
import { enqueuePreparationAfterSync } from './canvas-preparation/orchestration';
import { revisionFingerprint, sourceDigest } from './canvas-preparation/repository';

const mocks = vi.hoisted(() => ({ admit: vi.fn() }));
vi.mock('./canvas-preparation/admission', () => ({ admitMaterialPreparation: mocks.admit }));
vi.mock('./canvas-preparation/dispatch', () => ({ dispatchPreparation: vi.fn() }));
vi.mock('./auto-reviewers/after-sync', () => ({ runAutomaticReviewersAfterSync: vi.fn() }));

type Row = Record<string, unknown>;
const owner = '11111111-1111-4111-8111-111111111111';
const connection = '22222222-2222-4222-8222-222222222222';
const course = '33333333-3333-4333-8333-333333333333';
const pageId = '44444444-4444-4444-8444-444444444444';
const run = '55555555-5555-4555-8555-555555555555';
const reviewer = '66666666-6666-4666-8666-666666666666';
const snapshot = '77777777-7777-4777-8777-777777777777';
const version = '88888888-8888-4888-8888-888888888888';
const ids = ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'];
const now = '2026-10-19T03:00:00Z';
const scope = { user_id: owner, canvas_connection_id: connection, course_id: course };
const providerFiles = ['1', '2', '3'].map(id => ({ id, folderId: null, displayName: `Lesson ${id}.pdf`, filename: `lesson-${id}.pdf`,
  contentType: 'application/pdf', size: 1024, locked: false, hidden: false, hiddenForUser: true, lockAt: null, unlockAt: null,
  mediaClass: null, mediaEntryId: null, visibilityLevel: null, createdAt: now, updatedAt: now, modifiedAt: now,
  downloadUrl: `https://canvas.test/files/${id}/download` }) satisfies CanvasFile);
const page: CanvasPageDetail = { pageId: 'lesson-page', url: 'lesson', title: 'Lesson', published: true, frontPage: false,
  editingRoles: null, lockInfo: null, unlockAt: null, lockAt: null, createdAt: now, updatedAt: now,
  body: '<p>Study these lessons.</p><a href="/courses/101/files/1">Lesson 1</a><a href="/courses/101/files/2">Lesson 2</a>' };
const inventoryInput = { announcements: [], assignments: [], canvasBaseUrl: 'https://canvas.test', canvasCourseId: '101',
  files: providerFiles, pages: [page], moduleItemsByModule: [] };

/** In-memory Data API boundary. Provider/queue operations are injected. */
function fixture() {
  const tables: Record<string, Row[]> = {
    canvas_connections: [{ id: connection, user_id: owner, status: 'active', base_url: 'https://canvas.test' }],
    canvas_courses: [{ id: course, ...scope, canvas_course_id: '101', name: 'Synthetic Page-only course', workflow_state: 'available' }],
    canvas_course_sync_preferences: [{ ...scope, selected: true }],
    canvas_pages: [{ id: pageId, ...scope, canvas_page_id: page.pageId, canvas_page_url: page.url, title: page.title,
      body_html: page.body, published: true, lock_info: null, lock_at: null, unlock_at: null, canvas_updated_at: now, last_synced_at: now }],
    canvas_modules: [], canvas_module_items: [], canvas_files: [], canvas_file_references: [], canvas_assignments: [], canvas_announcements: [],
    canvas_material_preparations: [], canvas_material_preparation_controls: [], canvas_preparation_discoveries: [], canvas_preparation_syncs: [],
    canvas_sync_runs: [], canvas_sync_course_results: [], canvas_course_sync_states: [],
    generated_artifacts: [{ id: reviewer, user_id: owner, artifact_type: 'reviewer', latest_version_id: version, source_snapshot_id: snapshot, deleted_at: null }],
    generated_artifact_versions: [{ id: version, user_id: owner, artifact_id: reviewer, artifact_type: 'reviewer', source_version_id: run }],
    source_versions: [{ id: run, user_id: owner, metadata: { reviewerSourceSnapshotId: snapshot } }],
    reviewer_source_snapshots: [{ id: snapshot, ...scope, source_mode: 'canvas', source_count: 2, created_at: now }],
    reviewer_source_snapshot_items: [],
  };
  const queries: string[] = [];
  const rpc = vi.fn(async (name: string, args: Record<string, Json | undefined>) => {
    if (name === 'replace_canvas_course_files_inventory') {
      const payload = args.p_files as unknown as Row[];
      tables.canvas_files = payload.map((file, index) => {
        const old = tables.canvas_files!.find(row => row.id === ids[index]);
        // The existing RPC preserves old status when a retained hash exists.
        return { ...old, ...file, ...scope, id: ids[index], canvas_course_id: '101', availability_status:
          file.ingestion_eligibility === 'blocked_unavailable' ? 'unavailable' : 'available',
          ingestion_status: old?.current_sha256 && file.ingestion_status === 'not_requested' ? old.ingestion_status : file.ingestion_status };
      });
      tables.canvas_file_references = (args.p_references as unknown as Row[]).map((ref, index) => ({ ...ref, ...scope,
        id: `ref-${index}`, file_id: ids[Number(ref.canvas_file_id) - 1], referenced_row_id: pageId }));
      return { data: { files_inserted: payload.length }, error: null };
    }
    if (name === 'register_canvas_preparation_sync_v1') {
      tables.canvas_preparation_syncs = [{ id: 'guard', ...scope, guard_state: 'running' }];
      return { data: 'guard', error: null };
    }
    return { data: [], error: null };
  });
  class Query {
    filters: ((row: Row) => boolean)[] = []; start = 0; end = Infinity; limitCount = Infinity;
    mutation: Row | null = null; removing = false;
    constructor(readonly table: string) { queries.push(table); }
    select() { return this; }
    eq(key: string, value: unknown) { this.filters.push(row => row[key] === value); return this; }
    neq(key: string, value: unknown) { this.filters.push(row => row[key] !== value); return this; }
    is(key: string, value: unknown) { return this.eq(key, value); }
    in(key: string, values: unknown[]) { this.filters.push(row => values.includes(row[key])); return this; }
    not(key: string, _op: string, value: unknown) { return this.neq(key, value); }
    order() { return this; }
    range(start: number, end: number) { this.start = start; this.end = end; return this; }
    limit(count: number) { this.limitCount = count; return this; }
    update(value: Row) { this.mutation = value; return this; }
    upsert(values: Row[]) { tables[this.table] = [...values]; return this; }
    delete() { this.removing = true; return this; }
    result() {
      const matched = (tables[this.table] ?? []).filter(row => this.filters.every(filter => filter(row)));
      if (this.mutation) matched.forEach(row => Object.assign(row, this.mutation));
      if (this.removing) tables[this.table] = (tables[this.table] ?? []).filter(row => !matched.includes(row));
      return { data: matched.slice(this.start, Math.min(this.end + 1, this.start + this.limitCount)), error: null };
    }
    async maybeSingle() { return { ...this.result(), data: this.result().data[0] ?? null }; }
    then<T>(resolve: (value: ReturnType<Query['result']>) => T) { return Promise.resolve(this.result()).then(resolve); }
  }
  const client = { from: (table: string) => new Query(table), rpc: (name: string, args: Record<string, Json | undefined>) => {
    const promise = rpc(name, args); return Object.assign(promise, { single: () => promise });
  } } as unknown as SupabaseClient<Database>;
  return { client, tables, rpc, queries };
}

it('repairs a Page-only course, queues two hidden PDFs through the guard, and preserves access after Files refresh', async () => {
  const f = fixture();
  const inventory = createCanvasFileInventoryPayload(inventoryInput);
  const sync = () => persistCourseFilesInventory({ client: f.client, userId: owner, connectionId: connection,
    canvasCourseId: '101', runId: run, syncedAt: now, ...inventory });
  // Existing broken rows: one retained hash, one missing object, one unreferenced.
  f.tables.canvas_files = ids.map((id, index) => ({ id, ...scope, ...inventory.files[index], availability_status: 'unavailable',
    ingestion_status: 'unavailable', ingestion_eligibility: 'blocked_unavailable', current_sha256: index === 0 ? 'b'.repeat(64) : null }));
  expect(await sync()).toMatchObject({ ok: true });
  expect(f.tables.canvas_files!.map(row => [row.ingestion_eligibility, row.ingestion_status, row.availability_status]))
    .toEqual([['eligible_document', 'not_requested', 'available'], ['eligible_document', 'not_requested', 'available'],
      ['blocked_unavailable', 'unavailable', 'unavailable']]);
  mocks.admit.mockImplementation(async (_client, input: { materialId: string }) => {
    const file = f.tables.canvas_files!.find(row => `file:${String(row.id)}` === input.materialId);
    const evidence = file ? [{ type: 'file' as const, id: String(file.id), revision: String(file.content_version_fingerprint) }]
      : [{ type: 'page' as const, id: pageId, revision: sourceDigest(page.body!) }, ...f.tables.canvas_files!.slice(0, 2)
        .map(row => ({ type: 'file' as const, id: String(row.id), revision: String(row.content_version_fingerprint) }))];
    const job = { id: `job:${input.materialId}`, ...scope, material_id: input.materialId,
      revision_fingerprint: revisionFingerprint(evidence), state: 'pending', result_id: null };
    f.tables.canvas_material_preparations!.push(job); return job;
  });
  await enqueuePreparationAfterSync(f.client, { userId: owner, courseId: course, syncId: run });
  const admitted = mocks.admit.mock.calls.map(call => (call[1] as { materialId: string }).materialId);
  expect(admitted).toEqual(expect.arrayContaining([`file:${ids[0]}`, `file:${ids[1]}`]));
  expect(admitted).not.toContain(`file:${ids[2]}`);
  expect(f.rpc).toHaveBeenCalledWith('register_canvas_preparation_sync_v1', expect.objectContaining({
    p_job_ids: expect.arrayContaining([`job:file:${ids[0]}`, `job:file:${ids[1]}`]), p_sync_id: run }));
  // Worker publication is injected; extraction and durable guard SQL have their own suites.
  for (const [index, file] of f.tables.canvas_files!.entries()) if (index < 2) Object.assign(file, {
    ingestion_status: 'stored', current_sha256: 'b'.repeat(64), storage_bucket: 'canvas-source-files',
    storage_object_key: `synthetic-object-${index}`, stored_byte_count: 1024, stored_content_type: 'application/pdf' });
  for (const job of f.tables.canvas_material_preparations!) Object.assign(job, { state: 'prepared', result_id: 'synthetic-result' });
  // A later Files inventory write retains the course's current reference payload.
  expect(await sync()).toMatchObject({ ok: true });
  const sources = await listCanvasReviewerSources({ client: f.client, userId: owner, courseId: course, completeInventory: true });
  expect(sources).toMatchObject({ ok: true, value: { pagination: { hasMore: false } } });
  if (!sources.ok) throw new Error('inventory failed');
  expect(sources.value.sources.filter(source => source.type === 'file').map(source => [source.id, source.capability]))
    .toEqual(expect.arrayContaining([[`file:${ids[0]}`, 'ready'], [`file:${ids[1]}`, 'ready'], [`file:${ids[2]}`, 'inaccessible']]));
  f.tables.reviewer_source_snapshot_items = providerFiles.slice(0, 2).map((file, index) => ({ id: `snapshot-${index}`,
    ...scope, source_snapshot_id: snapshot, ordinal: index, source_type: 'file', source_title: file.displayName,
    canvas_source_object_id: file.id, stored_content_sha256: 'b'.repeat(64), normalized_content_sha256: null, created_at: now }));
  expect(await readReviewerSourceStatus({ client: f.client, userId: owner, reviewerArtifactId: reviewer }))
    .toMatchObject({ ok: true, value: { regenerationReadiness: 'ready_current', counts: { current: 2, unavailable: 0 } } });
  expect(JSON.stringify(sources)).not.toContain('synthetic-object');
});

it('loads every reference in course batches and denies missing, unpublished, locked or foreign sources', async () => {
  const f = fixture();
  f.tables.canvas_file_references = Array.from({ length: 201 }, (_, index) => ({ id: `ref-${index}`, ...scope,
    file_id: `file-${index}`, reference_type: 'page', canvas_page_url: 'lesson' }));
  const query = { client: f.client, userId: owner, connectionId: connection, courseId: course };
  const references = await readCanvasFileAccessReferences(query);
  expect(references.size).toBe(201);
  expect(references.get('file-200')).toEqual([{ current: true, published: true, visible: true }]);
  expect(f.queries.filter(table => table === 'canvas_file_references')).toHaveLength(2);
  expect(f.queries.filter(table => table === 'canvas_pages')).toHaveLength(1);
  f.tables.canvas_pages![0]!.published = false;
  expect((await readCanvasFileAccessReferences(query)).get('file-200')?.[0]?.visible).toBe(false);
  Object.assign(f.tables.canvas_pages![0]!, { published: true, lock_info: { locked_for_user: true } });
  expect((await readCanvasFileAccessReferences(query)).get('file-200')?.[0]?.visible).toBe(false);
  f.tables.canvas_pages![0]!.user_id = 'different-owner';
  expect((await readCanvasFileAccessReferences(query)).get('file-200')).toEqual([]);
  f.tables.canvas_pages = [];
  expect((await readCanvasFileAccessReferences(query)).get('file-200')).toEqual([]);
});
