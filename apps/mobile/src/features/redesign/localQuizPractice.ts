import type { QuizAttempt } from '@stay-focused/shared';
import { experienceRequest, type ExperienceClient } from '../../services/experienceApi';
import type { LocalQuizPractice } from '../../services/localLibrary/artifactStore';

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

/** Replay only learner drafts and navigation; answer keys and grading stay server side. */
export async function syncOfflinePractice(client: ExperienceClient, quizId: string, practice: LocalQuizPractice): Promise<QuizAttempt> {
  const local = practice.attempt;
  if (!local || local.status !== 'in_progress') throw new Error('no_active_attempt');
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
  if (server.status !== 'in_progress') throw new Error('attempt_changed_elsewhere');
  const drafts = [...local.answers.filter(answer => !answer.finalizedAt)];
  // The current selection is already in drafts after an offline move. The caller
  // adds the still-visible question draft before invoking this function.
  for (const draft of drafts) {
    const remote = server.answers.find(answer => answer.questionId === draft.questionId);
    if (remote?.finalizedAt) continue;
    if (JSON.stringify(remote?.selectedOptionIds ?? []) === JSON.stringify(draft.selectedOptionIds)) continue;
    server = await experienceRequest<QuizAttempt>(client,
      `${base}${encodeURIComponent(server.id)}/answers/${encodeURIComponent(draft.questionId)}`,
      { method: 'PATCH', body: { selectedOptionIds: draft.selectedOptionIds, finalize: false } });
  }
  for (const questionId of local.skippedQuestionIds) {
    if (server.skippedQuestionIds.includes(questionId)) continue;
    server = await experienceRequest<QuizAttempt>(client, `${base}${encodeURIComponent(server.id)}/study-state`,
      { method: 'PATCH', body: { action: 'skip', questionId, position: local.currentQuestion } });
  }
  if (server.currentQuestion !== local.currentQuestion) server = await experienceRequest<QuizAttempt>(client,
    `${base}${encodeURIComponent(server.id)}/study-state`,
    { method: 'PATCH', body: { action: 'navigate', position: local.currentQuestion } });
  return server;
}
