import { afterEach, expect, it } from 'vitest';
import { selectTopic, TOPIC_PROMPT_VERSION, type TopicResult } from '@stay-focused/shared';
import { createLocalArtifactStore } from './artifactStore';
import { migrateLocalLibrary } from './schema';
import { openNodeSqlite, reviewerDetail, OWNER_A, OWNER_B } from './localLibrary.testSupport';

const handles: ReturnType<typeof openNodeSqlite>[] = [];
afterEach(() => { for (const handle of handles.splice(0)) handle.close(); });
async function setup() {
  const handle = openNodeSqlite(); handles.push(handle); await migrateLocalLibrary(handle.db);
  const detail = reviewerDetail(); if (!('reviewer' in detail)) throw new Error('fixture');
  const store = createLocalArtifactStore(handle.db); await store.upsertDetail(OWNER_A, detail.artifact.id, detail);
  const selection = selectTopic(detail.reviewer, detail.reviewer.sections[0]!.id)!;
  const result: TopicResult = { reviewerId: selection.reviewerId, sectionId: selection.sectionId, action: 'topic_simplify', contentHash: selection.contentHash, promptVersion: TOPIC_PROMPT_VERSION, text: 'Lead\n- **DNA**.', grounding: 'source', createdAt: '2026-10-16T00:00:00Z' };
  return { ...handle, store, selection, result };
}
it('persists topics through store recreation, isolates owners and checks exact canonical content', async () => {
  const { db, store, selection, result } = await setup();
  await store.writeTopic(OWNER_A, selection, result);
  const reopened = createLocalArtifactStore(db);
  expect(await reopened.readTopic(OWNER_A, selection, 'topic_simplify')).toEqual(result);
  expect(await reopened.readTopic(OWNER_B, selection, 'topic_simplify')).toBeNull();
  expect(await reopened.readTopic(OWNER_A, { ...selection, canonicalContent: 'hash collision' }, 'topic_simplify')).toBeNull();
  expect(await reopened.readTopic(OWNER_A, selection, 'topic_expound')).toBeNull();
});
it('artifact deletion prevents pending writes from repopulating private caches', async () => {
  const { store, selection, result } = await setup();
  await store.writeTopic(OWNER_A, selection, result);
  await store.removeArtifact(OWNER_A, selection.reviewerId);
  expect(await store.readTopic(OWNER_A, selection, 'topic_simplify')).toBeNull();
  await expect(store.writeTopic(OWNER_A, selection, result)).rejects.toThrow();
});
it('sign-out purges topic entries and malformed cache JSON is a miss', async () => {
  const { raw, store, selection, result } = await setup();
  await store.writeTopic(OWNER_A, selection, result);
  raw.exec("UPDATE study_assists SET result_json = 'broken'");
  expect(await store.readTopic(OWNER_A, selection, 'topic_simplify')).toBeNull();
  await store.writeTopic(OWNER_A, selection, result); await store.purgeOwner(OWNER_A);
  expect(await store.readTopic(OWNER_A, selection, 'topic_simplify')).toBeNull();
});
