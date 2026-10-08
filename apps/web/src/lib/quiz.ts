import type {
  Quiz,
  QuizQuestion,
  QuizMatchPair,
  QuizQuestionResult,
} from "@stay-focused/shared";
import { isRecord } from "./api";
export function readableQuiz(value: unknown): value is Quiz {
  if (
    !isRecord(value) ||
    !Array.isArray(value.questions) ||
    !value.questions.length ||
    value.questions.length > 20 ||
    new Set(value.questions.map((q) => (isRecord(q) ? q.id : null))).size !==
      value.questions.length ||
    value.questions.length !== value.questionCount
  )
    return false;
  return value.questions.every((q) => {
    if (
      !isRecord(q) ||
      typeof q.id !== "string" ||
      !q.id.trim() ||
      typeof q.prompt !== "string" ||
      !q.prompt.trim()
    )
      return false;
    if (q.type === "matching")
      return (
        Array.isArray(q.leftItems) &&
        Array.isArray(q.rightItems) &&
        q.leftItems.length > 0 &&
        q.leftItems.length === q.rightItems.length &&
        new Set(q.leftItems.map((i) => (isRecord(i) ? i.id : null))).size ===
          q.leftItems.length &&
        new Set(q.rightItems.map((i) => (isRecord(i) ? i.id : null))).size ===
          q.rightItems.length &&
        [...q.leftItems, ...q.rightItems].every(
          (i) =>
            isRecord(i) &&
            typeof i.id === "string" &&
            !!i.id.trim() &&
            typeof i.label === "string" &&
            !!i.label.trim(),
        )
      );
    return (
      ["single_select", "multi_select", "true_false"].includes(
        String(q.type),
      ) &&
      Array.isArray(q.options) &&
      q.options.length > 1 &&
      new Set(q.options.map((o) => (isRecord(o) ? o.id : null))).size ===
        q.options.length &&
      q.options.every(
        (o) =>
          isRecord(o) &&
          typeof o.id === "string" &&
          !!o.id.trim() &&
          typeof o.text === "string" &&
          !!o.text.trim(),
      )
    );
  });
}
export function changePair(
  pairs: readonly QuizMatchPair[],
  left: string,
  right: string,
): QuizMatchPair[] {
  return [
    ...pairs.filter(
      (p) => p.leftItemId !== left && (!right || p.rightItemId !== right),
    ),
    ...(right ? [{ leftItemId: left, rightItemId: right }] : []),
  ];
}
export function answerLabels(
  question: QuizQuestion,
  result: QuizQuestionResult,
  correct = false,
): string[] {
  if (question.type === "matching" && result.type === "matching")
    return (correct ? result.correctPairs : result.pairs).map(
      (pair) =>
        `${question.leftItems.find((i) => i.id === pair.leftItemId)?.label ?? "Unavailable item"} → ${question.rightItems.find((i) => i.id === pair.rightItemId)?.label ?? "Unavailable answer"}`,
    );
  if (question.type !== "matching" && result.type !== "matching")
    return (correct ? result.correctOptionIds : result.selectedOptionIds).map(
      (id) =>
        question.options.find((o) => o.id === id)?.text ?? "Unavailable answer",
    );
  return ["Answer details are unavailable."];
}
