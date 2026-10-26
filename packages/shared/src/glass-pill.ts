/** Presentation only. A Quiz action requires a persisted Reviewer identity. */
export function materialGenerationPill(input: {
  reviewerArtifactId: string | null;
  hasQuiz?: boolean;
  generating?: 'reviewer' | 'quiz' | null;
}): { label: string; busy: boolean; kind: 'reviewer' | 'quiz' } | null {
  if (input.reviewerArtifactId && input.hasQuiz) return null;
  const kind = input.reviewerArtifactId ? 'quiz' : 'reviewer';
  const busy = input.generating === kind;
  return { kind, busy, label: kind === 'reviewer' ? busy ? 'Generating reviewer' : 'Generate reviewer' : busy ? 'Generating quiz' : 'Generate quiz' };
}
