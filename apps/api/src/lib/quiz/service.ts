import type { Database, Json, ProcessingJobDatabaseRow } from '@stay-focused/db';
import type { Quiz, QuizAttempt, QuizAttemptAnswer, QuizGenerationRequest, QuizQuestion, QuizQuestionResult, QuizResult, QuizTopicPerformance } from '@stay-focused/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { createServerOpenAIProvider } from '@/providers';
import { ExperienceFailure } from '../experience/errors';
import { record } from '../experience/mappers';
import { validateIdempotencyKey } from '../processing-jobs/creation';
import { dispatchAcceptedProcessingJob } from '../processing-jobs/workflow-dispatch';
import { findProcessingJobSource } from '../processing-jobs/repository';
import { updateProcessingJobProgress } from '../processing-jobs/worker-repository';
import { readProcessingJobCheckpoint, writeProcessingJobCheckpoint } from '../processing-jobs/workflow-repository';
import { assembleQuizSources, readQuizRequest, resolveQuizSources } from './sources';
import { generateQuiz, makeQuizPlan, QUIZ_MODEL, type QuizConvergenceState, type QuizGenerationDiagnostic, type QuizPlan, type StoredQuestion } from './generation';
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
    const { data, error } = await client.rpc('create_quiz_processing_job', { p_user_id: userId, p_course_id: source.courseId, p_reviewer_id: source.reviewerId, p_idempotency_key: idempotencyKey, p_input: json(input) });
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
    let plan: QuizPlan;
    let materialIds: string[];
    const saved = await readProcessingJobCheckpoint(client, job.id, 'quiz:plan:v4');
    if (saved) {
        const value = record(saved.payload);
        plan = value.plan as QuizPlan;
        materialIds = value.materialIds as string[];
    }
    else {
        await updateProcessingJobProgress(client, { jobId: job.id, workerId, stage: 'preparing_source', statusMessage: 'Preparing quiz material' });
        const sources = await assembleQuizSources(client, job.user_id, input);
        if (sources.courseId !== metadata.courseId || sources.reviewerId !== metadata.reviewerId)
            throw new ExperienceFailure(409, 'quiz_source_unavailable');
        try {
            plan = makeQuizPlan(sources.regions, input);
        }
        catch (error) {
            console.info('quiz_generation.diagnostic', { jobId: job.id, failureClass: 'planning_failure', regionCount: sources.regions.length, requestedQuestionCount: input.questionCount });
            throw error;
        }
        materialIds = sources.materialIds;
        await writeProcessingJobCheckpoint(client, { jobId: job.id, checkpointKey: 'quiz:plan:v4', payload: json({ plan, materialIds }) });
    }
    // Checkpoints are private server data, not an experience endpoint. A resumed
    // workflow retains the exact source plan and already verified questions.
    const previous = await readProcessingJobCheckpoint(client, job.id, 'quiz:accepted:v4');
    const accepted = previous && Array.isArray(record(previous.payload).questions) ? record(previous.payload).questions as StoredQuestion[] : [];
    await updateProcessingJobProgress(client, { jobId: job.id, workerId, stage: 'generating_sections', statusMessage: 'Generating and validating quiz questions' });
    const questions = await generateQuiz(createServerOpenAIProvider(), plan, async (questions, convergence) => {
        await writeProcessingJobCheckpoint(client, { jobId: job.id, checkpointKey: 'quiz:accepted:v4', payload: json({ questions, convergence }) });
    }, accepted, (diagnostic: QuizGenerationDiagnostic) => {
        console.info('quiz_generation.diagnostic', { jobId: job.id, ...diagnostic });
    }, previous ? record(previous.payload).convergence as QuizConvergenceState | undefined : undefined);
    if (questions.length !== input.questionCount) throw new ExperienceFailure(422, 'quiz_generation_failed');
    const owned = await resolveQuizSources(client, job.user_id, input);
    if (owned.courseId !== metadata.courseId || owned.reviewerId !== metadata.reviewerId || [...owned.materialIds].sort().join('|') !== [...materialIds].sort().join('|'))
        throw new ExperienceFailure(409, 'quiz_source_unavailable');
    await updateProcessingJobProgress(client, { jobId: job.id, workerId, stage: 'storing_result', statusMessage: 'Saving quiz' });
    return { payload: { courseId: metadata.courseId, reviewerId: metadata.reviewerId, materialIds, title: `${questions.length}-question quiz`, questions,
            provenance: { policy: 'quiz-v4', provider: `openai:${QUIZ_MODEL}`, plan, sourceSha256: createHash('sha256').update(JSON.stringify([...plan.topics, ...(plan.reserveTopics ?? [])])).digest('hex') } }, metrics: { questionCount: questions.length, topicCount: plan.topics.length } };
}
export function learnerQuestion(q: QuizQuestion): QuizQuestion {
    return { id: q.id, type: q.type, prompt: q.prompt, options: q.options.map(o => ({ id: o.id, text: o.text })), difficulty: q.difficulty, selectionInstruction: q.type === 'multi_select' ? 'Select all correct answers.' : 'Choose one answer.' };
}
export function quizView(row: QuizRow, history: readonly AttemptRow[] = []): Quiz {
    const attempts = history.filter(a => a.user_id === row.user_id && a.quiz_id === row.id).sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at) || b.id.localeCompare(a.id));
    const completed = attempts.filter(a => a.status === 'completed' && a.percentage !== null).sort((a, b) => Date.parse(b.completed_at!) - Date.parse(a.completed_at!) || b.id.localeCompare(a.id));
    const ids = row.source_material_ids as string[];
    return { id: row.id, title: row.title, courseId: row.course_id, reviewerId: row.reviewer_id, sourceId: ids[0] ?? null, sourceMaterialIds: ids, questionCount: row.question_count, difficulty: row.difficulty as Quiz['difficulty'], createdAt: row.created_at, updatedAt: row.updated_at,
        attemptCount: attempts.length, latestScore: completed[0] ? Number(completed[0].percentage) : null, bestScore: completed.length ? Math.max(...completed.map(a => a.percentage!)) : null, questions: (row.questions as unknown as QuizQuestion[]).map(learnerQuestion) };
}
export function evaluateAnswer(question: StoredQuestion, answer: QuizAttemptAnswer): QuizQuestionResult {
    const correct = [...answer.selectedOptionIds].sort().join('|') === [...question.correctOptionIds].sort().join('|');
    return { questionId: question.id, selectedOptionIds: [...answer.selectedOptionIds], correctOptionIds: [...question.correctOptionIds], correct, explanation: question.explanation, topicId: question.topicId, topic: question.topic, sourceRefs: question.sourceRefs.map(r => ({ materialId: r.materialId, regionId: r.regionId, page: r.page, slide: r.slide })), reviewerSectionIds: [...question.reviewerSectionIds] };
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
    if (Object.keys(input).some(k => !['selectedOptionIds', 'finalize'].includes(k)) || typeof input.finalize !== 'boolean' || !Array.isArray(input.selectedOptionIds) || input.selectedOptionIds.length > 6 || !input.selectedOptionIds.every(v => typeof v === 'string' && v.length <= 30) || new Set(input.selectedOptionIds).size !== input.selectedOptionIds.length)
        throw new ExperienceFailure(400, 'quiz_answer_invalid');
    const { data, error } = await client.rpc('save_quiz_answer', { p_user_id: userId, p_attempt_id: attemptId, p_question_id: questionId, p_selected: json(input.selectedOptionIds), p_finalize: input.finalize });
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
