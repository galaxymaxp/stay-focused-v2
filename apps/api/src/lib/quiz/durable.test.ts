import { beforeEach, describe, it, expect, vi } from 'vitest';
import type { Database, Json, ProcessingJobDatabaseRow } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
const mocks = vi.hoisted(() => ({ resolve: vi.fn(), assemble: vi.fn(), source: vi.fn(), read: vi.fn(), write: vi.fn(), progress: vi.fn(), dispatch: vi.fn(), provider: vi.fn() }));
vi.mock('./sources', async (original) => ({ ...await original<typeof import('./sources')>(), resolveQuizSources: mocks.resolve, assembleQuizSources: mocks.assemble }));
vi.mock('../processing-jobs/repository', () => ({ findProcessingJobSource: mocks.source }));
vi.mock('../processing-jobs/workflow-repository', () => ({ readProcessingJobCheckpoint: mocks.read, writeProcessingJobCheckpoint: mocks.write }));
vi.mock('../processing-jobs/worker-repository', () => ({ updateProcessingJobProgress: mocks.progress }));
vi.mock('../processing-jobs/workflow-dispatch', () => ({ dispatchAcceptedProcessingJob: mocks.dispatch }));
vi.mock('@/providers', () => ({ createServerOpenAIProvider: mocks.provider }));
import { processQuizJob, startQuizGeneration } from './service';
import { acceptingProvider, candidate, fixturePlan, fixtureRegions, request } from './fixtures';
import { validateCandidate } from './generation';
const job = { id: 'job', user_id: 'owner', job_type: 'quiz_generation' } as ProcessingJobDatabaseRow;
const resolved = { courseId: 'course', reviewerId: null, materialIds: [...request.sourceIds] };
const checkpoints = new Map<string, Json>();
beforeEach(() => {
    vi.resetAllMocks();
    checkpoints.clear();
    mocks.resolve.mockResolvedValue(resolved);
    mocks.assemble.mockResolvedValue({ ...resolved, regions: fixtureRegions() });
    mocks.source.mockResolvedValue({ user_id: 'owner', metadata: { courseId: 'course', reviewerId: null, quizInput: request } });
    mocks.read.mockImplementation(async (_client, _job, key: string) => checkpoints.has(key) ? { payload: checkpoints.get(key) } : null);
    mocks.write.mockImplementation(async (_client, value: {
        checkpointKey: string;
        payload: Json;
    }) => { checkpoints.set(value.checkpointKey, value.payload); });
    mocks.provider.mockReturnValue(acceptingProvider(fixturePlan()));
});
describe('Quiz existing durable job integration', () => {
    it('admits server-derived identity and dispatches only the persisted job', async () => {
        const rpc = vi.fn().mockResolvedValue({ data: [job], error: null }), client = { rpc } as unknown as SupabaseClient<Database>;
        mocks.dispatch.mockResolvedValue(job);
        expect(await startQuizGeneration(client, 'owner', request, 'request-key')).toBe(job);
        expect(rpc).toHaveBeenCalledWith('create_quiz_processing_job', expect.objectContaining({ p_user_id: 'owner', p_course_id: 'course', p_reviewer_id: null }));
        expect(mocks.dispatch).toHaveBeenCalledWith(job);
        expect(mocks.provider).not.toHaveBeenCalled();
    });
    it('rejects mismatched returned owner before dispatch', async () => {
        const client = { rpc: vi.fn().mockResolvedValue({ data: [{ ...job, user_id: 'foreign' }], error: null }) } as unknown as SupabaseClient<Database>;
        await expect(startQuizGeneration(client, 'owner', request, 'request-key')).rejects.toThrow('quiz_generation_unavailable');
        expect(mocks.dispatch).not.toHaveBeenCalled();
    });
    it('checkpoints source plan and verified questions, and resumes without provider calls', async () => {
        const client = {} as SupabaseClient<Database>, provider = acceptingProvider(fixturePlan());
        mocks.provider.mockReturnValue(provider);
        const first = await processQuizJob(client, job, 'worker');
        expect(first.payload.questions).toHaveLength(5);
        expect(checkpoints.has('quiz:plan:v2')).toBe(true);
        expect(checkpoints.has('quiz:accepted:v2')).toBe(true);
        const second = await processQuizJob(client, job, 'worker');
        expect(second.payload).toEqual(first.payload);
        expect(provider.calls).toHaveLength(2);
        expect(mocks.assemble).toHaveBeenCalledTimes(1);
    });
    it('resumes only missing slots after interrupted work', async () => {
        const plan = fixturePlan(), accepted = plan.allocation.slice(0, 3).map(s => validateCandidate(candidate(plan, s.id), plan));
        checkpoints.set('quiz:plan:v2', JSON.parse(JSON.stringify({ plan, materialIds: request.sourceIds })) as Json);
        checkpoints.set('quiz:accepted:v2', JSON.parse(JSON.stringify({ questions: accepted })) as Json);
        const provider = acceptingProvider(plan);
        mocks.provider.mockReturnValue(provider);
        await processQuizJob({} as SupabaseClient<Database>, job, 'worker');
        const input = JSON.parse(provider.calls[0]!.slice(provider.calls[0]!.lastIndexOf('\n') + 1)) as {
            pending: {
                id: string;
            }[];
        };
        expect(input.pending.map(s => s.id)).toEqual(['q4', 'q5']);
        expect(mocks.assemble).not.toHaveBeenCalled();
    });
    it('rechecks ownership before finalizing even on a complete checkpoint', async () => {
        await processQuizJob({} as SupabaseClient<Database>, job, 'worker');
        mocks.resolve.mockRejectedValue(new Error('quiz_source_unavailable'));
        await expect(processQuizJob({} as SupabaseClient<Database>, job, 'worker')).rejects.toThrow('quiz_source_unavailable');
    });
    it('provider failure leaves no final payload and retains the frozen source', async () => {
        mocks.provider.mockReturnValue({ generate: vi.fn().mockRejectedValue(new Error('private provider detail')) });
        await expect(processQuizJob({} as SupabaseClient<Database>, job, 'worker')).rejects.toThrow('quiz_generation_failed');
        expect(checkpoints.has('quiz:plan:v2')).toBe(true);
        expect(checkpoints.has('quiz:accepted:v2')).toBe(false);
    });
});
