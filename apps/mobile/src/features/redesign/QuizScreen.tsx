import type { Quiz, QuizAttempt, QuizResult } from "@stay-focused/shared";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { TextInput, View } from "react-native";

import { Action, Copy, Notice, Page, Surface, SkeletonCards } from "../../design/primitives";
import { haptic } from "../../design/haptics";
import { playFeedbackSound } from "../../design/feedback";
import { useTheme } from "../../design/theme";
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
  const { colors } = useTheme();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null),
    [result, setResult] = useState<QuizResult | null>(null),
    [selected, setSelected] = useState<string[]>([]),
    [index, setIndex] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [key, setKey] = useState(newRequestKey);
  const [matchingReady, setMatchingReady] = useState(false);
  const initialized = useRef<string | null>(null);
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
  async function start(requestKey = key) {
    const value = await experienceRequest<QuizAttempt>(
      client,
      `/api/experience/quizzes/${encodeURIComponent(id)}/attempts`,
      { method: "POST", key: requestKey },
    );
    setAttempt(value);
    setIndex(0);
    setSelected([]);
    setMatchingReady(false);
    setResult(null);
    history.refresh();
  }
  useEffect(() => {
    if (!id || !quiz.data || history.loading || history.error || initialized.current === id || attempt || result) return;
    initialized.current = id;
    const unfinished = history.data?.find((item) => item.status === "in_progress");
    void run(() => unfinished ? resume(unfinished.id, false) : start());
    // The request key and the initialized guard prevent a second attempt on refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, quiz.data, history.loading, history.error, history.data]);
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
    const firstUnanswered = quizData?.questions.findIndex((question) => !value.feedback.some((item) => item.questionId === question.id)) ?? 0;
    const next = firstUnanswered < 0 ? Math.max(0, (quizData?.questions.length ?? 1) - 1) : firstUnanswered;
    setIndex(next);
    setSelected(
      value.answers
        .find((answer) => answer.questionId === quizData?.questions[next]?.id)
        ?.selectedOptionIds.slice() ?? [],
    );
    setMatchingReady(false);
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
          {savedQuiz.questions[index] ? <Surface key={savedQuiz.questions[index]!.id}>
            <Copy muted size="caption">Question {index + 1} of {savedQuiz.questionCount}</Copy>
            <Copy size="h3">{savedQuiz.questions[index]!.prompt}</Copy>
            {savedQuiz.questions[index]!.leftItem ? <Copy>{savedQuiz.questions[index]!.leftItem}</Copy> : null}
            {savedQuiz.questions[index]!.options.map((option) => <Copy key={option.id} muted>• {option.text}</Copy>)}
          </Surface> : null}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Action secondary disabled={index === 0} onPress={() => setIndex(value => value - 1)}>Previous</Action>
            <Action secondary disabled={index + 1 >= savedQuiz.questionCount} onPress={() => setIndex(value => value + 1)}>Next</Action>
          </View>
        </>
      )}
      {!attempt && !result && quiz.data && (
        <>
          {busy || history.loading ? <SkeletonCards rows={1} label="Opening question 1" /> : null}
          {history.error || error ? <Action disabled={busy} onPress={() => { initialized.current = null; history.refresh(); }}>Try opening practice again</Action> : null}
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
          <View accessibilityLabel={`${index + 1} of ${quizData?.questionCount} questions`} style={{ height: 4, borderRadius: 2, backgroundColor: "#88888844", overflow: "hidden" }}><View style={{ width: `${((index + 1) / (quizData?.questionCount ?? 1)) * 100}%`, height: 4, backgroundColor: "#888888" }} /></View>
          <Surface>
            <Copy size="h2">{question.prompt}</Copy>
            <Copy muted>{question.selectionInstruction}</Copy>
            {question.type === "matching" && question.leftItem ? <Action secondary={!matchingReady} disabled={busy || !!feedback} onPress={() => { haptic.select(); setMatchingReady(true); }}>{question.leftItem}</Action> : null}
            {question.type === "identification" ? <TextInput accessibilityLabel="Type your answer" autoCapitalize="none" autoCorrect={false} editable={!busy && !feedback} value={selected[0] ?? ""} onChangeText={value => setSelected(value ? [value] : [])} placeholder="Type the term" placeholderTextColor={colors.textMuted} style={{ minHeight: 52, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.separator, color: colors.textPrimary, backgroundColor: colors.surfaceSecondary, fontSize: 16 }} /> : null}
            {question.options.map((option) => (
              <Action
                key={option.id}
                secondary={!selected.includes(option.id)}
                disabled={busy || !!feedback || question.type === "matching" && !matchingReady}
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
            {question.type === "modified_true_false" && selected.some(id => question.options.some(option => option.id === id && option.text.toLowerCase() === "false")) ? <TextInput accessibilityLabel="Correct the wrong term or phrase" autoCapitalize="none" autoCorrect={false} editable={!busy && !feedback} value={selected.find(id => !question.options.some(option => option.id === id)) ?? ""} onChangeText={value => { const falseId = question.options.find(option => option.text.toLowerCase() === "false")?.id; setSelected(falseId ? [falseId, value] : []); }} placeholder="Type the correction" placeholderTextColor={colors.textMuted} style={{ minHeight: 52, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.separator, color: colors.textPrimary, backgroundColor: colors.surfaceSecondary, fontSize: 16 }} /> : null}
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
              disabled={busy || selected.length === 0 || question.type === "modified_true_false" && selected.some(id => question.options.some(option => option.id === id && option.text.toLowerCase() === "false")) && (selected.length < 2 || !selected[1]?.trim())}
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
                  const checked = value.feedback.find((item) => item.questionId === question.id);
                  if (checked) {
                    if (checked.correct) haptic.success();
                    else haptic.error();
                    void playFeedbackSound(checked.correct ? "correct" : "wrong");
                  }
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
                setMatchingReady(false);
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
                  haptic.success();
                  void playFeedbackSound("complete");
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
              const nextKey = newRequestKey();
              setKey(nextKey);
              void run(() => start(nextKey));
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
