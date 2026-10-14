import { describe,expect,it } from 'vitest';
import { canonicalCanvasSourceBlocks } from './canvas-canonical-source-blocks';
const block={source_ordinal:2,block_ordinal:3,block_text:'Exact accepted text',page_number:4};
describe('canonical Canvas citation manifest',()=>{
  it('retains exact text and ordinal/page evidence for admission',()=>{
    expect(canonicalCanvasSourceBlocks([block])).toEqual([{id:'canvas-2-3',kind:'unknown',order:0,text:'Exact accepted text',pageNumber:4}]);
    expect(canonicalCanvasSourceBlocks(undefined)).toEqual([]);
  });
  it.each([[block,block],[{...block,block_text:''}],[{...block,source_ordinal:9}],[{...block,page_number:101}],{}])('denies ambiguous or invalid evidence %j',manifest=>{
    expect(()=>canonicalCanvasSourceBlocks(manifest)).toThrow('not_ready');
  });
});
