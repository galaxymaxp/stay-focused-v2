import { createElement, type ReactElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GenerationVisual } from "./GenerationVisual";

type MockFn = ReturnType<typeof vi.fn>;
const mocks = vi.hoisted(() => ({
  active: true,
  focused: true,
  reducedMotion: false,
  parallels: [] as { start: MockFn; stop: MockFn }[],
  springs: [] as Record<string, unknown>[],
  values: [] as { stopAnimation: MockFn }[],
}));

vi.mock("@react-navigation/native", () => ({ useIsFocused: () => mocks.focused }));
vi.mock("../../design/theme", async () => {
  const tokens = await import("../../design/themeTokens");
  return { ...tokens, useTheme: () => ({ active: mocks.active, colors: tokens.palettes.light, mode: "light", reducedMotion: mocks.reducedMotion }) };
});
vi.mock("react-native", () => {
  class Value {
    stopAnimation = vi.fn();
    constructor(_value: unknown) { mocks.values.push(this); }
    setValue() {}
    interpolate(config: unknown) { return config; }
  }
  const animation = () => ({ start: vi.fn(), stop: vi.fn() });
  return {
    View: "View",
    StyleSheet: { absoluteFillObject: { position: "absolute", inset: 0 }, create: (styles: unknown) => styles },
    Easing: { ease: vi.fn(), linear: vi.fn(), inOut: (value: unknown) => value },
    Animated: {
      View: "AnimatedView",
      Value,
      loop: () => animation(),
      sequence: () => animation(),
      timing: () => animation(),
      parallel: () => { const value = animation(); mocks.parallels.push(value); return value; },
      spring: (_value: unknown, config: Record<string, unknown>) => { mocks.springs.push(config); return animation(); },
    },
  };
});
vi.mock("react-native-svg", () => ({ default: "Svg", Circle: "Circle", Defs: "Defs", Ellipse: "Ellipse", LinearGradient: "LinearGradient", Path: "Path", RadialGradient: "RadialGradient", Stop: "Stop" }));

let rendered: ReactTestRenderer | undefined;
beforeEach(() => {
  mocks.active = true;
  mocks.focused = true;
  mocks.reducedMotion = false;
  mocks.parallels.length = 0;
  mocks.springs.length = 0;
  mocks.values.length = 0;
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterEach(async () => {
  if (rendered) await act(async () => rendered!.unmount());
  rendered = undefined;
});
async function render(element: ReactElement) {
  await act(async () => { rendered = create(element); });
  return rendered!.root;
}

describe("GenerationVisual", () => {
  it("runs native-driven ambient motion only while active and focused", async () => {
    await render(createElement(GenerationVisual, { running: true, completed: false }));
    expect(mocks.parallels).toHaveLength(1);
    expect(mocks.parallels[0]!.start).toHaveBeenCalledOnce();
    mocks.focused = false;
    await act(async () => rendered!.update(createElement(GenerationVisual, { running: true, completed: false })));
    expect(mocks.parallels[0]!.stop).toHaveBeenCalled();
    expect(mocks.parallels).toHaveLength(1);
  });

  it("holds a stable frame for reduced motion", async () => {
    mocks.reducedMotion = true;
    const root = await render(createElement(GenerationVisual, { running: true, completed: false }));
    expect(mocks.parallels).toHaveLength(0);
    expect(root.findByProps({ testID: "generation-visual" }).props.accessibilityState).toEqual({ busy: true });
  });

  it("animates into and announces its completion state", async () => {
    const root = await render(createElement(GenerationVisual, { running: false, completed: true }));
    expect(mocks.springs.at(-1)).toEqual(expect.objectContaining({ toValue: 1, useNativeDriver: true }));
    expect(root.findByProps({ testID: "generation-visual" }).props.accessibilityLabel).toBe("Generation complete");
  });
});
