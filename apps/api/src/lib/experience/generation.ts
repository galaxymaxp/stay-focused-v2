import type { Database, ProcessingJobDatabaseRow } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { listCanvasReviewerSources, prepareCanvasReviewerSources, structureCanvasReviewerSources, previewSelectiveCanvasReviewerSources } from '@/lib/canvas-reviewer-sources';
import { validateCanvasReviewerGenerationGate } from '@/lib/canvas-reviewer-generation-gate';
import { createOrReuseReviewerSourceSnapshot, validateCanvasPreviewSessionForGeneration } from '@/lib/reviewer-source-provenance';
import { createReviewerProcessingJob, validateIdempotencyKey, ProcessingJobCreationError } from '@/lib/processing-jobs/creation';
import { findProcessingJobByIdempotencyKey, findProcessingJobSource } from '@/lib/processing-jobs/repository';
import { scheduleAcceptedProcessingJobDispatch } from '@/lib/processing-jobs/background-dispatch';
import { DEFERRED_CANVAS_REVIEWER_VERSION } from '@/lib/processing-jobs/deferred-canvas-reviewer-contract';
import { ExperienceFailure } from './errors';
import { record } from './mappers';

export interface StartReviewerGeneration { readonly courseId: string; readonly materialId: string }
export async function startReviewerGeneration(client: SupabaseClient<Database>, userId: string, input: StartReviewerGeneration, requestKey: string | null): Promise<ProcessingJobDatabaseRow> {
  logGenerationAdmissionMemory('request_started', { sourceCount: 1 });
  let key: string;
  try { key = validateIdempotencyKey(requestKey); } catch { throw new ExperienceFailure(400, 'invalid_request'); }
  // Reconnect accepted work before preparing the source again. Material identity
  // is checked against owner-scoped private metadata, never trusted from the UI.
  const existing = await findProcessingJobByIdempotencyKey(client, userId, key);
  if (existing) {
    if (existing.user_id !== userId || existing.job_type !== 'reviewer_generation') throw new ExperienceFailure(409, 'conflict');
    const source = await findProcessingJobSource(client, existing);
    const metadata = record(source.metadata);
    if (existing.user_id !== userId || existing.job_type !== 'reviewer_generation' || metadata.canvasCourseId !== input.courseId || !Array.isArray(metadata.canvasItemIds) || metadata.canvasItemIds.length !== 1 || metadata.canvasItemIds[0] !== input.materialId) throw new ExperienceFailure(409, 'conflict');
    scheduleAcceptedProcessingJobDispatch(existing);
    logGenerationAdmissionMemory('existing_job_dispatch_scheduled', { jobCount: 1 });
    return existing;
  }
  let descriptor;
  for (let offset = 0; offset <= 1000; offset += 100) {
    const sources = await listCanvasReviewerSources({ client, userId, courseId: input.courseId, limit: 100, offset });
    if (!sources.ok) throw new ExperienceFailure(sources.status === 404 ? 404 : 503, sources.status === 404 ? 'not_found' : 'unavailable');
    descriptor = sources.value.sources.find(s => s.id === input.materialId);
    if (descriptor || !sources.value.pagination.hasMore) break;
  }
  if (!descriptor) throw new ExperienceFailure(404, 'not_found');
  if (descriptor.capability === 'needs_preparation' && descriptor.file?.canPrepare) {
    const prepared = await prepareCanvasReviewerSources({ client, userId, courseId: input.courseId, sourceIds: [input.materialId] });
    if (!prepared.ok || !prepared.value.results.every(r => r.status === 'ready')) throw new ExperienceFailure(409, 'not_ready');
  } else if (descriptor.capability !== 'ready' || descriptor.availability !== 'available') {
    throw new ExperienceFailure(409, 'not_ready');
  }
  if (descriptor.file?.kind === 'pdf' && descriptor.file.preparationStatus === 'ready') {
    try {
      const job = await createReviewerProcessingJob({ client, userId, idempotencyKey: key, source: {
        sourceText: `canvas-source-reference:${input.courseId}:${input.materialId}`,
        sourceTitle: descriptor.title,
        sourcePrivateMetadata: {
          canvasCourseId: input.courseId,
          canvasDeferredResolutionVersion: DEFERRED_CANVAS_REVIEWER_VERSION,
          canvasItemIds: [input.materialId],
        },
      } });
      const storedSource = await findProcessingJobSource(client, job);
      const metadata = record(storedSource.metadata);
      if (job.user_id !== userId || job.job_type !== 'reviewer_generation' || metadata.canvasCourseId !== input.courseId || !Array.isArray(metadata.canvasItemIds) || metadata.canvasItemIds.length !== 1 || metadata.canvasItemIds[0] !== input.materialId) throw new ExperienceFailure(409, 'conflict');
      logGenerationAdmissionMemory('deferred_job_created', { jobCount: 1 });
      scheduleAcceptedProcessingJobDispatch(job);
      logGenerationAdmissionMemory('workflow_dispatch_scheduled', { jobCount: 1 });
      return job;
    } catch (error) {
      if (error instanceof ProcessingJobCreationError) {
        if (error.code === 'processing_job_idempotency_conflict') throw new ExperienceFailure(409, 'conflict');
        if (error.code.includes('limit_reached')) throw new ExperienceFailure(429, 'rate_limited');
      }
      throw error;
    }
  }
  const structure = await structureCanvasReviewerSources({ client, userId, courseId: input.courseId, sourceIds: [input.materialId] });
  if (!structure.ok) throw new ExperienceFailure(409, 'not_ready');
  const pageNumbers = [...new Set(structure.value.sources.flatMap(source => source.blocks.flatMap(block => block.pageNumber === undefined ? [] : [block.pageNumber])))].sort((left, right) => left - right);
  logGenerationAdmissionMemory('source_structured', {
    expectedPageCount: structure.value.sources.reduce((total, source) => total + (source.pageCount ?? 0), 0),
    accountedPageCount: pageNumbers.length,
    firstPageNumber: pageNumbers[0] ?? 0,
    lastPageNumber: pageNumbers.at(-1) ?? 0,
    selectedBlockCount: structure.value.selectedByDefaultCount,
  });
  console.info('experience_generation.page_accounting', {
    expectedPageCount: structure.value.sources.map(source => source.pageCount ?? null),
    accountedPageNumbers: pageNumbers,
  });
  const selectedBlockIds = structure.value.sources.flatMap(source => source.blocks.filter(block => block.selectedByDefault).map(block => block.id));
  const preview = await previewSelectiveCanvasReviewerSources({ client, userId, courseId: input.courseId, structureSessionId: structure.value.structureSessionId, selectedBlockIds });
  if (!preview.ok) throw new ExperienceFailure(409, 'not_ready');
  logGenerationAdmissionMemory('preview_created', {
    sourceCharacterCount: preview.value.sourceText.length,
    selectedBlockCount: preview.value.selectedBlockCount ?? selectedBlockIds.length,
  });
  const accepted = await validateCanvasPreviewSessionForGeneration({ client, userId, previewSessionId: preview.value.previewSessionId });
  if (!accepted.ok || !accepted.value) throw new ExperienceFailure(409, 'not_ready');
  const gate = await validateCanvasReviewerGenerationGate({ client, userId, courseId: input.courseId, itemIds: [input.materialId], previewSession: accepted.value, resolutionFingerprint: preview.value.resolutionFingerprint });
  if (!gate.ok) throw new ExperienceFailure(409, 'not_ready');
  const snapshot = await createOrReuseReviewerSourceSnapshot({ client, userId, previewSession: accepted.value, sourceText: preview.value.sourceText, sourceTitle: preview.value.suggestedTitle });
  if (!snapshot.ok) throw new ExperienceFailure(503, 'unavailable');
  try {
    const job = await createReviewerProcessingJob({ client, userId, idempotencyKey: key, source: {
      sourceText: preview.value.sourceText, sourceTitle: preview.value.suggestedTitle,
      sourcePrivateMetadata: { canvasPreviewSessionId: preview.value.previewSessionId, canvasCourseId: input.courseId, canvasItemIds: [input.materialId], canvasResolutionFingerprint: preview.value.resolutionFingerprint, reviewerSourceSnapshotId: snapshot.value.sourceSnapshotId },
    } });
    // The canonical creator may return a concurrently admitted job. Check its
    // source identity too, even when two materials have identical text/title.
    if (job.user_id !== userId || job.job_type !== 'reviewer_generation') throw new ExperienceFailure(409, 'conflict');
    const storedSource = await findProcessingJobSource(client, job);
    const metadata = record(storedSource.metadata);
    if (metadata.canvasCourseId !== input.courseId || !Array.isArray(metadata.canvasItemIds) || metadata.canvasItemIds.length !== 1 || metadata.canvasItemIds[0] !== input.materialId) throw new ExperienceFailure(409, 'conflict');
    logGenerationAdmissionMemory('job_created', { jobCount: 1 });
    scheduleAcceptedProcessingJobDispatch(job);
    logGenerationAdmissionMemory('workflow_dispatch_scheduled', { jobCount: 1 });
    return job;
  } catch (error) {
    if (error instanceof ProcessingJobCreationError) {
      if (error.code === 'processing_job_idempotency_conflict') throw new ExperienceFailure(409, 'conflict');
      if (error.code.includes('limit_reached')) throw new ExperienceFailure(429, 'rate_limited');
    }
    throw error;
  }
}

function logGenerationAdmissionMemory(
  stage: string,
  fields: Readonly<Record<string, number>>,
): void {
  const memory = process.memoryUsage();
  console.info('experience_generation.memory', {
    stage,
    rssBytes: memory.rss,
    heapUsedBytes: memory.heapUsed,
    externalBytes: memory.external,
    arrayBufferBytes: memory.arrayBuffers,
    ...fields,
  });
}
