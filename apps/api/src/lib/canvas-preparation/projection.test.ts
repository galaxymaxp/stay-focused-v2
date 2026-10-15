import { describe, expect, it } from 'vitest';
import type { CanvasConnectionRow, CanvasCourseRow, CanvasFileRow, CanvasPageRow } from '@stay-focused/db';
import { inventoryMaterialEvidence, loadPreparationProjection } from './projection';
import { materialEvidence } from './admission';
import { materialStatusFromProjection } from './client-status';
import { revisionFingerprint, sourceDigest, type PreparationClient } from './repository';
import { listCanvasReviewerSources, type CanvasReviewerSourceDescriptor } from '../canvas-reviewer-sources';

type Row = Record<string, unknown>;
const uuid = (n: number) => `11111111-1111-4111-8111-${n.toString().padStart(12,'0')}`;
const owner = uuid(1), course = { id: uuid(2), user_id: owner, canvas_connection_id: uuid(3), canvas_course_id: '10', name: 'Course', workflow_state: 'available' } as CanvasCourseRow;
const connection = { id: uuid(3), user_id: owner, base_url: 'https://canvas.example.invalid', status: 'active' } as CanvasConnectionRow;
const file = (n: number) => ({ id: uuid(100+n), user_id: owner, course_id: course.id, canvas_connection_id: connection.id, canvas_file_id: String(n),
  filename: `Lesson ${n}.pdf`, display_name: `Lesson ${n}.pdf`, content_type: 'application/pdf', content_version_fingerprint: sourceDigest(String(n)),
  ingestion_status: 'not_requested', ingestion_eligibility: 'eligible_document', availability_status: 'available' } as CanvasFileRow);
const page = { id: uuid(4), user_id: owner, course_id: course.id, canvas_connection_id: connection.id, body_html: '<p>Lesson body</p>' } as CanvasPageRow;
const scope = { userId: owner, course, connection, pages: [page], files: [file(1)] };

