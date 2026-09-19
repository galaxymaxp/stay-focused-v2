import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database, ProcessingJobDatabaseRow } from '@stay-focused/db';
import type { OcrPage } from '@stay-focused/ocr';
import type { SupabaseClient } from '@supabase/supabase-js';

const mocks = vi.hoisted(() => ({
  source: vi.fn(), checkpoint: vi.fn(), writeCheckpoint: vi.fn(), progress: vi.fn(),
  preview: vi.fn(), validate: vi.fn(), gate: vi.fn(), snapshot: vi.fn(), readFile: vi.fn(),
}));
vi.mock('./repository', () => ({ findProcessingJobSource: mocks.source }));
vi.mock('./workflow-repository', () => ({ readProcessingJobCheckpoint: mocks.checkpoint, writeProcessingJobCheckpoint: mocks.writeCheckpoint }));
vi.mock('./worker-repository', () => ({ updateProcessingJobProgress: mocks.progress }));
vi.mock('@/lib/reviewer-source-provenance', async (load) => {
  const actual = await load<typeof import('@/lib/reviewer-source-provenance')>();
  return { ...actual, createCanvasSourcePreviewSession: mocks.preview, validateCanvasPreviewSessionForGeneration: mocks.validate, createOrReuseReviewerSourceSnapshot: mocks.snapshot };
});
vi.mock('@/lib/canvas-reviewer-generation-gate', () => ({ validateCanvasReviewerGenerationGate: mocks.gate }));

import { isDeferredCanvasReviewerJob, prepareDeferredCanvasReviewerSource } from './deferred-canvas-reviewer';

const fileId = '00000000-0000-4000-8000-000000000001';
const job = { id: 'job-1', user_id: 'owner' } as ProcessingJobDatabaseRow;
const rpc = vi.fn();
const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: mocks.readFile };
query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
const from = vi.fn(() => query);
const client = { rpc, from } as unknown as SupabaseClient<Database>;
const pages: readonly OcrPage[] = [page(1, 'Page one'), page(2, 'Page two')];

beforeEach(() => {
  vi.resetAllMocks();
  from.mockReturnValue(query);
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
  mocks.source.mockResolvedValue({ metadata: { canvasDeferredResolutionVersion: 'canvas-reviewer-source-v1', canvasCourseId: 'course', canvasItemIds: [`file:${fileId}`] } });
  mocks.checkpoint.mockResolvedValue(null);
  mocks.readFile.mockResolvedValue({ data: {
    id: fileId, user_id: 'owner', course_id: 'course', canvas_connection_id: 'connection', canvas_course_id: '101', canvas_file_id: '42',
    display_name: 'Scanned notes.pdf', content_type: 'application/pdf', stored_content_type: 'application/pdf', stored_byte_count: 100,
    storage_bucket: 'canvas-source-files', storage_object_key: 'private/source.pdf', current_sha256: 'a'.repeat(64),
    availability_status: 'available', ingestion_status: 'stored', ingestion_eligibility: 'eligible_document', last_synced_at: '2026-09-19T00:00:00Z',
  }, error: null });
  mocks.preview.mockResolvedValue({ ok: true, value: { previewSessionId: 'preview', resolutionFingerprint: 'fingerprint' } });
  mocks.validate.mockResolvedValue({ ok: true, value: { row: { user_id: 'owner' } } });
  mocks.gate.mockResolvedValue({ ok: true });
  mocks.snapshot.mockResolvedValue({ ok: true, value: { sourceSnapshotId: 'snapshot' } });
  rpc.mockResolvedValue({ data: [job], error: null });
});

describe('deferred Canvas reviewer source preparation', () => {
  it('preserves complete ordered page provenance and atomically attaches text before generation', async () => {
    await expect(prepareDeferredCanvasReviewerSource({ client, job, normalizedText: 'Page one\n\nPage two', pages, workerId: 'worker' })).resolves.toBe(true);
    expect(mocks.preview).toHaveBeenCalledWith(expect.objectContaining({
      manifest: [expect.objectContaining({ page_count: 2, source_row_id: fileId, stored_content_sha256: 'a'.repeat(64) })],
      selectedBlockManifest: [
        expect.objectContaining({ page_number: 1, block_text: 'Page one' }),
        expect.objectContaining({ page_number: 2, block_text: 'Page two' }),
      ],
    }));
    expect(rpc).toHaveBeenCalledWith('attach_deferred_canvas_reviewer_source_v1', expect.objectContaining({
      p_job_id: job.id,
      p_worker_id: 'worker',
      p_source_text: 'Page one\n\nPage two',
      p_source_metadata: expect.objectContaining({
        canvasCourseId: 'course', canvasItemIds: [`file:${fileId}`],
        canvasResolvedInWorkflowVersion: 'canvas-reviewer-source-v1', reviewerSourceSnapshotId: 'snapshot',
        reviewerSourceBlocks: [
          expect.objectContaining({ pageNumber: 1, text: 'Page one' }),
          expect.objectContaining({ pageNumber: 2, text: 'Page two' }),
        ],
      }),
    }));
    expect(mocks.writeCheckpoint).toHaveBeenCalledWith(client, expect.objectContaining({ jobId: job.id, checkpointKey: 'reviewer:canvas-source:prepared' }));
  });

  it('does not attach or generate from incomplete or misordered extraction', async () => {
    await expect(prepareDeferredCanvasReviewerSource({ client, job, normalizedText: 'Only page two', pages: [page(2, 'Only page two')], workerId: 'worker' })).rejects.toMatchObject({ status: 409 });
    expect(rpc).not.toHaveBeenCalled();
    expect(mocks.preview).not.toHaveBeenCalled();
  });

  it('identifies ordinary reviewer jobs without source work', async () => {
    mocks.source.mockResolvedValue({ metadata: {} });
    await expect(isDeferredCanvasReviewerJob({ client, job })).resolves.toBe(false);
    expect(mocks.preview).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});

function page(pageNumber: number, text: string): OcrPage {
  return { pageNumber, text, status: 'text_extracted', method: 'ocr', blocks: [] };
}
