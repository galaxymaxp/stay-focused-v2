import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ReviewerImages } from '@stay-focused/shared';
const mocks=vi.hoisted(()=>({api:vi.fn(),owner:'owner',online:true}));
vi.mock('../../components/providers',()=>({useAuth:()=>({api:mocks.api,session:{user:{id:mocks.owner}}})}));
vi.mock('../../components/ui',()=>({Icon:'i'}));
import { SectionVisual } from './section-visual';
import { useReviewerImages } from './use-reviewer-images';
const fixture=(suffix=''):ReviewerImages=>({sections:Array.from({length:4},(_,n)=>({sectionId:`s${n}`,hasFigures:true,figures:[{id:`f${n}`,url:`https://image.test/${n}${suffix}`,width:300,height:200,page:n+1}],snapshot:{available:false,reason:'no_page_source'}})),external:{checked:4,total:4,running:false}});
function Reader({artifactId='artifact'}:{artifactId?:string}) {
  const images=useReviewerImages(artifactId);
  return createElement('main',{},...images.data?.sections.map((visual,n)=>createElement(SectionVisual,{key:visual.sectionId,artifactId,sectionId:visual.sectionId,visual,eagerCount:Math.max(0,2-n),refreshOnce:images.refreshOnce}))??[]);
}
let tree:ReactTestRenderer|undefined,win:EventTarget;
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});mocks.api.mockReset();mocks.online=true;mocks.owner='owner';win=new EventTarget();vi.stubGlobal('window',win);vi.stubGlobal('navigator',{get onLine(){return mocks.online;}});});
afterEach(async()=>{if(tree)await act(async()=>tree!.unmount());tree=undefined;vi.unstubAllGlobals();});
it('makes one request on open, renders offscreen URLs without IntersectionObserver, and assigns eager/lazy async images with reserved boxes',async()=>{
  mocks.api.mockResolvedValue(fixture());
  await act(async()=>{tree=create(createElement(Reader),{createNodeMock:()=>({close(){}})});});
  expect(mocks.api.mock.calls.map(([path])=>path)).toEqual(['/api/reviewers/artifact/figures']);
  const images=tree!.root.findAllByType('img');expect(images).toHaveLength(4);
  expect(images.map(n=>n.props.loading)).toEqual(['eager','eager','lazy','lazy']);
  expect(images.every(n=>n.props.decoding==='async')).toBe(true);
  expect(images.every(n=>n.parent!.props.style.aspectRatio==='16 / 10')).toBe(true);
});
it('treats source image failures (including 403/expired signatures) as one shared refresh, then shows unavailable without retry loops',async()=>{
  mocks.api.mockResolvedValueOnce(fixture()).mockResolvedValue(fixture('-fresh'));
  await act(async()=>{tree=create(createElement(Reader),{createNodeMock:()=>({close(){}})});});
  const stale=tree!.root.findAllByType('img');
  await act(async()=>{await Promise.all(stale.slice(0,2).map(n=>n.props.onError({status:403})));});
  expect(mocks.api).toHaveBeenCalledTimes(2);
  expect(tree!.root.findAllByType('img').every(n=>n.props.src.endsWith('-fresh'))).toBe(true);
  await act(async()=>tree!.root.findAllByType('img')[0]!.props.onError({status:403}));
  expect(mocks.api).toHaveBeenCalledTimes(2);expect(JSON.stringify(tree!.toJSON())).toContain('Image unavailable');
});
it('clears private URLs offline and on identity changes, aborting old loads',async()=>{
  mocks.api.mockResolvedValue(fixture());await act(async()=>{tree=create(createElement(Reader),{createNodeMock:()=>({close(){}})});});
  await act(async()=>{mocks.online=false;win.dispatchEvent(new Event('offline'));});expect(tree!.root.findAllByType('img')).toHaveLength(0);
  expect(mocks.api.mock.calls[0]![1].signal.aborted).toBe(true);
  await act(async()=>{mocks.online=true;win.dispatchEvent(new Event('online'));});expect(mocks.api).toHaveBeenCalledTimes(2);
  let resolve!:(data:ReviewerImages)=>void;mocks.api.mockReturnValue(new Promise(r=>{resolve=r;}));
  await act(async()=>{mocks.owner='different';tree!.update(createElement(Reader));});expect(tree!.root.findAllByType('img')).toHaveLength(0);
  const signal=mocks.api.mock.calls.at(-1)![1].signal;await act(async()=>tree!.update(createElement(Reader,{artifactId:'other'})));expect(signal.aborted).toBe(true);
  await act(async()=>resolve(fixture('-other')));expect(mocks.api.mock.calls.at(-1)![0]).toBe('/api/reviewers/other/figures');
});
