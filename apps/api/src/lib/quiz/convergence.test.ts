import { describe, expect, it } from 'vitest';
import type { GenerationProvider, GenerationRequest } from '@stay-focused/engine';
import { blueprintCompatible, duplicateBlueprintIntent, evidenceAffordances, planBlueprintPool } from './blueprints';
import { generateQuiz, makeQuizPlan, validateCandidate, type QuizConvergenceState, type QuizGenerationDiagnostic, type QuizPlan, type StoredQuestion } from './generation';
import { acceptingProvider, candidate, fixturePlan, fixtureRegions, request } from './fixtures';

function pooledProvider(plan: QuizPlan, reject: (id: string, round: number) => boolean = () => false) {
    const base = acceptingProvider(plan);
    let round = 0;
    const provider: GenerationProvider = { async generate<T>(input: GenerationRequest<T>): Promise<T> {
        const output = await base.generate<Record<string, unknown>>(input);
        if (input.schema.name === 'quiz_questions') {
            round++;
            const data = JSON.parse(input.prompt.slice(input.prompt.lastIndexOf('\n') + 1)) as { blueprints: { slotId: string }[] };
            const questions = output.questions as ReturnType<typeof candidate>[];
            output.questions = questions.flatMap(question => data.blueprints.filter(blueprint => blueprint.slotId === question.id).map((_, index) => ({ ...question,
                prompt: index ? (question.type === 'true_false' ? question.prompt : `Which source-supported boundary applies to academic unit ${question.id}?`) : question.prompt,
                concept: index ? `alternate ${question.id}` : question.concept,
            })));
        } else {
            for (const verdict of output.verdicts as Record<string, unknown>[]) {
                if (reject(String(verdict.id), round)) {
                    verdict.academicValue = false;
                    verdict.reasoning = 'This candidate tests wording recognition rather than a meaningful distinction.';
                }
            }
        }
        return output as T;
    } };
    return { provider, calls: base.calls };
}

describe('B25.3.2 candidate convergence', () => {
    it('selects the valid second alternative after first-candidate academic failure without another author call', async () => {
        const plan = fixturePlan(), { provider, calls } = pooledProvider(plan, id => !id.includes('__candidate_'));
        const diagnostics: QuizGenerationDiagnostic[] = [];
        const questions = await generateQuiz(provider, plan, undefined, [], diagnostic => diagnostics.push(diagnostic));
        expect(questions).toHaveLength(5);
        expect(calls).toHaveLength(2);
        expect(questions.every(question => !question.id.includes('__candidate_'))).toBe(true);
        expect(diagnostics.filter(diagnostic => diagnostic.pool).map(diagnostic => diagnostic.pool?.selectedIndex)).toEqual([1, 1, 1, 1, 1]);
        expect(diagnostics.filter(diagnostic => diagnostic.pool).every(diagnostic => diagnostic.pool?.candidateCount === 2)).toBe(true);
    });
    it('selects reproducibly when both alternatives pass without a selector provider', async () => {
        const outputs = await Promise.all([0, 1, 2].map(async () => {
            const plan = fixturePlan(), { provider, calls } = pooledProvider(plan);
            const output = await generateQuiz(provider, plan);
            expect(calls).toHaveLength(2);
            return output;
        }));
        expect(outputs[0]).toEqual(outputs[1]);
        expect(outputs[1]).toEqual(outputs[2]);
    });
    it('accumulates pool findings and exhausts within four author calls without a partial return', async () => {
        const plan = fixturePlan(), { provider, calls } = pooledProvider(plan, () => true);
        const snapshots: { questions: StoredQuestion[]; state: QuizConvergenceState }[] = [];
        await expect(generateQuiz(provider, plan, async (questions, state) => { snapshots.push(structuredClone({ questions, state })); })).rejects.toMatchObject({ failureClass: 'repair_exhausted' });
        expect(calls.filter(call => call.startsWith('Author'))).toHaveLength(3);
        expect(snapshots.every(snapshot => snapshot.questions.length === 0)).toBe(true);
        expect(snapshots.at(-1)?.state.findingCodes.q1).toContain('academicValue');
        const durable = JSON.stringify(snapshots);
        expect(durable).not.toContain('wording recognition rather');
        expect(durable).not.toContain('correctOptionIds');
        expect(durable).not.toContain('Identify the supported claim');
    });
    it('switches to a new semantic intent after both initial and direct pools fail', async () => {
        const regions = fixtureRegions().map((region, index) => ({ ...region, text: `Control ${index} requires an identity check before access because only authorized learners may use the protected resource, whereas an unknown learner must be denied.` }));
        const plan = makeQuizPlan(regions, { ...request, questionTypes: ['single_select'] });
        const { provider, calls } = pooledProvider(plan, (_id, round) => round < 3);
        const output = await generateQuiz(provider, plan);
        expect(output).toHaveLength(5);
        const authors = calls.filter(call => call.startsWith('Author')).map(call => JSON.parse(call.slice(call.lastIndexOf('\n') + 1)) as { blueprints: { intentKey: string }[] });
        const initial = new Set(authors[0]!.blueprints.map(blueprint => blueprint.intentKey));
        expect(authors[2]!.blueprints.every(blueprint => !initial.has(blueprint.intentKey))).toBe(true);
        expect(authors).toHaveLength(3);
    });
    it('keeps accepted q4 byte-identical and excludes keys from later author calls', async () => {
        const plan = fixturePlan(), initial = validateCandidate(candidate(plan, 'q4'), plan);
        const { provider, calls } = pooledProvider(plan, (id, round) => round === 1 && !id.includes('__candidate_'));
        const output = await generateQuiz(provider, plan, undefined, [initial]);
        expect(output.find(question => question.id === 'q4')).toEqual(initial);
        const author = JSON.parse(calls[0]!.slice(calls[0]!.lastIndexOf('\n') + 1)) as { pending: { id: string }[]; acceptedContext: unknown[] };
        expect(author.pending.map(slot => slot.id)).toEqual(['q1', 'q2', 'q3', 'q5']);
        expect(JSON.stringify(author.acceptedContext)).not.toContain('correctOptionIds');
        expect(JSON.stringify(author.acceptedContext)).not.toContain('explanation');
        const audit = JSON.parse(calls[1]!.slice(calls[1]!.lastIndexOf('\n') + 1)) as { questions: { id: string }[] };
        expect(audit.questions.every(question => question.id !== 'q4')).toBe(true);
    });
    it('retains the durable author-call bound across repeated provider interruptions', async () => {
        const plan = fixturePlan();
        plan.reserveTopics = fixtureRegions().map(region => ({ ...region, id: `${region.id}-reserve` }));
        let saved: QuizConvergenceState | undefined;
        let calls = 0;
        const provider: GenerationProvider = { async generate() { calls++; throw new Error('private-provider-error'); } };
        for (let attempt = 0; attempt < 6; attempt++) {
            await expect(generateQuiz(provider, plan, async (_questions, state) => { saved = structuredClone(state); }, [], undefined, saved)).rejects.toThrow('quiz_generation_failed');
        }
        expect(calls).toBe(4);
        expect(saved?.authorCalls.q1).toBe(4);
        expect(saved?.nextRound).toBe(4);
    });
    it('rejects a semantic blueprint mismatch even when other gates pass', async () => {
        const plan = fixturePlan(), base = acceptingProvider(plan);
        const provider: GenerationProvider = { async generate<T>(input: GenerationRequest<T>): Promise<T> {
            const output = await base.generate<Record<string, unknown>>(input);
            if (input.schema.name === 'quiz_verification') for (const verdict of output.verdicts as Record<string, unknown>[]) verdict.blueprintFollowed = false;
            return output as T;
        } };
        await expect(generateQuiz(provider, plan)).rejects.toMatchObject({ failureClass: 'repair_exhausted' });
    });
    it('restores active allocation on a complete checkpoint without calling the provider', async () => {
        const plan = fixturePlan();
        const accepted = plan.allocation.map(slot => validateCandidate(candidate(plan, slot.id), plan));
        const allocation = plan.allocation.map(slot => ({ ...slot, difficulty: 'easy' as const }));
        const state: QuizConvergenceState = { nextRound: 4, allocation, authorCalls: {}, verifierCalls: {}, failedIntents: {}, findingCodes: {}, blueprints: [] };
        const provider = acceptingProvider(plan);
        expect(await generateQuiz(provider, plan, undefined, accepted, undefined, state)).toEqual(accepted);
        expect(plan.allocation).toEqual(allocation);
        expect(provider.calls).toHaveLength(0);
    });
});

