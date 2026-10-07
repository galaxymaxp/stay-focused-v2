import type { QuizPlan, QuizRegion, StoredMatchingQuestion } from './generation';
import { makeQuizPlan, validateCandidate } from './generation';
import { candidate, fixtureRegions, request } from './fixtures';

export const matchingRegion: QuizRegion = {
    ...fixtureRegions()[0]!, id: 'matching-topic', label: 'Security objectives',
    text: 'Confidentiality prevents unauthorized disclosure. Integrity prevents unauthorized modification. Availability ensures authorized access to resources.',
};
export function matchingPlan(): QuizPlan {
    return makeQuizPlan([matchingRegion, ...fixtureRegions(1)], { ...request, difficulty: 'easy', questionTypes: ['single_select', 'matching'] });
}
export function matchingCandidate(plan = matchingPlan(), id = 'q1') {
    const slot = plan.allocation.find(s => s.id === id)!;
    const topic = [...plan.topics, ...(plan.reserveTopics ?? [])].find(t => t.id === slot.topicId)!;
    return { id, type: 'matching' as const, prompt: 'Match each security objective to its purpose.', difficulty: slot.difficulty, topicId: topic.id,
        leftItems: [{ id: 'opaque_l7', label: 'Confidentiality' }, { id: 'opaque_l3', label: 'Integrity' }, { id: 'opaque_l9', label: 'Availability' }],
        rightItems: [{ id: 'opaque_r2', label: 'Prevent unauthorized modification' }, { id: 'opaque_r8', label: 'Ensure authorized access to resources' }, { id: 'opaque_r4', label: 'Prevent unauthorized disclosure' }],
        correctPairs: [{ leftItemId: 'opaque_l7', rightItemId: 'opaque_r4' }, { leftItemId: 'opaque_l3', rightItemId: 'opaque_r2' }, { leftItemId: 'opaque_l9', rightItemId: 'opaque_r8' }],
        explanation: topic.text, concept: 'security-objective-associations', sourceEvidence: [{ regionId: topic.id, quote: topic.text }] };
}
export function matchingQuestion(): StoredMatchingQuestion {
    const value = validateCandidate(matchingCandidate(), matchingPlan());
    if (value.type !== 'matching') throw new Error('Expected Matching');
    return value;
}
export function mixedQuestions() {
    const plan = matchingPlan();
    return plan.allocation.map(slot => validateCandidate(slot.type === 'matching' ? matchingCandidate(plan, slot.id) : candidate(plan, slot.id), plan));
}
