import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database, ProcessingJobDatabaseRow } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';

const mocks = vi.hoisted(() => ({
  source: vi.fn(), progress: vi.fn(), structure: vi.fn(), preview: vi.fn(),
  validate: vi.fn(), gate: vi.fn(), snapshot: vi.fn(),
}));
vi.mock('./repository', () => ({ findProcessingJobSource: mocks.source }));
vi.mock('./worker-repository', () => ({ updateProcessingJobProgress: mocks.progress }));
vi.mock('@/lib/canvas-reviewer-sources', () => ({
  structureCanvasReviewerSources: mocks.structure,
  previewSelectiveCanvasReviewerSources: mocks.preview,
}));
vi.mock('@/lib/canvas-reviewer-generation-gate', () => ({ validateCanvasReviewerGenerationGate: mocks.gate }));
vi.mock('@/lib/reviewer-source-provenance', () => ({
  validateCanvasPreviewSessionForGeneration: mocks.validate,
  createOrReuseReviewerSourceSnapshot: mocks.snapshot,
}));

import { prepareDeferredCanvasCompositeSource } from './deferred-canvas-composite';

const pageId = '00000000-0000-4000-8000-000000000001';
const fileA = '00000000-0000-4000-8000-000000000002';
const fileB = '00000000-0000-4000-8000-000000000003';
const courseId = '00000000-0000-4000-8000-000000000004';
const ids = [`page:${pageId}`, `file:${fileA}`, `file:${fileB}`];
const job = { id: 'job', user_id: 'owner' } as ProcessingJobDatabaseRow;
const rpc = vi.fn();
const pageQuery = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
const referenceQuery = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
for (const query of [pageQuery, referenceQuery]) {
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
}
const from = vi.fn((table: string) => table === 'canvas_pages' ? pageQuery : referenceQuery);
const client = { from, rpc } as unknown as SupabaseClient<Database>;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.source.mockResolvedValue({ source_kind: 'text', metadata: {
    canvasDeferredResolutionVersion: 'canvas-reviewer-source-v1', canvasCourseId: courseId, canvasItemIds: ids,
  } });
  pageQuery.maybeSingle.mockResolvedValue({ data: { id: pageId, title: 'Power Point Slides', canvas_connection_id: 'connection' }, error: null });
  referenceQuery.maybeSingle.mockResolvedValue({ data: { id: 'reference' }, error: null });
  mocks.structure.mockResolvedValue({ ok: true, value: { structureSessionId: 'structure', sources: ids.map((id, index) => ({
    id, blocks: [{ id: `block-${index}`, selectable: true, selectedByDefault: index !== 2 }],
  })) } });
  mocks.preview.mockResolvedValue({ ok: true, value: {
    previewSessionId: 'preview', resolutionFingerprint: 'fingerprint',
    sourceText: 'Page context and the complete instructional text of both lecture attachments are combined in source order.',
  } });
  mocks.validate.mockResolvedValue({ ok: true, value: { row: { selected_block_manifest: ids.map((_, index) => ({
    source_ordinal: index + 1, block_ordinal: 1, block_kind: 'paragraph', block_text: `Text ${index + 1}`,
  })) } } });
  mocks.gate.mockResolvedValue({ ok: true });
  mocks.snapshot.mockResolvedValue({ ok: true, value: { sourceSnapshotId: 'snapshot' } });
  rpc.mockResolvedValue({ data: [job], error: null });
});

describe('deferred composite Canvas Page preparation', () => {
  it('resolves all Page attachments as one ordered source with per-block provenance', async () => {
    await expect(prepareDeferredCanvasCompositeSource(client, job, 'worker')).resolves.toBe(true);
    expect(from.mock.calls.filter(([table]) => table === 'canvas_file_references')).toHaveLength(2);
    expect(mocks.structure).toHaveBeenCalledWith(expect.objectContaining({ sourceIds: ids, pageBundleSourceId: ids[0] }));
    expect(mocks.preview).toHaveBeenCalledWith(expect.objectContaining({ selectedBlockIds: ['block-0', 'block-1', 'block-2'] }));
    expect(mocks.gate).toHaveBeenCalledWith(expect.objectContaining({ itemIds: ids }));
    expect(rpc).toHaveBeenCalledWith('attach_deferred_canvas_reviewer_source_v1', expect.objectContaining({
      p_source_metadata: expect.objectContaining({
        canvasItemIds: ids, reviewerSourceSnapshotId: 'snapshot',
        reviewerSourceBlocks: [
          expect.objectContaining({ id: 'canvas-1-1', text: 'Text 1' }),
          expect.objectContaining({ id: 'canvas-2-1', text: 'Text 2' }),
          expect.objectContaining({ id: 'canvas-3-1', text: 'Text 3' }),
        ],
      }),
    }));
  });

  it('fails before attaching when any Page-scoped file link is missing', async () => {
    referenceQuery.maybeSingle.mockResolvedValueOnce({ data: { id: 'reference' }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    await expect(prepareDeferredCanvasCompositeSource(client, job, 'worker'))
      .rejects.toMatchObject({ status: 409, code: 'source_attachment_unavailable' });
    expect(mocks.structure).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('fails rather than silently omitting an unreadable attachment', async () => {
    mocks.structure.mockResolvedValueOnce({ ok: true, value: { structureSessionId: 'structure', sources: [
      { blocks: [{ id: 'block-0', selectable: true }] },
      { blocks: [{ id: 'block-1', selectable: true }] },
      { blocks: [{ id: 'block-2', selectable: false }] },
    ] } });
    await expect(prepareDeferredCanvasCompositeSource(client, job, 'worker'))
      .rejects.toMatchObject({ status: 409, code: 'source_attachment_unavailable' });
    expect(mocks.preview).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});
