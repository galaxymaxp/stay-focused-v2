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
  vi.stubGlobal('ResizeObserver',class { observe(){} disconnect(){} });
  vi.stubGlobal('getComputedStyle',()=>({width:'400px',height:'300px'}));
  vi.stubGlobal('IntersectionObserver',class {constructor(private callback:IntersectionObserverCallback){} observe(){this.callback([{isIntersecting:true}] as IntersectionObserverEntry[],this as unknown as IntersectionObserver);} disconnect(){}});
});
afterEach(async()=>{if(tree)await act(async()=>tree!.unmount());tree=undefined;vi.unstubAllGlobals();vi.clearAllMocks();});
function asks(){return tree!.root.findAllByType('button').filter(n=>[n.props.children].flat().includes('Ask about this image'));}
it.each(['figure','page_snapshot','external_visual'] as const)('opens the same exact %s reference from inline and zoom, disables offline without model calls',async kind=>{
  const image:StudyImageTarget={reference:{kind,id:kind==='external_visual'?'a'.repeat(64):'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'},thumbnail:'https://image.test/short',label:'Cell'};
  const external={status:'found' as const,id:image.reference.id,image:image.thumbnail,title:'Cell',credit:'Ada',license:'CC BY',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',sourceUrl:'https://commons.wikimedia.org/wiki/File:Cell.png',label:'External reference',attemptCount:1};
  mocks.api.mockImplementation(async(path:string)=>path.endsWith('/figures')?{figures:[{id:image.reference.id,url:image.thumbnail,page:1}]}:kind==='page_snapshot'?{available:true,id:image.reference.id,page:1,url:image.thumbnail}:{available:false});
  const onAsk=vi.fn();
  const visual={sectionId:'section',hasFigures:kind==='figure',figures:kind==='figure'?[{id:image.reference.id,url:image.thumbnail,page:1,width:300,height:200}]:[],snapshot:kind==='page_snapshot'?{available:true as const,id:image.reference.id,page:1,url:image.thumbnail,width:300,height:200,sourceLabel:'Synthetic source'}:{available:false as const,reason:'no_page_source'}};
  await act(async()=>{tree=create(createElement(SectionVisual,{artifactId:'artifact',sectionId:'section',reviewerTitle:'Biology',sectionTitle:'Cells',visual,...(kind==='external_visual'?{external}:{}),onAsk}),{createNodeMock:element=>element.type==='dialog'?{close,showModal}: {getBoundingClientRect:()=>({width:400,height:300})}});});
  const grounding=kind==='external_visual'?'External reference':kind==='figure'?'From your course material':'From page 1 · your course material';
  expect(tree!.root.findAllByType('span').some(n=>[n.props.children].flat().join('')===grounding)).toBe(true);
  expect(tree!.root.findAllByType('a')).toHaveLength(0);
  expect(tree!.root.findByType('strong').props.children).toBeUndefined();
  const inline=asks().find(n=>!n.props.disabled)!;expect(inline).toBeDefined();await act(async()=>inline.props.onClick());
  expect(onAsk).toHaveBeenLastCalledWith(expect.objectContaining({reference:image.reference,thumbnail:image.thumbnail}));
  const enlarge=tree!.root.findAllByType('button').find(n=>n.props['aria-label']?.startsWith('Enlarge'))!;
  await act(async()=>enlarge.props.onClick());
  expect(showModal).toHaveBeenCalledOnce();
  expect(tree!.root.findByType('dialog').props.style).toMatchObject({overflow:'auto',maxHeight:'90vh'});
  if(kind==='external_visual') {
    expect(enlarge.props['aria-label']).toContain(external.title);
    expect(tree!.root.findAllByType('a').map(n=>n.props.href)).toEqual([external.sourceUrl,external.licenseUrl]);
    expect(tree!.root.findAllByType('a')[0]!.props.children.join('')).toBe('Ada · CC BY');
  }
  expect(tree!.root.findAllByType('input')).toHaveLength(0);
  expect(asks().at(-1)!.findByType('svg').props['aria-hidden']).toBe('true');
  const actions=tree!.root.findByType('dialog').findAllByType('div').find(n=>n.props.className==='reviewer-image-actions')!;
  expect(actions.findAllByType('button').map(n=>[n.props.children].flat().filter(c=>typeof c==='string').join(''))).toEqual(['Ask about this image','Save image']);
  await act(async()=>asks().at(-1)!.props.onClick());
  const save=tree!.root.findAllByType('button').find(n=>[n.props.children].flat().includes('Save image'))!;
  expect(save.props.disabled).toBe(false);await act(async()=>save.props.onClick());
  expect(mocks.download).toHaveBeenCalledWith({uri:image.thumbnail,reviewerTitle:'Biology',sectionTitle:'Cells',kind,...(kind==='external_visual'?{sourceTitle:'Cell',attribution:'Ada · CC BY'}:{})});
  expect(onAsk).toHaveBeenCalledTimes(2);expect(close).toHaveBeenCalled();
  await act(async()=>{mocks.online=false;win.dispatchEvent(new Event('offline'));});
  expect(asks().every(n=>n.props.disabled)).toBe(true);expect(JSON.stringify(tree!.toJSON())).toContain('Reconnect');
  expect(tree!.root.findAllByType('button').find(n=>[n.props.children].flat().includes('Save image'))!.props.disabled).toBe(true);
  expect(mocks.api.mock.calls.every(([path])=>!String(path).includes('/experience/study-tools'))).toBe(true);
});

it('closes on backdrop and Close, leaves content/padding clicks alone, and clears details on native close (including Esc)',async()=>{
  const external={status:'found' as const,image:'https://image.test/short',title:'Cell',credit:'Own work',license:'CC BY',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',sourceUrl:'https://commons.wikimedia.org/wiki/File:Cell.png',label:'External reference — not from your course material',attemptCount:2};
  mocks.api.mockResolvedValue({available:false});
  await act(async()=>{tree=create(createElement(SectionVisual,{artifactId:'artifact',sectionId:'section',external}),{createNodeMock:element=>element.type==='dialog'?{close,showModal}:{getBoundingClientRect:()=>({width:400,height:300})}});});
  const enlarge=tree!.root.findAllByType('button').find(n=>n.props['aria-label']==='Enlarge Cell')!;
  expect(tree!.root.findAllByType('a')).toHaveLength(0);
  await act(async()=>enlarge.props.onClick());
  const dialog=tree!.root.findByType('dialog');
  expect(tree!.root.findAllByType('a')[0]!.props.children.join('')).toBe('Own work · CC BY');
  const target={getBoundingClientRect:()=>({left:10,right:310,top:10,bottom:310})};
  await act(async()=>dialog.props.onClick({target:{},currentTarget:target,clientX:0,clientY:0}));
  await act(async()=>dialog.props.onClick({target,currentTarget:target,clientX:30,clientY:30}));
  expect(close).not.toHaveBeenCalled();
  await act(async()=>dialog.props.onClick({target,currentTarget:target,clientX:0,clientY:30}));
  expect(close).toHaveBeenCalledOnce();
  await act(async()=>tree!.root.findAllByType('button').find(n=>n.props.children==='Close')!.props.onClick());
  expect(close).toHaveBeenCalledTimes(2);
  expect(dialog.props.onCancel).toBeUndefined(); // Native dialog Esc is not prevented.
  await act(async()=>dialog.props.onClose());
  expect(tree!.root.findAllByType('a')).toHaveLength(0);
  expect(tree!.root.findByType('strong').props.children).toBeUndefined();
  expect(tree!.root.findAllByType('span').some(n=>n.props.children===external.label)).toBe(true);
});

it.each(['card','viewer'])('shows safe error copy, Retry and Commons without closing on %s image failure',async surface=>{
  const warning=vi.spyOn(console,'warn').mockImplementation(()=>{});
  const external={status:'found' as const,image:'https://upload.wikimedia.org/private-title.png',title:'Cell',credit:'Own work',license:'CC BY',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',sourceUrl:'https://commons.wikimedia.org/wiki/File:Cell.png',label:'External reference',attemptCount:1};
  mocks.api.mockResolvedValue({available:false});
  await act(async()=>{tree=create(createElement(SectionVisual,{artifactId:'artifact',sectionId:'section',external}),{createNodeMock:element=>element.type==='dialog'?{close,showModal}:{getBoundingClientRect:()=>({width:400,height:300})}});});
  const enlarge=()=>tree!.root.findAllByType('button').find(n=>n.props['aria-label']==='Enlarge Cell')!;
  await act(async()=>enlarge().props.onClick());
  const images=tree!.root.findAllByType('img');
  const card=tree!.root.findByType('figure');
  const originalKey=enlarge().props.children[0].key;
  await act(async()=>(surface==='card'?images[0]:images.at(-1))!.props.onError({message:'private response URL'}));
  expect(close).not.toHaveBeenCalled();
  expect(warning).toHaveBeenCalledExactlyOnceWith('reviewer.external_image_failed');
  expect(tree!.root.findAllByType('p').some(n=>n.props.children==="Image couldn't load")).toBe(true);
  expect(tree!.root.findAllByType('a').find(n=>n.props.children==='Open on Commons')!.props).toMatchObject({href:external.sourceUrl,target:'_blank',rel:'noreferrer'});
  await act(async()=>tree!.root.findAllByType('button').find(n=>n.props.children==='Retry')!.props.onClick());
  expect(tree!.root.findAllByType('p').some(n=>n.props.children==="Image couldn't load")).toBe(false);
  expect(tree!.root.findAllByType('img').map(n=>n.props.src)).toEqual([external.image,external.image]);
  expect(enlarge().props.children[0].key).not.toBe(originalKey);
  expect(card.findAll(node=>node.props.role==='status')).toHaveLength(1);
  expect(mocks.api.mock.calls.every(([,init])=>!init?.method || init.method==='GET')).toBe(true);
});

it('shows pending card feedback until decode, restarts it on a changed URL, and clears it on error',async()=>{
  vi.spyOn(console,'warn').mockImplementation(()=>{});
  const external={status:'found' as const,image:'https://upload.wikimedia.org/image.png',title:'Cell',credit:'Ada',license:'CC BY',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',sourceUrl:'https://commons.wikimedia.org/wiki/File:Cell.png',label:'External reference',attemptCount:2};
  const props={artifactId:'artifact',sectionId:'section',external};
  await act(async()=>{tree=create(createElement(SectionVisual,props),{createNodeMock:element=>element.type==='dialog'?{close,showModal}:{getBoundingClientRect:()=>({width:400,height:300})}});});
  const loading=()=>tree!.root.findAll(node=>node.props.role==='status');
  const enlarge=()=>tree!.root.findAllByType('button').find(node=>node.props['aria-label']==='Enlarge Cell')!;
  expect(loading()).toHaveLength(1);
  expect(enlarge().props['aria-busy']).toBe(true);
  await act(async()=>tree!.root.findByType('img').props.onLoad());
  expect(loading()).toHaveLength(0);
  expect(enlarge().props['aria-busy']).toBe(false);
  await act(async()=>tree!.update(createElement(SectionVisual,{...props,external:{...external,image:'https://upload.wikimedia.org/other.png'}})));
  expect(loading()).toHaveLength(1);
  await act(async()=>tree!.root.findByType('img').props.onError());
  expect(loading()).toHaveLength(0);
  expect(tree!.root.findAllByType('p').some(node=>node.props.children==="Image couldn't load")).toBe(true);
  expect(close).not.toHaveBeenCalled();
});
