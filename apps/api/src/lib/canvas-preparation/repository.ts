import { createHash } from 'node:crypto';
import type { CanvasMaterialPreparationRow, Database, Json } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { parsePreparedMaterial, parsePreparationEvidence, type PreparationEvidence } from './contracts';
import { isPreparedCanvasFileReadyForOcr } from '@/lib/canvas-stored-file-extraction';

export type PreparationClient=SupabaseClient<Database>;
export const json=(value:unknown):Json=>JSON.parse(JSON.stringify(value)) as Json;
export const sourceDigest=(value:string)=>createHash('sha256').update(value).digest('hex');
export function revisionFingerprint(evidence:readonly PreparationEvidence[]):string {
  return sourceDigest(JSON.stringify(evidence.map(({type,id,revision})=>({type,id,revision}))));
}
export async function readPreparation(client:PreparationClient,id:string){
  const result=await client.from('canvas_material_preparations').select('*').eq('id',id).maybeSingle();
  if(result.error)throw new Error('preparation_store_unavailable');return result.data;
}
export async function readEvidence(client:PreparationClient,id:string){
  const result=await client.from('canvas_material_preparation_evidence').select('evidence').eq('job_id',id).maybeSingle();
  if(result.error || !result.data)throw new Error('preparation_store_unavailable');return parsePreparationEvidence(result.data.evidence);
}
export async function evidenceIsCurrent(client:PreparationClient,job:Pick<CanvasMaterialPreparationRow,'user_id'|'course_id'>,evidence:readonly PreparationEvidence[]){
  const result=await client.rpc('canvas_preparation_evidence_current_v1',{p_user_id:job.user_id,p_course_id:job.course_id,p_evidence:json(evidence)});
  if(result.error)throw new Error('preparation_store_unavailable');return result.data===true;
}
export async function readPreparedResult(client:PreparationClient,job:CanvasMaterialPreparationRow){
  if(job.state!=='prepared' || !job.result_id)return null;
  const evidence=await readEvidence(client,job.id);
  if(!await evidenceIsCurrent(client,job,evidence))return null;
  const result=await client.from('canvas_material_preparation_results').select('payload').eq('id',job.result_id).eq('job_id',job.id).maybeSingle();
  if(result.error || !result.data)throw new Error('preparation_store_unavailable');
  const parsed=parsePreparedMaterial(result.data.payload);
  if(revisionFingerprint(parsed.components)!==job.revision_fingerprint)throw new Error('preparation_result_invalid');
  for(const component of parsed.components.filter(item=>item.type==='file')){
    const current=await client.from('canvas_files').select('*').eq('id',component.id).eq('user_id',job.user_id).eq('course_id',job.course_id).maybeSingle();
    if(current.error)throw new Error('preparation_store_unavailable');
    if(!current.data || !isPreparedCanvasFileReadyForOcr(current.data) || current.data.current_sha256!==component.originalSha256 || current.data.stored_byte_count!==component.originalByteSize)return null;
  }
  return parsed;
}
/** A claimed job authorizes only its stored owned connection, never caller IDs. */
export async function preparationTokenContext(client:PreparationClient,input:{jobId:string;dispatchId:string;workerId:string;leaseToken:string},now=Date.now()){
  const job=await readPreparation(client,input.jobId);
  if(!job || job.state!=='running' || job.dispatch_id!==input.dispatchId || job.worker_id!==input.workerId || job.lease_token!==input.leaseToken ||
    !Number.isFinite(Date.parse(job.lease_expires_at??'')) || Date.parse(job.lease_expires_at!)<=now ||
    !Number.isFinite(Date.parse(job.deadline_at)) || Date.parse(job.deadline_at)<=now)return null;
  const [connection,course,preference]=await Promise.all([
    client.from('canvas_connections').select('*').eq('id',job.canvas_connection_id).eq('user_id',job.user_id).eq('status','active').maybeSingle(),
    client.from('canvas_courses').select('id').eq('id',job.course_id).eq('user_id',job.user_id).eq('canvas_connection_id',job.canvas_connection_id).maybeSingle(),
    client.from('canvas_course_sync_preferences').select('id').eq('course_id',job.course_id).eq('user_id',job.user_id).eq('selected',true).maybeSingle(),
  ]);
  if(connection.error || course.error || preference.error)throw new Error('preparation_store_unavailable');
  if(!connection.data || !course.data || !preference.data)return null;
  return {job,connection:connection.data};
}
