import type { GenerationProvider } from '@stay-focused/engine';
import {
  STUDY_INSUFFICIENT_TEST, STUDY_LIMITS, STUDY_NO_COMPARISON, STUDY_TOOLS_PROMPT_VERSION, selectAssistBlock,
  type ReviewerReaderModel, type StudyToolRequest,
} from '@stay-focused/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CanonicalReviewerRecord } from './canonical-reviewers';
import {
  STUDY_CONTEXT_BUDGET, STUDY_OUTPUT_TOKENS, admitStudyRequest, buildStudyContext, generateStudyTool, parseStudyToolRequest,
  resetStudyAdmission, resolveStudySelection, studyContextCharacters, studyGenerationCall, studyToolsModel,
} from './study-tools';

const explanation = 'The principle of least privilege gives users only the permissions necessary to perform their role.';
const reviewer: ReviewerReaderModel = { id: 'artifact:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', title: 'Access control', course: null,
  source: { id: 'original', title: 'Lecture 3' }, generatedAt: '2026-09-27T00:00:00Z', freshness: 'current',
  sections: [{ id: 'section-1', title: 'Authorization', blocks: [
    { id: 'block-0', title: 'Roles', explanation: 'Roles group permissions for job functions.', keyPoints: [], evidence: [] },
    { id: 'block-1', title: 'Least privilege', explanation, keyPoints: ['Limits damage from compromised accounts.', 'Review access regularly.'],
      evidence: [{ kind: 'example', text: 'A cashier cannot open the payroll system.' }] },
  ] }, { id: 'section-2', title: 'Unrelated', blocks: [{ id: 'block-2', title: 'Other', explanation: 'UNRELATED_SECTION_DO_NOT_SEND', keyPoints: [], evidence: [] }] }] };
const block = selectAssistBlock(reviewer, 'section-1', 'block-1')!;
const sourceText = 'Least privilege: grant each user only the permissions their role requires. This limits damage when an account is compromised.';
const saved = { source: { id: 'original', source_text: sourceText, metadata: {
  reviewerSourceBlocks: [{ id: 'source-one', text: sourceText }, { id: 'source-two', text: 'PRIVATE_UNCITED_SOURCE' }],
} }, version: { payload: { reviewer: { metadata: { sourceId: 'original' }, sections: [
  { id: 'section-1', items: [{ id: 'block-0', sourceBlockIds: [] }, { id: 'block-1', sourceBlockIds: ['source-one'] }] },
] } } } } as unknown as CanonicalReviewerRecord;
function request(change: Partial<StudyToolRequest> = {}): StudyToolRequest {
  return { reviewerId: reviewer.id, sectionId: 'section-1', blockId: 'block-1', contentHash: block.contentHash,
    promptVersion: STUDY_TOOLS_PROMPT_VERSION, selection: 'principle of least privilege', action: 'explain', ...change };
}
function provider(output: unknown) {
  const generate = vi.fn(async () => output);
  return { generate, instance: { generate } as GenerationProvider };
}
type Call = { model: string; prompt: string; instructions: string; maxOutputTokens: number; reasoningEffort?: string; schema: { name: string } };
async function run(input: StudyToolRequest, output: unknown) {
  const p = provider(output);
  const resolved = resolveStudySelection(reviewer, input);
  const context = await buildStudyContext({ reviewer, request: input, saved, ...resolved });
  const result = await generateStudyTool({ request: input, selection: resolved.selection, context, provider: p.instance, model: 'test-model' });
  return { result, call: (p.generate.mock.calls[0] as unknown as [Call])[0] };
}
afterEach(() => resetStudyAdmission());

