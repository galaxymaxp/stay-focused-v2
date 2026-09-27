import { describe, expect, it, vi } from 'vitest';
import { buildGenerationContext, prepareGenerationContext, generateContract, GenerationContractError, runAIReviewer, createReviewerDocumentSchema, validateReviewerDocument, type GenerationProvider, type GenerationRequest } from '@stay-focused/engine';
import { generateQuizSet, validateQuizSet, quizSetSchema } from './ai-first';
import { validateActivityDocument, generateActivityDocument } from '../activity-maker/ai-first';
import { learnerQuestion, evaluateAnswer, hasRepeatedQuizQuestions, hasUnbalancedQuizMix, normalizeSubmittedAnswer, quizBatches } from './service';
import type { QuizGenerationRequest, ActivitySource } from '@stay-focused/shared';
const request: QuizGenerationRequest = { sourceType: 'material', sourceIds: ['material'], questionCount: 5, difficulty: 'mixed' };
const regions = [{ id: 'page-1', label: 'Lecture', text: 'Complete lecture with relationships and examples.\n# Heading\nMore material.', sourceRefs: [{ materialId: 'material', regionId: 'page-1', page: 1, slide: null }], reviewerSectionIds: [] }];
function quiz() { return { questions: Array.from({ length: 5 }, (_, i) => ({ id: `q${i + 1}`, type: 'single_select', prompt: `Question ${i + 1}?`, options: [{ id: 'a', text: 'First' }, { id: 'b', text: 'Second' }, { id: 'c', text: 'Third' }, { id: 'd', text: 'Fourth' }], correctOptionIds: ['a'], explanation: 'Explanation from the lecture.', difficulty: 'easy', concept: `Concept ${i + 1}`, sourceRefs: ['page-1'] })) }; }
const provider = (response: unknown, capture?: GenerationRequest<unknown>[]): GenerationProvider => ({ generate: async <T>(r: GenerationRequest<T>) => { capture?.push(r); return response as T; } });
describe('AI-first context and product contracts', () => {
  it('plans 100 items in five bounded batches with stable global offsets', () => {
    expect(quizBatches(100)).toEqual([{ offset: 0, size: 20 }, { offset: 20, size: 20 }, { offset: 40, size: 20 }, { offset: 60, size: 20 }, { offset: 80, size: 20 }]);
    expect(quizBatches(45).at(-1)).toEqual({ offset: 40, size: 5 });
  });
  it('detects repeated and near-repeated long stems across batches', () => {
    expect(hasRepeatedQuizQuestions([{ prompt: 'What is phishing?' }, { prompt: 'WHAT IS PHISHING!' }])).toBe(true);
    expect(hasRepeatedQuizQuestions([{ prompt: 'Which protocol uses certificates to verify the identity of a remote web server?' }, { prompt: 'Which protocol uses certificates to verify the identity of the remote web server?' }])).toBe(true);
    const stem = 'Match the VPN technology to its commonly described access method or deployment style.';
    expect(hasRepeatedQuizQuestions([{ prompt: stem, type: 'matching', leftItem: 'IPSec VPN' }, { prompt: stem, type: 'matching', leftItem: 'SSL/TLS VPN' }])).toBe(false);
    expect(hasRepeatedQuizQuestions([{ prompt: stem, type: 'matching', leftItem: 'IPSec VPN' }, { prompt: 'Match the term to its description.', type: 'matching', leftItem: 'ipsec vpn' }])).toBe(true);
    const mixed = ['single_select', 'single_select', 'single_select', 'single_select', 'single_select', 'single_select', 'identification', 'identification', 'true_false', 'matching'] as const;
    expect(hasUnbalancedQuizMix(mixed.map(type => ({ type })), ['single_select', 'identification', 'true_false', 'modified_true_false', 'matching'])).toBe(false);
    expect(hasUnbalancedQuizMix(mixed.map(type => ({ type: type === 'matching' ? 'single_select' : type })), ['single_select', 'identification', 'true_false', 'modified_true_false', 'matching'])).toBe(true);
  });
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
    expect(calls[0]!.instructions).toContain('If exactly one option is supported, use single_select');
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
  it('rejects a combination-choice question mislabeled as multi select', () => {
    const raw = quiz();
    raw.questions[4]!.type = 'multi_select';
    raw.questions[4]!.options = [
      { id: 'a', text: 'Statements 1, 2, and 3' },
      { id: 'b', text: 'Statements 1 and 4' },
      { id: 'c', text: 'Statements 2 and 3' },
      { id: 'd', text: 'All four statements' },
    ];
    raw.questions[4]!.correctOptionIds = ['a'];
    expect(() => validateQuizSet(raw, request, regions)).toThrow(GenerationContractError);
  });
  it('validates five grounded formats and normalizes source-supported recall aliases', () => {
    const raw = quiz();
    const source = [{ ...regions[0]!, text: 'The CIA triad consists of Confidentiality, Integrity, and Availability. Confidentiality prevents unauthorized disclosure.' }];
    Object.assign(raw.questions[0]!, { type: 'identification', prompt: 'Name the CIA triad.', options: [], correctOptionIds: ['CIA triad'], acceptedAnswers: ['CIA triad'], leftItem: '', incorrectTerm: '' });
    Object.assign(raw.questions[1]!, { type: 'modified_true_false', prompt: 'Availability prevents unauthorized disclosure.', options: [{ id: 'a', text: 'True' }, { id: 'b', text: 'False' }], correctOptionIds: ['b', 'Confidentiality'], acceptedAnswers: ['Confidentiality'], incorrectTerm: 'Availability', leftItem: '' });
    Object.assign(raw.questions[2]!, { type: 'matching', prompt: 'Match the term to its meaning.', leftItem: 'Confidentiality', options: [{ id: 'a', text: 'Uptime' }, { id: 'b', text: 'Accuracy' }, { id: 'c', text: 'Prevention of unauthorized disclosure' }, { id: 'd', text: 'Recovery' }], correctOptionIds: ['c'], acceptedAnswers: [], incorrectTerm: '' });
    Object.assign(raw.questions[3]!, { type: 'true_false', prompt: 'The CIA triad includes Integrity.', options: [{ id: 'a', text: 'True' }, { id: 'b', text: 'False' }], correctOptionIds: ['a'], acceptedAnswers: [], leftItem: '', incorrectTerm: '' });
    const validated = validateQuizSet(raw, request, source);
    expect(validated.map(question => question.type)).toEqual(['identification', 'modified_true_false', 'matching', 'true_false', 'single_select']);
    expect(normalizeSubmittedAnswer(validated[0]!, ['  cia triad! '])).toEqual(['CIA triad']);
    expect(normalizeSubmittedAnswer(validated[1]!, ['b', 'confidentiality.'])).toEqual(['b', 'Confidentiality']);
    expect(learnerQuestion(validated[2]!)).toHaveProperty('leftItem', 'Confidentiality');
    expect(learnerQuestion(validated[1]!)).not.toHaveProperty('acceptedAnswers');
    (raw.questions[0] as typeof raw.questions[0] & { acceptedAnswers: string[] }).acceptedAnswers = ['Invented alias'];
    expect(() => validateQuizSet(raw, request, source)).toThrow(GenerationContractError);
  });
  it('treats matching items with a shared stem as distinct by their left-side term', () => {
    const raw = quiz();
    const source = [{ ...regions[0]!, text: 'OpenVPN and Cisco AnyConnect are VPN applications. OpenVPN is open source.' }];
    const matching = (leftItem: string) => ({ type: 'matching', prompt: 'Match the VPN application to its description.', leftItem, options: [{ id: 'a', text: 'Open source client' }, { id: 'b', text: 'Vendor client' }, { id: 'c', text: 'Browser plugin' }, { id: 'd', text: 'Firewall' }], correctOptionIds: ['a'], acceptedAnswers: [], incorrectTerm: '' });
    Object.assign(raw.questions[0]!, matching('OpenVPN'));
    Object.assign(raw.questions[1]!, matching('Cisco AnyConnect'));
    expect(validateQuizSet(raw, request, source).map(question => question.leftItem).slice(0, 2)).toEqual(['OpenVPN', 'Cisco AnyConnect']);
    Object.assign(raw.questions[1]!, matching('OpenVPN'));
    expect(() => validateQuizSet(raw, request, source)).toThrow(GenerationContractError);
  });
  it('drops ungrounded recall aliases but keeps a grounded canonical answer', () => {
    const raw = quiz();
    const source = [{ ...regions[0]!, text: 'SSL/TLS VPNs are an important technology for secure personal device access.' }];
    Object.assign(raw.questions[0]!, { type: 'identification', prompt: 'Name the VPN technology used for secure personal device access.', options: [], correctOptionIds: ['SSL/TLS VPN'], acceptedAnswers: ['SSL/TLS VPN', 'SSL VPN'], leftItem: '', incorrectTerm: '' });
    const validated = validateQuizSet(raw, request, source);
    expect(validated[0]!.acceptedAnswers).toEqual(['SSL/TLS VPN']);
    expect(normalizeSubmittedAnswer(validated[0]!, ['ssl vpn'])).toEqual(['ssl vpn']);
    Object.assign(raw.questions[0]!, { correctOptionIds: ['SSL VPN'], acceptedAnswers: ['SSL VPN', 'SSL/TLS VPN'] });
    expect(() => validateQuizSet(raw, request, source)).toThrow(GenerationContractError);
  });
  it('accepts only exact source wording for modified true/false corrections', () => {
    const raw = quiz();
    const source = [{ ...regions[0]!, text: 'Fourth, the browser chooses to either trust or not trust. Traffic tunnels through the internet into the VPN provider’s servers.' }];
    const mtf = (correction: string, incorrectTerm = 'router') => ({ type: 'modified_true_false', prompt: `Fourth, the ${incorrectTerm} chooses to either trust or not trust.`, options: [{ id: 'a', text: 'True' }, { id: 'b', text: 'False' }], correctOptionIds: ['b', correction], acceptedAnswers: [correction], incorrectTerm, leftItem: '' });
    Object.assign(raw.questions[0]!, mtf('browser'));
    expect(validateQuizSet(raw, request, source)[0]!.correctOptionIds).toEqual(['b', 'browser']);
    Object.assign(raw.questions[0]!, mtf('after'));
    expect(() => validateQuizSet(raw, request, source)).toThrow(GenerationContractError);
    Object.assign(raw.questions[0]!, mtf('through the provider’s servers'));
    expect(() => validateQuizSet(raw, request, source)).toThrow(GenerationContractError);
    Object.assign(raw.questions[0]!, mtf('browser', 'gateway'), { prompt: 'Fourth, the router chooses to either trust or not trust.' });
    expect(() => validateQuizSet(raw, request, source)).toThrow(GenerationContractError);
  });
  it('accepts only exact source wording for identification answers', () => {
    const raw = quiz();
    const source = [{ ...regions[0]!, text: 'The lesson emphasizes that SSL/TLS VPNs are an important technology for secure personal device access.' }];
    const id = (term: string) => ({ type: 'identification', prompt: 'Name the VPN technology used for secure personal device access.', options: [], correctOptionIds: [term], acceptedAnswers: [term], leftItem: '', incorrectTerm: '' });
    Object.assign(raw.questions[0]!, id('SSL/TLS VPNs'));
    expect(validateQuizSet(raw, request, source)[0]!.acceptedAnswers).toEqual(['SSL/TLS VPNs']);
    Object.assign(raw.questions[0]!, id('Secure socket VPN'));
    expect(() => validateQuizSet(raw, request, source)).toThrow(GenerationContractError);
  });
  it('states the exact-wording and single-format contract in every quiz call', async () => {
    const calls: GenerationRequest<unknown>[] = [];
    await generateQuizSet(provider(quiz(), calls), { ...request, questionTypes: ['single_select'] }, regions);
    expect(calls[0]!.instructions).toContain('copied exactly from the cited source text');
    expect(calls[0]!.instructions).toContain('the original term copied exactly from the cited source');
    expect(calls[0]!.instructions).toContain('Every question must have type "single_select"');
    expect(calls[0]!.instructions).not.toContain('mixed mode');
  });
  it('rejects recurring meta-question stems for repair', () => {
    const raw = quiz();
    raw.questions[0]!.prompt = 'According to the provided material, what is the term?';
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
