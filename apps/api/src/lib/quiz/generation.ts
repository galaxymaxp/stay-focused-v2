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
