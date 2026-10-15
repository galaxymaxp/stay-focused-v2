import { randomUUID } from 'node:crypto';
import { GoogleAuth } from 'google-auth-library';
import type { CanvasMaterialPreparationRow } from '@stay-focused/db';
import type { OcrProvider } from '@stay-focused/ocr';
import { createCanvasServiceClient } from '@/lib/canvas-db';
import { ingestCanvasFiles } from '@/lib/canvas-file-ingestion';
import { classifyStoredCanvasFileKind, extractPreparedCanvasFileText } from '@/lib/canvas-stored-file-extraction';
import { normalizeCanvasHtmlToText } from '@/lib/canvas-content-normalization';
import { normalizeCanvasHtmlToStructuredBlockDrafts,normalizePlainTextToStructuredBlockDrafts,normalizeOcrResultToStructuredBlockDrafts } from '@/lib/canvas-structured-blocks';
import { createServerOcrProvider } from '@/lib/ocr/create-server-ocr-provider';
import { buildCanvasPdfPageBlocks } from '@/lib/processing-jobs/deferred-canvas-reviewer';
import { CANVAS_WORKER_TOKEN_ENDPOINT } from '@/lib/canvas-sync-jobs/worker-token-contract';
import { dispatchPreparation } from './dispatch';
import { evidenceIsCurrent,json,readEvidence,readPreparation,sourceDigest,type PreparationClient } from './repository';
import {parsePreparedMaterial, type PreparationReference, type PreparedComponent, type PreparedMaterial} from './contracts';
import { preparationCompleted } from './orchestration';
import { prepareOfficePdf } from '../office-conversion/store';

class PreparationFailure extends Error {
  constructor(readonly reason:string,readonly retryable:boolean,readonly retryAfterMs=0){super(reason);}
}
export async function loadPreparationToken(reference:PreparationReference,workerId:string,leaseToken:string):Promise<string>{
  const client=await new GoogleAuth().getIdTokenClient(CANVAS_WORKER_TOKEN_ENDPOINT);
  const result=await client.request<{accessToken?:unknown}>({url:CANVAS_WORKER_TOKEN_ENDPOINT,method:'POST',timeout:35_000,retry:false,
    data:{...reference,workerId,leaseToken,jobType:'preparation'}});
  if(typeof result.data.accessToken!=='string' || result.data.accessToken.length<8 || result.data.accessToken.length>4096)
    throw new PreparationFailure('preparation_token_unavailable',true);
  return result.data.accessToken;
}
export async function prepareMaterialStep(client:PreparationClient,job:CanvasMaterialPreparationRow,token:string,dependencies:{ocrProvider?:OcrProvider;officePdf?:typeof prepareOfficePdf}={}):Promise<PreparedMaterial>{
  const evidence=await readEvidence(client,job.id);
  if(!await evidenceIsCurrent(client,job,evidence))throw new PreparationFailure('source_revision_changed',false);
  const components:PreparedComponent[]=[];
  const historical=job.result_id?await client.from('canvas_material_preparation_results').select('payload').eq('id',job.result_id).eq('job_id',job.id).maybeSingle():null;
  if(historical?.error)throw new PreparationFailure('preparation_store_unavailable',true);
  const retained=historical?.data?parsePreparedMaterial(historical.data.payload):null;
  for(const item of evidence){
    if(item.type==='page'){
      const page=await client.from('canvas_pages').select('*').eq('id',item.id).eq('user_id',job.user_id).eq('course_id',job.course_id).maybeSingle();
      if(page.error || !page.data || sourceDigest(page.data.body_html??'')!==item.revision)throw new PreparationFailure('source_revision_changed',false);
      const text=normalizeCanvasHtmlToText(page.data.body_html);
      const blocks=normalizeCanvasHtmlToStructuredBlockDrafts(page.data.body_html).map((block,index)=>({...block,id:`html-${index+1}`,order:index}));
      components.push({...item,text,blocks});continue;
    }
    const ingestion=await ingestCanvasFiles({client,userId:job.user_id,fileIds:[item.id],brokeredCanvasToken:token,
      ...(job.source_type==='page-attachment'?{directlyLinkedFileId:item.id}:{})});
    if(!ingestion.ok)throw new PreparationFailure('preparation_ingestion_unavailable',true);
    const receipt=ingestion.response.results[0];
    if(!receipt || !['stored','unchanged'].includes(receipt.status))
      throw new PreparationFailure('preparation_download_failed',receipt?.retryable??false,receipt?.retryAfterMs??0);
    const file=await client.from('canvas_files').select('*').eq('id',item.id).eq('user_id',job.user_id).eq('course_id',job.course_id).maybeSingle();
    if(file.error || !file.data || file.data.content_version_fingerprint!==item.revision)throw new PreparationFailure('source_revision_changed',false);
    const cached=retained?.components.find(component=>component.id===item.id && component.revision===item.revision && component.originalSha256===file.data!.current_sha256 && component.originalByteSize===file.data!.stored_byte_count);
    if(cached){components.push(cached);continue;}
    const kind=classifyStoredCanvasFileKind(file.data);
    const extraction=await extractPreparedCanvasFileText({client,connectionId:job.canvas_connection_id,courseId:job.course_id,
      fileRow:file.data,userId:job.user_id,...(kind==='pdf'||kind==='image'?{ocrProvider:dependencies.ocrProvider??createServerOcrProvider()}:{})});
    if(!extraction.ok)throw new PreparationFailure('preparation_extraction_failed',extraction.status>=500);
    const value=extraction.value;
    if(value.fileKind==='pptx') {
      const slides=new Set(value.officeDrafts?.map(block=>block.slideNumber));
      // Converted pages are rendering evidence in their own receipt, never an
      // original PDF pageCount (Canvas's original-PDF 40-page checks stay intact).
      await (dependencies.officePdf??prepareOfficePdf)(client,file.data,slides.size);
    }
    const blocks=value.fileKind==='pdf'
      ? buildCanvasPdfPageBlocks(value.ocrResult?.pages??[],value.pageCount??0)
      : (value.officeDrafts??(value.ocrResult?normalizeOcrResultToStructuredBlockDrafts(value.ocrResult):normalizePlainTextToStructuredBlockDrafts(value.text)))
        .map((block,index)=>({...block,id:`block-${index+1}`,order:index}));
    components.push({...item,text:value.text,blocks,extraction:value,originalSha256:file.data.current_sha256!,originalByteSize:file.data.stored_byte_count!});
  }
  return {version:1,components};
}

