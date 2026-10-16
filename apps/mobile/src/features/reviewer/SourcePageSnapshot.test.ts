import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActivityIndicator, Image, Modal, Pressable, Text, View } from 'react-native';
import { SourcePageSnapshot, ZoomablePage } from './SourcePageSnapshot';
import { SaveImageButton } from './SaveImageButton';

vi.mock('lucide-react-native', () => ({ Download: 'Download' }));
const mocks = vi.hoisted(() => ({ read: vi.fn(), state: { currentState: 'active', addEventListener: vi.fn(() => ({ remove: vi.fn() })) } }));
vi.mock('react-native', () => ({ View: 'View', Text: 'Text', Image: 'Image', Modal: 'Modal', Pressable: 'Pressable', ActivityIndicator: 'ActivityIndicator', AppState: mocks.state }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
vi.mock('../../design/theme', async () => {
  const tokens = await import('../../design/themeTokens'); return { useTheme: () => ({ colors: tokens.palettes.light, reducedMotion: true }) };
});
vi.mock('../../services/sourcePageSnapshots', async original => ({ ...await original<typeof import('../../services/sourcePageSnapshots')>(), readPageSnapshot: mocks.read }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let tree: ReactTestRenderer | undefined;
const client = { baseUrl: 'https://api.example.test', accessToken: 'test' };
const props = { client, artifactId: 'artifact', sectionId: 'section', offline: false };
const ready = { available: true, url: 'https://image.example.test/opaque.png', page: 2, width: 1400, height: 1867, sourceLabel: 'Accepted lecture' };
async function mount(offline = false) { await act(async () => { tree = create(createElement(SourcePageSnapshot, { ...props, offline })); }); }
const buttons = () => tree!.root.findAllByType(Pressable);
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.clearAllMocks(); vi.useRealTimers(); });
describe('source-page thumbnail and viewer', () => {
  it('offers Save in the page modal with the exact URL and filename titles',async()=>{
    mocks.read.mockResolvedValue(ready);
    await act(async()=>{tree=create(createElement(SourcePageSnapshot,{...props,reviewerTitle:'Biology',sectionTitle:'Cells'}));});
    await act(async()=>buttons()[0]!.props.onPress());
    expect(tree!.root.findByType(SaveImageButton).props.image).toEqual({uri:ready.url,reviewerTitle:'Biology',sectionTitle:'Cells',kind:'page_snapshot'});
    expect(tree!.root.findByType(Modal).findAllByType(Pressable).some(n=>n.props.accessibilityLabel==='Save image')).toBe(true);
  });
  it('asks about the exact ready snapshot from inline and zoom controls',async()=>{
    const onAsk=vi.fn();const data={...ready,id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'};mocks.read.mockResolvedValue(data);
    await act(async()=>{tree=create(createElement(SourcePageSnapshot,{...props,onAsk}));});
    const ask=()=>buttons().filter(n=>n.props.accessibilityLabel==='Ask about this image');
    await act(async()=>ask()[0]!.props.onPress());expect(onAsk).toHaveBeenLastCalledWith({reference:{kind:'page_snapshot',id:data.id},thumbnail:data.url,label:'Source page 2'});
    await act(async()=>buttons()[0]!.props.onPress());await act(async()=>ask().at(-1)!.props.onPress());
    expect(onAsk).toHaveBeenCalledTimes(2);expect(tree!.root.findByType(Modal).props.visible).toBe(false);
  });
  it.each([undefined, {'User-Agent':'StayFocused/2.1.0 (https://github.com/galaxymaxp/stay-focused-v2)'}])('passes optional external headers to zoom images without adding them to course images (%j)',async headers=>{
    await act(async()=>{tree=create(createElement(ZoomablePage,{url:ready.url,width:1400,height:1867,onError:vi.fn(),...(headers?{headers}:{})}));});
    expect(tree!.root.findByType(Image).props.source).toEqual({uri:ready.url,...(headers?{headers}:{})});
  });
  it('labels an exact PPTX snapshot From slide n in the header and caption', async () => {
    mocks.read.mockResolvedValue({ ...ready, labelKind: 'slide' }); await mount();
    expect(buttons()[0]?.props.accessibilityLabel).toBe('From slide 2');
    await act(async () => buttons()[0]!.props.onPress());
    expect(tree!.root.findAllByType(Text).map(node => [node.props.children].flat().join('')).join(' '))
      .toContain('Accepted lecture · Slide 2');
    expect(tree!.root.findByType(Modal).props.animationType).toBe('none');
  });
  it.each(['not_canvas_pdf', 'no_page_source', 'source_revision_unavailable'])('has no control for %s', async reason => {
    mocks.read.mockResolvedValue({ available: false, reason }); await mount(); expect(buttons()).toHaveLength(0);
  });
  it('hides offline without asking the server to render', async () => {
    await mount(true); expect(buttons().filter(n=>!n.props.disabled)).toHaveLength(0); expect(mocks.read).not.toHaveBeenCalled();
  });
  it('shows the local PDF thumbnail in the existing page viewer', async () => {
    mocks.read.mockResolvedValue({ ...ready, sourceLabel: 'My uploaded PDF' }); await mount();
    expect(tree!.root.findAllByType(Image)[0]?.props.source).toEqual({ uri: ready.url });
    expect(buttons()[0]?.props.accessibilityLabel).toBe('From page 2');
    await act(async () => buttons()[0]!.props.onPress());
    expect(tree!.root.findByType(Modal).props.visible).toBe(true);
    expect(tree!.root.findAllByType(Text).map(node => node.props.children).join(' ')).toContain('My uploaded PDF');
  });
  it('keeps the page number with calm unavailable copy and no image/control after deletion', async () => {
    mocks.read.mockResolvedValue({ available: false, reason: 'source_revision_unavailable', page: 2 }); await mount();
    expect(buttons()).toHaveLength(0); expect(tree!.root.findAllByType(Image)).toHaveLength(0);
    expect(tree!.root.findAllByType(Text).map(node => [node.props.children].flat().join('')).join(' '))
      .toContain('From page 2 Page preview unavailable');
    await act(async () => tree!.update(createElement(SourcePageSnapshot, { ...props, offline: true })));
    expect(tree!.root.findAllByType(Text).map(n=>n.props.children).join(' ')).toContain('Reconnect');
  });
  it('closes an open viewer and keeps the page text when deletion wins on recheck', async () => {
    mocks.read.mockResolvedValue(ready); await mount();
    mocks.read.mockResolvedValue({ available: false, reason: 'source_revision_unavailable', page: 2 });
    await act(async () => buttons()[0]!.props.onPress());
    expect(buttons()).toHaveLength(0); expect(tree!.root.findAllByType(Modal)).toHaveLength(0);
    expect(tree!.root.findAllByType(Text).map(node => node.props.children).join(' ')).toContain('Page preview unavailable');
  });
  it('discovers without rendering, then opens a full-screen modal with caption and Reduce Motion', async () => {
    mocks.read.mockResolvedValue(ready); await mount();
    expect(mocks.read).toHaveBeenCalledWith(client, 'artifact', 'section', false, expect.any(AbortSignal));
    expect(buttons()[0]?.props.accessibilityLabel).toBe('From page 2');
    await act(async () => buttons()[0]!.props.onPress());
    const modal = tree!.root.findByType(Modal); expect(modal.props.visible).toBe(true); expect(modal.props.animationType).toBe('none');
    expect(tree!.root.findAllByType(Text).map(node => node.props.children).join(' ')).toContain('Accepted lecture · Page 2');
    expect(mocks.read.mock.calls.at(-1)?.[3]).toBe(true);
    await act(async () => buttons().find(node => node.props.accessibilityLabel === 'Close source page')!.props.onPress());
    expect(tree!.root.findByType(Modal).props.visible).toBe(false);
  });
  it('shows a quiet rendering placeholder and polls at most five times over 15 seconds', async () => {
    vi.useFakeTimers(); mocks.read.mockResolvedValue({ available: true, status: 'rendering', page: 2 }); await mount();
    expect(tree!.root.findAllByType(ActivityIndicator).length).toBeGreaterThan(0);
    const start = mocks.read.mock.calls.filter(call => call[3] === true).length;
    for (let i = 0; i < 5; i++) await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(mocks.read.mock.calls.filter(call => call[3] === true)).toHaveLength(start + 5);
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(mocks.read.mock.calls.filter(call => call[3] === true)).toHaveLength(start + 5);
    expect(mocks.read.mock.calls).toHaveLength(7); // Discovery + inline render + exactly five progress checks.
  });
  it('hides the button and closes the viewer on a connection failure', async () => {
    mocks.read.mockResolvedValue(ready); await mount(); mocks.read.mockRejectedValue(new Error('offline'));
    await act(async () => buttons()[0]!.props.onPress()); expect(buttons()).toHaveLength(0);
  });
  it('hides a ready snapshot when the reader switches to an offline device copy', async () => {
    mocks.read.mockResolvedValue(ready); await mount();
    await act(async () => tree!.update(createElement(SourcePageSnapshot, { ...props, offline: true })));
    expect(buttons()).toHaveLength(1);expect(buttons()[0]!.props.disabled).toBe(true);
  });
  it('does not discover before the section approaches view and automatically renders after discovery',async()=>{
    mocks.read.mockResolvedValueOnce({available:true,status:'unrendered',page:2}).mockResolvedValue(ready);
    await act(async()=>{tree=create(createElement(SourcePageSnapshot,{...props,visible:false}));});expect(mocks.read).not.toHaveBeenCalled();
    await act(async()=>tree!.update(createElement(SourcePageSnapshot,{...props,visible:true})));
    expect(mocks.read.mock.calls.map(call=>call[3])).toEqual([false,true]);
    expect(tree!.root.findAllByType(Image)[0]!.props.style.width).toBe('100%');
    expect(tree!.root.findAllByType(Text).map(node=>[node.props.children].flat().join('')).join(' ')).toContain('From page 2 \u00b7 your course material');
  });
  it('aborts late discovery offscreen and starts no render',async()=>{
    let resolve!:(value:unknown)=>void;mocks.read.mockReturnValue(new Promise(r=>{resolve=r;}));await mount();
    const signal=mocks.read.mock.calls[0]![4];
    await act(async()=>tree!.update(createElement(SourcePageSnapshot,{...props,visible:false})));expect(signal.aborted).toBe(true);
    await act(async()=>resolve({available:true,status:'unrendered',page:2}));expect(mocks.read).toHaveBeenCalledOnce();expect(buttons()).toHaveLength(0);
  });
  it('handles double-tap reset and bounded pinch/pan in the full-screen image', async () => {
    mocks.read.mockResolvedValue(ready); await mount(); await act(async () => buttons()[0]!.props.onPress());
    const page = tree!.root.findAllByType(View).find(node => node.props.accessibilityLabel?.startsWith('Source page.'))!;
    await act(async () => page.props.onLayout({ nativeEvent: { layout: { width: 360, height: 640 } } }));
    const touch = (positions: { pageX: number; pageY: number }[]) => ({ nativeEvent: { touches: positions } });
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    await act(async () => { page.props.onResponderGrant(touch([{ pageX: 100, pageY: 100 }])); page.props.onResponderRelease(); });
    vi.mocked(Date.now).mockReturnValue(1200);
    await act(async () => { page.props.onResponderGrant(touch([{ pageX: 100, pageY: 100 }])); page.props.onResponderRelease(); });
    expect(page.findByType(Image).props.style.transform.at(-1)).toEqual({ scale: 2 });
    await act(async () => page.props.onResponderGrant(touch([{ pageX: 100, pageY: 100 }, { pageX: 200, pageY: 100 }])));
    await act(async () => page.props.onResponderMove(touch([{ pageX: 100, pageY: 100 }, { pageX: 400, pageY: 100 }])));
    expect(page.findByType(Image).props.style.transform.at(-1)).toEqual({ scale: 4 });
    vi.mocked(Date.now).mockRestore();
  });
});
