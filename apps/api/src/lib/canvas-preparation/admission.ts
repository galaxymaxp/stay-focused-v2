import type { CanvasFileRow, CanvasMaterialPreparationRow } from '@stay-focused/db';
import { isPastOwnedCourse } from '@/lib/course-state';
import { listCanvasReviewerSources } from '@/lib/canvas-reviewer-sources';
import { classifyStoredCanvasFileKind } from '@/lib/canvas-stored-file-extraction';
import { discoverCanvasPageFileIds } from '@/lib/canvas-file-normalize';
import { isInstructionalPageAttachment, resolveInstructionalPageAttachments } from '@/lib/experience/canvas-page-attachments';
import type { PreparationEvidence } from './contracts';
import { dispatchPreparation } from './dispatch';
import { json, readPreparedResult, revisionFingerprint, sourceDigest, type PreparationClient } from './repository';

export interface MaterialIdentity {readonly userId:string;readonly courseId:string;readonly materialId:string}
export async function materialEvidence(client:PreparationClient,input:MaterialIdentity,options:{resolveAttachments?:boolean;brokeredCanvasToken?:string}={}){
  const match=/^(file|page):([a-f0-9-]{36})$/i.exec(input.materialId);
  if(!match)throw new Error('preparation_source_unavailable');
  const course=await client.from('canvas_courses').select('*').eq('id',input.courseId).eq('user_id',input.userId).maybeSingle();
  if(course.error || !course.data)throw new Error('preparation_source_unavailable');
  const evidence:PreparationEvidence[]=[];
  let files:readonly CanvasFileRow[]=[];
  if(match[1]==='file'){
    const result=await client.from('canvas_files').select('*').eq('id',match[2]!).eq('user_id',input.userId).eq('course_id',input.courseId)
      .eq('canvas_connection_id',course.data.canvas_connection_id).maybeSingle();
    if(result.error || !result.data || classifyStoredCanvasFileKind(result.data)==='unsupported')throw new Error('preparation_source_unavailable');
    files=[result.data];
  }else{
    const result=await client.from('canvas_pages').select('*').eq('id',match[2]!).eq('user_id',input.userId).eq('course_id',input.courseId)
      .eq('canvas_connection_id',course.data.canvas_connection_id).maybeSingle();
    if(result.error || !result.data)throw new Error('preparation_source_unavailable');
    const page=result.data;
    evidence.push({type:'page',id:page.id,revision:sourceDigest(page.body_html??'')});
    if(options.resolveAttachments){
      files=await resolveInstructionalPageAttachments({client,course:course.data,page,userId:input.userId,brokeredCanvasToken:options.brokeredCanvasToken});
    }else if(/\/files\//i.test(page.body_html??'')){
      const connection=await client.from('canvas_connections').select('base_url').eq('id',course.data.canvas_connection_id).eq('user_id',input.userId).maybeSingle();
      if(connection.error || !connection.data)throw new Error('preparation_source_unavailable');
      const ids=discoverCanvasPageFileIds({canvasBaseUrl:connection.data.base_url,canvasCourseId:course.data.canvas_course_id,html:page.body_html});
      if(ids.length>40)throw new Error('preparation_source_unavailable');
      if(ids.length){
        const found=await client.from('canvas_files').select('*').eq('user_id',input.userId).eq('course_id',input.courseId)
          .eq('canvas_connection_id',course.data.canvas_connection_id).in('canvas_file_id',[...ids]);
        if(found.error || ids.some(id=>!found.data?.some(file=>file.canvas_file_id===id)))throw new Error('preparation_source_unavailable');
        files=ids.flatMap(id=>found.data!.filter(file=>file.canvas_file_id===id && isInstructionalPageAttachment(file.display_name,file.ingestion_eligibility)));
      }
    }
    if(files.length>7)throw new Error('preparation_source_unavailable');
  }
  evidence.push(...files.map(file=>({type:'file' as const,id:file.id,revision:file.content_version_fingerprint})));
  if(evidence.some(item=>!/^[a-f0-9]{64}$/.test(item.revision)))throw new Error('preparation_source_unavailable');
  return {evidence,sourceType:match[1]==='file'?'file' as const:files.length?'page-attachment' as const:'page' as const};
}
export async function lookupMaterialPreparation(client:PreparationClient,input:MaterialIdentity){
  let identity;
  try{identity=await materialEvidence(client,input);}catch{return null;}
  const result=await client.from('canvas_material_preparations').select('*').eq('user_id',input.userId).eq('course_id',input.courseId)
    .eq('material_id',input.materialId).eq('revision_fingerprint',revisionFingerprint(identity.evidence)).maybeSingle();
  if(result.error)throw new Error('preparation_store_unavailable');return result.data;
}
export async function preparedMaterial(client:PreparationClient,input:MaterialIdentity){
  const job=await lookupMaterialPreparation(client,input);return job?await readPreparedResult(client,job):null;
}
export async function admitMaterialPreparation(client:PreparationClient,input:MaterialIdentity & {
  readonly cycleKey:string;readonly manualRetry?:boolean;readonly brokeredCanvasToken?:string;
  readonly explicitFilePermission?:boolean;readonly dispatch?:boolean;
}):Promise<CanvasMaterialPreparationRow|null>{
  if (!input.cycleKey.startsWith('manual:') && await isPastOwnedCourse(client,input.userId,input.courseId)) return null;
  const existing=await lookupMaterialPreparation(client,input);
  if(existing && ['pending','running'].includes(existing.state))return input.dispatch===false?existing:await dispatchPreparation(client,existing);
  if(existing?.state==='prepared'){
    if(await readPreparedResult(client,existing))return existing;
    const invalidated=await client.rpc('invalidate_canvas_preparation_binding_v1',{p_job_id:existing.id,p_user_id:input.userId});
    if(invalidated.error)throw new Error('preparation_store_unavailable');
  }
  const controls=await client.from('canvas_material_preparation_controls').select('*').eq('user_id',input.userId).eq('course_id',input.courseId).eq('material_id',input.materialId).maybeSingle();
  if(controls.error)throw new Error('preparation_store_unavailable');
  if(!input.manualRetry && controls.data && (controls.data.suppressed || controls.data.automatic_attempts>=3))return existing;
  // Explicit Retry resets accounting inside the serialized admission RPC only.
  // A second request must not reset attempts after the first job has started.
  if(!input.explicitFilePermission){
    const inventory=await listCanvasReviewerSources({client,userId:input.userId,courseId:input.courseId,completeInventory:true});
    if(!inventory.ok)throw new Error('preparation_inventory_incomplete');
    const source=inventory.value.sources.find(source=>source.id===input.materialId);
    if(!source || (source.type==='file' && (!source.file || source.file.kind==='unsupported' ||
      (!source.file.canPrepare && source.file.preparationStatus!=='ready'))))return null;
  }
  let identity;
  try{identity=await materialEvidence(client,input,{resolveAttachments:true,brokeredCanvasToken:input.brokeredCanvasToken});}
  catch(error){
    const delay=typeof error==='object' && error!==null && 'retryAfterMs' in error && typeof error.retryAfterMs==='number'?error.retryAfterMs:300_000;
    await client.rpc('record_canvas_preparation_discovery_failure_v1',{p_user_id:input.userId,p_course_id:input.courseId,p_material_id:input.materialId,
      p_cycle_key:input.cycleKey,p_delay_seconds:Math.ceil(delay/1000)});
    throw new Error('preparation_source_unavailable');
  }
  const {evidence,sourceType}=identity;
  const result=await client.rpc('admit_canvas_material_preparation_v1',{
    p_user_id:input.userId,p_course_id:input.courseId,p_material_id:input.materialId,p_source_type:sourceType,
    p_revision:revisionFingerprint(evidence),p_evidence:json(evidence),p_cycle_key:input.cycleKey,p_manual_retry:input.manualRetry??false,
  });
  if(result.error)throw new Error('preparation_admission_unavailable');
  const job=result.data?.[0]??null;
  if(job && input.dispatch!==false){
    const removed=await client.from('canvas_preparation_discoveries').delete().eq('user_id',input.userId).eq('course_id',input.courseId).eq('material_id',input.materialId);
    if(removed.error)throw new Error('preparation_store_unavailable');
  }
  return job && input.dispatch!==false?await dispatchPreparation(client,job):job;
}
