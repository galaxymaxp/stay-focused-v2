import type { ExperienceClient } from '../experienceApi';
import { getLocalArtifactStore } from './localArtifactDatabase';
import { notifyOfflineImages } from './imageManifest';

interface Flight { promise: Promise<void>; controller: AbortController; rerun: boolean }
const flights = new Map<string, Flight>();
const clients = new Map<string, ExperienceClient>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
// Only one owner normally runs at a time; a shared tail also keeps concurrency
// at two during account transitions. No native imports at module evaluation.
let tail: Promise<void> = Promise.resolve();
export function offlineImageQueueRunning(owner: string): boolean {
  return flights.has(owner) || timers.has(owner);
}
export function runOfflineImageQueue(owner: string, client: ExperienceClient): Promise<void> {
  clients.set(owner, client);
  const active = flights.get(owner);
  if (active) { active.rerun = true; return active.promise; }
  clearTimeout(timers.get(owner)); timers.delete(owner);
  const controller = new AbortController();
  const promise = tail.then(async () => {
    if (controller.signal.aborted || !owner || !client.accessToken) return;
    let files: typeof import('expo-file-system/legacy');
    try { files = await import('expo-file-system/legacy'); } catch { return; }
    if (!files.documentDirectory) return;
    const store = await getLocalArtifactStore();
    if (!store || controller.signal.aborted) return;
    const { cacheReviewerImages } = await import('./offlineImages');
    let retryAt = Infinity;
    for (const summary of await store.listSummaries(owner)) {
      if (controller.signal.aborted) break;
      if (summary.type !== 'reviewer') continue;
      const local = await store.readDetail(owner, summary.id);
      if (!local || local.bodyBehindCloud) continue;
      // Initialize a manifest for bodies written by builds before schema v9.
      if (!await store.readImageManifest(owner, summary.id)) await store.upsertDetail(owner, summary.id, local.detail);
      await cacheReviewerImages({ store, owner, detail: local.detail, client, signal: controller.signal, files });
      const manifest = await store.readImageManifest(owner, summary.id);
      if (manifest) {
        if (!manifest.discovered) retryAt = Math.min(retryAt, manifest.retryAt || Date.now() + 30_000);
        for (const image of manifest.images) if (image.status === 'failed' || image.status === 'pending') retryAt = Math.min(retryAt, image.retryAt || Date.now() + 30_000);
      }
    }
    if (!controller.signal.aborted && Number.isFinite(retryAt)) {
      const timer = setTimeout(() => {
        timers.delete(owner);
        const latest = clients.get(owner);
        if (latest) void runOfflineImageQueue(owner, latest);
      }, Math.max(30_000, retryAt - Date.now()));
      timers.set(owner, timer);
    }
  }).catch(() => { /* Text remains available; the manifest resumes on the next trigger. */ }).finally(() => {
    const rerun = flights.get(owner)?.rerun;
    flights.delete(owner);
    if (rerun && !controller.signal.aborted && clients.has(owner)) void runOfflineImageQueue(owner, clients.get(owner)!);
    notifyOfflineImages(owner);
  });
  flights.set(owner, { promise, controller, rerun: false });
  tail = promise;
  return promise;
}
/** Invalidate queued work and drain native downloads before clearing/sign-out. */
export async function stopOfflineImageQueue(owner: string): Promise<void> {
  clients.delete(owner);
  clearTimeout(timers.get(owner)); timers.delete(owner);
  const flight = flights.get(owner);
  flight?.controller.abort();
  await flight?.promise;
}
