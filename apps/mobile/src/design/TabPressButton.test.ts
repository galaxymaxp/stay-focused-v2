import { createElement, Fragment, type ComponentProps } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { TabPressButton } from "./TabPressButton";
import { coreTabOptions } from "./coreNavigation";
import { motion, palettes } from "./themeTokens";
import { hitTarget } from "./tokens";

const native = vi.hoisted(() => ({
  reducedMotion: false, active: true,
  platform: "android",
  stop: vi.fn(), set: vi.fn(), timing: vi.fn(), start: vi.fn(),
}));
vi.mock("./theme", async () => ({
  ...(await import("./themeTokens")),
  useTheme: () => ({ reducedMotion: native.reducedMotion, active: native.active }),
}));
vi.mock("lucide-react-native", () => ({ BookOpen: "BookOpen", CheckSquare: "CheckSquare", Clock: "Clock", Sparkles: "Sparkles" }));
vi.mock("react-native", () => ({
  Pressable: "Pressable",
  Platform: { get OS() { return native.platform; } },
  StyleSheet: { flatten: (style: unknown) => style },
  Easing: { quad: (t: number) => t * t, out: (ease: (t: number) => number) => (t: number) => 1 - ease(1 - t) },
  Animated: {
    View: "AnimatedView",
    Value: class {
      value: number;
      constructor(value: number) { this.value = value; }
      stopAnimation() { native.stop(); }
      setValue(value: number) { this.value = value; native.set(value); }
    },
    timing: (value: { value: number }, config: { toValue: number }) => {
      native.timing(value, config);
      return { start: () => { value.value = config.toValue; native.start(); } };
    },
  },
}));

let rendered: ReactTestRenderer | undefined;
const event = { nativeEvent: {} };
const layout = { flex: 1, flexDirection: "column" as const, alignItems: "center" as const, justifyContent: "flex-start" as const, padding: 5, backgroundColor: "transparent" };
const initial: ComponentProps<typeof TabPressButton> = {
  children: [createElement("Icon", { key: "icon" }), createElement("Label", { key: "label" }, "Today")],
  style: layout,
  role: "tab", "aria-selected": true, "aria-label": "Today", testID: "today-tab",
  android_ripple: { borderless: true }, pressOpacity: 1, pressColor: "red", hoverEffect: { color: "red" },
};
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  native.reducedMotion = false; native.active = true;
  native.platform = "android";
  vi.clearAllMocks();
});
afterEach(async () => {
  if (rendered) await act(async () => rendered!.unmount());
  rendered = undefined;
});
async function mount(props: Partial<ComponentProps<typeof TabPressButton>> = {}) {
  await act(async () => { rendered = create(createElement(TabPressButton, { ...initial, ...props })); });
  return rendered!.root.findByType("Pressable" as never);
}
function scale() { return rendered!.root.findByType("AnimatedView" as never).props.style.transform[0].scale.value; }

it("strips platform ripple props and preserves the fixed target, child layout and accessibility", async () => {
  const ref = { current: null };
  const target = await mount({ ref, accessibilityState: { selected: true }, accessibilityLabel: "Today" });
  for (const key of ["android_ripple", "pressOpacity", "pressColor", "hoverEffect"]) expect(target.props[key]).toBeUndefined();
  target.props.ref("native-view");
  expect(ref.current).toBe("native-view");
  expect(target.props.role).toBe("tab");
  expect(target.props["aria-selected"]).toBe(true);
  expect(target.props["aria-label"]).toBe("Today");
  expect(target.props.accessibilityState).toEqual({ selected: true });
  expect(target.props.accessibilityLabel).toBe("Today");
  expect(target.props.testID).toBe("today-tab");
  expect(target.props.style).toEqual([layout, { minHeight: hitTarget.min, minWidth: hitTarget.min }]);
  expect(hitTarget.min).toBeGreaterThanOrEqual(44);
  const content = rendered!.root.findByType("AnimatedView" as never);
  expect(content.props.style).toMatchObject({ flex: 1, alignSelf: "stretch", flexDirection: "column", alignItems: "center", justifyContent: "flex-start" });
  expect(content.findAllByType("Icon" as never)).toHaveLength(1);
  expect(content.findAllByType("Label" as never)).toHaveLength(1);
});

it("scales both children to 1.08 with native timing and returns with a bounded 180ms ease", async () => {
  const onPressIn = vi.fn(), onPressOut = vi.fn();
  const target = await mount({ onPressIn, onPressOut });
  await act(async () => target.props.onPressIn(event));
  expect(scale()).toBe(1.08);
  expect(native.timing.mock.lastCall?.[1]).toMatchObject({ toValue: 1.08, duration: motion.press, useNativeDriver: true });
  await act(async () => target.props.onPressOut(event));
  expect(scale()).toBe(1);
  const config = native.timing.mock.lastCall?.[1];
  expect(config).toMatchObject({ toValue: 1, duration: 180, useNativeDriver: true });
  let previous = 0;
  for (let t = 0; t <= 100; t++) {
    const progress = config.easing(t / 100);
    expect(progress).toBeGreaterThanOrEqual(previous);
    expect(progress).toBeLessThanOrEqual(1);
    expect(progress).toBeGreaterThanOrEqual(0);
    previous = progress;
  }
  expect(previous).toBe(1);
  expect(onPressIn).toHaveBeenCalledExactlyOnceWith(event);
  expect(onPressOut).toHaveBeenCalledExactlyOnceWith(event);
});

