import type { QuizQuestion,QuizSourceReference } from '@stay-focused/shared';
export interface QuizRegion {
    id: string;
    label: string;
    text: string;
    sourceRefs: QuizSourceReference[];
    reviewerSectionIds: string[];
}
export interface StoredQuestion extends QuizQuestion {
    correctOptionIds: string[];
    explanation: string;
    topicId: string;
    topic: string;
    sourceRefs: QuizSourceReference[];
    reviewerSectionIds: string[];
    sourceEvidence: {
        regionId: string;
        quote: string;
    }[];
    concept: string;
    /** Private source-supported aliases for direct recall and corrections. */
    acceptedAnswers?: string[];
    incorrectTerm?: string;
}
export const normalized = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
/** Matching items share an instruction stem, so their left-side term identifies them. */
export const quizQuestionKey = (q: { readonly prompt: string; readonly type?: string; readonly leftItem?: string }) => q.type === 'matching' && q.leftItem ? `matching ${normalized(q.leftItem)}` : normalized(q.prompt);
/** Exact keys and highly overlapping long non-matching stems are duplicate study items. */
export function isRepeatedQuizQuestion(candidate: Pick<StoredQuestion, 'prompt'> & Partial<Pick<StoredQuestion, 'type' | 'leftItem'>>, pool: readonly (Pick<StoredQuestion, 'prompt'> & Partial<Pick<StoredQuestion, 'type' | 'leftItem'>>)[]): boolean {
    const key = quizQuestionKey(candidate);
    const words = new Set(key.split(' ').filter(Boolean));
    return pool.some(other => {
        const otherKey = quizQuestionKey(other);
        if (otherKey === key) return true;
        if (candidate.type === 'matching' || other.type === 'matching') return false;
        const otherWords = new Set(otherKey.split(' ').filter(Boolean));
        if (words.size < 8 || otherWords.size < 8) return false;
        const intersection = [...words].filter(word => otherWords.has(word)).length;
        return intersection / new Set([...words, ...otherWords]).size > 0.85;
    });
}
export const ALL_QUIZ_TYPES: readonly StoredQuestion['type'][] = ['single_select', 'identification', 'true_false', 'modified_true_false', 'matching'];
/** Only a Mixed request (three or more allowed formats) is rebalanced; a single format is kept as requested. */
export function quizMixSurplus(questions: readonly Pick<StoredQuestion, 'type'>[], requestedTypes: readonly StoredQuestion['type'][] | undefined): { type: StoredQuestion['type']; surplus: number } | null {
    const allowed = requestedTypes ?? ALL_QUIZ_TYPES;
    if (allowed.length < 3 || questions.length < 10) return null;
    const counts = new Map<StoredQuestion['type'], number>();
    for (const question of questions) counts.set(question.type, (counts.get(question.type) ?? 0) + 1);
    const [type, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]!;
    const cap = Math.ceil(questions.length * 0.6);
    if (count > cap) return { type, surplus: count - cap };
    // Too few distinct formats: free enough of the dominant format for the missing ones.
    const missing = Math.min(3, allowed.length) - counts.size;
    return missing > 0 ? { type, surplus: Math.min(missing, count - 1) } : null;
}
