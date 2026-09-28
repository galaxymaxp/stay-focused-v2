import type { Quiz, QuizAttempt, QuizResult, QuizQuestion } from "@stay-focused/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { TextInput, View } from "react-native";

import { Action, Copy, Notice, Page, Surface, SkeletonCards, Sheet } from "../../design/primitives";
import { haptic } from "../../design/haptics";
import { playFeedbackSound } from "../../design/feedback";
import { useTheme } from "../../design/theme";
import { experienceRequest, newRequestKey } from "../../services/experienceApi";
import { useExperience, useExperienceClient } from "./useExperience";
import { useLocalArtifact } from "./useLocalLibrary";
import { QuestionSlider } from './QuestionSlider';

type AttemptHistory = {
  id: string;
  status: string;
  startedAt: string;
  percentage: number | null;
}[];
function answerText(question: QuizQuestion | undefined, values: readonly string[]): string {
  if (!values.length) return 'No answer';
  return values.map(value => {
    const [leftId, rightId] = value.split(':');
    if (question?.matchingPairs?.length && rightId) {
      const left = question.matchingPairs.find(pair => pair.id === leftId)?.leftItem ?? leftId;
      return `${left} → ${question.options.find(option => option.id === rightId)?.text ?? rightId}`;
    }
    return question?.options.find(option => option.id === value)?.text ?? value;
  }).join('; ');
}
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
  const [matchingLeft, setMatchingLeft] = useState<string | null>(null);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [reviewing, setReviewing] = useState(false);
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
    setMatchingLeft(null);
    setResult(null);
    setReviewing(false);
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
      const completedResult =
        await experienceRequest<QuizResult>(
          client,
          `/api/experience/quiz-attempts/${encodeURIComponent(attemptId)}/result`,
        );
      setResult(completedResult);
      setAttempt(null);
      setReviewing(false);
      return;
    }
    const value = await experienceRequest<QuizAttempt>(
      client,
      `/api/experience/quiz-attempts/${encodeURIComponent(attemptId)}`,
    );
    setAttempt(value);
    const next = Number.isInteger(value.currentQuestion) && value.currentQuestion >= 0 && value.currentQuestion < (quizData?.questions.length ?? 0) ? value.currentQuestion : 0;
    setIndex(next);
    setSelected(
      value.answers
        .find((answer) => answer.questionId === quizData?.questions[next]?.id)
        ?.selectedOptionIds.slice() ?? [],
    );
    setMatchingReady(false);
    setMatchingLeft(null);
    setResult(null);
  }
  async function moveTo(next: number) {
    if (!attempt || !quizData || next < 0 || next >= quizData.questions.length || next === index) return;
    if (!feedback && JSON.stringify(selected) !== JSON.stringify(attempt.answers.find(answer => answer.questionId === question!.id)?.selectedOptionIds ?? [])) {
      const savedAttempt = await experienceRequest<QuizAttempt>(client,
        `/api/experience/quiz-attempts/${encodeURIComponent(attempt.id)}/answers/${encodeURIComponent(question!.id)}`,
        { method: 'PATCH', body: { selectedOptionIds: selected, finalize: false } });
      setAttempt(savedAttempt);
    }
    const value = await experienceRequest<QuizAttempt>(client,
      `/api/experience/quiz-attempts/${encodeURIComponent(attempt.id)}/study-state`,
      { method: 'PATCH', body: { action: 'navigate', position: next } });
    setAttempt(value);
    setIndex(next);
    setSelected(value.answers.find(answer => answer.questionId === quizData.questions[next]?.id)?.selectedOptionIds.slice() ?? []);
    setMatchingReady(false);
    setMatchingLeft(null);
  }
  async function markState(action: 'skip' | 'reveal') {
    if (!attempt || !question || !quizData) return;
    if (!feedback && JSON.stringify(selected) !== JSON.stringify(attempt.answers.find(answer => answer.questionId === question.id)?.selectedOptionIds ?? [])) {
      const savedAttempt = await experienceRequest<QuizAttempt>(client,
        `/api/experience/quiz-attempts/${encodeURIComponent(attempt.id)}/answers/${encodeURIComponent(question.id)}`,
        { method: 'PATCH', body: { selectedOptionIds: selected, finalize: false } });
      setAttempt(savedAttempt);
    }
    const next = action === 'skip' ? Math.min(index + 1, quizData.questions.length - 1) : index;
    const value = await experienceRequest<QuizAttempt>(client,
      `/api/experience/quiz-attempts/${encodeURIComponent(attempt.id)}/study-state`,
      { method: 'PATCH', body: { action, questionId: question.id, position: next } });
    setAttempt(value);
    if (action === 'skip') {
      setIndex(next);
      setSelected(value.answers.find(answer => answer.questionId === quizData.questions[next]?.id)?.selectedOptionIds.slice() ?? []);
      setMatchingReady(false);
      setMatchingLeft(null);
    }
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Action secondary disabled={busy || index === 0} onPress={() => void run(() => moveTo(index - 1))}>Previous</Action>
            <Copy muted size="caption">{index + 1} / {quizData?.questionCount}</Copy>
            <Action secondary onPress={() => setOverviewOpen(true)}>Questions</Action>
          </View>
          <QuestionSlider current={index} count={quizData!.questions.length} onSettle={next => void run(() => moveTo(next))} />
          <Copy muted size="caption">{attempt.answers.filter(answer => answer.finalizedAt).length} answered · {attempt.skippedQuestionIds.filter(id => !attempt.answers.some(answer => answer.questionId === id && answer.finalizedAt)).length} skipped</Copy>
          <Surface>
            <Copy size="h2">{question.prompt}</Copy>
            <Copy muted>{question.selectionInstruction}</Copy>
            {question.type === "matching" && question.leftItem ? <Action secondary={!matchingReady} disabled={busy || !!feedback} onPress={() => { haptic.select(); setMatchingReady(true); }}>{question.leftItem}</Action> : null}
            {question.matchingPairs?.length ? <>
              <Copy size="h3">Terms</Copy>
              {question.matchingPairs.map((pair, position) => {
                const linked = selected.find(value => value.startsWith(`${pair.id}:`))?.split(':')[1];
                return <Action key={pair.id} secondary={matchingLeft !== pair.id} disabled={busy || !!feedback} onPress={() => setMatchingLeft(pair.id)}>
                  {String.fromCharCode(65 + position)}. {pair.leftItem}{linked ? ` → ${question.options.find(option => option.id === linked)?.text ?? linked}` : ''}
                </Action>;
              })}
              <Copy size="h3">Meanings</Copy>
              <Copy muted>Tap a term, then its meaning. Each meaning can be used once.</Copy>
              {question.options.map((option, position) => <Action key={option.id} secondary disabled={busy || !!feedback || !matchingLeft} onPress={() => {
                setSelected(old => [...old.filter(value => !value.startsWith(`${matchingLeft}:`) && !value.endsWith(`:${option.id}`)), `${matchingLeft}:${option.id}`]);
                setMatchingLeft(null);
              }}>{position + 1}. {option.text}</Action>)}
            </> : null}
            {question.type === "identification" ? <TextInput accessibilityLabel="Type your answer" autoCapitalize="none" autoCorrect={false} editable={!busy && !feedback} value={selected[0] ?? ""} onChangeText={value => setSelected(value ? [value] : [])} placeholder="Type the term" placeholderTextColor={colors.textMuted} style={{ minHeight: 52, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.separator, color: colors.textPrimary, backgroundColor: colors.surfaceSecondary, fontSize: 16 }} /> : null}
            {!question.matchingPairs?.length && question.options.map((option) => (
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
              <Copy size="h2">{feedback.assisted ? 'Revealed · no recall credit' : feedback.correct ? 'Correct' : 'Keep learning'}</Copy>
              <Copy muted>Your answer: {answerText(question, feedback.selectedOptionIds)}</Copy>
              <Copy>Correct answer: {answerText(question, feedback.correctOptionIds)}</Copy>
              {feedback.pairCount ? <Copy>{feedback.pairCorrectCount} / {feedback.pairCount} pairs correct</Copy> : null}
              <Copy>{feedback.explanation}</Copy>
            </Surface>
          ) : (
            <Action
              disabled={busy || (question.matchingPairs?.length ? selected.length !== question.matchingPairs.length : selected.length === 0 || question.type === "modified_true_false" && selected.some(id => question.options.some(option => option.id === id && option.text.toLowerCase() === "false")) && (selected.length < 2 || !selected[1]?.trim()))}
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
          {!attempt.revealedQuestionIds.includes(question.id) && <Action secondary disabled={busy} onPress={() => void run(() => markState('reveal'))}>Reveal Answer</Action>}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Action secondary disabled={busy} onPress={() => void run(() => markState('skip'))}>Skip</Action>
            <Action secondary disabled={busy || index + 1 >= quizData!.questions.length} onPress={() => void run(() => moveTo(index + 1))}>Next</Action>
          </View>
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
            >Finish quiz</Action>
        </>
      )}
      {overviewOpen && attempt && quizData && <Sheet title="Questions" onClose={() => setOverviewOpen(false)}>
        <Copy muted>Choose any question. Answers stay with this attempt.</Copy>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {quizData.questions.map((item, position) => {
            const answer = attempt.answers.find(entry => entry.questionId === item.id);
            const state = position === index ? 'Current' : attempt.revealedQuestionIds.includes(item.id) ? 'Revealed' : answer?.finalizedAt ? 'Answered' : attempt.skippedQuestionIds.includes(item.id) ? 'Skipped' : 'Unanswered';
            return <Action key={item.id} secondary={position !== index} label={`Question ${position + 1}, ${state}`} onPress={() => { setOverviewOpen(false); void run(() => moveTo(position)); }}>{position + 1} · {state}</Action>;
          })}
        </View>
      </Sheet>}
      {result && (
        <>
          <Copy size="display">{result.percentage}%</Copy>
          <Copy>{result.earnedPoints} / {result.possiblePoints} points</Copy>
          <Copy>{result.correctCount} correct · {result.incorrectCount} incorrect · {result.skippedCount} skipped · {result.revealedCount} revealed before answer</Copy>
          <Action secondary onPress={() => setReviewing(value => !value)}>{reviewing ? 'Hide answers' : 'Review answers'}</Action>
          {reviewing && result.questions.map((entry, position) => {
            const item = quizData?.questions[position];
            return <Surface key={entry.questionId}>
              <Copy size="h3">{position + 1}. {item?.prompt ?? entry.questionId}</Copy>
              <Copy muted>{entry.assisted ? 'Revealed' : entry.skipped ? 'Skipped' : entry.correct ? 'Correct' : 'Incorrect'}</Copy>
              <Copy>Your answer: {answerText(item, entry.selectedOptionIds)}</Copy>
              <Copy>Correct answer: {answerText(item, entry.correctOptionIds)}</Copy>
              {entry.pairCount ? <Copy>{entry.pairCorrectCount} / {entry.pairCount} pairs correct</Copy> : null}
              <Copy muted>{entry.explanation}</Copy>
            </Surface>;
          })}
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
            Retake quiz
          </Action>
          <Action secondary onPress={() => router.back()}>Back to Library</Action>
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
