import { createRequire } from "node:module";
import { GLView } from "expo-gl";
import { createElement } from "react";
import { createOrbInteraction, pushOrbSpin, ORB_IDLE_PALETTE, orbPaletteAppearance } from "@stay-focused/shared";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { DayOrb, DAY_ORB_FILL, dayOrbTouch } from "./DayOrb";
import { CLOCK } from "./dayClock";

const mocks = vi.hoisted(() => ({
  appState: null as ((state: string) => void) | null,
  fail: false,
  render: vi.fn(),
  animatedValue: vi.fn(),
  frame: vi.fn<(callback: FrameRequestCallback) => number>(),
  glass: vi.fn(), glassDispose: vi.fn(), atlasFail: false,
}));
vi.mock("expo-gl", () => ({ GLView: "GLView" }));
vi.mock('expo-asset', () => ({ Asset: { fromModule: () => ({ localUri: 'file:///clock-atlas.png',
  downloadAsync: async () => { if (mocks.atlasFail) throw new Error('missing_atlas'); } }) } }));
vi.mock('@stay-focused/shared/clock-glass-renderer', () => ({ createClockGlass: () => ({ render: mocks.glass, dispose: mocks.glassDispose }) }));
vi.mock("react-native", () => ({
  View: "View", Image: "Image", Platform: { OS: 'android' },
  AppState: { currentState: "active", addEventListener: (_event: string, listener: (state: string) => void) => { mocks.appState = listener; return { remove: vi.fn() }; } },
  Animated: { Value: mocks.animatedValue },
}));
vi.mock("react-native-svg", () => ({
  default: "Svg", Circle: "Circle", Defs: "Defs", RadialGradient: "RadialGradient", Stop: "Stop",
}));
vi.mock("../generation-core/threeContext", () => ({ threeContext: (gl: unknown) => gl }));
vi.mock("three", async (importOriginal) => ({
  ...await importOriginal<typeof import("three")>(),
  WebGLRenderer: class {
    constructor() { if (mocks.fail) throw new Error("Unavailable GL"); }
    setSize() {}
    setPixelRatio() {}
    setClearColor() {} getRenderTarget() { return null; }
    setRenderTarget() {} render = mocks.render;
    dispose() {}
  },
}));

