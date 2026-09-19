import type { CanvasFileRow, Database, Json, ProcessingJobDatabaseRow } from '@stay-focused/db';
import type { OcrPage } from '@stay-focused/ocr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { CANVAS_SELECTIVE_PREVIEW_VERSION } from '@/lib/canvas-structured-blocks';
import { validateCanvasReviewerGenerationGate } from '@/lib/canvas-reviewer-generation-gate';
import { isPreparedCanvasFileReadyForOcr } from '@/lib/canvas-stored-file-extraction';
import { ExperienceFailure } from '@/lib/experience/errors';
import { record } from '@/lib/experience/mappers';
import {
  CANVAS_STORED_FILE_EXTRACTION_VERSION,
  CANVAS_STORED_PDF_OCR_VERSION,
  createCanvasSourcePreviewSession,
  createOrReuseReviewerSourceSnapshot,
  sha256Utf8Hex,
  validateCanvasPreviewSessionForGeneration,
  type CanvasSelectedBlockManifestItem,
  type CanvasSourceManifestItem,
} from '@/lib/reviewer-source-provenance';

import { findProcessingJobSource } from './repository';
import { readProcessingJobCheckpoint, writeProcessingJobCheckpoint } from './workflow-repository';
import { updateProcessingJobProgress } from './worker-repository';
import { DEFERRED_CANVAS_REVIEWER_VERSION } from './deferred-canvas-reviewer-contract';

const CHECKPOINT_KEY = 'reviewer:canvas-source:prepared';

export async function isDeferredCanvasReviewerJob({
  client,
  job,
}: {
  readonly client: SupabaseClient<Database>;
  readonly job: ProcessingJobDatabaseRow;
}): Promise<boolean> {
  const source = await findProcessingJobSource(client, job);
  return record(source.metadata).canvasDeferredResolutionVersion === DEFERRED_CANVAS_REVIEWER_VERSION;
}

