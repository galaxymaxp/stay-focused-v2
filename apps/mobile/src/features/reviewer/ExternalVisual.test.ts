import { createElement } from 'react';
import { act,create,type ReactTestRenderer } from 'react-test-renderer';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { Image,Pressable,Text } from 'react-native';
import { Sheet } from '../../design/primitives';
import { ExternalVisual } from './ExternalVisual';
import { SaveImageButton } from './SaveImageButton';
import { EXTERNAL_IMAGE_HEADERS, EXTERNAL_VISUAL_LABEL, type ExternalReferenceVisual } from '../../services/externalVisuals';
import { apiFoundVisual } from '../../services/externalVisuals.testSupport';
vi.mock('lucide-react-native', () => ({ Download: 'Download' }));
const mocks=vi.hoisted(()=>({find:vi.fn(),link:vi.fn(async()=>{})}));
vi.mock('react-native',()=>({View:'View',Text:'Text',Image:'Image',Pressable:'Pressable',Linking:{openURL:mocks.link},useWindowDimensions:()=>({width:360,height:800})}));
vi.mock('../../design/primitives',()=>({Sheet:({children,...props}:{children:unknown})=>createElement('Sheet',props,children as never)}));
vi.mock('../../design/theme',async()=>{const tokens=await import('../../design/themeTokens');return {useTheme:()=>({colors:tokens.palettes.light,reducedMotion:true})};});
vi.mock('./SourcePageSnapshot',()=>({ZoomablePage:({url,label,headers}:{url:string;label:string;headers?:Readonly<Record<string,string>>})=>createElement('ZoomablePage',{url,label,headers})}));
vi.mock('../../services/externalVisuals',async load=>({...await load<typeof import('../../services/externalVisuals')>(),findExternalVisual:mocks.find}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const baseProps={client:{baseUrl:'https://local.test',accessToken:'jwt'},artifactId:'artifact',sectionId:'s',online:true,hasSourceVisual:false};
const found:ExternalReferenceVisual={status:'found',image:'https://upload.wikimedia.org/image.png',title:'Cell',credit:'Ada',license:'CC BY',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',sourceUrl:'https://commons.wikimedia.org/wiki/File:Cell.png',label:EXTERNAL_VISUAL_LABEL,width:1200,height:800,attemptCount:1};
const props={...baseProps,visual:found};
let tree:ReactTestRenderer|undefined;
const button=(name:string)=>tree!.root.findAllByType(Pressable).find(n=>(n.props.accessibilityLabel===name || (name==='View external reference' && n.props.accessibilityLabel?.startsWith('View external reference:'))))!;
const text=()=>tree!.root.findAllByType(Text).map(n=>[n.props.children].flat().join(''));
async function mount(override:Partial<typeof props> & {reviewerTitle?:string;sectionTitle?:string}={}){await act(async()=>{tree=create(createElement(ExternalVisual,{...props,...override}));});}
afterEach(async()=>{if(tree)await act(async()=>tree!.unmount());tree=undefined;vi.clearAllMocks();});
describe('automatic separate external card',()=>{
  it('keeps grounding visible and reveals attribution and license only after opening',async()=>{
    await mount({visual:apiFoundVisual});
    expect(tree!.root.findByType(Image).props.source).toEqual({uri:apiFoundVisual.image,headers:EXTERNAL_IMAGE_HEADERS});
    expect(text()).toContain(EXTERNAL_VISUAL_LABEL);
    expect(text()).not.toContain(`${apiFoundVisual.credit} · ${apiFoundVisual.license}`);
    expect(button('View image license')).toBeUndefined();
    expect(button('View external reference').props.accessibilityLabel).toContain(apiFoundVisual.title);
    await act(async()=>button('View external reference').props.onPress());
    expect(text()).toContain(`${apiFoundVisual.credit} · ${apiFoundVisual.license}`);
    expect(button('View image license')).toBeDefined();
    expect(button('View attribution on Wikimedia Commons')).toBeDefined();
    expect(mocks.find).not.toHaveBeenCalled();
  });
  it('offers Save only in zoom, preserving source title, identification headers and stored attribution',async()=>{
    await mount({reviewerTitle:'Biology',sectionTitle:'Cells'});expect(button('Save image')).toBeUndefined();
    await act(async()=>button('View external reference').props.onPress());
    expect(tree!.root.findByType(SaveImageButton).props.image).toEqual({uri:found.image,headers:EXTERNAL_IMAGE_HEADERS,reviewerTitle:'Biology',sectionTitle:'Cells',kind:'external_visual',sourceTitle:found.title,attribution:`${found.credit} · ${found.license}`});
    expect(button('Save image').props.disabled).toBe(false);
  });
  it('asks about the exact attributed image inline and in zoom',async()=>{
    const onAsk=vi.fn();const visual={...found,id:'a'.repeat(64)};
    await act(async()=>{tree=create(createElement(ExternalVisual,{...baseProps,visual,onAsk}));});
    await act(async()=>button('Ask about this image').props.onPress());
    expect(onAsk).toHaveBeenLastCalledWith({reference:{kind:'external_visual',id:visual.id},thumbnail:visual.image,label:visual.title});
    await act(async()=>button('View external reference').props.onPress());
    await act(async()=>tree!.root.findAllByType(Pressable).filter(n=>n.props.accessibilityLabel==='Ask about this image').at(-1)!.props.onPress());
    expect(onAsk).toHaveBeenCalledTimes(2);expect(tree!.root.findAllByType(Sheet)).toHaveLength(0);
  });
  it('closes the viewer without logging native image errors or academic URLs',async()=>{
    const warning=vi.spyOn(console,'warn').mockImplementation(()=>{});
    try {
      await mount();await act(async()=>button('View external reference').props.onPress());
      await act(async()=>tree!.root.findByType(Image).props.onError({nativeEvent:{error:'HTTP 403 loading https://upload.wikimedia.org/private-title.png'}}));
      expect(warning).not.toHaveBeenCalled();expect(tree!.root.findAllByType(Sheet)).toHaveLength(0);
    }finally{warning.mockRestore();}
  });
  it.each([{online:false},{hasSourceVisual:true}])('hides actions and images for %j',async override=>{
    await mount(override);expect(tree!.root.findAllByType(Pressable).filter(node=>!node.props.disabled)).toHaveLength(0);expect(mocks.find).not.toHaveBeenCalled();
  });
  it('displays the batch image without a section search and labels its zoom sheet',async()=>{
    mocks.find.mockResolvedValue(found);await mount();expect(mocks.find).not.toHaveBeenCalled();
    expect(tree!.root.findByType(Image).props.source).toEqual({uri:found.image,headers:EXTERNAL_IMAGE_HEADERS});expect(text()).toContain(EXTERNAL_VISUAL_LABEL);
    await act(async()=>button('View external reference').props.onPress());expect(tree!.root.findByType(Sheet).props.title).toBe('External reference');
    expect(tree!.root.findByType('ZoomablePage' as never).props.headers).toEqual(EXTERNAL_IMAGE_HEADERS);
    expect(text().filter(t=>t===EXTERNAL_VISUAL_LABEL)).toHaveLength(2);
    await act(async()=>button('View attribution on Wikimedia Commons').props.onPress());expect(mocks.link).toHaveBeenCalledWith(found.sourceUrl);
    await act(async()=>button('View image license').props.onPress());expect(mocks.link).toHaveBeenCalledWith(found.licenseUrl);
  });
  it('replaces only a found result and removes the second-attempt action',async()=>{
    await mount();mocks.find.mockResolvedValue({...found,image:'https://upload.wikimedia.org/replacement.png',attemptCount:2});
    await act(async()=>button('Show a different one').props.onPress());expect(button('Show a different one')).toBeUndefined();
    expect(tree!.root.findByType(Image).props.source.uri).toContain('replacement');
    expect(mocks.find).toHaveBeenLastCalledWith(props.client,'artifact','s',true,expect.any(AbortSignal));
  });
  it('keeps the current image silently when the replacement has no result',async()=>{
    mocks.find.mockResolvedValue({status:'none',message:'No reliable visual found',attemptCount:2});await mount();
    await act(async()=>button('Show a different one').props.onPress());
    expect(tree!.root.findByType(Image).props.source.uri).toBe(found.image);expect(text()).not.toContain('No reliable visual found');
  });
  it('renders nothing when the batch has no section image',async()=>{
    await act(async()=>{tree=create(createElement(ExternalVisual,baseProps));});
    expect(tree!.root.findAllByType(Pressable)).toHaveLength(0);expect(mocks.find).not.toHaveBeenCalled();
  });
  it('hides the card and closes the sheet on offline/source transitions',async()=>{
    mocks.find.mockResolvedValue(found);await mount();await act(async()=>button('Show a different one').props.onPress());await act(async()=>button('View external reference').props.onPress());
    await act(async()=>tree!.update(createElement(ExternalVisual,{...props,online:false})));
    expect(tree!.root.findAllByType(Image)).toHaveLength(0);expect(tree!.root.findAllByType(Sheet)).toHaveLength(0);
    await act(async()=>tree!.update(createElement(ExternalVisual,{...props,hasSourceVisual:true})));expect(tree!.root.findAllByType(Image)).toHaveLength(0);
  });
  it('does not show a no-result after provider/network failure',async()=>{
    mocks.find.mockRejectedValue(new Error('private provider error'));await mount();await act(async()=>button('Show a different one').props.onPress());
    expect(text()).not.toContain('No reliable visual found');expect(tree!.root.findByType(Image).props.source.uri).toBe(found.image);expect(text().join(' ')).not.toContain('private provider');
  });
  it('ignores late responses after going offline',async()=>{
    let resolve:(value:unknown)=>void=()=>{};mocks.find.mockImplementation(()=>new Promise(r=>{resolve=r;}));await mount();
    await act(async()=>{void button('Show a different one').props.onPress();});
    await act(async()=>tree!.update(createElement(ExternalVisual,{...props,online:false})));
    await act(async()=>resolve({...found,image:'https://upload.wikimedia.org/late.png',attemptCount:2}));expect(tree!.root.findAllByType(Image)).toHaveLength(0);
    await act(async()=>tree!.update(createElement(ExternalVisual,props)));expect(tree!.root.findByType(Image).props.source.uri).toBe(found.image);
  });
});
