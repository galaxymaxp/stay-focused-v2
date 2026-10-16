import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ os: 'android', request: vi.fn(), album: vi.fn(), asset: vi.fn(), createAlbum: vi.fn(), save: vi.fn(), download: vi.fn(), remove: vi.fn(), mkdir: vi.fn(), move: vi.fn(), copy: vi.fn(), info: vi.fn(), settings: vi.fn() }));
vi.mock('react-native', () => ({ Platform: { get OS() { return mocks.os; } }, Linking: { openSettings: mocks.settings } }));
vi.mock('expo-media-library/legacy', () => ({ requestPermissionsAsync: mocks.request, getAlbumAsync: mocks.album, createAssetAsync: mocks.asset, createAlbumAsync: mocks.createAlbum, saveToLibraryAsync: mocks.save }));
vi.mock('expo-file-system/legacy', () => ({ cacheDirectory: 'file:///cache/', makeDirectoryAsync: mocks.mkdir, downloadAsync: mocks.download, deleteAsync: mocks.remove, moveAsync: mocks.move, copyAsync: mocks.copy, getInfoAsync: mocks.info }));
const { saveImage } = await import('./saveImage');
const image = { uri: 'https://image.test/page.png?private=token', reviewerTitle: 'Biology', sectionTitle: 'Cell', kind: 'page_snapshot' as const };
beforeEach(() => {
  vi.resetAllMocks(); mocks.os = 'android'; mocks.request.mockResolvedValue({ granted: true }); mocks.album.mockResolvedValue(null);
  mocks.info.mockResolvedValue({ exists: true, isDirectory: false, size: 1024 });
  mocks.download.mockResolvedValue({ status: 200, headers: { 'Content-Type': 'image/png' } }); mocks.remove.mockResolvedValue(undefined);
});
it('requests write-only photo access and creates Stay Focused directly from the completed cache image', async () => {
  expect((await saveImage(image)).status).toBe('saved');
  expect(mocks.request).toHaveBeenCalledWith(true, ['photo']);
  expect(mocks.createAlbum).toHaveBeenCalledWith('Stay Focused', undefined, false, expect.stringMatching(/Biology-Cell-page_snapshot.png$/));
  expect(mocks.asset).not.toHaveBeenCalled(); expect(mocks.remove).toHaveBeenCalledWith(expect.stringContaining('file:///cache/study-image-'), { idempotent: true });
});
it('repeated saves use the named album directly without requesting read access for a lookup', async () => {
  await saveImage(image); await saveImage(image);
  expect(mocks.createAlbum).toHaveBeenCalledTimes(2); expect(mocks.album).not.toHaveBeenCalled(); expect(mocks.asset).not.toHaveBeenCalled();
});
it('rejects empty downloads before saving to the album',async()=>{
  mocks.info.mockResolvedValue({exists:true,isDirectory:false,size:0});
  expect((await saveImage(image)).status).toBe('failed');expect(mocks.createAlbum).not.toHaveBeenCalled();expect(mocks.remove).toHaveBeenCalledOnce();
});
it('iOS only saves add-only to the library; never looks up or creates albums', async () => {
  mocks.os = 'ios'; expect((await saveImage(image)).status).toBe('saved');
  expect(mocks.request).toHaveBeenCalledWith(true, ['photo']); expect(mocks.save).toHaveBeenCalledOnce();
  expect(mocks.album).not.toHaveBeenCalled(); expect(mocks.createAlbum).not.toHaveBeenCalled(); expect(mocks.asset).not.toHaveBeenCalled();
});
it('denial returns the settings action without downloading or publishing', async () => {
  mocks.request.mockResolvedValue({ granted: false }); const result = await saveImage(image);
  expect(result.status).toBe('denied'); if (result.status === 'denied') await result.openSettings();
  expect(mocks.settings).toHaveBeenCalledOnce(); expect(mocks.download).not.toHaveBeenCalled(); expect(mocks.createAlbum).not.toHaveBeenCalled();
});
it.each(['reject', 'http', 'html'])('download failure (%s) cleans cache and never puts partial bytes in an album', async failure => {
  if (failure === 'reject') mocks.download.mockRejectedValue(new Error('private URL'));
  else mocks.download.mockResolvedValue({ status: failure === 'http' ? 403 : 200, headers: { 'Content-Type': 'text/html' } });
  const result = await saveImage(image); expect(result.status).toBe('failed'); expect(JSON.stringify(result)).not.toContain('private');
  expect(mocks.remove).toHaveBeenCalledOnce(); expect(mocks.album).not.toHaveBeenCalled(); expect(mocks.createAlbum).not.toHaveBeenCalled();
});
it('uses Wikimedia headers, source title and stored attribution in the confirmation', async () => {
  const result = await saveImage({ ...image, kind: 'external_visual', sourceTitle: 'Cell: image', attribution: 'Ada · CC BY 4.0', headers: { 'User-Agent': 'StayFocused' } });
  expect(mocks.download).toHaveBeenCalledWith(image.uri, expect.stringContaining('Cell- image-external_visual'), { headers: { 'User-Agent': 'StayFocused' } });
  expect(result.message).toContain('Ada · CC BY 4.0');
});
it('copies a local image and never deletes the original', async () => {
  await saveImage({ ...image, uri: 'file:///original.png' }); expect(mocks.copy).toHaveBeenCalledWith({ from: 'file:///original.png', to: expect.any(String) });
  expect(mocks.download).not.toHaveBeenCalled(); expect(mocks.remove.mock.calls[0]?.[0]).not.toBe('file:///original.png');
});
it('renames an opaque remote URI using its actual image MIME', async () => {
  mocks.download.mockResolvedValue({ status: 200, headers: { 'content-type': 'image/jpeg' } }); await saveImage({ ...image, uri: 'https://image.test/opaque' });
  expect(mocks.move).toHaveBeenCalledWith({ from: expect.stringMatching(/\.png$/), to: expect.stringMatching(/\.jpg$/) });
  expect(mocks.createAlbum.mock.calls[0]?.[3]).toMatch(/\.jpg$/);
});
