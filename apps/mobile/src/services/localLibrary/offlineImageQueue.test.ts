import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createLocalArtifactStore } from './artifactStore';
import { openNodeSqlite, OWNER_A, reviewerDetail } from './localLibrary.testSupport';
import { migrateLocalLibrary } from './schema';
const mocks = vi.hoisted(() => ({ store: vi.fn(), cache: vi.fn() }));
vi.mock('./localArtifactDatabase', () => ({ getLocalArtifactStore: mocks.store }));
vi.mock('./offlineImages', () => ({ cacheReviewerImages: mocks.cache }));
vi.mock('expo-file-system/legacy', () => ({ documentDirectory: 'file:///documents/', deleteAsync: vi.fn() }));
const client = { baseUrl: 'https://api.example.test', accessToken: 'owner-jwt' };
const cleanup: (() => void)[] = [];
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); });
afterEach(() => { cleanup.splice(0).forEach(close => close()); vi.useRealTimers(); });
async function setup() {
  const h = openNodeSqlite(); cleanup.push(h.close); await migrateLocalLibrary(h.db);
  const store = createLocalArtifactStore(h.db), detail = reviewerDetail();
  await store.upsertDetail(OWNER_A, detail.artifact.id, detail);
  mocks.store.mockResolvedValue(store);
  return { store, detail, queue: await import('./offlineImageQueue') };
}
it('resumes a persisted pending manifest without fetching reviewer text again', async () => {
  const { queue, detail, store } = await setup();
  mocks.cache.mockImplementation(async () => {
    const manifest = (await store.readImageManifest(OWNER_A, detail.artifact.id))!;
    manifest.discovered = true;
    await store.saveImageManifest(OWNER_A, detail.artifact.id, manifest);
  });
  await queue.runOfflineImageQueue(OWNER_A, client);
  expect(mocks.cache).toHaveBeenCalledOnce();
  expect(mocks.cache.mock.calls[0]![0]).toMatchObject({ owner: OWNER_A, detail, client });
  await queue.stopOfflineImageQueue(OWNER_A);
});
it('shares one flight and drains cancelled work before clear/sign-out', async () => {
  const { queue } = await setup();
  let finish!: () => void;
  mocks.cache.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
  const flight = queue.runOfflineImageQueue(OWNER_A, client);
  expect(queue.runOfflineImageQueue(OWNER_A, client)).toBe(flight);
  await vi.waitFor(() => expect(mocks.cache).toHaveBeenCalledOnce());
  let stopped = false;
  const stopping = queue.stopOfflineImageQueue(OWNER_A).then(() => { stopped = true; });
  expect(mocks.cache.mock.calls[0]![0].signal.aborted).toBe(true);
  expect(stopped).toBe(false);
  finish(); await stopping;
  expect(stopped).toBe(true);
  expect(mocks.cache).toHaveBeenCalledOnce();
});
it('retries persisted incomplete discovery with backoff, and stop removes its timer', async () => {
  vi.useFakeTimers();
  const { queue, store, detail } = await setup();
  mocks.cache.mockImplementation(async () => {
    const manifest = (await store.readImageManifest(OWNER_A, detail.artifact.id))!;
    manifest.retryAt = Date.now() + 30_000;
    await store.saveImageManifest(OWNER_A, detail.artifact.id, manifest);
  });
  await queue.runOfflineImageQueue(OWNER_A, client);
  await vi.advanceTimersByTimeAsync(30_001);
  expect(mocks.cache).toHaveBeenCalledTimes(2);
  await queue.stopOfflineImageQueue(OWNER_A);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(mocks.cache).toHaveBeenCalledTimes(2);
});
