import { runOfflineImageQueue, stopOfflineImageQueue, offlineImageQueueRunning } from './offlineImageQueue';
import { subscribeOfflineImages } from './imageManifest';
import type { ExperienceClient } from '../experienceApi';
import { libraryRemote } from './deviceLibrary';
import { getLocalArtifactStore } from './localArtifactDatabase';
import { reconcileLibrary, type ReconcileResult } from './librarySync';

export interface CatchUpOutcome {
  readonly result: ReconcileResult | null;
  readonly errorCode: string | null;
}
interface Flight {
  readonly promise: Promise<CatchUpOutcome>;
  readonly controller: AbortController;
  rerun: boolean;
}
// Owner-scoped flights prevent a newly signed-in owner joining another account's run.
const flights = new Map<string, Flight>();
const successfulAt = new Map<string, number>();
const suspended = new Set<string>();
const stopping = new Set<string>();
const clients = new Map<string, ExperienceClient>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const failures = new Map<string, number>();
const errors = new Map<string, string | null>();
const listeners = new Map<string, Set<() => void>>();
const THROTTLE_MS = 10 * 60_000;

export function subscribeOfflineLibrary(owner: string, listener: () => void): () => void {
  const subscriptions = listeners.get(owner) ?? new Set();
  subscriptions.add(listener);
  listeners.set(owner, subscriptions);
  const unsubscribeImages = subscribeOfflineImages(owner, listener);
  return () => {
    unsubscribeImages();
    subscriptions.delete(listener);
    if (!subscriptions.size) listeners.delete(owner);
  };
}
export function offlineCatchUpRunning(owner: string): boolean {
  return flights.has(owner) || timers.has(owner) || offlineImageQueueRunning(owner);
}
export function offlineCatchUpError(owner: string): string | null {
  return errors.get(owner) ?? null;
}
function notify(owner: string) {
  for (const listener of listeners.get(owner) ?? []) listener();
}

/** AppLifecycle owns admission; a Library blur never changes it. */
export function setOfflineCatchUpActive(owner: string, active: boolean): void {
  if (active) suspended.delete(owner);
  else {
    suspended.add(owner);
    clearTimeout(timers.get(owner));
    timers.delete(owner);
    flights.get(owner)?.controller.abort();
    notify(owner);
  }
}

function schedule(owner: string, delay: number): void {
  if (suspended.has(owner) || !clients.has(owner)) return;
  clearTimeout(timers.get(owner));
  timers.set(owner, setTimeout(() => {
    timers.delete(owner);
    const latest = clients.get(owner);
    if (latest && !suspended.has(owner)) void runOfflineCatchUp(owner, latest, { force: true });
  }, Math.max(250, delay)));
}

function retryDelay(owner: string): number {
  const count = failures.get(owner) ?? 0;
  failures.set(owner, count + 1);
  return Math.min(5 * 60_000, 30_000 * 2 ** Math.min(count, 4));
}

/** Reads owned cloud artifacts only. No sync/generation jobs, no propagated errors. */
export function runOfflineCatchUp(
  ownerUserId: string,
  client: ExperienceClient,
  options: { readonly force?: boolean; readonly changed?: boolean } = {},
): Promise<CatchUpOutcome> {
  if (!ownerUserId || suspended.has(ownerUserId) || stopping.has(ownerUserId)) return Promise.resolve({ result: null, errorCode: null });
  clients.set(ownerUserId, client);
  const flight = flights.get(ownerUserId);
  if (flight) {
    flight.rerun ||= options.changed === true;
    return flight.controller.signal.aborted
      ? flight.promise.then(() => runOfflineCatchUp(ownerUserId, client, options)) : flight.promise;
  }
  clearTimeout(timers.get(ownerUserId));
  timers.delete(ownerUserId);
  const last = successfulAt.get(ownerUserId);
  if (!ownerUserId || (!options.force && last !== undefined && Date.now() - last < THROTTLE_MS)) {
    if (ownerUserId) void runOfflineImageQueue(ownerUserId, client);
    return Promise.resolve({ result: null, errorCode: null });
  }
  const controller = new AbortController();
  const promise = Promise.resolve().then(async (): Promise<CatchUpOutcome> => {
    try {
      const store = await getLocalArtifactStore();
      if (!store || controller.signal.aborted) return { result: null, errorCode: null };
      const result = await reconcileLibrary({
        store, ownerUserId, remote: libraryRemote(client, controller.signal),
        isCancelled: () => controller.signal.aborted,
        onListReconciled: () => { errors.set(ownerUserId, null); notify(ownerUserId); },
        onProgress: () => { notify(ownerUserId); void runOfflineImageQueue(ownerUserId, client); },
      });
      void runOfflineImageQueue(ownerUserId, client);
      if (controller.signal.aborted) return { result, errorCode: null };
      const retryAt = await store.nextBodyRetryAt(ownerUserId, true);
      if (controller.signal.aborted) return { result, errorCode: null };
      errors.set(ownerUserId, result.bodyStoppedBy === 'offline' ? 'connection' : null);
      if (result.bodyStoppedBy === 'offline') {
        // No native reconnect listener exists: an idle, backed-off admission
        // while active also recovers a connection without requiring navigation.
        schedule(ownerUserId, retryDelay(ownerUserId));
      } else if (retryAt !== null || result.bodyStoppedBy === 'limit') {
        failures.delete(ownerUserId);
        schedule(ownerUserId, Math.max(250, (retryAt ?? 0) - Date.now()));
      } else if (result.listComplete && result.bodyStoppedBy === 'done') {
        failures.delete(ownerUserId);
        successfulAt.set(ownerUserId, Date.now());
      }
      return { result, errorCode: result.bodyStoppedBy === 'offline' ? 'connection' : null };
    } catch (error) {
      const code = safeCode(error);
      if (!controller.signal.aborted) errors.set(ownerUserId, code);
      if (!controller.signal.aborted) console.info('[offline-library]', code);
      if (!controller.signal.aborted && code !== 'sign_in_required' && code !== 'permission_denied') {
        schedule(ownerUserId, retryDelay(ownerUserId));
      }
      return { result: null, errorCode: controller.signal.aborted ? null : code };
    } finally {
      const rerun = flights.get(ownerUserId)?.rerun;
      flights.delete(ownerUserId);
      if (rerun && !controller.signal.aborted && !errors.get(ownerUserId)) {
        schedule(ownerUserId, 250);
      }
      notify(ownerUserId);
    }
  });
  flights.set(ownerUserId, { promise, controller, rerun: false });
  notify(ownerUserId);
  return promise;
}

/** Drain pending writes before clearing copies or purging a signed-out owner. */
export async function stopOfflineCatchUp(ownerUserId: string): Promise<void> {
  stopping.add(ownerUserId);
  clearTimeout(timers.get(ownerUserId));
  timers.delete(ownerUserId);
  clients.delete(ownerUserId);
  failures.delete(ownerUserId);
  errors.delete(ownerUserId);
  const flight = flights.get(ownerUserId);
  flight?.controller.abort();
  try {
    await flight?.promise;
    await stopOfflineImageQueue(ownerUserId);
    successfulAt.delete(ownerUserId);
  } finally {
    stopping.delete(ownerUserId);
  }
}

function safeCode(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
  return typeof code === 'string' && ['connection', 'sign_in_required', 'permission_denied',
    'not_found', 'server_error', 'unavailable', 'rate_limited', 'invalid_response'].includes(code)
    ? code : 'unavailable';
}
