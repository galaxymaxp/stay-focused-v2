import type { CanvasFileRow,CanvasPageRow } from '@stay-focused/db';
import type { OcrProvider } from '@stay-focused/ocr';
import type { CanvasStoredFileExtractionResult } from '@/lib/canvas-stored-file-extraction';
import { isPreparedCanvasFileReadyForOcr } from '@/lib/canvas-stored-file-extraction';
import { parsePreparedMaterial } from './contracts';
import type { PreparationClient } from './repository';
import { sourceDigest } from './repository';

export async function loadPreparedPageEvidence(input:{client:PreparationClient;userId:string;courseId:string;pageRow:CanvasPageRow}){
  const {pageRow:page}=input;
  if(page.user_id!==input.userId || page.course_id!==input.courseId)return null;
  const {preparedMaterial,admitMaterialPreparation}=await import('./admission');
  const identity={userId:input.userId,courseId:input.courseId,materialId:`page:${page.id}`};
  const result=await preparedMaterial(input.client,identity);
  const component=result?.components.find(item=>item.type==='page' && item.id===page.id && item.revision===sourceDigest(page.body_html??''));
  if(component)return component;
  await admitMaterialPreparation(input.client,{...identity,cycleKey:`reader:${sourceDigest(page.body_html??'')}`,explicitFilePermission:true});
  return null;
}

export async function extractCanvasPreparedFileText(input:{client:PreparationClient;userId:string;courseId:string;connectionId:string;fileRow:CanvasFileRow;ocrProvider?:OcrProvider}):Promise<CanvasStoredFileExtractionResult>{
  const {fileRow:file}=input;
  if(file.user_id!==input.userId || file.course_id!==input.courseId || file.canvas_connection_id!==input.connectionId)
    return {ok:false,status:404,code:'canvas_source_not_found',message:'Canvas source not found.'};
  if(isPreparedCanvasFileReadyForOcr(file)){
    const result=await input.client.rpc('read_canvas_prepared_file_component_v1',{p_user_id:input.userId,p_course_id:input.courseId,p_file_id:file.id,p_revision:file.content_version_fingerprint});
    if(result.error)return {ok:false,status:500,code:'canvas_storage_failed',message:'Prepared evidence could not be loaded.'};
    if(result.data){
      const component=parsePreparedMaterial({version:1,components:[result.data]}).components[0]!;
      if(component.type==='file' && component.id===file.id && component.revision===file.content_version_fingerprint && component.originalSha256===file.current_sha256 && component.originalByteSize===file.stored_byte_count && component.extraction)
        return {ok:true,value:component.extraction};
    }
  }
  const {admitMaterialPreparation}=await import('./admission');
  await admitMaterialPreparation(input.client,{userId:input.userId,courseId:input.courseId,materialId:`file:${file.id}`,
    cycleKey:`reader:${file.content_version_fingerprint}`,explicitFilePermission:true});
  return {ok:false,status:409,code:'canvas_source_file_preparation_required',message:'This source is still being prepared.'};
}
