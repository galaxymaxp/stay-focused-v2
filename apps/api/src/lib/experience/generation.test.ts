import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
const mocks = vi.hoisted(() => ({ list: vi.fn(), prepare: vi.fn(), structure: vi.fn(), preview: vi.fn(), validate: vi.fn(), gate: vi.fn(), snapshot: vi.fn(), existing: vi.fn(), source: vi.fn(), create: vi.fn(), createDeferred: vi.fn(), readFile: vi.fn(), attachments: vi.fn(), schedule: vi.fn() }));
vi.mock('@/lib/canvas-reviewer-sources', () => ({ listCanvasReviewerSources: mocks.list, prepareCanvasReviewerSources: mocks.prepare, structureCanvasReviewerSources: mocks.structure, previewSelectiveCanvasReviewerSources: mocks.preview }));
vi.mock('@/lib/reviewer-source-provenance', async (load) => ({
  ...await load<typeof import('@/lib/reviewer-source-provenance')>(),
  validateCanvasPreviewSessionForGeneration: mocks.validate,
  createOrReuseReviewerSourceSnapshot: mocks.snapshot,
}));
vi.mock('@/lib/canvas-reviewer-generation-gate', () => ({ validateCanvasReviewerGenerationGate: mocks.gate }));
vi.mock('@/lib/processing-jobs/repository', () => ({ findProcessingJobByIdempotencyKey: mocks.existing, findProcessingJobSource: mocks.source }));
vi.mock('@/lib/processing-jobs/creation', () => ({ createDeferredCanvasReviewerProcessingJob: mocks.createDeferred, createReviewerProcessingJob: mocks.create, validateIdempotencyKey: (key: string | null) => { if (!key || key.length < 8) throw new Error('bad key'); return key; }, ProcessingJobCreationError: class extends Error {} }));
vi.mock('@/lib/processing-jobs/background-dispatch', () => ({ scheduleAcceptedProcessingJobDispatch: mocks.schedule }));
vi.mock('./canvas-page-attachments', () => ({ resolveInstructionalPageAttachments: mocks.attachments }));
import { startReviewerGeneration } from './generation';
const fileRowId = '00000000-0000-4000-8000-000000000001';
const pageRowId = '00000000-0000-4000-8000-000000000002';
const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: mocks.readFile };
query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
const from = vi.fn(() => query);
const client = { from } as unknown as SupabaseClient<Database>;
const input = { courseId: 'course', materialId: `file:${fileRowId}` };
const job = { id: 'job', user_id: 'owner', job_type: 'reviewer_generation', status: 'queued' };
beforeEach(() => {
  vi.resetAllMocks();
  from.mockReturnValue(query);
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
  mocks.existing.mockResolvedValue(null);
  mocks.list.mockResolvedValue({ ok: true, value: { sources: [{ id: input.materialId, capability: 'ready', availability: 'available' }], pagination: { hasMore: false } } });
  mocks.structure.mockResolvedValue({ ok: true, value: { structureSessionId: 'structure', sources: [{ blocks: [{ id: 'a', selectedByDefault: true }, { id: 'b', selectedByDefault: false }] }] } });
  mocks.preview.mockResolvedValue({ ok: true, value: { sourceText: 'Accepted source', suggestedTitle: 'Cells', previewSessionId: 'preview', resolutionFingerprint: 'fingerprint' } });
  mocks.validate.mockResolvedValue({ ok: true, value: { row: { user_id: 'owner' } } });
  mocks.gate.mockResolvedValue({ ok: true });
  mocks.snapshot.mockResolvedValue({ ok: true, value: { sourceSnapshotId: 'snapshot' } });
  mocks.create.mockResolvedValue(job);
  mocks.createDeferred.mockResolvedValue(job);
  mocks.readFile.mockResolvedValue({ data: {
    id: fileRowId, user_id: 'owner', course_id: 'course', canvas_connection_id: 'connection', canvas_course_id: 'canvas-course', canvas_file_id: '42',
    display_name: 'Scanned notes.pdf', content_type: 'application/pdf', stored_content_type: 'application/pdf', stored_byte_count: 8089877,
    storage_bucket: 'canvas-source-files', storage_object_key: `owner/${fileRowId}/source.pdf`, current_sha256: 'a'.repeat(64),
    availability_status: 'available', ingestion_status: 'stored', ingestion_eligibility: 'eligible_document', filename: 'source.pdf',
  }, error: null });
  mocks.source.mockResolvedValue({ metadata: { canvasCourseId: input.courseId, canvasItemIds: [input.materialId] } });
  mocks.attachments.mockResolvedValue([]);
});
describe('student Reviewer admission adapter', () => {
  it('reuses default block selection, source gate, snapshot and durable admission', async () => {
    expect(await startReviewerGeneration(client, 'owner', input, 'request-key')).toEqual(job);
    expect(mocks.preview).toHaveBeenCalledWith(expect.objectContaining({ selectedBlockIds: ['a'], userId: 'owner' }));
    expect(mocks.gate).toHaveBeenCalledWith(expect.objectContaining({ userId: 'owner', itemIds: [input.materialId], resolutionFingerprint: 'fingerprint' }));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'owner', source: expect.objectContaining({ sourceText: 'Accepted source', sourcePrivateMetadata: expect.objectContaining({ reviewerSourceSnapshotId: 'snapshot' }) }) }));
    expect(mocks.schedule).toHaveBeenCalledWith(job);
  });
  it('reconnects an accepted owner/material identity without preparing again', async () => {
    mocks.existing.mockResolvedValue(job);
    mocks.source.mockResolvedValue({ metadata: { canvasCourseId: 'course', canvasItemIds: [input.materialId] } });
    await startReviewerGeneration(client, 'owner', input, 'request-key');
    expect(mocks.list).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.schedule).toHaveBeenCalledWith(job);
  });
  it('rejects reuse for a different material', async () => {
    mocks.existing.mockResolvedValue(job);
    mocks.source.mockResolvedValue({ metadata: { canvasCourseId: 'course', canvasItemIds: ['file:other'] } });
    await expect(startReviewerGeneration(client, 'owner', input, 'request-key')).rejects.toMatchObject({ status: 409 });
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.schedule).not.toHaveBeenCalled();
  });
  it('denies a foreign course/material before generation', async () => {
    mocks.list.mockResolvedValue({ ok: false, status: 404 });
    await expect(startReviewerGeneration(client, 'owner', input, 'request-key')).rejects.toMatchObject({ status: 404 });
    expect(mocks.structure).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
  });
  it('preserves stale-source rejection', async () => {
    mocks.gate.mockResolvedValue({ ok: false, status: 409 });
    await expect(startReviewerGeneration(client, 'owner', input, 'request-key')).rejects.toMatchObject({ code: 'not_ready' });
    expect(mocks.snapshot).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
  });
  it('rejects unsupported material without calling the engine', async () => {
    mocks.list.mockResolvedValue({ ok: true, value: { sources: [{ id: input.materialId, capability: 'unsupported' }], pagination: { hasMore: false } } });
    await expect(startReviewerGeneration(client, 'owner', input, 'request-key')).rejects.toMatchObject({ code: 'not_ready' });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('uses existing preparation when required', async () => {
    mocks.list.mockResolvedValue({ ok: true, value: { sources: [{ id: input.materialId, capability: 'needs_preparation', file: { canPrepare: true } }], pagination: { hasMore: false } } });
    mocks.prepare.mockResolvedValue({ ok: true, value: { results: [{ status: 'ready' }] } });
    await startReviewerGeneration(client, 'owner', input, 'request-key');
    expect(mocks.prepare).toHaveBeenCalledWith({ client, userId: 'owner', courseId: 'course', sourceIds: [input.materialId] });
  });
  it('stops before job creation when preparation fails', async () => {
    mocks.list.mockResolvedValue({ ok: true, value: { sources: [{ id: input.materialId, capability: 'needs_preparation', file: { canPrepare: true } }], pagination: { hasMore: false } } });
    mocks.prepare.mockResolvedValue({ ok: false, status: 503 });
    await expect(startReviewerGeneration(client, 'owner', input, 'request-key')).rejects.toMatchObject({ code: 'not_ready' });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.createDeferred).not.toHaveBeenCalled();
    expect(mocks.schedule).not.toHaveBeenCalled();
  });
  it('durably accepts a ready PDF reference before OCR or source assembly', async () => {
    mocks.list.mockResolvedValue({ ok: true, value: { sources: [{ id: input.materialId, title: 'Scanned notes.pdf', capability: 'ready', availability: 'available', file: { kind: 'pdf', preparationStatus: 'ready' } }], pagination: { hasMore: false } } });
    expect(await startReviewerGeneration(client, 'owner', input, 'request-key')).toEqual(job);
    expect(mocks.createDeferred).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'owner',
      source: expect.objectContaining({
        byteSize: 8089877,
        canvasFileRowId: fileRowId,
        contentSha256: 'a'.repeat(64),
        displayName: 'Scanned notes.pdf',
        sourcePrivateMetadata: expect.objectContaining({
          canvasCourseId: 'course',
          canvasDeferredResolutionVersion: 'canvas-reviewer-source-v1',
          canvasItemIds: [input.materialId],
        }),
      }),
    }));
    expect(mocks.structure).not.toHaveBeenCalled();
    expect(mocks.preview).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.schedule).toHaveBeenCalledWith(job);
  });
  it('admits a Page with substantive body text without an attachment', async () => {
    const pageInput = { courseId: 'course', materialId: `page:${pageRowId}` };
    mocks.list.mockResolvedValue({ ok: true, value: { sources: [{ id: pageInput.materialId, type: 'page', capability: 'ready', availability: 'available' }], pagination: { hasMore: false } } });
    mocks.readFile.mockResolvedValueOnce({ data: { id: pageRowId, user_id: 'owner', course_id: 'course', canvas_connection_id: 'connection', body_html: '<p>HTML provides semantic structure for a web page.</p>' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'course', user_id: 'owner', canvas_connection_id: 'connection' }, error: null });
    mocks.source.mockResolvedValue({ metadata: { canvasCourseId: 'course', canvasItemIds: [pageInput.materialId] } });
    await startReviewerGeneration(client, 'owner', pageInput, 'request-key');
    expect(mocks.structure).toHaveBeenCalledWith(expect.objectContaining({ sourceIds: [pageInput.materialId] }));
    expect(mocks.create).toHaveBeenCalled();
  });
  it('includes a linked instructional PDF in a Page job before durable extraction', async () => {
    const pageInput = { courseId: 'course', materialId: `page:${pageRowId}` };
    mocks.list.mockResolvedValue({ ok: true, value: { sources: [{ id: pageInput.materialId, type: 'page', capability: 'ready', availability: 'available' }], pagination: { hasMore: false } } });
    const file = { id: fileRowId, user_id: 'owner', course_id: 'course', canvas_connection_id: 'connection', canvas_course_id: 'canvas-course', canvas_file_id: '42', display_name: 'Unit 3 Lesson 1.pdf', content_type: 'application/pdf', stored_content_type: 'application/pdf', stored_byte_count: 8089877, storage_bucket: 'canvas-source-files', storage_object_key: 'private/source.pdf', current_sha256: 'a'.repeat(64), availability_status: 'available', ingestion_status: 'stored', ingestion_eligibility: 'eligible_document' };
    mocks.readFile.mockResolvedValueOnce({ data: { id: pageRowId, user_id: 'owner', course_id: 'course', canvas_connection_id: 'connection', body_html: '<p>Unit 3 Lesson 1.pdf</p>' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'course', user_id: 'owner', canvas_connection_id: 'connection' }, error: null })
      .mockResolvedValueOnce({ data: file, error: null });
    mocks.attachments.mockResolvedValue([file]);
    mocks.prepare.mockResolvedValue({ ok: true, value: { results: [{ status: 'ready' }] } });
    mocks.source.mockResolvedValue({ metadata: { canvasCourseId: 'course', canvasItemIds: [pageInput.materialId, `file:${fileRowId}`] } });
    await startReviewerGeneration(client, 'owner', pageInput, 'request-key');
    expect(mocks.prepare).toHaveBeenCalledWith(expect.objectContaining({ pageAttachmentId: pageRowId, sourceIds: [`file:${fileRowId}`] }));
    expect(mocks.createDeferred).toHaveBeenCalledWith(expect.objectContaining({ source: expect.objectContaining({ sourcePrivateMetadata: expect.objectContaining({ canvasItemIds: [pageInput.materialId, `file:${fileRowId}`] }) }) }));
  });
  it('keeps all Page attachments in teacher order in one provenance snapshot', async () => {
    const pageInput = { courseId: 'course', materialId: `page:${pageRowId}` };
    const secondFileId = '00000000-0000-4000-8000-000000000003';
    const thirdFileId = '00000000-0000-4000-8000-000000000004';
    const orderedIds = [pageInput.materialId, `file:${fileRowId}`, `file:${secondFileId}`, `file:${thirdFileId}`];
    mocks.list.mockResolvedValue({ ok: true, value: { sources: [{ id: pageInput.materialId, type: 'page', capability: 'ready', availability: 'available' }], pagination: { hasMore: false } } });
    mocks.readFile.mockResolvedValueOnce({ data: { id: pageRowId, user_id: 'owner', course_id: 'course', canvas_connection_id: 'connection', body_html: '<p>Lesson slides</p>' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'course', user_id: 'owner', canvas_connection_id: 'connection' }, error: null });
    mocks.attachments.mockResolvedValue([
      { id: fileRowId, display_name: 'First.pptx' },
      { id: secondFileId, display_name: 'Second.pdf' },
      { id: thirdFileId, display_name: 'Third.pdf' },
    ]);
    mocks.preview.mockResolvedValue({ ok: true, value: { sourceText: 'The first lesson explains the core ideas, the second lesson extends them, and the third lesson provides applied examples for students.', suggestedTitle: 'Lesson slides', previewSessionId: 'preview', resolutionFingerprint: 'fingerprint' } });
    mocks.prepare.mockResolvedValue({ ok: true, value: { results: [{ status: 'ready' }] } });
    mocks.source.mockResolvedValue({ metadata: { canvasCourseId: 'course', canvasItemIds: orderedIds } });
    await startReviewerGeneration(client, 'owner', pageInput, 'request-key');
    expect(mocks.prepare).toHaveBeenCalledTimes(3);
    expect(mocks.structure).not.toHaveBeenCalled();
    expect(mocks.gate).not.toHaveBeenCalled();
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ source: expect.objectContaining({ sourcePrivateMetadata: expect.objectContaining({ canvasItemIds: orderedIds, canvasDeferredResolutionVersion: 'canvas-reviewer-source-v1' }) }) }));
    expect(mocks.createDeferred).not.toHaveBeenCalled();
    expect(mocks.schedule).toHaveBeenCalledTimes(1);
  });
  it('fails the whole Page bundle when any eligible attachment cannot prepare', async () => {
    const pageInput = { courseId: 'course', materialId: `page:${pageRowId}` };
    mocks.list.mockResolvedValue({ ok: true, value: { sources: [{ id: pageInput.materialId, type: 'page', capability: 'ready', availability: 'available' }], pagination: { hasMore: false } } });
    mocks.readFile.mockResolvedValueOnce({ data: { id: pageRowId, user_id: 'owner', course_id: 'course', canvas_connection_id: 'connection', body_html: '<p>Lesson slides</p>' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'course', user_id: 'owner', canvas_connection_id: 'connection' }, error: null });
    mocks.attachments.mockResolvedValue([{ id: fileRowId }, { id: '00000000-0000-4000-8000-000000000003' }]);
    mocks.prepare.mockResolvedValueOnce({ ok: true, value: { results: [{ status: 'ready' }] } })
      .mockResolvedValueOnce({ ok: true, value: { results: [{ status: 'failed' }] } });
    await expect(startReviewerGeneration(client, 'owner', pageInput, 'request-key')).rejects.toMatchObject({ code: 'source_attachment_unavailable' });
    expect(mocks.structure).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.schedule).not.toHaveBeenCalled();
  });
  it('rejects a filename-only Page when no instructional attachment is available', async () => {
    const pageInput = { courseId: 'course', materialId: `page:${pageRowId}` };
    mocks.list.mockResolvedValue({ ok: true, value: { sources: [{ id: pageInput.materialId, type: 'page', capability: 'ready', availability: 'available' }], pagination: { hasMore: false } } });
    mocks.readFile.mockResolvedValueOnce({ data: { id: pageRowId, user_id: 'owner', course_id: 'course', canvas_connection_id: 'connection', body_html: '<p>Unit 3 Lesson 1.pdf</p>' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'course', user_id: 'owner', canvas_connection_id: 'connection' }, error: null });
    await expect(startReviewerGeneration(client, 'owner', pageInput, 'request-key')).rejects.toMatchObject({ code: 'insufficient_source' });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('requires an idempotency key before doing any source work', async () => {
    await expect(startReviewerGeneration(client, 'owner', input, null)).rejects.toMatchObject({ status: 400 });
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it('rejects a concurrently accepted different material even with matching text', async () => {
    mocks.source.mockResolvedValue({ metadata: { canvasCourseId: input.courseId, canvasItemIds: ['file:other'] } });
    await expect(startReviewerGeneration(client, 'owner', input, 'request-key')).rejects.toMatchObject({ status: 409 });
    expect(mocks.schedule).not.toHaveBeenCalled();
  });
});
