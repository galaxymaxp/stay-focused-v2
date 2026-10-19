import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';

const mocks = vi.hoisted(() => ({ readConnection: vi.fn(), getCourseFile: vi.fn(), downloadFile: vi.fn(), mapCanvasFile: vi.fn(), decrypt: vi.fn(), createCanvasClient: vi.fn() }));
vi.mock('@/lib/canvas-routes', () => ({
  CONNECTION_SECRET_COLUMNS: 'id,base_url', readConnection: mocks.readConnection,
  decryptConnectionToken: mocks.decrypt,
  createCanvasClient: mocks.createCanvasClient,
}));
vi.mock('@/lib/canvas-file-normalize', async (load) => ({
  ...await load<typeof import('@/lib/canvas-file-normalize')>(), mapCanvasFile: mocks.mapCanvasFile,
}));
import { isInstructionalPageAttachment, resolveInstructionalPageAttachments } from './canvas-page-attachments';

const row = { id: 'file-row', user_id: 'owner', course_id: 'course', canvas_connection_id: 'connection', canvas_file_id: '42', display_name: 'Unit 3 Lesson 1.pdf' };
const course = { id: 'course', user_id: 'owner', canvas_connection_id: 'connection', canvas_course_id: '101' };
const page = { published: true, id: 'page-row', user_id: 'owner', course_id: 'course', canvas_connection_id: 'connection', canvas_page_url: 'unit-3-lesson-1', body_html: '<a href="/courses/101/files/42?download=1">Lesson.pdf</a><a href="/api/v1/files/42">Duplicate</a>' };
const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), insert: vi.fn(), update:vi.fn() };
const upsert = vi.fn();
const from = vi.fn((table: string) => table === 'canvas_file_references' ? { upsert } : query);
const client = { from } as unknown as SupabaseClient<Database>;

beforeEach(() => {
  vi.resetAllMocks();
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.insert.mockReturnValue(query);
  query.update.mockReturnValue(query);
  mocks.readConnection.mockResolvedValue({ ok: true, row: { id: 'connection', user_id: 'owner', status: 'active', base_url: 'https://canvas.test' } });
  mocks.decrypt.mockReturnValue('private-token');
  mocks.createCanvasClient.mockReturnValue({ getCourseFile: mocks.getCourseFile, downloadFile: mocks.downloadFile });
  mocks.getCourseFile.mockResolvedValue({ id: '42' });
  mocks.downloadFile.mockResolvedValue({ bytes: new Uint8Array([37, 80, 68, 70, 45]), byteLength: 5, contentType: 'application/pdf' });
  mocks.mapCanvasFile.mockReturnValue({ canvas_file_id: '42', display_name: 'Unit 3 Lesson 1.pdf', ingestion_eligibility: 'eligible_document', metadata_fingerprint: 'a', content_version_fingerprint: 'b' });
  query.maybeSingle.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: row, error: null });
  upsert.mockResolvedValue({ error: null });
});

