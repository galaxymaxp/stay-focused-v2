import { gradeAttempt, gradeQuestion, normalizeSubmittedAnswer, type Quiz, type QuizAnswerKey, type QuizAttempt, type QuizResult } from '@stay-focused/shared';
import { experienceRequest, type ExperienceClient } from '../../services/experienceApi';
import type { LocalQuizPractice } from '../../services/localLibrary/artifactStore';
import { keyMatchesQuiz } from '../../services/localLibrary/quizAnswerKeys';

export function newOfflineAttempt(quizId: string, id: string, now = new Date().toISOString()): QuizAttempt {
  return { id: `local:${id}`, quizId, startedAt: now, completedAt: null, status: 'in_progress',
    currentQuestion: 0, skippedQuestionIds: [], revealedQuestionIds: [], assistedQuestionIds: [],
    updatedAt: now, answers: [], feedback: [] };
}

export function moveOffline(attempt: QuizAttempt, questionId: string, selected: readonly string[], next: number, skip = false): QuizAttempt {
  const answers = attempt.answers.filter(answer => answer.questionId !== questionId);
  const previous = attempt.answers.find(answer => answer.questionId === questionId);
  if (previous?.finalizedAt) answers.push(previous);
  else answers.push({ questionId, selectedOptionIds: [...selected], finalizedAt: null });
  return { ...attempt, currentQuestion: next, answers, updatedAt: new Date().toISOString(),
    skippedQuestionIds: skip ? [...new Set([...attempt.skippedQuestionIds, questionId])] : attempt.skippedQuestionIds };
}

function requireKey(quiz: Quiz, key: QuizAnswerKey | null): QuizAnswerKey {
  if (!key || key.quizId !== quiz.id || !keyMatchesQuiz(key, quiz.questions)) {
    throw new Error('Connect to reveal the answer. Your draft is saved on this device.');
  }
  return key;
}

/** Keys are separate owner-scoped device copies; shared scores are provisional. */
export function answerOffline(attempt: QuizAttempt, quiz: Quiz, key: QuizAnswerKey | null, questionId: string,
  selected: readonly string[], reveal = false, now = new Date().toISOString()): QuizAttempt {
  const keys = requireKey(quiz, key);
  const question = quiz.questions.find(item => item.id === questionId);
  const answerKey = keys.questions.find(item => item.id === questionId);
  if (attempt.quizId !== quiz.id || attempt.status !== 'in_progress' || !question || !answerKey) throw new Error('quiz_key_mismatch');
  const previous = attempt.answers.find(item => item.questionId === questionId);
  if (previous?.finalizedAt && !reveal) return attempt;
  if (!previous?.finalizedAt && (selected.length || !reveal)) {
    const submitted = normalizeSubmittedAnswer(question, answerKey, selected);
    const optionIds = new Set(question.options.map(option => option.id));
    let valid = selected.length > 0 && selected.length <= 6 && selected.every(value => value.length <= 200) &&
      submitted.every(value => !!value.trim() && value.length <= 200) && new Set(submitted).size === submitted.length;
    if (question.matchingPairs?.length) {
      const pairs = submitted.map(value => value.split(':'));
      valid &&= (reveal || submitted.length === question.matchingPairs.length) &&
        pairs.every(parts => parts.length === 2 && question.matchingPairs!.some(pair => pair.id === parts[0]) && optionIds.has(parts[1]!)) &&
        new Set(pairs.map(parts => parts[0])).size === pairs.length && new Set(pairs.map(parts => parts[1])).size === pairs.length;
    } else if (question.type === 'identification') valid &&= submitted.length === 1;
    else if (question.type === 'modified_true_false') {
      const options = submitted.filter(value => optionIds.has(value));
      valid &&= submitted.length <= 2 && options.length === 1 && (submitted.length === 1 ||
        question.options.some(option => option.id === options[0] && option.text.toLowerCase() === 'false'));
    } else valid &&= (question.type === 'multi_select' || submitted.length === 1) && submitted.every(value => optionIds.has(value));
    if (!valid) throw new Error('Check your selection and try again.');
  }
  const answer = previous?.finalizedAt ? previous : { questionId, selectedOptionIds: [...selected], finalizedAt: reveal ? null : now };
  const revealed = reveal || attempt.revealedQuestionIds.includes(questionId);
  const assisted = attempt.assistedQuestionIds.includes(questionId) || reveal && !previous?.finalizedAt;
  const feedback = gradeQuestion(question, answerKey, answer.selectedOptionIds);
  return { ...attempt, updatedAt: now,
    answers: [...attempt.answers.filter(item => item.questionId !== questionId), answer],
    revealedQuestionIds: reveal ? [...new Set([...attempt.revealedQuestionIds, questionId])] : attempt.revealedQuestionIds,
    assistedQuestionIds: assisted ? [...new Set([...attempt.assistedQuestionIds, questionId])] : attempt.assistedQuestionIds,
    feedback: [...attempt.feedback.filter(item => item.questionId !== questionId),
      { ...feedback, ...(revealed ? { revealed: true, assisted, correct: assisted ? false : feedback.correct } : {}) }],
  };
}

