import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readCanonicalReviewerRecord, type CanonicalReviewerRecord } from './canonical-reviewers';
import { ExperienceFailure } from './experience/errors';
import { record } from './experience/mappers';
import { readStructuredSourceBlocks } from './processing-jobs/structured-source-blocks';
import { isAcceptedLocalSnapshotPdf, resolveSnapshotPdfObject } from './snapshot-pdf-object';
import { dispatchSourcePageSnapshot } from './source-page-snapshot-dispatch';
import { OFFICE_MIME, OFFICE_STRUCTURE_VERSION } from './activity-maker/office-extraction';
import { readOfficeConversion } from './office-conversion/store';

export const SNAPSHOT_BUCKET = 'source-page-snapshots';
export type SourcePageSnapshotResult = (
  | { available: false; reason: 'not_canvas_pdf' | 'no_page_source' | 'source_revision_unavailable' | 'render_failed' | 'render_limit_reached'; page?: number }
  | { available: true; status: 'rendering'; page: number }
  | { available: true; status: 'unrendered'; page: number }
  | { available: true; url: string; page: number; width: number; height: number; sourceLabel: string }) & { labelKind?: 'slide' };

/** Only canonical, persisted citation IDs are accepted; never title/text matching. */
export function lowestSectionPage(saved: CanonicalReviewerRecord, sectionId: string): number | null {
  const blocks = sectionSourceBlocks(saved, sectionId);
  const pages = blocks.map(block => block.pageNumber).filter((page): page is number =>
    typeof page === 'number' && Number.isSafeInteger(page) && page > 0 && page <= 100);
  return pages.length ? Math.min(...pages) : null;
}

/** Shared canonical citation evidence for page snapshots and extracted figures. */
export function sectionSourceBlocks(saved: CanonicalReviewerRecord, sectionId: string) {
  const payload = record(saved.version.payload);
  const reviewer = record(payload.reviewer ?? payload);
  const section = (Array.isArray(reviewer.sections) ? reviewer.sections : []).map(record).find(s => s.id === sectionId);
  if (!section) throw new ExperienceFailure(404, 'not_found');
  const ids = section.sourceBlockIds;
  if (!Array.isArray(ids) || !ids.length || !ids.every(id => typeof id === 'string')) return [];
  const blocks = readStructuredSourceBlocks(record(saved.source.metadata).reviewerSourceBlocks, { strict: true }) ?? [];
  const byId = new Map(blocks.map(block => [block.id, block]));
  if (byId.size !== blocks.length) return [];
  // Missing evidence is not permission to guess from the other citations.
  if (ids.some(id => !byId.has(id))) return [];
  return ids.map(id => byId.get(id)!);
}

export async function getSourcePageSnapshot(client: SupabaseClient<Database>, input: {
  userId: string; artifactId: string; sectionId: string; render?: boolean;
}, dependencies: {
  readonly read?: typeof readCanonicalReviewerRecord;
  readonly resolve?: typeof resolveSnapshotPdfObject;
  readonly dispatch?: typeof dispatchSourcePageSnapshot;
} = {}): Promise<SourcePageSnapshotResult> {
  const saved = await (dependencies.read ?? readCanonicalReviewerRecord)(client, input.userId, input.artifactId);
  if (!saved.ok) throw new ExperienceFailure(503, 'unavailable');
  if (!saved.value || saved.value.artifact.user_id !== input.userId || saved.value.version.user_id !== input.userId ||
      saved.value.source.user_id !== input.userId || saved.value.artifact.deleted_at !== null) throw new ExperienceFailure(404, 'not_found');
  const page = lowestSectionPage(saved.value, input.sectionId);
  const pdf = await eligibleSnapshotPdf(client, saved.value, input.userId);
  if (!pdf) return { available: false, reason: 'not_canvas_pdf' };
  const { local, itemId, sourceLabel } = pdf;
  const label = pdf.labelKind === 'slide' ? { labelKind: 'slide' as const } : {};
  if (!local && (!page || !pdf.pageCount || page > pdf.pageCount)) return { available: false, reason: 'no_page_source' };
  if (!page) return { available: false, reason: 'no_page_source' };
  const original = await (dependencies.resolve ?? resolveSnapshotPdfObject)(client, local
    ? { userId: input.userId, sourceVersionId: saved.value.source.id }
    : { userId: input.userId, snapshotItemId: itemId! });
  if (!original.available) return local ? { ...original, page } : original;
  // Header discovery never renders a page simply because the reader mounted.
  const reservation = input.render === false
    ? await client.from('source_page_snapshots').select('*').eq('user_id', input.userId)
      .eq('source_version_id', saved.value.source.id).eq('page_number', page).maybeSingle()
    : await client.rpc('reserve_source_page_snapshot_v1', {
      p_user_id: input.userId, p_source_version_id: saved.value.source.id, p_snapshot_item_id: itemId, p_page_number: page,
    });
  if (reservation.error?.message === 'snapshot_render_limit_reached') return { available: false, reason: 'render_limit_reached' };
  const row = Array.isArray(reservation.data) ? reservation.data[0] : reservation.data;
  if (input.render === false && !reservation.error && !row) return { available: true, status: 'unrendered', page, ...label };
  if (reservation.error || !row || row.user_id !== input.userId || row.source_version_id !== saved.value.source.id ||
      row.source_snapshot_item_id !== itemId || row.page_number !== page) throw new ExperienceFailure(503, 'unavailable');
  if (row.status === 'failed') return { available: false, reason: row.error_code ?? 'render_failed', ...(local ? { page } : {}) };
  if (row.status === 'ready') {
    if (!row.storage_path || !row.width || !row.height) throw new ExperienceFailure(503, 'unavailable');
    const signed = await client.storage.from(SNAPSHOT_BUCKET).createSignedUrl(row.storage_path, 600);
    if (signed.error || !signed.data?.signedUrl) throw new ExperienceFailure(503, 'unavailable');
    return { available: true, url: signed.data.signedUrl, page, width: row.width, height: row.height, sourceLabel, ...label };
  }
  // Await durable task acceptance before HTTP 202. No after()/in-memory work.
  if (input.render !== false) await (dependencies.dispatch ?? dispatchSourcePageSnapshot)(client, row);
  return { available: true, status: 'rendering', page, ...label };
}

