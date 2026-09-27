import type { Database,Json,ProcessingJobDatabaseRow } from '@stay-focused/db';
import type { GenerationRequest } from '@stay-focused/engine';
import type { QuizGenerationRequest,QuizQuestionType } from '@stay-focused/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach,describe,expect,it,vi } from 'vitest';
import { quizProviderCallBudget } from './ai-first';
import { fixtureRegions,request as baseRequest } from './fixtures';
import { quizQuestionKey,type StoredQuestion } from './generation';
import { processQuizJob } from './service';

const mocks = vi.hoisted(() => ({ resolve: vi.fn(), assemble: vi.fn(), source: vi.fn(), read: vi.fn(), write: vi.fn(), progress: vi.fn(), provider: vi.fn() }));
vi.mock('./sources', async (original) => ({ ...await original<typeof import('./sources')>(), resolveQuizSources: mocks.resolve, assembleQuizSources: mocks.assemble }));
vi.mock('../processing-jobs/repository', () => ({ findProcessingJobSource: mocks.source }));
vi.mock('../processing-jobs/workflow-repository', () => ({ readProcessingJobCheckpoint: mocks.read, writeProcessingJobCheckpoint: mocks.write }));
vi.mock('../processing-jobs/worker-repository', () => ({ updateProcessingJobProgress: mocks.progress }));
vi.mock('../processing-jobs/workflow-dispatch', () => ({ dispatchAcceptedProcessingJob: vi.fn() }));
vi.mock('../processing-jobs/ai-generation', () => ({ durableGenerationProvider: mocks.provider }));

const ALL: QuizQuestionType[] = ['single_select', 'identification', 'true_false', 'modified_true_false', 'matching'];
const regions = fixtureRegions();
// Distinct source words give matching items unique, grounded left-side terms.
const words = [...new Map(regions.flatMap(region => region.text.replace(/[^\p{L} ]/gu, '').split(' ').filter(word => word.length >= 4).map(word => [word.toLowerCase(), { word, region: region.id }] as const))).values()];

type Call = { identity: string | undefined; maxCalls: number | undefined; request: GenerationRequest<unknown> };
type Fault = (item: Record<string, unknown>, position: number) => Record<string, unknown>;
let serial = 0, matchingIndex = 0;
function item(type: QuizQuestionType, id: string): Record<string, unknown> {
    const n = ++serial, region = regions[n % regions.length]!;
    const base = { id, type, prompt: `Item ${n} prompt.`, explanation: region.text, difficulty: 'easy', concept: `Concept ${n}`, sourceRefs: [region.id], leftItem: '', acceptedAnswers: [] as string[], incorrectTerm: '' };
    const tf = [{ id: 'a', text: 'True' }, { id: 'b', text: 'False' }];
    if (type === 'identification') {
        const term = region.text.split(' ').slice(0, 2).join(' ');
        return { ...base, options: [], correctOptionIds: [term], acceptedAnswers: [term] };
    }
    if (type === 'true_false') return { ...base, options: tf, correctOptionIds: ['a'] };
    if (type === 'modified_true_false') {
        const term = region.text.split(' ')[0]!;
        return { ...base, prompt: `Item ${n}: Wrongterm${n} is described here.`, options: tf, correctOptionIds: ['b', term], acceptedAnswers: [term], incorrectTerm: `Wrongterm${n}` };
    }
    const options = [{ id: 'a', text: `Supported ${n}` }, { id: 'b', text: `Other B ${n}` }, { id: 'c', text: `Other C ${n}` }, { id: 'd', text: `Other D ${n}` }];
    if (type === 'matching') {
        const pick = words[matchingIndex++ % words.length]!;
        return { ...base, prompt: 'Match the term to its meaning.', leftItem: pick.word, sourceRefs: [pick.region], options, correctOptionIds: ['a'] };
    }
    return { ...base, options, correctOptionIds: ['a'] };
}
/** A deterministic model: honors the requested count, ID prefix and format rule unless a fault is injected for that call. */
function scriptedModel(faults: Record<string, Fault> = {}, typeOverride?: (position: number, identity: string) => QuizQuestionType | undefined) {
    const calls: Call[] = [];
    let rotation = 0;
    mocks.provider.mockImplementation((_client: unknown, _job: string, _worker: string, options: { maxCalls?: number; callIdentity?: string } = {}) => ({
        async generate<T>(r: GenerationRequest<T>): Promise<T> {
            calls.push({ identity: options.callIdentity, maxCalls: options.maxCalls, request: r as GenerationRequest<unknown> });
            const [, count, prefix] = /exactly (\d+) (?:replacement )?questions with IDs (q|r)1/.exec(r.instructions ?? '')!;
            const only = /Every question must have type "(\w+)"/.exec(r.instructions ?? '')?.[1] as QuizQuestionType | undefined;
            const avoid = /Do not use type "(\w+)"/.exec(r.prompt)?.[1];
            const questions = Array.from({ length: Number(count) }, (_, position) => {
                let type = typeOverride?.(position, options.callIdentity ?? '') ?? only ?? ALL[rotation++ % ALL.length]!;
                while (!only && type === avoid) type = ALL[rotation++ % ALL.length]!;
                const produced = item(type, `${prefix}${position + 1}`);
                const fault = faults[`${options.callIdentity}#${position}`];
                return fault ? fault(produced, position) : produced;
            });
            return { questions } as T;
        },
    }));
    return calls;
}

