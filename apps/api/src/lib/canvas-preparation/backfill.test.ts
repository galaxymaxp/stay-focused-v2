import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import type { CanvasMaterialPreparationRow } from '@stay-focused/db';
import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ dispatch: vi.fn(), automatic: vi.fn() }));
vi.mock('./dispatch', () => ({ dispatchPreparation: mocks.dispatch }));
vi.mock('@/lib/auto-reviewers/after-sync', () => ({ runAutomaticReviewersAfterSync: mocks.automatic }));
import { createPreparationStore } from './store.fixture';
import { preparationBackfillClient } from './backfill.fixture';
import { BACKFILL_GLOBAL_BUDGET, BACKFILL_PER_COURSE_BUDGET, processPreparationBackfill, seedPreparationBackfill } from './backfill';
import { preparationCompleted } from './orchestration';
import { admitMaterialPreparation } from './admission';
import { listCanvasReviewerSources } from '@/lib/canvas-reviewer-sources';

const ids = { userId: '11111111-1111-4111-8111-111111111111', courseId: '22222222-2222-4222-8222-222222222222', connectionId: '33333333-3333-4333-8333-333333333333' };
const smallCourse = '22222222-2222-4222-8222-222222222223';
const materialId = (index: number) => `file:aaaaaaaa-aaaa-4aaa-8aaa-${String(index).padStart(12, '0')}`;
let db: PGlite | undefined;
afterEach(async () => { await db?.close(); db = undefined; vi.clearAllMocks(); });
async function setup(large: number, small = 0) {
  db = await createPreparationStore(ids);
  if (small) {
    await db.query('insert into canvas_courses values($1,$2,$3)', [smallCourse, ids.userId, ids.connectionId]);
    await db.query('insert into canvas_course_sync_preferences values($1,$2,true)', [smallCourse, ids.userId]);
  }
  for (let index = 1; index <= large + small; index++) {
    await db.query("insert into canvas_files values($1,$2,$3,'available',$4,'stored',$5)",
      [materialId(index).slice(5), ids.userId, index <= large ? ids.courseId : smallCourse, 'a'.repeat(64), 'b'.repeat(64)]);
  }
  const fixture = await preparationBackfillClient(db, ids.connectionId);
  // Real claim/publication RPCs with a healthy synthetic text extractor. Provider
  // extraction is covered by EP1 worker tests; this never downloads course data.
  mocks.dispatch.mockImplementation(async (_client: unknown, job: CanvasMaterialPreparationRow) => {
    const lease = randomUUID();
    const claimed = await db!.query<{ id: string }>('select id from claim_canvas_material_preparation_v1($1,$2,$3,$4)', [job.id, job.dispatch_id, 'fixture-worker', lease]);
    if (claimed.rows.length) {
      const evidence = (await db!.query<{ evidence: { type: string; id: string; revision: string }[] }>('select evidence from canvas_material_preparation_evidence where job_id=$1', [job.id])).rows[0]!.evidence;
      const payload = { version: 1, components: evidence.map(item => ({ ...item, text: 'Synthetic lesson.',
        blocks: [{ id: 'block-1', kind: 'paragraph', order: 0, text: 'Synthetic lesson.' }],
        extraction: { fileKind: 'text', text: 'Synthetic lesson.' }, originalSha256: 'b'.repeat(64), originalByteSize: 10 })) };
      const done = await db!.query<{ ok: boolean }>('select finish_canvas_material_preparation_v1($1,$2,$3::jsonb,null,false,0) as ok', [job.id, lease, JSON.stringify(payload)]);
      expect(done.rows[0]?.ok).toBe(true);
    }
    return job;
  });
  mocks.automatic.mockResolvedValue(undefined);
  return { ...fixture, db };
}
const run = (client: Parameters<typeof processPreparationBackfill>[0]) => processPreparationBackfill(client, 'poll-fixture', Date.now() + 120_000);

