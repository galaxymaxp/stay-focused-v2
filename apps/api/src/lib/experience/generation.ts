import type { CanvasCourseRow, CanvasPageRow, Database, ProcessingJobDatabaseRow } from '@stay-focused/db';
import type { CanvasFileRow } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { listCanvasReviewerSources, prepareCanvasReviewerSources, structureCanvasReviewerSources, previewSelectiveCanvasReviewerSources } from '@/lib/canvas-reviewer-sources';
import { classifyStoredCanvasFileKind, isPreparedCanvasFileReadyForOcr } from '@/lib/canvas-stored-file-extraction';
import { validateCanvasReviewerGenerationGate } from '@/lib/canvas-reviewer-generation-gate';
import { createOrReuseReviewerSourceSnapshot, validateCanvasPreviewSessionForGeneration } from '@/lib/reviewer-source-provenance';
import { createDeferredCanvasReviewerProcessingJob, createReviewerProcessingJob, validateIdempotencyKey, ProcessingJobCreationError } from '@/lib/processing-jobs/creation';
import { findProcessingJobByIdempotencyKey, findProcessingJobSource } from '@/lib/processing-jobs/repository';
import { scheduleAcceptedProcessingJobDispatch } from '@/lib/processing-jobs/background-dispatch';
import { DEFERRED_CANVAS_REVIEWER_VERSION } from '@/lib/processing-jobs/deferred-canvas-reviewer-contract';
import { normalizeCanvasHtmlToText } from '@/lib/canvas-content-normalization';
import { resolveInstructionalPageAttachments } from './canvas-page-attachments';
import { ExperienceFailure } from './errors';
import { record } from './mappers';