const job = { id: 'job', user_id: 'owner', job_type: 'quiz_generation' } as ProcessingJobDatabaseRow;
const resolved = { courseId: 'course', reviewerArtifactId: baseRequest.reviewerArtifactId, materialIds: [...baseRequest.sourceIds] };
const checkpoints = new Map<string, Json>();
function useRequest(input: Partial<QuizGenerationRequest>) {
    mocks.source.mockResolvedValue({ user_id: 'owner', metadata: { courseId: 'course', reviewerArtifactId: baseRequest.reviewerArtifactId, quizInput: { ...baseRequest, ...input } } });
}
const run = async () => (await processQuizJob({} as SupabaseClient<Database>, job, 'worker')).payload.questions as StoredQuestion[];
const quizCalls = (calls: Call[]) => calls.filter(call => call.request.schema.name === 'quiz_set');
const bytes = (value: string) => Buffer.byteLength(value);
const unique = (questions: readonly StoredQuestion[]) => new Set(questions.map(quizQuestionKey)).size === questions.length;

beforeEach(() => {
    vi.resetAllMocks();
    checkpoints.clear(); serial = 0; matchingIndex = 0;
    mocks.resolve.mockResolvedValue(resolved);
    mocks.assemble.mockResolvedValue({ ...resolved, regions });
    mocks.read.mockImplementation(async (_client, _job, key: string) => checkpoints.has(key) ? { payload: checkpoints.get(key) } : null);
    mocks.write.mockImplementation(async (_client, value: { checkpointKey: string; payload: Json }) => { checkpoints.set(value.checkpointKey, value.payload); });
});

