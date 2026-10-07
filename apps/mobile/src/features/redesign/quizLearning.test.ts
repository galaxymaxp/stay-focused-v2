import { createElement } from "react";
import { act, create, type ReactTestRenderer, type ReactTestInstance } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LibraryOverview, Quiz, QuizAttempt, QuizAttemptSummary, QuizLearningState, QuizResult } from "@stay-focused/shared";
import { fixtureQuizArtifact, fixtureQuizSummary } from "../../../../../packages/shared/src/experience.fixtures";
import { LibraryScreen } from "./LibraryScreen";
import { QuizScreen } from "./QuizScreen";

const mocks = vi.hoisted(() => ({ request: vi.fn(), focused: true, id: "quiz-example", key: 0 }));
vi.mock("expo-router", () => ({ router: { push: vi.fn(), navigate: vi.fn() }, useLocalSearchParams: () => ({ id: mocks.id }) }));
vi.mock("@react-navigation/native", () => ({ useIsFocused: () => mocks.focused, useNavigation: () => ({}), usePreventRemove: vi.fn() }));
vi.mock("../../auth", () => ({ useAuth: () => ({ session: { user: { id: "owner" }, accessToken: "token" } }) }));
vi.mock("../../config/apiBaseUrl", () => ({ getApiBaseUrl: () => "https://api.example" }));
vi.mock("../../design/theme", async () => {
  const { palettes } = await import("../../design/themeTokens");
  return { useTheme: () => ({ colors: palettes.light, active: true }) };
});
vi.mock("../../design/primitives", () => Object.fromEntries(
  ["Page", "Action", "Copy", "Notice", "Surface", "RowLink", "ContentIcon", "FilterChip"].map(name => [name, name])));
vi.mock("react-native", () => ({ View: "View", ScrollView: "ScrollView", TextInput: "TextInput", Alert: {}, Platform: { OS: "web" } }));
vi.mock("../../services/experienceApi", () => ({ experienceRequest: mocks.request, newRequestKey: () => `key-${++mocks.key}` }));

const quizPath = "/api/experience/quizzes/quiz-example";
const historyPath = `${quizPath}/attempts`;
const attemptPath = "/api/experience/quiz-attempts/attempt";
const completedAt = "2026-10-03T12:30:00Z";
const questions: Quiz["questions"] = ["q1", "q2"].map((id, index) => ({ id, type: index === 1 ? "multi_select" : "single_select",
  prompt: `Question ${index + 1}`, selectionInstruction: index === 1 ? "Select all correct answers." : "Choose one answer.", difficulty: "easy",
  options: [{ id: "a", text: "Alpha" }, { id: "b", text: "Beta" }] }));
const freshAttempt = (): QuizAttempt => ({ id: "attempt", quizId: "quiz-example", startedAt: "2026-10-01T08:00:00Z", completedAt: null, status: "in_progress", answers: [], feedback: [] });
const result: QuizResult = { attemptId: "attempt", quizId: "quiz-example", correctCount: 0, incorrectCount: 2, totalQuestions: 2, percentage: 0, questions: [], topicPerformance: [], weakAreas: [] };
let quiz: Quiz, history: readonly QuizAttemptSummary[], attempt: QuizAttempt;
let rendered: ReactTestRenderer | undefined;
function library(): LibraryOverview {
  return { items: [{ ...fixtureQuizArtifact, quiz }], categories: { reviewer: { status: "available" }, quiz: { status: "available" }, activity_output: { status: "available" } }, nextOffset: null };
}
function text(node: ReactTestInstance): string {
  return node.children.map(child => typeof child === "string" ? child : text(child)).join("");
}
const output = () => text(rendered!.root);
function button(label: string) {
  const found = rendered!.root.findAll(node => String(node.type) === "Action" && text(node).includes(label))[0];
  if (!found) throw new Error(`Missing action: ${label}`);
  return found;
}
async function press(label: string) { await act(async () => { button(label).props.onPress(); }); }
async function mount(screen = QuizScreen) { await act(async () => { rendered = create(createElement(screen)); }); }
async function update(screen = QuizScreen) { await act(async () => { rendered!.update(createElement(screen)); }); }
beforeEach(() => {
  vi.clearAllMocks(); mocks.focused = true; mocks.id = "quiz-example"; mocks.key = 0;
  quiz = { ...fixtureQuizSummary, questions }; history = []; attempt = freshAttempt();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.request.mockImplementation(async (_client, path: string, options: { method?: string; body?: { selectedOptionIds: string[]; finalize: boolean } } = {}) => {
    if (path.startsWith("/api/experience/library")) return library();
    if (path === quizPath) return quiz;
    if (path === historyPath && !options.method) return history;
    if (path === historyPath && options.method === "POST") return attempt;
    if (path === attemptPath) return attempt;
    if (path === `${attemptPath}/result` || path === `${attemptPath}/complete`) return result;
    if (path.startsWith(`${attemptPath}/answers/`)) {
      const questionId = path.split("/").at(-1)!;
      const body = options.body!;
      attempt = { ...attempt, answers: [...attempt.answers.filter(a => a.questionId !== questionId),
        { questionId, selectedOptionIds: body.selectedOptionIds, finalizedAt: body.finalize ? completedAt : null }],
        feedback: body.finalize ? [...attempt.feedback, { questionId, selectedOptionIds: body.selectedOptionIds, correctOptionIds: ["b"], correct: false,
          explanation: "Feedback after checking", topicId: "topic", topic: "Topic", sourceRefs: [], reviewerSectionIds: [] }] : attempt.feedback };
      return attempt;
    }
    throw new Error(`Unexpected request: ${path}`);
  });
});
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); rendered = undefined; });

