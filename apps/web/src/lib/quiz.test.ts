import { expect, it } from "vitest";
import { answerText, canCheck, pairDraft, readableQuiz } from "./quiz";

const base = {
  difficulty: "easy" as const,
  selectionInstruction: "Choose one answer.",
};
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
  expect(readableQuiz({ questionCount: 1, questions: [q] })).toBe(true);
});
it("refuses matching blocks with missing visible terms", () => {
  expect(
    readableQuiz({
      questionCount: 1,
      questions: [
        {
          id: "q1",
          type: "matching",
          prompt: "Match",
          matchingPairs: [{ id: "l1", leftItem: " " }],
          options: [{ id: "r1", text: "Meaning" }],
        },
      ],
    }),
  ).toBe(false);
});
it("accepts identification questions without options", () => {
  expect(
    readableQuiz({
      questionCount: 1,
      questions: [{ id: "q", type: "identification", prompt: "Name it", options: [] }],
    }),
  ).toBe(true);
});
it("changing a matching answer releases the term's and meaning's prior pairs", () => {
  expect(pairDraft(["l1:r1", "l2:r2"], "l1", "r2")).toEqual(["l1:r2"]);
});
it("needs every term matched and a correction for modified false answers", () => {
  const matching = {
    ...base,
    id: "m",
    type: "matching" as const,
    prompt: "Match",
    matchingPairs: [
      { id: "l1", leftItem: "A" },
      { id: "l2", leftItem: "B" },
    ],
    options: [
      { id: "r1", text: "One" },
      { id: "r2", text: "Two" },
    ],
  };
  expect(canCheck(matching, ["l1:r1"])).toBe(false);
  expect(canCheck(matching, ["l1:r1", "l2:r2"])).toBe(true);
  const modified = {
    ...base,
    id: "t",
    type: "modified_true_false" as const,
    prompt: "Statement",
    options: [
      { id: "t", text: "True" },
      { id: "f", text: "False" },
    ],
  };
  expect(canCheck(modified, ["t"])).toBe(true);
  expect(canCheck(modified, ["f"])).toBe(false);
  expect(canCheck(modified, ["f", "correction"])).toBe(true);
});
it("renders public labels rather than opaque answer identifiers", () => {
  const question = {
    ...base,
    id: "q1",
    type: "matching" as const,
    prompt: "Match",
    matchingPairs: [{ id: "opaque-left", leftItem: "Term" }],
    options: [{ id: "opaque-right", text: "Meaning" }],
  };
  expect(answerText(question, ["opaque-left:opaque-right"])).toBe(
    "Term → Meaning",
  );
  expect(
    answerText({ ...question, type: "single_select", matchingPairs: undefined }, [
      "missing",
    ]),
  ).toBe("Unavailable answer");
});
