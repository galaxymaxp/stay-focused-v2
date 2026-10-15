import type { Database } from '@stay-focused/db';
import type { Quiz, QuizQuestion, QuizAttemptAnswer } from '@stay-focused/shared';
import { record } from '../experience/mappers';
type QuizRow = Database['public']['Tables']['quizzes']['Row'];
type AttemptRow = Database['public']['Tables']['quiz_attempts']['Row'];

export function learnerQuestion(q: QuizQuestion): QuizQuestion {
    const orderKey = (id: string) => [...`${q.id}:${id}`].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0, 2166136261);
    const options = q.options.map(o => ({ id: o.id, text: o.text }));
    if (q.matchingPairs?.length) options.sort((a, b) => orderKey(a.id) - orderKey(b.id) || a.id.localeCompare(b.id));
    return { id: q.id, type: q.type, prompt: q.prompt, options, difficulty: q.difficulty, selectionInstruction: q.type === 'multi_select' ? 'Select all correct answers.' : q.type === 'identification' ? 'Type the term.' : q.type === 'modified_true_false' ? 'Mark true, or mark false and correct the wrong term.' : q.type === 'matching' ? 'Match each term to one meaning.' : 'Choose one answer.', ...(q.type === 'matching' && q.leftItem ? { leftItem: q.leftItem } : {}), ...(q.matchingPairs?.length ? { matchingPairs: q.matchingPairs.map(pair => ({ id: pair.id, leftItem: pair.leftItem })) } : {}) };
}
export function quizView(row: QuizRow, history: readonly AttemptRow[] = []): Quiz {
    const attempts = history.filter(a => a.user_id === row.user_id && a.quiz_id === row.id).sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at) || b.id.localeCompare(a.id));
    const completed = attempts.filter(a => a.status === 'completed' && a.percentage !== null).sort((a, b) => Date.parse(b.completed_at!) - Date.parse(a.completed_at!) || b.id.localeCompare(a.id));
    const active = attempts.find(a => a.status === 'in_progress');
    const activeState = active ? record(active.study_state) : {};
    const ids = row.source_material_ids as string[];
    return { id: row.id, title: row.title, courseId: row.course_id, reviewerArtifactId: row.reviewer_artifact_id, sourceId: row.course_id ? ids[0] ?? null : row.source_version_id, sourceMaterialIds: ids, questionCount: row.question_count, difficulty: row.difficulty as Quiz['difficulty'], createdAt: row.created_at, updatedAt: row.updated_at,
        attemptCount: attempts.length, latestScore: completed[0] ? Number(completed[0].percentage) : null, bestScore: completed.length ? Math.max(...completed.map(a => a.percentage!)) : null,
        activeAttempt: active ? { id: active.id, currentQuestion: Number.isInteger(activeState.currentQuestion) ? activeState.currentQuestion as number : 0,
          answeredCount: (active.answers as unknown as QuizAttemptAnswer[]).filter(answer => answer.finalizedAt).length,
          skippedCount: Array.isArray(activeState.skipped) ? activeState.skipped.length : 0,
          revealedCount: Array.isArray(activeState.revealed) ? activeState.revealed.length : 0 } : null,
        questions: (row.questions as unknown as QuizQuestion[]).map(learnerQuestion) };
}
