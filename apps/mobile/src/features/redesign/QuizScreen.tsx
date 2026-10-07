import type {
  Quiz,
  QuizAttempt,
  QuizAttemptSummary,
  QuizResult,
} from "@stay-focused/shared";
import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { View } from "react-native";

import { Action, Copy, Notice, Page, Surface } from "../../design/primitives";
import { experienceRequest, newRequestKey } from "../../services/experienceApi";
import { useExperience, useExperienceClient } from "./useExperience";

function historyLabel(item: QuizAttemptSummary) {
  if (item.status === "completed") {
    const score = item.percentage === null ? "Score unavailable" : `${item.percentage}%`;
    const completed = item.completedAt === null
      ? "Completion time unavailable"
      : `Completed ${new Date(item.completedAt).toLocaleString()}`;
    return `View result · ${score} · ${completed}`;
  }
  return `${item.status === "abandoned" ? "Abandoned" : "Resume attempt"} · Started ${new Date(item.startedAt).toLocaleString()}`;
}

export function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <QuizPractice key={id} id={id} />;
}
function QuizPractice({ id }: { id: string }) {
  const quiz = useExperience<Quiz>(
    id ? `/api/experience/quizzes/${encodeURIComponent(id)}` : null,
  );
  const history = useExperience<readonly QuizAttemptSummary[]>(
    id ? `/api/experience/quizzes/${encodeURIComponent(id)}/attempts` : null,
  );
  const client = useExperienceClient();
  const pending = useRef(false);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null),
    [result, setResult] = useState<QuizResult | null>(null),
    [selected, setSelected] = useState<string[]>([]),
    [index, setIndex] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [key, setKey] = useState(newRequestKey);
  const question = quiz.data?.questions[index],
    feedback = attempt?.feedback.find(
      (item) => item.questionId === question?.id,
    );
  const activeAttemptId = quiz.data?.activeAttemptId;
  async function run(action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save your answer.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function refresh() {
    quiz.refresh();
    history.refresh();
  }
  function restore(value: QuizAttempt) {
    const firstUnfinished = quiz.data?.questions.findIndex(
      q => !value.answers.some(a => a.questionId === q.id && a.finalizedAt !== null),
    ) ?? 0;
    const position = firstUnfinished < 0
      ? Math.max(0, (quiz.data?.questions.length ?? 1) - 1)
      : firstUnfinished;
    setAttempt(value);
    setIndex(position);
    setSelected(
      value.answers.find(a => a.questionId === quiz.data?.questions[position]?.id)
        ?.selectedOptionIds.slice() ?? [],
    );
    setResult(null);
  }
  async function saveSelection(selection: string[], finalize: boolean) {
    if (!attempt || !question) return;
    const value = await experienceRequest<QuizAttempt>(
      client,
      `/api/experience/quiz-attempts/${encodeURIComponent(attempt.id)}/answers/${encodeURIComponent(question.id)}`,
      { method: "PATCH", body: { selectedOptionIds: selection, finalize } },
    );
    setAttempt(value);
    refresh();
  }
  async function start() {
    const value = await experienceRequest<QuizAttempt>(
      client,
      `/api/experience/quizzes/${encodeURIComponent(id)}/attempts`,
      { method: "POST", key },
    );
    restore(value);
    refresh();
  }
  async function resume(attemptId: string, completed: boolean) {
    if (completed) {
      setResult(
        await experienceRequest<QuizResult>(
          client,
          `/api/experience/quiz-attempts/${encodeURIComponent(attemptId)}/result`,
        ),
      );
      refresh();
      return;
    }
    const value = await experienceRequest<QuizAttempt>(
      client,
      `/api/experience/quiz-attempts/${encodeURIComponent(attemptId)}`,
    );
    restore(value);
    refresh();
  }
  return (
    <Page
      title="Quiz"
      back
      onRefresh={() => {
        if (result) void run(() => resume(result.attemptId, true));
        else if (attempt) void run(() => resume(attempt.id, false));
        else refresh();
      }}
    >
      {quiz.error && <Notice>{quiz.error}</Notice>}
      {quiz.loading && <Notice>Loading your quiz…</Notice>}
      {quiz.data && <Copy size="h2">{quiz.data.title}</Copy>}
      {!attempt && !result && quiz.data && (
        <>
          <Action
            disabled={busy}
            onPress={() => void run(() => activeAttemptId ? resume(activeAttemptId, false) : start())}
          >
            {activeAttemptId ? "Resume practice" : "Start practice"}
          </Action>
          <Copy size="h2">Attempt history</Copy>
          {history.loading && <Notice>Loading attempt history…</Notice>}
          {history.error && (
            <>
              <Notice>{history.error}</Notice>
              <Action secondary onPress={history.refresh}>Retry history</Action>
            </>
          )}
          {!history.loading && !history.error && history.data?.length === 0 && (
            <Copy muted>No attempts yet.</Copy>
          )}
          {history.data?.map((item) => (
            item.status === "abandoned" ? (
              <Copy muted key={item.id}>{historyLabel(item)}</Copy>
            ) : (
              <Action
                key={item.id}
                secondary
                disabled={busy}
                onPress={() =>
                  void run(() => resume(item.id, item.status === "completed"))
                }
              >
                {historyLabel(item)}
              </Action>
            )
          ))}
        </>
      )}
      {attempt && question && !result && (
        <>
          <Copy muted>
            Question {index + 1} of {quiz.data?.questionCount}
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
                  void run(async () => {
                    const next = question.type === "multi_select"
                      ? selected.includes(option.id)
                        ? selected.filter((value) => value !== option.id)
                        : [...selected, option.id]
                      : [option.id];
                    setSelected(next);
                    await saveSelection(next, false);
                  })
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
              onPress={() => void run(() => saveSelection(selected, true))}
            >
              Check answer
            </Action>
          )}
          {error && !feedback && (
            <Action
              secondary
              disabled={busy}
              onPress={() => void run(() => saveSelection(selected, false))}
            >
              Retry saving selection
            </Action>
          )}
          {feedback && index + 1 < (quiz.data?.questionCount ?? 0) && (
            <Action
              onPress={() => {
                const next = index + 1;
                setIndex(next);
                setSelected(
                  attempt.answers
                    .find(
                      (answer) =>
                        answer.questionId === quiz.data?.questions[next]?.id,
                    )
                    ?.selectedOptionIds.slice() ?? [],
                );
              }}
            >
              Next question
            </Action>
          )}
          {feedback && index + 1 === quiz.data?.questionCount && (
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
                  refresh();
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
              refresh();
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
