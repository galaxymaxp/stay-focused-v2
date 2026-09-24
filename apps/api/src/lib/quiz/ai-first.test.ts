import { describe, expect, it, vi } from 'vitest';
import { buildGenerationContext, prepareGenerationContext, generateContract, GenerationContractError, runAIReviewer, createReviewerDocumentSchema, validateReviewerDocument, type GenerationProvider, type GenerationRequest } from '@stay-focused/engine';
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
  it('keeps the Reviewer schema bounded while validating source references exactly', () => {
    const schema = createReviewerDocumentSchema(['page-1', 'page-2']);
    const sectionItems = schema.schema.properties.sections as { items: { properties: Record<string, { items?: { enum?: readonly string[] } }> } };
    expect(sectionItems.items.properties.sourceRefs.items?.enum).toBeUndefined();
    expect(JSON.stringify(createReviewerDocumentSchema(Array.from({ length: 100 }, (_, index) => `slide-${index}-${'x'.repeat(64)}`))).length).toBeLessThan(2000);
    expect(() => validateReviewerDocument({ title: 'Reviewer', sections: [{ title: 'Topic', explanation: 'Explanation', keyPoints: ['Point'], sourceRefs: ['invented'] }] }, ['page-1'])).toThrow(GenerationContractError);
    expect(() => validateReviewerDocument({ title: 'Reviewer', sections: [{ title: 'Topic', explanation: 'Explanation', keyPoints: [], sourceRefs: ['page-1'] }] }, ['page-1'])).toThrow(GenerationContractError);
    try {
      validateReviewerDocument({ title: 'Reviewer', sections: [{ title: 'Topic', explanation: 'Explanation', keyPoints: [], sourceRefs: ['page-1'] }] }, ['page-1']);
    } catch (error) {
      expect(error).toBeInstanceOf(GenerationContractError);
      expect((error as GenerationContractError).findings).toEqual(['section-1:key_points']);
    }
  });
  it('generates a Reviewer from a structured source with many block IDs', async () => {
    const blocks = Array.from({ length: 100 }, (_, index) => ({ id: `slide-${index}-${'x'.repeat(64)}`, text: `Slide ${index + 1} content`, kind: 'paragraph' as const }));
    const firstId = blocks[0]!.id;
    const calls: GenerationRequest<unknown>[] = [];
    const result = await runAIReviewer({ input: { id: 'presentation', blocks }, provider: provider({ title: 'Presentation Reviewer', sections: [{ title: 'Topic', explanation: 'Explanation', keyPoints: ['Point'], sourceRefs: [firstId] }] }, calls) });
    expect(calls).toHaveLength(1);
    expect(result.sections[0]!.sourceBlockIds).toEqual([firstId]);
  });
  const sources: ActivitySource[] = [{ id: 'instructions', title: 'Assignment', text: 'Write a reflection with two sections.', role: 'instructions', materialId: null }];
  const activity = { title: 'Reflection', activityType: 'reflection', parts: [{ heading: 'Thoughts', content: 'Student must supply their own experience.', sourceRefs: ['instructions'], missingInformation: true }] };
  it('lets AI structure Activity and preserves editable result shape', async () => {
    const result = await generateActivityDocument(provider(activity), 'Assignment', sources);
    expect(result.activityType).toBe('reflection'); expect(result.content.sections[0]!.id).toBe('section-1'); expect(result.warnings).toHaveLength(1);
  });
  it('makes mandatory non-text Activity requirements salient and supports placeholders', async () => {
    const calls: GenerationRequest<unknown>[] = [];
    const pictureSources: ActivitySource[] = [{ id: 'instructions', title: 'Profile', text: 'Include your picture and name.', role: 'instructions', materialId: null }];
    const result = await generateActivityDocument(provider({ title: 'Profile', activityType: 'reflection', parts: [{ heading: 'Profile', content: '[Insert your required picture here]\nName: [Enter your name]', sourceRefs: ['instructions'], missingInformation: true }] }, calls), 'Profile', pictureSources);
    expect(calls[0]!.instructions).toContain('Represent every explicit mandatory requirement');
    expect(calls[0]!.instructions).toContain('pictures or images');
    expect(calls[0]!.instructions).toContain('student-facing placeholder or action cue');
    expect(result.content.sections[0]!.content).toContain('[Insert your required picture here]');
    expect(result.warnings).toHaveLength(1);
  });
  it('keeps personal Activity details student-supplied while preserving sentence structure', async () => {
    const calls: GenerationRequest<unknown>[] = [];
    const personalSources: ActivitySource[] = [{ id: 'instructions', title: 'Learning contract', text: 'Write five complete-sentence motivations and five complete-sentence hindrances.', role: 'instructions', materialId: null }];
    const result = await generateActivityDocument(provider({ title: 'Learning contract', activityType: 'reflection', parts: [{ heading: 'Motivations', content: '- I am motivated by [add your own reason].', sourceRefs: ['instructions'], missingInformation: true }, { heading: 'Hindrances', content: '- One challenge I may face is [add your own obstacle].', sourceRefs: ['instructions'], missingInformation: true }] }, calls), 'Learning contract', personalSources);
    expect(calls[0]!.instructions).toContain('never assert biographical details');
    expect(calls[0]!.instructions).toContain('family circumstances');
    expect(calls[0]!.instructions).toContain('complete-sentence formats with explicit editable placeholders');
    expect(result.content.sections.map(section => section.content)).toEqual(['- I am motivated by [add your own reason].', '- One challenge I may face is [add your own obstacle].']);
    expect(result.warnings).toHaveLength(2);
  });
  it('rejects invented Activity source IDs', () => expect(() => validateActivityDocument({ ...activity, parts: [{ ...activity.parts[0], sourceRefs: ['invented'] }] }, sources)).toThrow());
  it('adapts presentations to existing slide contract', () => expect(validateActivityDocument({ ...activity, activityType: 'presentation' }, sources).content.slides[0]?.number).toBe(1));
});
