import { describe,expect,it,vi } from 'vitest';
import type { Database,SectionExternalVisualRow } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CanonicalReviewerRecord } from '../canonical-reviewers';
import { findSectionVisual,sectionText,EXTERNAL_VISUAL_LABEL } from './service';
import type { CommonsCandidate } from './commons';
const candidate:CommonsCandidate={fileTitle:'File:Cell.png',title:'Cell',image:'https://upload.wikimedia.org/image.png',sourceUrl:'https://commons.wikimedia.org/wiki/File:Cell.png',credit:'Ada',license:'CC BY',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',width:1200,height:800};
const input={userId:'owner',artifactId:'artifact',sectionId:'s',findAnother:false};
function harness(){
  const saved={artifact:{id:'artifact',user_id:'owner',deleted_at:null},version:{id:'version',user_id:'owner',payload:{reviewer:{sections:[{id:'s',title:'Cells',sourceBlockIds:['private-id'],blocks:[{explanation:'Cells contain nuclei.',keyPoints:['Nuclei hold genetic material.']}]}]}}},source:{user_id:'owner'}} as unknown as CanonicalReviewerRecord;
  let cached:SectionExternalVisualRow|null=null;
  const filters:Record<string,unknown>={};
  const q={select:()=>q,eq:(key:string,value:unknown)=>{filters[key]=value;return q;},maybeSingle:async()=>({data:cached,error:null})};
  const rpc=vi.fn(async(name:string,args:Record<string,unknown>)=>{
    if(name==='reserve_section_external_visual_v1')return {data:'token',error:null};
    if(args.p_result){const value=args.p_result as Record<string,unknown>;cached={user_id:'owner',artifact_id:'artifact',version_id:'version',section_id:'s',source_url:null,image_url:null,title:null,credit:null,license:null,license_url:null,width:null,height:null,
      attempt_count:(cached?.attempt_count??0)+1,created_at:'now',updated_at:'now',...value} as SectionExternalVisualRow;}
    return {data:true,error:null};
  });
  const client={from:()=>q,rpc} as unknown as SupabaseClient<Database>;
  const read=vi.fn(async()=>({ok:true as const,value:saved}));
  const snapshot=vi.fn(async()=>({available:false as const,reason:'not_canvas_pdf' as const}));
  const figures=vi.fn(async()=>({sections:[{sectionId:'s',hasFigures:false}]}));
  const search=vi.fn(async()=>[candidate]);
  const match=vi.fn(async()=>({candidate,verdict:'Depicts the cell.',checkedTitles:[candidate.fileTitle]}));
  return {client,rpc,read,snapshot,figures,search,match,saved,filters,setCache:(row:SectionExternalVisualRow|null)=>{cached=row;},cache:()=>cached};
}
describe('section external visual admission',()=>{
  it('publishes only after persistence, labels the reference and never returns private provenance',async()=>{
    const h=harness();const result=await findSectionVisual(h.client,input,h);
    expect(result).toMatchObject({status:'found',image:candidate.image,label:EXTERNAL_VISUAL_LABEL,attemptCount:1});
    expect(h.filters).toEqual({user_id:'owner',artifact_id:'artifact',version_id:'version',section_id:'s'});
    expect(h.snapshot).toHaveBeenCalledWith(h.client,{userId:'owner',artifactId:'artifact',sectionId:'s',render:false});
    expect(h.match).toHaveBeenCalledWith([candidate],'Cells\nCells contain nuclei.\nNuclei hold genetic material.');
    expect(JSON.stringify(result)).not.toMatch(/private-id|query|verdict|excluded_titles/);
  });
  it.each(['artifact','version','source'] as const)('denies another %s owner before search',async key=>{
    const h=harness();h.saved[key].user_id='other';await expect(findSectionVisual(h.client,input,h)).rejects.toMatchObject({status:404,code:'not_found'});
    expect(h.search).not.toHaveBeenCalled();expect(h.rpc).not.toHaveBeenCalled();
  });
  it('denies deleted and absent reviewers/sections safely',async()=>{
    const h=harness();await expect(findSectionVisual(h.client,{...input,sectionId:'missing'},h)).rejects.toThrow('not_found');
    h.saved.artifact.deleted_at='now';await expect(findSectionVisual(h.client,input,h)).rejects.toThrow('not_found');
    expect(h.search).not.toHaveBeenCalled();
  });
  it.each(['snapshot','figures'])('refuses when a %s source visual exists, including before cache',async kind=>{
    const h=harness();await findSectionVisual(h.client,input,h);h.search.mockClear();h.rpc.mockClear();
    if(kind==='snapshot')h.snapshot.mockResolvedValue({available:true,status:'unrendered',page:1} as never);
    else h.figures.mockResolvedValue({sections:[{sectionId:'s',hasFigures:true}]});
    await expect(findSectionVisual(h.client,input,h)).rejects.toMatchObject({status:409,code:'conflict'});
    expect(h.search).not.toHaveBeenCalled();expect(h.rpc).not.toHaveBeenCalled();
  });
  it('returns cache without spending quota; Find another excludes prior titles once then caches',async()=>{
    const h=harness();await findSectionVisual(h.client,input,h);
    h.search.mockClear();h.rpc.mockClear();await findSectionVisual(h.client,input,h);expect(h.search).not.toHaveBeenCalled();expect(h.rpc).not.toHaveBeenCalled();
    expect((await findSectionVisual(h.client,{...input,findAnother:true},h)).attemptCount).toBe(2);
    expect(h.search).toHaveBeenCalledWith(expect.any(String),['File:Cell.png']);
    await findSectionVisual(h.client,{...input,findAnother:true},h);expect(h.search).toHaveBeenCalledOnce();
  });
  it('a no-match is honest and cached; an empty search makes no model call',async()=>{
    const h=harness();h.search.mockResolvedValue([]);
    expect(await findSectionVisual(h.client,input,h)).toEqual({status:'none',message:'No reliable visual found',attemptCount:1});
    expect(h.match).not.toHaveBeenCalled();await findSectionVisual(h.client,input,h);expect(h.search).toHaveBeenCalledOnce();
  });
  it.each(['search','match'] as const)('%s errors release reservations and never cache none',async operation=>{
    const h=harness();h[operation].mockRejectedValue(new Error('raw provider private text'));
    await expect(findSectionVisual(h.client,input,h)).rejects.toMatchObject({status:503,code:'unavailable'});
    expect(h.cache()).toBeNull();expect(h.rpc).toHaveBeenLastCalledWith('finish_section_external_visual_v1',{p_token:'token',p_result:null});
  });
  it('failed Find another preserves the first cached result for retry',async()=>{
    const h=harness();await findSectionVisual(h.client,input,h);h.match.mockRejectedValue(new Error('timeout'));
    await expect(findSectionVisual(h.client,{...input,findAnother:true},h)).rejects.toThrow('unavailable');
    expect((await findSectionVisual(h.client,input,h)).attemptCount).toBe(1);
  });
  it('maps the daily cap and concurrent lease to safe errors before search',async()=>{
    for(const [message,status] of [['external_visual_daily_cap',429],['external_visual_busy',409]] as const){
      const h=harness();h.rpc.mockResolvedValueOnce({data:null,error:{message}} as never);
      await expect(findSectionVisual(h.client,input,h)).rejects.toMatchObject({status});expect(h.search).not.toHaveBeenCalled();
    }
  });
  it('does not return a result when publication is denied',async()=>{
    const h=harness();h.rpc.mockResolvedValueOnce({data:'token',error:null}).mockResolvedValueOnce({data:false,error:null});
    await expect(findSectionVisual(h.client,input,h)).rejects.toThrow('unavailable');expect(h.cache()).toBeNull();
  });
  it('only uses the exact section text and never includes citation/provenance values',()=>{
    expect(sectionText({title:'Cells',blocks:[{explanation:'Exact text',sourceBlockIds:['secret'],metadata:{title:'private'},evidence:[{text:'Source example'}]}]})).toBe('Cells\nExact text\nSource example');
  });
  it('projects the persisted canonical items/sourceCore shape and omits audit/enrichment',()=>{
    expect(sectionText({title:'Cells',groundingIssues:[{description:'private audit'}],items:[{title:'Nucleus',sourceCore:{explanation:'Contains DNA.',keyPoints:['Genetic material'],evidence:[{text:'Exact source example'}],emphasis:[{text:'Contains DNA.'}]},enrichment:{explanation:'Unsupported extra fact'},sourceBlockIds:['private']}]}))
      .toBe('Cells\nNucleus\nContains DNA.\nGenetic material\nExact source example');
  });
});
