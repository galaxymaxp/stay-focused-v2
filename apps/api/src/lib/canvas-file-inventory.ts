import type { CanvasFilesInventorySnapshotResult, Database, Json } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CanvasSyncFilePayload, CanvasSyncFileReferencePayload } from './canvas-file-normalize';

export async function persistCourseFilesInventory({
  canvasCourseId,
  client,
  connectionId,
  files,
  references,
  runId,
  syncedAt,
  userId,
}: {
  readonly canvasCourseId: string;
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly files: readonly CanvasSyncFilePayload[];
  readonly references: readonly CanvasSyncFileReferencePayload[];
  readonly runId: string;
  readonly syncedAt: string;
  readonly userId: string;
}): Promise<
  | {
      readonly ok: true;
      readonly row: CanvasFilesInventorySnapshotResult;
    }
  | { readonly ok: false }
> {
  const { data, error } = await client
    .rpc("replace_canvas_course_files_inventory", {
      p_canvas_connection_id: connectionId,
      p_canvas_course_id: canvasCourseId,
      p_files: files as unknown as Json,
      p_references: references as unknown as Json,
      p_sync_run_id: runId,
      p_synced_at: syncedAt,
      p_user_id: userId,
    })
    .single();

  if (error || !data) {
    return { ok: false };
  }
  // The existing inventory RPC preserves historical ingestion status when a
  // hash exists. Repair hidden linked rows without rebinding historical bytes.
  const repairIds = files.filter(file =>
    (file.hidden === true || file.hidden_for_user === true) &&
    ['eligible_document', 'eligible_image'].includes(file.ingestion_eligibility),
  ).map(file => file.canvas_file_id);
  for (let offset = 0; offset < repairIds.length; offset += 200) {
    const repair = await client.from('canvas_files').update({
      ingestion_status: 'not_requested', availability_status: 'available',
    }).eq('user_id', userId).eq('canvas_connection_id', connectionId)
      .eq('canvas_course_id', canvasCourseId)
      .in('canvas_file_id', repairIds.slice(offset, offset + 200))
      .in('ingestion_eligibility', ['eligible_document', 'eligible_image'])
      .in('ingestion_status', ['unavailable', 'blocked']);
    if (repair.error) return { ok: false };
  }
  return { ok: true, row: data };
}

