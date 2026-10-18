import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createPreparationStore, registerDiscoveredFiles } from './canvas-preparation/store.fixture';
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const course = '33333333-3333-4333-8333-333333333333';
const connection = '44444444-4444-4444-8444-444444444444';
const file = '55555555-5555-4555-8555-555555555555';
const version = '66666666-6666-4666-8666-666666666666';
let db: PGlite;
let prep: string;
beforeAll(async () => {
  db = await createPreparationStore({ userId: owner, courseId: course, connectionId: connection });
  await db.exec(`create table source_versions(id uuid primary key,user_id uuid,content_sha256 text);
    alter table canvas_files add column stored_byte_count bigint default 100;
    create table processing_job_sources(id uuid primary key,user_id uuid,metadata jsonb);
    create table processing_jobs(id uuid primary key,user_id uuid,source_version_id uuid,source_snapshot_id uuid,
      status text,job_type text,created_at timestamptz default now());
    create table processing_policy_config(id text primary key,max_daily_generation_jobs integer);
    insert into processing_policy_config values('default',25);
    grant select on source_versions,processing_jobs,processing_job_sources,processing_policy_config to service_role;`);
  await db.exec(readFileSync(resolve(__dirname, '../../../../packages/db/migrations/20261018000200_material_descriptions.sql'), 'utf8'));
}, 20_000);
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec(`reset role; truncate canvas_material_preparation_controls,canvas_files,source_versions,processing_jobs,processing_job_sources cascade;
    update processing_policy_config set max_daily_generation_jobs=25;`);
  await registerDiscoveredFiles(db, { userId: owner, courseId: course, materialIds: [`file:${file}`] });
  prep = (await db.query<{ id: string }>('select id from canvas_material_preparations')).rows[0]!.id;
  const payload = { components: [{ type: 'file', id: file, originalSha256: 'b'.repeat(64), originalByteSize: 100 }] };
  const result = (await db.query<{ id: string }>(`insert into canvas_material_preparation_results(job_id,payload) values($1,$2) returning id`, [prep,JSON.stringify(payload)])).rows[0]!.id;
  await db.query(`update canvas_material_preparations set state='prepared',result_id=$1 where id=$2`, [result, prep]);
});
async function claim(empty = false, user = owner, manual = false) {
  return (await db.query<{ id: string; description_status: string }>('select * from claim_material_description_v1($1,$2,$3,$4,$5)',
    [user, manual ? null : prep, manual ? version : null, 'configured-model', empty])).rows;
}
async function finish(id: string, text = 'Covers cells and energy.') {
  return (await db.query<{ ok: boolean }>('select finish_material_description_v1($1,$2,$3) as ok', [id, owner, text])).rows[0]!.ok;
}
async function read(user = owner) {
  return (await db.query('select * from read_material_descriptions_v1($1,$2,$3)', [user, course, [`file:${file}`]])).rows;
}
describe('material description migration, executed only in local PGlite', () => {
  it('claims each revision once even on concurrent delivery; publishes safe metadata', async () => {
    await db.exec('set role service_role');
    const claims = await Promise.all([claim(), claim()]);
    expect(claims.flat()).toHaveLength(1);
    const receipt = claims.flat()[0]!;
    expect(receipt.description_status).toBe('failed');
    expect(await finish(receipt.id)).toBe(true);
    expect(await finish(receipt.id)).toBe(false);
    expect(await claim()).toEqual([]);
    expect(await read()).toEqual([{ material_id: `file:${file}`, description: 'Covers cells and energy.' }]);
    expect(await read(other)).toEqual([]);
  });
  it('records empty without a model charge; failed receipts do not retry', async () => {
    const receipt = (await claim(true))[0]!;
    expect(receipt.description_status).toBe('skipped_empty'); expect(await claim()).toEqual([]);
    expect((await db.query('select description_model from material_descriptions')).rows).toEqual([{ description_model: null }]);
  });
  it('skips suppressed or tripped preparation guards and exhausted daily budgets', async () => {
    await db.exec('update canvas_material_preparation_controls set suppressed=true');
    expect(await claim()).toEqual([]);
    await db.exec("update canvas_material_preparation_controls set suppressed=false; update canvas_preparation_syncs set guard_state='tripped'");
    expect(await claim()).toEqual([]);
    await db.exec("update canvas_preparation_syncs set guard_state='running'; update processing_policy_config set max_daily_generation_jobs=1");
    await db.query(`insert into processing_jobs(id,user_id,job_type,status) values(gen_random_uuid(),$1,'reviewer_generation','failed')`, [owner]);
    expect(await claim()).toEqual([]);
  });
  it('bounds description calls independently without taking reviewer job slots', async () => {
    await db.exec('update processing_policy_config set max_daily_generation_jobs=1');
    expect(await claim()).toHaveLength(1);
    await db.exec("update material_descriptions set created_at=now(); update canvas_material_preparations set revision_fingerprint=repeat('c',64)");
    expect(await claim()).toEqual([]);
    expect((await db.query('select count(*)::int as n from processing_jobs')).rows).toEqual([{ n: 0 }]);
  });
  it.each(['quiz_generation','activity_generation'])('also respects exhausted %s admission', async type => {
    await db.exec('update processing_policy_config set max_daily_generation_jobs=1');
    await db.query(`insert into processing_jobs(id,user_id,job_type,status) values(gen_random_uuid(),$1,$2,'succeeded')`, [owner,type]);
    expect(await claim()).toEqual([]);
  });
  it('hides stale revisions and refuses publication after evidence changes', async () => {
    const receipt = (await claim())[0]!;
    await db.exec("update canvas_files set content_version_fingerprint=repeat('c',64)");
    expect(await finish(receipt.id)).toBe(false); expect(await read()).toEqual([]);
    expect(await claim()).toEqual([]);
  });
  it.each(['current_sha256','stored_byte_count'])('hides descriptions when original %s changes without a metadata revision', async column => {
    const receipt = (await claim())[0]!; expect(await finish(receipt.id)).toBe(true);
    if (column === 'current_sha256') await db.exec("update canvas_files set current_sha256=repeat('c',64)");
    else await db.exec('update canvas_files set stored_byte_count=101');
    expect(await read()).toEqual([]);
  });
  it('enforces owner read and service-only mutations/RPCs without granting payload reads', async () => {
    const receipt = (await claim())[0]!; await finish(receipt.id);
    await db.query("select set_config('test.owner',$1,false)", [other]);
    await db.exec('set role authenticated');
    expect((await db.query('select description from material_descriptions')).rows).toEqual([]);
    await db.query("select set_config('test.owner',$1,false)", [owner]);
    expect((await db.query('select description from material_descriptions')).rows).toHaveLength(1);
    await expect(claim()).rejects.toThrow(/permission denied/);
    await expect(read()).rejects.toThrow(/permission denied/);
    await expect(finish(receipt.id)).rejects.toThrow(/permission denied/);
    await expect(db.exec("update material_descriptions set description='Changed'" )).rejects.toThrow(/permission denied/);
    await expect(db.query('select payload from canvas_material_preparation_results')).rejects.toThrow(/permission denied/);
    await db.exec('reset role');
    await expect(db.query('update material_descriptions set description=$1', ['x'.repeat(241)])).rejects.toThrow(/check constraint/);
  });
  it('stores manual metadata by exact source hash and denies cancelled/foreign work', async () => {
    await db.query('insert into source_versions values($1,$2,$3)', [version, owner, 'b'.repeat(64)]);
    await db.query(`insert into processing_job_sources values($1,$2,'{"manualReviewerVersion":"manual-reviewer-v1"}')`, [version, owner]);
    await db.query(`insert into processing_jobs(id,user_id,source_version_id,source_snapshot_id,status,job_type) values($1,$2,$1,$1,'running','reviewer_generation')`, [version, owner]);
    expect(await claim(false, other, true)).toEqual([]);
    const receipt = (await claim(false, owner, true))[0]!;
    await db.exec("update processing_jobs set status='cancelled'");
    expect(await finish(receipt.id)).toBe(false);
    expect(await claim(false, owner, true)).toEqual([]);
  });
  it('reads manual descriptions for only the owner and unchanged source hash', async () => {
    await db.query('insert into source_versions values($1,$2,$3)', [version, owner, 'b'.repeat(64)]);
    await db.query(`insert into processing_job_sources values($1,$2,'{"manualReviewerVersion":"manual-reviewer-v1"}')`, [version, owner]);
    await db.query(`insert into processing_jobs(id,user_id,source_version_id,source_snapshot_id,status,job_type) values($1,$2,$1,$1,'succeeded','reviewer_generation')`, [version, owner]);
    const receipt = (await claim(false, owner, true))[0]!; expect(await finish(receipt.id)).toBe(true);
    const readManual = (user: string) => db.query('select * from read_manual_material_descriptions_v1($1,$2)', [user,[version]]);
    expect((await readManual(owner)).rows).toEqual([{ source_version_id: version, description: 'Covers cells and energy.' }]);
    expect((await readManual(other)).rows).toEqual([]);
    await db.exec("update source_versions set content_sha256=repeat('c',64)");
    expect((await readManual(owner)).rows).toEqual([]);
    await db.exec('set role authenticated');
    await expect(readManual(owner)).rejects.toThrow(/permission denied/);
  });
});
