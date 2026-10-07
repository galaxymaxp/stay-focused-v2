import type { Database } from '@stay-focused/db';
import type { QuizAttemptAnswer, QuizAttemptSummary, QuizLearningProgress, QuizQuestion } from '@stay-focused/shared';

type QuizRow = Database['public']['Tables']['quizzes']['Row'];
type AttemptRow = Database['public']['Tables']['quiz_attempts']['Row'];
const newest = (a: AttemptRow, b: AttemptRow) => Date.parse(b.started_at) - Date.parse(a.started_at) || b.id.localeCompare(a.id);

/** Only public questions and owned persisted attempts are needed; never reads quiz_keys.
 * Active > completed history > abandoned > untouched. Newest start, then greatest
 * ID selects among active attempts. Completion order uses completed_at, then ID.
 */
export function deriveQuizLearningProgress(quiz: QuizRow, history: readonly AttemptRow[]): QuizLearningProgress {
    const attempts = history.filter(a => a.user_id === quiz.user_id && a.quiz_id === quiz.id).sort(newest);
    const active = attempts.find(a => a.status === 'in_progress');
    const completed = attempts.filter(a => a.status === 'completed').sort((a, b) =>
        Date.parse(b.completed_at ?? b.started_at) - Date.parse(a.completed_at ?? a.started_at) || b.id.localeCompare(a.id));
    const abandoned = attempts.find(a => a.status === 'abandoned');
    const selected = active ?? completed[0] ?? abandoned;
    const questionIds = new Set((quiz.questions as unknown as QuizQuestion[]).map(q => q.id));
    const answers = (selected?.answers ?? []) as unknown as QuizAttemptAnswer[];
    const scores = completed.filter(a => a.percentage !== null).map(a => Number(a.percentage));
    return {
        learningState: active ? 'in_progress' : completed.length ? 'completed' : abandoned ? 'abandoned' : 'not_started',
        answeredCount: new Set(answers.filter(a => questionIds.has(a.questionId) && (a.type === 'matching' ? a.pairs.length > 0 : a.selectedOptionIds.length > 0)).map(a => a.questionId)).size,
        questionCount: quiz.question_count,
        activeAttemptId: active?.id ?? null,
        attemptCount: attempts.length,
        completedAttemptCount: completed.length,
        latestCompletedAt: completed[0]?.completed_at ?? null,
        latestScore: completed[0]?.percentage === null || !completed[0] ? null : Number(completed[0].percentage),
        bestScore: scores.length ? Math.max(...scores) : null,
    };
}

export function quizAttemptSummary(row: AttemptRow): QuizAttemptSummary {
    return { id: row.id, quizId: row.quiz_id, status: row.status as QuizAttemptSummary['status'], startedAt: row.started_at,
        completedAt: row.completed_at, percentage: row.percentage === null ? null : Number(row.percentage) };
}
