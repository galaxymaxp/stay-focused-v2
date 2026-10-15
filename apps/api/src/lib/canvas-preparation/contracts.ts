import type { CanvasStructuredBlockDraft } from '@/lib/canvas-structured-blocks';
import type { CanvasStoredFileExtraction } from '@/lib/canvas-stored-file-extraction';

export interface PreparationEvidence { readonly type:'file'|'page'; readonly id:string; readonly revision:string }
export interface PreparationBlock extends CanvasStructuredBlockDraft { readonly id:string; readonly order:number }
export interface PreparedComponent extends PreparationEvidence {
  readonly text:string; readonly blocks:readonly PreparationBlock[];
  readonly extraction?:CanvasStoredFileExtraction;
  readonly originalSha256?:string; readonly originalByteSize?:number;
}
export interface PreparedMaterial { readonly version:1; readonly components:readonly PreparedComponent[] }
export interface PreparationReference { readonly jobId:string; readonly dispatchId:string }
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function parsePreparationReference(value:unknown):PreparationReference|null {
  if(!isRecord(value) || Object.keys(value).sort().join(',')!=='dispatchId,jobId' ||
    typeof value.jobId!=='string' || !UUID.test(value.jobId) || typeof value.dispatchId!=='string' || !UUID.test(value.dispatchId))return null;
  return {jobId:value.jobId,dispatchId:value.dispatchId};
}
export function parsePreparationEvidence(value:unknown):readonly PreparationEvidence[] {
  if(!Array.isArray(value) || !value.length || value.length>8)throw new Error('preparation_evidence_invalid');
  const seen=new Set<string>();
  return value.map((item:unknown)=>{
    if(!isRecord(item) || (item.type!=='file' && item.type!=='page') || typeof item.id!=='string' || !UUID.test(item.id) ||
      typeof item.revision!=='string' || !/^[a-f0-9]{64}$/.test(item.revision) || seen.has(item.id))throw new Error('preparation_evidence_invalid');
    seen.add(item.id);return {type:item.type,id:item.id,revision:item.revision};
  });
}
export function parsePreparedMaterial(value:unknown):PreparedMaterial {
  if(!isRecord(value) || value.version!==1 || !Array.isArray(value.components))throw new Error('preparation_result_invalid');
  const evidence=parsePreparationEvidence(value.components);
  const components=value.components.map((item:unknown,index)=>{
    if(!isRecord(item) || typeof item.text!=='string' || !Array.isArray(item.blocks))throw new Error('preparation_result_invalid');
    // Persisted results originate only in the worker; still validate at the read boundary.
    for(const block of item.blocks as unknown[]){
      if(!isRecord(block) || typeof block.id!=='string' || typeof block.text!=='string' ||
        !Number.isSafeInteger(block.order) || !['heading','paragraph','list_item','table','quote','code'].includes(String(block.kind)) ||
        (block.pageNumber!==undefined && (!Number.isSafeInteger(block.pageNumber) || Number(block.pageNumber)<1)))throw new Error('preparation_result_invalid');
    }
    if(evidence[index]!.type==='file' && (typeof item.originalSha256!=='string' || !/^[a-f0-9]{64}$/.test(item.originalSha256) ||
      !Number.isSafeInteger(item.originalByteSize) || Number(item.originalByteSize)<0 || !isRecord(item.extraction) || item.extraction.text!==item.text ||
      !['pdf','image','text','docx','pptx'].includes(String(item.extraction.fileKind))))throw new Error('preparation_result_invalid');
    return item as unknown as PreparedComponent;
  });
  return {version:1,components};
}
export function isRecord(value:unknown):value is Record<string,unknown>{return value!==null && typeof value==='object' && !Array.isArray(value);}
