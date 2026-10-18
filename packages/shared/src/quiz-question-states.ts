import type { QuizAttempt, QuizQuestion } from './quiz';

export type QuizQuestionState = 'current' | 'revealed' | 'answered' | 'unanswered';

/** Navigation status only: drafts do not count as answered; current takes priority. */
export function quizQuestionStates(
  questions: readonly Pick<QuizQuestion, 'id'>[],
  attempt: Pick<QuizAttempt, 'answers' | 'revealedQuestionIds'> | null,
  index: number,
): QuizQuestionState[] {
  const revealed = new Set(attempt?.revealedQuestionIds);
  const answered = new Set(attempt?.answers.filter(answer => answer.finalizedAt).map(answer => answer.questionId));
  return questions.map((question, position) => position === index ? 'current'
    : revealed.has(question.id) ? 'revealed'
      : answered.has(question.id) ? 'answered' : 'unanswered');
}
