import type { Quiz, QuizAnswerKey, QuizAttempt, QuizResult, QuizQuestion } from "@stay-focused/shared";
import { quizQuestionStates } from "@stay-focused/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { useAuth } from '../../auth';
import { Action, Copy, Notice, Page, Surface, SkeletonCards, Sheet } from "../../design/primitives";
import { haptic } from "../../design/haptics";
import { playFeedbackSound } from "../../design/feedback";
import { useTheme } from "../../design/theme";
import { ExperienceApiError, experienceRequest, newRequestKey } from "../../services/experienceApi";
import { getLocalArtifactStore } from '../../services/localLibrary/localArtifactDatabase';
import type { LocalQuizPractice } from '../../services/localLibrary/artifactStore';
import { useExperience, useExperienceClient } from "./useExperience";
import { useLocalArtifact } from "./useLocalLibrary";
import { QuestionSlider } from './QuestionSlider';
import { answerOffline, finishOffline, moveOffline, newOfflineAttempt, syncedPracticeResult, syncOfflinePractice } from './localQuizPractice';

type AttemptHistory = {
  id: string;
  status: string;
  startedAt: string;
  percentage: number | null;
}[];
/** Historical API responses predate B37.1 study-state fields. */
function compatibleAttempt(value: QuizAttempt): QuizAttempt {
  return { ...value, currentQuestion: Number.isInteger(value.currentQuestion) ? value.currentQuestion : 0,
    skippedQuestionIds: value.skippedQuestionIds ?? [], revealedQuestionIds: value.revealedQuestionIds ?? [],
    assistedQuestionIds: value.assistedQuestionIds ?? [], updatedAt: value.updatedAt ?? value.startedAt };
}
function answerText(question: QuizQuestion | undefined, values: readonly string[], acceptedAnswerText?: string): string {
  if (!values.length) return 'No answer';
  return values.map(value => {
    const [leftId, rightId] = value.split(':');
    if (question?.matchingPairs?.length && rightId) {
      const left = question.matchingPairs.find(pair => pair.id === leftId)?.leftItem ?? leftId;
      return `${left} → ${question.options.find(option => option.id === rightId)?.text ?? rightId}`;
    }
    return question?.options.find(option => option.id === value)?.text ?? acceptedAnswerText ?? value;
  }).join('; ');
}
export function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const owner = session?.user.id;
  const quiz = useExperience<Quiz>(
    id ? `/api/experience/quizzes/${encodeURIComponent(id)}` : null,
  );
  const history = useExperience<AttemptHistory>(
    id ? `/api/experience/quizzes/${encodeURIComponent(id)}/attempts` : null,
  );
  // Separate owner-scoped keys enable provisional scoring; synced server results win.
  const saved = useLocalArtifact(id ? `quiz:${id}` : null);
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
  const [checking, setChecking] = useState(false);
  const [matchingReady, setMatchingReady] = useState(false);
  const [matchingLeft, setMatchingLeft] = useState<string | null>(null);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [localReady, setLocalReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [storedKey, setStoredKey] = useState<{ owner: string; key: QuizAnswerKey } | null>(null);
  const answerKey = storedKey?.owner === owner && storedKey?.key.quizId === id ? storedKey.key : null;
  const [sliderDragging, setSliderDragging] = useState(false);
  const initialized = useRef<string | null>(null);
  const loadedIdentity = useRef<string | null>(null);
  const localWrites = useRef<Promise<void>>(Promise.resolve());
  const question = quizData?.questions[index],
    feedback = attempt?.feedback.find(
      (item) => item.questionId === question?.id,
    );
  const offline = offlineMode || !quiz.data || quiz.errorCode === 'connection' || history.errorCode === 'connection' || !!attempt?.id.startsWith('local:');
  const refreshQuiz = quiz.refresh, refreshHistory = history.refresh;
  useEffect(() => {
    if (!dirty || !result) return;
    const timer = setTimeout(() => {
      initialized.current = null;
      refreshQuiz(); refreshHistory();
    }, 15_000);
    return () => clearTimeout(timer);
  }, [dirty, result, refreshQuiz, refreshHistory, quiz.error, history.data, history.error]);
  useEffect(() => {
    setStoredKey(null);
    if (!id || !owner || !quizData) return;
    let live = true;
    void (async () => {
      const store = await getLocalArtifactStore();
      const key = await store?.readQuizAnswerKey(owner, id, quizData.updatedAt);
      if (live) setStoredKey(key ? { owner, key } : null);
    })().catch(() => { /* Missing/corrupt keys retain the connection-required state. */ });
    return () => { live = false; };
  }, [id, owner, quizData, saved.data]);
  useEffect(() => {
    if (!id || !owner) return;
    let live = true;
    initialized.current = null;
    loadedIdentity.current = null;
    setAttempt(null); setResult(null); setSelected([]); setDirty(false); setOfflineMode(false);
    setLocalReady(false);
    void (async () => {
      const practice = await (await getLocalArtifactStore())?.readQuizPractice(owner, id);
      if (!live) return;
      if (practice) {
        setAttempt(practice.attempt ? compatibleAttempt(practice.attempt) : null);
        setResult(practice.result);
        setIndex(practice.attempt?.currentQuestion ?? 0);
        setSelected([...practice.selected]);
        setDirty(practice.dirty);
      }
      loadedIdentity.current = `${owner}:${id}`;
      setLocalReady(true);
    })();
    return () => { live = false; loadedIdentity.current = null; };
  }, [id, owner]);
  useEffect(() => {
    if (!localReady || !id || !owner || loadedIdentity.current !== `${owner}:${id}` || (!attempt && !result)) return;
    const practice: LocalQuizPractice = { attempt, result, selected: [...selected], dirty };
    localWrites.current = localWrites.current.then(async () => {
      const store = await getLocalArtifactStore();
      if (loadedIdentity.current === `${owner}:${id}`) await store?.saveQuizPractice(owner, id, practice);
    }).catch(() => { /* Online attempt remains authoritative if device storage fails. */ });
  }, [localReady, id, owner, attempt, result, selected, dirty]);
  function selectDraft(change: (old: string[]) => string[]) {
    setSelected(old => change(old));
    setDirty(true);
  }
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
    setAttempt(compatibleAttempt(value));
    setIndex(0);
    setSelected([]);
    setMatchingReady(false);
    setMatchingLeft(null);
    setResult(null);
    setReviewing(false);
    setOfflineMode(false);
    setDirty(false);
    history.refresh();
  }
  useEffect(() => {
    if (!id || !localReady || !quiz.data || history.loading || history.error || initialized.current === id) return;
    initialized.current = id;
    const unfinished = history.data?.find((item) => item.status === "in_progress");
    const completed = history.data?.find((item) => item.status === "completed");
    void run(async () => {
      await localWrites.current;
      const practice = await (await getLocalArtifactStore())?.readQuizPractice(owner!, id);
      if (practice?.dirty && practice.attempt) {
        const current = quizData?.questions[practice.attempt.currentQuestion];
        const prepared = current && practice.attempt.status === 'in_progress' ? { ...practice, attempt: moveOffline(practice.attempt, current.id, practice.selected, practice.attempt.currentQuestion) } : practice;
        try { await syncPractice(prepared); }
        catch (cause) { setOfflineMode(true); throw cause; }
      } else if (unfinished) await resume(unfinished.id, false);
      else if (completed) await resume(completed.id, true);
      else await start();
    });
    // The request key and the initialized guard prevent a second attempt on refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, localReady, quiz.data, history.loading, history.error, history.data]);
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
      setDirty(false);
      setOfflineMode(false);
      return;
    }
    const value = await experienceRequest<QuizAttempt>(
      client,
      `/api/experience/quiz-attempts/${encodeURIComponent(attemptId)}`,
    );
    setAttempt(compatibleAttempt(value));
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
    setDirty(false);
    setOfflineMode(false);
  }
  async function moveTo(next: number) {
    if (!attempt || !quizData || next < 0 || next >= quizData.questions.length || next === index) return;
    const previousIndex = index;
    const previousDirty = dirty;
    const previousMatchingReady = matchingReady;
    const previousMatchingLeft = matchingLeft;
    const currentQuestion = question!;
    const draft = [...selected];
    const optimistic = moveOffline(attempt, currentQuestion.id, draft, next);
    // All questions are already on the device. Show the destination on release
    // while its draft and position are saved, never while the thumb is moving.
    setAttempt(optimistic);
    setIndex(next);
    setSelected(optimistic.answers.find(answer => answer.questionId === quizData.questions[next]?.id)?.selectedOptionIds.slice() ?? []);
    setDirty(true);
    setMatchingReady(false); setMatchingLeft(null);
    if (offline) return;
    try {
      if (!feedback && JSON.stringify(draft) !== JSON.stringify(attempt.answers.find(answer => answer.questionId === currentQuestion.id)?.selectedOptionIds ?? [])) {
        await experienceRequest<QuizAttempt>(client,
          `/api/experience/quiz-attempts/${encodeURIComponent(attempt.id)}/answers/${encodeURIComponent(currentQuestion.id)}`,
          { method: 'PATCH', body: { selectedOptionIds: draft, finalize: false } });
      }
      const value = await experienceRequest<QuizAttempt>(client,
        `/api/experience/quiz-attempts/${encodeURIComponent(attempt.id)}/study-state`,
        { method: 'PATCH', body: { action: 'navigate', position: next } });
      setAttempt(compatibleAttempt(value));
      setSelected(value.answers.find(answer => answer.questionId === quizData.questions[next]?.id)?.selectedOptionIds.slice() ?? []);
      setDirty(false);
    } catch (cause) {
      if (cause instanceof ExperienceApiError && cause.code === 'connection') {
        setOfflineMode(true);
        return;
      }
      setAttempt(attempt);
      setIndex(previousIndex);
      setSelected(draft);
      setDirty(previousDirty);
      setMatchingReady(previousMatchingReady);
      setMatchingLeft(previousMatchingLeft);
      throw cause;
    }
  }
  async function revealAnswer() {
    if (!attempt || !question) return;
    if (offline) {
      setAttempt(answerOffline(attempt, quizData!, answerKey, question.id, selected, true));
      setDirty(true);
      return;
    }
    try {
      if (!feedback && JSON.stringify(selected) !== JSON.stringify(attempt.answers.find(answer => answer.questionId === question.id)?.selectedOptionIds ?? [])) {
        const savedAttempt = await experienceRequest<QuizAttempt>(client,
          `/api/experience/quiz-attempts/${encodeURIComponent(attempt.id)}/answers/${encodeURIComponent(question.id)}`,
          { method: 'PATCH', body: { selectedOptionIds: selected, finalize: false } });
        setAttempt(compatibleAttempt(savedAttempt));
      }
      const value = await experienceRequest<QuizAttempt>(client,
        `/api/experience/quiz-attempts/${encodeURIComponent(attempt.id)}/study-state`,
        { method: 'PATCH', body: { action: 'reveal', questionId: question.id, position: index } });
      setAttempt(compatibleAttempt(value));
      setDirty(false);
    } catch (cause) {
      if (!(cause instanceof ExperienceApiError) || cause.code !== 'connection') throw cause;
      setOfflineMode(true);
      setAttempt(answerOffline(attempt, quizData!, answerKey, question.id, selected, true));
      setDirty(true);
    }
  }
  async function syncPractice(practice: LocalQuizPractice) {
    const identity = `${owner}:${id}`;
    const active = () => loadedIdentity.current === identity;
    const store = await getLocalArtifactStore();
    if (!active()) return;
    const synced = await syncOfflinePractice(client, id, practice, async serverId => {
      if (active() && owner && practice.attempt) await store?.saveQuizPractice(owner, id,
        { ...practice, attempt: { ...practice.attempt, id: serverId } });
    });
    if (!active()) return;
    const serverResult = await syncedPracticeResult(client, synced, practice.result);
    if (!active()) return;
    const adopted: LocalQuizPractice = { attempt: compatibleAttempt(synced), result: serverResult,
      selected: serverResult ? [] : synced.answers.find(answer => answer.questionId === quizData?.questions[synced.currentQuestion]?.id)?.selectedOptionIds.slice() ?? [], dirty: false };
    if (owner) await store?.saveQuizPractice(owner, id, adopted);
    setAttempt(adopted.attempt); setResult(serverResult); setIndex(synced.currentQuestion);
    setSelected([...adopted.selected]); setDirty(false); setOfflineMode(false); history.refresh();
  }
  async function checkAnswer() {
    if (!attempt || !question || !quizData) return;
    let value: QuizAttempt;
    if (offline) {
      value = answerOffline(attempt, quizData, answerKey, question.id, selected);
      setDirty(true);
    } else {
      try {
        value = await experienceRequest<QuizAttempt>(client,
          `/api/experience/quiz-attempts/${encodeURIComponent(attempt.id)}/answers/${encodeURIComponent(question.id)}`,
          { method: 'PATCH', body: { selectedOptionIds: selected, finalize: true } });
        setDirty(false);
      } catch (cause) {
        if (!(cause instanceof ExperienceApiError) || cause.code !== 'connection') throw cause;
        setOfflineMode(true);
        value = answerOffline(attempt, quizData, answerKey, question.id, selected);
        setDirty(true);
      }
    }
    setAttempt(compatibleAttempt(value));
    const checked = value.feedback.find(item => item.questionId === question.id);
    if (checked) {
      if (checked.correct) haptic.success(); else haptic.error();
      void playFeedbackSound(checked.correct ? 'correct' : 'wrong');
    }
  }
  async function finishQuiz() {
    if (!attempt || !quizData) return;
    const completeLocally = async () => {
      const completed = finishOffline(attempt, quizData, answerKey);
      await localWrites.current;
      if (owner) await (await getLocalArtifactStore())?.saveQuizPractice(owner, id, completed);
      setAttempt(completed.attempt); setResult(completed.result); setSelected([]); setDirty(true);
    };
    if (offline) await completeLocally();
    else {
      try {
        setResult(await experienceRequest<QuizResult>(client,
          `/api/experience/quiz-attempts/${encodeURIComponent(attempt.id)}/complete`, { method: 'POST' }));
        setAttempt(null); setDirty(false); history.refresh();
      } catch (cause) {
        if (!(cause instanceof ExperienceApiError) || cause.code !== 'connection') throw cause;
        setOfflineMode(true); await completeLocally();
      }
    }
    haptic.success(); void playFeedbackSound('complete');
  }
  async function reconnectPractice() {
    if (!id || !owner || !quizData) return;
    await localWrites.current;
    const practice = await (await getLocalArtifactStore())?.readQuizPractice(owner, id);
    if (!practice?.attempt) { quiz.refresh(); history.refresh(); return; }
    const current = quizData.questions[practice.attempt.currentQuestion];
    const prepared = current && practice.attempt.status === 'in_progress' ? { ...practice, attempt: moveOffline(practice.attempt, current.id, practice.selected, practice.attempt.currentQuestion) } : practice;
    await syncPractice(prepared);
    quiz.refresh(); history.refresh();
  }
  return (
    <Page title="Quiz" back scrollEnabled={!sliderDragging}>
      {quiz.error && !savedQuiz && <Notice>{quiz.error}</Notice>}
      {quiz.loading && !quizData && <SkeletonCards rows={2} label="Loading your quiz" />}
      {quizData && <Copy size="h2">{quizData.title}</Copy>}
      {!quiz.data && savedQuiz && !quiz.loading && !attempt && !result && (
        <>
          {!answerKey && <Notice>Practice and scoring need a connection. These are the questions saved on this device.</Notice>}
          {savedQuiz.questions[index] ? <Surface key={savedQuiz.questions[index]!.id}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Question ${index + 1} of ${savedQuiz.questions.length}, show all questions`}
              disabled={busy || sliderDragging} onPress={() => setOverviewOpen(true)}
              style={{ minHeight: 44, justifyContent: 'center' }}>
              <Copy muted size="caption">Question {index + 1} of {savedQuiz.questions.length}</Copy>
            </Pressable>
            <Copy size="h3">{savedQuiz.questions[index]!.prompt}</Copy>
            {savedQuiz.questions[index]!.leftItem ? <Copy>{savedQuiz.questions[index]!.leftItem}</Copy> : null}
            {savedQuiz.questions[index]!.options.map((option) => <Copy key={option.id} muted>• {option.text}</Copy>)}
          </Surface> : null}
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <Action secondary disabled={busy || index === 0} onPress={() => setIndex(index - 1)}>Previous</Action>
            <Action secondary disabled={busy || index + 1 >= quizData!.questions.length} onPress={() => setIndex(index + 1)}>Next</Action>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <Action secondary disabled={busy || index === 0} onPress={() => void run(() => moveTo(index - 1))}>Previous</Action>
            <Action secondary disabled={busy || index + 1 >= quizData!.questions.length} onPress={() => void run(() => moveTo(index + 1))}>Next</Action>
          </View>
          <QuestionSlider current={index} count={savedQuiz.questions.length} onSettle={setIndex} onDragActiveChange={setSliderDragging} onPressLabel={() => setOverviewOpen(true)} />
          {localReady && <Action onPress={() => {
            const value = newOfflineAttempt(savedQuiz.id, newRequestKey());
            setAttempt(value); setResult(null); setIndex(0); setSelected([]); setDirty(true);
          }}>Start offline practice</Action>}
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
          {offline && !answerKey && <Notice>Offline practice is saved on this device. Connect to check or reveal answers and sync your progress.</Notice>}
          {offline && <Action secondary disabled={busy} onPress={() => void run(reconnectPractice)}>Sync progress</Action>}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Copy muted size="caption">{attempt.answers.filter(answer => answer.finalizedAt).length} answered · {quizData!.questions.length - attempt.answers.filter(answer => answer.finalizedAt).length} unanswered</Copy>
          </View>
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
                selectDraft(old => [...old.filter(value => !value.startsWith(`${matchingLeft}:`) && !value.endsWith(`:${option.id}`)), `${matchingLeft}:${option.id}`]);
                setMatchingLeft(null);
              }}>{position + 1}. {option.text}</Action>)}
            </> : null}
            {question.type === "identification" ? <TextInput accessibilityLabel="Type your answer" autoCapitalize="none" autoCorrect={false} editable={!busy && !feedback} value={selected[0] ?? ""} onChangeText={value => selectDraft(() => value ? [value] : [])} placeholder="Type the term" placeholderTextColor={colors.textMuted} style={{ minHeight: 52, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.separator, color: colors.textPrimary, backgroundColor: colors.surfaceSecondary, fontSize: 16 }} /> : null}
            {!question.matchingPairs?.length && question.options.map((option) => (
              <Action
                key={option.id}
                secondary={!selected.includes(option.id)}
                disabled={busy || !!feedback || question.type === "matching" && !matchingReady}
                label={`${option.text}${selected.includes(option.id) ? ", selected" : ""}`}
                onPress={() =>
                  selectDraft((old) =>
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
            {question.type === "modified_true_false" && selected.some(id => question.options.some(option => option.id === id && option.text.trim().toLowerCase() === "false")) ? <TextInput accessibilityLabel="Correct the wrong term or phrase" autoCapitalize="none" autoCorrect={false} editable={!busy && !feedback} value={selected.find(id => !question.options.some(option => option.id === id)) ?? ""} onChangeText={value => { const falseId = question.options.find(option => option.text.trim().toLowerCase() === "false")?.id; selectDraft(() => falseId ? [falseId, value] : []); }} placeholder="Type the correction" placeholderTextColor={colors.textMuted} style={{ minHeight: 52, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.separator, color: colors.textPrimary, backgroundColor: colors.surfaceSecondary, fontSize: 16 }} /> : null}
          </Surface>
          {feedback ? (
            <Surface>
              <Copy size="h2">{feedback.assisted ? 'Revealed · no recall credit' : feedback.correct ? 'Correct' : 'Keep learning'}</Copy>
              {question.type !== "identification" && question.type !== "modified_true_false" ? <>
              <Copy muted>Your answer: {answerText(question, feedback.selectedOptionIds)}</Copy>
              <Copy>Correct answer: {answerText(question, feedback.correctOptionIds, feedback.correctAnswerText)}</Copy>
              {feedback.pairCount ? <Copy>{feedback.pairCorrectCount} / {feedback.pairCount} pairs correct</Copy> : null}
              <Copy>{feedback.explanation}</Copy>
              </> : null}
            </Surface>
          ) : (
            <Action
              disabled={busy || offline && !answerKey || (question.matchingPairs?.length ? selected.length !== question.matchingPairs.length : selected.length === 0 || question.type === "modified_true_false" && selected.some(id => question.options.some(option => option.id === id && option.text.toLowerCase() === "false")) && (selected.length < 2 || !selected[1]?.trim()))}
              onPress={() =>
                void run(async () => { setChecking(true); try { await checkAnswer(); } finally { setChecking(false); } })
              }
            >
              {checking ? "Checking\u2026" : "Check answer"}
            </Action>
          )}
          {question.type !== "identification" && question.type !== "modified_true_false" && !attempt.revealedQuestionIds.includes(question.id) && <Action secondary disabled={busy || offline && !answerKey} onPress={() => void run(() => revealAnswer())}>Reveal Answer</Action>}
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <Action secondary disabled={busy || index === 0} onPress={() => void run(() => moveTo(index - 1))}>Previous</Action>
            <Action secondary disabled={busy || index + 1 >= quizData!.questions.length} onPress={() => void run(() => moveTo(index + 1))}>Next</Action>
          </View>
          <QuestionSlider current={index} count={quizData!.questions.length} disabled={busy} onSettle={next => void run(() => moveTo(next))} onDragActiveChange={setSliderDragging} onPressLabel={() => setOverviewOpen(true)} />
          <Action
              disabled={busy || offline && !answerKey}
              onPress={() =>
                void run(finishQuiz)
              }
            >Finish quiz</Action>
        </>
      )}
      {overviewOpen && !result && quizData && <Sheet title="Questions" onClose={() => setOverviewOpen(false)}>
        <Copy muted size="caption">Answered · Unanswered · Revealed</Copy>
        <View style={{ flexDirection: attempt ? 'row' : 'column', flexWrap: attempt ? 'wrap' : 'nowrap', gap: 8 }}>
          {quizQuestionStates(quizData.questions, attempt, index).map((state, position) => {
            const current = state === 'current';
            const label = `Question ${position + 1}, ${state[0]!.toUpperCase()}${state.slice(1)}`;
            if (!attempt) return <Action key={quizData.questions[position]!.id} secondary={!current} label={label}
              onPress={() => { setOverviewOpen(false); setIndex(position); }}>{position + 1} · {current ? 'Current' : 'Unanswered'}</Action>;
            const color = current ? colors.onAccent : state === 'answered' ? colors.success : state === 'revealed' ? colors.warning : colors.textMuted;
            return <Pressable key={quizData.questions[position]!.id} accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: current, disabled: busy }} disabled={busy}
              onPress={() => { setOverviewOpen(false); void run(() => moveTo(position)); }}
              style={{ width: 48, minHeight: 48, borderRadius: 12, borderWidth: current ? 2 : 1,
                borderColor: current ? colors.accent : color, borderStyle: state === 'unanswered' ? 'dashed' : 'solid',
                backgroundColor: current ? colors.accent : colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
              <Copy color={color} style={{ fontWeight: current ? '700' : '500' }}>{position + 1}</Copy>
            </Pressable>;
          })}
        </View>
      </Sheet>}
      {result && (
        <>
          <Copy size="display">{result.percentage}%</Copy>
          {dirty && <Copy muted size="caption">Scored offline · will sync</Copy>}
          {dirty && <Action secondary disabled={busy} onPress={() => void run(reconnectPractice)}>Sync progress</Action>}
          {Number.isFinite(result.earnedPoints) && Number.isFinite(result.possiblePoints) ? <Copy>{result.earnedPoints} / {result.possiblePoints} points</Copy> : null}
          <Copy>{result.correctCount} correct · {result.incorrectCount} incorrect · {result.skippedCount} skipped · {result.revealedCount ?? 0} revealed before answer</Copy>
          <Action secondary onPress={() => setReviewing(value => !value)}>{reviewing ? 'Hide answers' : 'Review answers'}</Action>
          {reviewing && result.questions.map((entry, position) => {
            const item = quizData?.questions.find(q => q.id === entry.questionId);
            return <Surface key={entry.questionId}>
              <Copy size="h3">{position + 1}. {item?.prompt ?? entry.questionId}</Copy>
              <Copy muted>{entry.assisted ? 'Revealed' : entry.skipped ? 'Skipped' : entry.correct ? 'Correct' : 'Incorrect'}</Copy>
              <Copy>Your answer: {answerText(item, entry.selectedOptionIds)}</Copy>
              <Copy>Correct answer: {answerText(item, entry.correctOptionIds, entry.correctAnswerText)}</Copy>
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
            disabled={busy || dirty}
            onPress={() => {
              const nextKey = newRequestKey();
              setKey(nextKey);
              if (offline && quizData) {
                setAttempt(newOfflineAttempt(quizData.id, nextKey)); setResult(null); setIndex(0);
                setSelected([]); setDirty(true); setReviewing(false);
              } else void run(() => start(nextKey));
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
