import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProcessingJobDatabaseRow } from '@stay-focused/db';
import type { ProcessingJobServiceClient } from './repository';
import { processAIReviewerJob } from './ai-reviewer';
const mocks = vi.hoisted(() => ({ run: vi.fn(), source: vi.fn(), read: vi.fn(), write: vi.fn(), progress: vi.fn(), budget: vi.fn(), provider: vi.fn() }));
vi.mock('@stay-focused/engine', async importOriginal => ({ ...await importOriginal<typeof import('@stay-focused/engine')>(), runAIReviewer: mocks.run, reviewerProviderCallBudget: mocks.budget }));
vi.mock('./ai-generation', () => ({ durableGenerationProvider: mocks.provider }));
vi.mock('./repository', () => ({ findProcessingJobSource: mocks.source }));
vi.mock('./workflow-repository', () => ({ readProcessingJobCheckpoint: mocks.read, writeProcessingJobCheckpoint: mocks.write }));
vi.mock('./worker-repository', () => ({ updateProcessingJobProgress: mocks.progress }));
const client = {} as ProcessingJobServiceClient;
const job = { id: 'job', user_id: 'owner' } as ProcessingJobDatabaseRow;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.source.mockResolvedValue({ id: 'source', user_id: 'owner', source_text: 'Synthetic source.', metadata: {} });
  mocks.budget.mockResolvedValue(10);
  mocks.read.mockImplementation(async (_client, _job, key) => key === 'ai-first:calls:reviewer_document' ? { payload: { count: 5 } } : null);
  mocks.run.mockResolvedValue({ id: 'reviewer', sections: [{ id: 'section-1' }], metadata: { generationStatus: 'complete', generationMetrics: { providerRequestCount: 4 } } });
});
describe('reviewer job split metrics and persistence', () => {
  it('uses durable reservations for cost counts and persists the full result before return', async () => {
    const result = await processAIReviewerJob(client, job, 'worker');
    expect(mocks.provider).toHaveBeenCalledWith(client, 'job', 'worker', { maxCalls: 10 });
    expect(result.metrics.providerCallCount).toBe(5);
    expect(result.payload.reviewer.metadata.generationMetrics?.providerRequestCount).toBe(5);
    expect(mocks.write).toHaveBeenCalledWith(client, expect.objectContaining({ checkpointKey: 'reviewer:ai-first:complete', payload: result }));
  });
  it('resumes a finished result without a provider, progress update or another reservation', async () => {
    const saved = { payload: { reviewer: { sections: [] } }, metrics: { providerCallCount: 5 } };
    mocks.read.mockResolvedValue({ payload: saved });
    expect(await processAIReviewerJob(client, job, 'worker')).toBe(saved);
    expect(mocks.run).not.toHaveBeenCalled(); expect(mocks.provider).not.toHaveBeenCalled(); expect(mocks.write).not.toHaveBeenCalled();
  });
  it('never returns success if the result checkpoint cannot be persisted', async () => {
    mocks.write.mockRejectedValue(new Error('storage_unavailable'));
    await expect(processAIReviewerJob(client, job, 'worker')).rejects.toThrow('storage_unavailable');
  });
});