function fixture(tables: Record<string, readonly Row[]>, saturated = false) {
  const reads: { table: string; order: string[]; from: number; to: number }[] = [];
  let bytes = 0;
  const client = { from(table: string) {
    const filters: ((row: Row) => boolean)[] = [], order: string[] = [];
    let from = 0, to = Infinity, columns = '*';
    const run = () => {
      let rows = (tables[table] ?? []).filter(row => filters.every(test => test(row)));
      rows = [...rows].sort((a,b) => String(a.id).localeCompare(String(b.id))).slice(from,to+1);
      if (saturated && table === 'canvas_material_preparations') rows = Array.from({ length: 200 }, () => ({ user_id: owner, course_id: course.id, canvas_connection_id: connection.id, material_id: `file:${file(1).id}`, revision_fingerprint: 'stale' }));
      reads.push({ table, order, from, to });
      const data = rows.map(row => columns === '*' ? row : Object.fromEntries(columns.split(',').map(key => [key,row[key]])));
      bytes += Buffer.byteLength(JSON.stringify(data)); return { data, error: null };
    };
    const q = { select: (value: string) => { columns = value; return q; },
      eq: (key: string, value: unknown) => { filters.push(row => row[key] === value); return q; },
      neq: (key: string, value: unknown) => { filters.push(row => row[key] !== value); return q; },
      in: (key: string, values: unknown[]) => { filters.push(row => values.includes(row[key])); return q; },
      order: (key: string) => { order.push(key); return q; }, limit: (n: number) => { to = n-1; return q; },
      range: (start: number,end: number) => { from = start; to = end; return q; },
      maybeSingle: async () => { const result = run(); return { ...result, data: result.data[0] ?? null }; },
      then: <T>(fn: (result: ReturnType<typeof run>) => T) => Promise.resolve(run()).then(fn),
    }; return q;
  } } as unknown as PreparationClient;
  return { client, reads, get bytes() { return bytes; } };
}
describe('SP2 batched preparation projection', () => {
  it('reuses current evidence and matches the single-material rules for pages/files/attachments', async () => {
    for (const html of ['<p>Lesson</p>', '<a href="https://canvas.example.invalid/courses/10/files/1">Lesson PDF</a>']) {
      const current = { ...page, body_html: html };
      const input = { ...scope, pages: [current] };
      const { client } = fixture({ canvas_courses: [course], canvas_connections: [connection], canvas_files: [file(1)], canvas_pages: [current] });
      for (const materialId of [`file:${file(1).id}`,`page:${page.id}`]) {
        expect(inventoryMaterialEvidence({ ...input, materialId })).toEqual((await materialEvidence(client, { userId: owner, courseId: course.id, materialId })).evidence);
      }
    }
  });
  it('projects 100 candidates and 100 visible statuses in two reads, without body bytes', async () => {
    const files = Array.from({length:100},(_,n)=>file(n));
    const { client, reads } = fixture({});
    const projection = await loadPreparationProjection(client, { ...scope, files, materialIds: files.map(f=>`file:${f.id}`) });
    for (const [id,value] of projection) {
      expect(materialStatusFromProjection({ id, capability: 'needs_preparation', file: { kind: 'pdf' } } as CanvasReviewerSourceDescriptor, value)).toEqual({status:'preparing',reasonCode:null});
    }
    expect(projection.size).toBe(100); expect(reads).toHaveLength(2);
    expect(reads.every(read => read.order.join() === 'id')).toBe(true);
  });
  it('rejects stale revisions, foreign owners/connections and missing/duplicate attachment evidence', async () => {
    const materialId = `file:${file(1).id}`;
    const rows = [
      { id: uuid(900),user_id:owner,course_id:course.id,canvas_connection_id:connection.id,material_id:materialId,revision_fingerprint:'old',state:'prepared',result_id:'old' },
      { id: uuid(901),user_id:'other',course_id:course.id,canvas_connection_id:connection.id,material_id:materialId,revision_fingerprint:revisionFingerprint([{type:'file',id:file(1).id,revision:file(1).content_version_fingerprint}]),state:'prepared',result_id:'foreign' },
    ];
    const { client } = fixture({ canvas_material_preparations: rows });
    const projection = await loadPreparationProjection(client, { ...scope, materialIds: [materialId] });
    expect(projection.get(materialId)?.job).toBeNull();
    const linkedPage = { ...page, body_html: '<a href="https://canvas.example.invalid/courses/10/files/1">File</a>' };
    expect(inventoryMaterialEvidence({ ...scope,pages:[linkedPage],files:[],materialId:`page:${page.id}` })).toBeNull();
    expect(inventoryMaterialEvidence({ ...scope,pages:[linkedPage],files:[file(1),file(1)],materialId:`page:${page.id}` })).toBeNull();
    expect(inventoryMaterialEvidence({ ...scope,connection:{...connection,id:'other'},materialId })).toBeNull();
  });
  it('pages stable chunks completely beyond one page and fails closed at the safety bound', async () => {
    const files = Array.from({length:201},(_,n)=>file(n));
    const rows = files.map((f,n) => ({ id:uuid(1000+n),user_id:owner,course_id:course.id,canvas_connection_id:connection.id,material_id:`file:${f.id}`,
      revision_fingerprint:revisionFingerprint([{type:'file',id:f.id,revision:f.content_version_fingerprint}]),state:'prepared',result_id:uuid(2000+n) }));
    const normal = fixture({ canvas_material_preparations: rows });
    const result = await loadPreparationProjection(normal.client, { ...scope, files,materialIds:files.map(f=>`file:${f.id}`) });
    expect([...result.values()].filter(value => value.job?.state === 'prepared')).toHaveLength(201);
    expect(normal.reads).toHaveLength(6); expect(normal.reads.every(read => read.order.join() === 'id')).toBe(true);
    const capped = fixture({},true);
    await expect(loadPreparationProjection(capped.client,{...scope,materialIds:[`file:${file(1).id}`]})).rejects.toThrow('preparation_inventory_incomplete');
    expect(capped.reads.filter(read=>read.table==='canvas_material_preparations')).toHaveLength(50);
    expect(capped.reads.filter(read=>read.table==='canvas_material_preparations').at(-1)?.from).toBe(9800);
  });
  it('keeps complete inventory ordering/counts and reuses two reads across candidate and visible projections', async () => {
    const files = Array.from({length:100},(_,n)=>file(n));
    const tables = { canvas_connections:[connection], canvas_courses:[course], canvas_course_sync_preferences:[{ id:uuid(5),user_id:owner,course_id:course.id,canvas_connection_id:connection.id,selected:true }], canvas_files:files };
    const local = fixture(tables);
    const result = await listCanvasReviewerSources({client:local.client,userId:owner,courseId:course.id,limit:100,includeClientPreparationStatus:true});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.sources).toHaveLength(100); expect(result.value.pagination.totalKnown).toBe(100);
    expect(new Set(result.value.sources.map(source=>source.id)).size).toBe(100);
    expect(local.reads.filter(read=>read.table.startsWith('canvas_material_preparation'))).toHaveLength(2);
    expect(local.reads.filter(read=>read.table==='canvas_courses')).toHaveLength(1);
    expect(local.reads.filter(read=>read.table==='canvas_files')).toHaveLength(1);
    expect(result.value.sources.every(source=>source.preparation?.status==='preparing')).toBe(true);
  });
});
