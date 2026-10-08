import type {
  Quiz,
  QuizAttempt,
  QuizQuestion,
  QuizQuestionType,
} from "@stay-focused/shared";
import { isRecord } from "./api";

const questionTypes: readonly QuizQuestionType[] = [
  "single_select",
  "multi_select",
  "true_false",
  "identification",
  "modified_true_false",
  "matching",
];
const visible = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0;
const uniqueIds = (items: readonly unknown[]) =>
  new Set(items.map((i) => (isRecord(i) ? i.id : null))).size === items.length;

/** Refuses payloads the reader cannot show safely, such as duplicate or unlabeled ids. */
export function readableQuiz(value: unknown): value is Quiz {
  if (
    !isRecord(value) ||
    !Array.isArray(value.questions) ||
    !value.questions.length ||
    value.questions.length > 100 ||
    !uniqueIds(value.questions) ||
    value.questions.length !== value.questionCount
  )
    return false;
  return value.questions.every((q) => {
    if (
      !isRecord(q) ||
      !visible(q.id) ||
      !visible(q.prompt) ||
      !questionTypes.includes(q.type as QuizQuestionType) ||
      !Array.isArray(q.options) ||
      !uniqueIds(q.options) ||
      !q.options.every((o) => isRecord(o) && visible(o.id) && visible(o.text))
    )
      return false;
    if (q.type === "identification") return true;
    if (q.type === "matching" && Array.isArray(q.matchingPairs))
      return (
        q.matchingPairs.length > 0 &&
        uniqueIds(q.matchingPairs) &&
        q.matchingPairs.every(
          (p) => isRecord(p) && visible(p.id) && visible(p.leftItem),
        ) &&
        q.options.length >= q.matchingPairs.length
      );
    if (q.type === "matching") return visible(q.leftItem) && q.options.length > 1;
    return q.options.length > 1;
  });
}

/** Matching blocks store each answer as `leftId:optionId`; one meaning per term. */
export function pairDraft(
  selected: readonly string[],
  leftId: string,
  optionId: string,
): string[] {
  return [
    ...selected.filter(
      (value) =>
        !value.startsWith(`${leftId}:`) && !value.endsWith(`:${optionId}`),
    ),
    `${leftId}:${optionId}`,
  ];
}

const isFalseOption = (question: QuizQuestion, id: string) =>
  question.options.some(
    (o) => o.id === id && o.text.trim().toLowerCase() === "false",
  );

/** Whether the current draft is complete enough to check. */
export function canCheck(question: QuizQuestion, selected: readonly string[]) {
  if (question.matchingPairs?.length)
    return selected.length === question.matchingPairs.length;
  if (!selected.length) return false;
  if (
    question.type === "modified_true_false" &&
    selected.some((id) => isFalseOption(question, id))
  )
    return selected.length >= 2 && !!selected[1]?.trim();
  return true;
}

/** Human-readable answer text; never shows internal option or pair ids. */
export function answerText(
  question: QuizQuestion | undefined,
  values: readonly string[],
): string {
  if (!values.length) return "No answer";
  return values
    .map((value) => {
      const [leftId, rightId] = value.split(":");
      if (question?.matchingPairs?.length && rightId) {
        const left =
          question.matchingPairs.find((p) => p.id === leftId)?.leftItem ??
          "Unavailable term";
        const right =
          question.options.find((o) => o.id === rightId)?.text ??
          "Unavailable meaning";
        return `${left} → ${right}`;
      }
      const option = question?.options.find((o) => o.id === value);
      if (option) return option.text;
      // Typed answers (identification, corrections) are the learner's own words.
      return question?.type === "identification" ||
        question?.type === "modified_true_false"
        ? value
        : "Unavailable answer";
    })
    .join("; ");
}

/** Older attempts predate the study-state fields; fill them so the reader can resume. */
export function compatibleAttempt(value: QuizAttempt): QuizAttempt {
  return {
    ...value,
    currentQuestion: Number.isInteger(value.currentQuestion)
      ? value.currentQuestion
      : 0,
    skippedQuestionIds: value.skippedQuestionIds ?? [],
    revealedQuestionIds: value.revealedQuestionIds ?? [],
    assistedQuestionIds: value.assistedQuestionIds ?? [],
    updatedAt: value.updatedAt ?? value.startedAt,
  };
}
