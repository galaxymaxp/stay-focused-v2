import { googleDispatcherClient, googleTaskConfig } from '@/lib/processing-jobs/google-cloud';
import type { CanvasMaterialPreparationRow } from '@stay-focused/db';
import type { AuthClient } from 'google-auth-library';
import type { PreparationReference } from './contracts';
import type { PreparationClient } from './repository';

export async function enqueuePreparation(reference:PreparationReference,availableAt:string,dependencies:{client?:Pick<AuthClient,'request'>}={}){
  const config=googleTaskConfig();const client=dependencies.client??await googleDispatcherClient();
  try{
    await client.request({url:`https://cloudtasks.googleapis.com/v2/${config.parent}/tasks`,method:'POST',timeout:15_000,retry:false,
      data:{task:{name:`${config.parent}/tasks/preparation-${reference.jobId}-${reference.dispatchId}`,dispatchDeadline:'1800s',
        ...(Date.parse(availableAt)>Date.now()?{scheduleTime:availableAt}:{}),
        httpRequest:{httpMethod:'POST',url:`${config.workerUrl}/tasks/canvas-preparation`,headers:{'Content-Type':'application/json'},
          body:Buffer.from(JSON.stringify(reference)).toString('base64'),oidcToken:{serviceAccountEmail:config.serviceAccountEmail,audience:config.workerUrl}}}}});
  }catch(error){
    if(typeof error==='object' && error!==null && 'response' in error && (error.response as {status?:number}|undefined)?.status===409)return;
    throw new Error('preparation_dispatch_unavailable');
  }
}
/** Durable job first, awaited task acceptance second, receipt last. Redelivery reconnects the same task name. */
export async function dispatchPreparation(client:PreparationClient,job:CanvasMaterialPreparationRow,enqueue=enqueuePreparation){
  if(job.state!=='pending' || job.dispatched_at)return job;
  // Queue waiting and active execution have separate bounded deadlines.
  const queued=await client.rpc('prepare_canvas_material_preparation_dispatch_v1',{p_job_id:job.id,p_dispatch_id:job.dispatch_id});
  if(queued.error)throw new Error('preparation_dispatch_unavailable');
  if(!queued.data?.[0])return job;
  await enqueue({jobId:job.id,dispatchId:job.dispatch_id},job.available_at);
  const result=await client.from('canvas_material_preparations').update({dispatched_at:new Date().toISOString()})
    .eq('id',job.id).eq('dispatch_id',job.dispatch_id).eq('state','pending').select('*').maybeSingle();
  if(result.error)throw new Error('preparation_dispatch_receipt_unavailable');return result.data??job;
}
