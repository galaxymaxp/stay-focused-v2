import { createElement } from 'react';
import { act,create,type ReactTestRenderer } from 'react-test-renderer';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { Image,Pressable,Text } from 'react-native';
import { Sheet } from '../../design/primitives';
import { ExternalVisual } from './ExternalVisual';
import { EXTERNAL_VISUAL_LABEL } from '../../services/externalVisuals';
const mocks=vi.hoisted(()=>({find:vi.fn(),link:vi.fn(async()=>{})}));
vi.mock('react-native',()=>({View:'View',Text:'Text',Image:'Image',Pressable:'Pressable',Linking:{openURL:mocks.link},useWindowDimensions:()=>({width:360,height:800})}));
vi.mock('../../design/primitives',()=>({Sheet:({children,...props}:{children:unknown})=>createElement('Sheet',props,children as never)}));
vi.mock('../../design/theme',async()=>{const tokens=await import('../../design/themeTokens');return {useTheme:()=>({colors:tokens.palettes.light,reducedMotion:true})};});
vi.mock('./SourcePageSnapshot',()=>({ZoomablePage:({url,label}:{url:string;label:string})=>createElement('ZoomablePage',{url,label})}));
vi.mock('../../services/externalVisuals',async load=>({...await load<typeof import('../../services/externalVisuals')>(),findExternalVisual:mocks.find}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const props={client:{baseUrl:'https://local.test',accessToken:'jwt'},artifactId:'artifact',sectionId:'s',online:true,hasSourceVisual:false};
const found={status:'found',image:'https://upload.wikimedia.org/image.png',title:'Cell',credit:'Ada',license:'CC BY',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',sourceUrl:'https://commons.wikimedia.org/wiki/File:Cell.png',label:EXTERNAL_VISUAL_LABEL,width:1200,height:800,attemptCount:1};
let tree:ReactTestRenderer|undefined;
const button=(name:string)=>tree!.root.findAllByType(Pressable).find(n=>n.props.accessibilityLabel===name)!;
const text=()=>tree!.root.findAllByType(Text).map(n=>[n.props.children].flat().join(''));
async function mount(override:Partial<typeof props>={}){await act(async()=>{tree=create(createElement(ExternalVisual,{...props,...override}));});}
afterEach(async()=>{if(tree)await act(async()=>tree!.unmount());tree=undefined;vi.clearAllMocks();});
describe('request-only separate external card',()=>{
  it.each([{online:false},{hasSourceVisual:true}])('hides actions and images for %j',async override=>{
    await mount(override);expect(tree!.root.findAllByType(Pressable)).toHaveLength(0);expect(mocks.find).not.toHaveBeenCalled();
  });
  it('makes no automatic search and always labels a returned image and zoom sheet',async()=>{
    mocks.find.mockResolvedValue(found);await mount();expect(mocks.find).not.toHaveBeenCalled();
    await act(async()=>button('Find a visual').props.onPress());expect(tree!.root.findByType(Image).props.source).toEqual({uri:found.image});expect(text()).toContain(EXTERNAL_VISUAL_LABEL);
    await act(async()=>button('View external reference').props.onPress());expect(tree!.root.findByType(Sheet).props.title).toBe('External reference');
    expect(text().filter(t=>t===EXTERNAL_VISUAL_LABEL)).toHaveLength(2);
    await act(async()=>button('View attribution on Wikimedia Commons').props.onPress());expect(mocks.link).toHaveBeenCalledWith(found.sourceUrl);
    await act(async()=>button('View image license').props.onPress());expect(mocks.link).toHaveBeenCalledWith(found.licenseUrl);
  });
  it('offers Find another once including no-result, then removes it',async()=>{
    mocks.find.mockResolvedValue({status:'none',message:'No reliable visual found',attemptCount:1});await mount();
    await act(async()=>button('Find a visual').props.onPress());expect(text()).toContain('No reliable visual found');expect(button('Find another')).toBeDefined();
    mocks.find.mockResolvedValue({...found,attemptCount:2});await act(async()=>button('Find another').props.onPress());expect(button('Find another')).toBeUndefined();
    expect(mocks.find).toHaveBeenLastCalledWith(props.client,'artifact','s',true,expect.any(AbortSignal));
  });
  it('hides the card and closes the sheet on offline/source transitions',async()=>{
    mocks.find.mockResolvedValue(found);await mount();await act(async()=>button('Find a visual').props.onPress());await act(async()=>button('View external reference').props.onPress());
    await act(async()=>tree!.update(createElement(ExternalVisual,{...props,online:false})));
    expect(tree!.root.findAllByType(Image)).toHaveLength(0);expect(tree!.root.findAllByType(Sheet)).toHaveLength(0);
    await act(async()=>tree!.update(createElement(ExternalVisual,{...props,hasSourceVisual:true})));expect(tree!.root.findAllByType(Image)).toHaveLength(0);
  });
  it('does not show a no-result after provider/network failure',async()=>{
    mocks.find.mockRejectedValue(new Error('private provider error'));await mount();await act(async()=>button('Find a visual').props.onPress());
    expect(text()).not.toContain('No reliable visual found');expect(button('Find a visual')).toBeDefined();expect(text().join(' ')).not.toContain('private provider');
  });
  it('ignores late responses after going offline',async()=>{
    let resolve:(value:unknown)=>void=()=>{};mocks.find.mockImplementation(()=>new Promise(r=>{resolve=r;}));await mount();
    await act(async()=>{void button('Find a visual').props.onPress();});
    await act(async()=>tree!.update(createElement(ExternalVisual,{...props,online:false})));
    await act(async()=>resolve(found));expect(tree!.root.findAllByType(Image)).toHaveLength(0);
    await act(async()=>tree!.update(createElement(ExternalVisual,props)));expect(button('Find a visual')).toBeDefined();
  });
});
