import { describe, expect, it, vi } from 'vitest';
import type { Database, SourceFigureRow } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CanonicalReviewerRecord } from '../canonical-reviewers';
import { OFFICE_STRUCTURE_VERSION } from '../activity-maker/office-extraction';
import { citedFigures, getSectionFigureAvailability, getSectionFigures, readMaterialFigures } from './sections';
const resolver=vi.hoisted(()=>({resolve:vi.fn(async()=>({available:true}))}));
vi.mock('../snapshot-pdf-object',async load=>({...await load<typeof import('../snapshot-pdf-object')>(),resolveSnapshotPdfObject:resolver.resolve}));
type Block=Database['public']['Tables']['reviewer_source_snapshot_blocks']['Row'];
const owner='11111111-1111-4111-8111-111111111111';const hash='a'.repeat(64);
function saved():CanonicalReviewerRecord {
  return {artifact:{id:'artifact',user_id:owner,deleted_at:null},version:{user_id:owner,payload:{reviewer:{sections:[
    {id:'s',title:'Identical title',sourceBlockIds:['canvas-1-1']},{id:'none',title:'Identical title',sourceBlockIds:[]}]} }},
    source:{id:'accepted',user_id:owner,revision_kind:'canvas_resolved',metadata:{reviewerSourceSnapshotId:'snapshot',
      reviewerSourceBlocks:[{id:'canvas-1-1',text:'Accepted block',pageNumber:2}]}}} as unknown as CanonicalReviewerRecord;
}
function figure(overrides:Partial<SourceFigureRow>={}):SourceFigureRow {
  return {id:'f',user_id:owner,source_kind:'canvas_file',source_row_id:'original',original_sha256:hash,
    page_number:2,slide_number:null,block_id:null,position:0,width:256,height:160,byte_size:100,
    sha256:'b'.repeat(64),storage_path:'private-opaque-key.png',created_at:'now',...overrides};
}
const block=(overrides:Partial<Block>={}):Block=>({id:'b',user_id:owner,source_snapshot_id:'snapshot',source_snapshot_item_id:'item',
  source_ordinal:1,block_ordinal:1,page_number:2,slide_number:null,parser_version:OFFICE_STRUCTURE_VERSION,...overrides} as Block);
