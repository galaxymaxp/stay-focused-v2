import type { Database, SourcePageSnapshotRow } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readCanonicalReviewerRecord } from './canonical-reviewers';
import { record } from './experience/mappers';
import { resolveSnapshotPdfObject } from './snapshot-pdf-object';
import { dispatchSourcePageSnapshot } from './source-page-snapshot-dispatch';
import { eligibleSnapshotPdf, lowestSectionPage } from './source-page-snapshots';

/** Best effort after durable Reviewer publication. Only fixed codes/counts are logged. */
export async function prerenderSourcePageSnapshots(client: SupabaseClient<Database>, input: {
  userId: string; artifactId: string;
}, dependencies: {
  readonly read?: typeof readCanonicalReviewerRecord;
  readonly resolve?: typeof resolveSnapshotPdfObject;
  readonly dispatch?: typeof dispatchSourcePageSnapshot;
  readonly log?: (event: string, fields: { code: string; pageCount: number; failureCount: number }) => void;
} = {}): Promise<void> {
  const log = dependencies.log ?? ((event, fields) => console.warn(event, fields));
  let pageCount = 0;
  try {
    const saved = await (dependencies.read ?? readCanonicalReviewerRecord)(client, input.userId, input.artifactId);
    if (!saved.ok) throw new Error('canonical_read_failed');
    if (!saved.value || saved.value.artifact.user_id !== input.userId || saved.value.version.user_id !== input.userId ||
        saved.value.source.user_id !== input.userId || saved.value.artifact.deleted_at !== null) return;
    const pdf = await eligibleSnapshotPdf(client, saved.value, input.userId);
    if (!pdf) return;
    const payload = record(saved.value.version.payload);
    const reviewer = record(payload.reviewer ?? payload);
    const pages = new Set<number>();
    for (const section of Array.isArray(reviewer.sections) ? reviewer.sections : []) {
      const id = record(section).id;
      if (typeof id !== 'string') continue;
      const page = lowestSectionPage(saved.value, id);
      if (page !== null && (pdf.local || (pdf.pageCount !== null && page <= pdf.pageCount))) pages.add(page);
      if (pages.size === 100) break;
    }
    pageCount = pages.size;
    if (!pageCount) return;
    // Resolve original identity/existence once, even when all images are cached.
    const original = await (dependencies.resolve ?? resolveSnapshotPdfObject)(client, pdf.local
      ? { userId: input.userId, sourceVersionId: saved.value.source.id }
      : { userId: input.userId, snapshotItemId: pdf.itemId! });
    if (!original.available) {
      log('source_page_snapshot.prerender', { code: 'source_revision_unavailable', pageCount, failureCount: pageCount });
      return;
    }
    let reservationFailures = 0;
    let dispatchFailures = 0;
    // Serial dispatch bounds provider concurrency. A failed page does not prevent later pages.
    for (const page of pages) {
      let row: SourcePageSnapshotRow | undefined;
      try {
        const result = await client.rpc('reserve_source_page_snapshot_system_v1', {
          p_user_id: input.userId, p_source_version_id: saved.value.source.id,
          p_snapshot_item_id: pdf.itemId, p_page_number: page,
        });
        row = result.data?.[0];
        if (result.error || !row || row.user_id !== input.userId || row.source_version_id !== saved.value.source.id ||
            row.source_snapshot_item_id !== pdf.itemId || row.page_number !== page) throw new Error('reservation_failed');
      } catch {
        reservationFailures++;
        continue;
      }
      if (row.status !== 'pending' || row.dispatched_at || row.lease_token || row.lease_expires_at) continue;
      try { await (dependencies.dispatch ?? dispatchSourcePageSnapshot)(client, row); }
      catch { dispatchFailures++; }
    }
    if (reservationFailures) log('source_page_snapshot.prerender', { code: 'reservation_failed', pageCount, failureCount: reservationFailures });
    if (dispatchFailures) log('source_page_snapshot.prerender', { code: 'dispatch_failed', pageCount, failureCount: dispatchFailures });
  } catch {
    log('source_page_snapshot.prerender', { code: 'prerender_failed', pageCount, failureCount: 1 });
  }
}
