import { randomUUID } from 'node:crypto';
import type { CanvasMaterialPreparationRow, Database, ProcessingJobDatabaseRow } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CANVAS_SOURCE_FILE_BUCKET, safeObjectKeyForCanvasFile } from '../canvas-file-policy';
import { parsePreparedMaterial } from '../canvas-preparation/contracts';
import { readPreparedResult } from '../canvas-preparation/repository';
import { PROCESSING_JOB_SOURCE_BUCKET } from '../processing-jobs/constants';
import { digest, extractFigures, type ExtractedFigure } from './extract';

export const FIGURE_BUCKET = 'source-figures';
export const FIGURE_OPERATION_TIMEOUT_MS = 5000;
export const FIGURE_MATERIAL_TIMEOUT_MS = 30000;
export const FIGURE_PREPARATION_BUDGET_MS = 60000;
async function bounded<T>(work:()=>PromiseLike<T>, deadline:number):Promise<T> {
  const remaining=Math.min(FIGURE_OPERATION_TIMEOUT_MS,deadline-Date.now());
  if(remaining<=0)throw new Error('figure_timeout');
  let timer:ReturnType<typeof setTimeout>|undefined;
  try {
    return await Promise.race([Promise.resolve().then(work),new Promise<never>((_resolve,reject)=>{
      timer=setTimeout(()=>reject(new Error('figure_timeout')),remaining);
    })]);
  }finally {clearTimeout(timer);}
}
type Client = SupabaseClient<Database>;
export interface FigureSource {
  readonly userId: string; readonly sourceKind: 'canvas_file' | 'local_pdf'; readonly sourceRowId: string;
  readonly originalSha256: string; readonly revision: string;
}
export function figureFailure(code = 'extraction_failed') { console.warn('source_figures.extraction', { code, failureCount: 1 }); }

/** Called only after a durable success receipt; immutable rows outlive current revisions. */
export async function storeFigures(client: Client, source: FigureSource, figures: readonly ExtractedFigure[], deadline=Date.now()+FIGURE_MATERIAL_TIMEOUT_MS) {
  for (const f of figures) {
    const existing = await bounded(()=>client.from('source_figures').select('id').eq('user_id',source.userId).eq('source_kind',source.sourceKind)
      .eq('source_row_id',source.sourceRowId).eq('original_sha256',source.originalSha256).eq('sha256',f.sha256).eq('position',f.position).maybeSingle(),deadline);
    if (existing.error) throw new Error('figure_store_unavailable');
    if (existing.data) continue;
    const id=randomUUID(); const path=`${source.userId}/${id}.${f.mime==='image/png'?'png':'jpg'}`;
    const uploaded=await bounded(()=>client.storage.from(FIGURE_BUCKET).upload(path,f.bytes,{contentType:f.mime,upsert:false}),deadline);
    if(uploaded.error) throw new Error('figure_upload_failed');
    // DO NOTHING prevents concurrent deliveries replacing a published private key.
    const written=await bounded(()=>client.from('source_figures').upsert({id,user_id:source.userId,source_kind:source.sourceKind,source_row_id:source.sourceRowId,
      original_sha256:source.originalSha256,page_number:f.pageNumber??null,slide_number:f.slideNumber??null,block_id:f.blockId??null,
      position:f.position,width:f.width,height:f.height,byte_size:f.bytes.length,sha256:f.sha256,storage_path:path},
      {onConflict:'user_id,source_kind,source_row_id,original_sha256,sha256,position',ignoreDuplicates:true}),deadline);
    if(written.error) throw new Error('figure_store_failed');
    // Ambiguous writes retain bytes; never delete a possibly referenced object.
  }
  const receipt=await bounded(()=>client.from('source_figure_extractions').upsert({user_id:source.userId,source_kind:source.sourceKind,source_row_id:source.sourceRowId,
    original_sha256:source.originalSha256,revision_fingerprint:source.revision,figure_count:figures.length},
    {onConflict:'user_id,source_kind,source_row_id,revision_fingerprint,original_sha256',ignoreDuplicates:true}),deadline);
  if(receipt.error) throw new Error('figure_receipt_failed');
}
async function alreadyExtracted(client:Client,source:FigureSource,deadline:number) {
  const result=await bounded(()=>client.from('source_figure_extractions').select('figure_count').eq('user_id',source.userId)
    .eq('source_kind',source.sourceKind).eq('source_row_id',source.sourceRowId).eq('revision_fingerprint',source.revision)
    .eq('original_sha256',source.originalSha256).maybeSingle(),deadline);
  if(result.error) throw new Error('figure_receipt_unavailable');
  return !!result.data;
}
async function originalBytes(client:Client,bucket:string,path:string,hash:string,size:number,deadline:number) {
  if(!Number.isSafeInteger(size) || size<1 || size>20*1024*1024)throw new Error('figure_original_unavailable');
  const download=await bounded(()=>client.storage.from(bucket).download(path),deadline);
  if(download.error || !download.data || download.data.size!==size) throw new Error('figure_original_unavailable');
  const bytes=new Uint8Array(await download.data.arrayBuffer());
  if(bytes.length!==size || digest(bytes)!==hash) throw new Error('figure_original_changed');
  return bytes;
}
export async function extractPreparedFigures(client:Client,job:CanvasMaterialPreparationRow,
  dependencies:{extract?:typeof extractFigures;store?:typeof storeFigures}={}) {
  if(job.state!=='prepared' || !job.result_id) return;
  const budget=Date.now()+FIGURE_PREPARATION_BUDGET_MS;
  try {
    const prepared=await bounded(()=>readPreparedResult(client,job),budget); if(!prepared) return;
    for(const component of parsePreparedMaterial(prepared).components) {
      if(Date.now()>=budget){figureFailure('budget_exhausted');break;}
      const deadline=Math.min(budget,Date.now()+FIGURE_MATERIAL_TIMEOUT_MS);
      const kind=component.extraction?.fileKind;
      if(component.type!=='file' || !['pdf','pptx','docx'].includes(kind??'')) continue;
      try {
        const source:FigureSource={userId:job.user_id,sourceKind:'canvas_file',sourceRowId:component.id,
          originalSha256:component.originalSha256!,revision:component.revision};
        if(await alreadyExtracted(client,source,deadline)) continue;
        const bytes=await originalBytes(client,CANVAS_SOURCE_FILE_BUCKET,safeObjectKeyForCanvasFile({userId:job.user_id,fileId:component.id,
          contentHash:source.originalSha256}),source.originalSha256,component.originalByteSize!,deadline);
        const figures=await (dependencies.extract??extractFigures)(bytes,kind as 'pdf'|'pptx'|'docx');
        await (dependencies.store??storeFigures)(client,source,figures,deadline);
      } catch { figureFailure(); }
    }
  } catch { figureFailure('prepared_evidence_unavailable'); }
}

