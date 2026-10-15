import { isPastOwnedCourse } from '@/lib/course-state';
import type { CanvasMaterialPreparationRow } from '@stay-focused/db';
import { listCanvasReviewerSources } from '@/lib/canvas-reviewer-sources';
import { runAutomaticReviewersAfterSync } from '@/lib/auto-reviewers/after-sync';
import { admitMaterialPreparation } from './admission';
import { dispatchPreparation } from './dispatch';
import type { PreparationClient } from './repository';

export async function advancePreparationSync(client:PreparationClient,syncId:string,dispatch=dispatchPreparation){
  const result=await client.rpc('advance_canvas_preparation_sync_v1',{p_sync_id:syncId});
  if(result.error)throw new Error('preparation_guard_unavailable');
  for(const job of result.data??[])await dispatch(client,job);
  const guard=await client.from('canvas_preparation_syncs').select('*').eq('id',syncId).maybeSingle();
  if(guard.error)throw new Error('preparation_guard_unavailable');
  if(guard.data?.guard_state==='tripped'){
    // At most 200 assigned receipts exist by the durable guard constraint.
    const receipts=await client.from('canvas_preparation_sync_items').select('job_id').eq('sync_id',syncId)
      .not('batch_index','is',null).order('job_id',{ascending:true}).range(0,199);
    if(receipts.error)throw new Error('preparation_guard_unavailable');
    const ids=receipts.data?.map(item=>item.job_id)??[];
    const jobs=ids.length?await client.from('canvas_material_preparations').select('material_id')
      .eq('user_id',guard.data.user_id).eq('course_id',guard.data.course_id).in('id',ids):null;
    if(jobs?.error)throw new Error('preparation_guard_unavailable');
    console.warn('canvas_preparation.guard_tripped',{signal:guard.data.signal,materialIds:jobs?.data?.map(job=>job.material_id)??[]});
  }
}
export async function enqueuePreparationAfterSync(client:PreparationClient,input:{userId:string;courseId:string;syncId:string;brokeredCanvasToken?:string}){
  try{
    if(await isPastOwnedCourse(client,input.userId,input.courseId))return;
    const inventory=await listCanvasReviewerSources({client,userId:input.userId,courseId:input.courseId,completeInventory:true});
    if(!inventory.ok || inventory.value.pagination.hasMore)throw new Error('preparation_inventory_incomplete');
    const eligible=inventory.value.sources.filter(source=>source.type==='page'||(source.type==='file' && source.file && source.file.kind!=='unsupported' && (source.file.canPrepare||source.file.preparationStatus==='ready')));
    const seeded=eligible.length?await client.from('canvas_preparation_discoveries').upsert(eligible.map(source=>({user_id:input.userId,course_id:input.courseId,material_id:source.id,cycle_key:`sync:${input.syncId}`})),
      {onConflict:'user_id,course_id,material_id',ignoreDuplicates:true}):null;
    if(seeded?.error)throw new Error('preparation_discovery_persistence_failed');
    const ids:string[]=[];
    const admitted:string[]=[];
    for(const source of eligible){
      if(source.type!=='page' && (source.type!=='file' || !source.file || source.file.kind==='unsupported' || (!source.file.canPrepare && source.file.preparationStatus!=='ready')))continue;
      // Failures of one material do not discard successful admissions or rewrite sync.
      try{
        const job=await admitMaterialPreparation(client,{...input,materialId:source.id,cycleKey:`sync:${input.syncId}`,dispatch:false,explicitFilePermission:true});
        if(job)admitted.push(source.id);
        if(job && ['pending','running'].includes(job.state))ids.push(job.id);
      }catch{console.warn('canvas_preparation.material_admission_failed',{materialId:source.id});}
    }
    const registered=await client.rpc('register_canvas_preparation_sync_v1',{p_user_id:input.userId,p_course_id:input.courseId,p_sync_id:input.syncId,p_cycle_key:`sync:${input.syncId}`,p_job_ids:ids});
    if(registered.error || !registered.data)throw new Error('preparation_guard_unavailable');
    if(admitted.length){const removed=await client.from('canvas_preparation_discoveries').delete().eq('user_id',input.userId).eq('course_id',input.courseId).in('material_id',admitted);
      if(removed.error)throw new Error('preparation_discovery_persistence_failed');}
    const complete=await client.from('canvas_preparation_syncs').update({inventory_complete:true}).eq('id',registered.data);
    if(complete.error)throw new Error('preparation_discovery_persistence_failed');
    await advancePreparationSync(client,registered.data);
  }catch{console.warn('canvas_preparation.sync_admission_unavailable');}
}

