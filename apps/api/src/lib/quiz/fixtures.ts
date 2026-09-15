import type { GenerationProvider,GenerationRequest } from '@stay-focused/engine';
import type { QuizGenerationRequest } from '@stay-focused/shared';
import { validateQuizSet } from './ai-first';
import type { QuizRegion } from './generation';
type QuizPlan = { regions: QuizRegion[]; allocation: { id: string }[] };
export function makeQuizPlan(regions: QuizRegion[], input: QuizGenerationRequest): QuizPlan { return { regions, allocation: Array.from({length: input.questionCount}, (_, i) => ({ id: `q${i + 1}` })) }; }
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
 const index = Number(id.slice(1)) - 1;
 const region = plan.regions[index % plan.regions.length]!;
 return { id, type: index % 3 === 1 ? 'multi_select' : index % 3 === 2 ? 'true_false' : 'single_select', difficulty: 'easy', prompt: `Which claim is supported for question ${id}?`, options: index % 3 === 2 ? [{id:'a',text:'True'},{id:'b',text:'False'}] : [{id:'a',text:region.text},{id:'b',text:'Alternative B'},{id:'c',text:'Alternative C'},{id:'d',text:'Alternative D'}], correctOptionIds:index % 3 === 1 ? ['a','c'] : ['a'], explanation:region.text, concept:`Concept ${id}`, sourceRefs:[region.id] };
}
export function validateCandidate(raw: ReturnType<typeof candidate>, plan: QuizPlan) {
 const all = plan.allocation.map(slot => slot.id === raw.id ? raw : candidate(plan,slot.id));
 return validateQuizSet({questions:all}, {...request, questionCount:all.length}, plan.regions).find(q=>q.id===raw.id)!;
}
export function acceptingProvider(plan: QuizPlan): GenerationProvider & {calls: string[]} {
 const calls: string[]=[];
 return {calls, async generate<T>(r: GenerationRequest<T>): Promise<T> { calls.push(r.prompt);return {questions:plan.allocation.map(s=>candidate(plan,s.id))} as T; }};
}
export const fixturePlan = () => makeQuizPlan(fixtureRegions(), request);
