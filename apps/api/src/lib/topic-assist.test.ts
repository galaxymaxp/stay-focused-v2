import type { GenerationProvider } from '@stay-focused/engine';
import { selectTopic, TOPIC_ACTIONS, type ReviewerReaderModel } from '@stay-focused/shared';
import { beforeEach, expect, it, vi } from 'vitest';
import { createTopicCache, generateTopic, parseTopicRequest } from './topic-assist';
import { resetStudyAdmission } from './study-tools';

const reviewer: ReviewerReaderModel = { id: 'artifact:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', title: 'Cells', course: null, source: { id: 's', title: 'Lesson' }, generatedAt: '2026-10-16T00:00:00Z', freshness: 'current',
  sections: [{ id: 's', title: 'Cells', blocks: [{ id: 'b', title: 'Nucleus', explanation: 'The nucleus contains DNA.', keyPoints: ['ALL_POINTS'], evidence: [{ kind: 'example', text: 'ALL_EVIDENCE' }] }] },
    { id: 'other', title: 'PRIVATE_OTHER', blocks: [] }] };
const selection = selectTopic(reviewer, 's')!;
beforeEach(() => resetStudyAdmission());
it.each(TOPIC_ACTIONS)('%s uses only exact canonical topic, source-only instructions and SA1 format', async action => {
  const before = JSON.stringify(reviewer), generate = vi.fn(async () => ({ text: 'Lead\n- **DNA** is inside.' }));
  const result = await generateTopic(selection, action, { generate } as unknown as GenerationProvider);
  expect(result.grounding).toBe('source'); expect(JSON.stringify(reviewer)).toBe(before);
  const call = generate.mock.calls[0] as unknown as [{ prompt: string; instructions: string; maxOutputTokens: number }];
  expect(call[0].prompt).toBe(selection.canonicalContent); expect(call[0].prompt).toContain('ALL_POINTS'); expect(call[0].prompt).toContain('ALL_EVIDENCE'); expect(call[0].prompt).not.toContain('PRIVATE_OTHER');
  expect(call[0].instructions).toContain('Add no new facts'); expect(call[0].instructions).toContain('bullets');
  expect(call[0].maxOutputTokens).toBe(action === 'topic_expound' ? 2400 : 1600);
});
it('rejects Original, arbitrary text/fields and unsafe identifiers', () => {
  const input = { reviewerId: reviewer.id, sectionId: 's', action: 'topic_simplify' };
  expect(parseTopicRequest(input)).toEqual(input);
  for (const change of [{ action: 'original' }, { text: 'client claims' }, { sectionId: '' }, { reviewerId: 'local' }, { action: 'ask' }]) expect(() => parseTopicRequest({ ...input, ...change })).toThrow();
});
it('fails safely on oversized topics and malformed/oversized output', async () => {
  const generate = vi.fn(async () => ({ text: 'x'.repeat(6001) }));
  const provider = { generate } as unknown as GenerationProvider;
  await expect(generateTopic({ ...selection, canonicalContent: 'x'.repeat(18001) }, 'topic_simplify', provider)).rejects.toMatchObject({ code: 'not_ready' });
  expect(generate).not.toHaveBeenCalled();
  await expect(generateTopic(selection, 'topic_simplify', provider)).rejects.toMatchObject({ code: 'generation_failed' });
});
it('cache isolates owners/actions/exact content, deduplicates, expires and only charges cache misses', async () => {
  let now = 0; const cache = createTopicCache(() => now);
  const generate = vi.fn(async () => ({ text: 'Lead' } as Awaited<ReturnType<typeof generateTopic>>));
  for (const action of TOPIC_ACTIONS) {
    await Promise.all([cache('owner', selection, action, generate), cache('owner', selection, action, generate)]);
    for (let i = 0; i < 22; i++) await cache('owner', selection, action, generate);
  }
  expect(generate).toHaveBeenCalledTimes(3);
  await cache('other', selection, 'topic_simplify', generate);
  await cache('owner', { ...selection, canonicalContent: 'collision with same hash' }, 'topic_simplify', generate);
  now = 30 * 60_000;
  await cache('owner', selection, 'topic_simplify', generate);
  expect(generate).toHaveBeenCalledTimes(6);
});
it('uncached actions respect shared admission and failed results are retryable', async () => {
  const cache = createTopicCache(); const generate = vi.fn().mockRejectedValueOnce(new Error('failed')).mockResolvedValue({ text: 'Lead' });
  await expect(cache('owner', selection, 'topic_simplify', generate)).rejects.toThrow('failed');
  await cache('owner', selection, 'topic_simplify', generate); expect(generate).toHaveBeenCalledTimes(2);
  for (let i = 0; i < 18; i++) await cache('owner', { ...selection, sectionId: String(i) }, 'topic_expound', generate);
  expect(() => cache('owner', { ...selection, sectionId: 'limited' }, 'topic_expound', generate)).toThrow();
  expect(generate).toHaveBeenCalledTimes(20);
});
