import type { Database, SourcePageSnapshotRow } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { CanonicalReviewerRecord } from './canonical-reviewers';
import { getSourcePageSnapshot, lowestSectionPage } from './source-page-snapshots';

const owner = '11111111-1111-4111-8111-111111111111';
const input = { userId: owner, artifactId: 'artifact', sectionId: 'section' };
function saved(): CanonicalReviewerRecord {
  return { artifact: { id: 'artifact', user_id: owner, deleted_at: null },
    version: { user_id: owner, payload: { reviewer: { sections: [{ id: 'section', sourceBlockIds: ['page-9', 'page-2'] }] } } },
    source: { id: 'source', user_id: owner, revision_kind: 'canvas_resolved', metadata: {
      reviewerSourceSnapshotId: 'snapshot', reviewerSourceBlocks: [
        { id: 'page-9', text: 'Later evidence', pageNumber: 9 }, { id: 'page-2', text: 'First evidence', pageNumber: 2 },
      ],
    } } } as unknown as CanonicalReviewerRecord;
}
function harness() {
  const canonical = saved();
  const read = vi.fn(async () => ({ ok: true as const, value: canonical }));
  const resolve = vi.fn(async () => ({ available: true as const, bucket: 'private', key: 'never-expose-original' }));
  const dispatch = vi.fn(async () => {});
  const row = { id: 'row', user_id: owner, source_version_id: 'source', source_snapshot_item_id: 'item', page_number: 2,
    status: 'pending', storage_path: null, width: null, height: null, error_code: null } as SourcePageSnapshotRow;
  const snapshot = { id: 'snapshot', user_id: owner, source_mode: 'canvas', source_count: 1, was_edited: false };
  const item = { id: 'item', user_id: owner, source_type: 'file', file_kind: 'pdf', page_count: 10, source_title: 'Accepted lecture' };
  const eq = vi.fn();
  const from = vi.fn((table: string) => {
    const result = table === 'reviewer_source_snapshots' ? snapshot : table === 'source_page_snapshots' ? null : [item];
    const query = { select: () => query, eq, limit: async () => ({ data: result, error: null }), maybeSingle: async () => ({ data: result, error: null }) };
    eq.mockReturnValue(query); return query;
  });
  const rpc = vi.fn(async () => ({ data: [row], error: null as { message: string } | null }));
  const sign = vi.fn(async () => ({ data: { signedUrl: 'https://storage.example.test/opaque.png?token=short-lived' }, error: null }));
  const client = { from, rpc, storage: { from: () => ({ createSignedUrl: sign }) } } as unknown as SupabaseClient<Database>;
  return { client, canonical, read, resolve, dispatch, row, snapshot, item, rpc, sign, eq };
}
describe('Canvas PDF source-page snapshots', () => {
  it('resolves the lowest cited page from persisted canonical blocks', () => {
    expect(lowestSectionPage(saved(), 'section')).toBe(2);
  });
  it('denies an unknown section and missing cited page evidence', () => {
    expect(() => lowestSectionPage(saved(), 'foreign')).toThrow('not_found');
    const record = saved(); record.source.metadata = {};
    expect(lowestSectionPage(record, 'section')).toBeNull();
  });
  it('dispatches the lowest accepted unchanged local PDF page through the shared cache', async () => {
    const h = harness();
    h.canonical.source.revision_kind = 'user_edited';
    h.canonical.source.metadata = { sourceType: 'local_file', mimeType: 'application/pdf', pageProvenance: 'extracted', reviewerSourceBlocks: [
      { id: 'page-9', text: 'Later evidence', pageNumber: 9 }, { id: 'page-2', text: 'First evidence', pageNumber: 2 },
    ] };
    expect(lowestSectionPage(h.canonical, 'section')).toBe(2);
    h.row.source_snapshot_item_id = null;
    expect(await getSourcePageSnapshot(h.client, input, h)).toEqual({ available: true, status: 'rendering', page: 2 });
    expect(h.resolve).toHaveBeenCalledWith(h.client, { userId: owner, sourceVersionId: 'source' });
    expect(h.dispatch).toHaveBeenCalledWith(h.client, h.row);
    expect(h.rpc).toHaveBeenCalledWith('reserve_source_page_snapshot_v1', {
      p_user_id: owner, p_source_version_id: 'source', p_snapshot_item_id: null, p_page_number: 2,
    });
    expect(h.sign).not.toHaveBeenCalled();
  });
  it.each(['asset gone', 'preserve_artifacts deletion', 'cleanup removed object'])('keeps cited local page text for %s without reserving or dispatching', async () => {
    const h = harness(); h.canonical.source.revision_kind = 'user_edited';
    h.canonical.source.metadata = { sourceType: 'local_file', mimeType: 'application/pdf', pageProvenance: 'extracted',
      reviewerSourceBlocks: [{ id: 'page-9', text: 'Later evidence', pageNumber: 9 }, { id: 'page-2', text: 'First evidence', pageNumber: 2 }] };
    h.resolve.mockResolvedValue({ available: false, reason: 'source_revision_unavailable' } as never);
    expect(await getSourcePageSnapshot(h.client, input, h)).toEqual({ available: false, reason: 'source_revision_unavailable', page: 2 });
    expect(h.rpc).not.toHaveBeenCalled(); expect(h.dispatch).not.toHaveBeenCalled(); expect(h.sign).not.toHaveBeenCalled();
  });
  it.each(['camera', 'text', 'local_file'])('excludes invalid local page claims (%s)', async sourceType => {
    const h = harness(); h.canonical.source.revision_kind = 'user_edited';
    h.canonical.source.metadata = { sourceType, mimeType: 'application/pdf', pageProvenance: 'extracted',
      reviewerSourceBlocks: [{ id: 'page-2', text: 'Evidence', pageNumber: 3 }] };
    expect(await getSourcePageSnapshot(h.client, input, h)).toEqual({ available: false, reason: 'not_canvas_pdf' });
    expect(h.resolve).not.toHaveBeenCalled(); expect(h.rpc).not.toHaveBeenCalled();
  });
  it.each([undefined, 'edited', 'unavailable'])('keeps old/uncited local revisions unavailable (%s)', async pageProvenance => {
    const h = harness();
    h.canonical.source.revision_kind = 'user_edited';
    h.canonical.source.metadata = { sourceType: 'local_file', ...(pageProvenance ? { pageProvenance } : {}) };
    expect(lowestSectionPage(h.canonical, 'section')).toBeNull();
    expect(await getSourcePageSnapshot(h.client, input, h)).toEqual({ available: false, reason: 'not_canvas_pdf' });
    expect(h.resolve).not.toHaveBeenCalled(); expect(h.dispatch).not.toHaveBeenCalled();
  });
  it('creates pending idempotently and dispatches only the resolved page', async () => {
    const h = harness();
    expect(await getSourcePageSnapshot(h.client, input, h)).toEqual({ available: true, status: 'rendering', page: 2 });
    expect(h.rpc).toHaveBeenCalledWith('reserve_source_page_snapshot_v1', { p_user_id: owner, p_source_version_id: 'source', p_snapshot_item_id: 'item', p_page_number: 2 });
    expect(h.dispatch).toHaveBeenCalledWith(h.client, h.row);
    expect(h.eq).toHaveBeenCalledWith('user_id', owner);
  });
  it('does not render on header discovery', async () => {
    const h = harness();
    expect(await getSourcePageSnapshot(h.client, { ...input, render: false }, h)).toEqual({ available: true, status: 'unrendered', page: 2 });
    expect(h.rpc).not.toHaveBeenCalled(); expect(h.dispatch).not.toHaveBeenCalled();
  });
  it('returns only a short signed image URL and safe presentation metadata', async () => {
    const h = harness(); Object.assign(h.row, { status: 'ready', storage_path: 'opaque-attempt.png', width: 1400, height: 1867 });
    const result = await getSourcePageSnapshot(h.client, input, h);
    expect(result).toEqual({ available: true, url: 'https://storage.example.test/opaque.png?token=short-lived', page: 2, width: 1400, height: 1867, sourceLabel: 'Accepted lecture' });
    expect(h.sign).toHaveBeenCalledWith('opaque-attempt.png', 600);
    expect(JSON.stringify(result)).not.toContain('opaque-attempt.png'); expect(JSON.stringify(result)).not.toContain('never-expose-original');
    expect(h.dispatch).not.toHaveBeenCalled();
  });
  it.each(['local-upload', 'user-edited', 'edited-snapshot', 'pptx', 'docx', 'page'])('excludes %s', async kind => {
    const h = harness();
    if (kind === 'local-upload') h.canonical.source.metadata = {};
    if (kind === 'user-edited') h.canonical.source.revision_kind = 'user_edited';
    if (kind === 'edited-snapshot') h.snapshot.was_edited = true;
    if (kind === 'pptx' || kind === 'docx') h.item.file_kind = kind;
    if (kind === 'page') h.item.source_type = 'page';
    expect(await getSourcePageSnapshot(h.client, input, h)).toEqual({ available: false, reason: 'not_canvas_pdf' });
    expect(h.resolve).not.toHaveBeenCalled(); expect(h.dispatch).not.toHaveBeenCalled();
  });
  it('returns no_page_source for an uncited/missing page', async () => {
    const h = harness(); h.canonical.source.metadata = { reviewerSourceSnapshotId: 'snapshot' };
    expect(await getSourcePageSnapshot(h.client, input, h)).toEqual({ available: false, reason: 'no_page_source' });
    expect(h.resolve).not.toHaveBeenCalled();
  });
  it('hides a cached image when its original accepted object is missing', async () => {
    const h = harness(); h.resolve.mockResolvedValue({ available: false, reason: 'source_revision_unavailable' } as never);
    h.row.status = 'ready';
    expect(await getSourcePageSnapshot(h.client, input, h)).toEqual({ available: false, reason: 'source_revision_unavailable' });
    expect(h.rpc).not.toHaveBeenCalled(); expect(h.sign).not.toHaveBeenCalled();
  });
  it.each(['artifact', 'version', 'source'])('denies foreign %s before reading Storage', async field => {
    const h = harness(); h.canonical[field as keyof CanonicalReviewerRecord].user_id = 'other';
    await expect(getSourcePageSnapshot(h.client, input, h)).rejects.toThrow('not_found'); expect(h.resolve).not.toHaveBeenCalled();
  });
  it('never returns rendering before durable dispatch succeeds', async () => {
    const h = harness(); h.dispatch.mockRejectedValue(new Error('unavailable'));
    await expect(getSourcePageSnapshot(h.client, input, h)).rejects.toThrow('unavailable');
  });
  it('fails safely when the admission budget is full', async () => {
    const h = harness(); h.rpc.mockResolvedValue({ data: [], error: { message: 'snapshot_render_limit_reached' } });
    expect(await getSourcePageSnapshot(h.client, input, h)).toEqual({ available: false, reason: 'render_limit_reached' });
    expect(h.dispatch).not.toHaveBeenCalled();
  });
});