export async function executePreparation(reference:PreparationReference,dependencies:{
  client?:PreparationClient;workerId?:string;leaseToken?:string;
  loadToken?:typeof loadPreparationToken;run?:typeof prepareMaterialStep;
  reconcile?:(client:PreparationClient,job:CanvasMaterialPreparationRow)=>Promise<void>;
  dispatch?:typeof dispatchPreparation;
  figures?:typeof import("../source-figures/store").extractPreparedFigures;
}={}):Promise<'ack'|'retry'>{
  const client=dependencies.client??createCanvasServiceClient();
  const workerId=dependencies.workerId??`google-preparation:${randomUUID()}`;const leaseToken=dependencies.leaseToken??randomUUID();
  const claimed=await client.rpc('claim_canvas_material_preparation_v1',{p_job_id:reference.jobId,p_dispatch_id:reference.dispatchId,p_worker_id:workerId,p_lease_token:leaseToken});
  if(claimed.error)throw new Error('preparation_claim_unavailable');
  const job=claimed.data?.[0];
  if(!job){
    const current=await readPreparation(client,reference.jobId);
    if(!current || current.dispatch_id!==reference.dispatchId)return 'ack';
    if(['prepared','failed','cancelled'].includes(current.state)){
      if(current.state==='prepared') {
        try { await (dependencies.figures??(await import('../source-figures/store')).extractPreparedFigures)(client,current); }
        catch { console.warn('source_figures.extraction',{code:'post_commit_failed',failureCount:1}); }
      }
      await (dependencies.reconcile??preparationCompleted)(client,current);
      return 'ack';
    }
    return 'retry';
  }
  let lost=false;let pending=false;
  const heartbeat=setInterval(()=>{
    if(pending)return;pending=true;
    void Promise.resolve(client.rpc('heartbeat_canvas_material_preparation_v1',{p_job_id:job.id,p_lease_token:leaseToken}))
      .then(result=>{if(result.error || !result.data)lost=true;}).catch(()=>{lost=true;}).finally(()=>{pending=false;});
  },20_000);
  try{
    let payload:PreparedMaterial|null=null;let failure:PreparationFailure|null=null;
    try{
      const token=await (dependencies.loadToken??loadPreparationToken)(reference,workerId,leaseToken);
      payload=await (dependencies.run??prepareMaterialStep)(client,job,token);
    }catch(error){failure=error instanceof PreparationFailure?error:new PreparationFailure('preparation_failed',true);}
    if(lost)return 'retry';
    const finished=await client.rpc('finish_canvas_material_preparation_v1',{p_job_id:job.id,p_lease_token:leaseToken,p_payload:payload?json(payload):null,
      p_reason:failure?.reason??null,p_retryable:failure?.retryable??false,p_retry_after_seconds:Math.ceil((failure?.retryAfterMs??0)/1000)});
    if(finished.error)throw new Error('preparation_completion_unavailable');
    const current=await readPreparation(client,job.id);
    if(current?.state==='pending')await (dependencies.dispatch??dispatchPreparation)(client,current);
    if(current?.state==='prepared') {
      try { await (dependencies.figures??(await import('../source-figures/store')).extractPreparedFigures)(client,current); }
      catch { console.warn('source_figures.extraction',{code:'post_commit_failed',failureCount:1}); }
    }
    if(current)await (dependencies.reconcile??preparationCompleted)(client,current);
    return current && ['running','pending'].includes(current.state) && current.dispatch_id===reference.dispatchId?'retry':'ack';
  }finally{clearInterval(heartbeat);}
}
