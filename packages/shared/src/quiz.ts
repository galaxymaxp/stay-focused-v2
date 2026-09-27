import type { GenerationState } from './experience';
export type QuizQuestionType = 'single_select' | 'multi_select' | 'true_false' | 'identification' | 'modified_true_false' | 'matching';
export type QuizDifficulty = 'easy' | 'medium' | 'hard';
export type QuizGenerationState = GenerationState;
export interface QuizGenerationRequest {
    readonly sourceType: 'material' | 'reviewer';
    readonly sourceIds: readonly string[];
    readonly reviewerArtifactId?: string;
    readonly questionCount: number;
    readonly difficulty: QuizDifficulty | 'mixed';
    readonly questionTypes?: readonly QuizQuestionType[];
    readonly selectedTopicIds?: readonly string[];
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
    readonly selectionInstruction: string;
    /** A matching item asks for one pair; this is its visible left side. */
    readonly leftItem?: string;
    readonly difficulty: QuizDifficulty;
}
export interface QuizSummary {
    readonly id: string;
    readonly title: string;
    readonly courseId: string;
    readonly reviewerArtifactId: string | null;
    readonly sourceId: string | null;
    readonly sourceMaterialIds: readonly string[];
    readonly questionCount: number;
    readonly difficulty: QuizDifficulty | 'mixed';
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly attemptCount: number;
    readonly latestScore: number | null;
    readonly bestScore: number | null;
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
