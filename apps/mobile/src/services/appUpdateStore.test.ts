import { describe, expect, it, vi } from 'vitest';
import { appUpdatePresentation, createAppUpdateStore, type AppUpdateState } from './appUpdateStore';
import type { LatestRelease } from '@stay-focused/shared';

const latest: LatestRelease = { versionName: '2.3.0', versionCode: 7, runtimeVersion: 'native-7', minSupportedVersionCode: null,
  apkUrl: 'https://github.com/galaxymaxp/stay-focused-releases/releases/download/v2.3.0+7/app.apk',
  releaseUrl: 'https://github.com/galaxymaxp/stay-focused-releases/releases/tag/v2.3.0+7', notes: 'Notes', publishedAt: '2026-10-19T00:00:00Z' };
const installed = { versionCode: 6, runtimeVersion: 'native-6' };
function setup() {
  let saved: string | null = null, time = 1000;
  const storage = { getItem: vi.fn(async () => saved), setItem: vi.fn(async (_key: string, value: string) => { saved = value; }) };
  const online = vi.fn(async () => true), load = vi.fn(async (): Promise<LatestRelease | null> => latest);
  const deps = { storage, online, load, now: () => time };
  return { store: createAppUpdateStore(deps), deps, advance: () => { time += 12 * 3600000; } };
}
describe('app update store', () => {
  it('persists dismissal per version, last result and check time across restart', async () => {
    const { store, deps } = setup(); await store.check();
    expect(appUpdatePresentation(store.getSnapshot(), installed).banner).toBe(true);
    await store.dismiss(7); expect(appUpdatePresentation(store.getSnapshot(), installed).banner).toBe(false);
    const restarted = createAppUpdateStore(deps); await restarted.hydrate();
    expect(restarted.getSnapshot()).toMatchObject({ dismissedVersionCode: 7, latest, lastCheckedAt: 1000, confirmed: true, online: false });
    deps.load.mockResolvedValue({ ...latest, versionCode: 8 });
    await restarted.check({ manual: true }); expect(appUpdatePresentation(restarted.getSnapshot(), installed).banner).toBe(true);
  });
  it('throttles launch/resume; manual checks bypass and concurrent checks coalesce', async () => {
    const { store, deps, advance } = setup(); await Promise.all([store.check(), store.check()]);
    await store.check(); expect(deps.load).toHaveBeenCalledTimes(1);
    await store.check({ manual: true }); expect(deps.load).toHaveBeenCalledTimes(2);
    advance(); await store.check(); expect(deps.load).toHaveBeenCalledTimes(3);
  });
  it('makes no request for an offline session and remains silent when unreachable', async () => {
    const { store, deps } = setup(); await store.check({ offline: true });
    expect(deps.online).not.toHaveBeenCalled(); expect(deps.load).not.toHaveBeenCalled();
    deps.online.mockResolvedValue(false); expect(await store.check({ manual: true })).toBe('silent');
    expect(deps.load).not.toHaveBeenCalled(); expect(store.getSnapshot().lastCheckedAt).toBeNull();
  });
  it('lets a manual check bypass a concurrent throttled resume probe', async () => {
    const {store,deps}=setup();await store.check();
    let connected!: (value:boolean) => void;
    deps.online.mockImplementationOnce(() => new Promise(done => { connected=done; }));
    const automatic=store.check();await vi.waitFor(() => expect(connected).toBeTypeOf('function'));
    const manual=store.check({manual:true});connected(true);
    expect(await manual).toBe('checked');await automatic;
    expect(deps.load).toHaveBeenCalledTimes(2);
  });
  it('rechecks after resuming while the prior background request is still in flight', async () => {
    const {store,deps}=setup();let resolve!: (value:LatestRelease) => void;
    deps.load.mockImplementationOnce(() => new Promise(done => {resolve=done;}));
    const first=store.check();await vi.waitFor(() => expect(deps.load).toHaveBeenCalled());
    store.suspend();const resumed=store.check();resolve(latest);await first;
    expect(await resumed).toBe('throttled');expect(store.getSnapshot().online).toBe(true);
    await store.check({manual:true});expect(store.getSnapshot().latest).toEqual(latest);
  });
  it('requires a successful online check to block; losing connectivity releases offline Library', async () => {
    const { store, deps } = setup(); deps.load.mockResolvedValue({ ...latest, minSupportedVersionCode: 7 });
    await store.check(); expect(appUpdatePresentation(store.getSnapshot(), installed)).toMatchObject({ unsupported: true, banner: false });
    deps.online.mockResolvedValue(false); await store.refreshOnline();
    expect(appUpdatePresentation(store.getSnapshot(), installed).unsupported).toBe(false);
    const restarted = createAppUpdateStore(deps); await restarted.hydrate();
    expect(appUpdatePresentation(restarted.getSnapshot(), installed).unsupported).toBe(false);
    deps.online.mockResolvedValue(true); await restarted.check();
    expect(appUpdatePresentation(restarted.getSnapshot(), installed).unsupported).toBe(true);
    expect(deps.load).toHaveBeenCalledTimes(1);
  });
  it('silences API errors, preserves dismissal and bounds automatic failed attempts', async () => {
    const { store, deps } = setup(); await store.dismiss(7); deps.load.mockRejectedValue(new Error('private detail'));
    expect(await store.check()).toBe('silent'); expect(store.getSnapshot()).toMatchObject({ online: false, confirmed: false, checking: false, dismissedVersionCode: 7 });
    await store.check(); expect(deps.load).toHaveBeenCalledTimes(1);
  });
  it('ignores an in-flight result after going offline/background', async () => {
    const { store, deps } = setup(); let resolve!: (value: LatestRelease) => void;
    deps.load.mockImplementation(() => new Promise(done => { resolve = done; }));
    const check = store.check(); await vi.waitFor(() => expect(deps.load).toHaveBeenCalled());
    store.suspend(); resolve({ ...latest, minSupportedVersionCode: 7 }); await check;
    expect(store.getSnapshot()).toMatchObject({ latest: null, confirmed: false, online: false });
  });
  it('survives corrupt/unavailable local storage', async () => {
    const { deps } = setup(); deps.storage.getItem.mockResolvedValue('invalid'); deps.storage.setItem.mockRejectedValue(new Error('full'));
    const store = createAppUpdateStore(deps); await store.check(); expect(store.getSnapshot().latest).toEqual(latest);
  });
  it('treats 204 as silent and clears a previous result', async () => {
    const { store, deps }=setup();await store.check();deps.load.mockResolvedValue(null);
    expect(await store.check({manual:true})).toBe('silent');
    expect(store.getSnapshot()).toMatchObject({latest:null,confirmed:false});
  });
  it('never shows a banner for the same runtime or an up-to-date build', () => {
    const state: AppUpdateState = { latest, online: true, confirmed: true, checking: false, lastCheckedAt: 1, lastAttemptAt: 1, dismissedVersionCode: null };
    expect(appUpdatePresentation(state, { ...installed, runtimeVersion: 'native-7' })).toMatchObject({ banner: false, unsupported: false });
    expect(appUpdatePresentation(state, { ...installed, versionCode: 7 })).toMatchObject({ banner: false, unsupported: false });
  });
});
