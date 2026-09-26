import type { Quiz, QuizAttempt, QuizResult } from "@stay-focused/shared";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { Action, Copy, Notice, Page, Surface, SkeletonCards } from "../../design/primitives";
import { experienceRequest, newRequestKey } from "../../services/experienceApi";
import { useExperience, useExperienceClient } from "./useExperience";
import { useLocalArtifact } from "./useLocalLibrary";

type AttemptHistory = {
  id: string;
  status: string;
  startedAt: string;
  percentage: number | null;
}[];
export function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const quiz = useExperience<Quiz>(
    id ? `/api/experience/quizzes/${encodeURIComponent(id)}` : null,
  );
  const history = useExperience<AttemptHistory>(
    id ? `/api/experience/quizzes/${encodeURIComponent(id)}/attempts` : null,
  );
  // The device copy lets saved questions open offline; practice stays server-scored.
  const saved = useLocalArtifact(id ? `quiz:${id}` : null, { refreshRemote: false });
  const savedQuiz = saved.data && "quiz" in saved.data ? saved.data.quiz : null;
  const quizData = quiz.data ?? savedQuiz;
  const client = useExperienceClient();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null),
    [result, setResult] = useState<QuizResult | null>(null),
    [selected, setSelected] = useState<string[]>([]),
    [index, setIndex] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [key, setKey] = useState(newRequestKey);
  const question = quizData?.questions[index],
    feedback = attempt?.feedback.find(
      (item) => item.questionId === question?.id,
    );
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save your answer.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function start() {
    const value = await experienceRequest<QuizAttempt>(
      client,
      `/api/experience/quizzes/${encodeURIComponent(id)}/attempts`,
      { method: "POST", key },
    );
    setAttempt(value);
    setIndex(0);
    setSelected([]);
    setResult(null);
    history.refresh();
  }
  async function resume(attemptId: string, completed: boolean) {
    if (completed) {
      setResult(
        await experienceRequest<QuizResult>(
          client,
          `/api/experience/quiz-attempts/${encodeURIComponent(attemptId)}/result`,
        ),
      );
      return;
    }
    const value = await experienceRequest<QuizAttempt>(
      client,
      `/api/experience/quiz-attempts/${encodeURIComponent(attemptId)}`,
    );
    setAttempt(value);
    setIndex(0);
    setSelected(
      value.answers
        .find((answer) => answer.questionId === quizData?.questions[0]?.id)
        ?.selectedOptionIds.slice() ?? [],
    );
    setResult(null);
  }
  return (
    <Page title="Quiz" back>
      {quiz.error && !savedQuiz && <Notice>{quiz.error}</Notice>}
      {quiz.loading && !quizData && <SkeletonCards rows={2} label="Loading your quiz" />}
      {quizData && <Copy size="h2">{quizData.title}</Copy>}
      {!quiz.data && savedQuiz && !quiz.loading && (
        <>
          <Notice>Practice and scoring need a connection. These are the questions saved on this device.</Notice>
          {savedQuiz.questions.map((item, number) => (
            <Surface key={item.id}>
              <Copy muted size="caption">Question {number + 1} of {savedQuiz.questionCount}</Copy>
              <Copy size="h3">{item.prompt}</Copy>
              {item.options.map((option) => (
                <Copy key={option.id} muted>• {option.text}</Copy>
              ))}
            </Surface>
          ))}
        </>
      )}
      {!attempt && !result && quiz.data && (
        <>
          <Action disabled={busy} onPress={() => void run(start)}>
            Start practice
          </Action>
          {history.data
            ?.filter(
              (item) =>
                item.status === "in_progress" || item.status === "completed",
            )
            .map((item) => (
              <Action
                key={item.id}
                secondary
                disabled={busy}
                onPress={() =>
                  void run(() => resume(item.id, item.status === "completed"))
                }
              >
                {item.status === "completed"
                  ? `View result · ${item.percentage}%`
                  : "Resume attempt"}{" "}
                · {new Date(item.startedAt).toLocaleDateString()}
              </Action>
            ))}
        </>
      )}
      {attempt && question && !result && (
        <>
          <Copy muted>
            Question {index + 1} of {quizData?.questionCount}
          </Copy>
          <Surface>
            <Copy size="h2">{question.prompt}</Copy>
            <Copy muted>{question.selectionInstruction}</Copy>
            {question.options.map((option) => (
              <Action
                key={option.id}
                secondary={!selected.includes(option.id)}
                disabled={busy || !!feedback}
                label={`${option.text}${selected.includes(option.id) ? ", selected" : ""}`}
                onPress={() =>
                  setSelected((old) =>
                    question.type === "multi_select"
                      ? old.includes(option.id)
                        ? old.filter((value) => value !== option.id)
                        : [...old, option.id]
                      : [option.id],
                  )
                }
              >
                {option.text}
              </Action>
            ))}
          </Surface>
          {feedback ? (
            <Surface>
              <Copy size="h2">
                {feedback.correct ? "Correct" : "Keep learning"}
              </Copy>
              <Copy>{feedback.explanation}</Copy>
            </Surface>
          ) : (
            <Action
              disabled={busy || selected.length === 0}
              onPress={() =>
                void run(async () => {
                  const value = await experienceRequest<QuizAttempt>(
                    client,
                    `/api/experience/quiz-attempts/${encodeURIComponent(attempt.id)}/answers/${encodeURIComponent(question.id)}`,
                    {
                      method: "PATCH",
                      body: { selectedOptionIds: selected, finalize: true },
                    },
                  );
                  setAttempt(value);
                })
              }
            >
              Check answer
            </Action>
          )}
          {feedback && index + 1 < (quizData?.questionCount ?? 0) && (
            <Action
              onPress={() => {
                const next = index + 1;
                setIndex(next);
                setSelected(
                  attempt.answers
                    .find(
                      (answer) =>
                        answer.questionId === quizData?.questions[next]?.id,
                    )
                    ?.selectedOptionIds.slice() ?? [],
                );
              }}
            >
              Next question
            </Action>
          )}
          {feedback && index + 1 === quizData?.questionCount && (
            <Action
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  setResult(
                    await experienceRequest<QuizResult>(
                      client,
                      `/api/experience/quiz-attempts/${encodeURIComponent(attempt.id)}/complete`,
                      { method: "POST" },
                    ),
                  );
                  history.refresh();
                })
              }
            >
              See results
            </Action>
          )}
        </>
      )}
      {result && (
        <>
          <Copy size="display">{result.percentage}%</Copy>
          <Copy>
            {result.correctCount} of {result.totalQuestions} correct
          </Copy>
          <Copy size="h2">Keep building on these ideas</Copy>
          {result.weakAreas.length ? (
            result.weakAreas.map((area) => (
              <Surface key={area.topicId}>
                <Copy size="h3">{area.label}</Copy>
                <Copy muted>
                  {area.missed} missed of {area.asked} questions
                </Copy>
              </Surface>
            ))
          ) : (
            <Copy muted>No weak areas identified in this attempt.</Copy>
          )}
          <Action
            onPress={() => {
              setAttempt(null);
              setResult(null);
              setKey(newRequestKey());
            }}
          >
            Practice again
          </Action>
        </>
      )}
      {error && (
        <View accessibilityLiveRegion="polite">
          <Notice>{error}</Notice>
        </View>
      )}
    </Page>
  );
}
