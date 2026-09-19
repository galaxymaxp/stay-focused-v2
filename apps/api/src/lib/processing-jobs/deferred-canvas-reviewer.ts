import type { Database, Json, ProcessingJobDatabaseRow } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';

import { ExperienceFailure } from '@/lib/experience/errors';
import { record } from '@/lib/experience/mappers';
import { validateCanvasReviewerGenerationGate } from '@/lib/canvas-reviewer-generation-gate';
import { createOrReuseReviewerSourceSnapshot, validateCanvasPreviewSessionForGeneration } from '@/lib/reviewer-source-provenance';
import { findProcessingJobSource } from './repository';
import { readProcessingJobCheckpoint, writeProcessingJobCheckpoint } from './workflow-repository';
import { updateProcessingJobProgress } from './worker-repository';
import { DEFERRED_CANVAS_REVIEWER_VERSION } from './deferred-canvas-reviewer-contract';

const CHECKPOINT_KEY = 'reviewer:canvas-source:prepared';

export async function prepareDeferredCanvasReviewerSource({
  client,
  job,
  workerId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly job: ProcessingJobDatabaseRow;
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
  if (!courseId || itemIds.length !== 1) throw new ExperienceFailure(409, 'not_ready');

  await updateProcessingJobProgress(client, {
    jobId: job.id,
    workerId,
    stage: 'preparing_source',
    statusMessage: 'Reading your Canvas material',
  });
  const { previewSelectiveCanvasReviewerSources, structureCanvasReviewerSources } = await import('@/lib/canvas-reviewer-sources');
  const structure = await structureCanvasReviewerSources({
    client,
    userId: job.user_id,
    courseId,
    sourceIds: itemIds,
  });
  if (!structure.ok) throw new ExperienceFailure(409, 'not_ready');

  const pageNumbers = [...new Set(structure.value.sources.flatMap((structuredSource) =>
    structuredSource.blocks.flatMap((block) => block.pageNumber === undefined ? [] : [block.pageNumber]),
  ))].sort((left, right) => left - right);
  const expectedPageCount = structure.value.sources.reduce(
    (total, structuredSource) => total + (structuredSource.pageCount ?? 0),
    0,
  );
  console.info('deferred_canvas_reviewer.page_accounting', {
    jobId: job.id,
    expectedPageCount,
    accountedPageNumbers: pageNumbers,
    ordered: pageNumbers.every((pageNumber, index) => pageNumber === index + 1),
  });
  logMemory('source_structured', job.id, {
    expectedPageCount,
    accountedPageCount: pageNumbers.length,
    selectedBlockCount: structure.value.selectedByDefaultCount,
  });

  const selectedBlockIds = structure.value.sources.flatMap((structuredSource) =>
    structuredSource.blocks.filter((block) => block.selectedByDefault).map((block) => block.id),
  );
  const preview = await previewSelectiveCanvasReviewerSources({
    client,
    userId: job.user_id,
    courseId,
    structureSessionId: structure.value.structureSessionId,
    selectedBlockIds,
  });
  if (!preview.ok) throw new ExperienceFailure(409, 'not_ready');
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
    sourceText: preview.value.sourceText,
    sourceTitle: preview.value.suggestedTitle,
  });
  if (!snapshot.ok) throw new ExperienceFailure(503, 'unavailable');

  const resolvedMetadata = toJson({
    canvasCourseId: courseId,
    canvasItemIds: itemIds,
    canvasPreviewSessionId: preview.value.previewSessionId,
    canvasResolutionFingerprint: preview.value.resolutionFingerprint,
    canvasResolvedInWorkflowVersion: DEFERRED_CANVAS_REVIEWER_VERSION,
    reviewerSourceSnapshotId: snapshot.value.sourceSnapshotId,
    sourceTitle: preview.value.suggestedTitle,
  });
  const { data, error } = await client.rpc('attach_deferred_canvas_reviewer_source_v1', {
    p_job_id: job.id,
    p_worker_id: workerId,
    p_source_text: preview.value.sourceText,
    p_source_title: preview.value.suggestedTitle,
    p_source_metadata: resolvedMetadata,
  });
  if (error || !data?.[0]) throw new ExperienceFailure(503, 'unavailable');
  await writeProcessingJobCheckpoint(client, {
    jobId: job.id,
    checkpointKey: CHECKPOINT_KEY,
    payload: toJson({
      expectedPageCount,
      accountedPageNumbers: pageNumbers,
      sourceCharacterCount: preview.value.sourceText.length,
      preparedAt: new Date().toISOString(),
    }),
  });
  logMemory('source_attached', job.id, {
    expectedPageCount,
    accountedPageCount: pageNumbers.length,
    sourceCharacterCount: preview.value.sourceText.length,
  });
  return true;
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
