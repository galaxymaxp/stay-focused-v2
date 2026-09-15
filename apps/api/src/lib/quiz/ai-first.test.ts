import { describe, expect, it, vi } from 'vitest';
import { buildGenerationContext, prepareGenerationContext, generateContract, GenerationContractError, runAIReviewer, type GenerationProvider, type GenerationRequest } from '@stay-focused/engine';
import { generateQuizSet, validateQuizSet, quizSetSchema } from './ai-first';
import { validateActivityDocument, generateActivityDocument } from '../activity-maker/ai-first';
import { learnerQuestion, evaluateAnswer } from './service';
import type { QuizGenerationRequest, ActivitySource } from '@stay-focused/shared';
const request: QuizGenerationRequest = { sourceType: 'material', sourceIds: ['material'], questionCount: 5, difficulty: 'mixed' };
const regions = [{ id: 'page-1', label: 'Lecture', text: 'Complete lecture with relationships and examples.\n# Heading\nMore material.', sourceRefs: [{ materialId: 'material', regionId: 'page-1', page: 1, slide: null }], reviewerSectionIds: [] }];
function quiz() { return { questions: Array.from({ length: 5 }, (_, i) => ({ id: `q${i + 1}`, type: 'single_select', prompt: `Question ${i + 1}?`, options: [{ id: 'a', text: 'First' }, { id: 'b', text: 'Second' }, { id: 'c', text: 'Third' }, { id: 'd', text: 'Fourth' }], correctOptionIds: ['a'], explanation: 'Explanation from the lecture.', difficulty: 'easy', concept: `Concept ${i + 1}`, sourceRefs: ['page-1'] })) }; }
const provider = (response: unknown, capture?: GenerationRequest<unknown>[]): GenerationProvider => ({ generate: async <T>(r: GenerationRequest<T>) => { capture?.push(r); return response as T; } });
describe('AI-first context and product contracts', () => {
  it('preserves all ordered headings/text and original IDs', () => {
    const sources = [{ id: 'p2', text: '# Heading\r\n  A | B', page: 2 }, { id: 'p3', text: 'Tail', page: 3 }];
    const c = buildGenerationContext(sources);
    expect(c.batches).toHaveLength(1); expect(c.sourceIds).toEqual(['p2', 'p3']);
    expect(c.sources[0]?.text).toBe('# Heading\n  A | B');
  });
  it('groups at source boundaries without discarding text', () => {
    const c = buildGenerationContext([{ id: 'a', text: 'A'.repeat(700) }, { id: 'b', text: 'B'.repeat(700) }], 1024);
    expect(c.batches).toHaveLength(2); expect(c.batches.join('')).toContain('B'.repeat(700));
  });
  it.each([{ sources: [] }, { sources: [{ id: 'a', text: '' }] }, { sources: [{ id: 'a', text: 'x' }, { id: 'a', text: 'y' }] }])('rejects empty or ambiguous source identities', ({ sources }) => expect(() => buildGenerationContext(sources)).toThrow());
  it('rejects one oversized structural unit instead of truncating', () => expect(() => buildGenerationContext([{ id: 'a', text: 'A'.repeat(1100) }], 1024)).toThrow('source_section_exceeds_context_budget'));
  it('budgets UTF-8 bytes conservatively', () => expect(() => buildGenerationContext([{ id: 'a', text: '字'.repeat(500) }], 1024)).toThrow());
  it('condenses oversized sources through AI with each complete structural group', async () => {
    const context = buildGenerationContext([{ id: 'a', text: 'A'.repeat(700) }, { id: 'b', text: 'B'.repeat(700) }], 1024);
    const calls: string[] = [];
    const p: GenerationProvider = { generate: async <T>(r: GenerationRequest<T>) => {
      calls.push(r.prompt);
      const group = JSON.parse(r.prompt) as { id: string; text: string }[];
      return { notes: [{ text: 'Condensed by AI', sourceRefs: [group[0]!.id] }] } as T;
    } };
    const result = JSON.parse(await prepareGenerationContext(context, p, 'model'));
    expect(calls).toEqual(context.batches); expect(result.notes.map((n: { sourceRefs: string[] }) => n.sourceRefs)).toEqual([['a'], ['b']]);
  });
  it('rejects cross-group fabricated references during AI condensation', async () => {
    const context = buildGenerationContext([{ id: 'a', text: 'A'.repeat(700) }, { id: 'b', text: 'B'.repeat(700) }], 1024);
    await expect(prepareGenerationContext(context, provider({ notes: [{ text: 'Note', sourceRefs: ['b'] }] }), 'model')).rejects.toThrow(GenerationContractError);
  });
  it('creates the entire set in one provider request with complete context', async () => {
    const calls: GenerationRequest<unknown>[] = [];
    const result = await generateQuizSet(provider(quiz(), calls), request, regions);
    expect(result).toHaveLength(5); expect(calls).toHaveLength(1);
    expect(JSON.parse(calls[0]!.prompt.split('\n').slice(1).join('\n'))[0].text).toBe(regions[0]!.text);
    expect(calls[0]!.instructions).toContain('exactly 5');
  });
  it.each(['count', 'key', 'refs', 'duplicate', 'options', 'empty', 'unexpected'])('rejects objectively invalid %s', problem => {
    const raw = quiz();
    if (problem === 'count') raw.questions.pop();
    if (problem === 'key') raw.questions[0]!.correctOptionIds = ['missing'];
    if (problem === 'refs') raw.questions[0]!.sourceRefs = ['missing'];
    if (problem === 'duplicate') raw.questions[1]!.prompt = 'QUESTION 1 !';
    if (problem === 'options') raw.questions[0]!.options[1]!.id = 'a';
    if (problem === 'empty') raw.questions[0]!.explanation = ' ';
    if (problem === 'unexpected') Object.assign(raw.questions[0]!, { secret: 'extra' });
    expect(() => validateQuizSet(raw, request, regions)).toThrow(GenerationContractError);
  });
  it('repairs the complete output once', async () => {
    let calls = 0;
    const p: GenerationProvider = { generate: async <T>() => { calls++; return (calls === 1 ? { questions: [] } : quiz()) as T; } };
    expect(await generateQuizSet(p, request, regions)).toHaveLength(5); expect(calls).toBe(2);
  });
  it('fails after one unsuccessful repair', async () => {
    const calls: GenerationRequest<unknown>[] = [];
    await expect(generateQuizSet(provider({ questions: [] }, calls), request, regions)).rejects.toThrow(GenerationContractError);
    expect(calls).toHaveLength(2);
  });
  it('does not turn transport errors into semantic repair loops', async () => {
    const call = vi.fn().mockRejectedValue(new Error('transport'));
    await expect(generateQuizSet({ generate: call }, request, regions)).rejects.toThrow('transport'); expect(call).toHaveBeenCalledTimes(1);
  });
  it('supports a persisted before-call budget guard', async () => {
    const call = vi.fn();
    await expect(generateContract({ provider: { generate: call }, model: 'model', context: 'data', instructions: 'rules', schema: quizSetSchema, validate: () => [], beforeCall: () => { throw new Error('budget_spent'); } })).rejects.toThrow('budget_spent');
    expect(call).not.toHaveBeenCalled();
  });
  it('retains hidden keys and authoritative exact-set scoring', () => {
    const q = validateQuizSet(quiz(), request, regions)[0]!;
    expect(Object.keys(learnerQuestion(q)).sort()).toEqual(['difficulty', 'id', 'options', 'prompt', 'selectionInstruction', 'type']);
    expect(evaluateAnswer(q, { questionId: q.id, selectedOptionIds: ['a'], finalizedAt: null }).correct).toBe(true);
    expect(evaluateAnswer(q, { questionId: q.id, selectedOptionIds: ['a', 'b'], finalizedAt: null }).correct).toBe(false);
  });
  it('adapts AI Reviewer sections to the existing reader contract', async () => {
    const result = await runAIReviewer({ input: { id: 'lecture', blocks: [{ id: 'page-1', text: 'Full lecture', kind: 'paragraph' }] }, provider: provider({ title: 'Reviewer', sections: [{ title: 'Topic', explanation: 'Explanation', keyPoints: ['Point'], sourceRefs: ['page-1'] }] }) });
    expect(result.sections[0]!.items[0]!.sourceCore.explanation).toBe('Explanation');
    expect(result.metadata.validationPolicy).toBe('ai-first-contract');
    expect(result.metadata.generationMetrics?.providerRequestCount).toBe(1);
  });
  const sources: ActivitySource[] = [{ id: 'instructions', title: 'Assignment', text: 'Write a reflection with two sections.', role: 'instructions', materialId: null }];
  const activity = { title: 'Reflection', activityType: 'reflection', parts: [{ heading: 'Thoughts', content: 'Student must supply their own experience.', sourceRefs: ['instructions'], missingInformation: true }] };
  it('lets AI structure Activity and preserves editable result shape', async () => {
    const result = await generateActivityDocument(provider(activity), 'Assignment', sources);
    expect(result.activityType).toBe('reflection'); expect(result.content.sections[0]!.id).toBe('section-1'); expect(result.warnings).toHaveLength(1);
  });
  it('rejects invented Activity source IDs', () => expect(() => validateActivityDocument({ ...activity, parts: [{ ...activity.parts[0], sourceRefs: ['invented'] }] }, sources)).toThrow());
  it('adapts presentations to existing slide contract', () => expect(validateActivityDocument({ ...activity, activityType: 'presentation' }, sources).content.slides[0]?.number).toBe(1));
});