describe('Smart Selection request contract', () => {
  it('accepts a valid selection and action', () => {
    expect(parseStudyToolRequest(request())).toEqual(request());
    expect(resolveStudySelection(reviewer, request()).selection).toBe('principle of least privilege');
  });
  it('accepts selections across passages, ignoring line breaks and bullets', () => {
    const across = `${explanation}\n\n• Limits damage`;
    expect(resolveStudySelection(reviewer, request({ selection: across })).selection).toBe(`${explanation} Limits damage`);
  });
  it.each(['', '   ', '•', ' \n '])('rejects an empty selection %j', selection => {
    expect(() => resolveStudySelection(reviewer, parseStudyToolRequest({ ...request(), selection: selection || ' ' }))).toThrow();
  });
  it('rejects selections that are not in the selected block, so the tool cannot become a free chatbot', () => {
    expect(() => resolveStudySelection(reviewer, request({ selection: 'Write me an essay about anything' }))).toThrowError(expect.objectContaining({ code: 'invalid_request' }));
    expect(() => resolveStudySelection(reviewer, request({ selection: 'UNRELATED_SECTION_DO_NOT_SEND' }))).toThrowError(expect.objectContaining({ code: 'invalid_request' }));
  });
  it('rejects a selection over the limit server-side, before and after normalization', () => {
    expect(() => parseStudyToolRequest(request({ selection: 'a'.repeat(STUDY_LIMITS.selection * 2 + 1) }))).toThrowError(expect.objectContaining({ code: 'study_selection_too_large', status: 422 }));
    const long: ReviewerReaderModel = { ...reviewer, sections: [{ ...reviewer.sections[0]!, blocks: [{ ...reviewer.sections[0]!.blocks[1]!, explanation: 'word '.repeat(600) }] }] };
    const longBlock = selectAssistBlock(long, 'section-1', 'block-1')!;
    expect(() => resolveStudySelection(long, request({ contentHash: longBlock.contentHash, selection: 'word '.repeat(500) })))
      .toThrowError(expect.objectContaining({ code: 'study_selection_too_large' }));
  });
  it.each([{ action: 'summarize' }, { action: 'chat' }])('rejects unknown actions %j', change => {
    expect(() => parseStudyToolRequest({ ...request(), ...change })).toThrowError(expect.objectContaining({ code: 'invalid_request' }));
  });
  it.each([
    { action: 'define', modifier: 'harder' }, { action: 'explain', modifier: 'plain_words' }, { action: 'example', modifier: 'check' },
    { action: 'ask', modifier: 'deeper', question: 'Why?' }, { action: 'test', modifier: 'simpler' },
  ])('rejects modifiers that do not belong to the action %j', change => {
    expect(() => parseStudyToolRequest({ ...request(), ...change })).toThrowError(expect.objectContaining({ code: 'invalid_request' }));
  });
  it.each([{ userId: 'forged' }, { context: 'client facts' }, { sourceText: 'injected' }, { contentHash: 'bad' }, { reviewerId: 'reviewer-1' }])('rejects forged or extra fields %j', change => {
    expect(() => parseStudyToolRequest({ ...request(), ...change })).toThrow();
  });
  it('requires the current prompt version', () => {
    expect(() => parseStudyToolRequest(request({ promptVersion: 'old' }))).toThrowError(expect.objectContaining({ code: 'conflict' }));
  });
  it('rejects stale content and other Reviewers before any provider work', () => {
    expect(() => resolveStudySelection(reviewer, request({ contentHash: 'a'.repeat(16) }))).toThrowError(expect.objectContaining({ code: 'conflict' }));
    expect(() => resolveStudySelection(reviewer, request({ reviewerId: 'artifact:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }))).toThrowError(expect.objectContaining({ code: 'conflict' }));
    expect(() => resolveStudySelection(reviewer, request({ blockId: 'gone' }))).toThrowError(expect.objectContaining({ code: 'not_found' }));
  });
});

describe('Smart Selection cost limits', () => {
  it('accepts an Ask question under the limit and rejects one over it', () => {
    expect(parseStudyToolRequest(request({ action: 'ask', question: 'q'.repeat(STUDY_LIMITS.question) })).question).toHaveLength(STUDY_LIMITS.question);
    expect(() => parseStudyToolRequest(request({ action: 'ask', question: 'q'.repeat(STUDY_LIMITS.question + 1) })))
      .toThrowError(expect.objectContaining({ code: 'study_question_too_long', status: 422 }));
    expect(() => parseStudyToolRequest(request({ action: 'ask' }))).toThrowError(expect.objectContaining({ code: 'invalid_request' }));
  });
  it('bounds follow-up depth to two', () => {
    const turn = { question: 'Why?', answer: 'Because.' };
    expect(parseStudyToolRequest(request({ action: 'ask', question: 'And?', followUps: [turn, turn] })).followUps).toHaveLength(2);
    expect(() => parseStudyToolRequest(request({ action: 'ask', question: 'And?', followUps: [turn, turn, turn] })))
      .toThrowError(expect.objectContaining({ code: 'study_follow_up_limit' }));
    expect(() => parseStudyToolRequest(request({ action: 'ask', question: 'And?', followUps: [{ ...turn, extra: 1 } as never] }))).toThrow();
    expect(() => parseStudyToolRequest(request({ action: 'explain', followUps: [turn] }))).toThrow();
  });
  it('bounds Test Me answers and requires the question being checked', () => {
    expect(() => parseStudyToolRequest(request({ action: 'test', modifier: 'check', question: 'What?', answer: 'a'.repeat(STUDY_LIMITS.answer + 1) })))
      .toThrowError(expect.objectContaining({ code: 'study_answer_too_long' }));
    expect(() => parseStudyToolRequest(request({ action: 'test', modifier: 'check', answer: 'x' }))).toThrow();
    expect(() => parseStudyToolRequest(request({ action: 'explain', answer: 'x' }))).toThrow();
  });
  it('bounds context to the selected block, nearby section content and cited source only', async () => {
    const huge = { ...saved, source: { ...saved.source, metadata: { reviewerSourceBlocks: [
      { id: 'source-one', text: `${'filler text '.repeat(1500)} least privilege matters here. ${'tail text '.repeat(1500)}` },
      { id: 'source-two', text: 'PRIVATE_UNCITED_SOURCE' }] } } } as unknown as CanonicalReviewerRecord;
    const resolved = resolveStudySelection(reviewer, request());
    const context = await buildStudyContext({ reviewer, request: request(), saved: huge, ...resolved });
    expect(context.sourceExcerpts.join('').length).toBeLessThanOrEqual(STUDY_CONTEXT_BUDGET.source + 10);
    expect(context.sourceExcerpts.join('')).toContain('least privilege matters here');
    expect(studyContextCharacters(context)).toBeLessThanOrEqual(STUDY_CONTEXT_BUDGET.block + STUDY_CONTEXT_BUDGET.nearby + STUDY_CONTEXT_BUDGET.source + 10);
    const serialized = JSON.stringify(context);
    expect(serialized).not.toContain('PRIVATE_UNCITED_SOURCE');
    expect(serialized).not.toContain('UNRELATED_SECTION_DO_NOT_SEND');
    expect(context.nearby).toEqual(['Roles: Roles group permissions for job functions.']);
  });
  it('narrows context instead of failing when provenance is missing', async () => {
    const resolved = resolveStudySelection(reviewer, request({ blockId: 'block-1' }));
    const bare = structuredClone(saved);
    (bare.version.payload as { reviewer: { sections: { items: { sourceBlockIds: string[] }[] }[] } }).reviewer.sections[0]!.items[1]!.sourceBlockIds = [];
    expect((await buildStudyContext({ reviewer, request: request(), saved: bare, ...resolved })).sourceExcerpts).toEqual([]);
  });
  it('uses a bounded output ceiling and low reasoning for every mode', async () => {
    for (const [input, output] of [
      [request({ action: 'define' }), { outcome: 'answer', grounding: 'source', text: 'x' }],
      [request({ action: 'ask', question: 'Why?' }), { outcome: 'answer', grounding: 'source', text: 'x' }],
      [request({ action: 'test' }), { outcome: 'question', question: 'What?' }],
      [request({ action: 'test', modifier: 'check', question: 'What?', answer: 'x' }), { supported: true, verdict: 'correct', feedback: 'Yes.' }],
    ] as const) {
      const { call } = await run(input, output);
      expect(call.maxOutputTokens).toBeLessThanOrEqual(1200);
      expect(call.reasoningEffort).toBe('low');
      expect(call.model).toBe('test-model');
    }
    expect(Math.max(...Object.values(STUDY_OUTPUT_TOKENS))).toBeLessThanOrEqual(1200);
  });
  it('fails an over-long result instead of silently truncating it', async () => {
    await expect(run(request(), { outcome: 'answer', grounding: 'source', text: 'x'.repeat(3001) })).rejects.toMatchObject({ code: 'generation_failed' });
  });
  it('makes the model configurable on the server only', () => {
    expect(studyToolsModel({})).toBe('gpt-5.4-2026-03-05');
    expect(studyToolsModel({ STUDY_TOOLS_MODEL: ' cheaper-model ' })).toBe('cheaper-model');
  });
  it('admits a burst per user and then rate limits', () => {
    for (let index = 0; index < 20; index++) expect(admitStudyRequest('owner', 1000)).toBe(true);
    expect(admitStudyRequest('owner', 1000)).toBe(false);
    expect(admitStudyRequest('other', 1000)).toBe(true);
    expect(admitStudyRequest('owner', 62_000)).toBe(true);
  });
});

describe('Smart Selection grounding', () => {
  it.each(['source', 'mixed', 'general'] as const)('returns the %s grounding state the answer was generated with', async grounding => {
    const { result, call } = await run(request(), { outcome: 'answer', grounding, text: 'Users get only what they need.' });
    expect(result).toMatchObject({ action: 'explain', outcome: 'answer', grounding, text: 'Users get only what they need.' });
    expect(call.instructions).toContain('"mixed" when courseContext supports the central idea');
    expect(call.instructions).not.toContain('Never use outside or general knowledge');
  });
  it('falls back to general knowledge automatically without asking the student', async () => {
    const { result } = await run(request({ action: 'define' }), { outcome: 'answer', grounding: 'general', text: 'A general definition.' });
    expect(result.grounding).toBe('general');
  });
  it('keeps Test Me source-only and never offers outside knowledge', async () => {
    const { result, call } = await run(request({ action: 'test' }), { outcome: 'question', question: 'What does least privilege limit?' });
    expect(result).toMatchObject({ outcome: 'question', grounding: 'source', question: 'What does least privilege limit?', text: '' });
    expect(call.instructions).toContain('Never use outside or general knowledge');
    expect(call.instructions).not.toContain('"general" when');
    expect(call.prompt).not.toContain('answer":');
  });
  it('reports insufficient material truthfully for Test Me instead of inventing a question', async () => {
    expect((await run(request({ action: 'test' }), { outcome: 'insufficient', question: '' })).result).toMatchObject({ outcome: 'insufficient', text: STUDY_INSUFFICIENT_TEST });
    expect((await run(request({ action: 'test', modifier: 'check', question: 'Q?', answer: 'A' }), { supported: false, verdict: 'incorrect', feedback: 'n/a' })).result)
      .toMatchObject({ outcome: 'insufficient', text: STUDY_INSUFFICIENT_TEST });
  });
  it('reports a missing comparison truthfully', async () => {
    const { result } = await run(request({ action: 'define', modifier: 'compare' }), { outcome: 'not_applicable', grounding: 'source', text: 'anything' });
    expect(result).toMatchObject({ outcome: 'not_applicable', text: STUDY_NO_COMPARISON });
  });
  it.each([{}, { outcome: 'answer', grounding: 'invented', text: 'x' }, { outcome: 'answer', grounding: 'source', text: '' }, { outcome: 'answer', grounding: 'source', text: 'x', extra: 1 }])('rejects malformed output %j', async output => {
    await expect(run(request(), output)).rejects.toMatchObject({ code: 'generation_failed' });
  });
  it('maps provider failures to safe product errors without leaking provider text', async () => {
    const p = provider(null);
    const resolved = resolveStudySelection(reviewer, request());
    const context = await buildStudyContext({ reviewer, request: request(), saved, ...resolved });
    p.generate.mockRejectedValueOnce(new Error('OpenAI provider request failed: 429 Rate limit reached SECRET'));
    await expect(generateStudyTool({ request: request(), selection: resolved.selection, context, provider: p.instance })).rejects.toMatchObject({ code: 'rate_limited', message: 'rate_limited' });
    p.generate.mockRejectedValueOnce(new Error('PRIVATE_PROVIDER_SECRET'));
    await expect(generateStudyTool({ request: request(), selection: resolved.selection, context, provider: p.instance })).rejects.toMatchObject({ code: 'unavailable', message: 'unavailable' });
  });
  it('leaves the canonical Reviewer unchanged', async () => {
    const before = JSON.stringify(reviewer);
    await run(request({ action: 'example' }), { outcome: 'answer', grounding: 'mixed', text: 'An example.' });
    expect(JSON.stringify(reviewer)).toBe(before);
  });
});

describe('Smart Selection refinements', () => {
  const info = { outcome: 'answer', grounding: 'source', text: 'Refined.' };
  it.each([
    ['define', 'plain_words', 'genuinely simpler language'],
    ['define', 'in_context', 'specifically in this lesson'],
    ['define', 'key_traits', 'core characteristics'],
    ['explain', 'simpler', 'not just shorter'],
    ['explain', 'deeper', 'underlying mechanism'],
    ['explain', 'analogy', 'exactly one strong analogy'],
    ['explain', 'why_it_matters', 'what problem it addresses'],
    ['example', 'real_world', 'real-world scenario'],
    ['example', 'step_by_step', 'do not force steps'],
    ['example', 'another', 'genuinely different from the previous example'],
    ['example', 'counterexample', 'does NOT qualify'],
  ] as const)('routes %s → %s to its own task', async (action, modifier, phrase) => {
    const { result, call } = await run(request({ action, modifier, previous: 'The earlier result.' }), info);
    expect(result).toMatchObject({ action, modifier });
    expect(call.instructions).toContain(phrase);
    expect(call.prompt).toContain('The earlier result.');
    expect(call.schema.name).toBe('study_tools_info');
  });
  it.each([
    ['harder', 'harder short-answer question'],
    ['apply', 'application question'],
    ['another', 'something different from previousQuestion'],
  ] as const)('routes Test Me → %s to a new source-only question', async (modifier, phrase) => {
    const { result, call } = await run(request({ action: 'test', modifier, previous: 'What does least privilege limit?' }), { outcome: 'question', question: 'Why review access?' });
    expect(result).toMatchObject({ outcome: 'question', grounding: 'source', modifier });
    expect(call.instructions).toContain(phrase);
    expect(call.prompt).toContain('previousQuestion');
  });
  it('checks an answer by meaning and returns a verdict', async () => {
    const { result, call } = await run(request({ action: 'test', modifier: 'check', question: 'What does it limit?', answer: 'damage from hacked accounts' }),
      { supported: true, verdict: 'correct', feedback: 'Right: it limits damage from compromised accounts.' });
    expect(result).toMatchObject({ outcome: 'checked', verdict: 'correct', grounding: 'source' });
    expect(call.instructions).toContain('Judge meaning, not wording');
    expect(call.prompt).toContain('damage from hacked accounts');
  });
  it('explains the answer and converts to choices on request', async () => {
    expect((await run(request({ action: 'test', modifier: 'explain_answer', question: 'Q?' }), { outcome: 'answer', text: 'Because.' })).result)
      .toMatchObject({ outcome: 'answer', text: 'Because.' });
    const choices = await run(request({ action: 'test', modifier: 'choices', question: 'Q?' }), { outcome: 'question', choices: ['A', 'B', 'C', 'D'] });
    expect(choices.result).toMatchObject({ question: 'Q?', choices: ['A', 'B', 'C', 'D'] });
    await expect(run(request({ action: 'test', modifier: 'choices', question: 'Q?' }), { outcome: 'question', choices: ['A', 'A', 'B', 'C'] })).rejects.toMatchObject({ code: 'generation_failed' });
  });
  it('sends Ask follow-ups as bounded background, with the latest question', () => {
    const input = request({ action: 'ask', question: 'Is it the same as need-to-know?', followUps: [{ question: 'Why?', answer: 'To limit damage.' }] });
    const resolved = resolveStudySelection(reviewer, input);
    const call = studyGenerationCall(input, resolved.selection, { reviewerTitle: 'r', sectionTitle: 's', block: { title: 'b', explanation: 'e', keyPoints: [], evidence: [] }, nearby: [], sourceExcerpts: [] });
    expect(JSON.parse(call.prompt)).toMatchObject({ latestQuestion: 'Is it the same as need-to-know?', earlierTurns: [{ question: 'Why?' }] });
    expect(call.instructions).toContain('Ask only covers the selected text');
    expect(call.maxOutputTokens).toBe(STUDY_OUTPUT_TOKENS.ask);
  });
});
