import { randomUUID } from 'node:crypto';
import type { IngestCanvasFilesResult } from '@/lib/canvas-file-ingestion';
import { admitMaterialPreparation } from './admission';
import type { PreparationClient } from './repository';

/** Preserve the ingest DTO; pending work is unavailable until its accepted result. */
export async function admitCanvasFilePreparations(input:{client:PreparationClient;userId:string;fileIds:readonly string[]}):Promise<IngestCanvasFilesResult>{
  const files=await input.client.from('canvas_files').select('*').eq('user_id',input.userId).in('id',[...input.fileIds]);
  if(files.error)return {ok:false,status:500,code:'canvas_storage_failed',message:'Canvas files could not be loaded.'};
  if(files.data?.length!==input.fileIds.length)return {ok:false,status:404,code:'canvas_file_not_found',message:'Canvas file not found.'};
  const results=[];
  for(const file of files.data){
    const job=await admitMaterialPreparation(input.client,{userId:input.userId,courseId:file.course_id,materialId:`file:${file.id}`,
      cycleKey:`manual:${randomUUID()}`,manualRetry:true,explicitFilePermission:true});
    results.push({fileId:file.id,status:job?.state==='prepared'?'unchanged' as const:job?.state==='failed'?'failed' as const:'unavailable' as const,
      code:job?.state==='prepared'?'prepared':job && ['pending','running'].includes(job.state)?'preparation_pending':job?.reason_code??'preparation_unavailable',retryable:job?.state!=='prepared',bytesStored:null});
  }
  return {ok:true,response:{ok:true,requested:results.length,succeeded:0,unchanged:results.filter(r=>r.status==='unchanged').length,metadataOnly:0,blocked:0,
    failed:results.filter(r=>r.status==='failed').length,unavailable:results.filter(r=>r.status==='unavailable').length,totalBytesStored:0,results}};
}
