import type { QuizGenerationRequest } from '@stay-focused/shared';
import type { GenerationProvider, GenerationRequest } from '@stay-focused/engine';
import { makeQuizPlan, type QuizPlan, type QuizRegion } from './generation';
export const fixtureSources = [
    ['Cybersecurity', 'Confidentiality limits disclosure to authorized recipients.', 'Integrity protects data from unauthorized alteration.', 'Availability ensures authorized users can access resources.', 'Authentication establishes the identity of a user.', 'Authorization specifies which actions an identified user can perform.'],
    ['Python', 'A list is a mutable ordered collection of values.', 'A tuple is an immutable ordered collection of values.', 'A dictionary maps unique keys to associated values.', 'A for loop iterates over the items in an iterable.', 'A function returns a value using the return statement.'],
    ['Statistics', 'The mean is the sum of observations divided by their count.', 'The median is the middle value of sorted observations.', 'The mode is the most frequently occurring observation.', 'The range is the largest observation minus the smallest observation.', 'The population includes every member of the group under study.'],
    ['Accounting', 'Assets are resources controlled by a business.', 'Liabilities are present obligations of a business.', 'Equity is the residual interest after liabilities are deducted from assets.', 'Revenue increases equity through ordinary business activities.', 'Expenses decrease equity through ordinary business activities.'],
    ['Social science', 'Socialization is the process of learning social norms.', 'Norms are shared expectations about acceptable behavior.', 'Values are collective beliefs about what is desirable.', 'Roles are expected behaviors associated with a social position.', 'Institutions are established patterns organizing social activity.'],
    ['Table', '|Category|Count|\n|Red|12|\n|Blue|8|\nThe Red category contains twelve observations.', 'The Blue category contains eight observations in the table.', 'The combined number of observations in this table is twenty.', 'The difference between the category counts is four observations.', 'The Red count is larger than the Blue count by four observations.'],
    ['Formula', 'For a rectangle, area A = length times width.', 'For a square of side s, perimeter P = 4 times s.', 'For a triangle, area A = base times height divided by 2.', 'Speed is distance traveled divided by elapsed time.', 'Density is the mass of a sample divided by its volume.'],
    ['Short source', 'A stack removes the most recently added element first.', 'A queue removes the earliest added element first.', 'A set contains distinct values without duplicate entries.', 'A tree connects nodes in a hierarchy with a root.', 'A graph contains vertices connected by edges.'],
] as const;
export const request: QuizGenerationRequest = { sourceType: 'material', sourceIds: ['page:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'], questionCount: 5, difficulty: 'mixed' };
export function fixtureRegions(index = 0): QuizRegion[] {
    const [name, ...facts] = fixtureSources[index]!;
    return facts.map((text, i) => ({ id: `topic-${i + 1}`, label: `${name} section ${i + 1}`, text,
        sourceRefs: [{ materialId: request.sourceIds[0]!, regionId: `block-${i + 1}`, page: i + 1, slide: null }], reviewerSectionIds: [`section-${i + 1}`] }));
}
export function candidate(plan: QuizPlan, id: string) {
    const slot = plan.allocation.find(s => s.id === id)!, region = [...plan.topics, ...(plan.reserveTopics ?? [])].find(t => t.id === slot.topicId)!;
    const term = region.text.split(' ').slice(0, 3).join(' ');
    const options = slot.type === 'true_false' ? [{ id: 'a', text: 'True' }, { id: 'b', text: 'False' }] : [
        { id: 'a', text: region.text }, { id: 'b', text: `The stated description of ${term} is incorrect.` }, { id: 'c', text: slot.type === 'multi_select' ? `The provided statement about ${term} is valid.` : `The reverse of the stated description of ${term} is correct.` },
    ];
    return { id, type: slot.type, difficulty: slot.difficulty, prompt: slot.type === 'true_false' ? region.text : `Identify the supported claim for academic section ${id}.`, options, correctOptionIds: slot.type === 'multi_select' ? ['a', 'c'] : ['a'], explanation: region.text, topicId: slot.topicId, concept: `concept ${id}`, sourceEvidence: [{ regionId: region.id, quote: region.text }] };
}
export function acceptingProvider(plan: QuizPlan, mutate?: (questions: ReturnType<typeof candidate>[], round: number) => unknown): GenerationProvider & {
    calls: string[];
} {
    const calls: string[] = [];
    let round = 0;
    return { calls, async generate<T>(input: GenerationRequest<T>): Promise<T> {
            calls.push(input.prompt);
            const data = JSON.parse(input.prompt.slice(input.prompt.lastIndexOf('\n') + 1)) as {
                pending?: {
                    id: string;
                }[];
                questions?: {
                    id: string;
                    correctOptionIds: string[];
                }[];
            };
            if (input.schema.name === 'quiz_questions') {
                const questions = data.pending!.map(s => candidate(plan, s.id));
                return (mutate ? mutate(questions, round++) : { questions }) as T;
            }
            return { verdicts: data.questions!.map(q => ({ id: q.id, reasoning: 'Mocked contract verdict, not academic quality evidence.', assessedDifficulty: candidate(plan, q.id).difficulty, optionAnalysis: candidate(plan, q.id).options.map(o => ({ id: o.id, reasoning: 'Mocked source entailment for contract verification.', supported: candidate(plan, q.id).correctOptionIds.includes(o.id), contradicted: !candidate(plan, q.id).correctOptionIds.includes(o.id) })), defensibleOptionIds: candidate(plan, q.id).correctOptionIds, keyCorrect: true, distractorsWrong: true, unambiguous: true, explanationGrounded: true, sourceSufficient: true, noExternalFacts: true, plausibleOptions: true, distinctConcept: true, noLeakage: true, learnerSelfContained: true, arithmeticCorrect: true, academicValue: true })) } as T;
        } };
}
export const fixturePlan = () => makeQuizPlan(fixtureRegions(), request);
