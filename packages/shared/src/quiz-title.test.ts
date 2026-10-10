import { expect, it } from 'vitest';
import { suggestedQuizTitle } from './quiz-title';

it('suggests the selected topic, otherwise the reviewer, with the current count', () => {
  expect(suggestedQuizTitle('Biology', ['Photosynthesis'], 10)).toBe('Photosynthesis — 10 questions');
  expect(suggestedQuizTitle('Biology', ['Cells', 'Plants'], 25)).toBe('Biology — 25 questions');
  expect(suggestedQuizTitle('', [], 5)).toBe('Study Quiz — 5 questions');
  expect(suggestedQuizTitle('x'.repeat(250), [], 100)).toHaveLength(200);
});