describe("Library server-projected Quiz learning state", () => {
  it.each([
    ["not_started", null, "Not started"], ["in_progress", null, "In progress"], ["completed", 0, "Completed"],
    ["completed", 80, "Completed"], ["abandoned", null, "Abandoned"],
  ] as const)("renders %s with score %s", async (learningState, bestScore, label) => {
    quiz = { ...quiz, learningState, bestScore, answeredCount: 1, completedAttemptCount: bestScore === null ? 0 : 1 };
    await mount(LibraryScreen);
    expect(output()).toContain(`${label} · 2 questions`);
    if (learningState === "in_progress") expect(output()).toContain("1 of 2 answered");
    if (bestScore !== null) expect(output()).toContain(`Best ${bestScore}%`);
    else expect(output()).not.toContain("Best 0%");
  });
  it("retains completion count and zero best score during an active retry", async () => {
    quiz = { ...quiz, learningState: "in_progress", answeredCount: 1, bestScore: 0, completedAttemptCount: 1 };
    await mount(LibraryScreen);
    expect(output()).toContain("In progress"); expect(output()).toContain("1 completed attempts"); expect(output()).toContain("Best 0%");
  });
  it("refetches authoritative Library on return after start and completion without generation or duplicate items", async () => {
    await mount(LibraryScreen);
    expect(output()).toContain("Not started");
    for (const learningState of ["in_progress", "completed"] as QuizLearningState[]) {
      mocks.focused = false; await update(LibraryScreen);
      quiz = { ...quiz, learningState, answeredCount: 1, bestScore: learningState === "completed" ? 0 : null };
      mocks.focused = true; await update(LibraryScreen);
      expect(output()).toContain(learningState === "completed" ? "Completed" : "In progress");
      expect(rendered!.root.findAll(node => String(node.type) === "RowLink")).toHaveLength(1);
    }
    expect(mocks.request).toHaveBeenCalledTimes(3);
    expect(mocks.request.mock.calls.every(([, path, options]) => path.startsWith("/api/experience/library") && !options?.method)).toBe(true);
  });
});

