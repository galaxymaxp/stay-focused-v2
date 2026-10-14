import type { Database, SourcePageSnapshotRow } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { CanonicalReviewerRecord } from './canonical-reviewers';
import { prerenderSourcePageSnapshots } from './source-page-snapshot-prerender';
import { getSourcePageSnapshot } from './source-page-snapshots';

const input = { userId: 'owner', artifactId: 'artifact' };
function harness(pages = [2, 9, 2]) {
  const canonical = {
    artifact: { id: 'artifact', user_id: 'owner', deleted_at: null },
    version: { user_id: 'owner', payload: { reviewer: { sections: pages.map((page, index) => ({
      id: `section-${index}`, sourceBlockIds: [`page-${page}`],
    })) } } },
    source: { id: 'source', user_id: 'owner', revision_kind: 'canvas_resolved', metadata: {
      reviewerSourceSnapshotId: 'snapshot', reviewerSourceBlocks: [...new Set(pages)].map(page => ({
        id: `page-${page}`, pageNumber: page, text: 'Private academic evidence',
      })),
    } },
  } as unknown as CanonicalReviewerRecord;
  const read = vi.fn(async () => ({ ok: true as const, value: canonical }));
  const resolve = vi.fn(async () => ({ available: true as const, bucket: 'private', key: 'private/original' }));
  const dispatch = vi.fn(async (_client: SupabaseClient<Database>, _row: SourcePageSnapshotRow) => {});
  const log = vi.fn();
  const snapshot = { user_id: 'owner', source_mode: 'canvas', source_count: 1, was_edited: false };
  const item = { id: 'item', user_id: 'owner', source_type: 'file', file_kind: 'pdf', page_count: 100, source_title: 'Private title' };
  const from = vi.fn((table: string) => {
    const query = { select: () => query, eq: () => query,
      maybeSingle: async () => ({ data: snapshot, error: null }),
      limit: async () => ({ data: [item], error: null }),
    };
    if (!['reviewer_source_snapshots', 'reviewer_source_snapshot_items'].includes(table)) throw new Error('unexpected table');
    return query;
  });
  const rpc = vi.fn(async (_name: string, args: { p_page_number: number; p_snapshot_item_id: string | null }) => ({
    data: [{ id: `row-${args.p_page_number}`, user_id: 'owner', source_version_id: 'source',
      source_snapshot_item_id: args.p_snapshot_item_id, page_number: args.p_page_number,
      origin: 'system', status: 'pending', dispatched_at: null, lease_token: null, lease_expires_at: null,
    } as SourcePageSnapshotRow], error: null as { message: string } | null,
  }));
  const client = { from, rpc } as unknown as SupabaseClient<Database>;
  return { client, read, resolve, dispatch, log, canonical, snapshot, item, rpc, from };
}
describe('post-generation cited page pre-render', () => {
  it('serves a pre-rendered ready image to render=false discovery without a student reservation', async () => {
    const h = harness([2]);
    let ready: SourcePageSnapshotRow | null = null;
    const sign = vi.fn(async () => ({ data: { signedUrl: 'https://image.example.test/opaque.png' }, error: null }));
    const from = (table: string) => {
      if (table !== 'source_page_snapshots') return h.from(table);
      const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: ready, error: null }) };
      return query;
    };
    const client = { from, rpc: h.rpc, storage: { from: () => ({ createSignedUrl: sign }) } } as unknown as SupabaseClient<Database>;
    h.dispatch.mockImplementation(async (_client, row) => {
      ready = { ...row, status: 'ready', storage_path: 'opaque/attempt.png', width: 1400, height: 1800 };
    });
    await prerenderSourcePageSnapshots(client, input, h);
    h.rpc.mockClear(); h.dispatch.mockClear();
    expect(await getSourcePageSnapshot(client, { ...input, sectionId: 'section-0', render: false }, h)).toEqual({
      available: true, page: 2, url: 'https://image.example.test/opaque.png', width: 1400, height: 1800, sourceLabel: 'Private title',
    });
    expect(h.rpc).not.toHaveBeenCalled(); expect(h.dispatch).not.toHaveBeenCalled();
    expect(sign).toHaveBeenCalledWith('opaque/attempt.png', 600);
  });
  it('reserves only distinct lowest cited pages through the system RPC and resolves once', async () => {
    const h = harness();
    await prerenderSourcePageSnapshots(h.client, input, h);
    expect(h.rpc.mock.calls.map(call => call[1].p_page_number)).toEqual([2, 9]);
    expect(h.rpc).toHaveBeenCalledWith('reserve_source_page_snapshot_system_v1', {
      p_user_id: 'owner', p_source_version_id: 'source', p_snapshot_item_id: 'item', p_page_number: 2,
    });
    expect(h.resolve).toHaveBeenCalledExactlyOnceWith(h.client, { userId: 'owner', snapshotItemId: 'item' });
    expect(h.dispatch).toHaveBeenCalledTimes(2); expect(h.log).not.toHaveBeenCalled();
  });
  it('reuses canonical lowestSectionPage logic without guessing missing or higher citations', async () => {
    const h = harness();
    h.canonical.version.payload = { reviewer: { sections: [
      { id: 'first', sourceBlockIds: ['page-9', 'page-2'] },
      { id: 'missing', sourceBlockIds: ['page-9', 'absent'] },
      { id: 'uncited', sourceBlockIds: [] },
    ] } };
    await prerenderSourcePageSnapshots(h.client, input, h);
    expect(h.rpc.mock.calls.map(call => call[1].p_page_number)).toEqual([2]);
  });
  it.each(['ready', 'failed', 'dispatched', 'rendering'])('skips %s rows without dispatch', async state => {
    const h = harness([2]);
    const original = h.rpc.getMockImplementation()!;
    h.rpc.mockImplementation(async (name, args) => {
      const result = await original(name, args);
      Object.assign(result.data[0]!, state === 'dispatched' ? { dispatched_at: 'now' }
        : state === 'rendering' ? { lease_token: 'worker', lease_expires_at: 'future' } : { status: state });
      return result;
    });
    await prerenderSourcePageSnapshots(h.client, input, h);
    expect(h.dispatch).not.toHaveBeenCalled(); expect(h.resolve).toHaveBeenCalledTimes(1);
  });
  it.each(['edited', 'multi-source', 'office', 'page', 'foreign', 'deleted', 'non-pdf'])('silently excludes %s sources', async kind => {
    const h = harness();
    if (kind === 'edited') h.snapshot.was_edited = true;
    if (kind === 'multi-source') h.snapshot.source_count = 2;
    if (kind === 'office') h.item.file_kind = 'pptx';
    if (kind === 'page') h.item.source_type = 'page';
    if (kind === 'foreign') h.canonical.source.user_id = 'other';
    if (kind === 'deleted') h.canonical.artifact.deleted_at = 'now';
    if (kind === 'non-pdf') h.canonical.source.metadata = {};
    await prerenderSourcePageSnapshots(h.client, input, h);
    expect(h.rpc).not.toHaveBeenCalled(); expect(h.resolve).not.toHaveBeenCalled(); expect(h.log).not.toHaveBeenCalled();
  });
  it('supports an accepted local PDF with one exact source-version resolution', async () => {
    const h = harness(); h.canonical.source.revision_kind = 'user_edited';
    h.canonical.source.metadata = { ...h.canonical.source.metadata as object,
      sourceType: 'local_file', mimeType: 'application/pdf', pageProvenance: 'extracted' };
    await prerenderSourcePageSnapshots(h.client, input, h);
    expect(h.from).not.toHaveBeenCalled();
    expect(h.resolve).toHaveBeenCalledExactlyOnceWith(h.client, { userId: 'owner', sourceVersionId: 'source' });
    expect(h.rpc).toHaveBeenCalledWith('reserve_source_page_snapshot_system_v1', expect.objectContaining({ p_snapshot_item_id: null }));
  });
  it('swallows dispatch failures, continues later pages and logs only fixed code/counts', async () => {
    const h = harness(); h.dispatch.mockRejectedValueOnce(new Error('Private academic evidence private/original provider credentials'));
    await expect(prerenderSourcePageSnapshots(h.client, input, h)).resolves.toBeUndefined();
    expect(h.dispatch).toHaveBeenCalledTimes(2);
    expect(h.log).toHaveBeenCalledExactlyOnceWith('source_page_snapshot.prerender', { code: 'dispatch_failed', pageCount: 2, failureCount: 1 });
  });
  it('swallows reservation failures and continues later pages', async () => {
    const h = harness(); h.rpc.mockResolvedValueOnce({ data: [], error: { message: 'Private provider error' } });
    await prerenderSourcePageSnapshots(h.client, input, h);
    expect(h.dispatch).toHaveBeenCalledTimes(1);
    expect(h.log).toHaveBeenCalledExactlyOnceWith('source_page_snapshot.prerender', { code: 'reservation_failed', pageCount: 2, failureCount: 1 });
  });
  it('fails safely when originals disappear and never reserves cached pages', async () => {
    const h = harness(); h.resolve.mockResolvedValueOnce({ available: false, reason: 'source_revision_unavailable' } as never);
    await prerenderSourcePageSnapshots(h.client, input, h);
    expect(h.rpc).not.toHaveBeenCalled();
    expect(h.log).toHaveBeenCalledExactlyOnceWith('source_page_snapshot.prerender', { code: 'source_revision_unavailable', pageCount: 2, failureCount: 2 });
  });
  it('swallows canonical read/eligibility/resolve exceptions without logging content', async () => {
    const h = harness(); h.read.mockRejectedValueOnce(new Error('Private academic text and provider error'));
    await expect(prerenderSourcePageSnapshots(h.client, input, h)).resolves.toBeUndefined();
    expect(h.log).toHaveBeenCalledExactlyOnceWith('source_page_snapshot.prerender', { code: 'prerender_failed', pageCount: 0, failureCount: 1 });
  });
  it('bounds sequential dispatch to 100 valid cited pages, including repeated and invalid page evidence', async () => {
    const h = harness(Array.from({ length: 100 }, (_, index) => index + 1));
    h.canonical.version.payload = { reviewer: { sections: [
      { id: 'out-of-range', sourceBlockIds: ['page-101'] },
      { id: 'invalid', sourceBlockIds: ['page-0'] },
      ...Array.from({ length: 100 }, (_, index) => ({ id: `section-${index}`, sourceBlockIds: [`page-${index + 1}`] })),
      { id: 'repeated', sourceBlockIds: ['page-100'] },
    ] } };
    let active = 0; let maxActive = 0;
    h.dispatch.mockImplementation(async () => { active++; maxActive = Math.max(active, maxActive); await Promise.resolve(); active--; });
    await prerenderSourcePageSnapshots(h.client, input, h);
    expect(h.rpc).toHaveBeenCalledTimes(100); expect(h.dispatch).toHaveBeenCalledTimes(100);
    expect(h.rpc.mock.calls.every(call => call[1].p_page_number >= 1 && call[1].p_page_number <= 100)).toBe(true);
    expect(maxActive).toBe(1); expect(h.resolve).toHaveBeenCalledTimes(1);
  });
  it('does not resolve or reserve when citations are absent or outside the original page count', async () => {
    const h = harness([9]); h.item.page_count = 2;
    await prerenderSourcePageSnapshots(h.client, input, h);
    expect(h.resolve).not.toHaveBeenCalled(); expect(h.rpc).not.toHaveBeenCalled();
  });
});
