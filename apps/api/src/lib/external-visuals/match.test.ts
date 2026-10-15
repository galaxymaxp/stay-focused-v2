import { describe, expect, it, vi } from 'vitest';
import { OpenAIProvider, ProviderCallError, type OpenAIResponsesClient } from '../../providers';
import { matchVisual, type VisualProvider } from './match';
import type { CommonsCandidate } from './commons';
const candidate:CommonsCandidate={fileTitle:'File:Cell.png',title:'Cell',image:'https://upload.wikimedia.org/image.png',sourceUrl:'https://commons.wikimedia.org/wiki/File:Cell.png',credit:'Ada',license:'CC BY',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',width:1200,height:800};
function provider(verdict:unknown={matches:true,confidence:0.95,reason:'Depicts the described cell structure.'}) {
  return {generateWithImage:vi.fn(async()=>verdict)} as unknown as VisualProvider;
}
describe('external vision match',()=>{
  it('accepts the first passing candidate and sends only section text plus image',async()=>{
    const p=provider();const result=await matchVisual([candidate,{...candidate,fileTitle:'other'}],'Cells contain nuclei.',p);
    expect(result.candidate).toEqual(candidate);expect(result.checkedTitles).toEqual(['File:Cell.png']);
    expect(p.generateWithImage).toHaveBeenCalledOnce();expect(p.generateWithImage).toHaveBeenCalledWith(expect.objectContaining({prompt:'Section text:\nCells contain nuclei.'}),candidate.image);
  });
  it('requires match true and the 0.90 threshold',async()=>{
    for(const verdict of [{matches:true,confidence:0.89,reason:'Related.'},{matches:false,confidence:1,reason:'Does not depict the subject.'}])
      expect((await matchVisual([candidate],'text',provider(verdict))).candidate).toBeNull();
  });
  it('stops after three model calls',async()=>{
    const p=provider({matches:false,confidence:0.1,reason:'Weak match.'});
    expect((await matchVisual(Array.from({length:5},(_,i)=>({...candidate,fileTitle:String(i)})),'text',p)).checkedTitles).toHaveLength(3);
    expect(p.generateWithImage).toHaveBeenCalledTimes(3);
  });
  it.each(['timeout','network'] as const)('fails closed on provider %s',async kind=>{
    const p:VisualProvider={generateWithImage:vi.fn(async()=>{throw new ProviderCallError(kind,{model:'gpt-4o'});})};
    await expect(matchVisual([candidate],'text',p)).rejects.toThrow(`provider_${kind}`);
  });
  it.each([null,{matches:true,confidence:NaN,reason:'ok'},{matches:true,confidence:0.95,reason:'<script>'},{matches:true,confidence:0.95,reason:''}])('rejects malformed structured verdict %j',async verdict=>{
    await expect(matchVisual([candidate],'text',provider(verdict))).rejects.toThrow('visual_verdict_invalid');
  });
  it('extends the existing Responses request without changing text generation',async()=>{
    const create=vi.fn<OpenAIResponsesClient['responses']['create']>(async()=>({output_text:'{"matches":true,"confidence":0.95,"reason":"Cell structure."}'}));
    const p=new OpenAIProvider({client:{responses:{create}}});await matchVisual([candidate],'exact section',p);
    expect(create.mock.calls[0]?.[0]).toMatchObject({model:'gpt-4o',input:[{role:'user',content:[{type:'input_text',text:'Section text:\nexact section'},{type:'input_image',image_url:candidate.image,detail:'low'}]}],text:{format:{strict:true}}});
  });
});
