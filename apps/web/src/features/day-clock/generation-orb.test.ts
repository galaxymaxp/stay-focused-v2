import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('./DeferredDayOrb', () => ({ DeferredDayOrb: 'DayOrb' }));
vi.mock('./orb-footprint', () => ({ DAY_ORB_FILL: 0.64 }));
vi.mock('../knowledge-core/orbInteraction', async original => ({ ...await original<typeof import('../knowledge-core/orbInteraction')>(), OrbPointerLayer: 'OrbPointerLayer' }));
const { GenerationOrb } = await import('./GenerationOrb');
let tree: ReactTestRenderer | undefined;
let visibility: () => void, focus: () => void, blur: () => void;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('localStorage', { getItem: () => 'violet', setItem() {} });
  vi.stubGlobal('document', { visibilityState: 'visible', addEventListener(_name: string, fn: () => void) { visibility = fn; }, removeEventListener() {} });
  vi.stubGlobal('window', { addEventListener(name: string, fn: () => void) { if (name === 'focus') focus = fn; if (name === 'blur') blur = fn; }, removeEventListener() {} });
});
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.useRealTimers(); vi.unstubAllGlobals(); });
it('renders the Today orb with the job state and one shared ball-only pointer target', async () => {
  await act(async () => { tree = create(createElement(GenerationOrb, { state: 'generating' })); });
  const orb = tree!.root.findByType('DayOrb' as never), pointer = tree!.root.findByType('OrbPointerLayer' as never);
  expect(orb.props.state).toBe('generating');
  expect(orb.props.variant).toBe('standalone');
  expect(orb.props.size).toBeUndefined();
  expect(pointer.props.fill).toBe(0.64);
  expect(pointer.props.interaction).toBe(orb.props.interaction);
  expect(orb.props.interaction.state.current.colorIndex).toBe(3);
  expect(tree!.root.findByProps({ 'data-testid': 'generation-orb' }).props['data-state']).toBe('generating');
});

it('suspends the time refresh when hidden or unfocused and removes it on disposal', async () => {
  vi.useFakeTimers();
  await act(async () => { tree = create(createElement(GenerationOrb, { state: 'idle' })); });
  expect(vi.getTimerCount()).toBe(1);
  await act(async () => blur()); expect(vi.getTimerCount()).toBe(0);
  await act(async () => focus()); expect(vi.getTimerCount()).toBe(1);
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
  await act(async () => visibility()); expect(vi.getTimerCount()).toBe(0);
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  await act(async () => visibility()); expect(vi.getTimerCount()).toBe(1);
  await act(async () => tree!.unmount()); tree = undefined;
  expect(vi.getTimerCount()).toBe(0);
});
