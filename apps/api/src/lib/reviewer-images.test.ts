import { expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@stay-focused/db';
import type { CanonicalReviewerRecord } from './canonical-reviewers';
import { REVIEWER_EXTERNAL_LABEL } from '@stay-focused/shared';
import { readReviewerImages } from './reviewer-images';
import { readSourcePageSnapshots, type SourcePageSnapshotResult } from './source-page-snapshots';
const saved=():CanonicalReviewerRecord=>({artifact:{user_id:'owner',deleted_at:null},version:{user_id:'owner',payload:{reviewer:{sections:[{id:'figure',sourceBlockIds:['page-1']},{id:'page',sourceBlockIds:['page-2']},{id:'other',sourceBlockIds:['page-2']},{id:'pending',sourceBlockIds:['page-3']}]}}},source:{id:'source',user_id:'owner',metadata:{reviewerSourceBlocks:[1,2,3].map(n=>({id:`page-${n}`,pageNumber:n,text:'Synthetic citation'}))}}} as unknown as CanonicalReviewerRecord);
function harness(){
  const canonical=saved(),read=vi.fn(async()=>({ok:true as const,value:canonical})),materials=vi.fn(async()=>[]);
  const figures=vi.fn(async(_client:unknown,input:{sectionId:string})=>({figures:input.sectionId==='figure'?[{id:'f',url:'https://image.test/figure',width:300,height:200,page:1}]:[]}));
  const snapshots=vi.fn(async()=>new Map<string,SourcePageSnapshotResult>([['figure',{available:true,id:'p1',url:'https://image.test/figure-page',width:300,height:200,page:1,sourceLabel:'Synthetic'}],['page',{available:true,id:'p',url:'https://image.test/page',width:300,height:200,page:2,sourceLabel:'Synthetic'}],['pending',{available:true,status:'unrendered',page:3}]]));
  const external=vi.fn(async():Promise<import('./external-visuals/batch').ReviewerVisuals>=>({sections:{other:{status:'found',id:'a'.repeat(64),image:'https://upload.wikimedia.org/cell.png',title:'Cell',credit:'Ada',license:'CC BY',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',sourceUrl:'https://commons.wikimedia.org/wiki/File:Cell.png',label:REVIEWER_EXTERNAL_LABEL,width:300,height:200,attemptCount:1}},checked:4,total:4,running:false}));
  return {canonical,read,materials,figures,snapshots,external};
}
const client={} as SupabaseClient<Database>;
it('returns every section, figures and cached/pending snapshots in one read without render admission',async()=>{
  const h=harness(),result=await readReviewerImages(client,{userId:'owner',artifactId:'artifact'},h);
  expect(result.sections.map(s=>s.sectionId)).toEqual(['figure','page','other','pending']);
  expect(result.sections[0]!.figures[0]!.url).toBe('https://image.test/figure');
  expect(result.sections[0]!.snapshot).toMatchObject({available:true,url:'https://image.test/figure-page'});
  expect(result.sections[1]!.snapshot).toMatchObject({available:true,url:'https://image.test/page'});
  expect(result.sections[3]!.snapshot).toMatchObject({available:true,status:'unrendered'});
  expect(result.sections[2]!.external).toMatchObject({id:'a'.repeat(64),label:REVIEWER_EXTERNAL_LABEL});
  expect(h.read).toHaveBeenCalledOnce();expect(h.materials).toHaveBeenCalledOnce();
  expect(h.snapshots).toHaveBeenCalledExactlyOnceWith(client,h.canonical,'owner',['figure','page','other','pending']);
});
it.each(['artifact','version','source'] as const)('denies another owner on %s before any private image read',async field=>{
  const h=harness();h.canonical[field].user_id='another';
  await expect(readReviewerImages(client,{userId:'owner',artifactId:'artifact'},h)).rejects.toMatchObject({status:404});
  expect(h.materials).not.toHaveBeenCalled();expect(h.figures).not.toHaveBeenCalled();expect(h.snapshots).not.toHaveBeenCalled();expect(h.external).not.toHaveBeenCalled();
});
it('rejects deleted, duplicate or excessive section evidence safely',async()=>{
  const h=harness();h.canonical.artifact.deleted_at='now';await expect(readReviewerImages(client,{userId:'owner',artifactId:'artifact'},h)).rejects.toMatchObject({status:404});
  h.canonical.artifact.deleted_at=null;h.canonical.version.payload={sections:[{id:'s'},{id:'s'}]};
  await expect(readReviewerImages(client,{userId:'owner',artifactId:'artifact'},h)).rejects.toMatchObject({status:503});
  expect(h.materials).not.toHaveBeenCalled();
});
it('bulk snapshot discovery reads exact owner/source once, signs a shared page once, never reserves or dispatches',async()=>{
  const rows=[{id:'snapshot',user_id:'owner',source_version_id:'source',source_snapshot_item_id:null,page_number:2,status:'ready',storage_path:'opaque-private',width:300,height:200}];
  const eq=vi.fn(()=>query),query={select:()=>query,eq,limit:vi.fn(async()=>({data:rows,error:null}))};
  const sign=vi.fn(async()=>({data:{signedUrl:'https://image.test/signed'},error:null})),rpc=vi.fn();
  const db={from:vi.fn(()=>query),rpc,storage:{from:()=>({createSignedUrl:sign})}} as unknown as SupabaseClient<Database>;
  const eligible=vi.fn(async()=>({local:true,itemId:null,sourceLabel:'Synthetic',pageCount:null})),resolve=vi.fn(async()=>({available:true as const,key:'private',bucket:'private'}));
  const result=await readSourcePageSnapshots(db,saved(),'owner',['page','other','pending'],{eligible,resolve});
  expect(result.get('page')).toMatchObject({available:true,url:'https://image.test/signed'});expect(result.get('other')).toEqual(result.get('page'));
  expect(result.get('pending')).toEqual({available:true,status:'unrendered',page:3});
  expect(eq.mock.calls).toEqual([['user_id','owner'],['source_version_id','source']]);
  expect(sign).toHaveBeenCalledExactlyOnceWith('opaque-private',600);expect(resolve).toHaveBeenCalledOnce();expect(rpc).not.toHaveBeenCalled();
  expect(JSON.stringify([...result])).not.toContain('opaque-private');
  rows[0]!.user_id='another';await expect(readSourcePageSnapshots(db,saved(),'owner',['page'],{eligible,resolve})).rejects.toMatchObject({status:503});
  rows[0]!.user_id='owner';rows.push({...rows[0]!,id:'duplicate'});
  await expect(readSourcePageSnapshots(db,saved(),'owner',['page'],{eligible,resolve})).rejects.toMatchObject({status:503});
});
