import { createHash } from 'node:crypto';
import type { CanvasFileRow, Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { OfficeConversionFailure } from './convert';
import { OFFICE_PDF_BUCKET, prepareOfficePdf, readOfficeConversion } from './store';

const original = new Uint8Array([1, 2, 3]);
const hash = createHash('sha256').update(original).digest('hex');
const file = { id: 'file', user_id: 'owner', course_id: 'course', canvas_connection_id: 'connection',
  content_version_fingerprint: 'a'.repeat(64), current_sha256: hash, stored_byte_count: 3 } as CanvasFileRow;
function harness() {
  let receipt: Database['public']['Tables']['office_pdf_conversions']['Row'] | null = null;
  const filters = new Map<string, unknown>();
  const query = { select: () => query, eq: (key: string, value: unknown) => { filters.set(key, value); return query; },
    maybeSingle: async () => ({ error: null, data: receipt && [...filters].every(([key, value]) => receipt![key as keyof typeof receipt] === value) ? receipt : null }),
    upsert: vi.fn(async (row: Database['public']['Tables']['office_pdf_conversions']['Row']) => { receipt = row; return { error: null }; }) };
  const download = vi.fn(async () => ({ error: null, data: new Blob([original]) }));
  const upload = vi.fn(async () => ({ error: null }));
  const exists = vi.fn(async () => ({ error: null, data: true }));
  const storage = vi.fn((_bucket: string) => ({ download, upload, exists }));
  const client = { from: () => query, storage: { from: storage } } as unknown as SupabaseClient<Database>;
  const convert = vi.fn(async () => ({ bytes: new TextEncoder().encode('%PDF-test'), pageCount: 2 }));
  return { client, convert, query, storage, download, upload, exists, receipt: () => receipt };
}
describe('exact-revision Office PDF persistence', () => {
  it('uploads before immutable receipt, binds owner/fingerprint/original and PDF hashes, then reuses unchanged revision', async () => {
    const h = harness();
    expect(await prepareOfficePdf(h.client, file, 2, h)).toBe(2);
    expect(h.receipt()).toMatchObject({ user_id: 'owner', source_file_id: 'file', revision_fingerprint: file.content_version_fingerprint,
      original_sha256: hash, page_count: 2, pdf_sha256: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(h.storage).toHaveBeenCalledWith(OFFICE_PDF_BUCKET);
    expect(h.upload.mock.invocationCallOrder[0]).toBeLessThan(h.query.upsert.mock.invocationCallOrder[0]!);
    expect(await prepareOfficePdf(h.client, file, 2, h)).toBe(2);
    expect(h.convert).toHaveBeenCalledOnce(); expect(h.upload).toHaveBeenCalledOnce();
  });
  it('reconverts a new fingerprint and does not resolve its predecessor', async () => {
    const h = harness(); await prepareOfficePdf(h.client, file, 2, h);
    const newer = { ...file, content_version_fingerprint: 'b'.repeat(64) };
    expect(await readOfficeConversion(h.client, { userId: file.user_id, fileId: file.id, revision: newer.content_version_fingerprint, originalSha256: hash })).toBeNull();
    expect(await prepareOfficePdf(h.client, newer, 2, h)).toBe(2); expect(h.convert).toHaveBeenCalledTimes(2);
  });
  it.each(['timeout', 'missing binary', 'wrong page count', 'wrong original hash', 'upload error'])('falls back without receipt on %s and logs safe codes only', async failure => {
    const h = harness(); const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      let input = file;
      if (failure === 'timeout' || failure === 'missing binary') h.convert.mockRejectedValue(new OfficeConversionFailure(failure === 'timeout' ? 'conversion_timeout' : 'conversion_unavailable'));
      if (failure === 'wrong page count') h.convert.mockResolvedValue({ bytes: original, pageCount: 1 });
      if (failure === 'wrong original hash') input = { ...file, current_sha256: 'f'.repeat(64) };
      if (failure === 'upload error') h.upload.mockResolvedValue({ error: { message: 'private path and provider detail' } } as never);
      expect(await prepareOfficePdf(h.client, input, 2, h)).toBeNull();
      expect(h.query.upsert).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalledWith('office_pdf.conversion', { code: expect.stringMatching(/^conversion_/), failureCount: 1 });
      expect(JSON.stringify(log.mock.calls)).not.toContain(hash);
    } finally { log.mockRestore(); }
  });
});