/** Shared exact-source classification; original availability is checked by the resolver. */
export async function eligibleSnapshotPdf(client: SupabaseClient<Database>, saved: CanonicalReviewerRecord, userId: string): Promise<{
  local: boolean; itemId: string | null; sourceLabel: string; pageCount: number | null; labelKind?: 'slide';
} | null> {
  const metadata = record(saved.source.metadata);
  if (isAcceptedLocalSnapshotPdf(saved.source)) return {
    local: true, itemId: null, pageCount: null,
    sourceLabel: typeof metadata.sourceTitle === 'string' ? metadata.sourceTitle : 'Source PDF',
  };
  const snapshotId = metadata.reviewerSourceSnapshotId;
  if (saved.source.revision_kind === 'user_edited' || typeof snapshotId !== 'string') return null;
  const snapshot = await client.from('reviewer_source_snapshots').select('id,user_id,source_mode,source_count,was_edited')
    .eq('id', snapshotId).eq('user_id', userId).maybeSingle();
  if (snapshot.error) throw new ExperienceFailure(503, 'unavailable');
  if (!snapshot.data || snapshot.data.user_id !== userId || snapshot.data.source_mode !== 'canvas' ||
      snapshot.data.was_edited || snapshot.data.source_count !== 1) return null;
  const items = await client.from('reviewer_source_snapshot_items').select('*')
    .eq('source_snapshot_id', snapshotId).eq('user_id', userId).limit(2);
  if (items.error) throw new ExperienceFailure(503, 'unavailable');
  const item = items.data?.[0];
  if (items.data?.length !== 1 || !item || item.user_id !== userId || item.source_type !== 'file') return null;
  if (item.file_kind === null && item.mime_type === OFFICE_MIME.pptx && item.parser_version === OFFICE_STRUCTURE_VERSION &&
      item.source_row_id && item.stored_content_sha256 && item.office_revision_fingerprint) {
    const conversion = await readOfficeConversion(client, { userId, fileId: item.source_row_id,
      revision: item.office_revision_fingerprint, originalSha256: item.stored_content_sha256 });
    if (!conversion || conversion.course_id !== item.course_id || conversion.canvas_connection_id !== item.canvas_connection_id) return null;
    // Only canonical Office block IDs with persisted slide/page equality qualify.
    const blocks = await client.from('reviewer_source_snapshot_blocks').select('source_ordinal,block_ordinal,page_number,slide_number,parser_version')
      .eq('source_snapshot_item_id', item.id).eq('user_id', userId).limit(401);
    if (blocks.error) throw new ExperienceFailure(503, 'unavailable');
    const canonical = readStructuredSourceBlocks(metadata.reviewerSourceBlocks, { strict: true });
    if (!canonical?.length || !blocks.data?.length || blocks.data.length > 400 ||
        new Set(blocks.data.map(b => `canvas-${b.source_ordinal}-${b.block_ordinal}`)).size !== blocks.data.length ||
        canonical.some(block => !blocks.data!.some(b => block.id === `canvas-${b.source_ordinal}-${b.block_ordinal}` &&
          b.parser_version === OFFICE_STRUCTURE_VERSION && b.page_number === b.slide_number && b.page_number === block.pageNumber &&
          !!b.page_number && b.page_number <= conversion.page_count))) return null;
    return { local: false, itemId: item.id, sourceLabel: item.source_title, pageCount: conversion.page_count, labelKind: 'slide' };
  }
  if (item.file_kind !== 'pdf') return null;
  return { local: false, itemId: item.id, sourceLabel: item.source_title, pageCount: item.page_count };
}