export function finishOffline(attempt: QuizAttempt, quiz: Quiz, key: QuizAnswerKey | null,
  now = new Date().toISOString()): LocalQuizPractice {
  if (!key) throw new Error('Connect to finish your quiz. Your draft is saved on this device.');
  const keys = requireKey(quiz, key);
  if (attempt.quizId !== quiz.id || attempt.status !== 'in_progress') throw new Error('quiz_key_mismatch');
  const completed: QuizAttempt = { ...attempt, status: 'completed', completedAt: now, updatedAt: now };
  return { attempt: completed, result: gradeAttempt(completed, quiz.questions, keys.questions), selected: [], dirty: true };
}

/** Replay learner answers, reveal order and completion; the server regrades. */
export async function syncOfflinePractice(client: ExperienceClient, quizId: string, practice: LocalQuizPractice,
  onAccepted?: (serverId: string) => Promise<void>): Promise<QuizAttempt> {
  const local = practice.attempt;
  if (!local || local.quizId !== quizId || local.status === 'abandoned') throw new Error('no_active_attempt');
  const base = `/api/experience/quiz-attempts/`;
  let server: QuizAttempt;
  if (local.id.startsWith('local:')) {
    const history = await experienceRequest<{ id: string; status: string }[]>(client,
      `/api/experience/quizzes/${encodeURIComponent(quizId)}/attempts`);
    const unfinished = history.find(item => item.status === 'in_progress');
    server = unfinished ? await experienceRequest<QuizAttempt>(client, `${base}${encodeURIComponent(unfinished.id)}`) :
      await experienceRequest<QuizAttempt>(client, `/api/experience/quizzes/${encodeURIComponent(quizId)}/attempts`,
        { method: 'POST', key: `offline-${local.id.slice(6)}` });
  } else server = await experienceRequest<QuizAttempt>(client, `${base}${encodeURIComponent(local.id)}`);
  if (server.quizId !== quizId || server.status === 'abandoned') throw new Error('attempt_changed_elsewhere');
  await onAccepted?.(server.id);
  if (server.status === 'completed') return server;
  async function reveal(questionId: string) {
    if (server.revealedQuestionIds.includes(questionId)) return;
    server = await experienceRequest<QuizAttempt>(client, `${base}${encodeURIComponent(server.id)}/study-state`,
      { method: 'PATCH', body: { action: 'reveal', questionId, position: local!.currentQuestion } });
  }
  const drafts = [...local.answers];
  // The current selection is already in drafts after an offline move. The caller
  // adds the still-visible question draft before invoking this function.
  for (const draft of drafts) {
    const remote = server.answers.find(answer => answer.questionId === draft.questionId);
    if (remote?.finalizedAt) continue;
    // Assisted reveal must precede finalization, including on retry.
    if (local.assistedQuestionIds.includes(draft.questionId)) await reveal(draft.questionId);
    if (!draft.finalizedAt && JSON.stringify(remote?.selectedOptionIds ?? []) === JSON.stringify(draft.selectedOptionIds)) continue;
    server = await experienceRequest<QuizAttempt>(client,
      `${base}${encodeURIComponent(server.id)}/answers/${encodeURIComponent(draft.questionId)}`,
      { method: 'PATCH', body: { selectedOptionIds: draft.selectedOptionIds, finalize: !!draft.finalizedAt } });
  }
  for (const questionId of local.revealedQuestionIds) await reveal(questionId);
  for (const questionId of local.skippedQuestionIds) {
    if (server.skippedQuestionIds.includes(questionId)) continue;
    server = await experienceRequest<QuizAttempt>(client, `${base}${encodeURIComponent(server.id)}/study-state`,
      { method: 'PATCH', body: { action: 'skip', questionId, position: local.currentQuestion } });
  }
  if (server.currentQuestion !== local.currentQuestion) server = await experienceRequest<QuizAttempt>(client,
    `${base}${encodeURIComponent(server.id)}/study-state`,
    { method: 'PATCH', body: { action: 'navigate', position: local.currentQuestion } });
  if (local.status === 'completed') {
    await experienceRequest<QuizResult>(client, `${base}${encodeURIComponent(server.id)}/complete`, { method: 'POST' });
    server = await experienceRequest<QuizAttempt>(client, `${base}${encodeURIComponent(server.id)}`);
  }
  return server;
}

export async function syncedPracticeResult(client: ExperienceClient, attempt: QuizAttempt, provisional: QuizResult | null): Promise<QuizResult | null> {
  if (attempt.status !== 'completed') return null;
  const result = await experienceRequest<QuizResult>(client,
    `/api/experience/quiz-attempts/${encodeURIComponent(attempt.id)}/result`);
  if (provisional && provisional.percentage !== result.percentage) console.info('offline_score_mismatch');
  return result;
}
