import { expect, it } from 'vitest';
import { fixturePlan, candidate, validateCandidate } from './fixtures';
import { evaluateAnswer } from './service';

it('grades typed identification strictly and includes accepted text in checked feedback', () => {
  const plan = fixturePlan();
  const question = { ...validateCandidate(candidate(plan, 'q1'), plan), type: 'identification' as const,
    options: [], correctOptionIds: ['canonical-id'], acceptedAnswers: ['Photosynthesis'] };
  const answer = (text: string) => evaluateAnswer(question, { questionId: question.id, selectedOptionIds: [text], finalizedAt: 'now' });
  expect(answer('  PHOTOSYNTHESIS  ')).toMatchObject({ correct: true, correctAnswerText: 'Photosynthesis' });
  for (const text of ['Photosynthesi', 'photo synthesis', 'I think Photosynthesis', '']) expect(answer(text).correct).toBe(false);
});
