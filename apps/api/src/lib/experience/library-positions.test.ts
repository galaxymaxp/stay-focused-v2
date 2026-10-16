import { describe, expect, it } from 'vitest';
import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LibraryArtifactSummary } from '@stay-focused/shared';
import { libraryPositions } from './library-positions';
import { experienceRepository, trustedExperienceReadRepository } from './repository';
const summary: LibraryArtifactSummary = { id:'artifact:r',type:'reviewer',title:'R',course:{id:'c',name:'Course',code:null},sourceId:'s',sourceType:'canvas_file',sourceMaterialId:'file:f',sourceTitle:null,activityId:null,createdAt:'2026-01-01',updatedAt:'2026-01-01',lastOpenedAt:null,status:'completed',relatedArtifactIds:[] };
type Row = Record<string, unknown>;
function fixture() {
  const base={user_id:'owner',course_id:'c',canvas_connection_id:'connection'};
  const tables: Record<string, Row[]>={
    experience_library_v1:[{id:summary.id,user_id:'owner',summary,superseded:false}],
    canvas_courses:[{id:'c',user_id:'owner',canvas_connection_id:'connection'}],
    canvas_modules:[{...base,id:'m',position:2},{...base,id:'first',position:1}],
    canvas_module_items:[{...base,id:'late',module_id:'m',position:1,item_type:'File',canvas_content_id:'canvas-f'}, {...base,id:'early',module_id:'first',position:9,item_type:'File',canvas_content_id:'canvas-f'}],
    canvas_files:[{...base,id:'f',canvas_file_id:'canvas-f'}],canvas_pages:[],canvas_assignments:[],
  };
  const calls: {table:string;select:string;predicates:Record<string,unknown>;start:number}[]=[];
  let failTable='';
  const client={from(table:string) {
    const predicates:Record<string,unknown>={}; let select='',start=0,end=0;
    const query={select(value:string){select=value;return query;},eq(key:string,value:unknown){predicates[key]=value;return query;},filter(key:string,operator:string,value:unknown){if(operator!=='eq')throw Error('unsupported');predicates[key]=value;return query;},order(){return query;},range(a:number,b:number){start=a;end=b;return query;},
      then<T>(resolve:(result:{data:Row[]|null;error:unknown})=>T){
        calls.push({table,select,predicates,start});
        const rows=(tables[table]??[]).filter(row=>Object.entries(predicates).every(([key,value])=>row[key]===value));
        return Promise.resolve(table===failTable?{data:null,error:{message:'PRIVATE'}}:{data:rows.slice(start,end+1),error:null}).then(resolve);
      }};return query;
  }} as unknown as SupabaseClient<Database>;
  return {tables,calls,client,base,fail:(table:string)=>{failTable=table;}};
}
describe('owner Library Canvas projection',()=>{
  it('projects earliest module then item position through the real repository and trusted owner boundary',async()=>{
    const f=fixture();
    const repo=trustedExperienceReadRepository(f.client,'owner');
    expect((await repo.libraryPage!('attacker',{limit:100})).items[0]?.sourcePosition).toEqual({moduleIndex:1,itemIndex:9});
    expect(f.calls.every(call=>call.predicates.user_id==='owner')).toBe(true);
    expect(f.calls.filter(call=>call.table.startsWith('canvas_')).every(call=>!call.select.includes('*'))).toBe(true);
    expect((await experienceRepository(f.client).libraryPage!('other',{})).items).toEqual([]);
  });
  it.each(['canvas_modules','canvas_module_items','canvas_files','canvas_courses'])('rejects foreign owner/course/connection evidence in %s',async table=>{
    for(const key of ['user_id','course_id','canvas_connection_id']) {
      if(table==='canvas_courses'&&key==='course_id')continue;
      const f=fixture(); f.tables[table]=f.tables[table]!.map(row=>({...row,[key]:'other'}));
      expect((await libraryPositions(f.client,'owner',[summary]))[0]?.sourcePosition).toBeNull();
    }
  });
  it('returns null for manual, mixed and unplaced summaries without reading source bodies',async()=>{
    const f=fixture();
    const manual={...summary,course:null,sourceType:'text' as const,sourceMaterialId:null};
    expect((await libraryPositions(f.client,'owner',[manual]))[0]?.sourcePosition).toBeNull(); expect(f.calls).toEqual([]);
    expect((await libraryPositions(f.client,'owner',[{...summary,sourceType:'canvas_mixed'}]))[0]?.sourcePosition).toBeNull();
    f.tables.canvas_module_items=[];
    expect((await libraryPositions(f.client,'owner',[summary]))[0]?.sourcePosition).toBeNull();
  });
  it('resolves pages by URL or Canvas ID and assignments by Canvas ID',async()=>{
    for(const kind of ['Page','Assignment']) {
      const f=fixture(); const prefix=kind.toLowerCase();
      f.tables.canvas_module_items=[{...f.base,id:'i',module_id:'first',position:2,item_type:kind,canvas_content_id:'canvas-source',page_url:'lesson'}];
      f.tables[kind==='Page'?'canvas_pages':'canvas_assignments']=[{...f.base,id:'p',canvas_page_id:'canvas-source',canvas_page_url:'lesson',canvas_assignment_id:'canvas-source'}];
      expect((await libraryPositions(f.client,'owner',[{...summary,sourceMaterialId:prefix+':p'}]))[0]?.sourcePosition).toEqual({moduleIndex:1,itemIndex:2});
    }
  });
  it('walks all synced metadata pages and fails safely on failed/over-bound evidence',async()=>{
    const f=fixture();f.tables.canvas_module_items=[...Array.from({length:200},(_,i)=>({...f.base,id:'irrelevant'+i,module_id:'m',position:i,item_type:'File',canvas_content_id:'unrelated'})),...f.tables.canvas_module_items!];
    expect((await libraryPositions(f.client,'owner',[summary]))[0]?.sourcePosition).toEqual({moduleIndex:1,itemIndex:9});
    expect(f.calls.some(call=>call.table==='canvas_module_items'&&call.start===200)).toBe(true);
    f.fail('canvas_modules');await expect(libraryPositions(f.client,'owner',[summary])).rejects.toMatchObject({status:503,code:'unavailable'});
  });
  it('uses item position for repeated placements within the same module',async()=>{
    const f=fixture();f.tables.canvas_module_items!.push({...f.base,id:'earliest',module_id:'first',position:2,item_type:'File',canvas_content_id:'canvas-f'});
    expect((await libraryPositions(f.client,'owner',[summary]))[0]?.sourcePosition).toEqual({moduleIndex:1,itemIndex:2});
  });
  it('fails at the bounded metadata ceiling instead of accepting an incomplete walk',async()=>{
    const f=fixture();f.tables.canvas_module_items=Array.from({length:10_000},(_,i)=>({...f.base,id:'i'+i,module_id:'m',position:i,item_type:'File',canvas_content_id:'canvas-f'}));
    await expect(libraryPositions(f.client,'owner',[summary])).rejects.toMatchObject({status:503,code:'unavailable'});
  });
  it('ignores missing and invalid numeric positions',async()=>{
    const f=fixture();f.tables.canvas_modules=f.tables.canvas_modules!.map(row=>({...row,position:null}));
    expect((await libraryPositions(f.client,'owner',[summary]))[0]?.sourcePosition).toBeNull();
  });
});
