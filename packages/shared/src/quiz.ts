import type { GenerationState } from './experience';
export type QuizChoiceQuestionType = 'single_select' | 'multi_select' | 'true_false';
export type QuizQuestionType = QuizChoiceQuestionType | 'matching';
export type QuizDifficulty = 'easy' | 'medium' | 'hard';
export type QuizGenerationState = GenerationState;
export interface QuizGenerationRequest {
    readonly sourceType: 'material' | 'reviewer';
    readonly sourceIds: readonly string[];
    readonly reviewerId?: string;
    readonly questionCount: number;
    readonly difficulty: QuizDifficulty | 'mixed';
    readonly questionTypes?: readonly QuizQuestionType[];
}
export interface QuizSourceReference {
    readonly materialId: string;
    readonly regionId: string;
    readonly page: number | null;
    readonly slide: number | null;
}
export interface QuizQuestionOption {
    readonly id: string;
    readonly text: string;
}
/** Explicit learner projection: no key, explanation, evidence or verifier output. */
export interface QuizChoiceQuestion {
    readonly id: string;
    readonly type: QuizChoiceQuestionType;
    readonly prompt: string;
    readonly options: readonly QuizQuestionOption[];
    readonly selectionInstruction: 'Choose one answer.' | 'Select all correct answers.';
    readonly difficulty: QuizDifficulty;
}
export interface QuizMatchingItem {
    readonly id: string;
    readonly label: string;
}
export interface QuizMatchPair {
    readonly leftItemId: string;
    readonly rightItemId: string;
}
/** One-to-one relationships. Correct pairs exist only in private keys/allowed feedback. */
export interface QuizMatchingQuestion {
    readonly id: string;
    readonly type: 'matching';
    readonly prompt: string;
    readonly leftItems: readonly QuizMatchingItem[];
    readonly rightItems: readonly QuizMatchingItem[];
    readonly selectionInstruction: 'Match each item to one answer.';
    readonly difficulty: QuizDifficulty;
}
export type QuizQuestion = QuizChoiceQuestion | QuizMatchingQuestion;
export type QuizLearningState = 'not_started' | 'in_progress' | 'completed' | 'abandoned';
/** Server-derived learning progress, independent of artifact generation status.
 * questionCount and the nullable percentage scores reuse the existing Quiz names.
 */
export interface QuizLearningProgress {
    readonly learningState: QuizLearningState;
    /** Distinct questions with a saved nonempty selection or mapping, including unchecked drafts. */
    readonly answeredCount: number;
    readonly questionCount: number;
    readonly activeAttemptId: string | null;
    readonly attemptCount: number;
    readonly completedAttemptCount: number;
    readonly latestCompletedAt: string | null;
    readonly latestScore: number | null;
    readonly bestScore: number | null;
}
export interface QuizSummary extends QuizLearningProgress {
    readonly id: string;
    readonly title: string;
    readonly courseId: string;
    readonly reviewerId: string | null;
    readonly sourceId: string | null;
    readonly sourceMaterialIds: readonly string[];
    readonly difficulty: QuizDifficulty | 'mixed';
    readonly createdAt: string;
    readonly updatedAt: string;
}
export interface Quiz extends QuizSummary {
    readonly questions: readonly QuizQuestion[];
}
export interface QuizChoiceAnswer {
    /** Missing only in legacy choice payloads; new API projections emit choice. */
    readonly type?: 'choice';
    readonly questionId: string;
    readonly selectedOptionIds: readonly string[];
    readonly finalizedAt: string | null;
}
export interface QuizMatchingAnswer {
    readonly type: 'matching';
    readonly questionId: string;
    readonly pairs: readonly QuizMatchPair[];
    readonly finalizedAt: string | null;
}
export type QuizAttemptAnswer = QuizChoiceAnswer | QuizMatchingAnswer;
interface QuizResultFeedback {
    readonly questionId: string;
    readonly correct: boolean;
    readonly explanation: string;
    readonly topicId: string;
    readonly topic: string;
    readonly sourceRefs: readonly QuizSourceReference[];
    readonly reviewerSectionIds: readonly string[];
}
export interface QuizChoiceQuestionResult extends QuizResultFeedback {
    readonly type?: 'choice';
    readonly selectedOptionIds: readonly string[];
    readonly correctOptionIds: readonly string[];
}
export interface QuizMatchingQuestionResult extends QuizResultFeedback {
    readonly type: 'matching';
    readonly pairs: readonly QuizMatchPair[];
    readonly correctPairs: readonly QuizMatchPair[];
}
export type QuizQuestionResult = QuizChoiceQuestionResult | QuizMatchingQuestionResult;
export interface QuizAttempt {
    readonly id: string;
    readonly quizId: string;
    readonly startedAt: string;
    readonly completedAt: string | null;
    readonly status: 'in_progress' | 'completed' | 'abandoned';
    readonly answers: readonly QuizAttemptAnswer[];
    /** Only intentionally finalized questions appear here. */
    readonly feedback: readonly QuizQuestionResult[];
}
/** Public history metadata; never includes private keys or answer feedback. */
export interface QuizAttemptSummary extends Pick<QuizAttempt, 'id' | 'quizId' | 'startedAt' | 'completedAt' | 'status'> {
    readonly percentage: number | null;
}
export interface QuizTopicPerformance {
    readonly topicId: string;
    readonly label: string;
    readonly asked: number;
    readonly missed: number;
    readonly accuracy: number;
    readonly sourceRefs: readonly QuizSourceReference[];
    readonly reviewerSectionIds: readonly string[];
}
export interface QuizWeakArea extends QuizTopicPerformance {
    readonly kind: 'weak_area' | 'missed_topic';
}
export interface QuizResult {
    readonly attemptId: string;
    readonly quizId: string;
    readonly correctCount: number;
    readonly incorrectCount: number;
    readonly totalQuestions: number;
    readonly percentage: number;
    readonly questions: readonly QuizQuestionResult[];
    readonly topicPerformance: readonly QuizTopicPerformance[];
    readonly weakAreas: readonly QuizWeakArea[];
}
