import { createHash, randomUUID } from 'node:crypto';
import type { CanvasFileRow, Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CANVAS_SOURCE_FILE_BUCKET, safeObjectKeyForCanvasFile } from '../canvas-file-policy';
import { convertOfficeToPdf, OfficeConversionFailure, OFFICE_CONVERSION_TIMEOUT_MS } from './convert';

export const OFFICE_PDF_BUCKET = 'office-source-pdfs';
type Client = SupabaseClient<Database>;
type Conversion = Database['public']['Tables']['office_pdf_conversions']['Row'];
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
/** Only exact keys; no current-file reads when resolving historical reviewers. */
export async function readOfficeConversion(client: Client, input: {
  userId: string; fileId: string; revision: string; originalSha256: string;
}): Promise<Conversion | null> {
  if (!/^[a-f0-9]{64}$/.test(input.revision) || !/^[a-f0-9]{64}$/.test(input.originalSha256)) return null;
  const result = await client.from('office_pdf_conversions').select('*').eq('user_id', input.userId)
    .eq('source_file_id', input.fileId).eq('revision_fingerprint', input.revision).eq('original_sha256', input.originalSha256).maybeSingle();
  if (result.error) throw new Error('conversion_store_unavailable');
  const c = result.data;
  if (!c || c.user_id !== input.userId || c.source_file_id !== input.fileId || c.revision_fingerprint !== input.revision ||
      c.original_sha256 !== input.originalSha256 || !/^[a-f0-9]{64}$/.test(c.pdf_sha256) ||
      c.storage_path !== `${input.userId}/${c.id}.pdf` || !Number.isSafeInteger(c.byte_size) || c.byte_size < 5 || c.byte_size > 20 * 1024 * 1024 ||
      !Number.isSafeInteger(c.page_count) || c.page_count < 1 || c.page_count > 100) return null;
  return c;
}

/** Optional preparation step: any conversion failure leaves text and VL2 figures usable. */
export async function prepareOfficePdf(client: Client, file: CanvasFileRow, slideCount: number, dependencies: {
  readonly convert?: typeof convertOfficeToPdf;
} = {}): Promise<number | null> {
  try {
    if (!file.current_sha256 || !file.stored_byte_count || file.stored_byte_count > 20_000_000 ||
        !Number.isSafeInteger(slideCount) || slideCount < 1 || slideCount > 100) throw new Error('conversion_source_invalid');
    const identity = { userId: file.user_id, fileId: file.id, revision: file.content_version_fingerprint, originalSha256: file.current_sha256 };
    const existing = await readOfficeConversion(client, identity);
    if (existing) {
      const present = await client.storage.from(OFFICE_PDF_BUCKET).exists(existing.storage_path);
      if (present.error || present.data !== true || existing.page_count !== slideCount) throw new Error('conversion_source_invalid');
      return existing.page_count;
    }
    const original = await client.storage.from(CANVAS_SOURCE_FILE_BUCKET).download(safeObjectKeyForCanvasFile({
      userId: file.user_id, fileId: file.id, contentHash: file.current_sha256,
    }));
    if (original.error || !original.data || original.data.size !== file.stored_byte_count) throw new Error('conversion_source_invalid');
    const bytes = new Uint8Array(await original.data.arrayBuffer());
    if (bytes.length !== file.stored_byte_count || digest(bytes) !== file.current_sha256) throw new Error('conversion_source_invalid');
    const converted = await (dependencies.convert ?? convertOfficeToPdf)(bytes, 'pptx', { timeoutMs: OFFICE_CONVERSION_TIMEOUT_MS });
    // One PDF page per presentation slide, including blank/hidden slides. A mismatch
    // means the renderer cannot prove the ordinal mapping and must fall back.
    if (converted.pageCount !== slideCount) throw new Error('conversion_mapping_invalid');
    const id = randomUUID(); const path = `${file.user_id}/${id}.pdf`;
    const uploaded = await client.storage.from(OFFICE_PDF_BUCKET).upload(path, converted.bytes, { contentType: 'application/pdf', upsert: false });
    if (uploaded.error) throw new Error('conversion_upload_failed');
    const written = await client.from('office_pdf_conversions').upsert({
      id, user_id: file.user_id, source_file_id: file.id, canvas_connection_id: file.canvas_connection_id,
      course_id: file.course_id, revision_fingerprint: file.content_version_fingerprint, original_sha256: file.current_sha256,
      pdf_sha256: digest(converted.bytes), byte_size: converted.bytes.length, page_count: converted.pageCount, storage_path: path,
    }, { onConflict: 'user_id,source_file_id,revision_fingerprint,original_sha256', ignoreDuplicates: true });
    if (written.error) throw new Error('conversion_store_failed');
    // Ambiguous/concurrent writes retain private bytes, never delete published data.
    const persisted = await readOfficeConversion(client, identity);
    if (!persisted || persisted.page_count !== slideCount) throw new Error('conversion_store_failed');
    return persisted.page_count;
  } catch (error) {
    console.warn('office_pdf.conversion', { code: error instanceof OfficeConversionFailure ? error.code : 'conversion_failed', failureCount: 1 });
    return null;
  }
}
