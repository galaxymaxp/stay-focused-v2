import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Image, Pressable, Text, View } from 'react-native';
import { SourceFigures, useFigureAvailability } from './SourceFigures';
import { SaveImageButton } from './SaveImageButton';
import { Sheet } from '../../design/primitives';
const mocks=vi.hoisted(()=>({read:vi.fn(),availability:vi.fn(),state:{currentState:'active',addEventListener:vi.fn(()=>({remove:vi.fn()}))}}));
vi.mock('react-native',()=>({View:'View',Text:'Text',Image:'Image',Pressable:'Pressable',ActivityIndicator:'ActivityIndicator',
  AppState:mocks.state,useWindowDimensions:()=>({width:360,height:800})}));
vi.mock('react-native-safe-area-context',()=>({SafeAreaView:'SafeAreaView'}));
vi.mock('lucide-react-native',()=>({Image:'ImageIcon',Download:'Download'}));
vi.mock('../../design/primitives',()=>({Sheet:({children,...props}:{children:unknown})=>createElement('Sheet',props,children as never)}));
vi.mock('../../design/theme',async()=>{
  const tokens=await import('../../design/themeTokens');return {useTheme:()=>({colors:tokens.palettes.light,reducedMotion:true})};
});
vi.mock('../../services/sourceFigures',()=>({readSectionFigures:mocks.read,readFigureAvailability:mocks.availability}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const client={baseUrl:'https://api.example.test',accessToken:'jwt'};
const props={client,artifactId:'artifact',sectionId:'s',hasFigures:true,offline:false,visible:true};
const figure={id:'figure',url:'https://image.example.test/short',width:256,height:160,page:2};
let tree:ReactTestRenderer|undefined;
const button=(label:string)=>tree!.root.findAllByType(Pressable).find(node=>node.props.accessibilityLabel===label)!;
async function mount(overrides:Partial<typeof props> & {reviewerTitle?:string;sectionTitle?:string}={}) {await act(async()=>{tree=create(createElement(SourceFigures,{...props,...overrides}));});}
afterEach(async()=>{if(tree)await act(async()=>tree!.unmount());tree=undefined;vi.clearAllMocks();vi.useRealTimers();});
describe('in-place source figure sheet',()=>{
  it('offers Save only in zoom with the selected figure and reviewer/section titles',async()=>{
    mocks.read.mockResolvedValue([figure]);await mount({reviewerTitle:'Biology',sectionTitle:'Cells'});
    expect(button('Save image')).toBeUndefined();
    await act(async()=>button('Enlarge Diagram from page 2').props.onPress());
    expect(button('Save image').props.disabled).toBe(false);
    expect(tree!.root.findByType(SaveImageButton).props.image).toEqual({uri:figure.url,reviewerTitle:'Biology',sectionTitle:'Cells',kind:'figure'});
  });
  it('asks about each exact figure inline and in zoom, closing the viewer first',async()=>{
    const onAsk=vi.fn();mocks.read.mockResolvedValue([figure]);
    await act(async()=>{tree=create(createElement(SourceFigures,{...props,onAsk}));});
    await act(async()=>button('Ask about this image').props.onPress());
    expect(onAsk).toHaveBeenLastCalledWith({reference:{kind:'figure',id:figure.id},thumbnail:figure.url,label:'Diagram from page 2'});
    await act(async()=>button('Enlarge Diagram from page 2').props.onPress());
    await act(async()=>tree!.root.findAllByType(Pressable).filter(n=>n.props.accessibilityLabel==='Ask about this image').at(-1)!.props.onPress());
    expect(onAsk).toHaveBeenCalledTimes(2);expect(tree!.root.findAllByType(Sheet)).toHaveLength(0);
  });
  it.each([{hasFigures:false},{offline:true}])('hides icon without figures or offline (%j)',async override=>{
    await mount(override);expect(tree!.root.findAllByType(Pressable).filter(node=>!node.props.disabled)).toHaveLength(0);expect(mocks.read).not.toHaveBeenCalled();
  });
  it('shows only the image action, opens and closes the existing sheet in the reader',async()=>{
    mocks.read.mockResolvedValue([figure]);await mount();expect(mocks.read).toHaveBeenCalledOnce();
    await act(async()=>button('Enlarge Diagram from page 2').props.onPress());
    expect(tree!.root.findByType(Sheet).props.title).toBe('Source figures');
    expect(tree!.root.findAllByType(Text).some(node=>[node.props.children].flat().join('')==='From page 2')).toBe(true);
    expect(tree!.root.findAllByType(Image)[0]!.props.source).toEqual({uri:figure.url});
    await act(async()=>tree!.root.findByType(Sheet).props.onClose());expect(tree!.root.findAllByType(Sheet)).toHaveLength(0);
  });
  it('shows slide labels and navigates only real source images',async()=>{
    mocks.read.mockResolvedValue([figure,{...figure,id:'next',page:undefined,slide:4}]);await mount();
    await act(async()=>button('Enlarge Diagram from page 2').props.onPress());
    expect(button('Previous figure').props.disabled).toBe(true);
    await act(async()=>button('Next figure').props.onPress());
    expect(tree!.root.findAllByType(Text).some(node=>[node.props.children].flat().join('')==='From slide 4')).toBe(true);
    expect(button('Next figure').props.disabled).toBe(true);expect(mocks.read).toHaveBeenCalledOnce();
  });
  it('hides the online action after empty results or a connection failure',async()=>{
    mocks.read.mockResolvedValue([]);await mount();
    expect(tree!.root.findAllByType(Pressable)).toHaveLength(0);
    await act(async()=>tree!.unmount());tree=undefined;mocks.read.mockRejectedValue(new Error('offline'));
    await mount();expect(tree!.root.findAllByType(Pressable)).toHaveLength(0);
  });
  it('closes the viewer on an offline device-copy switch',async()=>{
    mocks.read.mockResolvedValue([figure]);await mount();await act(async()=>button('Enlarge Diagram from page 2').props.onPress());
    await act(async()=>tree!.update(createElement(SourceFigures,{...props,offline:true})));
    expect(tree!.root.findAllByType(Sheet)).toHaveLength(0);expect(tree!.root.findAllByType(Pressable).every(node=>node.props.disabled)).toBe(true);
  });
  it('loads only near view, retains loaded inline images offscreen, and ignores an aborted late fetch',async()=>{
    mocks.read.mockResolvedValue([figure]);await mount({visible:false});expect(mocks.read).not.toHaveBeenCalled();
    await act(async()=>tree!.update(createElement(SourceFigures,props)));expect(mocks.read).toHaveBeenCalledOnce();
    expect(tree!.root.findAllByType(Image)).toHaveLength(1);
    await act(async()=>tree!.update(createElement(SourceFigures,{...props,visible:false})));
    expect(tree!.root.findAllByType(Image)).toHaveLength(1);expect(mocks.read).toHaveBeenCalledOnce();
    await act(async()=>tree!.unmount());tree=undefined;
    let resolve!:(images:typeof figure[])=>void;mocks.read.mockReturnValue(new Promise(r=>{resolve=r;}));await mount();
    const signal=mocks.read.mock.calls.at(-1)?.[3];
    await act(async()=>tree!.update(createElement(SourceFigures,{...props,visible:false})));expect(signal.aborted).toBe(true);
    await act(async()=>resolve([figure]));expect(tree!.root.findAllByType(Image)).toHaveLength(0);
  });
  it('reuses bounded pinch zoom and prevents the sheet from stealing image gestures',async()=>{
    mocks.read.mockResolvedValue([figure]);await mount();await act(async()=>button('Enlarge Diagram from page 2').props.onPress());
    const page=tree!.root.findAllByType(View).find(node=>node.props.accessibilityLabel?.startsWith('Source figure.'))!;
    expect(page.props.onResponderTerminationRequest()).toBe(false);
    await act(async()=>page.props.onLayout({nativeEvent:{layout:{width:360,height:400}}}));
    const touch=(distance:number)=>({nativeEvent:{touches:[{pageX:100,pageY:100},{pageX:100+distance,pageY:100}]}});
    await act(async()=>page.props.onResponderGrant(touch(100)));await act(async()=>page.props.onResponderMove(touch(600)));
    expect(page.findByType(Image).props.style.transform.at(-1)).toEqual({scale:4});
  });
});
describe('batched availability lifecycle',()=>{
  function Discovery({offline=false}:{offline?:boolean}) {const available=useFigureAvailability(client,'artifact',offline);return createElement('Discovery',{sections:[...available]});}
  it('allows slow discovery to finish without a heartbeat cancelling or overlapping it',async()=>{
    vi.useFakeTimers();let resolve!:(value:Set<string>)=>void;
    mocks.availability.mockReturnValue(new Promise(r=>{resolve=r;}));
    await act(async()=>{tree=create(createElement(Discovery));});
    const signal=mocks.availability.mock.calls[0]![2];
    await act(async()=>{await vi.advanceTimersByTimeAsync(12000);});
    expect(mocks.availability).toHaveBeenCalledOnce();expect(signal.aborted).toBe(false);
    await act(async()=>resolve(new Set(['s'])));expect(tree!.root.findByType('Discovery' as never).props.sections).toEqual(['s']);
    await act(async()=>tree!.update(createElement(Discovery,{offline:true})));expect(tree!.root.findByType('Discovery' as never).props.sections).toEqual([]);
  });
  it('uses one discovery request for multiple icons, and hides all offline',async()=>{
    mocks.availability.mockResolvedValue(new Set(['s','another']));
    await act(async()=>{tree=create(createElement(Discovery));});
    expect(mocks.availability).toHaveBeenCalledOnce();expect(tree!.root.findByType('Discovery' as never).props.sections).toEqual(['s','another']);
    await act(async()=>tree!.update(createElement(Discovery,{offline:true})));
    expect(tree!.root.findByType('Discovery' as never).props.sections).toEqual([]);expect(mocks.availability).toHaveBeenCalledOnce();
  });
  it('hides icons when the single reachability heartbeat fails',async()=>{
    vi.useFakeTimers();mocks.availability.mockResolvedValue(new Set(['s']));await act(async()=>{tree=create(createElement(Discovery));});
    mocks.availability.mockRejectedValue(new Error('offline'));await act(async()=>{await vi.advanceTimersByTimeAsync(10000);});
    expect(tree!.root.findByType('Discovery' as never).props.sections).toEqual([]);
  });
});
