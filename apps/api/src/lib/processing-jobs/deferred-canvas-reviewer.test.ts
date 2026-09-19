import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database, ProcessingJobDatabaseRow } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';

const mocks = vi.hoisted(() => ({
  source: vi.fn(),
  checkpoint: vi.fn(),
  writeCheckpoint: vi.fn(),
  progress: vi.fn(),
  structure: vi.fn(),
  preview: vi.fn(),
  validate: vi.fn(),
  gate: vi.fn(),
  snapshot: vi.fn(),
}));
vi.mock('./repository', () => ({ findProcessingJobSource: mocks.source }));
vi.mock('./workflow-repository', () => ({ readProcessingJobCheckpoint: mocks.checkpoint, writeProcessingJobCheckpoint: mocks.writeCheckpoint }));
vi.mock('./worker-repository', () => ({ updateProcessingJobProgress: mocks.progress }));
vi.mock('@/lib/canvas-reviewer-sources', () => ({ structureCanvasReviewerSources: mocks.structure, previewSelectiveCanvasReviewerSources: mocks.preview }));
vi.mock('@/lib/reviewer-source-provenance', () => ({ validateCanvasPreviewSessionForGeneration: mocks.validate, createOrReuseReviewerSourceSnapshot: mocks.snapshot }));
vi.mock('@/lib/canvas-reviewer-generation-gate', () => ({ validateCanvasReviewerGenerationGate: mocks.gate }));

import { prepareDeferredCanvasReviewerSource } from './deferred-canvas-reviewer';

const job = { id: 'job-1', user_id: 'owner' } as ProcessingJobDatabaseRow;
const rpc = vi.fn();
const client = { rpc } as unknown as SupabaseClient<Database>;

beforeEach(() => {
  vi.resetAllMocks();
  mocks.source.mockResolvedValue({ metadata: { canvasDeferredResolutionVersion: 'canvas-reviewer-source-v1', canvasCourseId: 'course', canvasItemIds: ['file:material'] } });
  mocks.checkpoint.mockResolvedValue(null);
  mocks.structure.mockResolvedValue({ ok: true, value: { structureSessionId: 'structure', selectedByDefaultCount: 2, sources: [{ pageCount: 2, blocks: [{ id: 'page-1', pageNumber: 1, selectedByDefault: true }, { id: 'page-2', pageNumber: 2, selectedByDefault: true }] }] } });
  mocks.preview.mockResolvedValue({ ok: true, value: { previewSessionId: 'preview', resolutionFingerprint: 'fingerprint', sourceText: 'Page one\n\nPage two', suggestedTitle: 'Reviewer', selectedBlockCount: 2 } });
  mocks.validate.mockResolvedValue({ ok: true, value: { row: { user_id: 'owner' } } });
  mocks.gate.mockResolvedValue({ ok: true });
  mocks.snapshot.mockResolvedValue({ ok: true, value: { sourceSnapshotId: 'snapshot' } });
  rpc.mockResolvedValue({ data: [job], error: null });
});

describe('deferred Canvas reviewer source preparation', () => {
  it('resolves complete ordered pages and atomically attaches the source before generation', async () => {
    await expect(prepareDeferredCanvasReviewerSource({ client, job, workerId: 'worker' })).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith('attach_deferred_canvas_reviewer_source_v1', expect.objectContaining({
      p_job_id: job.id,
      p_worker_id: 'worker',
      p_source_text: 'Page one\n\nPage two',
      p_source_metadata: expect.objectContaining({
        canvasCourseId: 'course',
        canvasItemIds: ['file:material'],
        canvasResolvedInWorkflowVersion: 'canvas-reviewer-source-v1',
        reviewerSourceSnapshotId: 'snapshot',
      }),
    }));
    expect(mocks.writeCheckpoint).toHaveBeenCalledWith(client, expect.objectContaining({ jobId: job.id, checkpointKey: 'reviewer:canvas-source:prepared' }));
  });

  it('does not attach or generate from an incomplete extraction', async () => {
    mocks.structure.mockResolvedValue({ ok: false, status: 409, code: 'canvas_source_unavailable' });
    await expect(prepareDeferredCanvasReviewerSource({ client, job, workerId: 'worker' })).rejects.toMatchObject({ status: 409 });
    expect(rpc).not.toHaveBeenCalled();
    expect(mocks.preview).not.toHaveBeenCalled();
  });

  it('leaves ordinary reviewer jobs unchanged', async () => {
    mocks.source.mockResolvedValue({ metadata: {} });
    await expect(prepareDeferredCanvasReviewerSource({ client, job, workerId: 'worker' })).resolves.toBe(false);
    expect(mocks.structure).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});
