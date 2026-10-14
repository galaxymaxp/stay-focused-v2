import type { Database, SourceVersionRow } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CANVAS_SOURCE_FILE_BUCKET, safeObjectKeyForCanvasFile } from './canvas-file-policy';
import { record } from './experience/mappers';
import { PROCESSING_JOB_SOURCE_BUCKET } from './processing-jobs/constants';
import { readStructuredSourceBlocks } from './processing-jobs/structured-source-blocks';
import { OFFICE_MIME, OFFICE_STRUCTURE_VERSION } from './activity-maker/office-extraction';
import { OFFICE_PDF_BUCKET, readOfficeConversion } from './office-conversion/store';

type SnapshotPdfObject =
  | { readonly available: true; readonly bucket: string; readonly key: string; readonly contentSha256?: string; readonly byteSize?: number }
  | { readonly available: false; readonly reason: 'source_revision_unavailable' };

/** VL0c uses user_edited for every accepted child, even unchanged text. */
export function isAcceptedLocalSnapshotPdf(source: Pick<SourceVersionRow, 'revision_kind' | 'metadata'>): boolean {
  const metadata = record(source.metadata);
  const blocks = readStructuredSourceBlocks(metadata.reviewerSourceBlocks, { strict: true });
  return source.revision_kind === 'user_edited' && metadata.sourceType === 'local_file' &&
    metadata.mimeType === 'application/pdf' && metadata.pageProvenance === 'extracted' && !!blocks?.length &&
    blocks.every(block => !!block.pageNumber && block.pageNumber <= 100 && block.id === `page-${block.pageNumber}`) &&
    new Set(blocks.map(block => block.id)).size === blocks.length;
}

/** Server-only private locator for the exact accepted, unedited revision. */
export async function resolveSnapshotPdfObject(client: SupabaseClient<Database>, input: {
  readonly userId: string;
  readonly snapshotItemId?: string;
  readonly sourceVersionId?: string;
}): Promise<SnapshotPdfObject> {
  const unavailable = { available: false, reason: 'source_revision_unavailable' } as const;
  try {
    if (input.sourceVersionId) {
      const source = await client.from('source_versions').select('*')
        .eq('id', input.sourceVersionId).eq('user_id', input.userId).maybeSingle();
      if (source.error || !source.data || source.data.id !== input.sourceVersionId || source.data.user_id !== input.userId ||
          !isAcceptedLocalSnapshotPdf(source.data) || !source.data.document_asset_id || !source.data.extraction_result_id ||
          !source.data.parent_source_version_id) return unavailable;
      const parent = await client.from('source_versions').select('*')
        .eq('id', source.data.parent_source_version_id).eq('user_id', input.userId).maybeSingle();
      if (parent.error || !parent.data || parent.data.user_id !== input.userId || parent.data.revision_kind !== 'normalized' ||
          parent.data.document_asset_id !== source.data.document_asset_id || parent.data.extraction_result_id !== source.data.extraction_result_id ||
          parent.data.content_sha256 !== source.data.content_sha256) return unavailable;
      const extraction = await client.from('extraction_results').select('id,user_id,document_asset_id,status,page_count')
        .eq('id', source.data.extraction_result_id).eq('user_id', input.userId).maybeSingle();
      const blocks = readStructuredSourceBlocks(record(source.data.metadata).reviewerSourceBlocks, { strict: true })!;
      if (extraction.error || !extraction.data || extraction.data.user_id !== input.userId || extraction.data.status !== 'succeeded' ||
          extraction.data.document_asset_id !== source.data.document_asset_id || extraction.data.page_count < 1 ||
          extraction.data.page_count > 100 || blocks.some(block => block.pageNumber! > extraction.data!.page_count)) return unavailable;
      const asset = await client.from('document_assets').select('*')
        .eq('id', source.data.document_asset_id).eq('user_id', input.userId).maybeSingle();
      if (asset.error || !asset.data || asset.data.user_id !== input.userId || asset.data.deleted_at !== null ||
          asset.data.upload_status !== 'available' || asset.data.mime_type !== 'application/pdf' ||
          asset.data.storage_bucket !== PROCESSING_JOB_SOURCE_BUCKET || !asset.data.storage_object_path.startsWith(`${input.userId}/`) ||
          asset.data.storage_object_path.split('/').some(part => !part || part === '.' || part === '..') ||
          !Number.isSafeInteger(asset.data.byte_size) || asset.data.byte_size < 1 || asset.data.byte_size > 20 * 1024 * 1024 ||
          (asset.data.content_sha256 !== null && !/^[a-f0-9]{64}$/.test(asset.data.content_sha256))) return unavailable;
      const existence = await client.storage.from(asset.data.storage_bucket).exists(asset.data.storage_object_path);
      if (existence.error || existence.data !== true) return unavailable;
      return { available: true, bucket: asset.data.storage_bucket, key: asset.data.storage_object_path,
        byteSize: asset.data.byte_size, ...(asset.data.content_sha256 ? { contentSha256: asset.data.content_sha256 } : {}) };
    }
    if (!input.snapshotItemId) return unavailable;
    const item = await client.from('reviewer_source_snapshot_items').select('*')
      .eq('id', input.snapshotItemId).eq('user_id', input.userId).maybeSingle();
    const office = item.data?.file_kind === null && item.data.mime_type === OFFICE_MIME.pptx &&
      item.data.parser_version === OFFICE_STRUCTURE_VERSION && !!item.data.office_revision_fingerprint;
    if (item.error || !item.data || item.data.user_id !== input.userId || item.data.source_type !== 'file' || (!office && item.data.file_kind !== 'pdf') ||
        !item.data.source_row_id || !item.data.stored_content_sha256 || !/^[a-f0-9]{64}$/.test(item.data.stored_content_sha256)) return unavailable;
    const snapshot = await client.from('reviewer_source_snapshots').select('id,user_id,was_edited')
      .eq('id', item.data.source_snapshot_id).eq('user_id', input.userId).maybeSingle();
    if (snapshot.error || !snapshot.data || snapshot.data.user_id !== input.userId || snapshot.data.was_edited !== false) return unavailable;
    const key = safeObjectKeyForCanvasFile({ userId: input.userId, fileId: item.data.source_row_id, contentHash: item.data.stored_content_sha256 });
    const existence = await client.storage.from(CANVAS_SOURCE_FILE_BUCKET).exists(key);
    if (existence.error || existence.data !== true) return unavailable;
    if (office) {
      const conversion = await readOfficeConversion(client, { userId: input.userId, fileId: item.data.source_row_id,
        revision: item.data.office_revision_fingerprint!, originalSha256: item.data.stored_content_sha256 });
      if (!conversion || conversion.course_id !== item.data.course_id || conversion.canvas_connection_id !== item.data.canvas_connection_id) return unavailable;
      const pdfExists = await client.storage.from(OFFICE_PDF_BUCKET).exists(conversion.storage_path);
      if (pdfExists.error || pdfExists.data !== true) return unavailable;
      return { available: true, bucket: OFFICE_PDF_BUCKET, key: conversion.storage_path,
        contentSha256: conversion.pdf_sha256, byteSize: conversion.byte_size };
    }
    return { available: true, bucket: CANVAS_SOURCE_FILE_BUCKET, key };
  } catch {
    return unavailable;
  }
}
