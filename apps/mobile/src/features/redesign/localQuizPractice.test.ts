import { describe, expect, it, vi } from 'vitest';
import type { Quiz, QuizAnswerKey, QuizAttempt } from '@stay-focused/shared';
import { answerOffline, finishOffline, moveOffline, newOfflineAttempt, syncedPracticeResult, syncOfflinePractice } from './localQuizPractice';

const request = vi.hoisted(() => vi.fn());
vi.mock('../../services/experienceApi', () => ({ experienceRequest: request }));

describe('offline Quiz practice', () => {
  it('preserves drafts, cleared selections, skipped questions and current position', () => {
    const started = newOfflineAttempt('quiz-one', 'request-one', '2026-09-28T00:00:00Z');
    const first = moveOffline(started, 'q1', ['a'], 1, true);
    const second = moveOffline(first, 'q2', ['b'], 2);
    const cleared = moveOffline(second, 'q1', [], 0);
    expect(cleared.id).toBe('local:request-one');
    expect(cleared.currentQuestion).toBe(0);
    expect(cleared.skippedQuestionIds).toEqual(['q1']);
    expect(cleared.answers.find(answer => answer.questionId === 'q1')?.selectedOptionIds).toEqual([]);
    expect(cleared.answers.find(answer => answer.questionId === 'q2')?.selectedOptionIds).toEqual(['b']);
  });

  it('replays local drafts and navigation through server-owned attempt endpoints', async () => {
    request.mockReset();
    const local = moveOffline(moveOffline(newOfflineAttempt('quiz-one', 'key-one'), 'q1', ['a'], 1, true), 'q2', ['b'], 2);
    let remote = { ...local, id: 'server-one', currentQuestion: 0, answers: [], skippedQuestionIds: [] } as QuizAttempt;
    request.mockImplementation(async (_client, path: string, options?: { method?: string; body?: { selectedOptionIds?: string[]; action?: string; questionId?: string; position?: number } }) => {
      if (path.endsWith('/attempts') && options?.method !== 'POST') return [];
      if (path.endsWith('/attempts')) return remote;
      if (path.includes('/answers/')) remote = { ...remote, answers: [...remote.answers, { questionId: path.split('/').at(-1)!, selectedOptionIds: options?.body?.selectedOptionIds ?? [], finalizedAt: null }] };
      if (options?.body?.action === 'skip') remote = { ...remote, skippedQuestionIds: [options.body.questionId!] };
      if (options?.body?.position !== undefined) remote = { ...remote, currentQuestion: options.body.position };
      return remote;
    });
    const synced = await syncOfflinePractice({ baseUrl: 'https://example.test', accessToken: 'test' }, 'quiz-one', { attempt: local, result: null, selected: [], dirty: true });
    expect(synced.id).toBe('server-one');
    expect(synced.answers.map(answer => answer.selectedOptionIds)).toEqual([['a'], ['b']]);
    expect(synced.skippedQuestionIds).toEqual(['q1']);
    expect(synced.currentQuestion).toBe(2);
    expect(request).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('/quizzes/quiz-one/attempts'), expect.objectContaining({ key: 'offline-key-one' }));
  });

  it('adopts an already active server attempt instead of creating a duplicate', async () => {
    request.mockReset();
    const local = moveOffline(newOfflineAttempt('quiz-one', 'local-key'), 'q1', ['a'], 0);
    const remote = { ...local, id: 'existing-server', answers: [] } as QuizAttempt;
    request.mockImplementation(async (_client, path: string, options?: { body?: { selectedOptionIds?: string[] } }) => {
      if (path.endsWith('/attempts')) return [{ id: remote.id, status: 'in_progress' }];
      if (path.endsWith('/existing-server')) return remote;
      if (path.includes('/answers/')) return { ...remote, answers: [{ questionId: 'q1', selectedOptionIds: options?.body?.selectedOptionIds ?? [], finalizedAt: null }] };
      throw new Error(`unexpected ${path}`);
    });
    const synced = await syncOfflinePractice({ baseUrl: 'https://example.test', accessToken: 'test' }, 'quiz-one', { attempt: local, result: null, selected: ['a'], dirty: true });
    expect(synced.id).toBe('existing-server');
    expect(request.mock.calls.some(([, , options]) => options?.method === 'POST')).toBe(false);
  });
});

const quiz: Quiz = { id: 'quiz-one', title: 'Synthetic quiz', courseId: null, reviewerArtifactId: null,
  sourceId: null, sourceMaterialIds: [], questionCount: 2, difficulty: 'easy', createdAt: '', updatedAt: '',
  attemptCount: 0, latestScore: null, bestScore: null, questions: ['q1', 'q2'].map(id => ({
    id, type: 'single_select', prompt: 'Synthetic prompt', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }],
    selectionInstruction: 'Choose one', difficulty: 'easy' })) };
const key: QuizAnswerKey = { quizId: quiz.id, versionId: 'v1', questions: quiz.questions.map(q => ({
  id: q.id, correctOptionIds: ['a'], explanation: 'Synthetic explanation' })) };
const client = { baseUrl: 'https://example.test', accessToken: 'synthetic-token' };

