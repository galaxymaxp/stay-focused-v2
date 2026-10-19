import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ZoomableImage } from './zoomable-image';

let tree: ReactTestRenderer | undefined, resize: () => void;
const node = { getBoundingClientRect: () => ({ left: 10, top: 20, width: 400, height: 300 }),
  setPointerCapture: vi.fn(), hasPointerCapture: () => true, releasePointerCapture: vi.fn() };
const frame = () => tree!.root.findByProps({ role: 'button' });
const image = () => tree!.root.findByType('img');
const pointer = (x: number, y: number, type = 'pointermove') => ({ pointerId: 1, isPrimary: true, button: 0, clientX: x, clientY: y, currentTarget: node, type });
async function tap(x = 110, y = 95) { await act(async () => frame().props.onClick({ clientX: x, clientY: y, detail: 1, currentTarget: node })); }
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal('getComputedStyle', () => ({ width: '400px', height: '300px' }));
  vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { resize = callback; } observe() {} disconnect() {} });
  await act(async () => { tree = create(createElement(ZoomableImage, { src: 'https://image.test/local', alt: 'Source diagram', onError: vi.fn() }), { createNodeMock: () => node }); });
  await act(async () => image().props.onLoad({ currentTarget: { naturalWidth: 800, naturalHeight: 600 } }));
});
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.unstubAllGlobals(); vi.clearAllMocks(); });

it('zooms at the tapped point with a transform, then restores fit without changing width', async () => {
  expect(image().props.style.width).toBe(400);
  await tap();
  expect(image().props.style).toMatchObject({ transformOrigin: '25% 25%', transform: 'translate(0px, 0px) scale(2.5)', width: 400 });
  expect(frame().props.style.cursor).toBe('zoom-out');
  await tap();
  expect(image().props.style.transform).toBe('translate(0px, 0px) scale(1)');
  expect(image().props.style.transformOrigin).toBe('50% 50%');
  expect(frame().props.style.cursor).toBe('zoom-in');
});

it('captures a zoomed pointer, clamps pan, and suppresses the click after a drag or cancel', async () => {
  await tap();
  await act(async () => frame().props.onPointerDown(pointer(110, 95, 'pointerdown')));
  await act(async () => frame().props.onPointerMove(pointer(5000, -5000)));
  expect(image().props.style.transform).toBe('translate(150px, -337.5px) scale(2.5)');
  expect(image().props.style.transitionDuration).toBe('0ms');
  await act(async () => frame().props.onPointerUp(pointer(5000, -5000, 'pointerup')));
  await tap();
  expect(frame().props['aria-pressed']).toBe(true);
  expect(node.setPointerCapture).toHaveBeenCalledWith(1);
  expect(node.releasePointerCapture).toHaveBeenCalledWith(1);
  await act(async () => frame().props.onPointerDown(pointer(10, 10, 'pointerdown')));
  await act(async () => frame().props.onPointerCancel(pointer(10, 10, 'pointercancel')));
  await tap(); expect(frame().props['aria-pressed']).toBe(true);
});

it('keeps a letterboxed axis centered, supports keyboard zoom, and resets on resize', async () => {
  await act(async () => image().props.onLoad({ currentTarget: { naturalWidth: 800, naturalHeight: 100 } }));
  await tap(410, 320);
  expect(image().props.style.transform).toBe('translate(0px, 37.5px) scale(2.5)');
  await act(async () => resize()); expect(frame().props['aria-pressed']).toBe(false);
  const preventDefault = vi.fn();
  await act(async () => frame().props.onKeyDown({ key: 'Enter', preventDefault }));
  expect(frame().props['aria-pressed']).toBe(true); expect(preventDefault).toHaveBeenCalledOnce();
  await act(async () => frame().props.onKeyDown({ key: ' ', preventDefault }));
  expect(frame().props['aria-pressed']).toBe(false);
});

it('completes touch taps on release even without a compatibility click, and avoids toggling twice when it arrives', async () => {
  await act(async () => frame().props.onPointerDown(pointer(110, 95, 'pointerdown')));
  await act(async () => frame().props.onPointerUp(pointer(110, 95, 'pointerup')));
  expect(frame().props['aria-pressed']).toBe(true);
  await tap(); expect(frame().props['aria-pressed']).toBe(true);
  await act(async () => frame().props.onPointerDown(pointer(110, 95, 'pointerdown')));
  await act(async () => frame().props.onPointerUp(pointer(110, 95, 'pointerup')));
  expect(frame().props['aria-pressed']).toBe(false);
});
