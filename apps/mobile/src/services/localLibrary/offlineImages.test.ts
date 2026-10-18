import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReviewerImages } from '@stay-focused/shared';
import { cacheReviewerImages, imageRecords, offlineImageKey, type OfflineImageFiles } from './offlineImages';
import { createLocalArtifactStore } from './artifactStore';
import { imageDirectory, imagesNeedConnection, imagesReady } from './imageManifest';
import { localReviewerImages, preferLocalReviewerImages } from './offlineImagePresentation';
import { openNodeSqlite, OWNER_A, OWNER_B, reviewerDetail } from './localLibrary.testSupport';
import { migrateLocalLibrary, LOCAL_LIBRARY_SCHEMA_VERSION } from './schema';
import { mkdtempSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';

const mocks = vi.hoisted(() => ({ request: vi.fn(), readFigures: vi.fn(), readSnapshot: vi.fn(), remove: vi.fn() }));
vi.mock('../experienceApi', () => ({ experienceRequest: mocks.request }));
vi.mock('../sourceFigures', () => ({ readSectionFigures: mocks.readFigures }));
vi.mock('../sourcePageSnapshots', () => ({ readPageSnapshot: mocks.readSnapshot }));
vi.mock('../externalVisuals', () => ({ EXTERNAL_IMAGE_HEADERS: { 'User-Agent': 'StayFocused/test' } }));
vi.mock('expo-file-system/legacy', () => ({ documentDirectory: 'file:///documents/', deleteAsync: mocks.remove }));

const client = { baseUrl: 'https://api.example.test', accessToken: 'owner-jwt' };
const figure = { id: 'figure-1', url: 'https://storage.example.test/signed?secret=ephemeral', width: 800, height: 600, page: 1 };
function data(count = 1): ReviewerImages {
  return { sections: [{ sectionId: 'section-1', hasFigures: count > 0,
    figures: Array.from({ length: count }, (_, i) => ({ ...figure, id: `figure-${i + 1}` })), snapshot: { available: false, reason: 'no_page_source' } }],
  external: { checked: 1, total: 1, running: false } };
}
const closes: (() => void)[] = [];
beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { for (const close of closes.splice(0)) close(); });
async function setup(count = 1, path?: string) {
  const handle = openNodeSqlite(path); closes.push(() => { try { handle.close(); } catch { /* Explicit restart. */ } });
  await migrateLocalLibrary(handle.db);
  const store = createLocalArtifactStore(handle.db), detail = reviewerDetail();
  await store.upsertDetail(OWNER_A, detail.artifact.id, detail);
  const disk = new Map<string, number>();
  mocks.remove.mockImplementation(async (path: string) => { for (const key of disk.keys()) if (key.startsWith(path)) disk.delete(key); });
  const files: OfflineImageFiles = {
    documentDirectory: 'file:///documents/',
    makeDirectoryAsync: vi.fn(async () => {}),
    deleteAsync: mocks.remove,
    downloadAsync: vi.fn(async (_uri: string, destination: string) => {
      disk.set(destination, 10);
      return { uri: destination, status: 200, headers: { 'Content-Type': 'image/png' }, mimeType: 'image/png' };
    }),
    copyAsync: vi.fn(async ({ from, to }: {from: string; to: string}) => { disk.set(to, disk.get(from) ?? 0); }),
    moveAsync: vi.fn(async ({ from, to }) => { disk.set(to, disk.get(from) ?? 0); disk.delete(from); }),
    getInfoAsync: vi.fn(async (uri: string) => disk.has(uri) ? { exists: true as const, uri, isDirectory: false, size: disk.get(uri)!, modificationTime: 1 } : { exists: false as const, uri, isDirectory: false as const }),
  };
  let now = 1000;
  mocks.request.mockResolvedValue(data(count));
  mocks.readFigures.mockResolvedValue(data(count).sections[0]!.figures);
  const input = { store, owner: OWNER_A, detail, client, signal: new AbortController().signal, files, now: () => now };
  return { ...handle, store, detail, files, disk, input, advance: (ms: number) => { now += ms; }, manifest: () => store.readImageManifest(OWNER_A, detail.artifact.id) };
}

