import type { Database,Json,ProcessingJobDatabaseRow } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach,describe,expect,it,vi } from 'vitest';
import { acceptingProvider,fixturePlan,fixtureRegions,request } from './fixtures';
import { processQuizJob,startQuizGeneration } from './service';
const mocks = vi.hoisted(() => ({ resolve: vi.fn(), assemble: vi.fn(), source: vi.fn(), read: vi.fn(), write: vi.fn(), progress: vi.fn(), dispatch: vi.fn(), provider: vi.fn() }));
vi.mock('./sources', async (original) => ({ ...await original<typeof import('./sources')>(), resolveQuizSources: mocks.resolve, assembleQuizSources: mocks.assemble }));
vi.mock('../processing-jobs/repository', () => ({ findProcessingJobSource: mocks.source }));
vi.mock('../processing-jobs/workflow-repository', () => ({ readProcessingJobCheckpoint: mocks.read, writeProcessingJobCheckpoint: mocks.write }));
vi.mock('../processing-jobs/worker-repository', () => ({ updateProcessingJobProgress: mocks.progress }));
vi.mock('../processing-jobs/workflow-dispatch', () => ({ dispatchAcceptedProcessingJob: mocks.dispatch }));
vi.mock('../processing-jobs/ai-generation', () => ({ durableGenerationProvider: mocks.provider }));

const job = { id: 'job', user_id: 'owner', job_type: 'quiz_generation' } as ProcessingJobDatabaseRow;
const resolved = { courseId: 'course', reviewerArtifactId: request.reviewerArtifactId, materialIds: [...request.sourceIds] };
const checkpoints = new Map<string, Json>();
beforeEach(() => {
    vi.resetAllMocks();
    checkpoints.clear();
    mocks.resolve.mockResolvedValue(resolved);
    mocks.assemble.mockResolvedValue({ ...resolved, regions: fixtureRegions() });
    mocks.source.mockResolvedValue({ user_id: 'owner', metadata: { courseId: 'course', reviewerArtifactId: request.reviewerArtifactId, quizInput: request } });
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
        expect(rpc).toHaveBeenCalledWith('create_quiz_processing_job', expect.objectContaining({ p_user_id: 'owner', p_course_id: 'course', p_reviewer_artifact_id: request.reviewerArtifactId }));
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
        expect(checkpoints.has('quiz:source:ai-first')).toBe(true);
        expect(checkpoints.has('quiz:complete:ai-first')).toBe(true);
        const second = await processQuizJob(client, job, 'worker');
        expect(second.payload).toEqual(first.payload);
        expect(provider.calls).toHaveLength(1);
        expect(mocks.assemble).toHaveBeenCalledTimes(1);
    });
    it('ignores legacy partial-question checkpoints and creates one complete set', async () => {
        checkpoints.set('quiz:accepted:v4', {questions:[]} as Json);
        const provider = acceptingProvider(fixturePlan()); mocks.provider.mockReturnValue(provider);
        const output = await processQuizJob({} as SupabaseClient<Database>, job, 'worker');
        expect(output.payload.questions).toHaveLength(5); expect(provider.calls).toHaveLength(1);
        expect(mocks.assemble).toHaveBeenCalledTimes(1);
    });
    it('rechecks ownership before finalizing even on a complete checkpoint', async () => {
        await processQuizJob({} as SupabaseClient<Database>, job, 'worker');
        mocks.resolve.mockRejectedValue(new Error('quiz_source_unavailable'));
        await expect(processQuizJob({} as SupabaseClient<Database>, job, 'worker')).rejects.toThrow('quiz_source_unavailable');
    });
    it('provider failure leaves no final payload and retains the frozen source', async () => {
        mocks.provider.mockReturnValue({ generate: vi.fn().mockRejectedValue(new Error('private provider detail')) });
        await expect(processQuizJob({} as SupabaseClient<Database>, job, 'worker')).rejects.toThrow('quiz_generation_failed');
        expect(checkpoints.has('quiz:source:ai-first')).toBe(true);
        expect(checkpoints.has('quiz:complete:ai-first')).toBe(false);
    });
});
