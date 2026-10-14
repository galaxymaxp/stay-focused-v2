import { createHash } from 'node:crypto';
import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { executeSourcePageSnapshot } from './source-page-snapshot-worker';

const reference = { jobId: 'job', dispatchId: 'dispatch' };
function harness() {
  const bytes = new Uint8Array([1, 2, 3]); const hash = createHash('sha256').update(bytes).digest('hex');
  const row = { id: 'job', dispatch_id: 'dispatch', user_id: 'owner', source_version_id: 'version',
    source_snapshot_id: 'snapshot' as string | null, source_snapshot_item_id: 'item' as string | null, page_number: 2, status: 'pending', lease_token: '' };
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => name === 'claim_source_page_snapshot_v1'
    ? { data: [{ ...row, lease_token: row.lease_token || args.p_lease_token }], error: null }
    : { data: true, error: null });
  const source = {
    user_id: 'owner', revision_kind: 'canvas_resolved', metadata: { reviewerSourceSnapshotId: 'snapshot' },
  };
  const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: source, error: null }) };
  const upload = vi.fn(async (_path: string, _bytes: Buffer, _options: unknown) => ({ error: null }));
  const remove = vi.fn(async () => ({ error: null }));
  const download = vi.fn(async () => ({ data: new Blob([bytes]), error: null }));
  const resolve = vi.fn(async () => ({ available: true as const, bucket: 'canvas-source-files', key: `canvas/owner/file/${hash}` }));
  const render = vi.fn(async () => ({ png: Buffer.from('image'), width: 1400, height: 1867 }));
  const client = { rpc, from: () => query, storage: { from: () => ({ upload, remove, download }) } } as unknown as SupabaseClient<Database>;
  return { client, row, source, hash, rpc, upload, remove, download, resolve, render };
}
function localWorkerHarness() {
  const h = harness(); h.row.source_snapshot_id = null; h.row.source_snapshot_item_id = null;
  h.source.revision_kind = 'user_edited';
  h.source.metadata = { sourceType: 'local_file', mimeType: 'application/pdf', pageProvenance: 'extracted',
    reviewerSourceBlocks: [{ id: 'page-2', text: 'Evidence', pageNumber: 2 }] } as never;
  h.resolve.mockResolvedValue({ available: true, bucket: 'processing-job-sources', key: 'owner/uploads/exact.pdf',
    contentSha256: h.hash, byteSize: 3 } as never);
  return h;
}
describe('durable page snapshot worker', () => {
  it('checks the explicit converted PDF hash, not the opaque Storage filename', async () => {
    const h = harness();
    h.resolve.mockResolvedValue({ available: true, bucket: 'office-source-pdfs', key: 'owner/conversion.pdf', contentSha256: h.hash, byteSize: 3 } as never);
    expect(await executeSourcePageSnapshot(reference, h)).toBe('ack');
    expect(h.render).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]), 2);
    h.download.mockResolvedValue({ data: new Blob([new Uint8Array([4, 5, 6])]), error: null });
    h.render.mockClear();
    await executeSourcePageSnapshot(reference, h);
    expect(h.render).not.toHaveBeenCalled();
    expect(h.rpc.mock.calls.at(-1)?.[1]).toMatchObject({ p_error_code: 'source_revision_unavailable' });
  });
  it('verifies accepted PDF bytes, uploads privately, then publishes fenced metadata', async () => {
    const h = harness(); expect(await executeSourcePageSnapshot(reference, h)).toBe('ack');
    expect(h.resolve).toHaveBeenCalledWith(h.client, { userId: 'owner', snapshotItemId: 'item' });
    expect(h.render).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]), 2);
    expect(h.upload).toHaveBeenCalledWith(expect.stringMatching(/^job\/[0-9a-f-]{36}\.png$/), Buffer.from('image'), { contentType: 'image/png', cacheControl: '600', upsert: false });
    expect(h.rpc.mock.calls[1]?.[0]).toBe('finish_source_page_snapshot_v1');
    expect(h.rpc.mock.calls[1]?.[1]).toMatchObject({ p_width: 1400, p_error_code: null });
  });
  it('does not render a duplicate delivery with an active different lease', async () => {
    const h = harness(); h.row.lease_token = 'another-attempt';
    expect(await executeSourcePageSnapshot(reference, h)).toBe('retry'); expect(h.render).not.toHaveBeenCalled();
  });
  it.each(['ready', 'failed'])('acknowledges terminal %s without reading the PDF', async status => {
    const h = harness(); h.row.status = status;
    expect(await executeSourcePageSnapshot(reference, h)).toBe('ack'); expect(h.resolve).not.toHaveBeenCalled();
  });
  it('marks a missing original unavailable without rendering', async () => {
    const h = harness(); h.resolve.mockResolvedValue({ available: false, reason: 'source_revision_unavailable' } as never);
    expect(await executeSourcePageSnapshot(reference, h)).toBe('ack'); expect(h.render).not.toHaveBeenCalled();
    expect(h.rpc.mock.calls[1]?.[1]).toMatchObject({ p_error_code: 'source_revision_unavailable', p_storage_path: null });
  });
  it('rejects a hash mismatch before rendering', async () => {
    const h = harness(); h.download.mockResolvedValue({ data: new Blob(['changed']), error: null });
    await executeSourcePageSnapshot(reference, h); expect(h.render).not.toHaveBeenCalled();
    expect(h.rpc.mock.calls[1]?.[1]).toMatchObject({ p_error_code: 'source_revision_unavailable' });
  });
  it('does not publish after parser failure or leak the raw error', async () => {
    const h = harness(); h.render.mockRejectedValue(new Error('private source content'));
    const log = vi.spyOn(console, 'error'); expect(await executeSourcePageSnapshot(reference, h)).toBe('ack');
    expect(h.upload).not.toHaveBeenCalled(); expect(log).not.toHaveBeenCalled();
    expect(h.rpc.mock.calls[1]?.[1]).toMatchObject({ p_error_code: 'render_failed', p_storage_path: null });
  });
  it('removes only an unreferenced image after a definite stale-lease denial', async () => {
    const h = harness(); h.rpc.mockImplementation(async (name, args) => name === 'claim_source_page_snapshot_v1'
      ? { data: [{ ...h.row, lease_token: args.p_lease_token }], error: null } : { data: false, error: null });
    expect(await executeSourcePageSnapshot(reference, h)).toBe('retry'); expect(h.remove).toHaveBeenCalledWith([h.upload.mock.calls[0]?.[0]]);
  });
  it('retains the uploaded image when completion is ambiguous', async () => {
    const h = harness(); h.rpc.mockImplementation(async (name, args) => name === 'claim_source_page_snapshot_v1'
      ? { data: [{ ...h.row, lease_token: args.p_lease_token }], error: null } : { data: null, error: { code: 'unavailable' } } as never);
    expect(await executeSourcePageSnapshot(reference, h)).toBe('retry'); expect(h.remove).not.toHaveBeenCalled();
  });
  it('renders the local accepted asset using its stored hash and size', async () => {
    const h = localWorkerHarness(); expect(await executeSourcePageSnapshot(reference, h)).toBe('ack');
    expect(h.resolve).toHaveBeenCalledWith(h.client, { userId: 'owner', sourceVersionId: 'version' });
    expect(h.download).toHaveBeenCalledWith('owner/uploads/exact.pdf');
    expect(h.render).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]), 2);
    expect(h.rpc.mock.calls[1]?.[1]).toMatchObject({ p_error_code: null });
  });
  it.each(['before download', 'during download', 'during render'])('acknowledges missing local bytes %s with terminal unavailable', async when => {
    const h = localWorkerHarness();
    if (when === 'before download') h.resolve.mockResolvedValue({ available: false, reason: 'source_revision_unavailable' } as never);
    if (when === 'during download') h.download.mockResolvedValue({ data: null, error: { message: 'private provider detail' } } as never);
    if (when === 'during render') h.resolve.mockResolvedValueOnce({ available: true, bucket: 'processing-job-sources',
      key: 'owner/uploads/exact.pdf', contentSha256: h.hash, byteSize: 3 } as never)
      .mockResolvedValue({ available: false, reason: 'source_revision_unavailable' } as never);
    expect(await executeSourcePageSnapshot(reference, h)).toBe('ack');
    expect(h.upload).not.toHaveBeenCalled();
    expect(h.rpc.mock.calls[1]?.[1]).toMatchObject({ p_error_code: 'source_revision_unavailable', p_storage_path: null });
  });
  it('rejects same-size changed local bytes before rendering', async () => {
    const h = localWorkerHarness(); h.download.mockResolvedValue({ data: new Blob([new Uint8Array([4, 5, 6])]), error: null });
    expect(await executeSourcePageSnapshot(reference, h)).toBe('ack'); expect(h.render).not.toHaveBeenCalled();
    expect(h.rpc.mock.calls[1]?.[1]).toMatchObject({ p_error_code: 'source_revision_unavailable' });
  });
  it('checks size when a legacy local asset has no hash', async () => {
    const h = localWorkerHarness(); h.resolve.mockResolvedValue({ available: true, bucket: 'processing-job-sources',
      key: 'owner/uploads/exact.pdf', byteSize: 4 } as never);
    expect(await executeSourcePageSnapshot(reference, h)).toBe('ack'); expect(h.render).not.toHaveBeenCalled();
    expect(h.rpc.mock.calls[1]?.[1]).toMatchObject({ p_error_code: 'source_revision_unavailable' });
  });
});