describe('Quiz batching, budget and repair', () => {
    it('scales the provider budget per batch and caps it at ten', () => {
        expect([5, 20, 21, 30, 41, 50, 81, 100].map(quizProviderCallBudget)).toEqual([2, 2, 4, 4, 6, 6, 10, 10]);
    });
    it.each([[30, 2], [50, 3], [100, 5]])('generates %i items in %i first-attempt batches with one call each', async (count, batches) => {
        useRequest({ questionCount: count, questionTypes: ALL, selectedTopicIds: ['section-1', 'section-2'] });
        const calls = scriptedModel();
        const questions = await run();
        expect(questions).toHaveLength(count);
        expect(questions.map(q => q.id)).toEqual(Array.from({ length: count }, (_, i) => `q${i + 1}`));
        expect(unique(questions)).toBe(true);
        const quiz = quizCalls(calls);
        expect(quiz).toHaveLength(batches);
        expect(quiz.map(call => call.identity)).toEqual(Array.from({ length: batches }, (_, i) => `quiz:batch:${i * 20}:initial`));
        expect(quiz.every(call => call.maxCalls === quizProviderCallBudget(count))).toBe(true);
        // Earlier stems travel in the prompt, so the instruction contract stays within its 8 KB budget.
        expect(quiz.every(call => bytes(call.request.instructions ?? '') + bytes(JSON.stringify(call.request.schema)) < 8000)).toBe(true);
        expect(quiz[batches - 1]!.request.prompt).toContain('EARLIER QUESTIONS');
        expect(checkpoints.has(`quiz:batch:ai-first:${String((batches - 1) * 20).padStart(3, '0')}`)).toBe(true);
    });
    it('repairs only the rejected items of a batch with a distinct repair identity', async () => {
        useRequest({ questionCount: 30, questionTypes: ALL });
        const paraphrase: Fault = produced => ({ ...produced, type: 'identification', options: [], correctOptionIds: ['A paraphrased label'], acceptedAnswers: ['A paraphrased label'] });
        const repeat: Fault = produced => ({ ...produced, type: 'single_select', prompt: 'Item 1 prompt.', options: [{ id: 'a', text: 'W' }, { id: 'b', text: 'X' }, { id: 'c', text: 'Y' }, { id: 'd', text: 'Z' }], correctOptionIds: ['a'], leftItem: '', acceptedAnswers: [], incorrectTerm: '' });
        const calls = scriptedModel({ 'quiz:batch:20:initial#2': paraphrase, 'quiz:batch:20:initial#6': repeat });
        const questions = await run();
        const quiz = quizCalls(calls);
        expect(quiz.map(call => call.identity)).toEqual(['quiz:batch:0:initial', 'quiz:batch:20:initial', 'quiz:batch:20:repair']);
        const repair = quiz[2]!.request;
        expect(repair.instructions).toContain('exactly 2 replacement questions with IDs r1 through r2');
        expect(repair.prompt).toContain('ungrounded_answer');
        expect(repair.prompt).toContain('duplicate_question');
        expect(repair.prompt).not.toBe(quiz[1]!.request.prompt);
        expect(questions).toHaveLength(30);
        expect(unique(questions)).toBe(true);
        // The eighteen valid items of the first call keep their positions.
        expect(questions[20]!.prompt).toBe('Item 21 prompt.');
        expect(questions[22]!.prompt).not.toBe('Item 23 prompt.');
        expect(questions[26]!.prompt).not.toBe('Item 1 prompt.');
    });
    it('fails a batch after its single repair and reports both calls without more attempts', async () => {
        useRequest({ questionCount: 30, questionTypes: ALL });
        const ungrounded: Fault = produced => ({ ...produced, type: 'identification', options: [], correctOptionIds: ['Invented'], acceptedAnswers: ['Invented'] });
        const calls = scriptedModel({ 'quiz:batch:20:initial#0': ungrounded, 'quiz:batch:20:repair#0': ungrounded });
        const log = vi.spyOn(console, 'info').mockImplementation(() => undefined);
        await expect(run()).rejects.toThrow('quiz_generation_failed');
        expect(quizCalls(calls)).toHaveLength(3);
        const failed = log.mock.calls.find(([event]) => event === 'quiz_batch.failed')?.[1] as { batch: number; repairRan: boolean; findings: string[] };
        expect(failed).toMatchObject({ batch: 2, repairRan: true });
        expect(failed.findings).toEqual(expect.arrayContaining(['batch_20:first:q1:ungrounded_answer', 'batch_20:repair:r1:ungrounded_answer']));
        expect(checkpoints.has('quiz:batch:ai-first:000')).toBe(true);
        expect(checkpoints.has('quiz:batch:ai-first:020')).toBe(false);
        log.mockRestore();
    });
    it.each(ALL)('keeps every batch of a single-format %s quiz in that format', async (type) => {
        useRequest({ questionCount: 22, questionTypes: [type] });
        const calls = scriptedModel();
        const questions = await run();
        expect(questions).toHaveLength(22);
        expect(new Set(questions.map(q => q.type))).toEqual(new Set([type]));
        for (const call of quizCalls(calls)) {
            expect(call.request.instructions).toContain(`Every question must have type "${type}"`);
            expect(call.request.prompt).not.toContain('Balance the remaining formats');
        }
    });
    it('rejects and replaces an off-format item in a later single-format batch', async () => {
        useRequest({ questionCount: 30, questionTypes: ['single_select'] });
        const calls = scriptedModel({}, (position, identity) => identity === 'quiz:batch:20:initial' && position === 4 ? 'true_false' : undefined);
        const questions = await run();
        expect(questions.every(q => q.type === 'single_select')).toBe(true);
        expect(quizCalls(calls).at(-1)!.identity).toBe('quiz:batch:20:repair');
        expect(quizCalls(calls).at(-1)!.request.prompt).toContain('question_type');
    });
    it('rebalances only Mixed quizzes when one format dominates a later batch', async () => {
        useRequest({ questionCount: 40, questionTypes: ALL });
        // 12 of the first 20 are multiple choice (at the 60% cap); the second batch returns only multiple choice.
        const calls = scriptedModel({}, (position, identity) => (identity === 'quiz:batch:0:initial' && position < 10) || identity === 'quiz:batch:20:initial' ? 'single_select' : undefined);
        const questions = await run();
        const quiz = quizCalls(calls);
        expect(quiz[1]!.request.prompt).toContain('Balance the remaining formats');
        expect(quiz[2]!.identity).toBe('quiz:batch:20:repair');
        expect(quiz[2]!.request.prompt).toContain('Do not use type "single_select"');
        expect(questions.filter(q => q.type === 'single_select').length).toBeLessThanOrEqual(24);
        expect(unique(questions)).toBe(true);
    });
});
