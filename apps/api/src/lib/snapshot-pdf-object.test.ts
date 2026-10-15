import { describe, expect, it, vi } from 'vitest';
import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveSnapshotPdfObject } from './snapshot-pdf-object';

const owner = '11111111-1111-4111-8111-111111111111';
const fileId = '22222222-2222-4222-8222-222222222222';
const acceptedHash = 'a'.repeat(64);
const item = { id: 'item', user_id: owner, source_snapshot_id: 'snapshot', source_type: 'file', file_kind: 'pdf', source_row_id: fileId, stored_content_sha256: acceptedHash };
function harness(overrides: Record<string, unknown> = {}) {
  const eq = vi.fn();
  const exists = vi.fn(async () => ({ data: true, error: null }));
  const from = vi.fn((table: string) => {
    const rows: Record<string, Record<string, unknown>> = {
      reviewer_source_snapshot_items: { ...item, ...overrides },
      reviewer_source_snapshots: { user_id: owner, was_edited: false },
      canvas_files: { id: fileId, user_id: owner, current_sha256: 'b'.repeat(64), storage_object_key: `canvas/${owner}/${fileId}/${'b'.repeat(64)}` },
    };
    const query = { select: () => query, eq, maybeSingle: async () => ({ data: rows[table] ?? null, error: null }) };
    eq.mockReturnValue(query);
    return query;
  });
  const client = { from, storage: { from: () => ({ exists }) } } as unknown as SupabaseClient<Database>;
  return { client, from, eq, exists };
}
describe('accepted Canvas PDF revision resolver', () => {
  it('resolves accepted bytes even when the current revision has a newer hash', async () => {
    const h = harness();
    expect(await resolveSnapshotPdfObject(h.client, { userId: owner, snapshotItemId: 'item' }))
      .toEqual({ available: true, bucket: 'canvas-source-files', key: `canvas/${owner}/${fileId}/${acceptedHash}` });
    expect(h.from.mock.calls.map(call => call[0])).toEqual(['reviewer_source_snapshot_items', 'reviewer_source_snapshots']);
    expect(h.eq).toHaveBeenCalledWith('user_id', owner);
  });
  it('returns source_revision_unavailable when the accepted object is missing', async () => {
    const h = harness(); h.exists.mockResolvedValue({ data: false, error: null });
    expect(await resolveSnapshotPdfObject(h.client, { userId: owner, snapshotItemId: 'item' }))
      .toEqual({ available: false, reason: 'source_revision_unavailable' });
  });
  it.each([{ user_id: 'other' }, { source_type: 'page' }, { file_kind: 'docx' }, { stored_content_sha256: null }, { stored_content_sha256: 'invalid' }])('denies invalid or foreign provenance (%j)', async invalid => {
    const h = harness(invalid);
    expect(await resolveSnapshotPdfObject(h.client, { userId: owner, snapshotItemId: 'item' })).toEqual({ available: false, reason: 'source_revision_unavailable' });
    expect(h.exists).not.toHaveBeenCalled();
  });
  it('fails safely on a provider exception', async () => {
    const h = harness(); h.exists.mockRejectedValue(new Error('private provider error'));
    expect(await resolveSnapshotPdfObject(h.client, { userId: owner, snapshotItemId: 'item' })).toEqual({ available: false, reason: 'source_revision_unavailable' });
  });
});

