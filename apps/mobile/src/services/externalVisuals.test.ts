import { createElement } from 'react';
import { act,create,type ReactTestRenderer } from 'react-test-renderer';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { EXTERNAL_IMAGE_HEADERS,EXTERNAL_VISUAL_LABEL,findExternalVisual,parseExternalVisual,parseReviewerVisuals,useReviewerVisuals } from './externalVisuals';
import { apiFoundVisual, apiReviewerVisuals } from './externalVisuals.testSupport';
vi.mock('expo-constants',()=>({default:{expoConfig:{version:'9.8.7'}}}));
const found={status:'found',image:'https://upload.wikimedia.org/image.png',title:'Cell',credit:'Ada',license:'CC BY',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',sourceUrl:'https://commons.wikimedia.org/wiki/File:Cell.png',label:EXTERNAL_VISUAL_LABEL,width:1200,height:800,attemptCount:1};
describe('external visual DTO',()=>{
  it('identifies the real configured app version and existing contact URL',()=>{
    expect(EXTERNAL_IMAGE_HEADERS).toEqual({'User-Agent':'StayFocused/9.8.7 (https://github.com/galaxymaxp/stay-focused-v2)'});
  });
  it('validates the mandatory label/license/host/dimensions/attempt cap',()=>{
    expect(parseExternalVisual(found)).toEqual(found);
    for(const patch of [{label:undefined},{label:'From source'},{image:'https://other.test/image.png'},{sourceUrl:'https://commons.wikimedia.org/other'},{license:'CC BY-NC'},{width:1201},{attemptCount:3}])expect(()=>parseExternalVisual({...found,...patch})).toThrow('visual_invalid');
  });
  it('accepts normalized Commons thumbnails without allowing a redirect host or local file in API data',()=>{
    const thumbnail='https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Cell.svg/1200px-Cell.svg.png';
    expect(parseExternalVisual({...found,image:thumbnail})).toMatchObject({image:thumbnail});
    for(const image of [thumbnail.replace('upload.wikimedia.org','thumb.wikimedia.org'),'https://commons.wikimedia.org/image.png','file:///documents/offline-images/external.png']) {
      expect(()=>parseExternalVisual({...found,image})).toThrow('visual_invalid');
    }
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

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
let tree:ReactTestRenderer|undefined;
const batch={sections:{s:found},checked:1,total:2,running:false};
const fetchMock=vi.fn<typeof fetch>();
const client={baseUrl:'https://api.example.test',accessToken:'jwt',fetchImpl:fetchMock};
function Loader({id='artifact',offline=false,token='jwt'}:{id?:string|null;offline?:boolean;token?:string}) {
  return createElement('Visuals',{sections:useReviewerVisuals(token==='jwt'?client:{...client,accessToken:token},id,offline)});
}
async function mount(props:Parameters<typeof Loader>[0]={}) {await act(async()=>{tree=create(createElement(Loader,props));});}
async function tick(n=1) {for(let i=0;i<n;i++)await act(async()=>{await vi.advanceTimersByTimeAsync(4000);});}
const getCalls=()=>fetchMock.mock.calls.filter(([,init])=>init?.method==='GET');
const postCalls=()=>fetchMock.mock.calls.filter(([,init])=>init?.method==='POST');
afterEach(async()=>{if(tree)await act(async()=>tree!.unmount());tree=undefined;vi.useRealTimers();fetchMock.mockReset();});
describe('reviewer batch lifecycle',()=>{
  it('validates found-only section maps and bounded integer counts',()=>{
    expect(parseReviewerVisuals(batch).sections.s).toEqual(found);
    for(const value of [{...batch,checked:-1},{...batch,total:1.5},{...batch,running:1},{...batch,sections:[]},
      ])expect(()=>parseReviewerVisuals(value)).toThrow('visual_invalid');
  });
  it('drops malformed entries individually without weakening found visual validation',()=>{
    const sections={...apiReviewerVisuals.sections,
      badUrl:{...apiFoundVisual,image:'https://other.test/image.png'},
      badLabel:{...apiFoundVisual,label:'From source'},
      badWidth:{...apiFoundVisual,width:null},badHeight:{...apiFoundVisual,height:10001},
      badAttempt:{...apiFoundVisual,attemptCount:3},badLicense:{...apiFoundVisual,license:'CC BY-NC'},
      none:{status:'none',message:'No reliable visual found',attemptCount:1},
      'invalid/id':apiFoundVisual,
    };
    expect(parseReviewerVisuals({...apiReviewerVisuals,sections})).toEqual(apiReviewerVisuals);
    expect(parseReviewerVisuals({...apiReviewerVisuals,sections:{bad:null}}).sections).toEqual({});
  });
  it('renders valid sections and continues a running mixed batch without admitting section searches',async()=>{
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(Response.json({ok:true,data:{...apiReviewerVisuals,
      sections:{...apiReviewerVisuals.sections,bad:{...apiFoundVisual,width:null}}}}));
    await mount();
    expect(tree!.root.findByType('Visuals' as never).props.sections).toEqual(apiReviewerVisuals.sections);
    fetchMock.mockResolvedValue(Response.json({ok:true,data:{...apiReviewerVisuals,checked:2,running:false}}));
    await tick();expect(getCalls()).toHaveLength(2);expect(postCalls()).toHaveLength(0);
    expect(tree!.root.findByType('Visuals' as never).props.sections).toEqual(apiReviewerVisuals.sections);
  });
  it('starts exactly one POST for incomplete idle batches then stops after four idle polls',async()=>{
    vi.useFakeTimers();fetchMock.mockImplementation(async()=>Response.json({ok:true,data:batch}));await mount();
    await tick(10);expect(postCalls()).toHaveLength(1);expect(postCalls()[0]?.[1]?.body).toBe('{}');expect(getCalls()).toHaveLength(5);
    expect(tree!.root.findByType('Visuals' as never).props.sections.s).toEqual(found);
  });
  it('does not POST an already running batch and stops after sixty polls',async()=>{
    vi.useFakeTimers();fetchMock.mockImplementation(async()=>Response.json({ok:true,data:{...batch,running:true}}));await mount();
    await tick(65);expect(postCalls()).toHaveLength(0);expect(getCalls()).toHaveLength(61);
  });
  it('does not poll or POST a completed initial batch',async()=>{
    vi.useFakeTimers();fetchMock.mockImplementation(async()=>Response.json({ok:true,data:{...batch,checked:2}}));await mount();await tick(5);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it.each([{offline:true},{id:null},{token:''}])('does not use the network for %j',async props=>{
    await mount(props);expect(fetchMock).not.toHaveBeenCalled();expect(tree!.root.findByType('Visuals' as never).props.sections).toBeNull();
  });
  it('aborts the old artifact and ignores its late result',async()=>{
    let resolve!:(r:Response)=>void;fetchMock.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));await mount();
    const signal=fetchMock.mock.calls[0]?.[1]?.signal;
    fetchMock.mockImplementation(async()=>Response.json({ok:true,data:{...batch,checked:2,sections:{}}}));
    await act(async()=>tree!.update(createElement(Loader,{id:'other'})));expect(signal?.aborted).toBe(true);
    await act(async()=>resolve(Response.json({ok:true,data:batch})));
    expect(tree!.root.findByType('Visuals' as never).props.sections).toEqual({});expect(postCalls()).toHaveLength(0);
  });
  it('aborts and cancels pending polling on unmount or offline transition',async()=>{
    vi.useFakeTimers();fetchMock.mockImplementation(async()=>Response.json({ok:true,data:{...batch,running:true}}));await mount();
    await act(async()=>tree!.update(createElement(Loader,{offline:true})));await tick(5);expect(fetchMock).toHaveBeenCalledOnce();
    expect(tree!.root.findByType('Visuals' as never).props.sections).toBeNull();
    await act(async()=>tree!.update(createElement(Loader)));await act(async()=>tree!.unmount());tree=undefined;await tick(5);expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('does not retry a failed batch admission',async()=>{
    vi.useFakeTimers();fetchMock.mockImplementation(async(_url,init)=>init?.method==='POST'?Response.json({}, {status:500}):Response.json({ok:true,data:batch}));
    await mount();await tick(5);expect(postCalls()).toHaveLength(1);expect(getCalls()).toHaveLength(1);
  });
});
