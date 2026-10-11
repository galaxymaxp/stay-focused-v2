import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  reducedMotion: true,
  active: true,
  focused: true,
  dark: false,
  loop: vi.fn(), start: vi.fn(), stop: vi.fn(), timing: vi.fn(),
}));
vi.mock("react-native", () => ({
  View: "View", StyleSheet: { absoluteFillObject: { position: "absolute" } },
  Easing: { ease: "ease", inOut: () => "inOut" },
  Animated: {
    View: "AnimatedView", Value: class { setValue() {} stopAnimation() {} },
    timing: mocks.timing, sequence: (steps: unknown[]) => steps, loop: mocks.loop,
  },
}));
vi.mock("react-native-svg", () => ({ default: "Svg", Path: "Path", Rect: "Rect", G: "G" }));
vi.mock("@react-navigation/native", () => ({ useIsFocused: () => mocks.focused }));
vi.mock("./primitives", () => ({ Copy: "Copy" }));
vi.mock("./theme", async () => {
  const tokens = await import("./themeTokens");
  return { ...tokens, useTheme: () => ({ colors: mocks.dark ? tokens.palettes.dark : tokens.palettes.light, reducedMotion: mocks.reducedMotion, active: mocks.active }) };
});

const { ClearDay } = await import("./ClearDay");
let rendered: ReactTestRenderer | undefined;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.reducedMotion = true; mocks.active = true; mocks.focused = true; mocks.dark = false;
  mocks.loop.mockReturnValue({ start: mocks.start, stop: mocks.stop });
});
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); rendered = undefined; });

describe("ClearDay", () => {
  it("renders the default title, detail and optional action without animation under reduced motion", async () => {
    await act(async () => { rendered = create(createElement(ClearDay, { action: createElement("Action", null, "Plan your free time") })); });
    expect(rendered!.root.findAll((node) => String(node.type) === "Copy").map((node) => node.props.children)).toEqual(["Your day is clear.", "Make room for what matters."]);
    expect(rendered!.root.find((node) => String(node.type) === "Action").props.children).toBe("Plan your free time");
    expect(mocks.loop).not.toHaveBeenCalled();
    expect(mocks.timing).not.toHaveBeenCalled();
  });

  it("renders the compact calendar copy and uses the current dark theme", async () => {
    mocks.dark = true;
    await act(async () => { rendered = create(createElement(ClearDay, { compact: true, title: "Nothing due.", detail: "Enjoy the breathing room." })); });
    expect(rendered!.root.findAll((node) => String(node.type) === "Copy").map((node) => node.props.children)).toEqual(["Nothing due.", "Enjoy the breathing room."]);
    const svg = rendered!.root.findAll((node) => String(node.type) === "Svg");
    expect(svg.every((node) => node.props.width === 96 && node.props.accessible === false)).toBe(true);
    expect(rendered!.root.findAll((node) => String(node.type) === "Path").find((node) => node.props.d === "M71 85l6 6 12-12")!.props.stroke).toBe("#FFFFFF");
  });

  it("stops an active glow when reduced motion is enabled and starts again only while focused and active", async () => {
    mocks.reducedMotion = false;
    await act(async () => { rendered = create(createElement(ClearDay)); });
    expect(mocks.start).toHaveBeenCalledTimes(1);
    expect(mocks.timing.mock.calls.map((call) => call[1])).toEqual([
      expect.objectContaining({ toValue: 0.7, duration: 3200, useNativeDriver: true }),
      expect.objectContaining({ toValue: 0.35, duration: 3200, useNativeDriver: true }),
    ]);
    mocks.reducedMotion = true;
    await act(async () => { rendered!.update(createElement(ClearDay)); });
    expect(mocks.stop).toHaveBeenCalledTimes(1);
    expect(mocks.start).toHaveBeenCalledTimes(1);
    mocks.reducedMotion = false; mocks.active = false;
    await act(async () => { rendered!.update(createElement(ClearDay)); });
    expect(mocks.start).toHaveBeenCalledTimes(1);
    mocks.active = true; mocks.focused = false;
    await act(async () => { rendered!.update(createElement(ClearDay)); });
    expect(mocks.start).toHaveBeenCalledTimes(1);
    mocks.focused = true;
    await act(async () => { rendered!.update(createElement(ClearDay)); });
    expect(mocks.start).toHaveBeenCalledTimes(2);
    await act(async () => { rendered!.unmount(); }); rendered = undefined;
    expect(mocks.stop).toHaveBeenCalledTimes(2);
  });
});
