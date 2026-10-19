import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalArtifactStore } from './artifactStore';
import { openNodeSqlite, OWNER_A, OWNER_B, reviewerDetail, draftDetail } from './localLibrary.testSupport';
import { migrateLocalLibrary } from './schema';

const mocks = vi.hoisted(() => ({ store: vi.fn(), request: vi.fn() }));
vi.mock('./localArtifactDatabase', () => ({ getLocalArtifactStore: mocks.store }));
vi.mock('../experienceApi', () => ({ experienceRequest: mocks.request }));
vi.mock('expo-file-system/legacy', () => ({ documentDirectory: null }));
const client = { baseUrl: 'https://example.test', accessToken: 'token' };
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); });
afterEach(async () => {
  const service = await import('./offlineCatchUp');
  await service.stopOfflineCatchUp(OWNER_A);
  await service.stopOfflineCatchUp(OWNER_B);
  vi.restoreAllMocks(); vi.useRealTimers();
});
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
  it('rechecks the list when sync or generation changes it during an existing flight', async () => {
    vi.useFakeTimers();
    const { service, store } = await setup();
    const detail = draftDetail();
    let resolve!: (value: unknown) => void;
    const page = new Promise(done => { resolve = done; });
    mocks.request.mockReturnValueOnce(page).mockImplementation(async (_client: unknown, path: string) => path.includes('?')
      ? { items: [detail.artifact], categories: null, nextOffset: null } : detail);
    const flight = service.runOfflineCatchUp(OWNER_A, client);
    expect(service.runOfflineCatchUp(OWNER_A, client, { force: true, changed: true })).toBe(flight);
    resolve({ items: [], categories: null, nextOffset: null });
    await flight;
    await vi.advanceTimersByTimeAsync(300);
    expect(await store.offlineStats(OWNER_A)).toMatchObject({ total: 1, current: 1 });
    expect(mocks.request.mock.calls.filter(([, path]) => String(path).includes('?'))).toHaveLength(2);
  });
  it('automatically continues after the 300-attempt limit, with one flight and per-item notifications', async () => {
    vi.useFakeTimers();
    const { service, store } = await setup();
    const details = Array.from({ length: 305 }, (_, n) => draftDetail({ id: `activity:${n}` }));
    mocks.request.mockImplementation(async (_client: unknown, path: string) => {
      const offset = Number(new URL(path, client.baseUrl).searchParams.get('offset'));
      return path.includes('?') ? { items: details.slice(offset, offset + 100).map(d => d.artifact), categories: null,
        nextOffset: offset + 100 < details.length ? offset + 100 : null }
        : details.find(d => path.endsWith(encodeURIComponent(d.artifact.id)));
    });
    const counts: number[] = [];
    const unsubscribe = service.subscribeOfflineLibrary(OWNER_A, () => {
      void store.offlineStats(OWNER_A).then(stats => counts.push(stats.current));
    });
    const first = service.runOfflineCatchUp(OWNER_A, client);
    expect(service.runOfflineCatchUp(OWNER_A, client, { force: true })).toBe(first);
    await vi.advanceTimersByTimeAsync(100);
    expect((await first).result?.bodyStoppedBy).toBe('limit');
    expect(await store.offlineStats(OWNER_A)).toMatchObject({ current: 300, total: 305 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(await store.offlineStats(OWNER_A)).toMatchObject({ current: 305, total: 305 });
    expect(mocks.request.mock.calls.filter(([, path]) => !String(path).includes('?'))).toHaveLength(305);
    expect(counts).toContain(1); expect(counts).toContain(299); expect(counts).toContain(305);
    expect(service.offlineCatchUpRunning(OWNER_A)).toBe(false);
    unsubscribe();
  });

  it('continues after the elapsed-time limit without another screen trigger', async () => {
    vi.useFakeTimers();
    const { service, store } = await setup();
    let now = 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const details = [draftDetail({ id: 'activity:a' }), draftDetail({ id: 'activity:b' })];
    mocks.request.mockImplementation(async (_client: unknown, path: string) => {
      if (path.includes('?')) return { items: details.map(d => d.artifact), categories: null, nextOffset: null };
      now = 61_001;
      return details.find(d => path.endsWith(encodeURIComponent(d.artifact.id)));
    });
    const first = await service.runOfflineCatchUp(OWNER_A, client);
    expect(first.result?.bodyStoppedBy).toBe('limit');
    expect(await store.offlineStats(OWNER_A)).toMatchObject({ current: 1 });
    await vi.advanceTimersByTimeAsync(300);
    expect(await store.offlineStats(OWNER_A)).toMatchObject({ current: 2 });
  });

  it('backs off a lost connection, recovers without navigation, and suspends all body admission in background', async () => {
    vi.useFakeTimers();
    const { service, store } = await setup();
    const detail = draftDetail();
    mocks.request.mockRejectedValueOnce({ code: 'connection' });
    await service.runOfflineCatchUp(OWNER_A, client);
    expect(service.offlineCatchUpError(OWNER_A)).toBe('connection');
    await vi.advanceTimersByTimeAsync(29_999);
    expect(mocks.request).toHaveBeenCalledTimes(1);
    mocks.request.mockImplementation(async (_client: unknown, path: string) => path.includes('?')
      ? { items: [detail.artifact], categories: null, nextOffset: null } : detail);
    await vi.advanceTimersByTimeAsync(10);
    expect(await store.offlineStats(OWNER_A)).toMatchObject({ current: 1 });
    expect(service.offlineCatchUpError(OWNER_A)).toBeNull();
    service.setOfflineCatchUpActive(OWNER_A, false);
    const calls = mocks.request.mock.calls.length;
    await vi.advanceTimersByTimeAsync(600_000);
    await service.runOfflineCatchUp(OWNER_A, client, { force: true });
    expect(mocks.request).toHaveBeenCalledTimes(calls);
    service.setOfflineCatchUpActive(OWNER_A, true);
    await service.runOfflineCatchUp(OWNER_A, client, { force: true });
    expect(mocks.request).toHaveBeenCalledTimes(calls + 1);
  });
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
    await expect(service.runOfflineCatchUp(OWNER_A, client, { force: true, changed: true }))
      .resolves.toEqual({ result: null, errorCode: null });
    resolve(reviewerDetail());
    await stopping; await flight; await store.clearBodies(OWNER_A);
    expect((await store.offlineStats(OWNER_A)).current).toBe(0);
    expect(service.offlineCatchUpRunning(OWNER_A)).toBe(false);
  });
});