describe("Quiz attempt/history interactions with real refresh hooks", () => {
  it("shows loading then empty history", async () => {
    let resolve!: (value: unknown) => void;
    mocks.request.mockImplementation(async (_client, path) => path === quizPath ? quiz : new Promise(r => { resolve = r; }));
    await mount(); expect(output()).toContain("Loading attempt history");
    await act(async () => { resolve([]); });
    expect(output()).toContain("No attempts yet."); expect(button("Start practice")).toBeDefined();
  });
  it("shows history failure and retries the actual request", async () => {
    const dispatch = mocks.request.getMockImplementation()!;
    let failed = false;
    mocks.request.mockImplementation(async (...args) => {
      if (args[1] === historyPath && !failed) { failed = true; throw new Error("History unavailable. Try again."); }
      return dispatch(...args);
    });
    await mount(); expect(output()).toContain("History unavailable"); expect(output()).not.toContain("No attempts yet");
    await press("Retry history"); expect(output()).toContain("No attempts yet"); expect(output()).not.toContain("History unavailable");
  });
  it("uses completedAt for history timestamps, preserves zero, and displays abandoned attempts", async () => {
    history = [{ id: "attempt", quizId: quiz.id, startedAt: attempt.startedAt, completedAt, status: "completed", percentage: 0 },
      { id: "abandoned", quizId: quiz.id, startedAt: attempt.startedAt, completedAt: null, status: "abandoned", percentage: null }];
    await mount();
    expect(text(button("View result"))).toContain(`0% · Completed ${new Date(completedAt).toLocaleString()}`);
    expect(text(button("View result"))).not.toContain(new Date(attempt.startedAt).toLocaleString());
    expect(output()).toContain("Abandoned");
    await press("View result"); expect(output()).toContain("0%");
    await press("Practice again");
    await press("Start practice");
    expect(mocks.request).toHaveBeenCalledWith(expect.anything(), historyPath, expect.objectContaining({ method: "POST", key: "key-2" }));
  });
  it("restores the first unchecked question and saved draft, then checks and completes normally", async () => {
    quiz = { ...quiz, learningState: "in_progress", activeAttemptId: attempt.id };
    attempt = { ...attempt, answers: [{ questionId: "q1", selectedOptionIds: ["a"], finalizedAt: completedAt }, { questionId: "q2", selectedOptionIds: ["b"], finalizedAt: null }],
      feedback: [{ questionId: "q1", selectedOptionIds: ["a"], correctOptionIds: ["b"], correct: false, explanation: "First feedback", topicId: "topic", topic: "Topic", sourceRefs: [], reviewerSectionIds: [] }] };
    await mount(); await press("Resume practice");
    expect(output()).toContain("Question 2 of 2"); expect(button("Beta").props.label).toBe("Beta, selected");
    expect(output()).not.toContain("See results");
    await press("Check answer"); expect(output()).toContain("Feedback after checking");
    await press("See results"); expect(output()).toContain("0 of 2 correct");
    expect(mocks.request).toHaveBeenCalledWith(expect.anything(), `${attemptPath}/complete`, { method: "POST" });
    expect(mocks.request.mock.calls.filter(([, path]) => path === historyPath).length).toBeGreaterThan(1);
  });
  it("pull refresh reloads the current attempt and authoritative history", async () => {
    await mount(); await press("Start practice");
    attempt = { ...attempt, answers: [{ questionId: "q1", selectedOptionIds: ["b"], finalizedAt: completedAt }] };
    const page = rendered!.root.findAll(node => String(node.type) === "Page")[0]!;
    await act(async () => page.props.onRefresh());
    expect(mocks.request).toHaveBeenCalledWith(expect.anything(), attemptPath);
    expect(output()).toContain("Question 2 of 2");
  });
  it("does not display a missing history score or completion timestamp as zero or a start time", async () => {
    history = [{ id: "attempt", quizId: quiz.id, startedAt: attempt.startedAt, status: "completed", completedAt: null, percentage: null }];
    await mount();
    expect(text(button("View result"))).toContain("Score unavailable · Completion time unavailable");
    expect(text(button("View result"))).not.toContain("0%");
    expect(text(button("View result"))).not.toContain(new Date(attempt.startedAt).toLocaleString());
  });
  it("saves unchecked choices (including empty multiselect), restores them after remount, and reveals no feedback", async () => {
    await mount(); await press("Start practice"); await press("Alpha");
    expect(mocks.request).toHaveBeenCalledWith(expect.anything(), `${attemptPath}/answers/q1`, { method: "PATCH", body: { selectedOptionIds: ["a"], finalize: false } });
    expect(output()).not.toContain("Feedback after checking"); expect(output()).not.toContain("See results");
    await press("Check answer"); await press("Next question"); await press("Beta");
    quiz = { ...quiz, activeAttemptId: attempt.id, learningState: "in_progress" };
    await act(async () => rendered!.unmount()); rendered = undefined;
    await mount(); await press("Resume practice");
    expect(button("Beta").props.label).toBe("Beta, selected");
    await press("Beta");
    expect(mocks.request).toHaveBeenCalledWith(expect.anything(), `${attemptPath}/answers/q2`, { method: "PATCH", body: { selectedOptionIds: [], finalize: false } });
    expect(button("Check answer").props.disabled).toBe(true);
  });
  it("serializes writes, disables checking while saving, and lets a failed draft retry", async () => {
    await mount(); await press("Start practice");
    let reject!: (error: Error) => void;
    mocks.request.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
    await press("Alpha"); expect(button("Check answer").props.disabled).toBe(true);
    const before = mocks.request.mock.calls.length;
    await press("Beta"); expect(mocks.request).toHaveBeenCalledTimes(before);
    await act(async () => { reject(new Error("Could not save selection")); });
    expect(output()).toContain("Could not save selection");
    await press("Retry saving selection"); expect(output()).not.toContain("Could not save selection");
    expect(attempt.answers[0]?.selectedOptionIds).toEqual(["a"]);
  });
  it("restores all-checked attempt at the last question for guarded completion, and resets on route change", async () => {
    quiz = { ...quiz, activeAttemptId: attempt.id };
    attempt = { ...attempt, answers: questions.map(q => ({ questionId: q.id, selectedOptionIds: ["a"], finalizedAt: completedAt })),
      feedback: questions.map(q => ({ questionId: q.id, selectedOptionIds: ["a"], correctOptionIds: ["b"], correct: false, explanation: "Feedback", topicId: "topic", topic: "Topic", sourceRefs: [], reviewerSectionIds: [] })) };
    await mount(); await press("Resume practice"); expect(output()).toContain("Question 2 of 2"); expect(button("See results")).toBeDefined();
    mocks.id = "other";
    mocks.request.mockResolvedValue(null);
    await update(); expect(output()).not.toContain("See results"); expect(output()).not.toContain("Question 2 of 2");
  });
});
