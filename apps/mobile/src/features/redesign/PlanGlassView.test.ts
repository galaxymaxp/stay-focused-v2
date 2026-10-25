import { createElement } from 'react';
import { createRequire } from 'node:module';
import * as THREE from 'three';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { createOrbInteraction } from '@stay-focused/shared';
import { PlanGlassView } from './PlanGlassView';
import type { PlanGlassFrame } from '@stay-focused/shared/plan-glass-renderer';

const mocks = vi.hoisted(() => ({ load: vi.fn(), build: vi.fn(), dispose: vi.fn(), wake: vi.fn(), rendererDispose: vi.fn(),
  current: null as (() => PlanGlassFrame) | null, present: null as (() => void) | null, ready: null as (() => void) | null }));
vi.mock('expo-gl', () => ({ GLView: 'GLView' }));
vi.mock('react-native', () => ({ View: 'View' }));
vi.mock('../generation-core/threeContext', () => ({ threeContext: (gl: unknown) => gl }));
vi.mock('./glassAtlas', () => ({ loadGlassAtlas: mocks.load }));
vi.mock('@stay-focused/shared/plan-glass-renderer', () => ({
  planImpulse: (impulses: unknown[], x: number, y: number, at: number, reduced: boolean) => reduced ? [] : [...impulses, { at, direction: { x, y, z: 1 } }],
  createPlanGlassLoop: (_r: unknown, _a: unknown, _m: unknown, current: () => PlanGlassFrame, ready: () => void, _failure: unknown, present: () => void) => {
    mocks.build(); mocks.current = current; mocks.present = present; mocks.ready = ready;
    return { wake: mocks.wake, dispose: mocks.dispose };
  },
}));
vi.mock('three', async original => ({ ...await original<typeof import('three')>(), WebGLRenderer: class {
  setPixelRatio() {} setSize() {} dispose = mocks.rendererDispose;
} }));
let tree: ReactTestRenderer | undefined;
const require = createRequire(import.meta.url);
const previousPngLoader = require.extensions['.png'];
beforeAll(() => { require.extensions['.png'] = module => { module.exports = 1; }; });
afterAll(() => { if (previousPngLoader) require.extensions['.png'] = previousPngLoader; else delete require.extensions['.png']; });
const props = () => ({ width: 358, mode: 'dark' as const, reducedMotion: false, live: true, interaction: { state: { current: createOrbInteraction() }, wake: { current: null as (() => void) | null } },
  handle: { current: null as { press(x: number, y?: number): void } | null }, onReady: vi.fn(), onFailure: vi.fn(), onLoading: vi.fn() });
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); mocks.load.mockResolvedValue(new THREE.Texture()); });
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; vi.unstubAllGlobals(); });
async function context(end = vi.fn()) {
  await act(async () => tree!.root.findByType('GLView' as never).props.onContextCreate({ drawingBufferWidth: 215, drawingBufferHeight: 31, endFrameEXP: end }));
  return end;
}
it('uses reduced native resolution, updates runtime in place and presents with endFrameEXP', async () => {
  const p = props(); await act(async () => { tree = create(createElement(PlanGlassView, p)); });
  expect(tree!.root.findByType('GLView' as never).props.style).toMatchObject({ width: 214.79999999999998, height: 31.2 });
  const end = await context(); expect(mocks.build).toHaveBeenCalledOnce();
  mocks.present?.(); expect(end).toHaveBeenCalledOnce(); mocks.ready?.(); expect(p.onReady).toHaveBeenCalledOnce();
  p.handle.current!.press(-1); expect(mocks.current?.()?.impulses[0]?.direction.x).toBe(-1);
  expect(mocks.current?.()?.palette().colorIndex).toBe(0);
  await act(async () => tree!.update(createElement(PlanGlassView, { ...p, live: false, mode: 'light', reducedMotion: true })));
  expect(mocks.current?.()).toMatchObject({ running: false, reducedMotion: true, mode: 'light' });
  expect(mocks.build).toHaveBeenCalledOnce();
});
it('disposes a late atlas without constructing a scene after unmount', async () => {
  let resolveAtlas: (texture: THREE.Texture) => void = () => {};
  mocks.load.mockReturnValue(new Promise<THREE.Texture>(resolve => { resolveAtlas = resolve; }));
  await act(async () => { tree = create(createElement(PlanGlassView, props())); });
  await context(); await act(async () => tree!.unmount()); tree = undefined;
  const atlas = new THREE.Texture(), dispose = vi.spyOn(atlas, 'dispose');
  await act(async () => resolveAtlas(atlas));
  expect(dispose).toHaveBeenCalledOnce(); expect(mocks.build).not.toHaveBeenCalled(); expect(mocks.rendererDispose).toHaveBeenCalledOnce();
});
it('rebuilds on a replaced native context and releases the old scene and texture', async () => {
  const atlas = new THREE.Texture(), dispose = vi.spyOn(atlas, 'dispose'); mocks.load.mockResolvedValue(atlas);
  await act(async () => { tree = create(createElement(PlanGlassView, props())); });
  await context(); await context();
  expect(mocks.build).toHaveBeenCalledTimes(2); expect(mocks.dispose).toHaveBeenCalledOnce();
  expect(dispose).toHaveBeenCalledOnce(); expect(mocks.rendererDispose).toHaveBeenCalledOnce();
});
