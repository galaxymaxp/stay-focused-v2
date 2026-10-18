import { createRequire } from "node:module";
import { GLView } from "expo-gl";
import { createElement } from "react";
import { Image } from "react-native";
import { Stop } from "react-native-svg";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { DayOrb, DAY_ORB_FILL } from "./DayOrb";
import { CLOCK, dayOrbTones } from "./dayClock";

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

describe("Today orb static outer glow", () => {
  it("extends beyond the unchanged glass footprint and fades before the handles", async () => {
    const root = await render();
    const halo = root.findByProps({ testID: "day-orb-halo" });
    const stops = halo.findAllByType(Stop);
    const peak = stops.find((stop) => stop.props.stopOpacity === 0.35)!;
    const edge = stops.at(-2)!;
    expect(size * DAY_ORB_FILL).toBeCloseTo(CLOCK.glass * 2);
    expect(halo.props.width).toBe(size);
    expect(halo.props.height).toBe(size);
    expect(peak.props.offset * size / 2).toBeGreaterThan(CLOCK.glass);
    expect(edge.props.offset * size / 2).toBeLessThan(CLOCK.ring - 2);
    expect(edge.props.stopOpacity).toBe(0);
    expect(stops[1]!.props.stopOpacity).toBe(0); // No fog behind the readout.
    const gl = root.findByType(GLView);
    expect(gl.props.style.width * gl.props.style.transform[0].scale).toBeCloseTo(size);
    expect(halo.parent!.children.indexOf(halo)).toBeLessThan(halo.parent!.children.indexOf(gl));
    expect(halo.props.style).toEqual({ position: "absolute", top: 0, left: 0 });
  });

  it("passes touches through both the halo and its host", async () => {
    const root = await render();
    const halo = root.findByProps({ testID: "day-orb-halo" });
    expect(halo.props.pointerEvents).toBe("none");
    expect(halo.parent!.props.pointerEvents).toBe("none");
    expect(halo.parent!.props.accessibilityElementsHidden).toBe(true);
  });

  it("follows the existing day aura tint when the minute changes", async () => {
    const root = await render({ minutes: 0 });
    expect(dayOrbTones(0).aura).not.toBe(dayOrbTones(720).aura);
    for (const minutes of [0, 720]) {
      await act(async () => rendered!.update(createElement(DayOrb, { ...props, minutes })));
      expect(root.findAllByType(Stop).every((stop) => stop.props.stopColor === dayOrbTones(minutes).aura)).toBe(true);
    }
  });

  it("uses a subtler light-theme peak with a transparent edge", async () => {
    const root = await render({ mode: "light" });
    const stops = root.findAllByType(Stop);
    expect(Math.max(...stops.map((stop) => Number(stop.props.stopOpacity)))).toBe(0.16);
    expect(stops.at(-1)!.props).toMatchObject({ offset: 1, stopOpacity: 0 });
  });

  it.each([
    { reducedMotion: true, live: true },
    { reducedMotion: false, live: false },
  ])("keeps a static halo without an extra render loop: %j", async (overrides) => {
    const root = await render(overrides);
    const haloBefore = root.findByProps({ testID: "day-orb-halo" }).props;
    expect(mocks.frame).not.toHaveBeenCalled(); // Mounting the halo schedules nothing.
    await startGL();
    expect(mocks.frame).toHaveBeenCalledOnce(); // Existing GL initial still frame.
    vi.advanceTimersByTime(1000);
    mocks.frame.mock.calls[0]![0](Date.now());
    expect(mocks.render).toHaveBeenCalledOnce();
    expect(mocks.frame).toHaveBeenCalledOnce();
    expect(mocks.animatedValue).not.toHaveBeenCalled();
    expect(root.findByProps({ testID: "day-orb-halo" }).props).toBe(haloBefore);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("retains the unanimated glow behind the PNG when GL fails", async () => {
    const root = await render({ reducedMotion: true, live: false });
    mocks.fail = true;
    await startGL();
    expect(root.findAllByType(GLView)).toHaveLength(0);
    expect(root.findByType(Image).props.resizeMode).toBe("contain");
    expect(root.findByProps({ testID: "day-orb-halo" }).props.pointerEvents).toBe("none");
    expect(root.findAllByType(Stop)[2]!.props.stopOpacity).toBe(0.35);
    expect(mocks.frame).not.toHaveBeenCalled();
    expect(mocks.animatedValue).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