function localHarness() {
  const source = { id: 'accepted', user_id: owner, revision_kind: 'user_edited', document_asset_id: 'asset',
    extraction_result_id: 'extraction', parent_source_version_id: 'parent', content_sha256: 'text-hash',
    metadata: { sourceType: 'local_file', mimeType: 'application/pdf', pageProvenance: 'extracted',
      reviewerSourceBlocks: [{ id: 'page-2', text: 'Evidence', pageNumber: 2 }] } };
  const parent = { ...source, id: 'parent', revision_kind: 'normalized' };
  const extraction = { id: 'extraction', user_id: owner, document_asset_id: 'asset', status: 'succeeded', page_count: 3 };
  const asset = { id: 'asset', user_id: owner, mime_type: 'application/pdf', deleted_at: null as string | null,
    upload_status: 'available', storage_bucket: 'processing-job-sources', storage_object_path: `${owner}/uploads/exact.pdf`,
    byte_size: 123, content_sha256: acceptedHash as string | null };
  const exists = vi.fn(async () => ({ data: true, error: null }));
  const download = vi.fn(); const eq = vi.fn();
  let assetMissing = false;
  const from = vi.fn((table: string) => {
    let id = '';
    const query = { select: () => query, eq: (column: string, value: string) => {
      eq(column, value); if (column === 'id') id = value; return query;
    }, maybeSingle: async () => ({ data: table === 'source_versions' ? id === 'accepted' ? source : parent
      : table === 'extraction_results' ? extraction : assetMissing ? null : asset, error: null }) };
    return query;
  });
  const client = { from, storage: { from: () => ({ exists, download }) } } as unknown as SupabaseClient<Database>;
  return { client, source, parent, extraction, asset, exists, download, eq, missing: () => { assetMissing = true; } };
}
const localInput = { userId: owner, sourceVersionId: 'accepted' };
describe('accepted local PDF revision resolver', () => {
  it('resolves the accepted asset and hash/size without consulting the active/latest revision', async () => {
    const h = localHarness();
    expect(await resolveSnapshotPdfObject(h.client, localInput)).toEqual({ available: true,
      bucket: 'processing-job-sources', key: `${owner}/uploads/exact.pdf`, contentSha256: acceptedHash, byteSize: 123 });
    expect(h.eq).toHaveBeenCalledWith('user_id', owner); expect(h.eq).not.toHaveBeenCalledWith('latest_extraction_result_id', expect.anything());
    expect(h.download).not.toHaveBeenCalled();
  });
  it('allows legacy null hashes while retaining exact asset/owner/size identity', async () => {
    const h = localHarness(); h.asset.content_sha256 = null;
    expect(await resolveSnapshotPdfObject(h.client, localInput)).toMatchObject({ available: true, byteSize: 123 });
  });
  it.each(['gone', 'deleted', 'cleanup_pending', 'preserve_artifacts'])('denies a %s asset before any Storage call', async state => {
    const h = localHarness();
    if (state === 'gone') h.missing();
    else if (state === 'preserve_artifacts') { h.asset.deleted_at = '2026-10-13'; h.asset.upload_status = 'cleanup_pending'; }
    else h.asset.upload_status = state;
    expect(await resolveSnapshotPdfObject(h.client, localInput)).toEqual({ available: false, reason: 'source_revision_unavailable' });
    expect(h.exists).not.toHaveBeenCalled(); expect(h.download).not.toHaveBeenCalled();
  });
  it('detects cleanup through Storage existence without downloading', async () => {
    const h = localHarness(); h.exists.mockResolvedValue({ data: false, error: null });
    expect(await resolveSnapshotPdfObject(h.client, localInput)).toEqual({ available: false, reason: 'source_revision_unavailable' });
    expect(h.download).not.toHaveBeenCalled();
  });
  it.each(['source', 'parent', 'extraction', 'asset'] as const)('denies foreign %s before Storage', async row => {
    const h = localHarness(); h[row].user_id = 'other';
    expect(await resolveSnapshotPdfObject(h.client, localInput)).toEqual({ available: false, reason: 'source_revision_unavailable' });
    expect(h.exists).not.toHaveBeenCalled();
  });
  it.each(['edited', 'extraction mismatch', 'hash mismatch', 'bad path', 'oversized', 'out-of-range page'])('denies %s', async failure => {
    const h = localHarness();
    if (failure === 'edited') h.source.metadata.pageProvenance = 'edited';
    if (failure === 'extraction mismatch') h.extraction.document_asset_id = 'another-asset';
    if (failure === 'hash mismatch') h.parent.content_sha256 = 'another-text';
    if (failure === 'bad path') h.asset.storage_object_path = 'other/private.pdf';
    if (failure === 'oversized') h.asset.byte_size = 21 * 1024 * 1024;
    if (failure === 'out-of-range page') h.extraction.page_count = 1;
    expect(await resolveSnapshotPdfObject(h.client, localInput)).toEqual({ available: false, reason: 'source_revision_unavailable' });
    expect(h.exists).not.toHaveBeenCalled();
  });
});
