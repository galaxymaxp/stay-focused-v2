import { afterEach, expect, it, vi } from 'vitest';
import { downloadStudyImage } from './download-image';
const image = { uri: 'https://image.test/opaque?private=token', reviewerTitle: 'Biology', sectionTitle: 'Cell', kind: 'figure' as const };
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });
it('downloads cross-origin bytes with the actual filename and releases temporary resources', async () => {
  vi.useFakeTimers();
  const anchor = { href: '', download: '', click: vi.fn(), remove: vi.fn() }, appendChild = vi.fn(), revoke = vi.fn();
  const fetchMock = vi.fn(async () => new Response(new Blob(['image'], { type: 'image/jpeg' })));
  vi.stubGlobal('fetch', fetchMock); vi.stubGlobal('document', { createElement: () => anchor, body: { appendChild } });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local'); vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revoke);
  await downloadStudyImage(image);
  expect(fetchMock).toHaveBeenCalledWith(image.uri, { credentials: 'omit', referrerPolicy: 'no-referrer' });
  expect(anchor.download).toBe('Biology-Cell-figure.jpg'); expect(anchor.click).toHaveBeenCalledOnce(); expect(anchor.remove).toHaveBeenCalledOnce();
  await vi.runAllTimersAsync(); expect(revoke).toHaveBeenCalledWith('blob:local');
});
it.each([403, 200])('failed or non-image response (%s) never offers a broken download', async status => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('unavailable', { status, headers: { 'Content-Type': 'text/html' } })));
  const createUrl = vi.spyOn(URL, 'createObjectURL'); await expect(downloadStudyImage(image)).rejects.toThrow(); expect(createUrl).not.toHaveBeenCalled();
});
