import { describe, expect, it, vi } from 'vitest';
import type { QuizAttempt } from '@stay-focused/shared';
import { moveOffline, newOfflineAttempt, syncOfflinePractice } from './localQuizPractice';

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