describe('source-derived blueprint planning', () => {
    it('never grants application or comparison from a definition-only fragment', () => {
        const region = { ...fixtureRegions()[0]!, text: 'A tuple is an immutable ordered collection of values.' };
        expect(evidenceAffordances(region)).toEqual(['conceptual_recall']);
        const plan = makeQuizPlan(fixtureRegions(1), { ...request, difficulty: 'easy' });
        const slot = plan.allocation[1]!;
        const blueprint = planBlueprintPool(plan, slot, 0, [])[0]!;
        expect(blueprintCompatible({ ...blueprint, supportIds: [region.id], affordance: 'application' }, region)).toBe(false);
        expect(blueprintCompatible({ ...blueprint, supportIds: [region.id], affordance: 'comparison' }, region)).toBe(false);
        expect(blueprintCompatible({ ...blueprint, supportIds: [region.id], difficulty: 'hard' }, region)).toBe(false);
    });
    it('uses comparison only with an explicit source contrast and detects duplicate intent', () => {
        const plan = fixturePlan();
        plan.topics[0]!.text = 'Authentication establishes identity, whereas authorization determines permitted actions.';
        const blueprint = planBlueprintPool(plan, plan.allocation[0]!, 0, [])[0]!;
        expect(blueprint.affordance).toBe('comparison');
        expect(blueprintCompatible(blueprint, plan.topics[0]!)).toBe(true);
        expect(duplicateBlueprintIntent(blueprint, { ...blueprint, id: 'another', slotId: 'q9' })).toBe(true);
    });
    it('diversifies five lecture slots across concepts, owners, support and archetypes', () => {
        const facts = [
            'Authentication establishes identity, whereas authorization determines permitted actions.',
            'A backup prevents permanent loss because it provides a separate recoverable copy.',
            'Containment must occur before eradication and recovery follows after the cause is removed.',
            'Factors include different categories, such as a password and a physical token.',
            'If a patch breaks the service, then rollback restores its prior version.',
        ];
        const plan = makeQuizPlan(fixtureRegions().map((region, index) => ({ ...region, text: facts[index]! })), request);
        const blueprints = plan.allocation.reduce<ReturnType<typeof planBlueprintPool>>((used, slot) => [...used, ...planBlueprintPool(plan, slot, 0, used)], []);
        expect(blueprints).toHaveLength(10);
        expect(new Set(blueprints.flatMap(blueprint => blueprint.targetConceptIds)).size).toBe(5);
        expect(new Set(blueprints.flatMap(blueprint => blueprint.supportIds)).size).toBe(5);
        expect(new Set(blueprints.map(blueprint => blueprint.affordance)).size).toBeGreaterThanOrEqual(4);
        expect(blueprints.every(blueprint => blueprint.affordance !== 'conceptual_recall')).toBe(true);
        expect(JSON.stringify(blueprints)).not.toContain('Authentication establishes');
    });
});
