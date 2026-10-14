import type { QuizAnswerKey, QuizQuestion } from '@stay-focused/shared';

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string');

/** Fail closed for a malformed device key; never put private data into the body. */
export function parseQuizAnswerKey(json: string, quizId: string): QuizAnswerKey | null {
  try {
    const value: unknown = JSON.parse(json);
    if (!record(value) || value.quizId !== quizId || typeof value.versionId !== 'string' || !value.versionId ||
      !Array.isArray(value.questions) || !value.questions.length || value.questions.length > 100) return null;
    const ids = new Set<string>();
    for (const q of value.questions) {
      if (!record(q) || typeof q.id !== 'string' || !q.id || ids.has(q.id) ||
        !strings(q.correctOptionIds) || !q.correctOptionIds.length || q.correctOptionIds.length > 6 ||
        new Set(q.correctOptionIds).size !== q.correctOptionIds.length ||
        typeof q.explanation !== 'string' ||
        (q.acceptedAnswers !== undefined && !strings(q.acceptedAnswers)) ||
        (q.topicId !== undefined && typeof q.topicId !== 'string') ||
        (q.topic !== undefined && typeof q.topic !== 'string')) return null;
      ids.add(q.id);
    }
    return value as unknown as QuizAnswerKey;
  } catch { return null; }
}

export function keyMatchesQuiz(key: QuizAnswerKey, questions: readonly QuizQuestion[]): boolean {
  return key.questions.length === questions.length && questions.every(q => key.questions.some(k => k.id === q.id));
}
