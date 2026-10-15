import type { SourceNormalizationBlockInput } from '@stay-focused/engine';
import { ExperienceFailure } from '../experience/errors';
import { record } from '../experience/mappers';

/** Carry the exact accepted manifest into canonical citation IDs. No inference. */
export function canonicalCanvasSourceBlocks(manifest:unknown):readonly SourceNormalizationBlockInput[] {
  if(manifest===undefined || manifest===null)return [];
  if(!Array.isArray(manifest) || manifest.length>400)throw new ExperienceFailure(409,'not_ready');
  const seen=new Set<string>();
  return manifest.map((value,index)=>{
    const b=record(value);
    if(typeof b.source_ordinal!=='number' || !Number.isSafeInteger(b.source_ordinal) || b.source_ordinal<1 || b.source_ordinal>8 ||
      typeof b.block_ordinal!=='number' || !Number.isSafeInteger(b.block_ordinal) || b.block_ordinal<1 || b.block_ordinal>400 ||
      typeof b.block_text!=='string' || !b.block_text.trim() ||
      (b.page_number!==null && b.page_number!==undefined && (typeof b.page_number!=='number' || !Number.isSafeInteger(b.page_number) || b.page_number<1 || b.page_number>100)))
      throw new ExperienceFailure(409,'not_ready');
    const id=`canvas-${b.source_ordinal}-${b.block_ordinal}`;
    if(seen.has(id))throw new ExperienceFailure(409,'not_ready');seen.add(id);
    return {id,kind:'unknown',order:index,text:b.block_text,...(typeof b.page_number==='number'?{pageNumber:b.page_number}:{})};
  });
}
