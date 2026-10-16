import type { Database, SectionExternalVisualRow, SourceFigureRow } from '@stay-focused/db';
import { STUDY_LIMITS, STUDY_TOOLS_PROMPT_VERSION, type StudyToolRequest } from '@stay-focused/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { OpenAIProvider, type OpenAIResponsesClient } from '../providers/openai-provider';
import type { CanonicalReviewerRecord } from './canonical-reviewers';
import { externalVisualId, resolveStudyImage, studyImageData, STUDY_IMAGE_BYTES } from './study-image';
import { generateStudyTool, parseStudyToolRequest } from './study-tools';

const owner = '11111111-1111-4111-8111-111111111111', id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const png = new Blob([new Uint8Array([137,80,78,71,13,10,26,10,1,2,3])]);
const saved = { artifact:{id,user_id:owner,deleted_at:null}, version:{id:'v1',user_id:owner,payload:{reviewer:{sections:[{id:'section',sourceBlockIds:['page-1']}]}}},
  source:{id:'source',user_id:owner,metadata:{reviewerSourceBlocks:[{id:'page-1',text:'Cell diagram',pageNumber:1}]}} } as unknown as CanonicalReviewerRecord;
const base = {userId:owner,artifactId:id,sectionId:'section',saved};
const input: StudyToolRequest = {reviewerId:`artifact:${id}`,sectionId:'section',blockId:'block',contentHash:'1234567890abcdef',promptVersion:STUDY_TOOLS_PROMPT_VERSION,
  selection:'Cell',action:'ask',question:'What is this?',image:{kind:'page_snapshot',id}};
function harness(row: unknown) {
  const eq = vi.fn();
  const query = {select:()=>query,eq,maybeSingle:async()=>({data:row,error:null})}; eq.mockReturnValue(query);
  const download = vi.fn(async()=>({data:png,error:null}));
  const storage = vi.fn(()=>({download}));
  const client = {from:vi.fn(()=>query),storage:{from:storage}} as unknown as SupabaseClient<Database>;
  return {client,eq,download,storage};
}
const ready = {available:true as const,id,url:'https://private.test/signed',page:1,width:300,height:200,sourceLabel:'Lesson'};
const snapshot = vi.fn(async()=>ready);
const row = {id,user_id:owner,source_version_id:'source',page_number:1,status:'ready',storage_path:`${id}/lease.png`};

