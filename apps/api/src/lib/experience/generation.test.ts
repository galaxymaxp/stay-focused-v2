import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
const mocks = vi.hoisted(() => ({ list: vi.fn(), prepare: vi.fn(), structure: vi.fn(), preview: vi.fn(), validate: vi.fn(), gate: vi.fn(), snapshot: vi.fn(), existing: vi.fn(), source: vi.fn(), create: vi.fn(), schedule: vi.fn() }));
vi.mock('@/lib/canvas-reviewer-sources', () => ({ listCanvasReviewerSources: mocks.list, prepareCanvasReviewerSources: mocks.prepare, structureCanvasReviewerSources: mocks.structure, previewSelectiveCanvasReviewerSources: mocks.preview }));
vi.mock('@/lib/reviewer-source-provenance', () => ({ validateCanvasPreviewSessionForGeneration: mocks.validate, createOrReuseReviewerSourceSnapshot: mocks.snapshot }));
vi.mock('@/lib/canvas-reviewer-generation-gate', () => ({ validateCanvasReviewerGenerationGate: mocks.gate }));
vi.mock('@/lib/processing-jobs/repository', () => ({ findProcessingJobByIdempotencyKey: mocks.existing, findProcessingJobSource: mocks.source }));
vi.mock('@/lib/processing-jobs/creation', () => ({ createReviewerProcessingJob: mocks.create, validateIdempotencyKey: (key: string | null) => { if (!key || key.length < 8) throw new Error('bad key'); return key; }, ProcessingJobCreationError: class extends Error {} }));
vi.mock('@/lib/processing-jobs/background-dispatch', () => ({ scheduleAcceptedProcessingJobDispatch: mocks.schedule }));
import { startReviewerGeneration } from './generation';
const client = {} as SupabaseClient<Database>;
const input = { courseId: 'course', materialId: 'file:material' };
const job = { id: 'job', user_id: 'owner', job_type: 'reviewer_generation', status: 'queued' };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.existing.mockResolvedValue(null);
  mocks.list.mockResolvedValue({ ok: true, value: { sources: [{ id: input.materialId, capability: 'ready', availability: 'available' }], pagination: { hasMore: false } } });
  mocks.structure.mockResolvedValue({ ok: true, value: { structureSessionId: 'structure', sources: [{ blocks: [{ id: 'a', selectedByDefault: true }, { id: 'b', selectedByDefault: false }] }] } });
  mocks.preview.mockResolvedValue({ ok: true, value: { sourceText: 'Accepted source', suggestedTitle: 'Cells', previewSessionId: 'preview', resolutionFingerprint: 'fingerprint' } });
  mocks.validate.mockResolvedValue({ ok: true, value: { row: { user_id: 'owner' } } });
  mocks.gate.mockResolvedValue({ ok: true });
  mocks.snapshot.mockResolvedValue({ ok: true, value: { sourceSnapshotId: 'snapshot' } });
  mocks.create.mockResolvedValue(job);
  mocks.source.mockResolvedValue({ metadata: { canvasCourseId: input.courseId, canvasItemIds: [input.materialId] } });
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
  it('durably accepts a ready PDF reference before OCR or source assembly', async () => {
    mocks.list.mockResolvedValue({ ok: true, value: { sources: [{ id: input.materialId, title: 'Scanned notes.pdf', capability: 'ready', availability: 'available', file: { kind: 'pdf', preparationStatus: 'ready' } }], pagination: { hasMore: false } } });
    expect(await startReviewerGeneration(client, 'owner', input, 'request-key')).toEqual(job);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'owner',
      source: expect.objectContaining({
        sourceText: 'canvas-source-reference:course:file:material',
        sourceTitle: 'Scanned notes.pdf',
        sourcePrivateMetadata: expect.objectContaining({
          canvasCourseId: 'course',
          canvasDeferredResolutionVersion: 'canvas-reviewer-source-v1',
          canvasItemIds: [input.materialId],
        }),
      }),
    }));
    expect(mocks.structure).not.toHaveBeenCalled();
    expect(mocks.preview).not.toHaveBeenCalled();
    expect(mocks.schedule).toHaveBeenCalledWith(job);
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