describe('offline reveal, scoring and authoritative replay', () => {
  it('reveals from a key, excludes assisted credit, and scores finalized answers', () => {
    let local = newOfflineAttempt(quiz.id, 'one');
    local = answerOffline(local, quiz, key, 'q1', ['a']);
    local = answerOffline(local, quiz, key, 'q1', ['b'], true);
    expect(local.feedback[0]).toMatchObject({ correct: true, assisted: false, correctOptionIds: ['a'] });
    local = answerOffline(local, quiz, key, 'q2', ['a'], true);
    expect(local.feedback[1]).toMatchObject({ correct: false, assisted: true, explanation: 'Synthetic explanation' });
    const finished = finishOffline(local, quiz, key);
    expect(finished).toMatchObject({ dirty: true, attempt: { status: 'completed' }, result: { percentage: 50, earnedPoints: 1, revealedCount: 1 } });
  });
  it('keeps missing-key connection guidance and leaves unfinalized drafts unscored', () => {
    const local = moveOffline(newOfflineAttempt(quiz.id, 'one'), 'q1', ['a'], 1);
    expect(() => answerOffline(local, quiz, null, 'q1', ['a'], true)).toThrow('Connect to reveal');
    expect(() => finishOffline(local, quiz, null)).toThrow('Connect to finish');
    expect(finishOffline(local, quiz, key).result).toMatchObject({ percentage: 0, skippedCount: 2 });
  });
  it('rejects selections the answer endpoint would reject before finalizing locally', () => {
    const local = newOfflineAttempt(quiz.id, 'one');
    for (const selection of [[], ['a', 'a'], ['unknown'], ['a', 'b'], [' '.repeat(201)]]) {
      expect(() => answerOffline(local, quiz, key, 'q1', selection)).toThrow('Check your selection');
    }
  });
  it('replays finalization, pre/post-answer reveals and completion in order, then adopts the server score', async () => {
    request.mockReset();
    let local = answerOffline(newOfflineAttempt(quiz.id, 'one'), quiz, key, 'q1', ['a']);
    local = answerOffline(local, quiz, key, 'q1', ['a'], true);
    local = answerOffline(local, quiz, key, 'q2', ['a'], true);
    local = answerOffline(local, quiz, key, 'q2', ['a']);
    const practice = finishOffline(local, quiz, key);
    let remote = { ...newOfflineAttempt(quiz.id, 'one'), id: 'server-one' };
    const events: string[] = [];
    const serverResult = { ...practice.result!, attemptId: remote.id, percentage: 75 };
    request.mockImplementation(async (_client, path: string, options?: { method?: string; body?: { selectedOptionIds?: string[]; finalize?: boolean; action?: string; questionId?: string } }) => {
      if (path.endsWith('/attempts') && options?.method !== 'POST') return [];
      if (path.endsWith('/attempts')) return remote;
      if (path.includes('/answers/')) {
        const id = path.split('/').at(-1)!; events.push(`answer:${id}:${options?.body?.finalize}`);
        remote = { ...remote, answers: [...remote.answers, { questionId: id, selectedOptionIds: options?.body?.selectedOptionIds ?? [], finalizedAt: options?.body?.finalize ? 'now' : null }] };
      }
      if (options?.body?.action === 'reveal') {
        const id = options.body.questionId!; events.push(`reveal:${id}`);
        remote = { ...remote, revealedQuestionIds: [...remote.revealedQuestionIds, id] };
      }
      if (path.endsWith('/complete')) { events.push('complete'); remote = { ...remote, status: 'completed' }; return serverResult; }
      if (path.endsWith('/result')) return serverResult;
      return remote;
    });
    const accepted = vi.fn(async () => { events.push('persist-server-id'); });
    const synced = await syncOfflinePractice(client, quiz.id, practice, accepted);
    expect(events).toEqual(['persist-server-id', 'answer:q1:true', 'reveal:q2', 'answer:q2:true', 'reveal:q1', 'complete']);
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    expect(await syncedPracticeResult(client, synced, practice.result)).toBe(serverResult);
    expect(log).toHaveBeenCalledExactlyOnceWith('offline_score_mismatch');
    log.mockRestore();
  });
  it('resumes a completed server attempt after a lost completion response, without replaying mutations', async () => {
    request.mockReset();
    const practice = finishOffline(newOfflineAttempt(quiz.id, 'one'), quiz, key);
    const server = { ...practice.attempt!, id: 'server-one' };
    request.mockImplementation(async (_client, path: string, options?: { method?: string }) => path.endsWith('/attempts') && options?.method !== 'POST' ? [] : server);
    await expect(syncOfflinePractice(client, quiz.id, practice)).resolves.toEqual(server);
    expect(request.mock.calls.some(([, path]) => path.includes('/answers/') || path.endsWith('/complete'))).toBe(false);
  });
  it('rejects an attempt for another quiz before any network request', async () => {
    request.mockReset();
    await expect(syncOfflinePractice(client, 'another-quiz', { attempt: newOfflineAttempt(quiz.id, 'one'), result: null, selected: [], dirty: true })).rejects.toThrow('no_active_attempt');
    expect(request).not.toHaveBeenCalled();
  });
});
