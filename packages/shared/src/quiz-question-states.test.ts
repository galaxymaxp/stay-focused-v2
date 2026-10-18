import { describe, expect, it } from 'vitest';
import { quizQuestionStates } from './quiz-question-states';

const questions = Array.from({ length: 5 }, (_, index) => ({ id: `q${index}` }));
const attempt = {
  revealedQuestionIds: ['q0', 'q1'],
  answers: [
    { questionId: 'q1', selectedOptionIds: ['a'], finalizedAt: 'checked' },
    { questionId: 'q2', selectedOptionIds: ['a'], finalizedAt: 'checked' },
    { questionId: 'q3', selectedOptionIds: ['a'], finalizedAt: null },
  ],
};
describe('quiz question navigation states', () => {
  it('prioritizes current, then revealed, then finalized answers, leaving drafts unanswered', () => {
    expect(quizQuestionStates(questions, attempt, 0)).toEqual(['current', 'revealed', 'answered', 'unanswered', 'unanswered']);
    expect(quizQuestionStates(questions, attempt, 2)[2]).toBe('current');
  });
  it.each([-1, 5, 1.5, Number.NaN])('has no current question for invalid index %s', index => {
    expect(quizQuestionStates(questions, attempt, index)).toEqual(['revealed', 'revealed', 'answered', 'unanswered', 'unanswered']);
  });
  it('supports saved questions without an attempt and empty quizzes', () => {
    expect(quizQuestionStates(questions.slice(0, 2), null, 0)).toEqual(['current', 'unanswered']);
    expect(quizQuestionStates([], attempt, 0)).toEqual([]);
  });
});
