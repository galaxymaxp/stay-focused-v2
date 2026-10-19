import { Euler, Matrix3, Matrix4, Vector3 } from 'three';
import { createOrbInteractionSampler } from './orbInteractionFrame';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createOrbInteraction, ORB_COLOR_KEY, ORB_LEGACY_COLOR_KEY } from '@stay-focused/shared';
import { OrbPointerLayer, readOrbColor, rememberOrbColor, type OrbInteractionHandle } from './orbInteraction';
const store = new Map<string, string>();
let tree: ReactTestRenderer | undefined;
beforeEach(() => {
  vi.useFakeTimers(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); store.clear();
  vi.stubGlobal('localStorage', { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) });
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
});
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.useRealTimers(); vi.unstubAllGlobals(); });
it('reads and writes the device preference with guarded storage', () => {
  expect(readOrbColor()).toBe(0); rememberOrbColor(2); expect(store.get(ORB_COLOR_KEY)).toBe('green'); expect(readOrbColor()).toBe(2);
  store.set(ORB_COLOR_KEY, '99'); expect(readOrbColor()).toBe(0);
  vi.stubGlobal('localStorage', { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } });
  expect(readOrbColor()).toBe(0); expect(() => rememberOrbColor(1)).not.toThrow();
});
it('uses pan-y on a decorative ball, captures only rotation, and cancels without a tap', async () => {
  const handle: OrbInteractionHandle = { state: { current: createOrbInteraction() }, wake: { current: vi.fn() } };
  await act(async () => { tree = create(createElement(OrbPointerLayer, { interaction: handle, fill: 0.64 })); });
  const p = tree!.root.findByProps({ 'data-testid': 'orb-touch' }).props;
  expect(p.style.touchAction).toBe('pan-y'); expect(p.style.clipPath).toBe('circle(50%)'); expect(p['aria-hidden']).toBe('true'); expect(p.tabIndex).toBeUndefined();
  const capture = vi.fn();
  const target = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100 }), setPointerCapture: capture, hasPointerCapture: () => false };
  const e = (x: number, y: number) => ({ pointerId: 1, isPrimary: true, button: 0, clientX: x, clientY: y, currentTarget: target });
  p.onPointerDown(e(50, 50)); expect(capture).not.toHaveBeenCalled();
  vi.advanceTimersByTime(100); p.onPointerUp(e(50, 50)); expect(readOrbColor()).toBe(1); expect(capture).not.toHaveBeenCalled();
  p.onPointerDown(e(50, 50)); vi.advanceTimersByTime(100); p.onPointerMove(e(50, 80));
  vi.advanceTimersByTime(300); p.onPointerMove(e(60, 90)); expect(capture).not.toHaveBeenCalled();
  p.onPointerCancel(e(60, 90)); expect(readOrbColor()).toBe(1);
  p.onPointerDown(e(50, 50)); vi.advanceTimersByTime(250); p.onPointerMove(e(70, 50));
  expect(capture).toHaveBeenCalledWith(1); expect(handle.state.current.spin.y).toBeGreaterThan(0);
  p.onPointerUp(e(70, 50)); expect(readOrbColor()).toBe(1);
});

it('keeps the mobile and web body shaders and frame sampler in step', () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  for (const file of ['orbBody.ts', 'orbInteractionFrame.ts']) {
    const shader = (source: string) => file === 'orbBody.ts' ? source.slice(source.indexOf('const VERTEX ='), source.indexOf('const TONES =')) : source;
    expect(shader(read('./' + file))).toBe(shader(read('../../../../mobile/src/features/generation-core/' + file)));
  }
});

it('uses inverse liquid coordinates so a rightward drag moves the visible liquid right', () => {
  const initial = createOrbInteraction();
  const handle: OrbInteractionHandle = { state: { current: { ...initial, spin: { ...initial.spin, y: 0.5 } } }, wake: { current: null } };
  const matrix = new Matrix3(); createOrbInteractionSampler(handle)(0, 0, false, matrix);
  expect(new Vector3(0, 0, 1).applyMatrix3(matrix).x).toBeLessThan(0);
});

it.each([['0', 'gold', 1], ['1', 'green', 2], ['2', 'violet', 3], ['3', 'orange', 4], [null, 'pearl', 0]] as const)('migrates legacy %s once to %s', (legacy, key, index) => {
  if (legacy !== null) store.set(ORB_LEGACY_COLOR_KEY, legacy);
  expect(readOrbColor()).toBe(index); expect(store.get(ORB_COLOR_KEY)).toBe(key);
  store.set(ORB_LEGACY_COLOR_KEY, '3');
  expect(readOrbColor()).toBe(index);
});
it('uses the inverse of the full two-axis pose', () => {
  const initial = createOrbInteraction();
  const handle: OrbInteractionHandle = { state: { current: { ...initial, spin: { ...initial.spin, x: 0.6, y: 0.5 } } }, wake: { current: null } };
  const matrix = new Matrix3(); createOrbInteractionSampler(handle)(0, 0, false, matrix);
  const origin = new Vector3(0.1, 0.2, 0.9);
  const forward = new Matrix3().setFromMatrix4(new Matrix4().makeRotationFromEuler(new Euler(0.6, 0.5, 0)));
  expect(origin.clone().applyMatrix3(forward).applyMatrix3(matrix).distanceTo(origin)).toBeLessThan(1e-10);
});
