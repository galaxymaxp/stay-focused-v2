import { expect, it, vi } from 'vitest';
import { createTopicAssist, isTopicResult, selectTopic, topicCacheKey, topicLevelAction, TOPIC_ACTIONS, TOPIC_PROMPT_VERSION, type TopicResult } from './topic-assist';
import type { ReviewerReaderModel } from './experience';

const reviewer: ReviewerReaderModel = { id: 'artifact:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', title: 'Cells', course: null, source: { id: 's', title: 'Lesson' }, generatedAt: '2026-10-16T00:00:00Z', freshness: 'current',
  sections: [{ id: 's', title: 'Cells', blocks: [{ id: 'b', title: 'Nucleus', explanation: 'The nucleus contains DNA.', keyPoints: ['Preserve this point.'], evidence: [] }] }] };
const selection = selectTopic(reviewer, 's')!;
const result = (action: typeof TOPIC_ACTIONS[number]): TopicResult => ({ reviewerId: reviewer.id, sectionId: 's', action, contentHash: selection.contentHash, promptVersion: TOPIC_PROMPT_VERSION, grounding: 'source', text: 'Lead\n- **DNA** is inside.', createdAt: '2026-10-16T00:00:00Z' });
it('Original has no model action; hash covers every section body field and no other topic', () => {
  expect(topicLevelAction('original')).toBeNull(); expect(topicLevelAction('simplify')).toBe('topic_simplify');
  expect(topicLevelAction('explain_simply')).toBe('topic_explain_simply');
  expect(selectTopic(reviewer, 'missing')).toBeNull();
  const changed = { ...reviewer, sections: [{ ...reviewer.sections[0]!, blocks: [{ ...reviewer.sections[0]!.blocks[0]!, keyPoints: ['Changed'] }] }] };
  expect(selectTopic(changed, 's')!.contentHash).not.toBe(selection.contentHash);
  expect(selectTopic({ ...reviewer, title: 'Different other metadata' }, 's')!.contentHash).toBe(selection.contentHash);
  expect(new Set(TOPIC_ACTIONS.map(a => topicCacheKey(selection, a))).size).toBe(3);
});
it.each(TOPIC_ACTIONS)('%s deduplicates then persists for a new offline client session', async action => {
  const cache = new Map<string, unknown>(); const generate = vi.fn(async () => result(action));
  const deps = { read: async (owner: string, s: typeof selection, a: typeof action) => cache.get(owner + topicCacheKey(s, a)),
    write: async (owner: string, s: typeof selection, r: TopicResult) => { cache.set(owner + topicCacheKey(s, r.action), r); }, generate };
  const client = createTopicAssist(deps);
  await Promise.all([client.run('owner', {}, selection, action, true), client.run('owner', {}, selection, action, true)]);
  await createTopicAssist(deps).run('owner', {}, selection, action, false);
  expect(generate).toHaveBeenCalledOnce(); expect(generate).toHaveBeenCalledWith({}, { reviewerId: reviewer.id, sectionId: 's', action });
  await expect(client.run('another-owner', {}, selection, action, false)).rejects.toThrow('offline');
  expect(await client.peek('owner', { ...selection, canonicalContent: 'changed', contentHash: 'new' }, action)).toBeNull();
});
it('validates cached identity, version, bounds and grounding; failures can retry', async () => {
  const r = result('topic_expound');
  for (const change of [{ contentHash: 'stale' }, { promptVersion: 'old' }, { text: 'x'.repeat(6001) }, { text: '\u0000' }, { grounding: 'general' }, { createdAt: 'bad' }])
    expect(isTopicResult({ ...r, ...change }, selection, 'topic_expound')).toBe(false);
  const generate = vi.fn().mockRejectedValueOnce(new Error('temporary')).mockResolvedValue(r);
  const client = createTopicAssist({ read: async () => null, write: async () => undefined, generate });
  await expect(client.run('owner', {}, selection, 'topic_expound', true)).rejects.toThrow('temporary');
  await expect(client.run('owner', {}, selection, 'topic_expound', true)).resolves.toEqual(r);
  await expect(client.run('', {}, selection, 'topic_expound', true)).rejects.toThrow('sign in');
});
