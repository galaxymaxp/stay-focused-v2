import { describe, expect, it } from 'vitest';
import type { QuizAttemptAnswer, QuizQuestion, QuizQuestionResult } from './quiz';

describe('shared discriminated Quiz families', () => {
    const questions: readonly QuizQuestion[] = [
        { id: 'choice', type: 'true_false', prompt: 'A stack removes its newest item first.', difficulty: 'easy', selectionInstruction: 'Choose one answer.', options: [{ id: 'a', text: 'True' }, { id: 'b', text: 'False' }] },
        { id: 'matching', type: 'matching', prompt: 'Match each collection to its removal rule.', difficulty: 'easy', selectionInstruction: 'Match each item to one answer.',
            leftItems: [{ id: 'l1', label: 'Stack' }, { id: 'l2', label: 'Queue' }], rightItems: [{ id: 'r4', label: 'Earliest item first' }, { id: 'r8', label: 'Newest item first' }] },
    ];
    it('serializes a mixed learner model without correctness metadata', () => {
        const serialized = JSON.stringify(questions);
        expect(JSON.parse(serialized).map((q: QuizQuestion) => q.type)).toEqual(['true_false', 'matching']);
        expect(serialized).not.toMatch(/correctPairs|correctOptionIds/);
        expect(serialized).toContain('Earliest item first');
    });
    it('uses explicit partial pairs and preserves legacy choice answers', () => {
        const answers: QuizAttemptAnswer[] = [{ questionId: 'choice', selectedOptionIds: ['a'], finalizedAt: null },
            { type: 'matching', questionId: 'matching', pairs: [{ leftItemId: 'l2', rightItemId: 'r4' }], finalizedAt: null }];
        expect(JSON.parse(JSON.stringify(answers))).toEqual(answers);
        expect(answers[1]).not.toHaveProperty('selectedOptionIds');
    });
    it('uses a separate Matching feedback variant only after finalization', () => {
        const feedback: QuizQuestionResult = { type: 'matching', questionId: 'matching', pairs: [{ leftItemId: 'l2', rightItemId: 'r4' }, { leftItemId: 'l1', rightItemId: 'r8' }],
            correctPairs: [{ leftItemId: 'l1', rightItemId: 'r8' }, { leftItemId: 'l2', rightItemId: 'r4' }], correct: true, explanation: 'The source states each ordering rule.', topicId: 'collections', topic: 'Collections', sourceRefs: [], reviewerSectionIds: [] };
        expect(JSON.parse(JSON.stringify(feedback))).toEqual(feedback);
        expect(feedback).not.toHaveProperty('correctOptionIds');
    });
});