describe('reference-only image Ask',()=>{
  it('accepts the Ask variant and retains the existing limits',()=>{
    expect(parseStudyToolRequest(input)).toEqual(input);
    expect(()=>parseStudyToolRequest({...input,followUps:Array.from({length:3},()=>({question:'Why?',answer:'Because.'}))})).toThrowError(expect.objectContaining({code:'study_follow_up_limit'}));
    expect(()=>parseStudyToolRequest({...input,question:'x'.repeat(STUDY_LIMITS.question+1)})).toThrowError(expect.objectContaining({code:'study_question_too_long'}));
  });
  it.each([{...input,url:'https://evil.test'}, {...input,bytes:'AAAA'}, {...input,image:{...input.image,url:'https://evil.test'}},
    {...input,image:{kind:'figure',id:'https://evil.test'}}, {...input,action:'define'}, {...input,image:{kind:'unknown',id}}])('rejects arbitrary client image input %j',value=>{
    expect(()=>parseStudyToolRequest(value)).toThrowError(expect.objectContaining({status:400,code:'invalid_request'}));
  });
  it.each([null,{...row,user_id:'another-owner'},{...row,source_version_id:'other'},{...row,page_number:2}])('makes missing, foreign and unrelated snapshot evidence the same 404',async evidence=>{
    const h=harness(evidence);
    await expect(resolveStudyImage(h.client,{...base,image:input.image!},{snapshot})).rejects.toMatchObject({status:404,code:'not_found'});
    expect(h.download).not.toHaveBeenCalled();
  });
  it('loads only owner-bound server storage bytes, without rendering or writes',async()=>{
    const h=harness(row); const result=await resolveStudyImage(h.client,{...base,image:input.image!},{snapshot});
    expect(result.data).toBe(await studyImageData(png));
    expect(h.eq).toHaveBeenCalledWith('user_id',owner);expect(h.eq).toHaveBeenCalledWith('id',id);
    expect(h.eq).toHaveBeenCalledWith('source_version_id','source');expect(h.storage).toHaveBeenCalledWith('source-page-snapshots');
    expect(h.download).toHaveBeenCalledWith(row.storage_path);
    expect(snapshot).toHaveBeenCalledWith(h.client,{userId:owner,artifactId:id,sectionId:'section',render:false});
  });
  it('requires a figure cited by this exact section and complete accepted material',async()=>{
    const h=harness(null);
    const figure={id,user_id:owner,page_number:1,slide_number:null,block_id:null,position:1,storage_path:`${owner}/figure.png`,byte_size:png.size} as SourceFigureRow;
    const materials=vi.fn(async()=>[{figures:[figure],blocks:[],standalonePdf:true}]);
    await resolveStudyImage(h.client,{...base,image:{kind:'figure',id}},{materials});
    expect(h.storage).toHaveBeenCalledWith('source-figures');
    for(const figures of [[],[{...figure,user_id:'another'}],[{...figure,page_number:2}]]) {
      await expect(resolveStudyImage(h.client,{...base,image:{kind:'figure',id}},{materials:async()=>[{figures,blocks:[],standalonePdf:true}]})).rejects.toMatchObject({status:404});
    }
  });
  it('enforces the raster size cap and rejects unsupported content',async()=>{
    await expect(studyImageData(new Blob([new Uint8Array(STUDY_IMAGE_BYTES+1)]))).rejects.toMatchObject({status:422});
    await expect(studyImageData(new Blob(['<svg/>']))).rejects.toMatchObject({status:422});
    const h=harness(row);h.download.mockResolvedValue({data:new Blob([new Uint8Array(STUDY_IMAGE_BYTES+1)]),error:null});
    await expect(resolveStudyImage(h.client,{...base,image:input.image!},{snapshot})).rejects.toMatchObject({status:422});
  });
  it('binds Commons identity to owner, version, section and image revision, retaining attribution',async()=>{
    const row={user_id:owner,artifact_id:id,version_id:'v1',section_id:'section',status:'found',image_url:'https://upload.wikimedia.org/image.png',
      title:'Cell',credit:'Ada',license:'CC BY',updated_at:'2026-10-16'} as SectionExternalVisualRow;
    const h=harness(row);const data=await studyImageData(png);const load=vi.fn(async()=>data);
    const reference={kind:'external_visual' as const,id:externalVisualId(row)};
    const result=await resolveStudyImage(h.client,{...base,image:reference},{load});
    expect(load).toHaveBeenCalledWith(row.image_url);expect(result.context).toContain('Ada');expect(result.context).toContain('Cell');
    for(const other of [{...row,user_id:'other'},{...row,version_id:'other'},{...row,section_id:'other'},{...row,image_url:'https://evil.test/image.png'}]) {
      await expect(resolveStudyImage(harness(other).client,{...base,image:reference},{load})).rejects.toMatchObject({status:404,code:'not_found'});
    }
    await expect(resolveStudyImage(h.client,{...base,image:{...reference,id:'0'.repeat(64)}},{load})).rejects.toMatchObject({status:404});
  });
  it('sends server-fetched image and lesson text through existing vision/structured output path',async()=>{
    const image=await resolveStudyImage(harness(row).client,{...base,image:input.image!},{snapshot});
    const create=vi.fn<OpenAIResponsesClient['responses']['create']>(async()=>({output_text:JSON.stringify({outcome:'answer',grounding:'source',text:'A cell.\n- **Nucleus** holds DNA.'})}));
    const provider=new OpenAIProvider({client:{responses:{create}}});
    const result=await generateStudyTool({request:input,selection:'Cell',image,context:{reviewerTitle:'Cells',sectionTitle:'Cell parts',
      block:{title:'Cell',explanation:'Lesson says nucleus holds DNA.',keyPoints:[],evidence:[]},nearby:['All section text'],sourceExcerpts:[],imageContext:image.context},provider});
    expect(result.grounding).toBe('source');
    const call=create.mock.calls[0]![0];expect(call.instructions).toContain('untrusted');expect(call.instructions).toContain('one short lead');
    expect(call.input).toEqual([{role:'user',content:[{type:'input_text',text:expect.stringContaining('Lesson says nucleus holds DNA.')},{type:'input_image',image_url:image.data,detail:'low'}]}]);
  });
});
