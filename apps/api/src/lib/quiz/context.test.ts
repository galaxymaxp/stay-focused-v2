import { describe, expect, it } from 'vitest';
import type { GenerationProvider, GenerationRequest } from '@stay-focused/engine';
import { blueprintCompatible, planBlueprintPool } from './blueprints';
import { generateQuiz, makeQuizPlan, validateCandidate, type QuizConvergenceState } from './generation';
import { candidate, fixtureRegions, request } from './fixtures';
import { coarseLectureRegions, groundedContractProvider, lectureBlocks, lectureRegions } from './context.fixtures';
import { contextSupports, MAX_QUIZ_SUPPORT_CHARS, supportConceptId, supportStrength } from './support';
import { serializeQuizDiagnostic } from './diagnostics';

const choiceRequest = { ...request, questionTypes: ['single_select', 'true_false'] as const };
describe('B25.3.3 context, ownership and complete-set feasibility', () => {
    it('retains definitions, conditions, contrasts, examples and consequences in bounded exact contexts', () => {
        const regions = lectureRegions(), plan = makeQuizPlan(regions, choiceRequest);
        expect(plan.topics).toHaveLength(5);
        for (const region of plan.topics) {
            expect(region.text.length).toBeLessThanOrEqual(MAX_QUIZ_SUPPORT_CHARS);
            expect(regions.some(original => original.text === region.text)).toBe(true);
            expect(region.text).toContain('For example');
            expect(region.evidence).toHaveLength(3);
            for (const span of region.evidence!) expect(region.text.slice(span.start, span.end)).toBe(lectureBlocks().find(block => block.id === span.sourceRef.regionId)!.text);
        }
        expect(plan.topics.some(topic => topic.text.includes('In contrast') || topic.text.includes('whereas'))).toBe(true);
    });
    it('splits a coarse owner without detaching dependent conditions/examples or copying unrelated page references', () => {
        const original = coarseLectureRegions()[0]!, supports = contextSupports(original, true).filter(region => supportStrength(region));
        expect(supports).toHaveLength(8);
        expect(supports.every(region => original.text.includes(region.text) && region.text.includes('For example'))).toBe(true);
        expect(supports.every(region => region.sourceRefs.length === 3 && region.evidence?.length === 3)).toBe(true);
        expect(supports[0]!.sourceRefs.map(ref => ref.page)).toEqual([1, 2, 3]);
        expect(supports[1]!.sourceRefs.map(ref => ref.page)).toEqual([4, 5, 6]);
        const plan = makeQuizPlan([original], choiceRequest);
        expect(plan.topics).toHaveLength(5); expect(plan.reserveTopics).toHaveLength(3);
    });
    it('rejects a 53-character non-assertion and unsupported mixed difficulty before any generation', () => {
        const weak = { ...fixtureRegions()[0]!, text: lectureBlocks()[0]!.text };
        expect(weak.text).toHaveLength(53); expect(supportStrength(weak)).toBe(0);
        expect(makeQuizPlan(lectureRegions(), choiceRequest).topics.some(topic => topic.id.includes('outline'))).toBe(false);
        expect(() => makeQuizPlan(fixtureRegions(1), choiceRequest)).toThrow('quiz_source_unavailable');
        expect(makeQuizPlan(fixtureRegions(1), { ...choiceRequest, difficulty: 'easy' }).topics).toHaveLength(5);
    });
    it('freezes a feasible full concept/archetype/difficulty allocation before immutable winners', () => {
        const plan = makeQuizPlan(lectureRegions(), choiceRequest);
        expect(new Set(plan.topics.map(supportConceptId)).size).toBe(5);
        expect(new Set(plan.initialBlueprints!.map(blueprint => blueprint.slotId)).size).toBe(5);
        expect(new Set(plan.initialBlueprints!.map(blueprint => blueprint.affordance)).size).toBeGreaterThan(1);
        expect(plan.initialBlueprints!.every(blueprint => blueprintCompatible(blueprint, plan.topics.find(topic => topic.id === blueprint.supportIds[0])!))).toBe(true);
        expect(plan.allocation.filter(slot => slot.difficulty === 'medium').length).toBeGreaterThanOrEqual(1);
        expect(plan.allocation.filter(slot => slot.difficulty === 'easy').length).toBeGreaterThanOrEqual(1);
    });
    it('uses capable evidence outside the initial coverage sample to make mixed allocation feasible', () => {
        const recall = ['An amber marker is a named symbol for the first record.', 'A bronze marker is a named symbol for the second record.', 'A copper marker is a named symbol for the third record.', 'A diamond marker is a named symbol for the fourth record.', 'An emerald marker is a named symbol for the fifth record.'];
        const regions = recall.map((text, index) => ({ ...fixtureRegions()[0]!, id: `recall-${index}`, text }));
        const capable = lectureRegions().find(region => region.text.includes('rollback'))!;
        // Six source units: even five-slot coverage omits index four.
        regions.splice(4, 0, capable);
        const plan = makeQuizPlan(regions, choiceRequest);
        const slot = plan.allocation.find(item => item.topicId === capable.id)!;
        expect(slot.difficulty).toBe('medium');
        expect(plan.initialBlueprints!.filter(blueprint => blueprint.slotId === slot.id).every(blueprint => blueprint.affordance !== 'conceptual_recall')).toBe(true);
    });
    it('rejects an externally restored all-easy mixed allocation without consuming a provider call', async () => {
        const plan = makeQuizPlan(lectureRegions(), choiceRequest);
        plan.allocation = plan.allocation.map(slot => ({ ...slot, difficulty: 'easy' }));
        let calls = 0;
        const provider: GenerationProvider = { async generate<T>(): Promise<T> { calls++; throw new Error('Must not reach provider'); } };
        await expect(generateQuiz(provider, plan)).rejects.toMatchObject({ findings: ['quiz_plan_infeasible'] });
        expect(calls).toBe(0);
    });
    it('plans sufficient reasoning variety at the existing twenty-question limit', () => {
        const regions = Array.from({ length: 20 }, (_, index) => ({ ...fixtureRegions()[0]!, id: `component-${index}`,
            text: `The component ${index + 1} restricts access only when the required permission is present. If permission is absent, the component must refuse the protected operation.` }));
        const plan = makeQuizPlan(regions, { ...choiceRequest, questionCount: 20 });
        expect(plan.allocation.filter(slot => slot.difficulty === 'medium')).toHaveLength(4);
        expect(new Set(plan.initialBlueprints!.map(blueprint => blueprint.slotId)).size).toBe(20);
    });
    it('generates an exact complete contract set from retained context with original block evidence', async () => {
        const plan = makeQuizPlan(lectureRegions(), choiceRequest);
        const output = await generateQuiz(groundedContractProvider(plan), plan);
        expect(output).toHaveLength(5);
        for (const question of output) {
            expect(question.sourceEvidence).toHaveLength(3);
            expect(question.sourceRefs.map(ref => ref.regionId)).toEqual(question.sourceEvidence.map(evidence => evidence.regionId.split('/').at(-1)));
            expect(question.sourceEvidence.every(evidence => lectureBlocks().some(block => evidence.regionId.endsWith(`/${block.id}`) && block.text === evidence.quote))).toBe(true);
        }
    });
    it('stores only the precise cited owner and rejects cross-block or joined quotes', () => {
        const plan = makeQuizPlan(lectureRegions(), choiceRequest), slot = plan.allocation[0]!, topic = plan.topics[0]!;
        const first = topic.evidence![0]!, second = topic.evidence![1]!, quote = topic.text.slice(second.start, second.end);
        const authored = { ...candidate(plan, slot.id), sourceEvidence: [{ regionId: second.id, quote }], explanation: quote };
        expect(validateCandidate(authored, plan).sourceRefs).toEqual([second.sourceRef]);
        expect(() => validateCandidate({ ...authored, sourceEvidence: [{ regionId: first.id, quote }] }, plan)).toThrow();
        expect(() => validateCandidate({ ...authored, sourceEvidence: [{ regionId: first.id, quote: topic.text }] }, plan)).toThrow();
    });
    it('does not reset failed semantic patterns when a different concept hash is assigned', () => {
        const plan = makeQuizPlan(lectureRegions(), choiceRequest), slot = plan.allocation[0]!;
        const old = planBlueprintPool(plan, slot, 0, []), replacement = plan.reserveTopics![0]!;
        const next = planBlueprintPool(plan, { ...slot, topicId: replacement.id }, 3, [], old.map(blueprint => blueprint.intentKey), ['academicValue'], old.map(blueprint => blueprint.patternKey));
        expect(next.every(blueprint => !old.some(previous => previous.patternKey === blueprint.patternKey))).toBe(true);
        expect(next.every(blueprint => blueprint.targetConceptIds[0] !== old[0]!.targetConceptIds[0])).toBe(true);
    });
    it('ranks a stronger genuinely unused reserve above the first weak candidate while preserving accepted questions and call bounds', async () => {
        const plan = makeQuizPlan(lectureRegions(), choiceRequest), slot = plan.allocation[4]!;
        const weak = { ...fixtureRegions()[0]!, id: 'weak-reserve', text: 'A bookmark records the saved position in a reading list.' };
        const strong = { ...fixtureRegions()[0]!, id: 'strong-reserve', text: 'A version rollback restores the prior service if a deployment fails. Before deployment, a prepared recovery copy provides the required previous version. For example, a failed patch requires recovery rather than leaving the unavailable service unchanged.' };
        plan.reserveTopics = [weak, strong];
        const initialPlan = structuredClone(plan);
        const accepted = await generateQuiz(groundedContractProvider(initialPlan), initialPlan);
        const initial = accepted.filter(question => question.id !== slot.id);
        const resume: QuizConvergenceState = { nextRound: 3, allocation: plan.allocation, authorCalls: { [slot.id]: 3 }, verifierCalls: { [slot.id]: 3 }, failedIntents: {}, findingCodes: {}, blueprints: [], failedPatterns: {} };
        let saved: QuizConvergenceState | undefined;
        const output = await generateQuiz(groundedContractProvider(plan), plan, async (_questions, state) => { saved = structuredClone(state); }, initial, undefined, resume);
        expect(output.find(question => question.id === slot.id)!.topicId).toBe(strong.id);
        expect(output.filter(question => question.id !== slot.id)).toEqual(initial);
        expect(saved!.authorCalls[slot.id]).toBe(4); expect(saved!.verifierCalls[slot.id]).toBe(4);
    });
    it('restores cross-support failure exclusions from a legacy durable state without resetting reserved budget', async () => {
        const plan = makeQuizPlan(lectureRegions(), choiceRequest), slot = plan.allocation[0]!, initial = planBlueprintPool(plan, slot, 0, []);
        const resume: QuizConvergenceState = { nextRound: 2, allocation: plan.allocation, authorCalls: { [slot.id]: 2 }, verifierCalls: {}, failedIntents: { [slot.id]: initial.map(blueprint => blueprint.intentKey) }, findingCodes: { [slot.id]: ['academicValue'] }, blueprints: [] };
        let saved: QuizConvergenceState | undefined;
        const provider: GenerationProvider = { async generate<T>(input: GenerationRequest<T>): Promise<T> {
            const data = JSON.parse(input.prompt.slice(input.prompt.lastIndexOf('\n') + 1)) as { blueprints: { slotId: string; patternKey: string }[] };
            expect(data.blueprints.filter(blueprint => blueprint.slotId === slot.id).every(blueprint => !initial.some(previous => previous.patternKey === blueprint.patternKey))).toBe(true);
            throw new Error('Synthetic interruption');
        } };
        await expect(generateQuiz(provider, plan, async (_questions, state) => { saved = structuredClone(state); }, [], undefined, resume)).rejects.toThrow('quiz_generation_failed');
        expect(saved!.failedPatterns![slot.id]).toEqual(initial.map(blueprint => blueprint.patternKey));
        expect(saved!.authorCalls[slot.id]).toBeLessThanOrEqual(3);
    });
    it('serializes nested symbolic diagnostics as JSON without copying private extra fields', () => {
        const diagnostic = { failureClass: 'candidate_pool' as const, round: 1, questionIds: ['q1'], findings: [], acceptedCount: 1, pendingCount: 4,
            privateText: 'PRIVATE_SOURCE', pool: { slotId: 'q1', candidateCount: 2, selectedIndex: 1, authorCalls: 1, verifierCalls: 1,
                blueprints: [{ id: 'q1:r1', affordance: 'comparison', supportIds: ['owner'], intentKey: 'hash|comparison|0', correctOptionIds: ['PRIVATE_KEY'] }],
                results: [{ index: 0, findings: ['academicValue'], reasoning: 'PRIVATE_REASONING' }, { index: 1, findings: [] }] } };
        const json = serializeQuizDiagnostic('job', diagnostic);
        expect(JSON.parse(json).pool).toMatchObject({ selectedIndex: 1, results: [{ index: 0, findings: ['academicValue'] }, { index: 1, findings: [] }] });
        expect(json).not.toMatch(/PRIVATE_|\[Object\]/);
    });
});
