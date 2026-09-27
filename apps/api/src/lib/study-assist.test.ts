import type { GenerationProvider } from '@stay-focused/engine';
import { ASSIST_TYPES, assistRequest, selectAssistBlock, type ReviewerReaderModel } from '@stay-focused/shared';
import { describe, expect, it, vi } from 'vitest';
import { assistSourceExcerpt, generateStudyAssist, parseAssistRequest } from './study-assist';
import type { CanonicalReviewerRecord } from './canonical-reviewers';

const reviewer: ReviewerReaderModel = { id: 'artifact:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', title: 'Cells', course: null,
  source: { id: 'original', title: 'Lecture' }, generatedAt: '2026-09-27T00:00:00Z', freshness: 'current',
  sections: [{ id: 'section-1', title: 'Cell structure', blocks: [{ id: 'block-1', title: 'Nucleus',
    explanation: 'The nucleus contains genetic material.', keyPoints: ['It contains DNA.'], evidence: [] }] },
  { id: 'section-2', title: 'Unrelated concept', blocks: [{ id: 'block-2', title: 'Other', explanation: 'UNRELATED_DO_NOT_SEND', keyPoints: [], evidence: [] }] }] };
const selection = selectAssistBlock(reviewer, 'section-1', 'block-1')!;
const sourceExcerpt = 'The nucleus contains genetic material, including DNA.';
function provider(output: unknown = { text: 'The nucleus holds DNA.' }) {
  const generate = vi.fn(async () => output);
  return { generate, instance: { generate } as GenerationProvider };
}
describe('Study Assist generation', () => {
  it.each(ASSIST_TYPES)('makes one focused grounded %s request with appropriate instructions', async type => {
    const p = provider(); const request = assistRequest(selection, type);
    const before = JSON.stringify(reviewer);
    expect(parseAssistRequest(request)).toEqual(request);
    const result = await generateStudyAssist({ request, reviewer, sourceExcerpt, provider: p.instance });
    expect(result).toMatchObject({ ...request, text: 'The nucleus holds DNA.' });
    expect(p.generate).toHaveBeenCalledTimes(1);
    const call = p.generate.mock.calls[0] as unknown as [{ prompt: string; instructions: string }];
    expect(call[0].prompt).toContain(sourceExcerpt);
    expect(call[0].prompt).not.toContain('UNRELATED_DO_NOT_SEND');
    expect(call[0].instructions).toContain('Original-source evidence is the factual authority');
    expect(call[0].instructions.toLowerCase()).toContain(type === 'summarize' ? 'add no outside facts' : type === 'explain_simply' ? 'add no unsupported facts' : 'illustrative');
    expect(JSON.stringify(reviewer)).toBe(before);
  });
  it.each([{}, null, { text: '' }, { text: ' ' }, { text: 'x'.repeat(2401) }, { text: 'valid', secret: 'extra' }, { text: 'bad\u0000text' }])('rejects malformed output %j', async output => {
    await expect(generateStudyAssist({ request: assistRequest(selection, 'example'), reviewer, sourceExcerpt, provider: provider(output).instance })).rejects.toMatchObject({ code: 'generation_failed' });
  });
  it('rejects verbatim summarization', async () => {
    await expect(generateStudyAssist({ request: assistRequest(selection, 'summarize'), reviewer, sourceExcerpt,
      provider: provider({ text: selection.block.explanation }).instance })).rejects.toMatchObject({ code: 'generation_failed' });
  });
  it('propagates provider failure without mutating canonical content', async () => {
    const p = provider(); p.generate.mockRejectedValue(new Error('provider_failed'));
    await expect(generateStudyAssist({ request: assistRequest(selection, 'example'), reviewer, sourceExcerpt, provider: p.instance })).rejects.toThrow('provider_failed');
    expect(selection.block.explanation).toBe('The nucleus contains genetic material.');
  });
  it.each([
    { contentHash: 'stale' }, { blockId: 'deleted' }, { reviewerId: 'artifact:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
  ])('rejects stale or missing selections before provider use: %j', async change => {
    const p = provider();
    await expect(generateStudyAssist({ request: { ...assistRequest(selection, 'example'), ...change }, reviewer, sourceExcerpt, provider: p.instance })).rejects.toBeDefined();
    expect(p.generate).not.toHaveBeenCalled();
  });
  it.each([{ promptVersion: 'old' }, { assistType: 'other' }, { userId: 'forged' }, { canonicalContent: 'injected' }, { contentHash: 'bad' }])('rejects invalid request or unexpected fields: %j', change => {
    expect(() => parseAssistRequest({ ...assistRequest(selection, 'example'), ...change })).toThrow();
  });
  it('limits source context without silently truncating qualifiers', async () => {
    const p = provider();
    await expect(generateStudyAssist({ request: assistRequest(selection, 'example'), reviewer, sourceExcerpt: 'x'.repeat(18001), provider: p.instance })).rejects.toMatchObject({ code: 'not_ready' });
    expect(p.generate).not.toHaveBeenCalled();
  });
});
describe('original source provenance', () => {
  const saved = { source: { id: 'original', source_text: sourceExcerpt, metadata: {
    reviewerSourceBlocks: [{ id: 'source-one', text: sourceExcerpt }, { id: 'source-two', text: 'PRIVATE_UNRELATED' }],
  } }, version: { payload: { reviewer: { metadata: { sourceId: 'original' }, sections: [
    { id: 'section-1', items: [{ id: 'block-1', sourceBlockIds: ['source-one'] }] },
  ] } } } } as unknown as CanonicalReviewerRecord;
  it('resolves only source blocks referenced by the selected canonical item', async () => {
    const excerpt = await assistSourceExcerpt(saved, assistRequest(selection, 'summarize'));
    expect(excerpt).toBe(sourceExcerpt); expect(excerpt).not.toContain('PRIVATE_UNRELATED');
  });
  it('fails safely when a block no longer exists', async () => {
    await expect(assistSourceExcerpt(saved, { ...assistRequest(selection, 'example'), blockId: 'missing' })).rejects.toMatchObject({ code: 'not_found' });
  });
  it('refuses missing source references', async () => {
    const missing = structuredClone(saved);
    const payload = missing.version.payload as { reviewer: { sections: { items: { sourceBlockIds: string[] }[] }[] } };
    payload.reviewer.sections[0]!.items[0]!.sourceBlockIds = ['missing'];
    await expect(assistSourceExcerpt(missing, assistRequest(selection, 'example'))).rejects.toMatchObject({ code: 'not_ready' });
  });
});
