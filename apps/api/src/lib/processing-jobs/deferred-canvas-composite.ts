import type { Database, Json, ProcessingJobDatabaseRow } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';

import { structureCanvasReviewerSources, previewSelectiveCanvasReviewerSources } from '@/lib/canvas-reviewer-sources';
import { validateCanvasReviewerGenerationGate } from '@/lib/canvas-reviewer-generation-gate';
import {
  createOrReuseReviewerSourceSnapshot,
  validateCanvasPreviewSessionForGeneration,
} from '@/lib/reviewer-source-provenance';
import { ExperienceFailure } from '@/lib/experience/errors';
import { record } from '@/lib/experience/mappers';

import { DEFERRED_CANVAS_REVIEWER_VERSION } from './deferred-canvas-reviewer-contract';
import { findProcessingJobSource } from './repository';
import { updateProcessingJobProgress } from './worker-repository';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Resolve one Page and its ordered, already ingested attachments inside durable work. */
export async function prepareDeferredCanvasCompositeSource(
  client: SupabaseClient<Database>,
  job: ProcessingJobDatabaseRow,
  workerId: string,
): Promise<boolean> {
  const source = await findProcessingJobSource(client, job);
  const metadata = record(source.metadata);
  const ids = metadata.canvasItemIds;
  if (source.source_kind !== 'text' || metadata.canvasDeferredResolutionVersion !== DEFERRED_CANVAS_REVIEWER_VERSION ||
    !Array.isArray(ids) || ids.length < 3) return false;

  const courseId = metadata.canvasCourseId;
  if (typeof courseId !== 'string' || !UUID.test(courseId) ||
    ids.length > 8 || typeof ids[0] !== 'string' || !/^page:[0-9a-f-]{36}$/i.test(ids[0]) ||
    ids.slice(1).some(id => typeof id !== 'string' || !/^file:[0-9a-f-]{36}$/i.test(id)) ||
    new Set(ids).size !== ids.length) throw new ExperienceFailure(409, 'not_ready');
  const sourceIds = ids as string[];
  const pageId = sourceIds[0]!.slice(5);
  const { data: page, error: pageError } = await client.from('canvas_pages').select('id,title,canvas_connection_id')
    .eq('id', pageId).eq('user_id', job.user_id).eq('course_id', courseId).maybeSingle();
  if (pageError) throw new ExperienceFailure(503, 'unavailable');
  if (!page) throw new ExperienceFailure(409, 'source_attachment_unavailable');

  // The Page-scoped hidden-file exception is valid only for this exact Page.
  for (const fileId of sourceIds.slice(1)) {
    const { data: reference, error } = await client.from('canvas_file_references').select('id')
      .eq('user_id', job.user_id).eq('canvas_connection_id', page.canvas_connection_id)
      .eq('course_id', courseId).eq('file_id', fileId.slice(5))
      .eq('reference_type', 'page').eq('referenced_row_id', pageId).maybeSingle();
    if (error) throw new ExperienceFailure(503, 'unavailable');
    if (!reference) throw new ExperienceFailure(409, 'source_attachment_unavailable');
  }

  await updateProcessingJobProgress(client, { jobId: job.id, workerId, stage: 'preparing_source',
    statusMessage: 'Reading Page and attachments' });
  const structure = await structureCanvasReviewerSources({ client, courseId, userId: job.user_id,
    sourceIds, pageBundleSourceId: sourceIds[0] });
  if (!structure.ok) throw new ExperienceFailure(structure.status >= 500 ? 503 : 409, 'source_attachment_unavailable');
  const selectedBlockIds = structure.value.sources.flatMap(item => item.blocks
    .filter(block => block.selectable).map(block => block.id));
  if (structure.value.sources.some(item => !item.blocks.some(block => block.selectable)))
    throw new ExperienceFailure(409, 'source_attachment_unavailable');
  const preview = await previewSelectiveCanvasReviewerSources({ client, courseId, userId: job.user_id,
    structureSessionId: structure.value.structureSessionId, selectedBlockIds });
  if (!preview.ok) throw new ExperienceFailure(preview.status >= 500 ? 503 : 409, 'source_attachment_unavailable');
  if (preview.value.sourceText.trim().length < 80 || preview.value.sourceText.trim().split(/\s+/).length < 8)
    throw new ExperienceFailure(422, 'insufficient_source');
  const accepted = await validateCanvasPreviewSessionForGeneration({ client, userId: job.user_id,
    previewSessionId: preview.value.previewSessionId });
  if (!accepted.ok || !accepted.value) throw new ExperienceFailure(409, 'not_ready');
  const gate = await validateCanvasReviewerGenerationGate({ client, courseId, userId: job.user_id,
    itemIds: sourceIds, previewSession: accepted.value,
    resolutionFingerprint: preview.value.resolutionFingerprint });
  if (!gate.ok) throw new ExperienceFailure(409, 'not_ready');
  const snapshot = await createOrReuseReviewerSourceSnapshot({ client, userId: job.user_id,
    previewSession: accepted.value, sourceText: preview.value.sourceText,
    sourceTitle: page.title });
  if (!snapshot.ok) throw new ExperienceFailure(503, 'unavailable');

  const blocks = Array.isArray(accepted.value.row.selected_block_manifest)
    ? accepted.value.row.selected_block_manifest.map((value, index) => {
      const block = record(value);
      return {
        id: `canvas-${block.source_ordinal}-${block.block_ordinal}`,
        kind: typeof block.block_kind === 'string' ? block.block_kind : 'unknown',
        order: index,
        ...(typeof block.page_number === 'number' ? { pageNumber: block.page_number } : {}),
        text: block.block_text,
      };
    }).filter(block => typeof block.text === 'string' && block.text.trim())
    : [];
  const resolvedMetadata = JSON.parse(JSON.stringify({
    canvasCourseId: courseId,
    canvasItemIds: sourceIds,
    canvasPreviewSessionId: preview.value.previewSessionId,
    canvasResolutionFingerprint: preview.value.resolutionFingerprint,
    canvasResolvedInWorkflowVersion: DEFERRED_CANVAS_REVIEWER_VERSION,
    reviewerSourceBlocks: blocks,
    reviewerSourceKind: 'document',
    reviewerSourceSnapshotId: snapshot.value.sourceSnapshotId,
    sourceTitle: page.title,
  })) as Json;
  const { data, error } = await client.rpc('attach_deferred_canvas_reviewer_source_v1', {
    p_job_id: job.id, p_worker_id: workerId,
    p_source_text: preview.value.sourceText,
    p_source_title: page.title,
    p_source_metadata: resolvedMetadata,
  });
  if (error || !data?.[0]) throw new ExperienceFailure(503, 'unavailable');
  return true;
}
