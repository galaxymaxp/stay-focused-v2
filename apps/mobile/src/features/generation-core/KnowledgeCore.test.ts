import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GLView } from 'expo-gl';
import { KnowledgeCore } from './KnowledgeCore';
import { palettes } from '../../design/themeTokens';
import type { CoreState } from './coreModel';
const mocks = vi.hoisted(() => ({ update: vi.fn(), aura: vi.fn(), render: vi.fn() }));
vi.mock('expo-router/react-navigation', () => ({ useIsFocused: () => true }));
vi.mock('expo-gl', () => ({ GLView: 'GLView' }));
vi.mock('react-native-svg', () => ({ default: 'Svg', Defs: 'Defs', Circle: 'Circle', RadialGradient: 'RadialGradient', Stop: 'Stop' }));
vi.mock('react-native', () => ({ View: 'View', Image: 'Image', StyleSheet: { create: (s: unknown) => s, absoluteFill: {} }, AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) } }));
vi.mock('../../auth/sessionStore', () => ({ sessionStore: { getItem: async () => 'pearl', setItem: vi.fn() } }));
vi.mock('./threeContext', () => ({ threeContext: (gl: unknown) => gl }));
vi.mock('./orbBody', async original => {
  const actual = await original<typeof import('./orbBody')>();
  return { ...actual, createOrbBody: () => { const body = actual.createOrbBody();
    return { ...body, update: (frame: Parameters<typeof body.update>[0]) => { mocks.update(frame); body.update(frame); } };
  } };
});
vi.mock('./orbAura', async original => { const actual = await original<typeof import('./orbAura')>(); return { ...actual, createOrbAura: () => {
  const aura = actual.createOrbAura(); return { ...aura, update: (frame: Parameters<typeof aura.update>[0]) => { mocks.aura(frame); aura.update(frame); } };
} }; });
vi.mock('three', async original => ({ ...await original<typeof import('three')>(), WebGLRenderer: class { setSize() {} setPixelRatio() {} setClearColor() {} getRenderTarget() { return null; } setRenderTarget() {} render = mocks.render; dispose() {} } }));
let tree: ReactTestRenderer | undefined, frames: Map<number, FrameRequestCallback>, serial: number;
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); frames = new Map(); serial = 0;
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { frames.set(++serial, fn); return serial; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.useRealTimers(); vi.unstubAllGlobals(); });
const event = { nativeEvent: { locationX: 100, locationY: 100 } };
async function mount(state: CoreState, reducedMotion = false) {
  await act(async () => { tree = create(createElement(KnowledgeCore, { state, colors: palettes.dark, mode: 'dark', size: 320, reducedMotion })); });
  await act(async () => tree!.root.findByType(GLView).props.onContextCreate({ drawingBufferWidth: 192, drawingBufferHeight: 192, endFrameEXP() {} }));
}
function draw() { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(Date.now())); }
it.each<CoreState>(['reading', 'generating', 'finalizing', 'complete', 'error'])('keeps %s colors authoritative while a tap still ripples', async state => {
  await mount(state); draw();
  const p = tree!.root.findByProps({ testID: 'orb-touch' }).props;
  p.onResponderGrant(event); vi.advanceTimersByTime(50); p.onResponderRelease(event);
  vi.advanceTimersByTime(100); draw();
  expect(mocks.update.mock.lastCall![0].idleColor).toBeUndefined();
  expect(mocks.aura.mock.lastCall![0].source.uBase.value.getHexString()).toBe('dde3ee');
  expect(mocks.update.mock.lastCall![0].waves[0].time).toBeCloseTo(0.1);
  expect(tree!.root.findByProps({ testID: 'knowledge-core' }).props.accessibilityElementsHidden).toBe(true);
});
it('renders reduced-motion taps once, with an instant idle color and no ripple/inertia', async () => {
  await mount('idle', true); draw(); expect(frames.size).toBe(0);
  const p = tree!.root.findByProps({ testID: 'orb-touch' }).props;
  p.onResponderGrant(event); vi.advanceTimersByTime(50); p.onResponderRelease(event); draw();
  expect(mocks.update.mock.lastCall![0].idleColor).toBe('#f4c542');
  expect(mocks.update.mock.lastCall![0].waves).toEqual([]); expect(frames.size).toBe(0);
});

it('crossfades idle body and aura together then restores generation colors', async () => {
  await mount('idle'); draw();
  const p = tree!.root.findByProps({ testID: 'orb-touch' }).props;
  p.onResponderGrant(event); vi.advanceTimersByTime(50); p.onResponderRelease(event);
  vi.advanceTimersByTime(300); draw();
  expect('#' + mocks.aura.mock.lastCall![0].source.uBase.value.getHexString()).toBe(mocks.update.mock.lastCall![0].idleColor);
  expect(mocks.aura.mock.lastCall![0].source.uBase.value.getHexString()).not.toBe('e6eaf1');
  await act(async () => tree!.update(createElement(KnowledgeCore, { state: 'reading', colors: palettes.dark, mode: 'dark', size: 320, reducedMotion: false }))); draw();
  expect(mocks.update.mock.lastCall![0].idleColor).toBeUndefined(); expect(mocks.aura.mock.lastCall![0].source.uBase.value.getHexString()).toBe('dde3ee');
});
