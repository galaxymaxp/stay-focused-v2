import { describe, expect, it, vi } from 'vitest';
import { OpenAIProvider, ProviderCallError, type OpenAIResponsesClient } from '../../providers';
import { loadImageData, matchVisual, VISUAL_IMAGE_BYTES, type VisualProvider } from './match';
import type { CommonsCandidate } from './commons';
const candidate:CommonsCandidate={fileTitle:'File:Cell.png',title:'Cell.png',image:'https://upload.wikimedia.org/image.png',sourceUrl:'https://commons.wikimedia.org/wiki/File:Cell.png',credit:'Ada',license:'CC BY',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',width:1200,height:800};
const other={...candidate,fileTitle:'File:Other.png',title:'Other.png',image:'https://upload.wikimedia.org/other.png'};
const data='data:image/png;base64,AAAA';
const load=vi.fn(async()=>data);
function provider(verdict:unknown={bestImage:2,confidence:0.8,reason:'Shows the described cell structure.'}) {
  return {generateWithImages:vi.fn(async()=>verdict)} as unknown as VisualProvider;
}
describe('external vision match',()=>{
  it('bounds streamed Commons bytes even without a content-length header',async()=>{
    const cancel=vi.fn();
    const stream=new ReadableStream<Uint8Array>({pull(controller){controller.enqueue(new Uint8Array(VISUAL_IMAGE_BYTES+1));},cancel});
    const fetcher=vi.fn(async()=>new Response(stream,{headers:{'content-type':'image/png'}}));
    vi.stubGlobal('fetch',fetcher);
    try {expect(await loadImageData(candidate.image)).toBeNull();expect(cancel).toHaveBeenCalledOnce();
      expect(fetcher).toHaveBeenCalledWith(candidate.image,expect.objectContaining({redirect:'error'}));
    } finally {vi.unstubAllGlobals();}
  });
  it('compares candidates in one call and returns the chosen image',async()=>{
    const p=provider();const result=await matchVisual([candidate,other],'Cells contain nuclei.',p,load);
    expect(result.candidate).toEqual(other);expect(result.checkedTitles).toEqual(['File:Other.png']);
    expect(p.generateWithImages).toHaveBeenCalledOnce();
    expect(p.generateWithImages).toHaveBeenCalledWith(expect.objectContaining({prompt:expect.stringContaining('Section text:\nCells contain nuclei.')}),[data,data]);
  });
  it('rejects bestImage 0 and low confidence, recording every checked title',async()=>{
    for(const verdict of [{bestImage:1,confidence:0.4,reason:'Loosely related.'},{bestImage:0,confidence:0.9,reason:'None fit.'}]) {
      const result=await matchVisual([candidate,other],'text',provider(verdict),load);
      expect(result.candidate).toBeNull();expect(result.checkedTitles).toEqual(['File:Cell.png','File:Other.png']);
    }
  });
  it('skips images that fail to load and fails closed when none load',async()=>{
    const partial=vi.fn(async(url:string)=>url.endsWith('other.png')?data:null);
    const p=provider({bestImage:1,confidence:0.9,reason:'Matches.'});
    expect((await matchVisual([candidate,other],'text',p,partial)).candidate).toEqual(other);
    await expect(matchVisual([candidate],'text',p,async()=>null)).rejects.toThrow('visual_images_unavailable');
  });
  it.each(['timeout','network'] as const)('fails closed on provider %s',async kind=>{
    const p:VisualProvider={generateWithImages:vi.fn(async()=>{throw new ProviderCallError(kind,{model:'gpt-4o'});})};
    await expect(matchVisual([candidate],'text',p,load)).rejects.toThrow(`provider_${kind}`);
  });
  it.each([null,{bestImage:1,confidence:NaN,reason:'ok'},{bestImage:1,confidence:0.95,reason:'<script>'},{bestImage:5,confidence:0.95,reason:'ok'},{bestImage:1,confidence:0.95,reason:''}])('rejects malformed structured verdict %j',async verdict=>{
    await expect(matchVisual([candidate],'text',provider(verdict),load)).rejects.toThrow('visual_verdict_invalid');
  });
  it('extends the existing Responses request with several low-detail images',async()=>{
    const create=vi.fn<OpenAIResponsesClient['responses']['create']>(async()=>({output_text:'{"bestImage":1,"confidence":0.95,"reason":"Cell structure."}'}));
    const p=new OpenAIProvider({client:{responses:{create}}});await matchVisual([candidate,other],'exact section',p,load);
    expect(create.mock.calls[0]?.[0]).toMatchObject({model:'gpt-4o',input:[{role:'user',content:[{type:'input_text'},{type:'input_image',image_url:data,detail:'low'},{type:'input_image',image_url:data,detail:'low'}]}],text:{format:{strict:true}}});
  });
});
