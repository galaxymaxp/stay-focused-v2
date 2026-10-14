import type { Database, SourcePageSnapshotRow } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { CanonicalReviewerRecord } from '../canonical-reviewers';
import { OFFICE_MIME, OFFICE_STRUCTURE_VERSION } from '../activity-maker/office-extraction';
import { getSourcePageSnapshot } from '../source-page-snapshots';
import { resolveSnapshotPdfObject } from '../snapshot-pdf-object';
import { prerenderSourcePageSnapshots } from '../source-page-snapshot-prerender';

function harness() {
  const item = { id: 'item', user_id: 'owner', source_snapshot_id: 'snapshot', source_type: 'file', file_kind: null,
    source_row_id: 'file', course_id: 'course', canvas_connection_id: 'connection', mime_type: OFFICE_MIME.pptx as string,
    stored_content_sha256: 'a'.repeat(64), office_revision_fingerprint: 'b'.repeat(64) as string | null,
    parser_version: OFFICE_STRUCTURE_VERSION, page_count: null, source_title: 'Accepted deck' };
  const conversion = { id: 'conversion', user_id: 'owner', source_file_id: 'file', course_id: 'course', canvas_connection_id: 'connection',
    revision_fingerprint: 'b'.repeat(64), original_sha256: 'a'.repeat(64), pdf_sha256: 'c'.repeat(64),
    byte_size: 100, page_count: 3, storage_path: 'owner/conversion.pdf' };
  const blocks = [1, 2, 3].map(page => ({ source_ordinal: 1, block_ordinal: page, page_number: page,
    slide_number: page, parser_version: OFFICE_STRUCTURE_VERSION }));
  const snapshot = { user_id: 'owner', source_mode: 'canvas', source_count: 1, was_edited: false };
  const canonical = { artifact: { user_id: 'owner', deleted_at: null }, version: { user_id: 'owner', payload: {
    reviewer: { sections: [ { id: 'first', sourceBlockIds: ['canvas-1-2', 'canvas-1-1'] }, { id: 'last', sourceBlockIds: ['canvas-1-3'] } ] },
  } }, source: { id: 'source', user_id: 'owner', revision_kind: 'canvas_resolved', metadata: {
    reviewerSourceSnapshotId: 'snapshot', reviewerSourceBlocks: [1, 2, 3].map(page => ({ id: `canvas-1-${page}`, pageNumber: page, text: 'Exact source evidence' })),
  } } } as unknown as CanonicalReviewerRecord;
  let missing = false;
  const from = vi.fn((table: string) => {
    const query = { select: () => query, eq: () => query,
      maybeSingle: async () => ({ data: table === 'reviewer_source_snapshots' ? snapshot : table === 'office_pdf_conversions' ? missing ? null : conversion : table === 'reviewer_source_snapshot_items' ? item : null, error: null }),
      limit: async () => ({ data: table === 'reviewer_source_snapshot_items' ? [item] : blocks, error: null }),
    }; return query;
  });
  const rpc = vi.fn(async (_name: string, args: { p_page_number: number }) => ({ data: [{ id: 'row', user_id: 'owner',
    source_version_id: 'source', source_snapshot_item_id: 'item', status: 'pending', page_number: args.p_page_number } as SourcePageSnapshotRow], error: null }));
  const exists = vi.fn(async (_path: string) => ({ data: true, error: null }));
  const client = { from, rpc, storage: { from: () => ({ exists }) } } as unknown as SupabaseClient<Database>;
  const read = vi.fn(async () => ({ ok: true as const, value: canonical }));
  const dispatch = vi.fn(async () => {});
  return { client, item, conversion, blocks, snapshot, canonical, from, rpc, exists, read, dispatch, missing: () => { missing = true; } };
}
describe('PPTX sources through existing PDF snapshot and pre-render paths', () => {
  it('labels the lowest canonical slide and reserves through the existing student RPC', async () => {
    const h = harness();
    expect(await getSourcePageSnapshot(h.client, { userId: 'owner', artifactId: 'artifact', sectionId: 'first' }, h))
      .toEqual({ available: true, status: 'rendering', page: 1, labelKind: 'slide' });
    expect(h.rpc).toHaveBeenCalledWith('reserve_source_page_snapshot_v1', {
      p_user_id: 'owner', p_source_version_id: 'source', p_snapshot_item_id: 'item', p_page_number: 1,
    });
    expect(h.exists).toHaveBeenCalledWith('canvas/owner/file/' + 'a'.repeat(64));
    expect(h.exists).toHaveBeenCalledWith('owner/conversion.pdf');
  });
  it('pre-renders distinct cited slides with the existing system quota exemption', async () => {
    const h = harness(); await prerenderSourcePageSnapshots(h.client, { userId: 'owner', artifactId: 'artifact' }, h);
    expect(h.rpc.mock.calls.map(([name, args]) => [name, args.p_page_number])).toEqual([
      ['reserve_source_page_snapshot_system_v1', 1], ['reserve_source_page_snapshot_system_v1', 3],
    ]);
    expect(h.dispatch).toHaveBeenCalledTimes(2);
  });
  it('resolves the converted PDF hash and size while preserving the accepted original existence check', async () => {
    const h = harness();
    expect(await resolveSnapshotPdfObject(h.client, { userId: 'owner', snapshotItemId: 'item' })).toEqual({
      available: true, bucket: 'office-source-pdfs', key: 'owner/conversion.pdf', contentSha256: 'c'.repeat(64), byteSize: 100,
    });
    expect(h.from.mock.calls.map(([table]) => table)).not.toContain('canvas_files');
  });
  it.each(['no conversion', 'old fingerprint', 'old hash', 'missing binding', 'DOCX', 'wrong slide mapping', 'legacy canonical IDs', 'edited', 'multiple items'])('is ineligible with %s', async failure => {
    const h = harness();
    if (failure === 'no conversion') h.missing();
    if (failure === 'old fingerprint') h.conversion.revision_fingerprint = 'd'.repeat(64);
    if (failure === 'old hash') h.conversion.original_sha256 = 'd'.repeat(64);
    if (failure === 'missing binding') h.item.office_revision_fingerprint = null;
    if (failure === 'DOCX') h.item.mime_type = OFFICE_MIME.docx;
    if (failure === 'wrong slide mapping') h.blocks[0]!.slide_number = 2;
    if (failure === 'legacy canonical IDs') h.canonical.source.metadata = { reviewerSourceSnapshotId: 'snapshot',
      reviewerSourceBlocks: [{ id: 'block-1', pageNumber: 1, text: 'Evidence' }] };
    if (failure === 'edited') h.snapshot.was_edited = true;
    if (failure === 'multiple items') h.snapshot.source_count = 2;
    expect(await getSourcePageSnapshot(h.client, { userId: 'owner', artifactId: 'artifact', sectionId: 'first' }, h))
      .toEqual({ available: false, reason: 'not_canvas_pdf' });
    expect(h.rpc).not.toHaveBeenCalled(); expect(h.dispatch).not.toHaveBeenCalled();
  });
  it.each(['original', 'converted PDF'])('cannot bypass a missing %s with a cached image', async missing => {
    const h = harness(); h.exists.mockImplementation(async path => ({ data: missing === 'original' ? path.endsWith('.pdf') : !path.endsWith('.pdf'), error: null }));
    expect(await getSourcePageSnapshot(h.client, { userId: 'owner', artifactId: 'artifact', sectionId: 'first', render: false }, h))
      .toEqual({ available: false, reason: 'source_revision_unavailable' });
    expect(h.rpc).not.toHaveBeenCalled();
  });
});
