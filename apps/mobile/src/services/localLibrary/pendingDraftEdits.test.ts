import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLocalArtifactStore } from './artifactStore';
import { migrateLocalLibrary } from './schema';
import { draftDetail, quizDetail, reviewerDetail, openNodeSqlite, OWNER_A, OWNER_B } from './localLibrary.testSupport';
import { replayPendingDraftEdits } from './pendingDraftSync';
import type { ActivityDraftContent, OfflineDraftSaveResult, QuizAnswerKey } from '@stay-focused/shared';

const handles: ReturnType<typeof openNodeSqlite>[] = [];
afterEach(() => { for (const h of handles.splice(0)) h.close(); });
async function setup() {
  const h = openNodeSqlite(); handles.push(h); await migrateLocalLibrary(h.db);
  const store = createLocalArtifactStore(h.db), detail = draftDetail();
  if (!('draft' in detail)) throw new Error('draft_fixture');
  const draft = detail.draft;
  await store.upsertDetail(OWNER_A, detail.artifact.id, detail);
  const content: ActivityDraftContent = { title: 'Edited offline', sections: draft.sections, slides: draft.slides };
  await store.queueDraftEdit(OWNER_A, draft.id, draft.revision, content, 'edit-1');
  const confirmed: OfflineDraftSaveResult = { draft: { ...draft, ...content, revision: draft.revision + 1, updatedAt: '2026-10-14T00:00:00Z' }, conflict: false, copyId: null, replayed: false };
  return { h, store, detail, draft, content, confirmed };
}
describe('offline Draft SQLite queue', () => {
  it('upgrades schema 6 to 7 without losing bodies, drafts, Quiz keys or practice', async () => {
    const h = openNodeSqlite(); handles.push(h);
    await migrateLocalLibrary(h.db);
    // Reconstruct the shipped v6 schema, which has no offline Draft tables.
    h.raw.exec('DROP TABLE pending_draft_edits; DROP TABLE draft_sync_receipts; PRAGMA user_version = 6;');
    const store = createLocalArtifactStore(h.db);
    const body = reviewerDetail(), detail = draftDetail(), quiz = quizDetail();
    if (!('draft' in detail) || !('quiz' in quiz)) throw new Error('upgrade_fixture');
    for (const value of [body, detail, quiz]) await store.upsertDetail(OWNER_A, value.artifact.id, value);
    const key: QuizAnswerKey = { quizId: quiz.quiz.id, versionId: 'existing-key',
      questions: [{ id: 'q1', correctOptionIds: ['a'], explanation: 'Synthetic explanation' }] };
    const practice = { attempt: null, result: null, selected: ['a'], dirty: true };
    await store.saveQuizAnswerKey(OWNER_A, key, quiz.artifact.updatedAt);
    await store.saveQuizPractice(OWNER_A, key.quizId, practice);

    await expect(migrateLocalLibrary(h.db)).resolves.toBe(7);
    const upgraded = createLocalArtifactStore(h.db);
    for (const value of [body, detail, quiz]) {
      expect((await upgraded.readDetail(OWNER_A, value.artifact.id))?.detail).toEqual(value);
    }
    expect(await upgraded.readQuizAnswerKey(OWNER_A, key.quizId, quiz.artifact.updatedAt)).toEqual(key);
    expect(await upgraded.readQuizPractice(OWNER_A, key.quizId)).toEqual(practice);
    expect(h.raw.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='pending_draft_edits'").get()).toEqual({ name: 'pending_draft_edits' });
    const content = { title: 'First edit after upgrade', sections: detail.draft.sections, slides: detail.draft.slides };
    await upgraded.queueDraftEdit(OWNER_A, detail.draft.id, detail.draft.revision, content, 'upgrade-edit');
    expect(await upgraded.readPendingDraftEdit(OWNER_A, detail.draft.id)).toMatchObject({ content, baseRevision: detail.draft.revision, clientEditId: 'upgrade-edit' });
  });
  it('overwrites text while preserving first base/id; overlays reopening; owner isolation, storage clearing and deletion', async () => {
    const { store, draft, content, detail } = await setup();
    await store.queueDraftEdit(OWNER_A, draft.id, 99, { ...content, title: 'Latest device text' }, 'ignored-new-id');
    expect(await store.readPendingDraftEdit(OWNER_A, draft.id)).toMatchObject({ clientEditId: 'edit-1', baseRevision: draft.revision, content: { title: 'Latest device text' } });
    expect(await store.readPendingDraftEdit(OWNER_B, draft.id)).toBeNull();
    expect((await store.readDetail(OWNER_A, detail.artifact.id))?.detail).toMatchObject({ draft: { title: 'Latest device text' } });
    await store.clearBodies(OWNER_A);
    expect((await store.readDetail(OWNER_A, detail.artifact.id))?.detail).toMatchObject({ draft: { title: 'Latest device text' } });
    await store.removeArtifact(OWNER_A, detail.artifact.id);
    expect(await store.readPendingDraftEdit(OWNER_A, draft.id)).toBeNull();
  });
  it('sign-out purges only the owner queue and conflict receipt', async () => {
    const { store, draft, content, confirmed } = await setup();
    await store.queueDraftEdit(OWNER_B, draft.id, 1, content, 'edit-b');
    const sent = (await store.prepareDraftEdit(OWNER_A, draft.id))!;
    await store.finishDraftEdit(OWNER_A, sent, { ...confirmed, conflict: true, copyId: 'copy' }, 'next');
    await store.queueDraftEdit(OWNER_A, draft.id, 2, content, 'new');
    await store.purgeOwner(OWNER_A);
    expect(await store.listPendingDraftEdits(OWNER_A)).toEqual([]);
    expect(await store.readDraftCopyReceipt(OWNER_A, draft.id)).toBeNull();
    expect(await store.listPendingDraftEdits(OWNER_B)).toHaveLength(1);
  });
  it.each(['success', 'conflict', 'replayed'] as const)('persists confirmed body before deleting queue for %s', async mode => {
    const { store, draft, confirmed, detail } = await setup();
    const result = { ...confirmed, conflict: mode === 'conflict', copyId: mode === 'conflict' ? 'copy' : null, replayed: mode === 'replayed' };
    const onConfirmed = vi.fn();
    await replayPendingDraftEdits({ owner: OWNER_A, store, send: vi.fn(async () => result), newId: async () => 'next', onConfirmed });
    expect(await store.readPendingDraftEdit(OWNER_A, draft.id)).toBeNull();
    expect((await store.readDetail(OWNER_A, detail.artifact.id))?.detail).toMatchObject({ draft: { revision: result.draft.revision } });
    expect(await store.readDraftCopyReceipt(OWNER_A, draft.id)).toBe(result.copyId);
    expect(onConfirmed).toHaveBeenCalledWith(result);
  });
  it.each(['connection', 'activity_draft_not_found', 'invalid_request'] as const)('handles %s without losing pending text or loop retry', async code => {
    const { store, draft } = await setup();
    const send = vi.fn(async () => { throw { code }; });
    const options = { owner: OWNER_A, store, send, newId: async () => 'next' };
    await replayPendingDraftEdits(options);
    const pending = await store.readPendingDraftEdit(OWNER_A, draft.id);
    if (code === 'activity_draft_not_found') expect(pending).toBeNull();
    else expect(pending).toMatchObject({ state: code === 'invalid_request' ? 'needs_attention' : 'pending', content: { title: 'Edited offline' } });
    if (code === 'invalid_request') {
      await replayPendingDraftEdits(options); expect(send).toHaveBeenCalledTimes(1);
      await store.retryDraftEdit(OWNER_A, draft.id);
      expect(await store.readPendingDraftEdit(OWNER_A, draft.id)).toMatchObject({ state: 'pending', sentContent: null });
    }
  });
  it('freezes the sent snapshot across lost response; edits during replay remain queued under a new id after success', async () => {
    const { store, draft, content, confirmed } = await setup();
    await replayPendingDraftEdits({ owner: OWNER_A, store, send: async () => { throw { code: 'connection' }; }, newId: async () => 'next' });
    await store.queueDraftEdit(OWNER_A, draft.id, 77, { ...content, title: 'Typed after lost response' }, 'ignored');
    const send = vi.fn(async edit => { expect(edit.sentContent.title).toBe('Edited offline'); return { ...confirmed, replayed: true }; });
    await replayPendingDraftEdits({ owner: OWNER_A, store, send, newId: async () => 'next' });
    expect(send).toHaveBeenCalledTimes(1);
    expect(await store.readPendingDraftEdit(OWNER_A, draft.id)).toMatchObject({ clientEditId: 'next', baseRevision: confirmed.draft.revision, sentContent: null, content: { title: 'Typed after lost response' } });
  });
  it('aborted sign-out cannot repopulate rows or publish results', async () => {
    const { store, draft, confirmed } = await setup(); let cancelled = false;
    await replayPendingDraftEdits({ owner: OWNER_A, store, newId: async () => 'next', cancelled: () => cancelled,
      send: async () => { cancelled = true; await store.purgeOwner(OWNER_A); return confirmed; } });
    expect(await store.readPendingDraftEdit(OWNER_A, draft.id)).toBeNull();
    expect(await store.listSummaries(OWNER_A)).toEqual([]);
  });
});