describe('offline reviewer images', () => {
  it('has a forward schema v9 and preserves pre-v9 bodies on upgrade', async () => {
    const h = await setup();
    expect(LOCAL_LIBRARY_SCHEMA_VERSION).toBe(9);
    h.raw.exec('DROP TABLE offline_image_manifests; PRAGMA user_version=8;');
    await migrateLocalLibrary(h.db);
    expect((await h.store.readDetail(OWNER_A, h.detail.artifact.id))?.detail).toEqual(h.detail);
    await h.store.upsertDetail(OWNER_A, h.detail.artifact.id, h.detail);
    expect(await h.manifest()).toMatchObject({ discovered: false, images: [] });
  });
  it('keys exclude signed URLs and re-saving never duplicates files or rows', async () => {
    const h = await setup();
    const key = offlineImageKey('figure', figure.id, h.detail.artifact.updatedAt);
    expect(imageRecords(data(), h.detail.artifact.updatedAt, ['section-1'])[0]?.key).toBe(key);
    await cacheReviewerImages(h.input);
    await h.store.upsertDetail(OWNER_A, h.detail.artifact.id, h.detail);
    await cacheReviewerImages(h.input);
    expect(h.files.downloadAsync).toHaveBeenCalledOnce();
    expect(h.disk.size).toBe(1);
    expect((await h.manifest())?.images).toHaveLength(1);
    expect(JSON.stringify(await h.manifest())).not.toContain('ephemeral');
    expect(JSON.stringify(await h.manifest())).not.toContain('signed?');
    expect(offlineImageKey('figure', figure.id, 'next-version')).not.toBe(key);
    expect(await h.store.readImageManifest(OWNER_B, h.detail.artifact.id)).toBeNull();
  });
  it('uses a fresh owner read, validates a temp file and moves before publishing', async () => {
    const h = await setup();
    await cacheReviewerImages(h.input);
    expect(mocks.readFigures).toHaveBeenCalledWith(client, h.detail.artifact.id.slice(9), 'section-1');
    expect(h.files.downloadAsync).toHaveBeenCalledWith(figure.url, expect.stringMatching(/\.part$/), { headers: undefined });
    expect(h.files.moveAsync).toHaveBeenCalledWith({ from: expect.stringMatching(/\.part$/), to: expect.stringMatching(/\.png$/) });
    expect((await h.manifest())?.images[0]).toMatchObject({ status: 'stored', bytes: 10, attempts: 1, localPath: expect.stringContaining('/documents/offline-images/') });
    expect([...h.disk.keys()].every(path => path.endsWith('.png'))).toBe(true);
  });
  it.each(['download_http_403', 'not_image', 'empty'] as const)('persists safe %s failure and retries only after backoff', async stage => {
    const h = await setup();
    if (stage === 'empty') vi.mocked(h.files.getInfoAsync).mockResolvedValue({ exists: false, uri: '', isDirectory: false });
    else vi.mocked(h.files.downloadAsync).mockResolvedValue({ uri: '', status: stage === 'download_http_403' ? 403 : 200, headers: { 'Content-Type': 'text/html' }, mimeType: 'text/html' });
    await cacheReviewerImages(h.input);
    expect((await h.manifest())?.images[0]).toMatchObject({ status: 'failed', failure: stage, bytes: 0, localPath: null, attempts: 1, retryAt: 31000 });
    expect(h.files.moveAsync).not.toHaveBeenCalled();
    await cacheReviewerImages(h.input);
    expect(h.files.downloadAsync).toHaveBeenCalledOnce();
    h.advance(30_001);
    await cacheReviewerImages(h.input);
    expect(h.files.downloadAsync).toHaveBeenCalledTimes(2);
    expect((await h.manifest())?.images[0]?.attempts).toBe(2);
  });
  it('resumes pending/failed manifest work from a reopened store with concurrency two', async () => {
    const h = await setup(5);
    let inFlight = 0, max = 0;
    const original = h.files.downloadAsync;
    h.files.downloadAsync = vi.fn(async (...args: Parameters<OfflineImageFiles['downloadAsync']>) => {
      inFlight++; max = Math.max(max, inFlight);
      await new Promise(resolve => setTimeout(resolve, 5));
      const result = await original(...args); inFlight--; return result;
    });
    await cacheReviewerImages(h.input);
    expect(max).toBe(2);
    const reopened = createLocalArtifactStore(h.db);
    const manifest = (await h.manifest())!;
    const retry = manifest.images[2]!;
    h.disk.delete(retry.localPath!); Object.assign(retry, { status: 'pending', bytes: 0, localPath: null });
    await reopened.saveImageManifest(OWNER_A, h.detail.artifact.id, manifest);
    await cacheReviewerImages({ ...h.input, store: reopened, files: h.files });
    expect(h.files.downloadAsync).toHaveBeenCalledTimes(6);
    expect(imagesReady(await h.manifest())).toBe(true);
  });
  it.each(['reviewer', 'total'] as const)('keeps text and a reading-order prefix under the %s cap', async cap => {
    const h = await setup(4);
    await cacheReviewerImages({ ...h.input, ...(cap === 'reviewer' ? { reviewerCap: 15 } : { totalCap: 15 }) });
    const manifest = await h.manifest();
    expect(manifest?.images.map(i => i.status)).toEqual(['stored', 'skipped_cap', 'skipped_cap', 'skipped_cap']);
    expect(imagesNeedConnection(manifest)).toBe(true);
    expect(imagesReady(manifest)).toBe(true);
    expect((await h.store.readDetail(OWNER_A, h.detail.artifact.id))?.detail).toEqual(h.detail);
    expect(h.disk.size).toBe(1);
  });
  it('counts images in readiness and bytes without blocking the reviewer body', async () => {
    const h = await setup(2);
    const bytes = (await h.store.offlineStats(OWNER_A)).approximateBytes;
    expect(await h.store.offlineStats(OWNER_A)).toMatchObject({ current: 0, total: 1 });
    expect(await h.store.readDetail(OWNER_A, h.detail.artifact.id)).not.toBeNull();
    await cacheReviewerImages(h.input);
    expect(await h.store.offlineStats(OWNER_A)).toEqual({ current: 1, total: 1, approximateBytes: bytes + 20 });
    expect((await h.store.listSummaries(OWNER_A))[0]?.offlineReady).toBe(true);
    expect(imagesNeedConnection(await h.manifest())).toBe(false);
  });
  it.each(['removeArtifact', 'clearBodies', 'purgeOwner', 'replace', 'summary'] as const)('cleans private files/rows on %s and rejects delayed writes', async action => {
    const h = await setup();
    await cacheReviewerImages(h.input);
    const old = (await h.manifest())!;
    if (action === 'replace') await h.store.upsertDetail(OWNER_A, h.detail.artifact.id, reviewerDetail({ updatedAt: '2026-10-18T00:00:00Z' }));
    else if (action === 'summary') await h.store.upsertSummaries(OWNER_A, [reviewerDetail({ updatedAt: '2026-10-18T00:00:00Z' }).artifact]);
    else if (action === 'removeArtifact') await h.store.removeArtifact(OWNER_A, h.detail.artifact.id);
    else await h.store[action](OWNER_A);
    expect(h.disk.size).toBe(0);
    expect(await h.store.saveImageManifest(OWNER_A, h.detail.artifact.id, old)).toBe(false);
    expect((await h.manifest())?.images ?? []).toEqual([]);
    expect(mocks.remove).toHaveBeenCalledWith(expect.stringContaining('/offline-images/'), { idempotent: true });
    expect(mocks.remove.mock.calls.every(call => String(call[0]).startsWith('file:///documents/offline-images/'))).toBe(true);
  });
  it('clear and re-save of the same version rejects an in-flight download from the old generation', async () => {
    const h = await setup();
    let finish!: () => void;
    const original = h.files.downloadAsync;
    h.files.downloadAsync = vi.fn(async (...args: Parameters<OfflineImageFiles['downloadAsync']>) => { await new Promise<void>(r => { finish = r; }); return original(...args); });
    const caching = cacheReviewerImages({ ...h.input, files: h.files });
    await vi.waitFor(() => expect(h.files.downloadAsync).toHaveBeenCalledOnce());
    await h.store.clearBodies(OWNER_A);
    await h.store.upsertDetail(OWNER_A, h.detail.artifact.id, h.detail);
    finish(); await caching;
    expect(h.disk.size).toBe(0);
    expect((await h.manifest())?.images).toEqual([]);
  });
  it('removes explicitly denied source previews and preserves copies on failed reads', async () => {
    const h = await setup(); await cacheReviewerImages(h.input);
    mocks.request.mockRejectedValue(new Error('private provider error'));
    await cacheReviewerImages(h.input);
    expect(h.disk.size).toBe(1);
    h.advance(30_001);
    mocks.request.mockResolvedValue({ ...data(0), sections: [{ ...data(0).sections[0], snapshot: { available: false, reason: 'source_revision_unavailable' } }] });
    await cacheReviewerImages(h.input);
    expect(h.disk.size).toBe(0); expect((await h.manifest())?.images).toEqual([]);
  });
  it('invalidates denied previews even when the filesystem refuses deletion', async () => {
    const h = await setup(); await cacheReviewerImages(h.input);
    mocks.request.mockResolvedValue({ ...data(0), sections: [{ ...data(0).sections[0], snapshot: { available: false, reason: 'source_revision_unavailable' } }] });
    mocks.remove.mockRejectedValueOnce(new Error('private native path'));
    await cacheReviewerImages(h.input);
    expect((await h.manifest())?.images).toEqual([]);
    expect(localReviewerImages(await h.manifest(), ['section-1'])?.sections[0]?.figures).toEqual([]);
  });
  it('prefers local files in both online and offline display while preserving labels', async () => {
    const h = await setup(); await cacheReviewerImages(h.input);
    const local = localReviewerImages(await h.manifest(), ['section-1']);
    expect(preferLocalReviewerImages(data(), local)?.sections[0]?.figures[0]).toMatchObject({ ...figure, url: expect.stringMatching(/^file:\/\//) });
    expect(preferLocalReviewerImages(null, local)?.sections[0]?.figures[0]?.url).toMatch(/^file:\/\//);
    expect(imageDirectory('file:///documents/', '../owner', '../artifact')).not.toContain('/../');
  });
  it('persists a failed manifest across an actual database close/reopen', async () => {
    const directory = mkdtempSync(resolve('../../tmp/overnight/oi1-restart-'));
    const path = join(directory, 'library.db');
    try {
      const h = await setup(1, path);
      vi.mocked(h.files.downloadAsync).mockRejectedValueOnce(new Error('offline'));
      await cacheReviewerImages(h.input);
      const before = await h.manifest(); h.close();
      const second = openNodeSqlite(path);
      try {
        await migrateLocalLibrary(second.db);
        const store = createLocalArtifactStore(second.db);
        expect(await store.readImageManifest(OWNER_A, h.detail.artifact.id)).toEqual(before);
        h.advance(30_001);
        await cacheReviewerImages({ ...h.input, store });
        expect(imagesReady(await store.readImageManifest(OWNER_A, h.detail.artifact.id))).toBe(true);
      } finally { second.close(); }
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
  it('stores snapshots and external references with unchanged captions and attribution, without signed URLs', async () => {
    const h = await setup(0);
    const snapshot = { available: true as const, id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', url: figure.url, page: 2, labelKind: 'slide' as const, width: 800, height: 600, sourceLabel: 'Accepted slides' };
    const external = { status: 'found' as const, id: 'a'.repeat(64), image: 'https://upload.wikimedia.org/image.png', title: 'Cell', credit: 'Ada', license: 'CC BY',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Cell.png',
      label: 'External reference — not from your course material.' as const, width: 800, height: 600, attemptCount: 1 };
    mocks.request.mockResolvedValue({ ...data(0), sections: [{ ...data(0).sections[0], snapshot, external }] });
    mocks.readSnapshot.mockResolvedValue(snapshot);
    await cacheReviewerImages(h.input);
    const manifest = await h.manifest();
    expect(manifest?.images.map(i => i.kind)).toEqual(['page_snapshot', 'external_visual']);
    expect(manifest?.images[1]?.attribution).toBe('Ada · CC BY');
    expect(JSON.stringify(manifest)).not.toContain('ephemeral');
    const local = localReviewerImages(manifest, ['section-1']);
    expect(local?.sections[0]?.snapshot).toMatchObject({ sourceLabel: 'Accepted slides', labelKind: 'slide', page: 2, url: expect.stringMatching(/^file:/) });
    expect(local?.sections[0]?.external).toMatchObject({ ...external, image: expect.stringMatching(/^file:/) });
    expect(h.files.downloadAsync).toHaveBeenCalledWith(external.image, expect.any(String), { headers: { 'User-Agent': 'StayFocused/test' } });
  });
  it('never claims ready on incomplete discovery or an unfinished page render', async () => {
    const h = await setup(0);
    mocks.request.mockResolvedValue({ ...data(0), sections: [] });
    await cacheReviewerImages(h.input);
    expect(imagesReady(await h.manifest())).toBe(false);
    h.advance(30_001);
    mocks.request.mockResolvedValue({ ...data(0), sections: [{ ...data(0).sections[0], snapshot: { available: true, status: 'unrendered', page: 1 } }] });
    mocks.readSnapshot.mockResolvedValue({ available: true, status: 'rendering', page: 1 });
    await cacheReviewerImages(h.input);
    expect(imagesReady(await h.manifest())).toBe(false);
    expect(h.files.downloadAsync).not.toHaveBeenCalled();
  });
  it('shares repeated image identities between sections without downloading duplicate bytes', () => {
    const first = data();
    const records = imageRecords({ ...first, sections: [first.sections[0]!, { ...first.sections[0]!, sectionId: 'section-2' }] }, 'v1', ['section-1', 'section-2']);
    expect(records).toHaveLength(1);
    expect(records[0]?.sectionIds).toEqual(['section-1', 'section-2']);
  });
  it('applies the total cap across accounts and isolates owner cleanup', async () => {
    const h = await setup();
    await h.store.upsertDetail(OWNER_B, h.detail.artifact.id, h.detail);
    await cacheReviewerImages({ ...h.input, owner: OWNER_B, client: { ...client, accessToken: 'other-owner-jwt' } });
    await cacheReviewerImages({ ...h.input, totalCap: 15 });
    expect((await h.manifest())?.images[0]?.status).toBe('skipped_cap');
    expect(await h.store.imageCacheBytes()).toBe(10);
    await h.store.purgeOwner(OWNER_A);
    expect(h.disk.size).toBe(1);
    expect((await h.store.readImageManifest(OWNER_B, h.detail.artifact.id))?.images[0]?.status).toBe('stored');
  });
});
