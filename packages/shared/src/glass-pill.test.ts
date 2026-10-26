import { expect, it } from 'vitest';
import { materialGenerationPill } from './glass-pill';
it.each([
  [{ reviewerArtifactId: null }, { kind: 'reviewer', label: 'Generate reviewer', busy: false }],
  [{ reviewerArtifactId: null, generating: 'reviewer' as const }, { kind: 'reviewer', label: 'Generating reviewer', busy: true }],
  [{ reviewerArtifactId: 'saved' }, { kind: 'quiz', label: 'Generate quiz', busy: false }],
  [{ reviewerArtifactId: 'saved', generating: 'quiz' as const }, { kind: 'quiz', label: 'Generating quiz', busy: true }],
  [{ reviewerArtifactId: 'saved', hasQuiz: true }, null],
  [{ reviewerArtifactId: null, generating: 'quiz' as const, hasQuiz: true }, { kind: 'reviewer', label: 'Generate reviewer', busy: false }],
])('maps material state %j without offering Quiz before a saved Reviewer', (input, output) => {
  expect(materialGenerationPill(input)).toEqual(output);
});
