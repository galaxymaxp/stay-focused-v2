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
}
// Owner-scoped flights prevent a newly signed-in owner joining another account's run.
const flights = new Map<string, Flight>();
const successfulAt = new Map<string, number>();
const listeners = new Map<string, Set<() => void>>();
const THROTTLE_MS = 10 * 60_000;

export function subscribeOfflineLibrary(owner: string, listener: () => void): () => void {
  const subscriptions = listeners.get(owner) ?? new Set();
  subscriptions.add(listener);
  listeners.set(owner, subscriptions);
  return () => {
    subscriptions.delete(listener);
    if (!subscriptions.size) listeners.delete(owner);
  };
}
export function offlineCatchUpRunning(owner: string): boolean {
  return flights.has(owner);
}
function notify(owner: string) {
  for (const listener of listeners.get(owner) ?? []) listener();
}

/** Reads owned cloud artifacts only. No sync/generation jobs, no propagated errors. */
export function runOfflineCatchUp(
  ownerUserId: string,
  client: ExperienceClient,
  options: { readonly force?: boolean } = {},
): Promise<CatchUpOutcome> {
  const flight = flights.get(ownerUserId);
  if (flight) return flight.promise;
  const last = successfulAt.get(ownerUserId);
  if (!ownerUserId || (!options.force && last !== undefined && Date.now() - last < THROTTLE_MS)) {
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
        onListReconciled: () => notify(ownerUserId),
        onProgress: () => notify(ownerUserId),
      });
      // Incomplete catch-ups resume on the next trigger without a ten-minute delay.
      const stats = await store.offlineStats(ownerUserId);
      if (result.listComplete && result.bodyStoppedBy === 'done' && stats.current === stats.total) {
        successfulAt.set(ownerUserId, Date.now());
      }
      return { result, errorCode: result.bodyStoppedBy === 'offline' ? 'connection' : null };
    } catch (error) {
      const code = safeCode(error);
      if (!controller.signal.aborted) console.info('[offline-library]', code);
      return { result: null, errorCode: controller.signal.aborted ? null : code };
    } finally {
      flights.delete(ownerUserId);
      notify(ownerUserId);
    }
  });
  flights.set(ownerUserId, { promise, controller });
  notify(ownerUserId);
  return promise;
}

/** Drain pending writes before clearing copies or purging a signed-out owner. */
export async function stopOfflineCatchUp(ownerUserId: string): Promise<void> {
  const flight = flights.get(ownerUserId);
  flight?.controller.abort();
  await flight?.promise;
  successfulAt.delete(ownerUserId);
}

function safeCode(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
  return typeof code === 'string' && ['connection', 'sign_in_required', 'permission_denied',
    'not_found', 'server_error', 'unavailable', 'rate_limited', 'invalid_response'].includes(code)
    ? code : 'unavailable';
}
