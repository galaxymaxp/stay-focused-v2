import { createRequire } from "node:module";
import { GLView } from "expo-gl";
import { createElement } from "react";
import { Image } from "react-native";
import { createOrbInteraction, pushOrbSpin } from "@stay-focused/shared";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { DayOrb, DAY_ORB_FILL, dayOrbTouch } from "./DayOrb";
import { CLOCK } from "./dayClock";

const mocks = vi.hoisted(() => ({
  fail: false,
  render: vi.fn(),
  animatedValue: vi.fn(),
  frame: vi.fn<(callback: FrameRequestCallback) => number>(),
}));
vi.mock("expo-gl", () => ({ GLView: "GLView" }));
vi.mock("react-native", () => ({
  View: "View", Image: "Image",
  AppState: { currentState: "active", addEventListener: () => ({ remove: vi.fn() }) },
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
    setClearColor() {}
    render = mocks.render;
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

describe("Today orb without an external glow", () => {
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
    expect(scene.children).toHaveLength(1); // Root/body only; no aura mesh.
  });
  it.each([
    { reducedMotion: true, live: true },
    { reducedMotion: false, live: false },
  ])("renders one still frame without an extra loop: %j", async overrides => {
    await render(overrides); expect(mocks.frame).not.toHaveBeenCalled();
    await startGL(); vi.advanceTimersByTime(1000); mocks.frame.mock.calls[0]![0](Date.now());
    expect(mocks.render).toHaveBeenCalledOnce(); expect(mocks.frame).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['ring', 'momentum'] as const)('does not freeze %s during a Today touch', async kind => {
    const interaction = { state: { current: createOrbInteraction() }, wake: { current: null as (() => void) | null }, ringDragging: { current: kind === 'ring' } };
    if (kind === 'momentum') interaction.state.current = pushOrbSpin(interaction.state.current, 0.2, Date.now());
    await render({ interaction }); await startGL(); dayOrbTouch.active = true;
    try { vi.advanceTimersByTime(80); mocks.frame.mock.lastCall![0](Date.now()); expect(mocks.render).toHaveBeenCalledOnce(); }
    finally { dayOrbTouch.active = false; }
  });
  it('returns from momentum cadence to the existing idle cadence', async () => {
    const interaction = { state: { current: pushOrbSpin(createOrbInteraction(), 0.2, Date.now()) }, wake: { current: null as (() => void) | null } };
    await render({ interaction }); await startGL();
    for (let i = 0; i < 350; i++) { vi.advanceTimersByTime(16); mocks.frame.mock.lastCall![0](Date.now()); }
    expect(interaction.state.current.spin.velocityY).toBe(0);
    const count = mocks.render.mock.calls.length;
    vi.advanceTimersByTime(16); mocks.frame.mock.lastCall![0](Date.now());
    expect(mocks.render.mock.calls.length).toBeLessThanOrEqual(count + 1);
    const after = mocks.render.mock.calls.length;
    vi.advanceTimersByTime(16); mocks.frame.mock.lastCall![0](Date.now());
    expect(mocks.render.mock.calls.length).toBe(after);
  });
  it('keeps the PNG fallback without a misleading halo when GL fails', async () => {
    await render({ reducedMotion: true, live: false }); mocks.fail = true; await startGL();
    const root = rendered!.root;
    expect(root.findAllByType(GLView)).toHaveLength(0); expect(root.findByType(Image).props.resizeMode).toBe('contain');
    expect(root.findAllByProps({ testID: 'day-orb-halo' })).toHaveLength(0);
    expect(mocks.frame).not.toHaveBeenCalled();
  });
});
