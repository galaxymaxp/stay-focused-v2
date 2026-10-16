import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { StudyImageTarget } from '@stay-focused/shared';
const mocks=vi.hoisted(()=>({api:vi.fn(),download:vi.fn(),online:true}));
vi.mock('./download-image',()=>({downloadStudyImage:mocks.download}));
vi.mock('../../components/providers',()=>({useAuth:()=>({api:mocks.api,session:{user:{id:'owner'}}})}));
vi.mock('../../components/ui',()=>({Icon:'i'}));
vi.mock('../../lib/hooks',()=>({useResource:()=>({})}));
const {SectionVisual}=await import('./section-visual');
let tree:ReactTestRenderer|undefined, win:EventTarget;
const close=vi.fn(), showModal=vi.fn();
beforeEach(()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});mocks.online=true;mocks.api.mockReset();win=new EventTarget();
  vi.stubGlobal('window',win);vi.stubGlobal('navigator',{get onLine(){return mocks.online;}});
  vi.stubGlobal('IntersectionObserver',class {constructor(private callback:IntersectionObserverCallback){} observe(){this.callback([{isIntersecting:true}] as IntersectionObserverEntry[],this as unknown as IntersectionObserver);} disconnect(){}});
});
afterEach(async()=>{if(tree)await act(async()=>tree!.unmount());tree=undefined;vi.unstubAllGlobals();vi.clearAllMocks();});
function asks(){return tree!.root.findAllByType('button').filter(n=>[n.props.children].flat().includes('Ask about this image'));}
it.each(['figure','page_snapshot','external_visual'] as const)('opens the same exact %s reference from inline and zoom, disables offline without model calls',async kind=>{
  const image:StudyImageTarget={reference:{kind,id:kind==='external_visual'?'a'.repeat(64):'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'},thumbnail:'https://image.test/short',label:'Cell'};
  const external={status:'found' as const,id:image.reference.id,image:image.thumbnail,title:'Cell',credit:'Ada',license:'CC BY',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',sourceUrl:'https://commons.wikimedia.org/wiki/File:Cell.png',label:'External reference',attemptCount:1};
  mocks.api.mockImplementation(async(path:string)=>path.endsWith('/figures')?{figures:[{id:image.reference.id,url:image.thumbnail,page:1}]}:kind==='page_snapshot'?{available:true,id:image.reference.id,page:1,url:image.thumbnail}:{available:false});
  const onAsk=vi.fn();
  await act(async()=>{tree=create(createElement(SectionVisual,{artifactId:'artifact',sectionId:'section',reviewerTitle:'Biology',sectionTitle:'Cells',hasFigures:kind==='figure',...(kind==='external_visual'?{external}:{}),onAsk}),{createNodeMock:element=>element.type==='dialog'?{close,showModal}: {}});});
  const inline=asks().find(n=>!n.props.disabled)!;expect(inline).toBeDefined();await act(async()=>inline.props.onClick());
  expect(onAsk).toHaveBeenLastCalledWith(expect.objectContaining({reference:image.reference,thumbnail:image.thumbnail}));
  const enlarge=tree!.root.findAllByType('button').find(n=>n.props['aria-label']?.startsWith('Enlarge'))!;
  await act(async()=>enlarge.props.onClick());await act(async()=>asks().at(-1)!.props.onClick());
  const save=tree!.root.findAllByType('button').find(n=>[n.props.children].flat().includes('Save image'))!;
  expect(save.props.disabled).toBe(false);await act(async()=>save.props.onClick());
  expect(mocks.download).toHaveBeenCalledWith({uri:image.thumbnail,reviewerTitle:'Biology',sectionTitle:'Cells',kind,...(kind==='external_visual'?{sourceTitle:'Cell',attribution:'Ada · CC BY'}:{})});
  expect(onAsk).toHaveBeenCalledTimes(2);expect(close).toHaveBeenCalled();
  await act(async()=>{mocks.online=false;win.dispatchEvent(new Event('offline'));});
  expect(asks().every(n=>n.props.disabled)).toBe(true);expect(JSON.stringify(tree!.toJSON())).toContain('Reconnect');
  expect(tree!.root.findAllByType('button').find(n=>[n.props.children].flat().includes('Save image'))!.props.disabled).toBe(true);
  expect(mocks.api.mock.calls.every(([path])=>!String(path).includes('/experience/study-tools'))).toBe(true);
});
