import type { CanvasConnectionRow, CanvasCourseRow, CanvasFileRow, CanvasMaterialPreparationRow, CanvasPageRow } from '@stay-focused/db';
import { classifyStoredCanvasFileKind } from '@/lib/canvas-stored-file-extraction';
import { discoverCanvasPageFileIds } from '@/lib/canvas-file-normalize';
import { isInstructionalPageAttachment } from '@/lib/experience/canvas-page-attachments';
import type { PreparationEvidence } from './contracts';
import { revisionFingerprint, sourceDigest, type PreparationClient } from './repository';

export type PreparationReceipt = Pick<CanvasMaterialPreparationRow, 'state' | 'result_id'>;
export interface PreparationProjection {
  readonly job: PreparationReceipt | null;
  readonly control: { readonly suppressed: boolean; readonly automatic_attempts: number } | null;
}

/** Same current-evidence rules as materialEvidence's DB-only read path. */
export function inventoryMaterialEvidence(input: {
  readonly materialId: string; readonly course: CanvasCourseRow; readonly connection: CanvasConnectionRow;
  readonly pages: readonly CanvasPageRow[]; readonly files: readonly CanvasFileRow[]; readonly userId: string;
}): readonly PreparationEvidence[] | null {
  const { course, connection, userId } = input;
  if (course.user_id !== userId || connection.user_id !== userId || course.canvas_connection_id !== connection.id) return null;
  const match = /^(file|page):([a-f0-9-]{36})$/i.exec(input.materialId);
  if (!match) return null;
  const scoped = <T extends { user_id: string; course_id: string; canvas_connection_id: string }>(row: T) => row.user_id === userId && row.course_id === course.id && row.canvas_connection_id === connection.id;
  const files = input.files.filter(scoped);
  let selected: readonly CanvasFileRow[] = [];
  const evidence: PreparationEvidence[] = [];
  if (match[1] === 'file') {
    selected = files.filter(file => file.id === match[2]);
    if (selected.length !== 1 || classifyStoredCanvasFileKind(selected[0]!) === 'unsupported') return null;
  } else {
    const pages = input.pages.filter(page => scoped(page) && page.id === match[2]);
    if (pages.length !== 1) return null;
    const page = pages[0]!;
    evidence.push({ type: 'page', id: page.id, revision: sourceDigest(page.body_html ?? '') });
    if (/\/files\//i.test(page.body_html ?? '')) {
      const ids = discoverCanvasPageFileIds({ canvasBaseUrl: connection.base_url, canvasCourseId: course.canvas_course_id, html: page.body_html });
      if (ids.length > 40 || ids.some(id => files.filter(file => file.canvas_file_id === id).length !== 1)) return null;
      selected = ids.flatMap(id => files.filter(file => file.canvas_file_id === id && isInstructionalPageAttachment(file.display_name, file.ingestion_eligibility)));
    }
    if (selected.length > 7) return null;
  }
  evidence.push(...selected.map(file => ({ type: 'file' as const, id: file.id, revision: file.content_version_fingerprint })));
  return evidence.some(item => !/^[a-f0-9]{64}$/.test(item.revision)) ? null : evidence;
}

/** Complete, stable, owner/course/connection-scoped reads; no capped evidence. */
export async function loadPreparationProjection(client: PreparationClient, input: {
  readonly materialIds: readonly string[]; readonly userId: string; readonly course: CanvasCourseRow; readonly connection: CanvasConnectionRow;
  readonly pages: readonly CanvasPageRow[]; readonly files: readonly CanvasFileRow[];
}): Promise<ReadonlyMap<string, PreparationProjection>> {
  const revisions = new Map(input.materialIds.map(materialId => {
    const evidence = inventoryMaterialEvidence({ ...input, materialId });
    return [materialId, evidence ? revisionFingerprint(evidence) : null] as const;
  }));
  const projected = new Map<string, PreparationProjection>();
  for (const id of input.materialIds) projected.set(id, { job: null, control: null });
  const ids = [...new Set(input.materialIds)];
  // Bound URL size too. A chunk can still have many historical revisions, so
  // every chunk pages to completion and a saturated safety bound rejects it.
  for (let start = 0; start < ids.length; start += 100) {
    const chunk = ids.slice(start, start + 100);
    await Promise.all([
      (async () => {
        for (let offset = 0; offset < 10_000; offset += 200) {
          const result = await client.from('canvas_material_preparations')
            .select('user_id,course_id,canvas_connection_id,material_id,revision_fingerprint,state,result_id')
            .eq('user_id', input.userId).eq('course_id', input.course.id).eq('canvas_connection_id', input.connection.id)
            .in('material_id', chunk).in('revision_fingerprint', chunk.flatMap(id => revisions.get(id) ? [revisions.get(id)!] : []))
            .order('id').range(offset, offset + 199);
          if (result.error || !result.data) throw new Error('preparation_store_unavailable');
          for (const row of result.data) {
            if (row.user_id !== input.userId || row.course_id !== input.course.id || row.canvas_connection_id !== input.connection.id || !chunk.includes(row.material_id)) continue;
            if (row.revision_fingerprint === revisions.get(row.material_id)) {
              const old = projected.get(row.material_id)!;
              if (old.job) throw new Error('preparation_store_unavailable');
              projected.set(row.material_id, { ...old, job: { state: row.state, result_id: row.result_id } });
            }
          }
          if (result.data.length < 200) return;
        }
        throw new Error('preparation_inventory_incomplete');
      })(),
      (async () => {
        for (let offset = 0; offset < 10_000; offset += 200) {
          const result = await client.from('canvas_material_preparation_controls')
            .select('user_id,course_id,material_id,suppressed,automatic_attempts')
            .eq('user_id', input.userId).eq('course_id', input.course.id).in('material_id', chunk).order('id').range(offset, offset + 199);
          if (result.error || !result.data) throw new Error('preparation_store_unavailable');
          for (const row of result.data) {
            if (row.user_id !== input.userId || row.course_id !== input.course.id || !chunk.includes(row.material_id)) continue;
            const old = projected.get(row.material_id)!;
            if (old.control) throw new Error('preparation_store_unavailable');
            projected.set(row.material_id, { ...old, control: { suppressed: row.suppressed, automatic_attempts: row.automatic_attempts } });
          }
          if (result.data.length < 200) return;
        }
        throw new Error('preparation_inventory_incomplete');
      })(),
    ]);
  }
  return projected;
}