const PAGE_SIZE=200;const MAX_PAGES=50;
/** No new module IDs are needed. Read every open owned ledger or fail closed. */
export async function reconcilePreparationCourse(client:PreparationClient,input:{userId:string;courseId:string;drainDeferred?:boolean;now?:number}){
  if(await isPastOwnedCourse(client,input.userId,input.courseId))return;
  const ledgers=[];
  for(let page=0;page<MAX_PAGES;page++){
    const result=await client.from('canvas_preparation_syncs').select('*').eq('user_id',input.userId).eq('course_id',input.courseId)
      .in('guard_state',['running','deferred']).order('id',{ascending:true}).range(page*PAGE_SIZE,(page+1)*PAGE_SIZE-1);
    if(result.error || !result.data)throw new Error('preparation_guard_unavailable');ledgers.push(...result.data);
    if(result.data.length<PAGE_SIZE)break;
    if(page===MAX_PAGES-1)throw new Error('preparation_guard_inventory_incomplete');
  }
  // Backfill is advanced exclusively by its budgeted poll runner, never by a
  // worker completion or a student request. Live sync recovery wins ordering.
  for(const ledger of ledgers.filter(row=>!row.cycle_key?.startsWith('backfill:'))
    .sort((a,b)=>Number(b.cycle_key?.startsWith('sync:')??false)-Number(a.cycle_key?.startsWith('sync:')??false))){
    if(!ledger.inventory_complete && input.drainDeferred && ledger.sync_id){
      await enqueuePreparationAfterSync(client,{userId:input.userId,courseId:input.courseId,syncId:ledger.sync_id});
    }
    await advancePreparationSync(client,ledger.id);
    if(input.drainDeferred && ledger.guard_state==='deferred'){
      const drained=await client.rpc('drain_canvas_preparation_sync_v1',{p_sync_id:ledger.id,p_cycle_key:`poll:${Math.floor((input.now??Date.now())/300_000)}`});
      if(drained.error)throw new Error('preparation_guard_unavailable');
      if(drained.data)await advancePreparationSync(client,drained.data);
    }
  }
  if(input.drainDeferred){
    const backlog=[];
    for(let page=0;page<MAX_PAGES;page++){
      const result=await client.from('canvas_preparation_discoveries').select('*').eq('user_id',input.userId).eq('course_id',input.courseId)
        .eq('state','pending').lte('available_at',new Date(input.now??Date.now()).toISOString()).order('material_id',{ascending:true}).range(page*PAGE_SIZE,(page+1)*PAGE_SIZE-1);
      if(result.error || !result.data)throw new Error('preparation_discovery_unavailable');backlog.push(...result.data);
      if(result.data.length<PAGE_SIZE)break;if(page===MAX_PAGES-1)throw new Error('preparation_discovery_incomplete');
    }
    const pending:string[]=[];const admitted:string[]=[];const cycleKey=`poll:${Math.floor((input.now??Date.now())/300_000)}`;
    for(const entry of backlog.filter(row=>!row.cycle_key.startsWith('backfill:'))){
      try{const job=await admitMaterialPreparation(client,{userId:input.userId,courseId:input.courseId,materialId:entry.material_id,cycleKey,dispatch:false,explicitFilePermission:true});
        if(job)admitted.push(entry.material_id);
        if(job && ['pending','running'].includes(job.state))pending.push(job.id);
      }catch{console.warn('canvas_preparation.material_admission_failed',{materialId:entry.material_id});}
    }
    if(pending.length){
      const registered=await client.rpc('register_canvas_preparation_sync_v1',{p_user_id:input.userId,p_course_id:input.courseId,p_sync_id:null,p_cycle_key:cycleKey,p_job_ids:pending});
      if(registered.error || !registered.data)throw new Error('preparation_guard_unavailable');await advancePreparationSync(client,registered.data);
    }
    if(admitted.length){const removed=await client.from('canvas_preparation_discoveries').delete().eq('user_id',input.userId).eq('course_id',input.courseId).in('material_id',admitted);
      if(removed.error)throw new Error('preparation_discovery_persistence_failed');}
    await runAutomaticReviewersAfterSync(client,{userId:input.userId,courseId:input.courseId});
  }
}
export async function preparationCompleted(client:PreparationClient,job:CanvasMaterialPreparationRow){
  await reconcilePreparationCourse(client,{userId:job.user_id,courseId:job.course_id});
  if(job.state==='prepared')await runAutomaticReviewersAfterSync(client,{userId:job.user_id,courseId:job.course_id});
}
