import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';

const mocks = vi.hoisted(() => ({ readConnection: vi.fn(), getCourseFile: vi.fn(), mapCanvasFile: vi.fn() }));
vi.mock('@/lib/canvas-routes', () => ({
  CONNECTION_SECRET_COLUMNS: 'id,base_url', readConnection: mocks.readConnection,
  decryptConnectionToken: () => 'private-token',
  createCanvasClient: () => ({ getCourseFile: mocks.getCourseFile }),
}));
vi.mock('@/lib/canvas-file-normalize', async (load) => ({
  ...await load<typeof import('@/lib/canvas-file-normalize')>(), mapCanvasFile: mocks.mapCanvasFile,
}));
import { isInstructionalPageAttachment, resolveInstructionalPageAttachments } from './canvas-page-attachments';

const row = { id: 'file-row', user_id: 'owner', course_id: 'course', canvas_connection_id: 'connection', canvas_file_id: '42', display_name: 'Unit 3 Lesson 1.pdf' };
const course = { id: 'course', user_id: 'owner', canvas_connection_id: 'connection', canvas_course_id: '101' };
const page = { id: 'page-row', user_id: 'owner', course_id: 'course', canvas_connection_id: 'connection', canvas_page_url: 'unit-3-lesson-1', body_html: '<a href="/courses/101/files/42?download=1">Lesson.pdf</a><a href="/api/v1/files/42">Duplicate</a>' };
const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), insert: vi.fn() };
const upsert = vi.fn();
const from = vi.fn((table: string) => table === 'canvas_file_references' ? { upsert } : query);
const client = { from } as unknown as SupabaseClient<Database>;

beforeEach(() => {
  vi.resetAllMocks();
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.insert.mockReturnValue(query);
  mocks.readConnection.mockResolvedValue({ ok: true, row: { id: 'connection', base_url: 'https://canvas.test' } });
  mocks.getCourseFile.mockResolvedValue({ id: '42' });
  mocks.mapCanvasFile.mockReturnValue({ canvas_file_id: '42', display_name: 'Unit 3 Lesson 1.pdf', ingestion_eligibility: 'eligible_document', metadata_fingerprint: 'a', content_version_fingerprint: 'b' });
  query.maybeSingle.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: row, error: null });
  upsert.mockResolvedValue({ error: null });
});

describe('instructional Canvas Page attachments', () => {
  it('leaves a body-only Page available without fetching Canvas credentials', async () => {
    await expect(resolveInstructionalPageAttachments({ client, course: course as never, page: { ...page, body_html: '<p>HTML provides structure.</p>' } as never, userId: 'owner' })).resolves.toEqual([]);
    expect(mocks.readConnection).not.toHaveBeenCalled();
  });
  it('discovers and stores a linked PDF once even when it appears twice', async () => {
    await expect(resolveInstructionalPageAttachments({ client, course: course as never, page: page as never, userId: 'owner' })).resolves.toEqual([row]);
    expect(mocks.getCourseFile).toHaveBeenCalledTimes(1);
    expect(query.insert).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ reference_type: 'page', referenced_row_id: 'page-row', file_id: 'file-row' }), expect.anything());
  });
  it('keeps administrative and unsupported links out of generation', async () => {
    expect(isInstructionalPageAttachment('Course outline.pdf', 'eligible_document')).toBe(false);
    expect(isInstructionalPageAttachment('Lesson.zip', 'metadata_only_unsupported')).toBe(false);
    mocks.mapCanvasFile.mockReturnValue({ canvas_file_id: '42', display_name: 'Course outline.pdf', ingestion_eligibility: 'eligible_document' });
    await expect(resolveInstructionalPageAttachments({ client, course: course as never, page: page as never, userId: 'owner' })).resolves.toEqual([]);
    expect(query.insert).not.toHaveBeenCalled();
  });
  it('returns an actionable typed error when Canvas cannot fetch the attachment', async () => {
    mocks.getCourseFile.mockRejectedValue(new Error('private Canvas error'));
    await expect(resolveInstructionalPageAttachments({ client, course: course as never, page: page as never, userId: 'owner' }))
      .rejects.toMatchObject({ code: 'source_attachment_unavailable' });
    expect(query.insert).not.toHaveBeenCalled();
  });
});