function harness() {
  const canonical=saved();const read=vi.fn(async()=>({ok:true as const,value:canonical}));
  const materials=vi.fn(async()=>[{figures:[figure(),figure({id:'uncited',page_number:3})],blocks:[block()],standalonePdf:false}]);
  const sign=vi.fn(async()=>({data:{signedUrl:'https://storage.example.test/image?token=short'},error:null}));
  const client={storage:{from:()=>({createSignedUrl:sign})}} as unknown as SupabaseClient<Database>;
  return {canonical,read,materials,sign,client};
}
const input={userId:owner,artifactId:'artifact',sectionId:'s'};
describe('exact cited source figures',()=>{
  it('returns only cited figures with short URLs and no private locator/hash',async()=>{
    const h=harness();const result=await getSectionFigures(h.client,input,h);
    expect(result).toEqual({figures:[{id:'f',url:'https://storage.example.test/image?token=short',page:2,width:256,height:160}]});
    expect(h.sign).toHaveBeenCalledExactlyOnceWith('private-opaque-key.png',600);
    expect(JSON.stringify(result)).not.toContain('private-opaque');expect(JSON.stringify(result)).not.toContain(hash);
  });
  it('never matches titles or partial, absent or duplicated canonical evidence',async()=>{
    const h=harness();expect(await getSectionFigures(h.client,{...input,sectionId:'none'},h)).toEqual({figures:[]});
    const payload=h.canonical.version.payload as {reviewer:{sections:{id:string;sourceBlockIds:string[]}[]}};
    payload.reviewer.sections[0]!.sourceBlockIds.push('missing');expect(await getSectionFigures(h.client,input,h)).toEqual({figures:[]});
    payload.reviewer.sections[0]!.sourceBlockIds=['canvas-1-1'];
    h.canonical.source.metadata={reviewerSourceBlocks:[{id:'canvas-1-1',text:'one'},{id:'canvas-1-1',text:'two'}]};
    expect(await getSectionFigures(h.client,input,h)).toEqual({figures:[]});expect(h.sign).not.toHaveBeenCalled();
  });
  it.each(['artifact','version','source'] as const)('denies a different owner on %s before private reads',async field=>{
    const h=harness();h.canonical[field].user_id='other';
    await expect(getSectionFigures(h.client,input,h)).rejects.toMatchObject({status:404,code:'not_found'});
    expect(h.materials).not.toHaveBeenCalled();expect(h.sign).not.toHaveBeenCalled();
  });
  it('denies deleted reviewers and unknown sections safely',async()=>{
    const h=harness();await expect(getSectionFigures(h.client,{...input,sectionId:'unknown'},h)).rejects.toThrow('not_found');
    expect(h.materials).not.toHaveBeenCalled();h.canonical.artifact.deleted_at='now';
    await expect(getSectionFigures(h.client,input,h)).rejects.toThrow('not_found');
  });
  it('binds composite materials by source ordinal without mixing pages from another file',()=>{
    const h=harness();const materials=[{figures:[figure()],blocks:[block({source_ordinal:2})],standalonePdf:false}];
    expect(citedFigures(h.canonical,'s',materials)).toEqual([]);
    materials[0]!.blocks=[block()];expect(citedFigures(h.canonical,'s',materials).map(f=>f.id)).toEqual(['f']);
  });
  it('links slides and DOCX ordinals only with the new parser and keeps old unanchored Office unavailable',()=>{
    const h=harness();const figures=[figure({id:'slide',page_number:null,slide_number:4}),figure({id:'docx',page_number:null,block_id:'block-1'})];
    const materials=[{figures,blocks:[block({page_number:null,slide_number:4})],standalonePdf:false}];
    expect(citedFigures(h.canonical,'s',materials).map(f=>f.id)).toEqual(['docx','slide']);
    materials[0]!.blocks=[block({page_number:null,slide_number:4,parser_version:'old-flattened-parser'})];
    expect(citedFigures(h.canonical,'s',materials)).toEqual([]);
  });
  it('orders and caps each section at 12 and batches availability without signing',async()=>{
    const h=harness();h.materials.mockResolvedValue([{figures:Array.from({length:20},(_,n)=>figure({id:String(n),position:19-n})),blocks:[block()],standalonePdf:false}]);
    const result=await getSectionFigures(h.client,input,h);expect(result.figures).toHaveLength(12);
    expect(result.figures.map(f=>f.id)).toEqual(Array.from({length:12},(_,n)=>String(19-n)));
    h.sign.mockClear();expect(await getSectionFigureAvailability(h.client,{userId:owner,artifactId:'artifact'},h)).toEqual({sections:[{sectionId:'s',hasFigures:true},{sectionId:'none',hasFigures:false}]});
    expect(h.sign).not.toHaveBeenCalled();
  });
});
describe('accepted original reads',()=>{
  function queryHarness() {
    const tables:Record<string,unknown[]>={reviewer_source_snapshots:[{id:'snapshot',user_id:owner,was_edited:false,source_mode:'canvas',source_count:1}],
      reviewer_source_snapshot_items:[{id:'item',user_id:owner,source_type:'file',source_row_id:'original',stored_content_sha256:hash,file_kind:'pdf'}],
      reviewer_source_snapshot_blocks:[block()],source_figure_extractions:[{user_id:owner,source_kind:'canvas_file',source_row_id:'original',original_sha256:hash,figure_count:1}],
      source_figures:[figure(),figure({id:'new-revision',original_sha256:'c'.repeat(64)}),figure({id:'other-material',source_row_id:'other'})]};
    const filters: [string,string,unknown][]=[];const exists=vi.fn(async(_path:string)=>({data:true,error:null}));
    const from=(table:string)=>{
      const conditions=new Map<string,unknown>();const result=()=>({data:(tables[table]??[]).filter(r=>[...conditions].every(([k,v])=>!(k in (r as object))||(r as Record<string,unknown>)[k]===v)),error:null});
      const q={select:()=>q,order:()=>q,eq:(k:string,v:unknown)=>{conditions.set(k,v);filters.push([table,k,v]);return q;},
        limit:async()=>result(),maybeSingle:async()=>({...result(),data:result().data[0]??null})};return q;
    };
    const client={from,storage:{from:()=>({exists})}} as unknown as SupabaseClient<Database>;
    return {tables,filters,exists,client};
  }
  it('reads historical accepted hash and material even when newer figures exist',async()=>{
    const h=queryHarness();const result=await readMaterialFigures(h.client,saved(),owner);
    expect(result[0]!.figures.map(f=>f.id)).toEqual(['f']);
    expect(h.filters).toContainEqual(['source_figures','original_sha256',hash]);
    expect(h.filters).toContainEqual(['source_figures','source_row_id','original']);
    expect(h.exists.mock.calls[0]![0]).toContain(hash);
  });
  it('hides retained figures if the accepted original is unavailable or source was edited',async()=>{
    const h=queryHarness();h.exists.mockResolvedValue({data:false,error:null});expect(await readMaterialFigures(h.client,saved(),owner)).toEqual([]);
    const edited=saved();edited.source.revision_kind='user_edited';expect(await readMaterialFigures(h.client,edited,owner)).toEqual([]);
  });
  it('refuses ambiguous/incomplete snapshot listings',async()=>{
    const h=queryHarness();h.tables.reviewer_source_snapshot_items=[];
    expect(await readMaterialFigures(h.client,saved(),owner)).toEqual([]);expect(h.exists).not.toHaveBeenCalled();
  });
  it('hides partial persisted figures until a complete success receipt exists',async()=>{
    const h=queryHarness();h.tables.source_figure_extractions=[];
    expect((await readMaterialFigures(h.client,saved(),owner))[0]!.figures).toEqual([]);
    h.tables.source_figure_extractions=[{figure_count:2}];
    expect((await readMaterialFigures(h.client,saved(),owner))[0]!.figures).toEqual([]);
  });
  it('covers the canonical local PDF page and denies a deleted/unavailable original',async()=>{
    const h=queryHarness();const local=saved();local.source.document_asset_id='original';
    local.source.revision_kind='user_edited';local.source.metadata={sourceType:'local_file',mimeType:'application/pdf',pageProvenance:'extracted',reviewerSourceBlocks:[{id:'page-2',text:'Accepted',pageNumber:2}]};
    const payload=local.version.payload as {reviewer:{sections:{sourceBlockIds:string[]}[]}};payload.reviewer.sections[0]!.sourceBlockIds=['page-2'];
    h.tables.document_assets=[{id:'original',content_sha256:hash}];h.tables.source_figures=[figure({source_kind:'local_pdf'})];
    h.tables.source_figure_extractions=[{user_id:owner,source_kind:'local_pdf',source_row_id:'original',original_sha256:hash,figure_count:1}];
    resolver.resolve.mockResolvedValue({available:true});const material=await readMaterialFigures(h.client,local,owner);
    expect(citedFigures(local,'s',material).map(f=>f.id)).toEqual(['f']);
    resolver.resolve.mockResolvedValue({available:false});expect(await readMaterialFigures(h.client,local,owner)).toEqual([]);
  });
});
