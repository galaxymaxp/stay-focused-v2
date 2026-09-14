import { createElement, type ReactElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GenerationOrb } from "./GenerationOrb";

type MockFn = ReturnType<typeof vi.fn>;

const mocks = vi.hoisted(() => ({
  active: true,
  focused: true,
  reducedMotion: false,
  parallels: [] as { start: MockFn; stop: MockFn }[],
  sequences: [] as { start: MockFn; stop: MockFn }[],
  springs: [] as Record<string, unknown>[],
  timings: [] as Record<string, unknown>[],
  values: [] as { value: unknown; stopAnimation: MockFn }[],
}));

vi.mock("@react-navigation/native", () => ({
  useIsFocused: () => mocks.focused,
}));
vi.mock("../../design/theme", async () => {
  const tokens = await import("../../design/themeTokens");
  return {
    ...tokens,
    useTheme: () => ({
      active: mocks.active,
      colors: tokens.palettes.light,
      mode: "light",
      reducedMotion: mocks.reducedMotion,
    }),
  };
});
vi.mock("react-native", () => {
  class Value {
    value: unknown;
    stopAnimation = vi.fn();
    constructor(value: unknown) {
      this.value = value;
      mocks.values.push(this);
    }
    setValue(value: unknown) {
      this.value = value;
    }
    interpolate(config: unknown) {
      return { config, source: this };
    }
  }
  const animation = () => ({ start: vi.fn(), stop: vi.fn() });
  return {
    View: "View",
    PanResponder: { create: (handlers: unknown) => ({ panHandlers: handlers }) },
    StyleSheet: {
      absoluteFillObject: { position: "absolute", inset: 0 },
      create: (styles: unknown) => styles,
    },
    Easing: {
      ease: vi.fn(),
      linear: vi.fn(),
      inOut: (value: unknown) => value,
      out: (value: unknown) => value,
    },
    Animated: {
      View: "AnimatedView",
      Value,
      loop: () => animation(),
      parallel: () => {
        const value = animation();
        mocks.parallels.push(value);
        return value;
      },
      sequence: () => {
        const value = animation();
        mocks.sequences.push(value);
        return value;
      },
      spring: (_value: unknown, config: Record<string, unknown>) => {
        mocks.springs.push(config);
        return animation();
      },
      timing: (_value: unknown, config: Record<string, unknown>) => {
        mocks.timings.push(config);
        return animation();
      },
    },
  };
});
vi.mock("react-native-svg", () => ({
  default: "Svg",
  Circle: "Circle",
  ClipPath: "ClipPath",
  Defs: "Defs",
  Ellipse: "Ellipse",
  LinearGradient: "LinearGradient",
  Path: "Path",
  RadialGradient: "RadialGradient",
  Stop: "Stop",
}));

let rendered: ReactTestRenderer | undefined;
beforeEach(() => {
  mocks.active = true;
  mocks.focused = true;
  mocks.reducedMotion = false;
  mocks.parallels.length = 0;
  mocks.sequences.length = 0;
  mocks.springs.length = 0;
  mocks.timings.length = 0;
  mocks.values.length = 0;
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterEach(async () => {
  if (rendered) await act(async () => rendered!.unmount());
  rendered = undefined;
});
async function render(element: ReactElement) {
  await act(async () => {
    rendered = create(element);
  });
  return rendered!.root;
}

describe("GenerationOrb motion", () => {
  it("runs only while generation is active and the route is focused", async () => {
    await render(createElement(GenerationOrb, { running: true }));
    expect(mocks.parallels).toHaveLength(1);
    expect(mocks.parallels[0]!.start).toHaveBeenCalledOnce();

    mocks.focused = false;
    await act(async () => rendered!.update(createElement(GenerationOrb, { running: true })));
    expect(mocks.parallels[0]!.stop).toHaveBeenCalled();
    expect(mocks.parallels).toHaveLength(1);

    mocks.focused = true;
    mocks.active = false;
    await act(async () => rendered!.update(createElement(GenerationOrb, { running: true })));
    expect(mocks.parallels).toHaveLength(1);

    mocks.active = true;
    await act(async () => rendered!.update(createElement(GenerationOrb, { running: false })));
    expect(mocks.parallels).toHaveLength(1);
  });

  it("suppresses continuous transforms when reduced motion is enabled", async () => {
    mocks.reducedMotion = true;
    const root = await render(createElement(GenerationOrb, { running: true }));
    expect(mocks.parallels).toHaveLength(0);
    const orb = root.findByProps({ testID: "generation-orb" });
    expect(orb.props.style[1].transform).toEqual([{ scale: 1 }]);
  });

  it("compresses on press, brightens while held, pulses on tap, and springs back", async () => {
    const root = await render(createElement(GenerationOrb, { running: true }));
    const orb = root.findByProps({ testID: "generation-orb" });
    expect(orb.props.onStartShouldSetPanResponder()).toBe(true);

    await act(async () => orb.props.onPanResponderGrant());
    expect(mocks.springs.at(-1)).toEqual(expect.objectContaining({ toValue: 1 }));

    await act(async () => orb.props.onPanResponderRelease());
    expect(mocks.springs).toContainEqual(expect.objectContaining({ toValue: 0 }));
    expect(mocks.timings).toContainEqual(
      expect.objectContaining({ toValue: 1, duration: 160 }),
    );
    expect(mocks.sequences.at(-1)!.start).toHaveBeenCalledOnce();
  });

  it("stops ambient and interaction values on unmount", async () => {
    await render(createElement(GenerationOrb, { running: true }));
    const ambient = mocks.parallels[0]!;
    await act(async () => rendered!.unmount());
    rendered = undefined;
    expect(ambient.stop).toHaveBeenCalled();
    expect(mocks.values.every((value) => value.stopAnimation.mock.calls.length > 0)).toBe(true);
  });
});