export async function prepareDeferredCanvasReviewerSource({
  client,
  job,
  normalizedText,
  pages,
  workerId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly job: ProcessingJobDatabaseRow;
  readonly normalizedText: string;
  readonly pages: readonly OcrPage[];
  readonly workerId: string;
}): Promise<boolean> {
  const source = await findProcessingJobSource(client, job);
  const metadata = record(source.metadata);
  if (metadata.canvasDeferredResolutionVersion !== DEFERRED_CANVAS_REVIEWER_VERSION) return false;
  if (await readProcessingJobCheckpoint(client, job.id, CHECKPOINT_KEY)) return true;

  const courseId = typeof metadata.canvasCourseId === 'string' ? metadata.canvasCourseId : null;
  const itemIds = Array.isArray(metadata.canvasItemIds)
    ? metadata.canvasItemIds.filter((value): value is string => typeof value === 'string')
    : [];
  const rowId = itemIds.length === 1 ? /^file:([0-9a-f-]{36})$/i.exec(itemIds[0]!)?.[1] : null;
  if (!courseId || !rowId || !normalizedText.trim()) throw new ExperienceFailure(409, 'not_ready');
  const orderedPages = [...pages].sort((left, right) => left.pageNumber - right.pageNumber);
  if (
    orderedPages.length === 0 ||
    orderedPages.some((page, index) => page.pageNumber !== index + 1 || page.status === 'failed')
  ) {
    throw new ExperienceFailure(409, 'not_ready');
  }

  await updateProcessingJobProgress(client, {
    jobId: job.id,
    workerId,
    stage: 'preparing_source',
    statusMessage: 'Preserving source provenance',
    completedUnits: orderedPages.length,
    totalUnits: orderedPages.length,
    unitLabel: 'pages',
  });
  const file = await readOwnedPreparedFile(client, job.user_id, courseId, rowId);
  if (!file || !isPreparedCanvasFileReadyForOcr(file)) throw new ExperienceFailure(409, 'not_ready');

  const manifest: readonly CanvasSourceManifestItem[] = [{
    ordinal: 1,
    source_type: 'file',
    source_title: file.display_name,
    source_row_id: file.id,
    canvas_connection_id: file.canvas_connection_id,
    course_id: file.course_id,
    canvas_course_id: file.canvas_course_id,
    canvas_source_object_id: file.canvas_file_id,
    module_id: null,
    module_item_id: null,
    file_id: file.canvas_file_id,
    file_kind: 'pdf',
    mime_type: file.stored_content_type ?? file.content_type ?? 'application/pdf',
    page_count: orderedPages.length,
    canvas_updated_at: file.canvas_modified_at ?? file.canvas_updated_at,
    local_synced_at: file.last_synced_at,
    normalized_content_sha256: sha256Utf8Hex(normalizedText),
    stored_content_sha256: file.current_sha256,
    parser_version: CANVAS_STORED_FILE_EXTRACTION_VERSION,
    ocr_version: CANVAS_STORED_PDF_OCR_VERSION,
  }];
  const pageBlocks = orderedPages.filter((page) => page.text.trim()).map((page, index) => ({
    id: `page-${page.pageNumber}`,
    kind: 'paragraph' as const,
    order: index,
    pageNumber: page.pageNumber,
    text: page.text.trim(),
  }));
  const selectedBlockManifest: readonly CanvasSelectedBlockManifestItem[] = pageBlocks.map((block, index) => ({
    ordinal: index + 1,
    source_ordinal: 1,
    block_ordinal: index + 1,
    block_kind: block.kind,
    block_text: block.text,
    block_sha256: sha256Utf8Hex(block.text),
    heading_level: null,
    list_depth: null,
    list_style: null,
    table_structure: null,
    page_number: block.pageNumber,
    slide_number: null,
    module_position: null,
    parser_version: CANVAS_STORED_FILE_EXTRACTION_VERSION,
    ocr_version: CANVAS_STORED_PDF_OCR_VERSION,
  }));
  const preview = await createCanvasSourcePreviewSession({
    canvasConnectionId: file.canvas_connection_id,
    client,
    courseId,
    manifest,
    normalizationVersion: CANVAS_SELECTIVE_PREVIEW_VERSION,
    originalPreviewText: normalizedText,
    selectedBlockManifest,
    sourceRelationshipManifest: [],
    suggestedTitle: file.display_name,
    userId: job.user_id,
  });
  if (!preview.ok) throw new ExperienceFailure(503, 'unavailable');
  const accepted = await validateCanvasPreviewSessionForGeneration({
    client,
    userId: job.user_id,
    previewSessionId: preview.value.previewSessionId,
  });
  if (!accepted.ok || !accepted.value) throw new ExperienceFailure(409, 'not_ready');
  const gate = await validateCanvasReviewerGenerationGate({
    client,
    userId: job.user_id,
    courseId,
    itemIds,
    previewSession: accepted.value,
    resolutionFingerprint: preview.value.resolutionFingerprint,
  });
  if (!gate.ok) throw new ExperienceFailure(409, 'not_ready');
  const snapshot = await createOrReuseReviewerSourceSnapshot({
    client,
    userId: job.user_id,
    previewSession: accepted.value,
    sourceText: normalizedText,
    sourceTitle: file.display_name,
  });
  if (!snapshot.ok) throw new ExperienceFailure(503, 'unavailable');

  const resolvedMetadata = toJson({
    canvasCourseId: courseId,
    canvasItemIds: itemIds,
    canvasPreviewSessionId: preview.value.previewSessionId,
    canvasResolutionFingerprint: preview.value.resolutionFingerprint,
    canvasResolvedInWorkflowVersion: DEFERRED_CANVAS_REVIEWER_VERSION,
    reviewerSourceBlocks: pageBlocks,
    reviewerSourceKind: 'document',
    reviewerSourceSnapshotId: snapshot.value.sourceSnapshotId,
    sourceTitle: file.display_name,
  });
  const { data, error } = await client.rpc('attach_deferred_canvas_reviewer_source_v1', {
    p_job_id: job.id,
    p_worker_id: workerId,
    p_source_text: normalizedText,
    p_source_title: file.display_name,
    p_source_metadata: resolvedMetadata,
  });
  if (error || !data?.[0]) throw new ExperienceFailure(503, 'unavailable');
  await writeProcessingJobCheckpoint(client, {
    jobId: job.id,
    checkpointKey: CHECKPOINT_KEY,
    payload: toJson({
      expectedPageCount: orderedPages.length,
      accountedPageNumbers: orderedPages.map((page) => page.pageNumber),
      sourceCharacterCount: normalizedText.length,
      preparedAt: new Date().toISOString(),
    }),
  });
  logMemory('source_attached', job.id, {
    expectedPageCount: orderedPages.length,
    accountedPageCount: orderedPages.length,
    sourceCharacterCount: normalizedText.length,
  });
  return true;
}

async function readOwnedPreparedFile(
  client: SupabaseClient<Database>,
  userId: string,
  courseId: string,
  rowId: string,
): Promise<CanvasFileRow | null> {
  const { data, error } = await client
    .from('canvas_files')
    .select('*')
    .eq('id', rowId)
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();
  if (error) throw new ExperienceFailure(503, 'unavailable');
  return data as CanvasFileRow | null;
}

function logMemory(stage: string, jobId: string, fields: Readonly<Record<string, number>>): void {
  const memory = process.memoryUsage();
  console.info('deferred_canvas_reviewer.memory', {
    stage,
    jobId,
    rssBytes: memory.rss,
    heapUsedBytes: memory.heapUsed,
    externalBytes: memory.external,
    arrayBufferBytes: memory.arrayBuffers,
    ...fields,
  });
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}
