import type { ReviewerReaderModel } from './experience';
import type { QuizQuestion } from './quiz';
import type { QuizAnswerKeyQuestion } from './quiz-grading';
import type { AssistType } from './study-assist';

export interface SharedAssist {
  readonly section: number;
  readonly block: number;
  readonly point?: number;
  readonly type: AssistType;
  readonly text: string;
}
export interface SharedVisual {
  readonly section: number;
  readonly image: string;
  readonly title: string;
  readonly credit: string;
  readonly license: string;
  readonly licenseUrl: string;
  readonly sourceUrl: string;
}
export interface SharedQuiz {
  readonly title: string;
  readonly questions: readonly QuizQuestion[];
  readonly keys: readonly QuizAnswerKeyQuestion[];
}
/** Separate from owner DTOs: no account, source IDs, course or private images. */
export interface ReviewerShareSnapshot {
  readonly schemaVersion: 1;
  readonly title: string;
  readonly sections: readonly {
    readonly title: string;
    readonly citations: readonly string[];
    readonly blocks: readonly Pick<ReviewerReaderModel['sections'][number]['blocks'][number], 'title' | 'explanation' | 'keyPoints' | 'evidence' | 'emphasis'>[];
  }[];
  readonly keyTerms: readonly string[];
  readonly quizzes: readonly SharedQuiz[];
  readonly assists: readonly SharedAssist[];
  readonly visuals: readonly SharedVisual[];
}
export interface ReviewerShareLink {
  readonly token: string;
  readonly updatedAt: string;
}
export const isReviewerShareToken = (value: string) => /^[0-9a-f]{64}$/.test(value);
export const reviewerSharePath = (token: string) => `/s/${token}`;
export const reviewerShareSignIn = (token: string) => `/sign-in?next=${encodeURIComponent(reviewerSharePath(token))}`;
/** Only a local share link can be used as the authentication return target. */
export function sharedReturnPath(value: string | null): string {
  return value && /^\/s\/[0-9a-f]{64}$/.test(value) ? value : '/today';
}
