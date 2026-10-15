import {describe,expect,it} from 'vitest';
import type { QuizAttempt,QuizAttemptAnswer,QuizQuestion,QuizQuestionResult,QuizResult,QuizTopicPerformance } from './quiz';
import {gradeQuestion,gradeAttempt} from './quiz-grading';
import {attempt,gradingFixtures,key,question} from './quiz-grading.fixtures';
// Frozen pre-extraction TypeScript oracle: compare complete feedback and results.
type StoredQuestion = QuizQuestion & {correctOptionIds:readonly string[];acceptedAnswers?:readonly string[];explanation:string;topicId:string;topic:string;sourceRefs:NonNullable<QuizQuestionResult['sourceRefs']>;reviewerSectionIds:readonly string[]};
const normalized = (s:string) => s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function evaluateAnswer(question: StoredQuestion, answer: QuizAttemptAnswer): QuizQuestionResult {
    const submitted = normalizeSubmittedAnswer(question, answer.selectedOptionIds);
    const pairCount = question.matchingPairs?.length ?? 0;
    const pairCorrectCount = pairCount ? submitted.filter(value => question.correctOptionIds.includes(value)).length : 0;
    const correct = pairCount ? pairCorrectCount === pairCount && submitted.length === pairCount : [...submitted].sort().join('|') === [...question.correctOptionIds].sort().join('|');
    return { questionId: question.id, selectedOptionIds: [...answer.selectedOptionIds], correctOptionIds: [...question.correctOptionIds], correct,
      ...(pairCount ? { pairCount, pairCorrectCount } : {}), explanation: question.explanation, topicId: question.topicId, topic: question.topic, sourceRefs: question.sourceRefs.map(r => ({ materialId: r.materialId, regionId: r.regionId, page: r.page, slide: r.slide })), reviewerSectionIds: [...question.reviewerSectionIds] };
}
export function normalizeSubmittedAnswer(question: StoredQuestion, selected: readonly string[]): string[] {
    if (question.type !== 'identification' && question.type !== 'modified_true_false') return [...selected];
    const index = question.type === 'identification' ? 0 : selected.findIndex(value => !question.options.some(option => option.id === value));
    if (index < 0 || selected.length <= index) return [...selected];
    const answer = normalized(selected[index]!);
    const accepted = question.acceptedAnswers ?? [];
    const canonical = question.type === 'identification' ? question.correctOptionIds[0] : question.correctOptionIds.find(value => !question.options.some(option => option.id === value));
    return selected.map((value, position) => position === index ? accepted.some(alias => normalized(alias) === answer) && canonical ? canonical : answer : value);
}

function oldResult(attempt:QuizAttempt, questions:readonly StoredQuestion[]):QuizResult {
    const results = questions.map(q => attempt.feedback.find(result => result.questionId === q.id) ??
      { ...evaluateAnswer(q, { questionId: q.id, selectedOptionIds: [], finalizedAt: null }), correct: false, skipped: true });
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

describe('shared quiz grader',()=> {
 it.each(gradingFixtures)('$name: old/new response and SQL-rule table parity',fixture=> {
  const q:StoredQuestion={...fixture.question,...key,...fixture.key,topicId:'t1',topic:'Synthetic topic',sourceRefs:[],reviewerSectionIds:[]};
  const answer={questionId:q.id,selectedOptionIds:fixture.selected,finalizedAt:fixture.finalized===false?null:attempt.updatedAt};
  const feedback=gradeQuestion(q,q,answer.selectedOptionIds);
  expect(feedback).toEqual({ ...evaluateAnswer(q,answer), ...(q.acceptedAnswers?.length ? { correctAnswerText: q.acceptedAnswers[0] } : {}) });
  const visible=fixture.finalized!==false || fixture.revealed;
  const a={...attempt,answers:[answer],feedback:visible?[{...feedback,...(fixture.revealed?{revealed:true,assisted:!!fixture.assisted,correct:fixture.assisted?false:feedback.correct}:{})}]:[]};
  const result=gradeAttempt(a,[q],[q]);
  expect(result).toEqual(oldResult(a,[q]));
  expect(result.percentage).toBe(fixture.percentage);
 });
 it('weights matching pairs against ordinary questions and rounds the attempt',()=>{
  const f=gradingFixtures.find(f=>f.name==='matching partial rounded')!;
  const q2={...question,id:'q2'};const k2={...key,id:'q2'};
  const a={...attempt,feedback:[gradeQuestion(f.question,f.key,f.selected),gradeQuestion(q2,k2,['a'])]};
  expect(gradeAttempt(a,[f.question,q2],[f.key,k2])).toMatchObject({earnedPoints:2,possiblePoints:4,percentage:50});
 });
 it('rejects wrong question identity',()=>expect(()=>gradeQuestion(question,{...key,id:'q2'},['a'])).toThrow('quiz_key_mismatch'));
});
