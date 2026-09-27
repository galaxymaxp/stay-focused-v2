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
