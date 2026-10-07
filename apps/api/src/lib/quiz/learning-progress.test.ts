import { describe, expect, it } from 'vitest';
import type { Database, Json } from '@stay-focused/db';
import { deriveQuizLearningProgress, quizAttemptSummary } from './learning-progress';

type Attempt = Database['public']['Tables']['quiz_attempts']['Row'];
const quiz: Database['public']['Tables']['quizzes']['Row'] = {
    id: 'quiz', user_id: 'owner', course_id: 'course', reviewer_id: null, generation_id: null,
    title: 'Practice', source_material_ids: [], question_count: 2, difficulty: 'mixed',
    questions: [{ id: 'q1' }, { id: 'q2' }], created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z',
};
const row = (patch: Partial<Attempt> = {}): Attempt => ({ id: 'attempt', quiz_id: quiz.id, user_id: quiz.user_id,
    request_key: 'test', status: 'in_progress', started_at: '2026-10-01T10:00:00Z', completed_at: null, percentage: null, answers: [], ...patch });
const answers = (ids: string[]): Json => ids.map(questionId => ({ questionId, selectedOptionIds: ['a'], finalizedAt: null }));
const done = (patch: Partial<Attempt> = {}) => row({ status: 'completed', completed_at: '2026-10-01T11:00:00Z', percentage: 80, answers: answers(['q1', 'q2']), ...patch });

describe('authoritative Quiz learning progress', () => {
    it('generated without attempts is not started with nullable scores', () => {
        expect(deriveQuizLearningProgress(quiz, [])).toEqual({ learningState: 'not_started', answeredCount: 0, questionCount: 2,
            activeAttemptId: null, attemptCount: 0, completedAttemptCount: 0, latestCompletedAt: null, latestScore: null, bestScore: null });
    });
    it('counts distinct saved drafts/finalized selections on known questions only', () => {
        const a = row({ answers: [...answers(['q1', 'q1', 'unknown']) as Json[], { questionId: 'q2', selectedOptionIds: [], finalizedAt: null }] });
        expect(deriveQuizLearningProgress(quiz, [a])).toMatchObject({ learningState: 'in_progress', answeredCount: 1, activeAttemptId: a.id, bestScore: null });
    });
    it.each([80, 0])('completed %i%% remains completed', percentage => {
        expect(deriveQuizLearningProgress(quiz, [done({ percentage })])).toMatchObject({ learningState: 'completed', answeredCount: 2,
            completedAttemptCount: 1, activeAttemptId: null, latestScore: percentage, bestScore: percentage, latestCompletedAt: '2026-10-01T11:00:00Z' });
    });
    it('does not manufacture a zero score from null history', () => {
        expect(deriveQuizLearningProgress(quiz, [row({ status: 'abandoned', answers: answers(['q1']) })])).toMatchObject({ learningState: 'abandoned', answeredCount: 1, completedAttemptCount: 0, bestScore: null, latestScore: null });
        expect(deriveQuizLearningProgress(quiz, [done({ percentage: null })])).toMatchObject({ learningState: 'completed', bestScore: null, latestScore: null });
    });
    it('active retry wins but retains completion metadata; abandoned retry cannot erase completion', () => {
        const previous = done(), retry = row({ id: 'retry', started_at: '2026-10-02T10:00:00Z', answers: answers(['q1']) });
        expect(deriveQuizLearningProgress(quiz, [previous, retry])).toMatchObject({ learningState: 'in_progress', activeAttemptId: 'retry', answeredCount: 1,
            attemptCount: 2, completedAttemptCount: 1, bestScore: 80, latestCompletedAt: previous.completed_at });
        expect(deriveQuizLearningProgress(quiz, [previous, { ...retry, status: 'abandoned' }])).toMatchObject({ learningState: 'completed', activeAttemptId: null,
            answeredCount: 2, completedAttemptCount: 1, bestScore: 80, latestCompletedAt: previous.completed_at });
    });
    it('uses completion time for latest, keeps best score independent, and breaks completion ties by greatest ID', () => {
        const earlyStartLateFinish = done({ id: 'late', completed_at: '2026-10-03T10:00:00Z', percentage: 0 });
        const laterStart = done({ id: 'earlier', started_at: '2026-10-02T00:00:00Z', completed_at: '2026-10-02T11:00:00Z', percentage: 100 });
        const history = [laterStart, earlyStartLateFinish];
        expect(deriveQuizLearningProgress(quiz, history)).toMatchObject({ completedAttemptCount: 2, bestScore: 100, latestScore: 0, latestCompletedAt: earlyStartLateFinish.completed_at });
        expect(deriveQuizLearningProgress(quiz, [done({ id: 'a', percentage: 50 }), done({ id: 'z', percentage: 0 })]).latestScore).toBe(0);
    });
    it('selects newest active start, then greatest ID, regardless of input order without mutation', () => {
        const old = row({ id: 'old', started_at: '2026-09-30T00:00:00Z' }), a = row({ id: 'a' }), z = row({ id: 'z', answers: answers(['q2']) });
        const history = [a, z, old];
        expect(deriveQuizLearningProgress(quiz, history)).toMatchObject({ activeAttemptId: 'z', answeredCount: 1 });
        expect(deriveQuizLearningProgress(quiz, [...history].reverse())).toEqual(deriveQuizLearningProgress(quiz, history));
        expect(history).toEqual([a, z, old]);
    });
    it('excludes every foreign owner and unrelated quiz before deriving any metadata', () => {
        const foreign = [done({ user_id: 'foreign', percentage: 100 }), row({ user_id: 'foreign', id: 'foreign-active' }), done({ quiz_id: 'other' })];
        expect(deriveQuizLearningProgress(quiz, foreign)).toEqual(deriveQuizLearningProgress(quiz, []));
        expect(deriveQuizLearningProgress(quiz, [...foreign, done({ percentage: 0 })])).toMatchObject({ attemptCount: 1, completedAttemptCount: 1, bestScore: 0, latestScore: 0, activeAttemptId: null });
    });
    it('history DTO preserves completion timestamp and zero/null without answer payloads', () => {
        expect(quizAttemptSummary(done({ percentage: 0 }))).toEqual({ id: 'attempt', quizId: 'quiz', status: 'completed', startedAt: '2026-10-01T10:00:00Z', completedAt: '2026-10-01T11:00:00Z', percentage: 0 });
        expect(quizAttemptSummary(row())).toMatchObject({ percentage: null, completedAt: null });
    });
});
