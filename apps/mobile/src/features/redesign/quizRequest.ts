import type { QuizDifficulty } from "@stay-focused/shared";

import type { GenerationIntent } from "../../services/generationRecovery";

/** The Quiz settings the server accepts (5–20 questions). */
export const QUIZ_QUESTION_COUNTS = [5, 10, 15, 20] as const;
export type QuizQuestionCount = (typeof QUIZ_QUESTION_COUNTS)[number];
export const QUIZ_DIFFICULTIES: readonly { value: QuizDifficulty | "mixed"; label: string }[] = [
  { value: "mixed", label: "Mixed" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A saved Reviewer's Library id is `artifact:<generated artifact id>`; that id
 * is exactly the persisted Reviewer a Quiz is built from. Anything else (an
 * unconfirmed or legacy entry) has no Quiz source yet.
 */
export function reviewerArtifactIdFromLibraryId(libraryId: string): string | null {
  const [prefix, id] = libraryId.split(":");
  return prefix === "artifact" && id && UUID.test(id) ? id : null;
}

/**
 * The one Quiz request shape, shared by Generate (material → Quiz) and a saved
 * Reviewer (Reviewer → Quiz). It only prepares the request; generation starts
 * after the student confirms it on the Generation screen.
 */
export function quizIntentInput({
  title,
  reviewerArtifactId,
  questionCount = 5,
  difficulty = "mixed",
}: {
  title: string;
  reviewerArtifactId: string;
  questionCount?: number;
  difficulty?: QuizDifficulty | "mixed";
}): Omit<GenerationIntent, "key"> {
  return {
    title,
    type: "quiz",
    path: "/api/experience/quizzes",
    body: {
      sourceType: "reviewer",
      sourceIds: [reviewerArtifactId],
      reviewerArtifactId,
      questionCount,
      difficulty,
      questionTypes: ["single_select", "true_false"],
    },
  };
}