const require = createRequire(import.meta.url);
const previousPngLoader = require.extensions[".png"];
beforeAll(() => { require.extensions[".png"] = (module) => { module.exports = 1; }; });
afterAll(() => {
  if (previousPngLoader) require.extensions[".png"] = previousPngLoader;
  else delete require.extensions[".png"];
});
let rendered: ReactTestRenderer | undefined;
const size = (CLOCK.glass * 2) / DAY_ORB_FILL;
const props = { minutes: 720, size, mode: "dark" as const, reducedMotion: false, live: true };
beforeEach(() => {
  mocks.fail = false;
  mocks.atlasFail = false;
  mocks.glass.mockReset();
  vi.clearAllMocks();
  vi.useFakeTimers();
  mocks.frame.mockReturnValue(1);
  vi.stubGlobal("requestAnimationFrame", mocks.frame);
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterEach(async () => {
  if (rendered) await act(async () => rendered!.unmount());
  rendered = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
async function render(overrides: Partial<Parameters<typeof DayOrb>[0]> = {}) {
  await act(async () => { rendered = create(createElement(DayOrb, { ...props, ...overrides })); });
  return rendered!.root;
}
async function startGL() {
  await act(async () => rendered!.root.findByType(GLView).props.onContextCreate({
    drawingBufferWidth: 192, drawingBufferHeight: 192, endFrameEXP: vi.fn(),
  }));
}

it.each(ORB_IDLE_PALETTE)('keeps Today and idle Generation appearance identical for $key across live theme changes', async color => {
  const interaction = { state: { current: createOrbInteraction(ORB_IDLE_PALETTE.indexOf(color)) }, wake: { current: null as (() => void) | null } };
  await render({ interaction, reducedMotion: true }); await startGL();
  vi.advanceTimersByTime(16); mocks.frame.mock.lastCall![0](Date.now());
  const scene = mocks.render.mock.lastCall![0];
  const body = scene.children[0].children[0].material.uniforms;
  for (const mode of ['light', 'dark'] as const) {
    await act(async () => rendered!.update(createElement(DayOrb, { ...props, interaction, mode, reducedMotion: true })));
    vi.advanceTimersByTime(16); mocks.frame.mock.lastCall![0](Date.now());
    const appearance = [body.uBase, body.uDeep, body.uGlowColor, body.uEnvFloor, body.uEnvSky].map(u => u.value.getHexString());
    expect('#' + body.uDeep.value.getHexString()).toBe(orbPaletteAppearance(color.key, mode).deep.toLowerCase());
    await act(async () => rendered!.update(createElement(DayOrb, { ...props, interaction, mode, reducedMotion: true, state: 'idle' })));
    vi.advanceTimersByTime(16); mocks.frame.mock.lastCall![0](Date.now());
    expect([body.uBase, body.uDeep, body.uGlowColor, body.uEnvFloor, body.uEnvSky].map(u => u.value.getHexString())).toEqual(appearance);
    expect(mocks.render.mock.lastCall![0]).toBe(scene);
    expect(interaction.state.current.colorIndex).toBe(ORB_IDLE_PALETTE.indexOf(color));
  }
});

it('keeps momentum and the GL view when the resolved theme changes', async () => {
  const interaction = { state: { current: pushOrbSpin(createOrbInteraction(), 0.2, Date.now()) }, wake: { current: null as (() => void) | null } };
  await render({ interaction }); await startGL();
  vi.advanceTimersByTime(16); mocks.frame.mock.lastCall![0](Date.now());
  const view = rendered!.root.findByType(GLView), scene = mocks.render.mock.lastCall![0];
  await act(async () => rendered!.update(createElement(DayOrb, { ...props, interaction, mode: 'light' })));
  expect(rendered!.root.findByType(GLView)).toBe(view);
  expect(interaction.state.current.spin.velocityY).not.toBe(0);
  vi.advanceTimersByTime(16); mocks.frame.mock.lastCall![0](Date.now());
  expect(mocks.render.mock.lastCall![0]).toBe(scene);
  expect(interaction.state.current.spin.velocityY).not.toBe(0);
});

it('composites in the existing reduced-resolution GL view and redraws changed time on the next frame under Reduce Motion', async () => {
  const ready = vi.fn();
  await render({ clock: { text: '3:30 PM', fontSize: 32 }, reducedMotion: true, onGlassReady: ready });
  await startGL(); await act(async () => { await vi.dynamicImportSettled(); });
  await act(async () => { vi.advanceTimersByTime(16); mocks.frame.mock.lastCall![0](Date.now()); });
  expect(mocks.glass.mock.lastCall!.slice(2, 4)).toEqual([{ text: '3:30 PM', fontSize: 32 }, size]);
  expect(ready).toHaveBeenLastCalledWith(true);
  const count = mocks.frame.mock.calls.length;
  await act(async () => rendered!.update(createElement(DayOrb, { ...props, reducedMotion: true, clock: { text: '3:31 PM', fontSize: 30 }, onGlassReady: ready })));
  expect(mocks.frame.mock.calls.length).toBe(count + 1);
  await act(async () => { vi.advanceTimersByTime(16); mocks.frame.mock.lastCall![0](Date.now()); });
  expect(mocks.glass.mock.lastCall![2]).toEqual({ text: '3:31 PM', fontSize: 30 });
  expect(mocks.frame.mock.calls.length).toBe(count + 1);
  expect(rendered!.root.findAllByType(GLView)).toHaveLength(1);
});
it('keeps the original orb and plain-text readiness when the atlas cannot load', async () => {
  mocks.atlasFail = true; const ready = vi.fn();
  await render({ clock: { text: '3:30 PM', fontSize: 32 }, reducedMotion: true, onGlassReady: ready });
  await startGL(); await act(async () => { await vi.dynamicImportSettled(); });
  await act(async () => { vi.advanceTimersByTime(16); mocks.frame.mock.lastCall![0](Date.now()); });
  expect(mocks.glass).not.toHaveBeenCalled(); expect(ready).not.toHaveBeenCalledWith(true);
  expect(mocks.render).toHaveBeenCalledTimes(2);
});
it('withdraws glass readiness and disposes the composite on a draw failure', async () => {
  const ready = vi.fn();
  await render({ clock: { text: '3:30 PM', fontSize: 32 }, reducedMotion: true, onGlassReady: ready });
  await startGL(); await act(async () => { await vi.dynamicImportSettled(); });
  await act(async () => { vi.advanceTimersByTime(16); mocks.frame.mock.lastCall![0](Date.now()); });
  expect(ready).toHaveBeenLastCalledWith(true);
  mocks.glass.mockImplementationOnce(() => { throw new Error('lost_texture'); });
  await act(async () => rendered!.update(createElement(DayOrb, { ...props, reducedMotion: true, clock: { text: '3:31 PM', fontSize: 32 }, onGlassReady: ready })));
  await act(async () => { vi.advanceTimersByTime(16); mocks.frame.mock.lastCall![0](Date.now()); });
  expect(ready).toHaveBeenLastCalledWith(false);
  expect(mocks.glassDispose).toHaveBeenCalledOnce(); expect(mocks.render).toHaveBeenCalledTimes(3);
});

describe("Today orb with one in-scene ambient spill", () => {
  it("keeps the glass footprint and passes touches through its decorative host", async () => {
    const root = await render();
    expect(root.findAllByProps({ testID: 'day-orb-halo' })).toHaveLength(0);
    const gl = root.findByType(GLView);
    expect(size * DAY_ORB_FILL).toBeCloseTo(CLOCK.glass * 2);
    expect(gl.props.style.width * gl.props.style.transform[0].scale).toBeCloseTo(size);
    expect(gl.parent!.props.pointerEvents).toBe('none');
    expect(gl.parent!.props.accessibilityElementsHidden).toBe(true);
    await startGL(); vi.advanceTimersByTime(80); mocks.frame.mock.lastCall![0](Date.now());
    const scene = mocks.render.mock.lastCall![0];
    expect(scene.children).toHaveLength(2); // Root/body and exactly one ambient plane.
    const body = scene.children[0].children[0].material.uniforms;
    const spill = scene.children[1].material.uniforms;
    expect(spill.uSource.value.image).toMatchObject({ width: 64, height: 64 });
    expect(body.uTime.value).toBeGreaterThanOrEqual(0);
    expect(mocks.render.mock.calls[0]).toEqual([scene, mocks.render.mock.lastCall![1]]);
  });
  it.each([
    { reducedMotion: true, live: true },

  ])("renders one still frame without an extra loop: %j", async overrides => {
    await render(overrides); expect(mocks.frame).not.toHaveBeenCalled();
    await startGL(); vi.advanceTimersByTime(1000); mocks.frame.mock.calls[0]![0](Date.now());
    expect(mocks.render).toHaveBeenCalledTimes(2); expect(mocks.frame).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['ring', 'momentum'] as const)('does not freeze %s during a Today touch', async kind => {
    const interaction = { state: { current: createOrbInteraction() }, wake: { current: null as (() => void) | null }, ringDragging: { current: kind === 'ring' } };
    if (kind === 'momentum') interaction.state.current = pushOrbSpin(interaction.state.current, 0.2, Date.now());
    await render({ interaction }); await startGL(); dayOrbTouch.active = true;
    try { vi.advanceTimersByTime(80); mocks.frame.mock.lastCall![0](Date.now()); expect(mocks.render).toHaveBeenCalledTimes(2); }
    finally { dayOrbTouch.active = false; }
  });
  it('returns from momentum cadence to the existing idle cadence', async () => {
    const interaction = { state: { current: pushOrbSpin(createOrbInteraction(), 0.2, Date.now()) }, wake: { current: null as (() => void) | null } };
    await render({ interaction }); await startGL();
    for (let i = 0; i < 350; i++) { vi.advanceTimersByTime(16); mocks.frame.mock.lastCall![0](Date.now()); }
    expect(interaction.state.current.spin.velocityY).toBe(0);
    const count = mocks.render.mock.calls.length;
    vi.advanceTimersByTime(16); mocks.frame.mock.lastCall![0](Date.now());
    expect(mocks.render.mock.calls.length).toBeLessThanOrEqual(count + 2);
    const after = mocks.render.mock.calls.length;
    vi.advanceTimersByTime(16); mocks.frame.mock.lastCall![0](Date.now());
    expect(mocks.render.mock.calls.length).toBe(after);
  });
  it('keeps a theme-aware static palette poster without a loop when GL fails', async () => {
    await render({ reducedMotion: true, live: false }); mocks.fail = true; await startGL();
    const root = rendered!.root;
    expect(root.findAllByType(GLView)).toHaveLength(0);
    expect(root.findAllByProps({ testID: 'orb-poster' })).toHaveLength(1);
    expect(mocks.frame).not.toHaveBeenCalled();
  });
});

describe("Today orb with a generation state", () => {
  const uniforms = () => {
    const scene = mocks.render.mock.lastCall![0] as { children: { children: { material: { uniforms: Record<string, { value: number }> } }[] }[] };
    return scene.children[0]!.children[0]!.material.uniforms;
  };
  const step = () => { vi.advanceTimersByTime(16); mocks.frame.mock.lastCall![0](Date.now()); };
  it("keeps Today exactly without a state", async () => {
    await render(); await startGL(); vi.advanceTimersByTime(80); mocks.frame.mock.lastCall![0](Date.now());
    expect(uniforms().uLife!.value).toBe(0.22); expect(uniforms().uError!.value).toBe(0); expect(uniforms().uLevel!.value).toBe(0);
  });
  it("runs livelier at full frame rate while generating", async () => {
    await render({ state: "generating" }); await startGL();
    for (let i = 0; i < 5; i++) step();
    expect(mocks.render.mock.calls.length).toBeGreaterThanOrEqual(5);
    expect(uniforms().uLife!.value).toBeGreaterThan(0.6); expect(uniforms().uError!.value).toBe(0);
  });
  it("dims a failure to still and stops requesting frames", async () => {
    await render({ state: "error" }); await startGL();
    for (let i = 0; i < 40; i++) step();
    expect(uniforms().uError!.value).toBe(1);
    const requested = mocks.frame.mock.calls.length;
    step();
    expect(mocks.frame.mock.calls.length).toBe(requested);
  });
  it("brightens briefly on completion, then returns to Today's idle body", async () => {
    await render({ state: "generating" }); await startGL();
    for (let i = 0; i < 3; i++) step();
    await act(async () => rendered!.update(createElement(DayOrb, { ...props, state: "complete" })));
    step();
    const settledGlow = () => uniforms().uGlow!.value;
    const bright = settledGlow();
    for (let i = 0; i < 300; i++) step();
    expect(bright).toBeGreaterThan(settledGlow() + 0.2);
    expect(uniforms().uLife!.value).toBeCloseTo(0.22, 2);
  });
});

it('does not draw while unfocused or backgrounded and disposes the ambient mesh', async () => {
  await render({ live: false }); await startGL();
  expect(mocks.frame).not.toHaveBeenCalled();
  await act(async () => rendered!.update(createElement(DayOrb, props)));
  vi.advanceTimersByTime(80); mocks.frame.mock.lastCall![0](Date.now());
  const aura = mocks.render.mock.lastCall![0].children[1];
  const dispose = vi.spyOn(aura.geometry, 'dispose');
  const count = mocks.render.mock.calls.length;
  await act(async () => mocks.appState?.('background'));
  vi.advanceTimersByTime(80); mocks.frame.mock.lastCall![0](Date.now());
  expect(mocks.render).toHaveBeenCalledTimes(count);
  await act(async () => mocks.appState?.('active'));
  vi.advanceTimersByTime(80); mocks.frame.mock.lastCall![0](Date.now());
  expect(mocks.render.mock.calls.length).toBe(count + 2);
  await act(async () => rendered!.unmount()); rendered = undefined;
  expect(dispose).toHaveBeenCalledOnce();
});
