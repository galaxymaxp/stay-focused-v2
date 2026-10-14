import type { Database, SourcePageSnapshotRow } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthClient } from 'google-auth-library';
import { googleDispatcherClient, googleTaskConfig, type GoogleJobReference } from './processing-jobs/google-cloud';
import { ExperienceFailure } from './experience/errors';

/** Existing durable Google queue, dispatcher federation and private worker IAM. */
export async function enqueueSourcePageSnapshot(reference: GoogleJobReference, dependencies: {
  readonly client?: Pick<AuthClient, 'request'>;
} = {}): Promise<void> {
  const config = googleTaskConfig();
  const client = dependencies.client ?? await googleDispatcherClient();
  try {
    await client.request({
      url: `https://cloudtasks.googleapis.com/v2/${config.parent}/tasks`, method: 'POST',
      data: { task: {
        name: `${config.parent}/tasks/page-snapshot-${reference.jobId}-${reference.dispatchId}`,
        dispatchDeadline: '300s',
        httpRequest: { httpMethod: 'POST', url: `${config.workerUrl}/tasks/page-snapshot`,
          headers: { 'Content-Type': 'application/json' }, body: Buffer.from(JSON.stringify(reference)).toString('base64'),
          oidcToken: { serviceAccountEmail: config.serviceAccountEmail, audience: config.workerUrl } },
      } }, timeout: 15_000, retry: false,
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'response' in error &&
        (error.response as { status?: number } | undefined)?.status === 409) return;
    throw new ExperienceFailure(503, 'unavailable');
  }
}

export async function dispatchSourcePageSnapshot(client: SupabaseClient<Database>, row: SourcePageSnapshotRow,
  dependencies: { readonly enqueue?: typeof enqueueSourcePageSnapshot } = {}): Promise<void> {
  if (row.status !== 'pending' || row.dispatched_at) return;
  await (dependencies.enqueue ?? enqueueSourcePageSnapshot)({ jobId: row.id, dispatchId: row.dispatch_id });
  // A lost write is replayed using the same task name. An uncertain enqueue
  // leaves pending state for the next GET; it never claims background safety.
  const attached = await client.from('source_page_snapshots').update({ dispatched_at: new Date().toISOString() })
    .eq('id', row.id).eq('user_id', row.user_id).eq('dispatch_id', row.dispatch_id).eq('status', 'pending');
  if (attached.error) throw new ExperienceFailure(503, 'unavailable');
}
