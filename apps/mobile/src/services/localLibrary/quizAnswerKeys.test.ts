import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { QuizAnswerKey } from '@stay-focused/shared';
import { createLocalArtifactStore } from './artifactStore';
import { OWNER_A, OWNER_B, openNodeSqlite, quizDetail } from './localLibrary.testSupport';
import { migrateLocalLibrary } from './schema';
import { hydrateLibraryBodies, refreshArtifactDetail } from './librarySync';
import { libraryRemote } from './deviceLibrary';
import { parseQuizAnswerKey } from './quizAnswerKeys';

const detail = quizDetail();
if (!('quiz' in detail)) throw new Error('fixture');
const key: QuizAnswerKey = { quizId: detail.quiz.id, versionId: 'version-one',
  questions: [{ id: 'q1', correctOptionIds: ['a'], explanation: 'Synthetic explanation' }] };
const cleanups: (() => void)[] = [];
afterEach(() => { while (cleanups.length) cleanups.pop()!(); });
async function setup() {
  const handle = openNodeSqlite(); cleanups.push(handle.close);
  await migrateLocalLibrary(handle.db);
  return { ...handle, store: createLocalArtifactStore(handle.db) };
}

describe('owner-scoped device quiz keys', () => {
  it('retains the separate key after closing and reopening the SQLite file', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'sf-offline-keys-'));
    cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
    const path = join(directory, 'library.db');
    const first = openNodeSqlite(path);
    await migrateLocalLibrary(first.db);
    const store = createLocalArtifactStore(first.db);
    await store.upsertDetail(OWNER_A, detail.artifact.id, detail);
    await store.saveQuizAnswerKey(OWNER_A, key, detail.artifact.updatedAt);
    first.close();
    const second = openNodeSqlite(path); cleanups.push(second.close);
    await migrateLocalLibrary(second.db);
    expect(await createLocalArtifactStore(second.db).readQuizAnswerKey(OWNER_A, key.quizId, detail.artifact.updatedAt)).toEqual(key);
  });
  it('upgrades the prior schema without losing bodies or drafts', async () => {
    const { db, raw, store } = await setup();
    await store.upsertDetail(OWNER_A, detail.artifact.id, detail);
    await store.saveQuizPractice(OWNER_A, key.quizId, { attempt: null, result: null, selected: ['draft'], dirty: true });
    raw.exec('DROP TABLE quiz_answer_keys; PRAGMA user_version = 5;');
    await expect(migrateLocalLibrary(db)).resolves.toBe(7);
    expect(await store.readDetail(OWNER_A, detail.artifact.id)).not.toBeNull();
    expect(await store.readQuizPractice(OWNER_A, key.quizId)).toMatchObject({ selected: ['draft'] });
  });
  it('keeps keys separate, isolates owners, and invalidates old body revisions', async () => {
    const { store, db } = await setup();
    await store.upsertDetail(OWNER_A, detail.artifact.id, detail);
    await store.saveQuizAnswerKey(OWNER_A, key, detail.artifact.updatedAt);
    // Recreate the store as on restart, using the persisted SQLite state.
    const reopened = createLocalArtifactStore(db);
    expect(await reopened.readQuizAnswerKey(OWNER_A, key.quizId, detail.artifact.updatedAt)).toEqual(key);
    expect(await reopened.readQuizAnswerKey(OWNER_B, key.quizId, detail.artifact.updatedAt)).toBeNull();
    expect(await reopened.readDetail(OWNER_A, detail.artifact.id)).toMatchObject({ detail });
    expect(JSON.stringify((await reopened.readDetail(OWNER_A, detail.artifact.id))?.detail)).not.toContain('correctOptionIds');
    expect(await reopened.readQuizAnswerKey(OWNER_A, key.quizId, 'new-revision')).toBeNull();
  });
  it.each(['purgeOwner', 'clearBodies', 'removeArtifact'] as const)('%s removes only the intended owner keys and rejects late writes', async action => {
    const { store } = await setup();
    for (const owner of [OWNER_A, OWNER_B]) {
      await store.upsertDetail(owner, detail.artifact.id, detail);
      await store.saveQuizAnswerKey(owner, key, detail.artifact.updatedAt);
    }
    if (action === 'removeArtifact') await store.removeArtifact(OWNER_A, detail.artifact.id);
    else await store[action](OWNER_A);
    await store.saveQuizAnswerKey(OWNER_A, key, detail.artifact.updatedAt);
    expect(await store.readQuizAnswerKey(OWNER_A, key.quizId, detail.artifact.updatedAt)).toBeNull();
    expect(await store.readQuizAnswerKey(OWNER_B, key.quizId, detail.artifact.updatedAt)).toEqual(key);
  });
  it('rejects malformed keys and keys for different questions', async () => {
    const { store, raw } = await setup();
    await store.upsertDetail(OWNER_A, detail.artifact.id, detail);
    expect(parseQuizAnswerKey('{', key.quizId)).toBeNull();
    expect(parseQuizAnswerKey(JSON.stringify({ ...key, questions: [key.questions[0], key.questions[0]] }), key.quizId)).toBeNull();
    await expect(store.saveQuizAnswerKey(OWNER_A, { ...key, questions: [{ ...key.questions[0]!, id: 'q2' }] }, detail.artifact.updatedAt)).rejects.toThrow('quiz_key_mismatch');
    await store.saveQuizAnswerKey(OWNER_A, key, detail.artifact.updatedAt);
    raw.prepare("UPDATE quiz_answer_keys SET version_id = 'wrong'").run();
    expect(await store.readQuizAnswerKey(OWNER_A, key.quizId, detail.artifact.updatedAt)).toBeNull();
  });
  it('hydrates keys in existing batches and retries key failures without blocking the body', async () => {
    const { store } = await setup();
    await store.upsertSummaries(OWNER_A, [detail.artifact]);
    const remote = { fetchPage: vi.fn(), fetchDetail: vi.fn(async () => detail), fetchQuizAnswerKey: vi.fn(async () => key) };
    remote.fetchQuizAnswerKey.mockRejectedValueOnce(new Error('unavailable'));
    expect(await hydrateLibraryBodies({ store, ownerUserId: OWNER_A, remote })).toMatchObject({ hydrated: 1, stoppedBy: 'done' });
    expect(await store.readDetail(OWNER_A, detail.artifact.id)).not.toBeNull();
    expect(await store.readQuizAnswerKey(OWNER_A, key.quizId, detail.artifact.updatedAt)).toBeNull();
    await hydrateLibraryBodies({ store, ownerUserId: OWNER_A, remote });
    expect(await store.readQuizAnswerKey(OWNER_A, key.quizId, detail.artifact.updatedAt)).toEqual(key);
    expect(await hydrateLibraryBodies({ store, ownerUserId: OWNER_A, remote })).toMatchObject({ hydrated: 0 });
    const newer = quizDetail({ updatedAt: '2026-10-13T00:00:00Z' });
    if (!('quiz' in newer)) throw new Error('fixture');
    await store.upsertSummaries(OWNER_A, [newer.artifact]);
    remote.fetchDetail.mockResolvedValue(newer);
    remote.fetchQuizAnswerKey.mockResolvedValue({ ...key, versionId: 'version-two' });
    await hydrateLibraryBodies({ store, ownerUserId: OWNER_A, remote });
    expect(await store.readQuizAnswerKey(OWNER_A, key.quizId, newer.artifact.updatedAt)).toMatchObject({ versionId: 'version-two' });
  });
  it('does not save an in-flight key after cancellation', async () => {
    const { store } = await setup(); let cancelled = false;
    await refreshArtifactDetail({ store, ownerUserId: OWNER_A, artifactId: detail.artifact.id,
      remote: { fetchDetail: async () => detail, fetchQuizAnswerKey: async () => { cancelled = true; return key; } },
      isCancelled: () => cancelled });
    expect(await store.readQuizAnswerKey(OWNER_A, key.quizId, detail.artifact.updatedAt)).toBeNull();
  });
  it('fetches keys through the authenticated client without exposing them in a body request', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ ok: true, data: key }));
    await libraryRemote({ baseUrl: 'https://example.test', accessToken: 'synthetic-token', fetchImpl }).fetchQuizAnswerKey!(key.quizId);
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining(`/quizzes/${key.quizId}/answer-key`),
      expect.objectContaining({ method: 'GET', headers: expect.objectContaining({ Authorization: 'Bearer synthetic-token' }) }));
  });
});