/** Local durable and synchronous workers share completeProcessingJob. Respect deletion. */
export async function extractLocalPreparedFigures(client:Client,job:ProcessingJobDatabaseRow,
  dependencies:{extract?:typeof extractFigures;store?:typeof storeFigures}={}) {
  if(job.job_type!=='document_extraction' || job.status!=='succeeded') return;
  const deadline=Date.now()+FIGURE_MATERIAL_TIMEOUT_MS;
  try {
    const input=await bounded(()=>client.from('processing_job_sources').select('*').eq('id',job.source_snapshot_id).eq('user_id',job.user_id).maybeSingle(),deadline);
    if(input.error || !input.data?.document_asset_id || input.data.source_kind!=='pdf') return;
    const assetId=input.data.document_asset_id;
    const asset=await bounded(()=>client.from('document_assets').select('*').eq('id',assetId).eq('user_id',job.user_id).maybeSingle(),deadline);
    const a=asset.data;
    if(asset.error || !a || a.user_id!==job.user_id || a.deleted_at!==null || a.upload_status!=='available' ||
      a.mime_type!=='application/pdf' || a.storage_bucket!==PROCESSING_JOB_SOURCE_BUCKET || !a.content_sha256 ||
      !a.storage_object_path.startsWith(`${job.user_id}/`)) return;
    const source:FigureSource={userId:job.user_id,sourceKind:'local_pdf',sourceRowId:a.id,originalSha256:a.content_sha256,revision:a.content_sha256};
    if(await alreadyExtracted(client,source,deadline)) return;
    const bytes=await originalBytes(client,a.storage_bucket,a.storage_object_path,a.content_sha256,a.byte_size,deadline);
    const figures=await (dependencies.extract??extractFigures)(bytes,'pdf');
    // A deleted asset cannot become a source of displayed figures; the API repeats
    // VL1.2 original/deletion resolution even for already uploaded images.
    const current=await bounded(()=>client.from('document_assets').select('deleted_at,upload_status').eq('id',a.id).eq('user_id',job.user_id).maybeSingle(),deadline);
    if(current.error || !current.data || current.data.deleted_at!==null || current.data.upload_status!=='available') return;
    await (dependencies.store??storeFigures)(client,source,figures,deadline);
  } catch { figureFailure(); }
}
