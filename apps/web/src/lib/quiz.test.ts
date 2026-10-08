import { expect, it } from "vitest";
import { changePair, readableQuiz, answerLabels } from "./quiz";
it("rejects ambiguous duplicate question and answer identities", () => {
  const q = {
    id: "q",
    prompt: "Choose",
    type: "single_select",
    options: [
      { id: "a", text: "One" },
      { id: "a", text: "Two" },
    ],
  };
  expect(readableQuiz({ questionCount: 1, questions: [q] })).toBe(false);
  q.options[1].id = "b";
  expect(readableQuiz({ questionCount: 2, questions: [q, q] })).toBe(false);
});
it("changing a matching answer releases its prior assignment", () => {
  expect(
    changePair(
      [
        { leftItemId: "l1", rightItemId: "r1" },
        { leftItemId: "l2", rightItemId: "r2" },
      ],
      "l1",
      "r2",
    ),
  ).toEqual([{ leftItemId: "l1", rightItemId: "r2" }]);
});
it("refuses matching payloads with missing visible labels", () => {
  expect(
    readableQuiz({
      questionCount: 1,
      questions: [
        {
          id: "q1",
          type: "matching",
          prompt: "Match",
          leftItems: [{ id: "l1" }],
          rightItems: [{ id: "r1", label: "Answer" }],
        },
      ],
    }),
  ).toBe(false);
});
it("renders public labels rather than opaque answer identifiers", () => {
  expect(
    answerLabels(
      {
        id: "q1",
        type: "single_select",
        prompt: "Question",
        difficulty: "easy",
        selectionInstruction: "Choose one answer.",
        options: [{ id: "opaque", text: "Visible answer" }],
      },
      {
        questionId: "q1",
        selectedOptionIds: ["opaque"],
        correctOptionIds: ["opaque"],
        correct: true,
        explanation: "Explanation",
        topicId: "t",
        topic: "Topic",
        sourceRefs: [],
        reviewerSectionIds: [],
      },
    ),
  ).toEqual(["Visible answer"]);
});
