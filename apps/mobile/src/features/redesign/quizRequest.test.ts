import { expect, it } from 'vitest';
import { quizIntentInput } from './quizRequest';

it('carries the editable title into the durable Quiz request body', () => {
  const intent = quizIntentInput({ title: '  My Biology Quiz  ', reviewerArtifactId: 'reviewer', questionCount: 15 });
  expect(intent.body).toMatchObject({ title: 'My Biology Quiz', questionCount: 15, sourceIds: ['reviewer'] });
  expect(quizIntentInput({ title: ' ', reviewerArtifactId: 'reviewer' }).body).not.toHaveProperty('title');
});
