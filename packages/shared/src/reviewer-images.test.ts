import { afterEach, expect, it, vi } from 'vitest';
import { createReviewerImageLoader, parseReviewerImages, REVIEWER_EXTERNAL_LABEL, type ReviewerImages, type ReviewerReferenceVisual } from './reviewer-images';
const figure={id:'f',url:'https://image.test/figure',width:300,height:200,page:1};
const snapshot={available:true as const,id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',url:'https://image.test/cached',width:300,height:200,page:2,sourceLabel:'Synthetic source'};
const reference:ReviewerReferenceVisual={status:'found',id:'a'.repeat(64),image:'https://upload.wikimedia.org/cell.png',title:'Cell',credit:'Ada',license:'CC BY',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',sourceUrl:'https://commons.wikimedia.org/wiki/File:Cell.png',label:REVIEWER_EXTERNAL_LABEL,width:300,height:200,attemptCount:1};
function fixture():ReviewerImages {return {sections:[
  {sectionId:'figure',hasFigures:true,figures:[figure],snapshot:{available:false,reason:'no_page_source'}},
  {sectionId:'cached',hasFigures:false,figures:[],snapshot},
  {sectionId:'pending',hasFigures:false,figures:[],snapshot:{available:true,status:'unrendered',page:3}},
  {sectionId:'external',hasFigures:false,figures:[],snapshot:{available:false,reason:'not_canvas_pdf'},external:reference},
],external:{checked:4,total:4,running:false}};}
const flush=async()=>{for(let n=0;n<20;n++)await Promise.resolve();};
afterEach(()=>vi.useRealTimers());
it('measures four-section fixture: 2 metadata requests, first cached source URL at response 1, missing URL at response 2',async()=>{
  const request=vi.fn(async(path:string)=>path.endsWith('/figures')?fixture():{...snapshot,page:3,url:'https://image.test/pending'});
  const publish=vi.fn();const controller=new AbortController();
  const loader=createReviewerImageLoader('artifact',request,publish,controller.signal);
  await loader.load();await flush();
  expect(request.mock.calls.map(([path])=>path)).toEqual(['/api/reviewers/artifact/figures','/api/reviewers/artifact/sections/pending/snapshot']);
  expect(publish.mock.calls[0]![0].sections[0].figures[0].url).toBe(figure.url);
  expect(publish.mock.calls[0]![0].sections[1].snapshot.url).toBe(snapshot.url);
  expect(publish.mock.calls[0]![0].sections[3].external.image).toBe(reference.image);
  expect(publish.mock.calls.at(-1)![0].sections[2].snapshot.url).toBe('https://image.test/pending');
  controller.abort();
});
it('bounds all snapshot requests to three, admits once, polls read-only and stops after five polls',async()=>{
  vi.useFakeTimers();const data=fixture();data.sections=Array.from({length:8},(_,n)=>({sectionId:`s${n}`,hasFigures:false,figures:[],snapshot:{available:true,status:'unrendered',page:n+1}}));
  let active=0,peak=0;const release:(()=>void)[]=[];
  const request=vi.fn(async(path:string)=>{
    if(path.endsWith('/figures'))return data;
    peak=Math.max(peak,++active);
    await new Promise<void>(resolve=>release.push(resolve));active--;
    return {available:true,status:'rendering',page:1};
  });
  const controller=new AbortController(),publish=vi.fn();const loader=createReviewerImageLoader('artifact',request,publish,controller.signal);
  await loader.load();expect(active).toBe(3);
  const drain=async()=>{while(release.length){release.splice(0).forEach(resolve=>resolve());await flush();}};
  await drain();expect(peak).toBe(3);expect(request.mock.calls.filter(([path])=>path.endsWith('/snapshot'))).toHaveLength(8);
  for(let n=0;n<5;n++){await vi.advanceTimersByTimeAsync(3000);await drain();}
  expect(request.mock.calls.filter(([path])=>path.endsWith('render=0'))).toHaveLength(40);
  await vi.advanceTimersByTimeAsync(30000);expect(request).toHaveBeenCalledTimes(49);controller.abort();
});
it('refreshes expired source URLs once for the whole reader, even after more failures or a failed refresh',async()=>{
  const data=fixture();data.sections=data.sections.slice(0,2);
  const request=vi.fn(async()=>data),publish=vi.fn(),controller=new AbortController();
  const loader=createReviewerImageLoader('artifact',request,publish,controller.signal);await loader.load();
  await Promise.all([loader.refreshOnce(),loader.refreshOnce(),loader.refreshOnce()]);expect(request).toHaveBeenCalledTimes(2);
  await loader.refreshOnce();expect(request).toHaveBeenCalledTimes(2);
  const failing=vi.fn().mockResolvedValueOnce(data).mockRejectedValue(new Error('private provider error'));
  const second=createReviewerImageLoader('artifact',failing,publish,controller.signal);await second.load();expect(await second.refreshOnce()).toBe(false);
  expect(publish).toHaveBeenLastCalledWith(null);await second.refreshOnce();expect(failing).toHaveBeenCalledTimes(2);controller.abort();
});
it('ignores late responses after abort or a newer load',async()=>{
  let resolve!:(data:ReviewerImages)=>void;const request=vi.fn(()=>new Promise<ReviewerImages>(r=>{resolve=r;}));
  const publish=vi.fn(),controller=new AbortController(),loader=createReviewerImageLoader('old',request,publish,controller.signal);
  const pending=loader.load();controller.abort();resolve(fixture());await pending;expect(publish).not.toHaveBeenCalled();expect(await loader.refreshOnce()).toBe(false);
});
it('retains stored visuals and polls legacy external batches without delaying source URLs',async()=>{
  vi.useFakeTimers();const data=fixture();data.sections=data.sections.slice(0,1);data.external={checked:0,total:1,running:false};
  const request=vi.fn(async(path:string,options:{method?:'POST'})=>path.endsWith('/figures')?data:options.method==='POST'?{started:true}:{sections:{figure:reference},checked:1,total:1,running:false});
  const controller=new AbortController(),publish=vi.fn(),loader=createReviewerImageLoader('artifact',request,publish,controller.signal);
  await loader.load();expect(publish.mock.calls[0]![0].sections[0].figures[0]).toEqual(figure);
  expect(request.mock.calls[1]![1].method).toBe('POST');await vi.advanceTimersByTimeAsync(4000);
  expect(publish.mock.calls.at(-1)![0].sections[0].external).toEqual(reference);
  await vi.advanceTimersByTimeAsync(30000);expect(request).toHaveBeenCalledTimes(3);controller.abort();
});
it('validates sizes, citations, duplicate sections, private URLs and malformed snapshots; isolates a bad external row',()=>{
  expect(parseReviewerImages(fixture())).toEqual(fixture());
  for(const change of [
    (d:ReviewerImages)=>{d.sections=[d.sections[0]!,d.sections[0]!];},
    (d:ReviewerImages)=>{d.sections[0]!.figures=[{...figure,url:'file:///private'}];},
    (d:ReviewerImages)=>{d.sections[0]!.figures=[{...figure,width:0}];},
    (d:ReviewerImages)=>{d.sections[1]!.snapshot={...snapshot,page:101};},
  ]){const data=fixture();change(data);expect(()=>parseReviewerImages(data)).toThrow('reviewer_images_invalid');}
  const data=fixture();data.sections[3]!.external={...reference,image:'https://untrusted.test/image'};
  expect(parseReviewerImages(data).sections[3]!.external).toBeUndefined();
  data.sections[1]!.snapshot={...snapshot,id:'invalid-private-reference'};
  expect(parseReviewerImages(data).sections[1]!.snapshot).not.toHaveProperty('id');
});
