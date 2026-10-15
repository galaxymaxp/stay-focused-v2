import type { MaterialPreparation } from '@stay-focused/shared';
import type { CanvasMaterialPreparationRow } from '@stay-focused/db';
import type { CanvasReviewerSourceDescriptor } from '@/lib/canvas-reviewer-sources';
import { lookupMaterialPreparation, type MaterialIdentity } from './admission';
import type { PreparationClient } from './repository';

/** Explicit projection: never spread a job, control, provider reason or evidence. */
export function projectPreparationStatus(
  job: Pick<CanvasMaterialPreparationRow, 'state' | 'result_id'> | null,
  control: { readonly suppressed: boolean; readonly automatic_attempts: number } | null,
): MaterialPreparation {
  if (job?.state === 'prepared' && job.result_id) return { status: 'ready', reasonCode: null };
  if (control?.suppressed) return { status: 'failed', reasonCode: 'preparation_paused' };
  if (job?.state === 'pending' || job?.state === 'running') return { status: 'preparing', reasonCode: null };
  if ((control?.automatic_attempts ?? 0) >= 3) return { status: 'failed', reasonCode: 'attempt_limit' };
  if (job?.state === 'failed') return { status: 'failed', reasonCode: 'preparation_failed' };
  if (job?.state === 'cancelled') return { status: 'failed', reasonCode: 'preparation_cancelled' };
  // Includes discovery backlog, deferred admission and a newer unadmitted revision.
  return { status: 'preparing', reasonCode: null };
}

export async function materialClientStatus(client: PreparationClient, identity: MaterialIdentity,
  source: CanvasReviewerSourceDescriptor): Promise<MaterialPreparation> {
  if (source.capability === 'unsupported' || source.file?.kind === 'unsupported') return { status: 'unsupported', reasonCode: null };
  if (source.capability === 'empty') return { status: 'empty', reasonCode: null };
  if (source.capability === 'inaccessible') return { status: 'unavailable', reasonCode: null };
  // lookupMaterialPreparation fences this receipt to CURRENT File/Page evidence.
  const job = await lookupMaterialPreparation(client, identity);
  const control = await client.from('canvas_material_preparation_controls')
    .select('suppressed,automatic_attempts').eq('user_id', identity.userId)
    .eq('course_id', identity.courseId).eq('material_id', identity.materialId).maybeSingle();
  if (control.error) throw new Error('preparation_store_unavailable');
  return projectPreparationStatus(job, control.data);
}
