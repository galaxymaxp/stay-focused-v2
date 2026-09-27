import type { Database,Json,ProcessingJobDatabaseRow } from '@stay-focused/db';
import { GenerationContractError } from '@stay-focused/engine';
import type { Quiz,QuizAttempt,QuizAttemptAnswer,QuizGenerationRequest,QuizQuestion,QuizQuestionResult,QuizResult,QuizTopicPerformance } from '@stay-focused/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { ExperienceFailure } from '../experience/errors';
import { record } from '../experience/mappers';
import { durableGenerationProvider } from '../processing-jobs/ai-generation';
import { validateIdempotencyKey } from '../processing-jobs/creation';
import { findProcessingJobSource } from '../processing-jobs/repository';
import { updateProcessingJobProgress } from '../processing-jobs/worker-repository';
import { dispatchAcceptedProcessingJob } from '../processing-jobs/workflow-dispatch';
import { readProcessingJobCheckpoint,writeProcessingJobCheckpoint } from '../processing-jobs/workflow-repository';
import { AI_FIRST_QUIZ_MODEL,generateQuizSet } from './ai-first';
import type { QuizRegion,StoredQuestion } from './generation';
import { normalized,quizQuestionKey } from './generation';
import { assembleQuizSources,readQuizRequest,resolveQuizSources } from './sources';
type Client = SupabaseClient<Database>;
export type QuizRow = Database['public']['Tables']['quizzes']['Row'];
export type AttemptRow = Database['public']['Tables']['quiz_attempts']['Row'];
const json = (v: unknown): Json => JSON.parse(JSON.stringify(v)) as Json;
function requestKey(value: string | null) {
    try {
        return validateIdempotencyKey(value);
    }
    catch {
        throw new ExperienceFailure(400, 'invalid_request');
    }
}
export async function startQuizGeneration(client: Client, userId: string, input: QuizGenerationRequest, key: string | null) {
    const idempotencyKey = requestKey(key);
    const source = await resolveQuizSources(client, userId, input);
    const { data, error } = await client.rpc('create_quiz_processing_job', { p_user_id: userId, p_course_id: source.courseId, p_reviewer_artifact_id: source.reviewerArtifactId, p_idempotency_key: idempotencyKey, p_input: json(input) });
    if (error) {
        if (error.message === 'conflict')
            throw new ExperienceFailure(409, 'conflict');
        if (error.message === 'rate_limited')
            throw new ExperienceFailure(429, 'rate_limited');
        throw new ExperienceFailure(503, 'quiz_generation_unavailable');
    }
    if (!data?.[0] || data[0].user_id !== userId)
        throw new ExperienceFailure(503, 'quiz_generation_unavailable');
    return dispatchAcceptedProcessingJob(data[0]);
}
export async function processQuizJob(client: Client, job: ProcessingJobDatabaseRow, workerId: string) {
    const source = await findProcessingJobSource(client, job);
    if (job.job_type !== 'quiz_generation' || source.user_id !== job.user_id)
        throw new ExperienceFailure(404, 'quiz_source_unavailable');
    const metadata = record(source.metadata), input = readQuizRequest(metadata.quizInput);
    let regions: QuizRegion[];
    let materialIds: string[];
    const saved = await readProcessingJobCheckpoint(client, job.id, 'quiz:source:ai-first');
    if (saved) {
        const value = record(saved.payload);
        regions = value.regions as QuizRegion[];
        materialIds = value.materialIds as string[];
    } else {
        await updateProcessingJobProgress(client, { jobId: job.id, workerId, stage: 'preparing_source', statusMessage: 'Preparing quiz material' });
        const sources = await assembleQuizSources(client, job.user_id, input);
        if (sources.courseId !== metadata.courseId || sources.reviewerArtifactId !== metadata.reviewerArtifactId) throw new ExperienceFailure(409, 'quiz_source_unavailable');
        regions = sources.regions; materialIds = sources.materialIds;
        await writeProcessingJobCheckpoint(client, { jobId: job.id, checkpointKey: 'quiz:source:ai-first', payload: json({ regions, materialIds }) });
    }
    const complete = await readProcessingJobCheckpoint(client, job.id, 'quiz:complete:ai-first');
    let questions: StoredQuestion[];
    if (complete) questions = record(complete.payload).questions as StoredQuestion[];
    else {
        await updateProcessingJobProgress(client, { jobId: job.id, workerId, stage: 'generating_sections', statusMessage: 'Creating your quiz' });
        try {
            questions = [];
            for (const { offset, size } of quizBatches(input.questionCount)) {
                const checkpointKey = `quiz:batch:ai-first:${String(offset).padStart(3, '0')}`;
                const savedBatch = await readProcessingJobCheckpoint(client, job.id, checkpointKey);
                let batch = savedBatch ? record(savedBatch.payload).questions as StoredQuestion[] : null;
                if (batch && batch.length !== size) throw new GenerationContractError([`batch_${offset}:count`]);
                if (!batch) {
                    const provider = durableGenerationProvider(client, job.id, workerId);
                    for (let retry = 0; retry < 3; retry++) {
                        const candidate = await generateQuizSet(provider, { ...input, questionCount: size }, regions, undefined, questions);
                        batch = candidate.map((question, index) => ({ ...question, id: `q${offset + index + 1}` }));
                        if (!hasRepeatedQuizQuestions([...questions, ...batch]) && !hasUnbalancedQuizMix([...questions, ...batch], input.questionTypes)) break;
                        batch = null;
                    }
                    if (!batch) throw new GenerationContractError([`batch_${offset}:duplicate_question`]);
                    await writeProcessingJobCheckpoint(client, { jobId: job.id, checkpointKey, payload: json({ questions: batch }) });
                }
                questions.push(...batch);
                if (hasRepeatedQuizQuestions(questions)) throw new GenerationContractError([`batch_${offset}:duplicate_question`]);
            }
        }
        catch (error) {
            console.info('quiz_generation.failed', { jobId: job.id, category: error instanceof GenerationContractError ? 'contract' : 'provider' });
            throw new ExperienceFailure(error instanceof GenerationContractError ? 422 : 503, 'quiz_generation_failed');
        }
        await writeProcessingJobCheckpoint(client, { jobId: job.id, checkpointKey: 'quiz:complete:ai-first', payload: json({ questions }) });
    }
    if (questions.length !== input.questionCount) throw new ExperienceFailure(422, 'quiz_generation_failed');
    const owned = await resolveQuizSources(client, job.user_id, input);
    if (owned.courseId !== metadata.courseId || owned.reviewerArtifactId !== metadata.reviewerArtifactId || [...owned.materialIds].sort().join('|') !== [...materialIds].sort().join('|'))
        throw new ExperienceFailure(409, 'quiz_source_unavailable');
    await updateProcessingJobProgress(client, { jobId: job.id, workerId, stage: 'storing_result', statusMessage: 'Saving quiz' });
    return { payload: { courseId: metadata.courseId, reviewerArtifactId: metadata.reviewerArtifactId, materialIds, title: `${questions.length}-question quiz`, questions,
            provenance: { policy: 'quiz-ai-first', provider: `openai:${AI_FIRST_QUIZ_MODEL}`, sourceSha256: createHash('sha256').update(JSON.stringify(regions)).digest('hex') } }, metrics: { questionCount: questions.length, topicCount: regions.length } };
}
/** Exact stems and highly overlapping long stems are duplicate study items. */
export function hasRepeatedQuizQuestions(questions: readonly (Pick<StoredQuestion, 'prompt'> & Partial<Pick<StoredQuestion, 'type' | 'leftItem'>>)[]): boolean {
    const stems = questions.map(quizQuestionKey);
    for (let i = 0; i < stems.length; i++) for (let j = 0; j < i; j++) {
        if (stems[i] === stems[j]) return true;
        if (questions[i]!.type === 'matching' || questions[j]!.type === 'matching') continue;
        const a = new Set(stems[i]!.split(' ').filter(Boolean)), b = new Set(stems[j]!.split(' ').filter(Boolean));
        if (a.size < 8 || b.size < 8) continue;
        const intersection = [...a].filter(word => b.has(word)).length;
        if (intersection / new Set([...a, ...b]).size > 0.85) return true;
    }
    return false;
}
export function hasUnbalancedQuizMix(questions: readonly Pick<StoredQuestion, 'type'>[], requestedTypes: readonly StoredQuestion['type'][] | undefined): boolean {
    const allowed = requestedTypes ?? ['single_select', 'identification', 'true_false', 'modified_true_false', 'matching'];
    if (allowed.length < 3 || questions.length < 10) return false;
    const counts = new Map<string, number>();
    for (const question of questions) counts.set(question.type, (counts.get(question.type) ?? 0) + 1);
    return Math.max(...counts.values()) > Math.ceil(questions.length * 0.6) || counts.size < Math.min(3, allowed.length);
}
export function quizBatches(count: number): { offset: number; size: number }[] {
    if (!Number.isInteger(count) || count < 5 || count > 100) throw new Error('invalid_quiz_count');
    return Array.from({ length: Math.ceil(count / 20) }, (_, index) => ({ offset: index * 20, size: Math.min(20, count - index * 20) }));
}
export function learnerQuestion(q: QuizQuestion): QuizQuestion {
    return { id: q.id, type: q.type, prompt: q.prompt, options: q.options.map(o => ({ id: o.id, text: o.text })), difficulty: q.difficulty, selectionInstruction: q.type === 'multi_select' ? 'Select all correct answers.' : q.type === 'identification' ? 'Type the term.' : q.type === 'modified_true_false' ? 'Mark true, or mark false and correct the wrong term.' : q.type === 'matching' ? 'Match the term to its meaning.' : 'Choose one answer.', ...(q.type === 'matching' && q.leftItem ? { leftItem: q.leftItem } : {}) };
}
export function quizView(row: QuizRow, history: readonly AttemptRow[] = []): Quiz {
    const attempts = history.filter(a => a.user_id === row.user_id && a.quiz_id === row.id).sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at) || b.id.localeCompare(a.id));
    const completed = attempts.filter(a => a.status === 'completed' && a.percentage !== null).sort((a, b) => Date.parse(b.completed_at!) - Date.parse(a.completed_at!) || b.id.localeCompare(a.id));
    const ids = row.source_material_ids as string[];
    return { id: row.id, title: row.title, courseId: row.course_id, reviewerArtifactId: row.reviewer_artifact_id, sourceId: ids[0] ?? null, sourceMaterialIds: ids, questionCount: row.question_count, difficulty: row.difficulty as Quiz['difficulty'], createdAt: row.created_at, updatedAt: row.updated_at,
        attemptCount: attempts.length, latestScore: completed[0] ? Number(completed[0].percentage) : null, bestScore: completed.length ? Math.max(...completed.map(a => a.percentage!)) : null, questions: (row.questions as unknown as QuizQuestion[]).map(learnerQuestion) };
}
export function evaluateAnswer(question: StoredQuestion, answer: QuizAttemptAnswer): QuizQuestionResult {
    const correct = [...normalizeSubmittedAnswer(question, answer.selectedOptionIds)].sort().join('|') === [...question.correctOptionIds].sort().join('|');
    return { questionId: question.id, selectedOptionIds: [...answer.selectedOptionIds], correctOptionIds: [...question.correctOptionIds], correct, explanation: question.explanation, topicId: question.topicId, topic: question.topic, sourceRefs: question.sourceRefs.map(r => ({ materialId: r.materialId, regionId: r.regionId, page: r.page, slide: r.slide })), reviewerSectionIds: [...question.reviewerSectionIds] };
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
export function attemptView(row: AttemptRow, questions: readonly StoredQuestion[]): QuizAttempt {
    const answers = (row.answers as unknown as QuizAttemptAnswer[]).map(a => ({ questionId: a.questionId, selectedOptionIds: [...a.selectedOptionIds], finalizedAt: a.finalizedAt }));
    return { id: row.id, quizId: row.quiz_id, startedAt: row.started_at, completedAt: row.completed_at, status: row.status as QuizAttempt['status'], answers, feedback: answers.filter(a => a.finalizedAt !== null).map(a => {
            const q = questions.find(q => q.id === a.questionId);
            if (!q)
                throw new ExperienceFailure(503, 'unavailable');
            return evaluateAnswer(q, a);
        }) };
}
export function resultView(attempt: QuizAttempt, questions: readonly StoredQuestion[]): QuizResult {
    if (attempt.status !== 'completed' || attempt.feedback.length !== questions.length)
        throw new ExperienceFailure(409, 'quiz_result_unavailable');
    const results = attempt.feedback;
    const correctCount = results.filter(r => r.correct).length;
    const topics = new Map<string, QuizTopicPerformance>();
    for (const r of results) {
        const previous = topics.get(r.topicId);
        const asked = (previous?.asked ?? 0) + 1, missed = (previous?.missed ?? 0) + (r.correct ? 0 : 1);
        topics.set(r.topicId, { topicId: r.topicId, label: r.topic, asked, missed, accuracy: Math.round((asked - missed) / asked * 10000) / 100,
            sourceRefs: [...new Map([...(previous?.sourceRefs ?? []), ...r.sourceRefs].map(ref => [JSON.stringify(ref), ref])).values()], reviewerSectionIds: [...new Set([...(previous?.reviewerSectionIds ?? []), ...r.reviewerSectionIds])] });
    }
    const topicPerformance = [...topics.values()].sort((a, b) => a.accuracy - b.accuracy || a.topicId.localeCompare(b.topicId));
    return { attemptId: attempt.id, quizId: attempt.quizId, correctCount, incorrectCount: results.length - correctCount, totalQuestions: results.length, percentage: Math.round(correctCount / results.length * 10000) / 100, questions: results, topicPerformance,
        weakAreas: topicPerformance.filter(t => t.asked === 1 ? t.missed === 1 : t.accuracy < 60).map(t => ({ ...t, kind: t.asked === 1 ? 'missed_topic' : 'weak_area' })) };
}
const rpcCodes = ['quiz_not_found', 'quiz_attempt_not_found', 'quiz_attempt_completed', 'quiz_question_not_found', 'quiz_answer_invalid', 'quiz_answer_already_finalized', 'quiz_result_unavailable', 'conflict'] as const;
function rpcError(error: {
    message: string;
} | null): void {
    if (!error)
        return;
    const code = rpcCodes.find(c => c === error.message);
    throw new ExperienceFailure(code?.endsWith('not_found') ? 404 : code === 'quiz_answer_invalid' ? 400 : code ? 409 : 503, code ?? 'unavailable');
}
export async function readQuiz(client: Client, userId: string, id: string): Promise<Quiz> {
    const { data, error } = await client.from('quizzes').select('*').eq('user_id', userId).eq('id', id).maybeSingle();
    if (error)
        throw new ExperienceFailure(503, 'unavailable');
    if (!data || data.user_id !== userId)
        throw new ExperienceFailure(404, 'quiz_not_found');
    return quizView(data, await attemptHistoryRows(client, userId, id));
}
export async function deleteQuiz(client: Client, userId: string, id: string): Promise<void> {
    const { data, error } = await client.from('quizzes').delete().eq('user_id', userId).eq('id', id).select('id').maybeSingle();
    if (error) throw new ExperienceFailure(503, 'unavailable');
    if (!data) throw new ExperienceFailure(404, 'quiz_not_found');
}
export async function attemptHistoryRows(client: Client, userId: string, quizId: string): Promise<AttemptRow[]> {
    const all: AttemptRow[] = [];
    for (let offset = 0; offset < 10000; offset += 200) {
        const { data, error } = await client.from('quiz_attempts').select('*').eq('user_id', userId).eq('quiz_id', quizId).order('started_at', { ascending: false }).order('id').range(offset, offset + 199);
        if (error || !data)
            throw new ExperienceFailure(503, 'unavailable');
        all.push(...data.filter(a => a.user_id === userId && a.quiz_id === quizId));
        if (data.length < 200)
            return all;
    }
    throw new ExperienceFailure(503, 'unavailable');
}
async function keys(client: Client, userId: string, quizId: string): Promise<StoredQuestion[]> {
    const { data, error } = await client.from('quiz_keys').select('questions,user_id').eq('user_id', userId).eq('quiz_id', quizId).maybeSingle();
    if (error || !data || data.user_id !== userId)
        throw new ExperienceFailure(404, 'quiz_not_found');
    return data.questions as unknown as StoredQuestion[];
}
export async function readAttempt(client: Client, userId: string, id: string, result = false) {
    const { data, error } = await client.from('quiz_attempts').select('*').eq('user_id', userId).eq('id', id).maybeSingle();
    if (error)
        throw new ExperienceFailure(503, 'unavailable');
    if (!data || data.user_id !== userId)
        throw new ExperienceFailure(404, 'quiz_attempt_not_found');
    const questions = await keys(client, userId, data.quiz_id), view = attemptView(data, questions);
    return result ? resultView(view, questions) : view;
}
export async function startAttempt(client: Client, userId: string, quizId: string, key: string | null) {
    const { data, error } = await client.rpc('start_quiz_attempt', { p_user_id: userId, p_quiz_id: quizId, p_request_key: requestKey(key) });
    rpcError(error);
    if (!data?.[0] || data[0].user_id !== userId)
        throw new ExperienceFailure(404, 'quiz_not_found');
    return attemptView(data[0], await keys(client, userId, quizId));
}
export async function saveAnswer(client: Client, userId: string, attemptId: string, questionId: string, value: unknown) {
    const input = record(value);
    if (Object.keys(input).some(k => !['selectedOptionIds', 'finalize'].includes(k)) || typeof input.finalize !== 'boolean' || !Array.isArray(input.selectedOptionIds) || input.selectedOptionIds.length > 6 || !input.selectedOptionIds.every(v => typeof v === 'string' && v.length <= 200) || new Set(input.selectedOptionIds).size !== input.selectedOptionIds.length)
        throw new ExperienceFailure(400, 'quiz_answer_invalid');
    const { data: attemptRow, error: attemptError } = await client.from('quiz_attempts').select('quiz_id').eq('user_id', userId).eq('id', attemptId).maybeSingle();
    if (attemptError || !attemptRow) throw new ExperienceFailure(404, 'quiz_attempt_not_found');
    const question = (await keys(client, userId, attemptRow.quiz_id)).find(item => item.id === questionId);
    if (!question) throw new ExperienceFailure(404, 'quiz_question_not_found');
    const normalizedSelection = normalizeSubmittedAnswer(question, input.selectedOptionIds as string[]);
    const { data, error } = await client.rpc('save_quiz_answer', { p_user_id: userId, p_attempt_id: attemptId, p_question_id: questionId, p_selected: json(normalizedSelection), p_finalize: input.finalize });
    rpcError(error);
    if (!data?.[0] || data[0].user_id !== userId)
        throw new ExperienceFailure(404, 'quiz_attempt_not_found');
    return attemptView(data[0], await keys(client, userId, data[0].quiz_id));
}
export async function completeAttempt(client: Client, userId: string, attemptId: string, abandon = false) {
    const { data, error } = await client.rpc('complete_quiz_attempt', { p_user_id: userId, p_attempt_id: attemptId, p_abandon: abandon });
    rpcError(error);
    if (!data?.[0] || data[0].user_id !== userId)
        throw new ExperienceFailure(404, 'quiz_attempt_not_found');
    const questions = await keys(client, userId, data[0].quiz_id), attempt = attemptView(data[0], questions);
    return abandon ? attempt : resultView(attempt, questions);
}
