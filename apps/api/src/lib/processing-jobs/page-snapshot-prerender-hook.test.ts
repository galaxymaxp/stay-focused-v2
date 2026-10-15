import type { ProcessingJobDatabaseRow } from '@stay-focused/db';
import { describe, expect, it, vi } from 'vitest';
import { completeProcessingJob } from './worker-repository';

function harness(admission: 'manual' | 'automatic' = 'manual') {
  const completed = { id: `${admission}-job`, user_id: 'owner', source_version_id: 'accepted-source',
    job_type: 'reviewer_generation', status: 'succeeded',
    idempotency_key: admission === 'automatic' ? 'auto-reviewer:exact-revision' : 'manual-request',
  } as unknown as ProcessingJobDatabaseRow;
  let committed = false;
  const receipt = { user_id: 'owner', source_version_id: 'accepted-source', artifact_id: 'artifact' };
  const rpc = vi.fn(async () => { committed = true; return { data: [completed], error: null }; });
  const eq = vi.fn();
  const from = vi.fn(() => {
    expect(committed).toBe(true);
    const query = { select: () => query, eq, maybeSingle: async () => ({ data: receipt, error: null }) };
    eq.mockReturnValue(query); return query;
  });
  const client = { rpc, from } as never;
  const prerender = vi.fn(async () => { expect(committed).toBe(true); });
  const visuals = vi.fn(async () => ({ found: 0, none: 0, skipped: 0, failed: 0 }));
  const input = { jobId: completed.id, workerId: 'worker', resultType: 'reviewer_generation' as const,
    payload: { reviewer: { title: 'Private title' } }, metrics: {} };
  return { client, input, completed, rpc, from, eq, prerender, visuals, receipt };
}
describe('shared manual/automatic Reviewer publication hook', () => {
  it.each(['manual', 'automatic'] as const)('%s generation invokes pre-render once after the completion transaction', async admission => {
    const h = harness(admission);
    await expect(completeProcessingJob(h.client, h.input, h)).resolves.toBe(h.completed);
    expect(h.rpc).toHaveBeenCalledExactlyOnceWith('complete_processing_job_v2', expect.objectContaining({ p_job_id: h.completed.id }));
    expect(h.from).toHaveBeenCalledExactlyOnceWith('generated_artifact_versions');
    expect(h.eq).toHaveBeenCalledWith('generation_job_id', h.completed.id);
    expect(h.eq).toHaveBeenCalledWith('user_id', 'owner');
    expect(h.prerender).toHaveBeenCalledExactlyOnceWith(h.client, { userId: 'owner', artifactId: 'artifact' });
    expect(h.visuals).toHaveBeenCalledExactlyOnceWith(h.client, { userId: 'owner', artifactId: 'artifact' });
  });
  it.each(['manual', 'automatic'] as const)('keeps %s generation succeeded if pre-render unexpectedly throws', async admission => {
    const h = harness(admission); h.prerender.mockRejectedValueOnce(new Error('Private source text/path/provider error'));
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(completeProcessingJob(h.client, h.input, h)).resolves.toBe(h.completed);
    expect(log).toHaveBeenCalledExactlyOnceWith('source_page_snapshot.prerender', { code: 'post_commit_failed', failureCount: 1 });
  });
  it('does not invoke pre-render before completion acceptance or after a rejected completion', async () => {
    const h = harness();
    h.rpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(completeProcessingJob(h.client, h.input, h)).rejects.toMatchObject({ code: 'processing_job_completion_rejected' });
    expect(h.prerender).not.toHaveBeenCalled(); expect(h.from).not.toHaveBeenCalled();
  });
  it.each(['cancelled', 'failed'] as const)('does not publish any snapshots for a %s job', async status => {
    const h = harness(); const stopped = { ...h.completed, status };
    h.rpc.mockResolvedValueOnce({ data: [stopped], error: null });
    await expect(completeProcessingJob(h.client, h.input, h)).resolves.toBe(stopped);
    expect(h.prerender).not.toHaveBeenCalled(); expect(h.from).not.toHaveBeenCalled();
  });
  it.each(['activity_generation', 'quiz_generation', 'document_extraction'] as const)('does not run for %s', async resultType => {
    const h = harness();
    await completeProcessingJob(h.client, { ...h.input, resultType }, h);
    expect(h.prerender).not.toHaveBeenCalled(); expect(h.from).not.toHaveBeenCalled();
  });
  it('denies a mismatched committed source receipt without changing generation success', async () => {
    const h = harness(); h.receipt.source_version_id = 'another-source';
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(completeProcessingJob(h.client, h.input, h)).resolves.toBe(h.completed);
    expect(h.prerender).not.toHaveBeenCalled();
  });
});
