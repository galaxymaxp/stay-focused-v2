import { quizView } from './read-model';
export { quizView, learnerQuestion } from './read-model';
import type { Database,Json,ProcessingJobDatabaseRow } from '@stay-focused/db';
import { GenerationContractError } from '@stay-focused/engine';
import type { Quiz,QuizAnswerKey,QuizAttempt,QuizAttemptAnswer,QuizGenerationRequest,QuizQuestionResult,QuizResult } from '@stay-focused/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import { gradeAttempt,gradeQuestion,normalizeSubmittedAnswer as normalizeSharedAnswer,quizFormatMaximum } from '@stay-focused/shared';
import { createHash } from 'node:crypto';
import { ExperienceFailure } from '../experience/errors';
import { record } from '../experience/mappers';
import { durableGenerationProvider } from '../processing-jobs/ai-generation';
import { validateIdempotencyKey } from '../processing-jobs/creation';
import { findProcessingJobSource } from '../processing-jobs/repository';
import { updateProcessingJobProgress } from '../processing-jobs/worker-repository';
import { dispatchAcceptedProcessingJob } from '../processing-jobs/workflow-dispatch';
import { readProcessingJobCheckpoint,writeProcessingJobCheckpoint } from '../processing-jobs/workflow-repository';
import { AI_FIRST_QUIZ_MODEL,generateQuizBatch,prepareQuizSource,QuizBatchError,quizProviderCallBudget } from './ai-first';
import type { QuizRegion,StoredQuestion } from './generation';
import { isRepeatedQuizQuestion,quizMixSurplus } from './generation';
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
    const source = await assembleQuizSources(client, userId, input);
    const maximum = quizFormatMaximum(source.capacity, input.questionTypes);
    if (input.questionCount > maximum)
        throw new ExperienceFailure(422, 'quiz_source_capacity_exceeded', maximum);
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
/** A failed older Quiz may have been accepted before capacity locking existed. */
export async function quizRetryCapacity(client: Client, userId: string, jobId: string): Promise<number | null> {
    const { data, error } = await client.from('processing_jobs').select('*').eq('user_id', userId).eq('id', jobId).maybeSingle();
    if (error || !data || data.user_id !== userId) throw new ExperienceFailure(404, 'not_found');
    if (data.job_type !== 'quiz_generation') return null;
    const source = await findProcessingJobSource(client, data);
    if (source.user_id !== userId) throw new ExperienceFailure(404, 'not_found');
    const input = readQuizRequest(record(source.metadata).quizInput);
    const assembled = await assembleQuizSources(client, userId, input);
    const maximum = quizFormatMaximum(assembled.capacity, input.questionTypes);
    return input.questionCount > maximum ? maximum : null;
}
export async function processQuizJob(client: Client, job: ProcessingJobDatabaseRow, workerId: string) {
    const source = await findProcessingJobSource(client, job);
    if (job.job_type !== 'quiz_generation' || source.user_id !== job.user_id)
        throw new ExperienceFailure(404, 'quiz_source_unavailable');
    const metadata = record(source.metadata), input = readQuizRequest(metadata.quizInput);
    let regions: QuizRegion[];
    let materialIds: string[];
    let capacity: number;
    const saved = await readProcessingJobCheckpoint(client, job.id, 'quiz:source:ai-first');
    if (saved) {
        const value = record(saved.payload);
        regions = value.regions as QuizRegion[];
        materialIds = value.materialIds as string[];
        capacity = Number(value.capacity);
        // Older checkpoints stored only the format-independent concept budget.
        if (input.questionTypes?.length === 1 && input.questionTypes[0] === 'matching' && value.matchingCapacityVersion !== 1) capacity = NaN;
    } else {
        await updateProcessingJobProgress(client, { jobId: job.id, workerId, stage: 'preparing_source', statusMessage: 'Preparing quiz material' });
        const sources = await assembleQuizSources(client, job.user_id, input);
        if (sources.courseId !== metadata.courseId || sources.reviewerArtifactId !== metadata.reviewerArtifactId || sources.sourceVersionId !== metadata.sourceVersionId) throw new ExperienceFailure(409, 'quiz_source_unavailable');
        regions = sources.regions; materialIds = sources.materialIds; capacity = quizFormatMaximum(sources.capacity, input.questionTypes);
        await writeProcessingJobCheckpoint(client, { jobId: job.id, checkpointKey: 'quiz:source:ai-first', payload: json({ regions, materialIds, capacity, matchingCapacityVersion: 1 }) });
    }
    if (!Number.isInteger(capacity)) {
        const refreshed = await assembleQuizSources(client, job.user_id, input);
        capacity = quizFormatMaximum(refreshed.capacity, input.questionTypes);
    }
    if (input.questionCount > capacity) throw new ExperienceFailure(422, 'quiz_source_capacity_exceeded', capacity);
    const complete = await readProcessingJobCheckpoint(client, job.id, 'quiz:complete:ai-first');
    let questions: StoredQuestion[];
    if (complete) questions = record(complete.payload).questions as StoredQuestion[];
    else {
        await updateProcessingJobProgress(client, { jobId: job.id, workerId, stage: 'generating_sections', statusMessage: 'Creating your quiz' });
        try {
            questions = [];
            // Job-wide ceiling: one first call and one repair per batch, at most ten for 100 items.
            const maxCalls = quizProviderCallBudget(input.questionCount);
            const providerFor = (callIdentity?: string) => durableGenerationProvider(client, job.id, workerId, { maxCalls, ...(callIdentity ? { callIdentity } : {}) });
            const batches = quizBatches(input.questionCount);
            let sourceContext: string | null = null;
            for (const [index, { offset, size }] of batches.entries()) {
                const checkpointKey = `quiz:batch:ai-first:${String(offset).padStart(3, '0')}`;
                const savedBatch = await readProcessingJobCheckpoint(client, job.id, checkpointKey);
                let batch = savedBatch ? record(savedBatch.payload).questions as StoredQuestion[] : null;
                if (batch && batch.length !== size) throw new GenerationContractError([`batch_${offset}:count`]);
                if (!batch) {
                    sourceContext ??= await prepareQuizSource(providerFor(), regions);
                    try {
                        const outcome = await generateQuizBatch({ providerFor, request: input, regions, source: sourceContext, offset, size, previous: questions });
                        console.info('quiz_batch.result', { jobId: job.id, batch: index + 1, of: batches.length, calls: outcome.calls, repaired: outcome.repaired, repairedFindings: categories(outcome.repairedFindings) });
                        batch = outcome.questions;
                    }
                    catch (error) {
                        console.info('quiz_batch.failed', { jobId: job.id, batch: index + 1, of: batches.length, repairRan: error instanceof QuizBatchError, findings: error instanceof GenerationContractError ? error.findings.slice(0, 40) : undefined, category: error instanceof GenerationContractError ? 'contract' : 'provider' });
                        throw error;
                    }
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
    if (owned.courseId !== metadata.courseId || owned.reviewerArtifactId !== metadata.reviewerArtifactId || owned.sourceVersionId !== metadata.sourceVersionId || [...owned.materialIds].sort().join('|') !== [...materialIds].sort().join('|'))
        throw new ExperienceFailure(409, 'quiz_source_unavailable');
    await updateProcessingJobProgress(client, { jobId: job.id, workerId, stage: 'storing_result', statusMessage: 'Saving quiz' });
    return { payload: { courseId: metadata.courseId, reviewerArtifactId: metadata.reviewerArtifactId, sourceVersionId: metadata.sourceVersionId, materialIds, title: input.title ?? `${questions.length}-question quiz`, questions,
            provenance: { policy: 'quiz-ai-first', provider: `openai:${AI_FIRST_QUIZ_MODEL}`, sourceSha256: createHash('sha256').update(JSON.stringify(regions)).digest('hex') } }, metrics: { questionCount: questions.length, topicCount: regions.length } };
}
/** Exact stems and highly overlapping long stems are duplicate study items. */
export function hasRepeatedQuizQuestions(questions: readonly (Pick<StoredQuestion, 'prompt'> & Partial<Pick<StoredQuestion, 'type' | 'leftItem'>>)[]): boolean {
    return questions.some((question, index) => isRepeatedQuizQuestion(question, questions.slice(0, index)));
}
export function hasUnbalancedQuizMix(questions: readonly Pick<StoredQuestion, 'type'>[], requestedTypes: readonly StoredQuestion['type'][] | undefined): boolean {
    return quizMixSurplus(questions, requestedTypes) !== null;
}
/** Finding categories without item labels, for logs. */
const categories = (findings: readonly string[]) => [...new Set(findings.map(finding => finding.slice(finding.lastIndexOf(':') + 1)))];
export function quizBatches(count: number): { offset: number; size: number }[] {
    if (!Number.isInteger(count) || count < 5 || count > 100) throw new Error('invalid_quiz_count');
    return Array.from({ length: Math.ceil(count / 20) }, (_, index) => ({ offset: index * 20, size: Math.min(20, count - index * 20) }));
}
export function evaluateAnswer(question: StoredQuestion, answer: QuizAttemptAnswer): QuizQuestionResult {
    return gradeQuestion(question, question, answer.selectedOptionIds);
}
export function normalizeSubmittedAnswer(question: StoredQuestion, selected: readonly string[]): string[] {
    return normalizeSharedAnswer(question, question, selected);
}
export function attemptView(row: AttemptRow, questions: readonly StoredQuestion[]): QuizAttempt {
    const answers = (row.answers as unknown as QuizAttemptAnswer[]).map(a => ({ questionId: a.questionId, selectedOptionIds: [...a.selectedOptionIds], finalizedAt: a.finalizedAt }));
    const state = record(row.study_state);
    const skippedQuestionIds = Array.isArray(state.skipped) ? state.skipped.filter((id): id is string => typeof id === 'string') : [];
    const revealedQuestionIds = Array.isArray(state.revealed) ? state.revealed.filter((id): id is string => typeof id === 'string') : [];
    const assistedQuestionIds = Array.isArray(state.assisted) ? state.assisted.filter((id): id is string => typeof id === 'string') : [];
    const currentQuestion = Number.isInteger(state.currentQuestion) ? Math.max(0, Math.min(questions.length - 1, state.currentQuestion as number)) : 0;
    const visible = questions.filter(q => revealedQuestionIds.includes(q.id) || answers.some(a => a.questionId === q.id && a.finalizedAt !== null));
    return { id: row.id, quizId: row.quiz_id, startedAt: row.started_at, completedAt: row.completed_at, status: row.status as QuizAttempt['status'],
      currentQuestion, skippedQuestionIds, revealedQuestionIds, assistedQuestionIds, updatedAt: row.updated_at ?? row.started_at, answers, feedback: visible.map(q => {
            const a = answers.find(answer => answer.questionId === q.id) ?? { questionId: q.id, selectedOptionIds: [], finalizedAt: null };
            const result = evaluateAnswer(q, a);
            return revealedQuestionIds.includes(q.id) ? { ...result, correct: assistedQuestionIds.includes(q.id) ? false : result.correct, revealed: true, assisted: assistedQuestionIds.includes(q.id) } : result;
        }) };
}
export function resultView(attempt: QuizAttempt, questions: readonly StoredQuestion[]): QuizResult {
    if (attempt.status !== 'completed')
        throw new ExperienceFailure(409, 'quiz_result_unavailable');
    return gradeAttempt(attempt, questions, questions);
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
/** Explicit owner-only projection. Source evidence and provenance stay server-side. */
export async function readQuizAnswerKey(client: Client, userId: string, id: string): Promise<QuizAnswerKey> {
    const { data, error } = await client.from('quizzes').select('id,user_id,generation_id').eq('user_id', userId).eq('id', id).maybeSingle();
    if (error) throw new ExperienceFailure(503, 'unavailable');
    if (!data || data.user_id !== userId) throw new ExperienceFailure(404, 'quiz_not_found');
    const questions = await keys(client, userId, id);
    // A retained legacy quiz may outlive its generation job (ON DELETE SET NULL).
    return { quizId: data.id, versionId: data.generation_id ?? data.id, questions: questions.map(q => ({
        id: q.id, correctOptionIds: [...q.correctOptionIds], explanation: q.explanation,
        ...(q.acceptedAnswers ? { acceptedAnswers: [...q.acceptedAnswers] } : {}),
        topicId: q.topicId, topic: q.topic,
    })) };
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
export async function updateAttemptStudyState(client: Client, userId: string, attemptId: string, value: unknown): Promise<QuizAttempt> {
    const input = record(value);
    if (Object.keys(input).some(key => !['action', 'questionId', 'position'].includes(key)) ||
        !['navigate', 'skip', 'reveal'].includes(String(input.action)) ||
        !Number.isInteger(input.position) || (input.position as number) < 0 || (input.position as number) >= 100 ||
        (input.action !== 'navigate' && (typeof input.questionId !== 'string' || !/^q\d{1,3}$/.test(input.questionId))))
        throw new ExperienceFailure(400, 'quiz_answer_invalid');
    const { data, error } = await client.rpc('update_quiz_attempt_study_state', {
        p_user_id: userId, p_attempt_id: attemptId, p_action: input.action as string,
        p_question_id: input.action === 'navigate' ? '' : input.questionId as string, p_position: input.position as number,
    });
    rpcError(error);
    if (!data?.[0] || data[0].user_id !== userId) throw new ExperienceFailure(404, 'quiz_attempt_not_found');
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
