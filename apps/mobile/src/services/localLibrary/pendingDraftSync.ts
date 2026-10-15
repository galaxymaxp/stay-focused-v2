import type { OfflineDraftSaveResult } from '@stay-focused/shared';
import { experienceRequest, type ExperienceClient } from '../experienceApi';
import type { LocalArtifactStore } from './artifactStore';
import { getLocalArtifactStore } from './localArtifactDatabase';

export function draftErrorCode(error: unknown): string | null {
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' ? error.code : null;
}
export async function newDraftEditId(): Promise<string> { return (await import('expo-crypto')).randomUUID(); }
const listeners = new Map<string, Set<() => void>>();
export function subscribeDraftEdits(owner: string, listener: () => void): () => void {
  const set = listeners.get(owner) ?? new Set(); set.add(listener); listeners.set(owner, set);
  return () => { set.delete(listener); if (!set.size) listeners.delete(owner); };
}
export function notifyDraftEdits(owner: string) { for (const fn of listeners.get(owner) ?? []) fn(); }

/** One bounded pass, sequential drafts. Injected transport keeps tests local. */
export async function replayPendingDraftEdits(options: {
  owner: string; store: LocalArtifactStore;
  send: (edit: import('./pendingDraftStore').PendingDraftEdit) => Promise<OfflineDraftSaveResult>;
  newId: () => Promise<string>; cancelled?: () => boolean;
  onConfirmed?: (result: OfflineDraftSaveResult) => void;
}): Promise<void> {
  const { owner, store } = options;
  const rows = await store.listPendingDraftEdits(owner);
  for (const row of rows) {
    if (options.cancelled?.()) return;
    if (row.state === 'needs_attention') continue;
    const sent = await store.prepareDraftEdit(owner, row.draftId);
    if (!sent || options.cancelled?.()) continue;
    try {
      const result = await options.send(sent);
      if (options.cancelled?.()) return;
      const local = await store.readDetail(owner, `activity:${row.draftId}`);
      if (!local || !('draft' in local.detail)) throw new Error('draft_device_body_missing');
      // Persist the confirmed version before acknowledging the device row.
      await store.upsertDetail(owner, local.detail.artifact.id, {
        artifact: { ...local.detail.artifact, title: result.draft.title, updatedAt: result.draft.updatedAt }, draft: result.draft,
      });
      if (options.cancelled?.()) return;
      await store.finishDraftEdit(owner, sent, result, await options.newId());
      options.onConfirmed?.(result);
    } catch (error) {
      if (options.cancelled?.()) return;
      const code = draftErrorCode(error);
      if (code === 'connection') return;
      if (code === 'activity_draft_not_found') {
        await store.removeArtifact(owner, `activity:${row.draftId}`);
        console.info('[offline-draft]', 'activity_draft_not_found');
      } else if (code === 'invalid_request') {
        await store.markDraftEditAttention(owner, row.draftId);
      } else return; // Auth/server errors await the next authorized trigger too.
    }
  }
}
interface Flight { promise: Promise<void>; controller: AbortController }
const flights = new Map<string, Flight>();
export function syncPendingDraftEdits(owner: string, client: ExperienceClient): Promise<void> {
  const running = flights.get(owner); if (running) return running.promise;
  if (!owner) return Promise.resolve();
  const controller = new AbortController();
  const promise = Promise.resolve().then(async () => {
    const store = await getLocalArtifactStore();
    if (!store || controller.signal.aborted) return;
    await replayPendingDraftEdits({ owner, store, newId: newDraftEditId, cancelled: () => controller.signal.aborted,
      send: edit => experienceRequest<OfflineDraftSaveResult>(client,
        `/api/experience/activity-drafts/${encodeURIComponent(edit.draftId)}/offline-save`,
        { method: 'POST', body: { baseRevision: edit.baseRevision, content: edit.sentContent ?? edit.content, clientEditId: edit.clientEditId }, signal: controller.signal }),
      onConfirmed: () => notifyDraftEdits(owner),
    });
  }).catch(() => { /* Keep every row when storage/transport is unavailable. */ }).finally(() => {
    flights.delete(owner); notifyDraftEdits(owner);
  });
  flights.set(owner, { promise, controller });
  return promise;
}
/** Abort and drain before sign-out purges owner rows. */
export async function stopPendingDraftSync(owner: string): Promise<void> {
  const flight = flights.get(owner); flight?.controller.abort(); await flight?.promise;
}
