import { createHash, randomUUID } from 'node:crypto';
import type { Database, SourcePageSnapshotRow } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { record } from './experience/mappers';
import { createProcessingJobServiceClient } from './processing-jobs/repository';
import type { GoogleJobReference } from './processing-jobs/google-cloud';
import { isAcceptedLocalSnapshotPdf, resolveSnapshotPdfObject } from './snapshot-pdf-object';
import { SNAPSHOT_BUCKET } from './source-page-snapshots';
import { renderSourcePdfPage } from './source-page-snapshot-render';

export async function executeSourcePageSnapshot(reference: GoogleJobReference, dependencies: {
  readonly client?: SupabaseClient<Database>;
  readonly resolve?: typeof resolveSnapshotPdfObject;
  readonly render?: typeof renderSourcePdfPage;
} = {}): Promise<'ack' | 'retry'> {
  const client = dependencies.client ?? createProcessingJobServiceClient();
  const token = randomUUID();
  const claimed = await client.rpc('claim_source_page_snapshot_v1', {
    p_id: reference.jobId, p_dispatch_id: reference.dispatchId, p_lease_token: token,
  });
  if (claimed.error) return 'retry';
  const row = claimed.data?.[0];
  if (!row || row.status !== 'pending') return 'ack';
  if (row.lease_token !== token) return 'retry';
  let rendered: Awaited<ReturnType<typeof renderSourcePdfPage>>;
  let storagePath: string;
  try {
    const source = await client.from('source_versions').select('id,user_id,revision_kind,metadata')
      .eq('id', row.source_version_id).eq('user_id', row.user_id).maybeSingle();
    const local = row.source_snapshot_id === null && row.source_snapshot_item_id === null;
    if (source.error || !source.data || source.data.user_id !== row.user_id || (local
      ? !isAcceptedLocalSnapshotPdf(source.data)
      : !row.source_snapshot_item_id || source.data.revision_kind === 'user_edited' ||
        record(source.data.metadata).reviewerSourceSnapshotId !== row.source_snapshot_id)) throw new Error('snapshot_source_invalid');
    const locatorInput = local ? { userId: row.user_id, sourceVersionId: row.source_version_id }
      : { userId: row.user_id, snapshotItemId: row.source_snapshot_item_id! };
    const original = await (dependencies.resolve ?? resolveSnapshotPdfObject)(client, locatorInput);
    if (!original.available) return finishFailure(client, row, token, 'source_revision_unavailable');
    const downloaded = await client.storage.from(original.bucket).download(original.key);
    if (downloaded.error || !downloaded.data) return finishFailure(client, row, token, 'source_revision_unavailable');
    if (downloaded.data.size > 20 * 1024 * 1024) throw new Error('snapshot_source_invalid');
    const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
    const expectedHash = original.contentSha256 ?? (local ? undefined : original.key.split('/').at(-1));
    if ((original.byteSize !== undefined && bytes.byteLength !== original.byteSize) ||
        (expectedHash !== undefined && createHash('sha256').update(bytes).digest('hex') !== expectedHash))
      return finishFailure(client, row, token, 'source_revision_unavailable');
    rendered = await (dependencies.render ?? renderSourcePdfPage)(bytes, row.page_number);
    // Respect deletion that wins during rendering; never publish its page image.
    if (local && !(await (dependencies.resolve ?? resolveSnapshotPdfObject)(client, locatorInput)).available)
      return finishFailure(client, row, token, 'source_revision_unavailable');
    storagePath = `${row.id}/${token}.png`;
    const uploaded = await client.storage.from(SNAPSHOT_BUCKET).upload(storagePath, rendered.png, {
      contentType: 'image/png', cacheControl: '600', upsert: false,
    });
    if (uploaded.error) throw new Error('snapshot_upload_failed');
  } catch {
    // Never log content, original paths or raw parser/provider errors.
    return finishFailure(client, row, token, 'render_failed');
  }
  const finished = await client.rpc('finish_source_page_snapshot_v1', {
    p_id: row.id, p_lease_token: token, p_storage_path: storagePath,
    p_width: rendered.width, p_height: rendered.height, p_error_code: null,
  });
  if (finished.error) return 'retry'; // Ambiguous commit: do not remove possibly referenced bytes.
  if (!finished.data) {
    // Stale lease cannot publish. Only this attempt's unreferenced image is removed.
    await client.storage.from(SNAPSHOT_BUCKET).remove([storagePath]);
  }
  return finished.data ? 'ack' : 'retry';
}

async function finishFailure(client: SupabaseClient<Database>, row: SourcePageSnapshotRow, token: string,
  code: 'render_failed' | 'source_revision_unavailable'): Promise<'ack' | 'retry'> {
  const result = await client.rpc('finish_source_page_snapshot_v1', {
    p_id: row.id, p_lease_token: token, p_storage_path: null, p_width: null, p_height: null, p_error_code: code,
  });
  return !result.error && result.data ? 'ack' : 'retry';
}