describe('poll-owned preparation backfill through real discovery and guard SQL', { timeout: 30_000 }, () => {
  it('prepares all 230 old materials across bounded runs without another content sync', async () => {
    const { client, db } = await setup(230);
    const inventory = await listCanvasReviewerSources({ client, ...ids, completeInventory: true });
    expect(inventory.ok && inventory.value.sources.length).toBe(230);
    for (let iteration = 0; iteration < 24; iteration++) {
      const result = await run(client);
      expect(result.admitted).toBeLessThanOrEqual(BACKFILL_PER_COURSE_BUDGET);
      expect(result.admitted).toBeLessThanOrEqual(BACKFILL_GLOBAL_BUDGET);
      const prepared = (await db.query<{ total: number }>("select count(*)::int as total from canvas_material_preparations where state='prepared'")).rows[0]!.total;
      if (prepared === 230) break;
    }
    expect((await db.query("select state,count(*)::int as total from canvas_material_preparations group by state")).rows).toEqual([{ state: 'prepared', total: 230 }]);
    expect((await db.query("select * from canvas_preparation_syncs where guard_state='tripped' or enqueued_count>25")).rows).toEqual([]);
    expect((await db.query('select * from canvas_sync_jobs')).rows).toEqual([]);
    await run(client); // finalize the last terminal batch and clean any backlog
    expect((await db.query('select * from canvas_preparation_discoveries')).rows).toEqual([]);
    expect((await db.query('select count(*)::int as total from canvas_material_preparation_results')).rows).toEqual([{ total: 230 }]);
  }, 90_000);

  it('admits the five-material course fully in the first round while the 230-material course continues', async () => {
    const { client, db, calls } = await setup(230, 5);
    expect((await run(client)).admitted).toBe(30);
    const admissions = calls.filter(call => call.name === 'admit_canvas_material_preparation_v1');
    expect(admissions.slice(0, 10).map(call => call.args.p_course_id)).toEqual([...Array(5).fill(ids.courseId), ...Array(5).fill(smallCourse)]);
    expect((await db.query("select count(*)::int as total from canvas_material_preparations where course_id=$1 and state='prepared'", [smallCourse])).rows).toEqual([{ total: 5 }]);
    await run(client); // recover/complete old ledger without exceeding its budget
    await run(client);
    expect((await db.query('select count(*)::int as total from canvas_material_preparations where course_id=$1', [ids.courseId])).rows).toEqual([{ total: 50 }]);
  });

  it('recovers student Retry and advances live sync before a backfill ledger in the same run', async () => {
    const { client, db, calls } = await setup(3);
    const live = await admitMaterialPreparation(client, { ...ids, materialId: materialId(1), cycleKey: 'sync:live', dispatch: false, explicitFilePermission: true });
    const retry = await admitMaterialPreparation(client, { ...ids, materialId: materialId(2), cycleKey: 'manual:retry', manualRetry: true, dispatch: false, explicitFilePermission: true });
    const backfill = await admitMaterialPreparation(client, { ...ids, materialId: materialId(3), cycleKey: 'backfill:old', dispatch: false, explicitFilePermission: true });
    const register = async (key: string, job: string) => (await db.query<{ id: string }>('select register_canvas_preparation_sync_v1($1,$2,null,$3,$4::uuid[]) as id', [ids.userId, ids.courseId, key, [job]])).rows[0]!.id;
    const liveLedger = await register('sync:live', live!.id); const backfillLedger = await register('backfill:old', backfill!.id);
    await run(client);
    const advances = calls.filter(call => call.name === 'advance_canvas_preparation_sync_v1').map(call => call.args.p_sync_id);
    expect(advances.indexOf(liveLedger)).toBeLessThan(advances.indexOf(backfillLedger));
    expect(mocks.dispatch.mock.calls.map(call => call[1].id)).toEqual([retry!.id, live!.id, backfill!.id]);
  });

  it('skips prepared, lifetime-cap and suppressed materials and resumes a current cancelled revision', async () => {
    const { client, db } = await setup(4);
    const prepared = await admitMaterialPreparation(client, { ...ids, materialId: materialId(1), cycleKey: 'backfill:prepared', dispatch: false, explicitFilePermission: true });
    await mocks.dispatch(client, prepared);
    for (const [index, attempts, suppressed] of [[2, 3, false], [3, 0, true]] as const) {
      await db.query('insert into canvas_material_preparation_controls values($1,$2,$3,$4,$5)', [ids.userId, ids.courseId, materialId(index), attempts, suppressed]);
    }
    const cancelled = await admitMaterialPreparation(client, { ...ids, materialId: materialId(4), cycleKey: 'backfill:cancelled', dispatch: false, explicitFilePermission: true });
    await db.query("update canvas_material_preparations set state='cancelled' where id=$1", [cancelled!.id]);
    const seed = await seedPreparationBackfill(client, { ...ids, cycleKey: 'backfill:seed' });
    expect(seed).toEqual({ complete: true, seeded: 1 });
    expect((await db.query('select material_id from canvas_preparation_discoveries')).rows).toEqual([{ material_id: materialId(4) }]);
    await run(client);
    expect((await db.query('select id,state from canvas_material_preparations order by material_id')).rows)
      .toEqual([{ id: prepared!.id, state: 'prepared' }, { id: cancelled!.id, state: 'prepared' }]);
  });

  it('seeds nothing from incomplete real inventory and resumes after the next complete read', async () => {
    const { client, db, faults } = await setup(8);
    faults.readTable = 'canvas_modules';
    expect(await run(client)).toMatchObject({ admitted: 0, seeded: 0, skippedIncomplete: 1 });
    expect((await db.query('select * from canvas_preparation_discoveries')).rows).toEqual([]);
    faults.readTable = '';
    expect((await run(client)).admitted).toBe(8);
  });

  it('resumes a crash after seed and admission but before registration without duplicate jobs', async () => {
    const { client, db, faults } = await setup(12);
    faults.rpcOnce = 'register_canvas_preparation_sync_v1';
    await expect(run(client)).rejects.toThrow('preparation_backfill_guard_unavailable');
    expect((await db.query('select count(*)::int as total from canvas_preparation_discoveries')).rows).toEqual([{ total: 12 }]);
    expect((await db.query('select count(*)::int as total from canvas_material_preparations')).rows).toEqual([{ total: 5 }]);
    expect((await run(client)).admitted).toBe(12);
    expect((await db.query('select state,count(*)::int as total from canvas_material_preparations group by state')).rows).toEqual([{ state: 'prepared', total: 12 }]);
    expect((await db.query('select * from canvas_preparation_discoveries')).rows).toEqual([]);
  });

  it('leaves backfill progression to the poll on worker completion', async () => {
    const { client, calls } = await setup(3);
    await run(client);
    calls.length = 0;
    const job = (await db!.query<CanvasMaterialPreparationRow>('select * from canvas_material_preparations limit 1')).rows[0]!;
    await preparationCompleted(client, job);
    expect(calls.filter(call => call.name === 'advance_canvas_preparation_sync_v1')).toEqual([]);
  });

  it('enforces the global budget and resumes courses beyond the first run in stable round-robin order', async () => {
    const { client, db, calls } = await setup(30, 30);
    const third = '22222222-2222-4222-8222-222222222224';
    await db.query('insert into canvas_courses values($1,$2,$3)', [third, ids.userId, ids.connectionId]);
    await db.query('insert into canvas_course_sync_preferences values($1,$2,true)', [third, ids.userId]);
    for (let index = 61; index <= 90; index++) {
      await db.query("insert into canvas_files values($1,$2,$3,'available',$4,'stored',$5)",
        [materialId(index).slice(5), ids.userId, third, 'a'.repeat(64), 'b'.repeat(64)]);
    }
    expect((await run(client)).admitted).toBe(BACKFILL_GLOBAL_BUDGET);
    const admissions = calls.filter(call => call.name === 'admit_canvas_material_preparation_v1');
    expect(admissions.slice(0, 15).map(call => call.args.p_course_id))
      .toEqual([...Array(5).fill(ids.courseId), ...Array(5).fill(smallCourse), ...Array(5).fill(third)]);
    const totals = (await db.query<{ total: number }>('select count(*)::int as total from canvas_material_preparations group by course_id')).rows;
    expect(totals.every(row => row.total <= BACKFILL_PER_COURSE_BUDGET)).toBe(true);
    for (let iteration = 0; iteration < 8; iteration++) expect((await run(client)).admitted).toBeLessThanOrEqual(BACKFILL_GLOBAL_BUDGET);
    expect((await db.query("select count(*)::int as total from canvas_material_preparations where state='prepared'")).rows).toEqual([{ total: 90 }]);
  });

  it('seeds a changed exact revision without reusing its historical prepared receipt', async () => {
    const { client, db } = await setup(1);
    await run(client); await run(client);
    const old = (await db.query<{ id: string }>('select id from canvas_material_preparations')).rows[0]!.id;
    await db.exec(`update canvas_files set content_version_fingerprint='${'c'.repeat(64)}',ingestion_status='not_requested'`);
    expect(await seedPreparationBackfill(client, { ...ids, cycleKey: 'backfill:changed' })).toEqual({ complete: true, seeded: 1 });
    expect((await db.query('select id,state from canvas_material_preparations')).rows).toEqual([{ id: old, state: 'prepared' }]);
  });

  it('resumes a crash directly after seeding without duplicating discoveries', async () => {
    const { client, db } = await setup(9);
    expect(await seedPreparationBackfill(client, { ...ids, cycleKey: 'backfill:before-crash' })).toEqual({ complete: true, seeded: 9 });
    expect(await seedPreparationBackfill(client, { ...ids, cycleKey: 'backfill:after-crash' })).toEqual({ complete: true, seeded: 0 });
    expect((await run(client)).admitted).toBe(9);
    expect((await db.query('select count(*)::int as total from canvas_material_preparations')).rows).toEqual([{ total: 9 }]);
  });

  it('retires stale backfill wakeups only after complete eligibility and control evidence', async () => {
    const { client, db, faults } = await setup(3);
    await seedPreparationBackfill(client, { ...ids, cycleKey: 'backfill:stale' });
    await db.query('insert into canvas_material_preparation_controls values($1,$2,$3,3,false)', [ids.userId, ids.courseId, materialId(1)]);
    await db.query('insert into canvas_material_preparation_controls values($1,$2,$3,0,true)', [ids.userId, ids.courseId, materialId(2)]);
    await db.query("update canvas_files set availability_status='unavailable' where id=$1", [materialId(3).slice(5)]);
    faults.readTable = 'canvas_modules';
    expect((await run(client)).admitted).toBe(0);
    expect((await db.query('select count(*)::int as total from canvas_preparation_discoveries')).rows).toEqual([{ total: 3 }]);
    faults.readTable = '';
    expect((await run(client)).admitted).toBe(0);
    expect((await db.query('select * from canvas_preparation_discoveries')).rows).toEqual([]);
    expect((await db.query('select * from canvas_material_preparations')).rows).toEqual([]);
  });

  it('claims completed selected courses fairly, excludes inactive/unselected courses and enforces owner RLS/service grants', async () => {
    const { db } = await setup(1, 1);
    await db.exec('set role service_role');
    const claim = async () => (await db.query<{ course_id: string }>("select course_id from claim_canvas_preparation_backfill_courses_v1('worker',1)")).rows;
    expect(await claim()).toEqual([{ course_id: ids.courseId }]);
    expect(await claim()).toEqual([{ course_id: smallCourse }]); // live lease excludes first
    expect(await claim()).toEqual([]);
    await db.exec(`reset role; update canvas_preparation_backfill_courses set lease_expires_at=now()-interval '1 second';
      update canvas_preparation_backfill_courses set last_visited_at=now() where course_id='${ids.courseId}'; set role service_role;`);
    expect(await claim()).toEqual([{ course_id: smallCourse }]);
    await db.exec(`reset role; update canvas_connections set status='disconnected'; set role service_role;`);
    expect(await claim()).toEqual([]);
    await db.exec(`reset role; update canvas_connections set status='active'; update canvas_course_sync_preferences set selected=false; set role service_role;`);
    expect(await claim()).toEqual([]);
    await db.exec(`reset role; set role authenticated; select set_config('test.owner','${ids.userId}',false)`);
    expect((await db.query('select course_id from canvas_preparation_backfill_courses')).rows).toHaveLength(2);
    await expect(db.exec('select lease_owner from canvas_preparation_backfill_courses')).rejects.toThrow(/permission denied/);
    await expect(db.exec("update canvas_preparation_backfill_courses set last_visited_at=now()")).rejects.toThrow(/permission denied/);
    await expect(claim()).rejects.toThrow(/permission denied/);
    await db.exec("select set_config('test.owner','44444444-4444-4444-8444-444444444444',false)");
    expect((await db.query('select course_id from canvas_preparation_backfill_courses')).rows).toEqual([]);
  });
});
