import { createElement, type ComponentProps, type FunctionComponent } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./theme", async () => {
  const tokens = await import("./themeTokens");
  return { ...tokens, useTheme: () => ({ colors: tokens.palettes.light, reducedMotion: true }) };
});
vi.mock("./primitives", () => ({ Copy: "Copy" }));
vi.mock("react-native", () => {
  class Value {
    value = 0;
    setValue(value: number) { this.value = value; }
    stopAnimation() {}
    interpolate(config: unknown) { return config; }
  }
  const run = (value: Value, config: { toValue: number }) => ({
    start(done?: (result: { finished: boolean }) => void) {
      value.setValue(config.toValue);
      done?.({ finished: true });
    },
  });
  return {
    View: "View",
    Pressable: "Pressable",
    PanResponder: { create: (handlers: unknown) => ({ panHandlers: handlers }) },
    LayoutAnimation: { configureNext: vi.fn(), create: vi.fn(), Types: {}, Properties: {} },
    Easing: { out: () => 0, in: () => 0, quad: 0 },
    Animated: {
      View: "AnimatedView",
      Value,
      timing: run,
      spring: run,
      parallel: (animations: { start: (done?: () => void) => void }[]) => ({
        start(done?: () => void) { for (const animation of animations) animation.start(); done?.(); },
      }),
    },
  };
});

const { SwipeRow } = await import("./SwipeRow");
// Children are passed as a createElement argument, not a prop.
const Row = SwipeRow as FunctionComponent<Omit<ComponentProps<typeof SwipeRow>, "children">>;

let rendered: ReactTestRenderer | undefined;
beforeEach(() => Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }));
afterEach(async () => {
  if (rendered) await act(async () => rendered!.unmount());
  rendered = undefined;
});

function actions() {
  return {
    hide: vi.fn(),
    unsync: vi.fn(),
    pin: vi.fn(),
  };
}

async function renderRow(spy: ReturnType<typeof actions>, fullSwipe = false) {
  await act(async () => {
    rendered = create(createElement(Row, {
      leading: [{ key: "pin", label: "Pin", icon: "Pin" as never, tone: "accent", onPress: spy.pin }],
      trailing: [
        { key: "hide", label: "Hide", icon: "EyeOff" as never, tone: "neutral", onPress: spy.hide },
        { key: "unsync", label: "Unsync", icon: "CloudOff" as never, tone: "warning", onPress: spy.unsync },
      ],
      fullSwipe,
    }, createElement("Card")));
  });
  // A laid-out row, so a full swipe has a width to measure against.
  await act(async () => {
    rendered!.root.findAll((node) => typeof node.props.onLayout === "function")[0]!.props.onLayout({ nativeEvent: { layout: { width: 360, height: 72 } } });
  });
  const root = rendered!.root;
  const surface = () => root.findAll((node) => String(node.type) === "AnimatedView" && typeof node.props.onPanResponderMove === "function")[0]!;
  const drag = async (dx: number) => {
    await act(async () => {
      surface().props.onPanResponderGrant();
      surface().props.onPanResponderMove({}, { dx, dy: 0, vx: 0 });
      surface().props.onPanResponderRelease({}, { dx, dy: 0, vx: 0 });
    });
  };
  const layer = (key: string) => root.findAll((node) => node.props.testID === `swipe-action-${key}`)[0]!;
  const openSide = () => root.findAll((node) => String(node.type) === "AnimatedView" && node.props.pointerEvents === "auto").map((node) =>
    node.findAll((child) => typeof child.props.testID === "string").map((child) => child.props.testID));
  return { root, surface, drag, layer, openSide };
}

describe("SwipeRow", () => {
  it("claims only clearly horizontal drags, so vertical scrolling and taps pass through", async () => {
    const row = await renderRow(actions());
    const claim = row.surface().props.onMoveShouldSetPanResponder;
    expect(claim({}, { dx: 4, dy: 0 })).toBe(false);
    expect(claim({}, { dx: 20, dy: 30 })).toBe(false);
    expect(claim({}, { dx: 24, dy: 3 })).toBe(true);
    expect(claim({}, { dx: -24, dy: 3 })).toBe(true);
  });

  it("swipe right reveals Pin; swipe left reveals Hide and Unsync", async () => {
    const row = await renderRow(actions());
    await row.drag(60);
    expect(row.openSide()).toEqual([["swipe-action-pin"]]);
    await row.drag(-400);
    expect(row.openSide()).toEqual([["swipe-action-hide", "swipe-action-unsync"]]);
  });

  it("runs the first action directly on a full swipe, only when enabled", async () => {
    const spy = actions();
    const row = await renderRow(spy, true);
    await row.drag(260);
    expect(spy.pin).toHaveBeenCalledOnce();
    await row.drag(-260);
    expect(spy.hide).toHaveBeenCalledOnce();
    expect(spy.unsync).not.toHaveBeenCalled();
    expect(row.openSide()).toEqual([]);
  });

  it("never runs an action from a drag when full swipe is off", async () => {
    const spy = actions();
    const row = await renderRow(spy);
    await row.drag(-300);
    expect(spy.hide).not.toHaveBeenCalled();
    expect(row.openSide()).toEqual([["swipe-action-hide", "swipe-action-unsync"]]);
  });

  it("runs an action with one tap and closes, and a short drag springs back closed", async () => {
    const spy = actions();
    const row = await renderRow(spy);
    await row.drag(60);
    await act(async () => row.layer("pin").props.onPress());
    expect(spy.pin).toHaveBeenCalledOnce();
    expect(row.openSide()).toEqual([]);
    await row.drag(20);
    expect(row.openSide()).toEqual([]);
  });

  it("covers the item while open so a tap closes the actions instead of opening it", async () => {
    const row = await renderRow(actions());
    await row.drag(90);
    const shield = row.root.findAll((node) => node.props.accessibilityLabel === "Close actions")[0]!;
    await act(async () => shield.props.onPress());
    expect(row.openSide()).toEqual([]);
  });
});
