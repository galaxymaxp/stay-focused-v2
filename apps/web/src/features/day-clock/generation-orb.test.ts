import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('./DayOrb', () => ({ DayOrb: 'DayOrb', DAY_ORB_FILL: 0.64 }));
vi.mock('../knowledge-core/orbInteraction', async original => ({ ...await original<typeof import('../knowledge-core/orbInteraction')>(), OrbPointerLayer: 'OrbPointerLayer' }));
const { GenerationOrb } = await import('./GenerationOrb');
let tree: ReactTestRenderer | undefined;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('localStorage', { getItem: () => 'violet', setItem() {} });
  vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {} });
});
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.unstubAllGlobals(); });
it('renders the Today orb with the job state and one shared ball-only pointer target', async () => {
  await act(async () => { tree = create(createElement(GenerationOrb, { state: 'generating' })); });
  const orb = tree!.root.findByType('DayOrb' as never), pointer = tree!.root.findByType('OrbPointerLayer' as never);
  expect(orb.props.state).toBe('generating');
  expect(orb.props.size).toBeUndefined();
  expect(pointer.props.fill).toBe(0.64);
  expect(pointer.props.interaction).toBe(orb.props.interaction);
  expect(orb.props.interaction.state.current.colorIndex).toBe(3);
  expect(tree!.root.findByProps({ 'data-testid': 'generation-orb' }).props['data-state']).toBe('generating');
});
