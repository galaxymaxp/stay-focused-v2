import type { QuizQuestion, QuizAttempt, QuizQuestionResult, QuizResult, QuizTopicPerformance, QuizSourceReference } from './quiz';

/** Private owner-only grading/reveal data; never part of the learner body. */
export interface QuizAnswerKeyQuestion {
    readonly id: string;
    readonly correctOptionIds: readonly string[];
    readonly acceptedAnswers?: readonly string[];
    readonly explanation: string;
    readonly topicId?: string;
    readonly topic?: string;
    readonly sourceRefs?: readonly QuizSourceReference[];
    readonly reviewerSectionIds?: readonly string[];
}
export interface QuizAnswerKey {
    readonly quizId: string;
    /** Immutable quiz publication identity (quizzes.generation_id). */
    readonly versionId: string;
    readonly questions: readonly QuizAnswerKeyQuestion[];
}
const normalized = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** complete_quiz_attempt remains the SQL authority for persisted percentage. */
export function gradeQuestion(question: QuizQuestion, key: QuizAnswerKeyQuestion, selectedOptionIds: readonly string[]): QuizQuestionResult {
    if (question.id !== key.id) throw new Error('quiz_key_mismatch');
    const submitted = normalizeSubmittedAnswer(question, key, selectedOptionIds);
    const pairCount = question.matchingPairs?.length ?? 0;
    const pairCorrectCount = pairCount ? submitted.filter(value => key.correctOptionIds.includes(value)).length : 0;
    const correct = pairCount ? pairCorrectCount === pairCount && submitted.length === pairCount : [...submitted].sort().join('|') === [...key.correctOptionIds].sort().join('|');
    return { questionId: question.id, selectedOptionIds: [...selectedOptionIds], correctOptionIds: [...key.correctOptionIds], correct,
      ...(key.acceptedAnswers?.length ? { correctAnswerText: key.acceptedAnswers[0] } : {}),
      ...(pairCount ? { pairCount, pairCorrectCount } : {}), explanation: key.explanation, topicId: key.topicId ?? question.id, topic: key.topic ?? '', sourceRefs: (key.sourceRefs ?? []).map(r => ({ materialId: r.materialId, regionId: r.regionId, page: r.page, slide: r.slide })), reviewerSectionIds: [...(key.reviewerSectionIds ?? [])] };
}
export function normalizeSubmittedAnswer(question: QuizQuestion, key: QuizAnswerKeyQuestion, selected: readonly string[]): string[] {
    if (question.type !== 'identification' && question.type !== 'modified_true_false') return [...selected];
    const index = question.type === 'identification' ? 0 : selected.findIndex(value => !question.options.some(option => option.id === value));
    if (index < 0 || selected.length <= index) return [...selected];
    const answer = normalized(selected[index]!);
    const accepted = key.acceptedAnswers ?? [];
    const canonical = question.type === 'identification' ? key.correctOptionIds[0] : key.correctOptionIds.find(value => !question.options.some(option => option.id === value));
    return selected.map((value, position) => position === index ? accepted.some(alias => normalized(alias) === answer) && canonical ? canonical : answer : value);
}
export function gradeAttempt(attempt: QuizAttempt, questions: readonly QuizQuestion[], keys: readonly QuizAnswerKeyQuestion[]): QuizResult {
    const results = questions.map(q => attempt.feedback.find(result => result.questionId === q.id) ??
      { ...gradeQuestion(q, requiredKey(keys, q.id), []), correct: false, skipped: true });
    const correctCount = results.filter(r => r.correct).length;
    const possiblePoints = results.reduce((sum, r) => sum + (r.pairCount ?? 1), 0);
    const earnedPoints = results.reduce((sum, r) => sum + (r.assisted || r.skipped ? 0 : r.pairCount ? r.pairCorrectCount ?? 0 : Number(r.correct)), 0);
    const revealedCount = results.filter(r => r.assisted).length;
    const skippedCount = results.filter(r => r.skipped).length;
    const incorrectCount = results.length - correctCount - revealedCount - skippedCount;
    const topics = new Map<string, QuizTopicPerformance>();
    for (const r of results) {
        const previous = topics.get(r.topicId);
        const asked = (previous?.asked ?? 0) + 1, missed = (previous?.missed ?? 0) + (r.correct ? 0 : 1);
        topics.set(r.topicId, { topicId: r.topicId, label: r.topic, asked, missed, accuracy: Math.round((asked - missed) / asked * 10000) / 100,
            sourceRefs: [...new Map([...(previous?.sourceRefs ?? []), ...r.sourceRefs].map(ref => [JSON.stringify(ref), ref])).values()], reviewerSectionIds: [...new Set([...(previous?.reviewerSectionIds ?? []), ...r.reviewerSectionIds])] });
    }
    const topicPerformance = [...topics.values()].sort((a, b) => a.accuracy - b.accuracy || a.topicId.localeCompare(b.topicId));
    return { attemptId: attempt.id, quizId: attempt.quizId, correctCount, incorrectCount, skippedCount, revealedCount, totalQuestions: results.length,
      earnedPoints, possiblePoints, percentage: Math.round(earnedPoints / possiblePoints * 10000) / 100, questions: results, topicPerformance,
        weakAreas: topicPerformance.filter(t => t.asked === 1 ? t.missed === 1 : t.accuracy < 60).map(t => ({ ...t, kind: t.asked === 1 ? 'missed_topic' : 'weak_area' })) };
}

function requiredKey(keys: readonly QuizAnswerKeyQuestion[], id: string): QuizAnswerKeyQuestion {
    const key = keys.find(item => item.id === id);
    if (!key) throw new Error('quiz_key_missing');
    return key;
}
