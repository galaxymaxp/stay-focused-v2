import { describe, expect, it } from 'vitest';
import type { GenerationProvider, GenerationRequest } from '@stay-focused/engine';
import { generateQuiz, makeQuizPlan, validateCandidate } from './generation';
import { learnerQuestion, evaluateAnswer } from './service';
import { candidate, fixtureRegions, request } from './fixtures';
import { matchingCandidate, matchingPlan, matchingQuestion } from './matching.fixtures';

describe('Matching generation and shared contract', () => {
    it('accepts valid grounded associations and persists an explicit private key', () => {
        const q = matchingQuestion();
        expect(q.correctPairs).toEqual(matchingCandidate().correctPairs);
        const publicQuestion = learnerQuestion(q);
        expect(publicQuestion).toMatchObject({ type: 'matching', leftItems: expect.arrayContaining([{ id: 'opaque_l7', label: 'Confidentiality' }]) });
        expect(JSON.stringify(publicQuestion)).not.toMatch(/correctPairs|correctOptionIds|sourceEvidence|explanation/);
        expect(learnerQuestion(q)).toEqual(publicQuestion);
        expect(publicQuestion).not.toHaveProperty('options');
    });
    it.each([
        { correctPairs: matchingCandidate().correctPairs.map((p, i) => i === 0 ? { ...p, leftItemId: 'missing' } : p) },
        { correctPairs: matchingCandidate().correctPairs.map((p, i) => i === 0 ? { ...p, rightItemId: 'missing' } : p) },
        { correctPairs: matchingCandidate().correctPairs.map((p, i) => i === 1 ? { ...p, leftItemId: 'opaque_l7' } : p) },
        { leftItems: [] }, { rightItems: [] },
        { leftItems: [{ id: 'duplicate', label: 'First' }, { id: 'duplicate', label: 'Second' }] },
        { leftItems: [{ id: 'opaque_l7', label: '' }, { id: 'opaque_l3', label: 'Integrity' }, { id: 'opaque_l9', label: 'Availability' }] },
        { rightItems: [{ id: 'opaque_r2' }, { id: 'opaque_r8', label: 'Access' }, { id: 'opaque_r4', label: 'Disclosure' }] },
        { correctPairs: [{ leftItemId: 'opaque_l7', rightItemId: 'opaque_r4' }, { leftItemId: 'opaque_l3', rightItemId: 'opaque_r4' }, { leftItemId: 'opaque_l9', rightItemId: 'opaque_r8' }] },
        { correctOptionIds: ['opaque_r4'] },
        { sourceEvidence: [{ regionId: 'matching-topic', quote: 'Invented source material does not belong here.' }] },
    ])('rejects invalid output %j', change => {
        expect(() => validateCandidate({ ...matchingCandidate(), ...change }, matchingPlan())).toThrow();
    });
    it('does not force Matching onto insufficient evidence', () => {
        expect(() => makeQuizPlan(fixtureRegions(), { ...request, questionTypes: ['matching'] })).toThrow('quiz_source_unavailable');
        expect(makeQuizPlan(fixtureRegions(), { ...request, questionTypes: ['single_select', 'matching'] }).allocation.every(s => s.type === 'single_select')).toBe(true);
    });
    it('preserves choice capacity when grouping a coarse source would leave too few questions', () => {
        const region = { ...fixtureRegions()[0]!, text: fixtureRegions().map(r => r.text).join(' ') };
        const plan = makeQuizPlan([region], { ...request, questionTypes: ['single_select', 'matching'] });
        expect(plan.allocation).toHaveLength(5);
        expect(plan.allocation.every(slot => slot.type === 'single_select')).toBe(true);
    });
    it('exact mapping is order-independent and has no partial question credit', () => {
        const q = matchingQuestion();
        const score = (pairs: typeof q.correctPairs) => evaluateAnswer(q, { type: 'matching', questionId: q.id, pairs, finalizedAt: '2026-10-07T00:00:00Z' }).correct;
        expect(score([...q.correctPairs].reverse())).toBe(true);
        expect(score(q.correctPairs.map((p, i, all) => i < 2 ? { ...p, rightItemId: all[1 - i]!.rightItemId } : p))).toBe(false);
        expect(score(q.correctPairs.map((p, i, all) => ({ ...p, rightItemId: all[(i + 1) % all.length]!.rightItemId })))).toBe(false);
        expect(score(q.correctPairs.slice(0, 2))).toBe(false);
    });
    it('reload preserves independently ordered sides and rejects missing public labels instead of displaying IDs', () => {
        const q = matchingQuestion();
        const reordered = { ...q, leftItems: [...q.leftItems].reverse(), rightItems: [...q.rightItems].reverse() };
        expect(learnerQuestion(reordered)).toMatchObject({ leftItems: reordered.leftItems, rightItems: reordered.rightItems });
        expect(evaluateAnswer(reordered, { type: 'matching', questionId: q.id, pairs: q.correctPairs, finalizedAt: '2026-10-07T00:00:00Z' }).correct).toBe(true);
        expect(() => learnerQuestion({ ...q, leftItems: q.leftItems.map((item, index) => index === 0 ? { ...item, label: '' } : item) })).toThrow('unavailable');
    });
    it.each(['valid', 'wrong_key', 'missing_pair_analysis'])('runs mixed generation and independent audit: %s', async mode => {
        const plan = matchingPlan();
        let questionsSchema = '', auditPrompt = '';
        const provider: GenerationProvider = { async generate<T>(input: GenerationRequest<T>) {
            const data = JSON.parse(input.prompt.slice(input.prompt.lastIndexOf('\n') + 1));
            if (input.schema.name === 'quiz_questions') {
                questionsSchema = JSON.stringify(input.schema.schema);
                return { questions: data.pending.map((s: { id: string }) => plan.allocation.find(a => a.id === s.id)!.type === 'matching' ? matchingCandidate(plan, s.id) : candidate(plan, s.id)) } as T;
            }
            auditPrompt = input.prompt;
            return { verdicts: data.questions.map((audit: { id: string; type: string }) => {
                const slotId = audit.id.split('__candidate_')[0]!;
                const q = audit.type === 'matching' ? matchingCandidate(plan, slotId) : candidate(plan, slotId);
                const common = { id: audit.id, reasoning: 'Synthetic contract audit against provided evidence.', assessedDifficulty: q.difficulty,
                    keyCorrect: true, distractorsWrong: true, unambiguous: true, explanationGrounded: true, sourceSufficient: true,
                    noExternalFacts: true, plausibleOptions: true, distinctConcept: true, noLeakage: true, learnerSelfContained: true, arithmeticCorrect: true, academicValue: true, blueprintFollowed: true };
                return q.type === 'matching' ? { ...common, defensiblePairs: mode === 'wrong_key' ? q.correctPairs.slice(0, 1) : q.correctPairs,
                    pairAnalysis: mode === 'missing_pair_analysis' ? [] : q.leftItems.flatMap(l => q.rightItems.map(r => ({ leftItemId: l.id, rightItemId: r.id, reasoning: 'Synthetic pair assessment.', supported: q.correctPairs.some(p => p.leftItemId === l.id && p.rightItemId === r.id) }))) }
                    : { ...common, defensibleOptionIds: q.correctOptionIds, optionAnalysis: q.options.map(o => ({ id: o.id, reasoning: 'Synthetic option assessment.', supported: q.correctOptionIds.includes(o.id), contradicted: !q.correctOptionIds.includes(o.id) })) };
            }) } as T;
        } };
        if (mode !== 'valid') {
            await expect(generateQuiz(provider, plan)).rejects.toThrow('quiz_generation_failed');
            return;
        }
        const generated = await generateQuiz(provider, plan);
        expect(generated).toHaveLength(5);
        expect(generated.some(q => q.type === 'matching')).toBe(true);
        expect(generated.some(q => q.type === 'single_select')).toBe(true);
        expect(questionsSchema).toContain('correctPairs'); expect(questionsSchema).toContain('anyOf');
        const audit = JSON.parse(auditPrompt.slice(auditPrompt.lastIndexOf('\n') + 1));
        expect(JSON.stringify(audit.questions)).not.toMatch(/correctPairs|correctOptionIds/);
    });
});
