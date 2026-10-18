import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalArtifactStore } from './artifactStore';
import { openNodeSqlite, OWNER_A, OWNER_B, reviewerDetail } from './localLibrary.testSupport';
import { migrateLocalLibrary } from './schema';

const mocks = vi.hoisted(() => ({ store: vi.fn(), request: vi.fn() }));
vi.mock('./localArtifactDatabase', () => ({ getLocalArtifactStore: mocks.store }));
vi.mock('../experienceApi', () => ({ experienceRequest: mocks.request }));
const client = { baseUrl: 'https://example.test', accessToken: 'token' };
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); });
async function setup() {
  const { db } = openNodeSqlite();
  await migrateLocalLibrary(db);
  const store = createLocalArtifactStore(db);
  mocks.store.mockResolvedValue(store);
  mocks.request.mockImplementation(async (_client: unknown, path: string) => path.includes('?')
    ? { items: [reviewerDetail().artifact], categories: null, nextOffset: null }
    : reviewerDetail());
  return { store, service: await import('./offlineCatchUp') };
}
describe('offline catch-up', () => {
  it('forces catch-up after a completed generation has been stored', async () => {
    const { service, store } = await setup();
    const { storeCompletedGeneration } = await import('./deviceLibrary');
    const generation = { id: 'job', state: 'completed' as const, updatedAt: '2026-10-12T00:00:00Z', progress: null, artifactId: reviewerDetail().artifact.id, error: null };
    await storeCompletedGeneration(OWNER_A, client, generation);
    await service.runOfflineCatchUp(OWNER_A, client);
    expect((await store.offlineStats(OWNER_A)).current).toBe(0);
    expect(mocks.request.mock.calls.some(call => String(call[1]).includes('?'))).toBe(true);
  });
  it('shares one flight for concurrent callers, including forced calls', async () => {
    const { service, store } = await setup();
    const first = service.runOfflineCatchUp(OWNER_A, client);
    expect(service.runOfflineCatchUp(OWNER_A, client, { force: true })).toBe(first);
    await first;
    expect(mocks.request).toHaveBeenCalledTimes(2);
    expect((await store.offlineStats(OWNER_A)).current).toBe(0);
  });
  it('throttles successful runs for ten minutes; force and another owner bypass it', async () => {
    const { service } = await setup();
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    await service.runOfflineCatchUp(OWNER_A, client);
    mocks.request.mockClear();
    now.mockReturnValue(1001);
    await service.runOfflineCatchUp(OWNER_A, client);
    expect(mocks.request).not.toHaveBeenCalled();
    await service.runOfflineCatchUp(OWNER_A, client, { force: true });
    expect(mocks.request).toHaveBeenCalledTimes(1);
    await service.runOfflineCatchUp(OWNER_B, client);
    expect(mocks.request).toHaveBeenCalledTimes(3);
    mocks.request.mockClear(); now.mockReturnValue(601_002);
    await service.runOfflineCatchUp(OWNER_A, client);
    expect(mocks.request).toHaveBeenCalledTimes(1);
    now.mockRestore();
  });
  it('does nothing with a web/null store', async () => {
    const { service } = await setup(); mocks.store.mockResolvedValue(null);
    await expect(service.runOfflineCatchUp(OWNER_A, client)).resolves.toEqual({ result: null, errorCode: null });
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('never propagates failures or logs private provider text and retries failed runs', async () => {
    const { service } = await setup();
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    mocks.request.mockRejectedValue({ code: 'connection', message: 'private academic content' });
    await expect(service.runOfflineCatchUp(OWNER_A, client)).resolves.toMatchObject({ errorCode: 'connection' });
    await service.runOfflineCatchUp(OWNER_A, client);
    expect(mocks.request).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith('[offline-library]', 'connection');
    mocks.store.mockRejectedValue(new Error('private SQL'));
    await expect(service.runOfflineCatchUp(OWNER_A, client)).resolves.toMatchObject({ errorCode: 'unavailable' });
    log.mockRestore();
  });
  it('drains a cancelled body request before clearing copies', async () => {
    const { service, store } = await setup();
    let resolve!: (detail: ReturnType<typeof reviewerDetail>) => void;
    const detail = new Promise<ReturnType<typeof reviewerDetail>>(done => { resolve = done; });
    mocks.request.mockImplementation((_client: unknown, path: string) => path.includes('?')
      ? Promise.resolve({ items: [reviewerDetail().artifact], categories: null, nextOffset: null }) : detail);
    const flight = service.runOfflineCatchUp(OWNER_A, client);
    for (let i = 0; i < 30; i++) await Promise.resolve();
    const stopping = service.stopOfflineCatchUp(OWNER_A);
    resolve(reviewerDetail());
    await stopping; await flight; await store.clearBodies(OWNER_A);
    expect((await store.offlineStats(OWNER_A)).current).toBe(0);
    expect(service.offlineCatchUpRunning(OWNER_A)).toBe(false);
  });
});
