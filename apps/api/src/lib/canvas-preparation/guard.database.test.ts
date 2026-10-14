import { afterEach,describe,expect,it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createPreparationStore,registerDiscoveredFiles } from './store.fixture';
const ids={userId:'11111111-1111-4111-8111-111111111111',courseId:'22222222-2222-4222-8222-222222222222',connectionId:'33333333-3333-4333-8333-333333333333'};
let db:PGlite|undefined;
afterEach(async()=>{await db?.close();db=undefined;});
async function setup(){
  db=await createPreparationStore(ids);
  const sync=await registerDiscoveredFiles(db,{...ids,materialIds:['file:44444444-4444-4444-8444-444444444444','file:55555555-5555-4555-8555-555555555555']});
  const batch=await db.query<{id:string}>('select id from advance_canvas_preparation_sync_v1($1)',[sync]);
  return {db,sync,batch:batch.rows};
}
describe('persisted preparation runaway guard', { timeout: 20_000 },()=>{
  it('trips no progress for a stuck batch and suppresses its materials',async()=>{
    const {db,sync}=await setup();
    await db.exec(`update canvas_material_preparations set state='running',deadline_at=now()-interval '1 second'`);
    expect((await db.query('select * from advance_canvas_preparation_sync_v1($1)',[sync])).rows).toEqual([]);
    expect((await db.query('select guard_state,signal,prepared_total,failed_total from canvas_preparation_syncs')).rows)
      .toEqual([{guard_state:'tripped',signal:'no_progress',prepared_total:0,failed_total:0}]);
    expect((await db.query<{suppressed:boolean}>('select suppressed from canvas_material_preparation_controls')).rows.every(row=>row.suppressed)).toBe(true);
  });
  it('reconnects an identical receipt but trips an intentional repeated terminal enqueue',async()=>{
    const {db,sync,batch}=await setup();
    await db.exec(`update canvas_material_preparations set state='prepared'`);
    await db.query('select * from advance_canvas_preparation_sync_v1($1)',[sync]);
    const item=(await db.query<{receipt_id:string}>('select receipt_id from canvas_preparation_sync_items where job_id=$1',[batch[0]!.id])).rows[0]!;
    const invoke=async(receipt:string)=>(await db.query<{ok:boolean}>('select reenqueue_canvas_preparation_sync_item_v1($1,$2,$3) as ok',[sync,batch[0]!.id,receipt])).rows[0]!.ok;
    expect(await invoke(item.receipt_id)).toBe(true);
    expect(await invoke('66666666-6666-4666-8666-666666666666')).toBe(false);
    expect((await db.query('select guard_state,signal from canvas_preparation_syncs')).rows).toEqual([{guard_state:'tripped',signal:'repeat'}]);
  });
});
