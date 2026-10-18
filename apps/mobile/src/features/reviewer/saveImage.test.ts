import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ os: 'android', request: vi.fn(), album: vi.fn(), asset: vi.fn(), createAlbum: vi.fn(), save: vi.fn(), download: vi.fn(), remove: vi.fn(), mkdir: vi.fn(), move: vi.fn(), copy: vi.fn(), info: vi.fn(), settings: vi.fn() }));
vi.mock('react-native', () => ({ Platform: { get OS() { return mocks.os; } }, Linking: { openSettings: mocks.settings } }));
vi.mock('expo-media-library/legacy', () => ({ requestPermissionsAsync: mocks.request, getAlbumAsync: mocks.album, createAssetAsync: mocks.asset, createAlbumAsync: mocks.createAlbum, saveToLibraryAsync: mocks.save }));
vi.mock('expo-file-system/legacy', () => ({ cacheDirectory: 'file:///cache/', makeDirectoryAsync: mocks.mkdir, downloadAsync: mocks.download, deleteAsync: mocks.remove, moveAsync: mocks.move, copyAsync: mocks.copy, getInfoAsync: mocks.info }));
const { saveImage } = await import('./saveImage');
const image = { uri: 'https://image.test/page.png?private=token', reviewerTitle: 'Biology', sectionTitle: 'Cell', kind: 'page_snapshot' as const };
beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
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

it.each([
  ['permission', () => mocks.request.mockRejectedValue(new Error('private native permission error'))],
  ['download', () => mocks.download.mockRejectedValue(new Error('image_unavailable'))],
  ['download_http_401', () => mocks.download.mockResolvedValue({status:401,headers:{}})],
  ['download_http_403', () => mocks.download.mockResolvedValue({status:403,headers:{}})],
  ['download_http_500', () => mocks.download.mockResolvedValue({status:500,headers:{}})],
  ['not_image', () => mocks.download.mockResolvedValue({status:200,headers:{'content-type':'text/html'}})],
  ['empty', () => mocks.info.mockResolvedValue({exists:false})],
  ['empty', () => mocks.info.mockResolvedValue({exists:true,isDirectory:false,size:undefined})],
  ['media_write', () => mocks.createAlbum.mockRejectedValue(new Error('private gallery error'))],
  ['module_missing', () => mocks.request.mockRejectedValue(new Error("Cannot find native module 'ExpoMediaLibrary'"))],
  ['module_missing', () => mocks.download.mockRejectedValue(Object.assign(new Error('private error'),{code:'ERR_UNAVAILABLE'}))],
] as const)('returns and logs only the safe stage %s', async (stage, arrange) => {
  arrange(); const result=await saveImage(image);
  expect(result).toMatchObject({status:'failed',stage,message: stage==='module_missing'?'Update the app to save images':stage==='media_write'?"Couldn't write to your gallery":stage==='permission'?'Allow photo access in settings to save study images.':"Couldn't download the image"});
  expect(console.warn).toHaveBeenCalledExactlyOnceWith('reviewer.save_image_failed',{stage});
  expect(JSON.stringify(result)).not.toContain('private');
});
it('reports denied permission and never proceeds to download', async()=>{
  mocks.request.mockResolvedValue({granted:false});
  expect(await saveImage(image)).toMatchObject({status:'denied',stage:'permission'});
  expect(console.warn).toHaveBeenCalledExactlyOnceWith('reviewer.save_image_failed',{stage:'permission'});
  expect(mocks.download).not.toHaveBeenCalled();
});
it.each(['android','ios'])('awaits the %s native write before cache cleanup',async os=>{
  mocks.os=os;let finish!:()=>void;
  const write=os==='android'?mocks.createAlbum:mocks.save;
  write.mockImplementation(()=>new Promise<void>(resolve=>{finish=resolve;}));
  const saving=saveImage(image);
  await vi.waitFor(()=>expect(write).toHaveBeenCalledOnce());
  expect(mocks.remove).not.toHaveBeenCalled();finish();
  expect((await saving).status).toBe('saved');expect(mocks.remove).toHaveBeenCalledOnce();
  expect(mocks.info.mock.invocationCallOrder[0]).toBeLessThan(write.mock.invocationCallOrder[0]!);
});
it('reports an iOS write failure with add-only permission and cleans up',async()=>{
  mocks.os='ios';mocks.save.mockRejectedValue(new Error('private Photos error'));
  expect(await saveImage(image)).toMatchObject({status:'failed',stage:'media_write',message:"Couldn't write to your gallery"});
  expect(mocks.request).toHaveBeenCalledWith(true,['photo']);expect(mocks.remove).toHaveBeenCalledOnce();
});
it('refreshes a signed URL after permission and before downloading without adding bearer headers to storage',async()=>{
  const refresh=vi.fn(async()=>'https://image.test/fresh.png');
  expect((await saveImage(image,refresh)).status).toBe('saved');
  expect(mocks.request.mock.invocationCallOrder[0]).toBeLessThan(refresh.mock.invocationCallOrder[0]!);
  expect(refresh.mock.invocationCallOrder[0]).toBeLessThan(mocks.download.mock.invocationCallOrder[0]!);
  expect(mocks.download).toHaveBeenCalledWith('https://image.test/fresh.png',expect.any(String),{headers:undefined});
});
it('never falls back to the stale URL when the owner read fails',async()=>{
  expect(await saveImage(image,async()=>{throw new Error('snapshot_unavailable');})).toMatchObject({status:'failed',stage:'download'});
  expect(mocks.download).not.toHaveBeenCalled();expect(mocks.createAlbum).not.toHaveBeenCalled();
});
it('keeps a successful save when temporary-file cleanup fails',async()=>{
  mocks.remove.mockRejectedValue(new Error('private cache path'));
  expect((await saveImage(image)).status).toBe('saved');expect(console.warn).not.toHaveBeenCalled();
});
