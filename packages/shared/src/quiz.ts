import type { GenerationState } from './experience';
export type QuizQuestionType = 'single_select' | 'multi_select' | 'true_false';
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
export interface QuizQuestion {
    readonly id: string;
    readonly type: QuizQuestionType;
    readonly prompt: string;
    readonly options: readonly QuizQuestionOption[];
    readonly selectionInstruction: 'Choose one answer.' | 'Select all correct answers.';
    readonly difficulty: QuizDifficulty;
}
export type QuizLearningState = 'not_started' | 'in_progress' | 'completed' | 'abandoned';
/** Server-derived learning progress, independent of artifact generation status.
 * questionCount and the nullable percentage scores reuse the existing Quiz names.
 */
export interface QuizLearningProgress {
    readonly learningState: QuizLearningState;
    /** Distinct questions with a saved nonempty selection, including unchecked drafts. */
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
export interface QuizAttemptAnswer {
    readonly questionId: string;
    readonly selectedOptionIds: readonly string[];
    readonly finalizedAt: string | null;
}
export interface QuizQuestionResult {
    readonly questionId: string;
    readonly selectedOptionIds: readonly string[];
    readonly correctOptionIds: readonly string[];
    readonly correct: boolean;
    readonly explanation: string;
    readonly topicId: string;
    readonly topic: string;
    readonly sourceRefs: readonly QuizSourceReference[];
    readonly reviewerSectionIds: readonly string[];
}
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