describe('instructional Canvas Page attachments', () => {
  it('invalidates old bytes when fresh Page attachment metadata reveals a new revision',async()=>{
    const old={...row,content_version_fingerprint:'a',ingestion_status:'stored',current_sha256:'c'.repeat(64),storage_object_key:'retained-original'};
    const next={...old,content_version_fingerprint:'b',ingestion_status:'not_requested'};
    query.maybeSingle.mockReset().mockResolvedValueOnce({data:old,error:null}).mockResolvedValueOnce({data:next,error:null});
    expect(await resolveInstructionalPageAttachments({client,course:course as never,page:page as never,userId:'owner'})).toEqual([next]);
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({content_version_fingerprint:'b',ingestion_status:'not_requested'}));
    expect(query.update.mock.calls[0]![0]).not.toHaveProperty('storage_object_key');
    expect(query.eq).toHaveBeenCalledWith('content_version_fingerprint','a');
  });
  it.each([
    { id: 'connection', user_id: 'owner', status: 'disconnected' },
    { id: 'connection', user_id: 'other-owner', status: 'active' },
    { id: 'other-connection', user_id: 'owner', status: 'active' },
  ])('rejects an inactive or mismatched connection even with a brokered token (%s)', async connection => {
    mocks.readConnection.mockResolvedValue({ ok: true, row: connection });
    await expect(resolveInstructionalPageAttachments({ client, course: course as never, page: page as never,
      userId: 'owner', brokeredCanvasToken: 'brokered-sync-token' })).rejects.toMatchObject({ code: 'source_attachment_unavailable' });
    expect(mocks.createCanvasClient).not.toHaveBeenCalled();
    expect(mocks.decrypt).not.toHaveBeenCalled();
  });
  it('leaves a body-only Page available without fetching Canvas credentials', async () => {
    await expect(resolveInstructionalPageAttachments({ client, course: course as never, page: { ...page, body_html: '<p>HTML provides structure.</p>' } as never, userId: 'owner' })).resolves.toEqual([]);
    expect(mocks.readConnection).not.toHaveBeenCalled();
  });
  it.each([undefined, 'brokered-sync-token'])('discovers a linked PDF using token %s', async brokeredCanvasToken => {
    await expect(resolveInstructionalPageAttachments({ client, course: course as never, page: page as never, userId: 'owner', brokeredCanvasToken })).resolves.toEqual([row]);
    expect(mocks.createCanvasClient).toHaveBeenCalledWith('https://canvas.test', brokeredCanvasToken ?? 'private-token');
    expect(mocks.decrypt).toHaveBeenCalledTimes(brokeredCanvasToken ? 0 : 1);
    expect(mocks.getCourseFile).toHaveBeenCalledTimes(1);
    expect(query.insert).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ reference_type: 'page', referenced_row_id: 'page-row', file_id: 'file-row' }), expect.anything());
  });
  it('preserves first Page link order and deduplicates repeated links', async () => {
    const orderedPage = { ...page, body_html: '<a href="/courses/101/files/12">Second.pdf</a><a href="/courses/101/files/42">First.pptx</a><a href="/courses/101/files/12">Again</a><a href="/courses/101/files/99">Third.pdf</a>' };
    mocks.getCourseFile.mockImplementation(async (_course: string, id: string) => ({ id }));
    mocks.mapCanvasFile.mockImplementation((file: { id: string }) => ({ canvas_file_id: file.id, display_name: `Lesson ${file.id}.pdf`, ingestion_eligibility: 'eligible_document' }));
    query.maybeSingle.mockReset();
    const ids = ['12', '42', '99'];
    for (const id of ids) {
      query.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: { ...row, id: `row-${id}`, canvas_file_id: id }, error: null });
    }
    const result = await resolveInstructionalPageAttachments({ client, course: course as never, page: orderedPage as never, userId: 'owner' });
    expect(result.map(file => file.canvas_file_id)).toEqual(ids);
    expect(mocks.getCourseFile.mock.calls.map(call => call[1])).toEqual(ids);
  });
  it('keeps administrative and unsupported links out of generation', async () => {
    expect(isInstructionalPageAttachment('Course outline.pdf', 'eligible_document')).toBe(false);
    expect(isInstructionalPageAttachment('Course Orientation Soc Sci 103.pptx', 'eligible_document')).toBe(false);
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
  it('accepts a hidden same-course Page PDF only after authenticated download and signature validation', async () => {
    mocks.mapCanvasFile.mockReturnValue({ canvas_file_id: '42', display_name: 'Lesson.pdf',
      filename: 'Lesson.pdf', content_type: 'application/pdf', size_bytes: 5,
      hidden: true, hidden_for_user: true, locked: false, lock_at: null, unlock_at: null,
      media_class: null, media_entry_id: null, ingestion_eligibility: 'blocked_unavailable' });
    await expect(resolveInstructionalPageAttachments({ client, course: course as never, page: page as never, userId: 'owner' })).resolves.toEqual([row]);
    expect(mocks.downloadFile).toHaveBeenCalledOnce();
    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({ hidden: true, hidden_for_user: true,
      ingestion_eligibility: 'eligible_document' }));
  });
  it('returns the attachment error if the hidden PDF download is denied', async () => {
    mocks.mapCanvasFile.mockReturnValue({ canvas_file_id: '42', display_name: 'Lesson.pdf',
      filename: 'Lesson.pdf', content_type: 'application/pdf', size_bytes: 5,
      hidden: true, hidden_for_user: true, locked: false, lock_at: null, unlock_at: null,
      media_class: null, media_entry_id: null, ingestion_eligibility: 'blocked_unavailable' });
    mocks.downloadFile.mockRejectedValue(new Error('denied'));
    await expect(resolveInstructionalPageAttachments({ client, course: course as never, page: page as never, userId: 'owner' }))
      .rejects.toMatchObject({ code: 'source_attachment_unavailable' });
    expect(query.insert).not.toHaveBeenCalled();
  });
  it('rejects a hidden PDF with invalid binary signature', async () => {
    mocks.mapCanvasFile.mockReturnValue({ canvas_file_id: '42', display_name: 'Lesson.pdf',
      filename: 'Lesson.pdf', content_type: 'application/pdf', size_bytes: 5,
      hidden: true, hidden_for_user: true, locked: false, lock_at: null, unlock_at: null,
      media_class: null, media_entry_id: null, ingestion_eligibility: 'blocked_unavailable' });
    mocks.downloadFile.mockResolvedValue({ bytes: new Uint8Array([0, 0, 0, 0, 0]), byteLength: 5, contentType: 'application/pdf' });
    await expect(resolveInstructionalPageAttachments({ client, course: course as never, page: page as never, userId: 'owner' }))
      .rejects.toMatchObject({ code: 'source_attachment_unavailable' });
  });
  it('keeps locked and oversized hidden files blocked', async () => {
    for (const extra of [{ locked: true }, { size_bytes: 100_000_000 }]) {
      mocks.mapCanvasFile.mockReturnValue({ canvas_file_id: '42', display_name: 'Lesson.pdf', filename: 'Lesson.pdf',
        content_type: 'application/pdf', size_bytes: 5, hidden: true, hidden_for_user: true,
        locked: false, lock_at: null, unlock_at: null, media_class: null, media_entry_id: null,
        ingestion_eligibility: 'blocked_unavailable', ...extra });
      await expect(resolveInstructionalPageAttachments({ client, course: course as never, page: page as never, userId: 'owner' })).resolves.toEqual([]);
    }
    expect(mocks.downloadFile).not.toHaveBeenCalled();
  });
});
