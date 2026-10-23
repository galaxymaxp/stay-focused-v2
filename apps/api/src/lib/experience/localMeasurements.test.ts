import { strict as assert } from 'node:assert';
import {it,expect} from 'vitest';
import {localMeasurements,type LocalMeasurement} from '@stay-focused/shared';
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@stay-focused/db';
import type { LibraryArtifactSummary } from '@stay-focused/shared';
import { experienceRepository, trustedExperienceReadRepository } from './repository';

// Public synthetic in-memory PostgREST adapter. No SDK client or service created.

type Row = Record<string, unknown>;
const stamp = '2026-10-15T00:00:00.000Z';
const summary = (index: number): LibraryArtifactSummary => ({id:`artifact:synthetic-${index}`,type:'reviewer',title:`Synthetic ${index}`,course:null,sourceId:null,sourceTitle:'Public synthetic text',activityId:null,createdAt:stamp,updatedAt:stamp,lastOpenedAt:null,status:'completed',relatedArtifactIds:[]});
it.each([false,true])('preserves complete trusted-owner pagination, history and denial with instrumentation enabled=%s',async(enabled)=>{
for (const size of [0,100,240,300]) for (const history of [0,1000]) {
  const events:LocalMeasurement[]=[]; let tick=0; const now=()=>tick+=3;
  const remove=enabled?localMeasurements.observe({now,sink:event=>{events.push(event);}}):()=>undefined;
  try {
  const expected = Array.from({length:size},(_,index)=>summary(index)).sort((a,b)=>a.id.localeCompare(b.id));
  const rows: Row[] = [
    ...expected.map(item=>({id:item.id,user_id:'synthetic-owner',summary:item,superseded:false,updated_at:stamp})),
    ...Array.from({length:history},(_,index)=>({id:`artifact:hidden-${index}`,user_id:'synthetic-owner',superseded:true,updated_at:stamp})),
    {id:'foreign',user_id:'other-owner',superseded:false,updated_at:stamp,summary:summary(-1)},
  ];
  let reads=0,failHidden=false;
  const columnsSeen: string[]=[];
  const client={from(_table:string) {
    let columns='*',start=0,end=Infinity;
    const filters: Array<(row:Row)=>boolean>=[];
    const order: Array<{key:string;ascending:boolean}>=[];
    let hidden=false;
    const run=()=>{
      reads++;
      columnsSeen.push(columns);
      if(hidden && failHidden) return {data:null,error:{code:'synthetic_failure'}};
      const data=rows.filter(row=>filters.every(test=>test(row))).sort((a,b)=>{
        for(const sort of order){const delta=String(a[sort.key]).localeCompare(String(b[sort.key]));if(delta)return sort.ascending?delta:-delta;}return 0;
      }).slice(start,end+1).map(row=>Object.fromEntries(columns.split(',').map(key=>[key,row[key]])));
      return {data,error:null};
    };
    const query={select(value:string){columns=value;return query;},eq(key:string,value:unknown){if(key==='superseded')hidden=value===true;filters.push(row=>row[key]===value);return query;},order(key:string,options?:{ascending?:boolean}){order.push({key,ascending:options?.ascending!==false});return query;},range(from:number,to:number){start=from;end=to;return query;},then<T>(fn:(value:ReturnType<typeof run>)=>T){return Promise.resolve(run()).then(fn);}};
    return query;
  }} as unknown as SupabaseClient<Database>;
  const repository=trustedExperienceReadRepository(client,'synthetic-owner');
  const got: LibraryArtifactSummary[]=[];
  let pages=0;
  for(let offset:number|null=0;offset!==null;) {
    const page=await repository.libraryPage!('other-owner',{limit:100,offset});
    got.push(...page.items); pages++; offset=page.nextOffset;
    assert.deepEqual(page.supersededReviewerIds,Array.from({length:history},(_,index)=>`artifact:hidden-${index}`).sort((a,b)=>a.localeCompare(b)));
  }
  assert.deepEqual(got,expected);
  assert(columnsSeen.every(columns=>!columns.includes('payload') && columns!=='*'));
  const resultSha256=createHash('sha256').update(JSON.stringify(got)).digest('hex');
  expect(reads).toBe((size>100?3:1)*(history?7:2));
  expect(events).toEqual(enabled?Array.from({length:pages},(_,index)=>({name:'api.library_page',outcome:'success',durationMs:3,count:Math.min(100,Math.max(0,size-index*100))})):[]);
  expect(resultSha256).toBe(createHash('sha256').update(JSON.stringify(expected)).digest('hex'));
  expect(JSON.stringify(events)).not.toMatch(/synthetic|other-owner|artifact:|hidden-/);
  failHidden=true;
  await assert.rejects(()=>experienceRepository(client).libraryPage!('synthetic-owner',{limit:100}),error=>error instanceof Error && error.message.length>0);
  if(enabled)expect(events.at(-1)).toEqual({name:'api.library_page',outcome:'error',durationMs:3});
  }finally{remove();}
}
});

it('preserves invalid-filter and provider rejection identity with a failing observer',async()=>{
 const failure=new Error('private provider query');
 const client={from(){throw failure;}} as unknown as SupabaseClient<Database>;
 const events:LocalMeasurement[]=[];const remove=localMeasurements.observe({now:()=>1,sink:async event=>{events.push(event);throw new Error('private sink');}});
 try {
  const repository=trustedExperienceReadRepository(client,'private-owner');
  await expect(repository.libraryPage!('spoofed-owner',{limit:100})).rejects.toBe(failure);
  await expect(repository.libraryPage!('spoofed-owner',{limit:101})).rejects.toMatchObject({code:'invalid_request'});
  expect(events).toEqual(Array.from({length:2},()=>({name:'api.library_page',outcome:'error',durationMs:0})));
  expect(JSON.stringify(events)).not.toMatch(/private|owner|query/);
 }finally{remove();}
});
