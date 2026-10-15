import type { Database, SourcePageSnapshotRow } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthClient } from 'google-auth-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { dispatchSourcePageSnapshot, enqueueSourcePageSnapshot } from './source-page-snapshot-dispatch';
afterEach(() => vi.unstubAllEnvs());
describe('snapshot durable Google dispatch', () => {
  it('uses the existing queue and IAM with a deterministic task name and tiny reference', async () => {
    for (const [key, value] of Object.entries({ GOOGLE_CLOUD_PROJECT_ID: 'local-project', GOOGLE_GENERATION_REGION: 'asia-northeast1',
      GOOGLE_GENERATION_QUEUE: 'generation', GOOGLE_TASKS_INVOKER_EMAIL: 'invoker@local-project.iam.gserviceaccount.com', GOOGLE_GENERATION_WORKER_URL: 'https://worker.run.app' })) vi.stubEnv(key, value);
    const request = vi.fn(async () => ({}));
    const reference = { jobId: 'job', dispatchId: 'dispatch' };
    await enqueueSourcePageSnapshot(reference, { client: { request } as unknown as Pick<AuthClient, 'request'> });
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ data: { task: expect.objectContaining({
      name: expect.stringContaining('page-snapshot-job-dispatch'), dispatchDeadline: '300s', httpRequest: expect.objectContaining({
        url: 'https://worker.run.app/tasks/page-snapshot', body: Buffer.from(JSON.stringify(reference)).toString('base64'),
        oidcToken: { serviceAccountEmail: 'invoker@local-project.iam.gserviceaccount.com', audience: 'https://worker.run.app' },
      }),
    }) } }));
    request.mockRejectedValue({ response: { status: 409 } });
    await expect(enqueueSourcePageSnapshot(reference, { client: { request } as unknown as Pick<AuthClient, 'request'> })).resolves.toBeUndefined();
  });
  it('awaits acceptance before marking dispatch and leaves ambiguous failures pending', async () => {
    const update = vi.fn(); const query = { eq: () => query, then: (resolve: (value: unknown) => void) => resolve({ error: null }) };
    update.mockReturnValue(query);
    const client = { from: () => ({ update }) } as unknown as SupabaseClient<Database>;
    const row = { id: 'job', dispatch_id: 'dispatch', user_id: 'owner', status: 'pending', dispatched_at: null } as SourcePageSnapshotRow;
    const enqueue = vi.fn(async () => { expect(update).not.toHaveBeenCalled(); });
    await dispatchSourcePageSnapshot(client, row, { enqueue }); expect(update).toHaveBeenCalledTimes(1);
    update.mockClear(); enqueue.mockRejectedValue(new Error('uncertain'));
    await expect(dispatchSourcePageSnapshot(client, row, { enqueue })).rejects.toThrow('uncertain'); expect(update).not.toHaveBeenCalled();
  });
});
