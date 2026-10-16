import { beforeEach, expect, it, vi } from 'vitest';
import { selectTopic, TOPIC_PROMPT_VERSION, type ReviewerReaderModel } from '@stay-focused/shared';
import { topicAssist } from './assist-store';
import type { Api } from '../../lib/api';

const reviewer: ReviewerReaderModel = { id: 'artifact:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', title: 'Cells', course: null, source: { id: 's', title: 'Lesson' }, generatedAt: '2026-10-16T00:00:00Z', freshness: 'current',
  sections: [{ id: 's', title: 'Cells', blocks: [{ id: 'b', title: 'Nucleus', explanation: 'The nucleus contains DNA.', keyPoints: [], evidence: [] }] }] };
const selection = selectTopic(reviewer, 's')!;
beforeEach(() => {
  const cache = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => cache.get(key) ?? null, setItem: (key: string, value: string) => cache.set(key, value) });
});
it('browser assist store persists exact topic results for offline reuse without widening share exports', async () => {
  const api = vi.fn(async () => ({ reviewerId: reviewer.id, sectionId: 's', action: 'topic_simplify', contentHash: selection.contentHash, promptVersion: TOPIC_PROMPT_VERSION, grounding: 'source', text: 'Lead\n- DNA.', createdAt: '2026-10-16T00:00:00Z' }));
  const result = await topicAssist.run('owner', api as Api, selection, 'topic_simplify', true);
  expect(await topicAssist.run('owner', api as Api, selection, 'topic_simplify', false)).toEqual(result);
  expect(api).toHaveBeenCalledOnce();
  expect(await topicAssist.peek('other', selection, 'topic_simplify')).toBeNull();
  expect(await topicAssist.peek('owner', { ...selection, canonicalContent: 'collision' }, 'topic_simplify')).toBeNull();
  const { collectSharedAssists } = await import('./assist-store');
  expect(collectSharedAssists('owner', reviewer)).toEqual([]);
});
it('corrupt or blocked browser storage becomes a cache miss', async () => {
  localStorage.setItem('sf.study-topic.v1.owner', 'broken');
  expect(await topicAssist.peek('owner', selection, 'topic_simplify')).toBeNull();
  vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); } });
  expect(await topicAssist.peek('owner', selection, 'topic_expound')).toBeNull();
});
