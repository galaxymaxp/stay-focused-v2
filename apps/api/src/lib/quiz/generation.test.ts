import { describe, it, expect } from 'vitest';
import type { GenerationProvider, GenerationRequest } from '@stay-focused/engine';
import { academicValueFindings, makeQuizPlan, generateQuiz, repairInstruction, supportAffordsDifficulty, validateCandidate, conflictingQuestionFindings, conflictingQuestions, QuizGenerationFailure, type QuizGenerationDiagnostic, type QuizPlan, type QuizRegion } from './generation';
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
    it('refuses one verbose claim instead of treating character count as five-question coverage', () => {
        const singleClaim = { ...fixtureRegions()[0]!, text: `A single unsupported claim ${'without another independent concept '.repeat(8)}` };
        expect(() => makeQuizPlan([singleClaim], request)).toThrow('quiz_source_unavailable');
    });
    it('splits a coarse prepared region into distinct support units before allocation', async () => {
        const text = [
            'Authentication establishes a learner identity before protected access is considered.',
            'Authorization determines which protected actions that established identity may perform.',
            'Integrity detects unauthorized changes to stored or transmitted academic records.',
            'Availability keeps approved learning resources reachable when authorized users need them.',
            'Confidentiality restricts disclosure of private learning records to approved recipients.',
            'Audit records associate each protected change with the identity that initiated it.',
        ].join('\n');
        const coarse: QuizRegion = { ...fixtureRegions()[0]!, id: 'coarse-source', text };
        const plan = makeQuizPlan([coarse], { ...request, questionTypes: ['single_select', 'true_false'] });
        expect(plan.topics).toHaveLength(5);
        expect(new Set(plan.allocation.map(slot => slot.topicId)).size).toBe(5);
        expect(plan.topics.every(topic => text.includes(topic.text))).toBe(true);
        expect(await generateQuiz(acceptingProvider(plan), plan)).toHaveLength(5);
    });
    it('does not repeatedly allocate a tiny heading group when a coarse body has enough support units', () => {
        const tiny: QuizRegion = { ...fixtureRegions()[0]!, id: 'tiny', text: 'Access is limited. Identity is checked.' };
        const body: QuizRegion = { ...fixtureRegions()[1]!, id: 'body', text: Array.from({ length: 8 }, (_, index) => `Control ${index + 1} validates a distinct protected operation using its own recorded evidence and outcome.`).join('\n') };
        const plan = makeQuizPlan([tiny, body], { ...request, questionTypes: ['single_select', 'true_false'] });
        expect(new Set(plan.allocation.map(slot => slot.topicId)).size).toBe(5);
        expect(plan.allocation.some(slot => slot.topicId.startsWith('tiny'))).toBe(false);
    });
    it('reserves unused support for final slot-only replan and assigns difficulty by source affordance', () => {
        const facts = [
            'A syllabus names the course and its instructor for enrolled learners.',
            'A prerequisite must be completed before enrollment because it supplies required foundations.',
            'Formative feedback occurs during practice, whereas summative evaluation judges performance after instruction.',
            'A rubric states criteria before work begins so learners can connect evidence to expected performance.',
            'Retrieval practice strengthens recall when learners reconstruct an answer before checking feedback.',
            'Spacing separates study sessions over time, while cramming concentrates the same practice into one session.',
            'Transfer requires applying a learned principle when surface details differ from the original example.',
            'Metacognitive monitoring compares confidence with demonstrated performance so a learner can revise study choices.',
        ];
        const source: QuizRegion = { ...fixtureRegions()[0]!, id: 'lecture', text: facts.join('\n') };
        const plan = makeQuizPlan([source], request);
        expect(plan.topics).toHaveLength(5);
        expect(plan.reserveTopics).toHaveLength(3);
        expect(plan.allocation.filter(slot => slot.difficulty === 'medium').every(slot => supportAffordsDifficulty(plan.topics.find(topic => topic.id === slot.topicId)!, 'medium'))).toBe(true);
    });
    it('does not assign explicit hard slots to short declarative support', () => {
        expect(() => makeQuizPlan(fixtureRegions(), { ...request, difficulty: 'hard' })).toThrow('quiz_source_unavailable');
    });
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
    it('classifies deterministic academic-value examples without weakening semantic audit', () => {
        expect(academicValueFindings('A learner authenticates successfully but lacks course authorization. Which access decision follows from the distinction?', ['Deny course access until authorization succeeds.'])).toEqual([]);
        expect(academicValueFindings('Which word is bold on the source slide?', ['Authorization'])).toContain('formatting_trivia');
        expect(academicValueFindings('Complete the sentence: Authorization ______ access.', ['determines allowed course access'])).toContain('sentence_fragment_completion');
        expect(academicValueFindings('Which option merely repeats the wording in the source text?', ['Authorization determines allowed course access.'])).toContain('wording_only_recognition');
        expect(academicValueFindings('Authorization determines whether an identified learner may open a protected course. Which statement is correct?', ['Authorization determines whether an identified learner may open a protected course.'])).toContain('answer_restatement');
    });
    it.each([
        ['academicValue', 'meaningful'],
        ['difficulty_mismatch', 'requested level'],
        ['distractorsWrong', 'demonstrably false'],
        ['option_analysis_invalid', 'demonstrably false'],
        ['explanationGrounded', 'only facts'],
        ['noLeakage', 'answer phrase'],
        ['answer_key_mismatch', 'options and answer key together'],
        ['distinctConcept', 'accepted question'],
    ])('maps %s to finding-specific repair guidance', (finding, phrase) => {
        expect(repairInstruction(finding)).toContain(phrase);
    });
    it.each([5, 10, 15, 20])('generates the exact requested %i questions with stable allocation', async (questionCount) => {
        const regions = Array.from({ length: questionCount }, (_, i) => ({ ...fixtureRegions()[i % 5]!, id: `topic-${i + 1}`, text: `Source unit ${i + 1}: ${fixtureRegions()[i % 5]!.text}` }));
        const plan = makeQuizPlan(regions, { ...request, questionCount, difficulty: 'easy' });
        const questions = await generateQuiz(acceptingProvider(plan), plan);
        expect(questions).toHaveLength(questionCount);
        expect(new Set(questions.map(q => q.id)).size).toBe(questionCount);
    });
    it.each(fixtureSources.map((s, i) => [s[0], i] as const))('validates schema and coverage for %s', async (_name, i) => {
        const plan = makeQuizPlan(fixtureRegions(i), { ...request, difficulty: 'easy' }), provider = acceptingProvider(plan);
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
    it('converges a lecture-shaped two-slot semantic failure through direct repair and full reauthor', async () => {
        const facts = [
            'Diagnostic assessment occurs before instruction because it identifies prior knowledge that should shape the lesson plan.',
            'Formative assessment supplies feedback during learning, whereas summative assessment evaluates achievement after instruction.',
            'A valid assessment measures the intended learning outcome, while reliability concerns consistency across repeated measurements.',
            'Criterion-referenced interpretation compares performance with a stated standard rather than ranking learners against one another.',
            'Authentic assessment asks learners to apply knowledge in a realistic task and justify decisions using relevant evidence.',
            'A rubric makes evaluation criteria explicit before submission so performance can be judged against the same dimensions.',
            'Feedback is actionable when it identifies a gap and a next step, not merely whether an answer was right or wrong.',
            'Mastery learning uses evidence from a check to trigger corrective practice before the learner advances to later material.',
        ];
        const region: QuizRegion = { ...fixtureRegions()[0]!, id: 'lecture-like-extraction', label: 'Assessment lecture', text: facts.join('\n') };
        const plan = makeQuizPlan([region], { ...request, questionTypes: ['single_select', 'true_false'] });
        const base = acceptingProvider(plan);
        const difficultyRejected = plan.allocation.find(slot => slot.difficulty === 'medium')!.id;
        const academicRejected = [...plan.allocation].reverse().find(slot => slot.id !== difficultyRejected)!.id;
        const initiallyRejected = [difficultyRejected, academicRejected];
        let verifierRound = 0;
        const provider: GenerationProvider & { calls: string[] } = { calls: base.calls, async generate<T>(input: GenerationRequest<T>) {
                const value = await base.generate<Record<string, unknown>>(input);
                if (input.schema.name === 'quiz_verification' && verifierRound < 2) {
                    for (const verdict of value.verdicts as Record<string, unknown>[]) {
                        if (initiallyRejected.includes(String(verdict.id)))
                            verdict.academicValue = false;
                        if (verdict.id === academicRejected) {
                            verdict.distractorsWrong = false;
                            const analysis = verdict.optionAnalysis as Record<string, unknown>[];
                            analysis[1] = { ...analysis[1], supported: true, contradicted: false, reasoning: 'This distractor remains a defensible interpretation of the assigned support.' };
                            verdict.defensibleOptionIds = [String((verdict.defensibleOptionIds as string[])[0]), String(analysis[1]!.id)];
                        }
                        if (verdict.id === difficultyRejected)
                            verdict.assessedDifficulty = verdict.assessedDifficulty === 'easy' ? 'medium' : 'easy';
                    }
                    verifierRound++;
                }
                return value as T;
            } };
        const questions = await generateQuiz(provider, plan);
        expect(questions).toHaveLength(5);
        const direct = JSON.parse(provider.calls[2]!.slice(provider.calls[2]!.lastIndexOf('\n') + 1)) as Record<string, unknown>;
        const reauthor = JSON.parse(provider.calls[4]!.slice(provider.calls[4]!.lastIndexOf('\n') + 1)) as Record<string, unknown>;
        expect(direct).toMatchObject({ strategy: 'direct_correction' });
        expect(JSON.stringify(direct)).toContain('academicValue');
        expect(JSON.stringify(direct)).toContain('previousQuestion');
        expect(JSON.stringify(direct)).toContain('distractor_is_defensible');
        expect(JSON.stringify(direct)).toContain('answer_key_mismatch');
        expect(reauthor).toMatchObject({ strategy: 'full_reauthor' });
        expect(JSON.stringify(reauthor)).not.toContain('previousQuestion');
        expect(reauthor).toMatchObject({ acceptedContext: expect.arrayContaining([expect.objectContaining({ id: 'q2' })]) });
    });
    it('uses a compatible unused support unit only on the final repair stage', async () => {
        const facts = Array.from({ length: 8 }, (_, index) => `When lecture condition ${index + 1} occurs, the learner compares the recorded observation with the stated rule because the appropriate response depends on that relationship rather than on wording alone.`);
        const region: QuizRegion = { ...fixtureRegions()[0]!, id: 'reserve-lecture', text: facts.join('\n') };
        const plan = makeQuizPlan([region], request);
        const originalTopic = plan.allocation[4]!.topicId;
        const base = acceptingProvider(plan);
        let verifierRound = 0;
        const provider: GenerationProvider & { calls: string[] } = { calls: base.calls, async generate<T>(input: GenerationRequest<T>) {
                const value = await base.generate<Record<string, unknown>>(input);
                if (input.schema.name === 'quiz_verification') {
                    if (verifierRound++ < 3) {
                        const q5 = (value.verdicts as Record<string, unknown>[]).find(verdict => verdict.id === 'q5');
                        if (q5)
                            q5.academicValue = false;
                    }
                }
                return value as T;
            } };
        const questions = await generateQuiz(provider, plan);
        expect(questions).toHaveLength(5);
        expect(questions.find(question => question.id === 'q5')!.topicId).not.toBe(originalTopic);
        const alternate = JSON.parse(provider.calls[6]!.slice(provider.calls[6]!.lastIndexOf('\n') + 1)) as Record<string, unknown>;
        expect(alternate).toMatchObject({ strategy: 'alternate_support' });
        expect(JSON.stringify(alternate)).toContain('alternate_support');
    });
    it('reports the demonstrated coarse-plan failure as duplicate evidence before bounded repair exhaustion', async () => {
        const topic: QuizRegion = { ...fixtureRegions()[0]!, id: 'legacy-coarse-topic', text: 'A single coarse source region repeats this exact evidence passage even though the old planner allocated every requested question to it.' };
        const plan: QuizPlan = { requestedQuestionCount: 5, requestedDifficulty: 'mixed', topics: [topic], allocation: Array.from({ length: 5 }, (_, index) => ({ id: `q${index + 1}`, topicId: topic.id, type: index % 2 ? 'true_false' : 'single_select', difficulty: index % 2 ? 'medium' : 'easy' })) };
        const diagnostics: QuizGenerationDiagnostic[] = [];
        const provider = acceptingProvider(plan);
        await expect(generateQuiz(provider, plan, undefined, [], diagnostic => diagnostics.push(diagnostic))).rejects.toMatchObject({ failureClass: 'repair_exhausted' });
        expect(provider.calls).toHaveLength(6);
        expect(diagnostics.some(diagnostic => diagnostic.failureClass === 'set_validation' && diagnostic.findings.includes('duplicate_evidence'))).toBe(true);
        expect(diagnostics.at(-1)).toMatchObject({ failureClass: 'repair_exhausted', round: 4, acceptedCount: 1, pendingCount: 4 });
    });
    it('reproduces the hosted two-topic q2/q4-only acceptance pattern without private source text', async () => {
        const tiny: QuizRegion = { ...fixtureRegions()[0]!, id: 'tiny', text: 'Access is limited. Identity is checked.' };
        const firstFact = 'Authentication establishes the identity used to evaluate access to a protected learning resource.';
        const secondFact = 'Authorization determines whether that established identity may perform a particular protected action.';
        const body: QuizRegion = { ...fixtureRegions()[1]!, id: 'body', text: `${firstFact}\n${secondFact}` };
        const legacyPlan: QuizPlan = { requestedQuestionCount: 5, requestedDifficulty: 'mixed', topics: [tiny, body], allocation: Array.from({ length: 5 }, (_, index) => ({ id: `q${index + 1}`, topicId: index % 2 ? body.id : tiny.id, type: index % 2 ? 'true_false' : 'single_select', difficulty: index === 3 ? 'hard' : index % 2 ? 'medium' : 'easy' })) };
        const diagnostics: QuizGenerationDiagnostic[] = [];
        const provider = acceptingProvider(legacyPlan, questions => ({ questions: questions.map(q => {
            if (q.id === 'q2') return { ...q, prompt: firstFact, sourceEvidence: [{ regionId: body.id, quote: firstFact }] };
            if (q.id === 'q4') return { ...q, prompt: secondFact, sourceEvidence: [{ regionId: body.id, quote: secondFact }] };
            return { ...q, sourceEvidence: [{ regionId: tiny.id, quote: 'Unsupported evidence' }] };
        }) }));
        await expect(generateQuiz(provider, legacyPlan, undefined, [], diagnostic => diagnostics.push(diagnostic))).rejects.toMatchObject({ failureClass: 'repair_exhausted' });
        expect(diagnostics.at(-1)).toMatchObject({ failureClass: 'repair_exhausted', questionIds: ['q1', 'q3', 'q5'], acceptedCount: 2, pendingCount: 3 });
        const repairedPlan = makeQuizPlan([tiny, { ...body, text: Array.from({ length: 6 }, (_, index) => `Protected rule ${index + 1} uses distinct evidence to distinguish an authorized learning action from an unauthorized one.`).join('\n') }], request);
        expect(new Set(repairedPlan.allocation.map(slot => slot.topicId)).size).toBe(5);
        expect(repairedPlan.allocation.every(slot => !slot.topicId.startsWith('tiny'))).toBe(true);
    });
    it('reports evidence failures separately while preserving valid questions during targeted repair', async () => {
        const plan = fixturePlan(), diagnostics: QuizGenerationDiagnostic[] = [];
        const provider = acceptingProvider(plan, questions => ({ questions: questions.map(q => q.id === 'q2' ? { ...q, sourceEvidence: [{ regionId: q.topicId, quote: 'not present in source' }] } : q) }));
        await expect(generateQuiz(provider, plan, undefined, [], diagnostic => diagnostics.push(diagnostic))).rejects.toBeInstanceOf(QuizGenerationFailure);
        expect(diagnostics.some(diagnostic => diagnostic.failureClass === 'evidence_validation' && diagnostic.questionIds.includes('q2'))).toBe(true);
        expect(diagnostics.at(-1)).toMatchObject({ failureClass: 'repair_exhausted', acceptedCount: 4, pendingCount: 1 });
        const second = JSON.parse(provider.calls[2]!.slice(provider.calls[2]!.lastIndexOf('\n') + 1)) as { pending: { id: string }[]; acceptedContext: { id: string }[] };
        expect(second.pending.map(slot => slot.id)).toEqual(['q2']);
        expect(second.acceptedContext.map(question => question.id)).toEqual(['q1', 'q3', 'q4', 'q5']);
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
        const hardRegions = fixtureRegions().map((region, index) => ({ ...region, text: `When condition ${index + 1} occurs, the learner must first infer an intermediate result from the stated relationship; then the learner combines that result with a second rule because the final action depends on both conclusions. This support explicitly contrasts a correct two-step application with a one-step near miss.` }));
        const plan = makeQuizPlan(hardRegions, { ...request, difficulty: 'hard' }), base = acceptingProvider(plan);
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
        expect(questions.map(q => q.difficulty)).toEqual(plan.allocation.map(slot => slot.id === 'q4' ? 'medium' : slot.difficulty));
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
    it('classifies duplicate evidence independently from prompt and concept duplication', () => {
        const plan = fixturePlan(), a = validateCandidate(candidate(plan, 'q1'), plan), b = validateCandidate(candidate(plan, 'q4'), plan);
        const quote = 'A sufficiently long exact evidence passage establishes one protected academic rule and is deliberately reused by this regression.';
        const findings = conflictingQuestionFindings([{ ...a, sourceEvidence: [{ regionId: a.topicId, quote }] }, { ...b, topicId: a.topicId, prompt: 'Apply a different scenario to choose the supported outcome.', concept: 'different concept', sourceEvidence: [{ regionId: a.topicId, quote }] }]);
        expect(findings.get(b.id)).toContain('duplicate_evidence');
        expect(findings.get(b.id)).not.toContain('duplicate_concept');
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
