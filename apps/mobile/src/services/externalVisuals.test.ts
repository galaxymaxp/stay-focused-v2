import { describe,expect,it,vi } from 'vitest';
import { EXTERNAL_VISUAL_LABEL,findExternalVisual,parseExternalVisual } from './externalVisuals';
const found={status:'found',image:'https://upload.wikimedia.org/image.png',title:'Cell',credit:'Ada',license:'CC BY',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',sourceUrl:'https://commons.wikimedia.org/wiki/File:Cell.png',label:EXTERNAL_VISUAL_LABEL,width:1200,height:800,attemptCount:1};
describe('external visual DTO',()=>{
  it('validates the mandatory label/license/host/dimensions/attempt cap',()=>{
    expect(parseExternalVisual(found)).toEqual(found);
    for(const patch of [{label:undefined},{label:'From source'},{image:'https://other.test/image.png'},{sourceUrl:'https://commons.wikimedia.org/other'},{license:'CC BY-NC'},{width:1201},{attemptCount:3}])expect(()=>parseExternalVisual({...found,...patch})).toThrow('visual_invalid');
  });
  it('validates the honest no-result copy',()=>{
    expect(parseExternalVisual({status:'none',message:'No reliable visual found',attemptCount:2})).toEqual({status:'none',message:'No reliable visual found',attemptCount:2});
    expect(()=>parseExternalVisual({status:'none',message:'weak match',attemptCount:1})).toThrow();
  });
  it('POSTs only on explicit call with bearer and findAnother',async()=>{
    const fetchMock=vi.fn(async(_input:unknown,_init:unknown)=>Response.json({ok:true,data:found}));
    const fetchImpl:typeof fetch=(input,init)=>fetchMock(input,init);
    await findExternalVisual({baseUrl:'https://api.example.test',accessToken:'jwt',fetchImpl},'artifact','s',true);
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.test/api/reviewers/artifact/sections/s/external-visual',expect.objectContaining({method:'POST',headers:expect.objectContaining({Authorization:'Bearer jwt'}),body:'{"findAnother":true}'}));
  });
});