export interface StartReviewerGeneration { readonly courseId: string; readonly materialId: string }
export async function startReviewerGeneration(client: SupabaseClient<Database>, userId: string, input: StartReviewerGeneration, requestKey: string | null, dependencies: {
  readonly schedule?: typeof scheduleAcceptedProcessingJobDispatch;
} = {}): Promise<ProcessingJobDatabaseRow> {
  const schedule = dependencies.schedule ?? scheduleAcceptedProcessingJobDispatch;
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
    if (existing.user_id !== userId || existing.job_type !== 'reviewer_generation' || metadata.canvasCourseId !== input.courseId || !Array.isArray(metadata.canvasItemIds) || metadata.canvasItemIds[0] !== input.materialId) throw new ExperienceFailure(409, 'conflict');
    schedule(existing);
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
  const sourceIds = [input.materialId];
  let attachedPdfId: string | null = null;
  let hasAttachment = false;
  if (descriptor.type === 'page') {
    const { page, course } = await readOwnedPageAndCourse(client, userId, input.courseId, input.materialId);
    const attachments = await resolveInstructionalPageAttachments({ client, course, page, userId });
    if (attachments.length) {
      hasAttachment = true;
      const fileId = `file:${attachments[0]!.id}`;
      const prepared = await prepareCanvasReviewerSources({ client, userId, courseId: input.courseId, sourceIds: [fileId] });
      if (!prepared.ok || !prepared.value.results.every(result => result.status === 'ready'))
        throw new ExperienceFailure(409, 'source_attachment_unavailable');
      sourceIds.push(fileId);
      if (classifyStoredCanvasFileKind(attachments[0]!) === 'pdf') attachedPdfId = fileId;
    } else if (!isSubstantivePageText(normalizeCanvasHtmlToText(page.body_html))) {
      throw new ExperienceFailure(422, 'insufficient_source');
    }
  }
  if (descriptor.capability === 'needs_preparation' && descriptor.file?.canPrepare) {
    const prepared = await prepareCanvasReviewerSources({ client, userId, courseId: input.courseId, sourceIds: [input.materialId] });
    if (!prepared.ok || !prepared.value.results.every(r => r.status === 'ready')) throw new ExperienceFailure(409, 'not_ready');
  } else if (descriptor.capability !== 'ready' || descriptor.availability !== 'available') {
    throw new ExperienceFailure(409, 'not_ready');
  }
  if ((descriptor.file?.kind === 'pdf' && descriptor.file.preparationStatus === 'ready') || attachedPdfId) {
    try {
      const fileRow = await readOwnedPreparedPdf(client, userId, input.courseId, attachedPdfId ?? input.materialId);
      const job = await createDeferredCanvasReviewerProcessingJob({ client, userId, idempotencyKey: key, source: {
        byteSize: fileRow.stored_byte_count!,
        canvasFileRowId: fileRow.id,
        contentSha256: fileRow.current_sha256!,
        displayName: descriptor.title,
        sourcePrivateMetadata: {
          canvasCourseId: input.courseId,
          canvasDeferredResolutionVersion: DEFERRED_CANVAS_REVIEWER_VERSION,
          canvasItemIds: sourceIds,
        },
      } });
      const storedSource = await findProcessingJobSource(client, job);
      const metadata = record(storedSource.metadata);
      if (job.user_id !== userId || job.job_type !== 'reviewer_generation' || metadata.canvasCourseId !== input.courseId || !Array.isArray(metadata.canvasItemIds) || metadata.canvasItemIds[0] !== input.materialId) throw new ExperienceFailure(409, 'conflict');
      logGenerationAdmissionMemory('deferred_job_created', { jobCount: 1 });
      schedule(job);
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
  const structure = await structureCanvasReviewerSources({ client, userId, courseId: input.courseId, sourceIds });
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
  if (hasAttachment && (preview.value.sourceText.trim().length < 80 || preview.value.sourceText.trim().split(/\s+/).length < 8))
    throw new ExperienceFailure(422, 'insufficient_source');
  logGenerationAdmissionMemory('preview_created', {
    sourceCharacterCount: preview.value.sourceText.length,
    selectedBlockCount: preview.value.selectedBlockCount ?? selectedBlockIds.length,
  });
  const accepted = await validateCanvasPreviewSessionForGeneration({ client, userId, previewSessionId: preview.value.previewSessionId });
  if (!accepted.ok || !accepted.value) throw new ExperienceFailure(409, 'not_ready');
  const gate = await validateCanvasReviewerGenerationGate({ client, userId, courseId: input.courseId, itemIds: sourceIds, previewSession: accepted.value, resolutionFingerprint: preview.value.resolutionFingerprint });
  if (!gate.ok) throw new ExperienceFailure(409, 'not_ready');
  const snapshot = await createOrReuseReviewerSourceSnapshot({ client, userId, previewSession: accepted.value, sourceText: preview.value.sourceText, sourceTitle: preview.value.suggestedTitle });
  if (!snapshot.ok) throw new ExperienceFailure(503, 'unavailable');
  try {
    const job = await createReviewerProcessingJob({ client, userId, idempotencyKey: key, source: {
      sourceText: preview.value.sourceText, sourceTitle: preview.value.suggestedTitle,
      sourcePrivateMetadata: { canvasPreviewSessionId: preview.value.previewSessionId, canvasCourseId: input.courseId, canvasItemIds: sourceIds, canvasResolutionFingerprint: preview.value.resolutionFingerprint, reviewerSourceSnapshotId: snapshot.value.sourceSnapshotId },
    } });
    // The canonical creator may return a concurrently admitted job. Check its
    // source identity too, even when two materials have identical text/title.
    if (job.user_id !== userId || job.job_type !== 'reviewer_generation') throw new ExperienceFailure(409, 'conflict');
    const storedSource = await findProcessingJobSource(client, job);
    const metadata = record(storedSource.metadata);
    if (metadata.canvasCourseId !== input.courseId || !Array.isArray(metadata.canvasItemIds) || metadata.canvasItemIds[0] !== input.materialId) throw new ExperienceFailure(409, 'conflict');
    logGenerationAdmissionMemory('job_created', { jobCount: 1 });
    schedule(job);
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

function isSubstantivePageText(text: string): boolean {
  return !!text.trim() && !/^[\s\w.()\-]+\.(?:pdf|pptx|docx|png|jpe?g)$/i.test(text.trim());
}

async function readOwnedPageAndCourse(client: SupabaseClient<Database>, userId: string, courseId: string, materialId: string): Promise<{ page: CanvasPageRow; course: CanvasCourseRow }> {
  const match = /^page:([0-9a-f-]{36})$/i.exec(materialId);
  if (!match) throw new ExperienceFailure(404, 'not_found');
  const [pageResult, courseResult] = await Promise.all([
    client.from('canvas_pages').select('*').eq('id', match[1]!).eq('user_id', userId).eq('course_id', courseId).maybeSingle(),
    client.from('canvas_courses').select('*').eq('id', courseId).eq('user_id', userId).maybeSingle(),
  ]);
  if (pageResult.error || courseResult.error) throw new ExperienceFailure(503, 'unavailable');
  if (!pageResult.data || !courseResult.data) throw new ExperienceFailure(404, 'not_found');
  return { page: pageResult.data as CanvasPageRow, course: courseResult.data as CanvasCourseRow };
}

async function readOwnedPreparedPdf(
  client: SupabaseClient<Database>,
  userId: string,
  courseId: string,
  materialId: string,
): Promise<CanvasFileRow> {
  const match = /^file:([0-9a-f-]{36})$/i.exec(materialId);
  if (!match?.[1]) throw new ExperienceFailure(404, 'not_found');
  const { data, error } = await client
    .from('canvas_files')
    .select('*')
    .eq('id', match[1])
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();
  const file = data as CanvasFileRow | null;
  if (error) throw new ExperienceFailure(503, 'unavailable');
  if (!file) throw new ExperienceFailure(404, 'not_found');
  if (
    classifyStoredCanvasFileKind(file) !== 'pdf' ||
    !isPreparedCanvasFileReadyForOcr(file) ||
    !file.storage_bucket ||
    !file.storage_object_key ||
    !file.current_sha256 ||
    typeof file.stored_byte_count !== 'number'
  ) {
    throw new ExperienceFailure(409, 'not_ready');
  }
  return file;
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
