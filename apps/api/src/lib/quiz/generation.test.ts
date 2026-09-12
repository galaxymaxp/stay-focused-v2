import { describe, it, expect } from 'vitest';
import type { GenerationProvider, GenerationRequest } from '@stay-focused/engine';
import { makeQuizPlan, generateQuiz, validateCandidate, conflictingQuestions } from './generation';
import { candidate, fixtureRegions, fixtureSources, request, acceptingProvider, fixturePlan } from './fixtures';
import { readQuizRequest, regionsFromBlocks } from './sources';
import { learnerQuestion } from './service';
describe('Quiz source contracts and coverage', () => {
    it.each([5, 10, 15, 20])('accepts bounded count %i', questionCount => expect(readQuizRequest({ ...request, questionCount }).questionCount).toBe(questionCount));
    it.each([0, 4, 21, 100000, 5.5, NaN])('rejects abusive count %i', questionCount => expect(() => readQuizRequest({ ...request, questionCount })).toThrow());
    it.each([{ userId: 'foreign' }, { courseId: 'foreign' }, { provider: 'x' }, { model: 'x' }, { sourceIds: [] }, { sourceIds: ['https://evil.test'] }, { questionTypes: [] }, { questionTypes: ['free_response'] }, { difficulty: 'expert' }])('rejects unsafe input %j', change => expect(() => readQuizRequest({ ...request, ...change })).toThrow());
    it('accepts reviewer source and rejects mismatched reviewer association', () => {
        const id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
        expect(readQuizRequest({ ...request, sourceType: 'reviewer', sourceIds: [id] }).sourceType).toBe('reviewer');
        expect(() => readQuizRequest({ ...request, sourceType: 'reviewer', sourceIds: [id], reviewerId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' })).toThrow();
    });
    it('covers late sections of a long multi-section source', () => {
        const regions = Array.from({ length: 40 }, (_, i) => ({ ...fixtureRegions()[i % 5]!, id: `r${i}`, text: `Unit ${i}. ${fixtureRegions()[i % 5]!.text}` }));
        const plan = makeQuizPlan(regions, request);
        expect(plan.topics).toHaveLength(5);
        expect(plan.topics[4]!.id).toBe('r39');
    });
    it('filters repetitive presentation noise without dropping table/formula content', () => {
        const regions = fixtureRegions();
        const plan = makeQuizPlan([...regions, ...regions, { ...regions[0]!, id: 'agenda', label: 'Agenda' }], request);
        expect(plan.topics).toHaveLength(5);
        expect(plan.allocation.map(s => s.topicId)).toEqual(regions.map(r => r.id));
    });
    it('refuses insufficient source instead of inventing padding', () => expect(() => makeQuizPlan([{ ...fixtureRegions()[0]!, text: 'Hello' }], request)).toThrow());
    it('keeps solution and procedure-step headings with their academic topic', () => {
        const regions = regionsFromBlocks('page:1', 'Statistics', [
            { id: 'h', kind: 'heading', text: 'Grouped median' },
            { id: 'b', kind: 'paragraph', text: 'Find the class containing the middle observation.' },
            { id: 'solution', kind: 'heading', text: 'Solution:' },
            { id: 'step', kind: 'heading', text: '5. Substitute to the formula' },
            { id: 'f', kind: 'paragraph', text: 'Use the class lower boundary and cumulative frequency.' },
        ]);
        expect(regions).toHaveLength(1);
        expect(regions[0]!.label).toBe('Grouped median');
        expect(regions[0]!.sourceRefs.map(r => r.regionId)).toEqual(['b', 'solution', 'step', 'f']);
        expect(regions[0]!.text).toContain('cumulative frequency');
    });
    it('preserves page/slide and links only an exact unique reviewer heading', () => {
        const regions = regionsFromBlocks('page:1', 'Material', [{ id: 'h', kind: 'heading', text: 'Mean' }, { id: 'b', kind: 'paragraph', text: 'The mean is the sum divided by the count.', page: 4, slide: 3 }], { sections: [{ id: 's1', title: 'Mean' }] });
        expect(regions[0]).toMatchObject({ label: 'Mean', reviewerSectionIds: ['s1'], sourceRefs: [{ page: 4, slide: 3, regionId: 'b' }] });
    });
});
describe('Quiz authoring and bounded verification', () => {
    it.each([5, 10, 15, 20])('generates the exact requested %i questions with stable allocation', async (questionCount) => {
        const regions = Array.from({ length: questionCount }, (_, i) => ({ ...fixtureRegions()[i % 5]!, id: `topic-${i + 1}`, text: `Source unit ${i + 1}: ${fixtureRegions()[i % 5]!.text}` }));
        const plan = makeQuizPlan(regions, { ...request, questionCount });
        const questions = await generateQuiz(acceptingProvider(plan), plan);
        expect(questions).toHaveLength(questionCount);
        expect(new Set(questions.map(q => q.id)).size).toBe(questionCount);
    });
    it.each(fixtureSources.map((s, i) => [s[0], i] as const))('validates schema and coverage for %s', async (_name, i) => {
        const plan = makeQuizPlan(fixtureRegions(i), request), provider = acceptingProvider(plan);
        // This test validates deterministic contracts. The mocked semantic verdicts
        // are not evidence that the fixture distractors meet live academic quality.
        const questions = await generateQuiz(provider, plan);
        expect(questions).toHaveLength(5);
        expect(new Set(questions.map(q => q.topicId)).size).toBe(5);
        expect(questions.map(q => q.type)).toEqual(['single_select', 'multi_select', 'true_false', 'single_select', 'multi_select']);
    });
    it.each([
        { prompt: '' }, { prompt: "Which goal is listed as item 2 in the source's numbered goals?" }, { prompt: 'Which goal of IT Security is listed first in the sequence?' }, { options: [{ id: 'a', text: 'same' }, { id: 'b', text: 'Same' }, { id: 'c', text: 'other' }] },
        { correctOptionIds: ['missing'] }, { correctOptionIds: ['a', 'b'] }, { sourceEvidence: [] }, { sourceEvidence: [{ regionId: 'missing', quote: 'invented evidence' }] },
        { sourceEvidence: [{ regionId: 'topic-1', quote: 'This text is not actually in the source.' }] }, { topicId: 'invented' }, { explanation: '' }, { type: 'free_response' }, { answerKey: 'secret' },
    ])('rejects invalid candidate %j', change => expect(() => validateCandidate({ ...candidate(fixturePlan(), 'q1'), ...change }, fixturePlan())).toThrow());
    it('rejects multi-select with no wrong option and malformed true-false', () => {
        const plan = fixturePlan();
        expect(() => validateCandidate({ ...candidate(plan, 'q2'), correctOptionIds: ['a', 'b', 'c'] }, plan)).toThrow();
        expect(() => validateCandidate({ ...candidate(plan, 'q3'), options: [{ id: 'a', text: 'yes' }, { id: 'b', text: 'no' }] }, plan)).toThrow();
    });
    it('regenerates only the rejected slot', async () => {
        const plan = fixturePlan(), provider = acceptingProvider(plan, (questions, round) => ({ questions: questions.map(q => round === 0 && q.id === 'q2' ? { ...q, correctOptionIds: ['bad'] } : q) }));
        expect(await generateQuiz(provider, plan)).toHaveLength(5);
        const second = JSON.parse(provider.calls[2]!.slice(provider.calls[2]!.lastIndexOf('\n') + 1)) as {
            pending: {
                id: string;
            }[];
        };
        expect(second.pending.map(s => s.id)).toEqual(['q2']);
    });
    it.each(['keyCorrect', 'distractorsWrong', 'unambiguous', 'explanationGrounded', 'sourceSufficient', 'noExternalFacts', 'distinctConcept', 'noLeakage', 'plausibleOptions', 'learnerSelfContained', 'arithmeticCorrect', 'academicValue'])('fails closed on semantic %s rejection', async (check) => {
        const plan = fixturePlan(), base = acceptingProvider(plan);
        const provider: GenerationProvider = { async generate<T>(input: GenerationRequest<T>) {
                const value = await base.generate<Record<string, unknown>>(input);
                if (input.schema.name === 'quiz_verification')
                    for (const v of value.verdicts as Record<string, unknown>[])
                        v[check] = false;
                return value as T;
            } };
        await expect(generateQuiz(provider, plan)).rejects.toThrow('quiz_generation_failed');
        expect(base.calls).toHaveLength(6);
    });
    it('withholds proposed keys and requested difficulty from the independent solver', async () => {
        const plan = fixturePlan(), provider = acceptingProvider(plan);
        await generateQuiz(provider, plan);
        const audit = JSON.parse(provider.calls[1]!.slice(provider.calls[1]!.lastIndexOf('\n') + 1)) as {
            questions: Record<string, unknown>[];
        };
        expect(audit.questions.every(q => !('correctOptionIds' in q) && !('concept' in q) && !('difficulty' in q))).toBe(true);
    });
    it.each([[], [{ id: 'a', reasoning: '', supported: true, contradicted: false }]].map(optionAnalysis => ({ optionAnalysis })))('rejects missing per-option evidence analysis', async ({ optionAnalysis }) => {
        const plan = fixturePlan(), base = acceptingProvider(plan);
        const provider: GenerationProvider = { async generate<T>(input: GenerationRequest<T>) {
                const value = await base.generate<Record<string, unknown>>(input);
                if (input.schema.name === 'quiz_verification')
                    for (const v of value.verdicts as Record<string, unknown>[])
                        v.optionAnalysis = optionAnalysis;
                return value as T;
            } };
        await expect(generateQuiz(provider, plan)).rejects.toThrow('quiz_generation_failed');
    });
    it('rejects recall for an explicit hard request', async () => {
        const plan = makeQuizPlan(fixtureRegions(), { ...request, difficulty: 'hard' }), base = acceptingProvider(plan);
        const provider: GenerationProvider = { async generate<T>(input: GenerationRequest<T>) {
                const value = await base.generate<Record<string, unknown>>(input);
                if (input.schema.name === 'quiz_verification')
                    for (const v of value.verdicts as Record<string, unknown>[])
                        if (v.id === 'q4')
                            v.assessedDifficulty = 'easy';
                return value as T;
            } };
        await expect(generateQuiz(provider, plan)).rejects.toThrow('quiz_generation_failed');
    });
    it('mixed uses actual audited labels while retaining meaningful variation', async () => {
        const plan = fixturePlan(), base = acceptingProvider(plan);
        const provider: GenerationProvider = { async generate<T>(input: GenerationRequest<T>) {
                const value = await base.generate<Record<string, unknown>>(input);
                if (input.schema.name === 'quiz_verification')
                    for (const v of value.verdicts as Record<string, unknown>[])
                        if (v.id === 'q4')
                            v.assessedDifficulty = 'medium';
                return value as T;
            } };
        const questions = await generateQuiz(provider, plan);
        expect(questions.map(q => q.difficulty)).toEqual(['easy', 'medium', 'easy', 'medium', 'medium']);
    });
    it('mixed rejects a set with only recall questions', async () => {
        const plan = fixturePlan(), base = acceptingProvider(plan);
        const provider: GenerationProvider = { async generate<T>(input: GenerationRequest<T>) {
                const value = await base.generate<Record<string, unknown>>(input);
                if (input.schema.name === 'quiz_verification')
                    for (const v of value.verdicts as Record<string, unknown>[])
                        v.assessedDifficulty = 'easy';
                return value as T;
            } };
        await expect(generateQuiz(provider, plan)).rejects.toThrow('quiz_generation_failed');
    });
    it('requires independent answer set equality, including alternate defensible answers', async () => {
        const plan = fixturePlan(), base = acceptingProvider(plan);
        const provider: GenerationProvider = { async generate<T>(input: GenerationRequest<T>) {
                const value = await base.generate<Record<string, unknown>>(input);
                if (input.schema.name === 'quiz_verification')
                    for (const v of value.verdicts as Record<string, unknown>[])
                        v.defensibleOptionIds = ['b'];
                return value as T;
            } };
        await expect(generateQuiz(provider, plan)).rejects.toThrow();
    });
    it.each([null, {}, 'bad json', { questions: 'oops' }, { questions: [], rawResponse: 'private' }])('rejects malformed provider output %j', async (raw) => {
        await expect(generateQuiz({ generate: async <T>() => raw as T }, fixturePlan())).rejects.toThrow();
    });
    it('detects normalized duplicates and exact cross-question answer leakage', () => {
        const plan = fixturePlan(), a = validateCandidate(candidate(plan, 'q1'), plan), b = validateCandidate(candidate(plan, 'q4'), plan);
        expect(conflictingQuestions([a, { ...b, prompt: a.prompt }]).has(b.id)).toBe(true);
        expect(conflictingQuestions([a, { ...b, prompt: `Given that ${a.options[0]!.text}, what follows?` }]).has(b.id)).toBe(true);
    });
    it('rejects reused long evidence even when question wording and keys differ', () => {
        const plan = fixturePlan(), a = validateCandidate(candidate(plan, 'q1'), plan), b = validateCandidate(candidate(plan, 'q4'), plan);
        const evidence = [{ regionId: a.topicId, quote: 'A process gathers source information, evaluates it, identifies a weakness and applies a method to exploit the weakness.' }];
        expect(conflictingQuestions([{ ...a, sourceEvidence: evidence }, { ...b, topicId: a.topicId, sourceEvidence: evidence, concept: 'different surface label' }]).has(b.id)).toBe(true);
    });
    it('rejects a paraphrased definition answer supplied inside the prompt', () => {
        const plan = fixturePlan(), base = candidate(plan, 'q1');
        expect(() => validateCandidate({ ...base,
            prompt: 'Which statement defines the arithmetic mean? It is obtained by summing the values in the group and dividing by the number of items.',
            options: [{ id: 'a', text: 'The sum of the values of the group of items divided by the number of such items.' }, ...base.options.slice(1)]
        }, plan)).toThrow('quiz_generation_failed');
    });
    it('unanswered projection strips keys, evidence, explanations and topic hints', () => {
        const q = validateCandidate(candidate(fixturePlan(), 'q1'), fixturePlan());
        const body = JSON.stringify(learnerQuestion(q));
        for (const key of ['correctOptionIds', 'correctValues', 'answerKey', 'sourceEvidence', 'explanation', 'topicId', 'validation'])
            expect(body).not.toContain(key);
    });
});