it.each(["onPressOut", "onTouchCancel", "onBlur"])("returns on %s without navigation", async handler => {
  const onPress = vi.fn(), forward = vi.fn();
  const target = await mount({ onPress, [handler]: forward });
  await act(async () => target.props.onPressIn(event));
  expect(scale()).toBe(1.08);
  await act(async () => target.props[handler](event));
  expect(scale()).toBe(1);
  expect(forward).toHaveBeenCalledExactlyOnceWith(event);
  expect(onPress).not.toHaveBeenCalled();
});

it("forwards navigation and long press once without adding another haptic", async () => {
  const onPress = vi.fn(), onLongPress = vi.fn();
  const target = await mount({ onPress, onLongPress });
  expect(target.props.onLongPress).toBe(onLongPress);
  await act(async () => target.props.onPressIn(event));
  await act(async () => target.props.onLongPress(event));
  await act(async () => target.props.onPressOut(event));
  expect(scale()).toBe(1);
  expect(onLongPress).toHaveBeenCalledExactlyOnceWith(event);
  expect(onPress).not.toHaveBeenCalled();
  await act(async () => target.props.onPress(event));
  expect(onPress).toHaveBeenCalledExactlyOnceWith(event);
});

it("preserves Expo Web href, modified clicks and default prevention", async () => {
  native.platform = "web";
  const onPress = vi.fn();
  const target = await mount({ onPress, href: "/today" });
  expect(target.props.href).toBe("/today");
  for (const extra of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { currentTarget: { target: "_blank" } }]) {
    const click = { preventDefault: vi.fn(), currentTarget: {}, button: 0, ...extra };
    await act(async () => target.props.onPress(click));
    expect(click.preventDefault).not.toHaveBeenCalled();
  }
  expect(onPress).not.toHaveBeenCalled();
  const click = { preventDefault: vi.fn(), currentTarget: {}, button: 0 };
  await act(async () => target.props.onPress(click));
  expect(click.preventDefault).toHaveBeenCalledOnce();
  expect(onPress).toHaveBeenCalledExactlyOnceWith(click);
});

it.each(["reducedMotion", "inactive", "disabled"])("never scales when %s", async state => {
  native.reducedMotion = state === "reducedMotion";
  native.active = state !== "inactive";
  const target = await mount({ disabled: state === "disabled" });
  await act(async () => { target.props.onPressIn(event); target.props.onPressOut(event); target.props.onTouchCancel(event); });
  expect(scale()).toBe(1);
  expect(native.timing).not.toHaveBeenCalled();
  expect(target.props.disabled).toBe(state === "disabled");
});

it.each(["reducedMotion", "inactive", "disabled"])("resets a held press when %s changes live", async state => {
  const target = await mount();
  await act(async () => target.props.onPressIn(event));
  expect(scale()).toBe(1.08);
  native.reducedMotion = state === "reducedMotion";
  native.active = state !== "inactive";
  await act(async () => rendered!.update(createElement(TabPressButton, { ...initial, disabled: state === "disabled" })));
  expect(scale()).toBe(1);
  const count = native.timing.mock.calls.length;
  await act(async () => rendered!.root.findByType("Pressable" as never).props.onPressIn(event));
  expect(scale()).toBe(1);
  expect(native.timing).toHaveBeenCalledTimes(count);
});

it("interrupts repeated presses and cancels native animation on unmount", async () => {
  const target = await mount();
  for (let n = 0; n < 5; n++) {
    await act(async () => { target.props.onPressIn(event); target.props.onPressOut(event); });
    expect(scale()).toBe(1);
  }
  expect(native.timing).toHaveBeenCalledTimes(10);
  const stops = native.stop.mock.calls.length;
  await act(async () => rendered!.unmount());
  rendered = undefined;
  expect(native.stop).toHaveBeenCalledTimes(stops + 1);
});

it("wires the button into shared navigator options without changing colors, density or safe area", async () => {
  const options = coreTabOptions(palettes.light, 24);
  expect(options.tabBarActiveTintColor).toBe(palettes.light.accent);
  expect(options.tabBarInactiveTintColor).toBe(palettes.light.textSecondary);
  expect(options.tabBarStyle).toMatchObject({ height: 76, paddingBottom: 26 });
  expect(options.tabBarItemStyle).toEqual({ minHeight: hitTarget.min });
  await act(async () => { rendered = create(createElement(Fragment, null, options.tabBarButton!(initial))); });
  expect(rendered!.root.findAllByType(TabPressButton)).toHaveLength(1);
});
