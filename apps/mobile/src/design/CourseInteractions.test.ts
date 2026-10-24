import { createElement, type ReactElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CourseOptions } from "./CourseOptions";
import { CourseCard, CourseFeedback, CourseTile } from "./CourseViews";
import { courseIdentity } from "./courseIdentity";
import type { SwipeAction } from "./SwipeRow";
const state = vi.hoisted(() => ({ owner: "owner-a", path: "/courses", reducedMotion: false, focus: vi.fn() }));
const animation = vi.hoisted(() => ({ spring: vi.fn() }));
const tap = vi.hoisted(() => vi.fn());
vi.mock("./haptics", () => ({ haptic: { tap } }));
vi.mock("react-native", () => ({
  View: "View", Pressable: "Pressable", Platform: { OS: "web" },
  Animated: { View: "AnimatedView", Value: class { value = 1; stopAnimation() {} setValue(value: number) { this.value = value; } },
    spring: (value: { value: number }, config: { toValue: number }) => {
      animation.spring(config); return { start() { value.value = config.toValue; } };
    } },
  AccessibilityInfo: { setAccessibilityFocus: vi.fn() }, findNodeHandle: () => 1,
}));
vi.mock("../auth", () => ({ useAuth: () => ({ session: { user: { id: state.owner } } }) }));
vi.mock("expo-router", () => ({ usePathname: () => state.path }));
vi.mock("lucide-react-native", () => ({ MoreHorizontal: "More", ChevronRight: "Chevron", Pin: "Pin" }));
vi.mock("./primitives", () => ({ Sheet: "Sheet", Copy: "Copy" }));
vi.mock("./theme", () => ({ useTheme: () => ({ mode: "light", colors: { accent: "accent", surfaceSecondary: "secondary", surfacePrimary: "primary", separator: "separator" }, reducedMotion: state.reducedMotion }), motion: { spring: {} } }));
let tree: ReactTestRenderer;
const pin = vi.fn(), navigate = vi.fn();
const actions: SwipeAction[] = [{ key: "pin", label: "Pin", icon: () => null, tone: "accent", onPress: pin }];
const identity = courseIdentity({ id: "course-a", name: "Full synthetic course title", code: null });
const menu = (courseKey = "course-a") => createElement(CourseOptions, { courseKey, title: identity.title, actions, pinned: true },
  createElement(CourseFeedback, null, createElement(CourseCard, { identity, onPress: navigate, pinned: true, navigationFeedback: true })),
);
const trigger = () => tree.root.findAllByType("Pressable" as never).find(node => node.props.onLongPress)!;
beforeEach(() => {
  vi.clearAllMocks(); state.owner = "owner-a"; state.path = "/courses"; state.reducedMotion = false;
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.stubGlobal("document", new EventTarget());
  vi.stubGlobal("requestAnimationFrame", (fn: () => void) => { fn(); return 1; }); vi.stubGlobal("cancelAnimationFrame", vi.fn());
});
afterEach(async () => { await act(async () => tree?.unmount()); vi.unstubAllGlobals(); });
async function mount(element: ReactElement = menu()) {
  await act(async () => { tree = create(element, { createNodeMock: () => ({ focus: state.focus }) }); });
}
it("exposes only existing actions and never navigates or mutates on open/dismiss", async () => {
  await mount(); const event = { stopPropagation: vi.fn() };
  expect(tree.root.findAllByType("More" as never)).toHaveLength(0);
  expect(tree.root.findAllByType("Pin" as never)).toHaveLength(1);
  expect(trigger().props.delayLongPress).toBe(400);
  await act(async () => trigger().props.onPressIn());
  await act(async () => trigger().props.onLongPress());
  await act(async () => { trigger().props.onPressOut(); trigger().props.onPress(); });
  expect(pin).not.toHaveBeenCalled(); expect(navigate).not.toHaveBeenCalled();
  expect(tap).toHaveBeenCalledOnce();
  const action = tree.root.findAllByType("Pressable" as never).find(node => node.props.accessibilityLabel === "Pin")!;
  expect(action.props.accessibilityState).toEqual({ selected: true });
  expect(state.focus).toHaveBeenCalled();
  await act(async () => tree.root.findByType("Sheet" as never).props.onClose());
  expect(pin).not.toHaveBeenCalled(); expect(tree.root.findAllByType("Sheet" as never)).toHaveLength(0);
  await act(async () => trigger().props.onLongPress());
  await act(async () => tree.root.findAllByType("Pressable" as never).find(node => node.props.accessibilityLabel === "Pin")!.props.onPress(event));
  expect(pin).toHaveBeenCalledOnce(); expect(tree.root.findAllByType("Sheet" as never)).toHaveLength(0);
  expect(navigate).not.toHaveBeenCalled();
  await act(async () => { trigger().props.onPressIn(); trigger().props.onPress(); trigger().props.onPressOut(); });
  expect(navigate).toHaveBeenCalledOnce();
});
it("dismisses on Escape and drops captured options on owner or route changes", async () => {
  await mount();
  const open = () => act(async () => trigger().props.onAccessibilityAction({ nativeEvent: { actionName: "options" } }));
  await open(); const escape = new Event("keydown"); Object.defineProperty(escape, "key", { value: "Escape" });
  await act(async () => { document.dispatchEvent(escape); }); expect(tree.root.findAllByType("Sheet" as never)).toHaveLength(0);
  for (const update of [() => { state.owner = "owner-b"; }, () => { state.path = "/library"; }]) {
    await open(); update(); await act(async () => tree.update(menu()));
    expect(tree.root.findAllByType("Sheet" as never)).toHaveLength(0);
  }
  expect(pin).not.toHaveBeenCalled();
  await open(); await act(async () => tree.update(menu("course-b")));
  expect(tree.root.findAllByType("Sheet" as never)).toHaveLength(0);
  expect(navigate).not.toHaveBeenCalled();
});
it("bounds feedback outside clipping, leaves options still, and resets without navigation", async () => {
  const element = () => createElement(CourseFeedback, null, createElement(CourseCard, {
    identity: courseIdentity({ id: "course-a", name: "Synthetic course", code: null }), onPress: navigate, navigationFeedback: true,
  }));
  await mount(element());
  const card = () => tree.root.findAllByType("Pressable" as never).find(node => node.props.onPress === navigate)!;
  const wrapper = () => tree.root.findAllByType("AnimatedView" as never).find(node => node.props.onLayout)!;
  const scale = () => wrapper().props.style.transform[0].scale.value;
  await act(async () => wrapper().props.onLayout({ nativeEvent: { layout: { width: 320, height: 2000 } } }));
  const baseline = wrapper().props.style;
  await act(async () => card().props.onFocus());
  expect(scale()).toBe(1.003);
  expect(animation.spring).toHaveBeenLastCalledWith(expect.objectContaining({ toValue: 1.003, overshootClamping: true, useNativeDriver: true }));
  expect(wrapper().props.style).toMatchObject({ borderRadius: baseline.borderRadius });
  expect(wrapper().findAllByType(CourseOptions)).toHaveLength(0);
  expect(tree.root.findAllByType("Chevron" as never)).toHaveLength(0);
  await act(async () => card().props.onBlur()); expect(scale()).toBe(1);
  await act(async () => card().props.onPressIn()); await act(async () => card().props.onPressOut());
  expect(scale()).toBe(1); expect(navigate).not.toHaveBeenCalled();
  await act(async () => card().props.onHoverIn()); expect(scale()).toBe(1.003);
  await act(async () => card().props.onPressIn());
  await act(async () => card().props.onHoverOut()); expect(scale()).toBe(1);
  expect(animation.spring).toHaveBeenLastCalledWith(expect.objectContaining({ toValue: 1 }));
  await act(async () => card().props.onPressIn());
  state.reducedMotion = true; await act(async () => tree.update(element()));
  const calls = animation.spring.mock.calls.length;
  await act(async () => card().props.onFocus()); expect(scale()).toBe(1);
  expect(animation.spring).toHaveBeenCalledTimes(calls);
  expect(card().props.style({ pressed: false })).toMatchObject({ borderColor: "accent", backgroundColor: "secondary" });
  await act(async () => card().props.onPress()); expect(navigate).toHaveBeenCalledOnce();
});

it.each(["card", "tile"])("%s exposes Options alongside existing actions and cancels hold feedback in both motion modes", async kind => {
  const existing = vi.fn();
  const render = () => {
    const props = {
      identity, onPress: navigate,
      accessibilityActions: [{ name: "pin", label: "Pin" }], onAccessibilityAction: existing,
    };
    return createElement(CourseOptions, { courseKey: "course-a", title: identity.title, actions },
      createElement(CourseFeedback, null, kind === "card" ? createElement(CourseCard, props) : createElement(CourseTile, { ...props, width: 176 })),
    );
  };
  await mount(render());
  for (const reduced of [false, true]) {
    const navigations = navigate.mock.calls.length;
    state.reducedMotion = reduced; await act(async () => tree.update(render()));
    expect(trigger().props.accessibilityActions).toEqual([{ name: "pin", label: "Pin" }, { name: "options", label: "Options" }]);
    await act(async () => trigger().props.onAccessibilityAction({ nativeEvent: { actionName: "pin" } }));
    expect(tree.root.findAllByType("Sheet" as never)).toHaveLength(0);
    await act(async () => { trigger().props.onFocus(); trigger().props.onPressIn(); });
    await act(async () => trigger().props.onLongPress());
    const wrapper = tree.root.findAllByType("AnimatedView" as never).find(node => node.props.onLayout)!;
    expect(wrapper.props.style.transform[0].scale.value).toBe(1);
    await act(async () => { trigger().props.onPressOut(); trigger().props.onPress(); });
    expect(navigate).toHaveBeenCalledTimes(navigations);
    await act(async () => tree.root.findByType("Sheet" as never).props.onClose());
    await act(async () => trigger().props.onAccessibilityAction({ nativeEvent: { actionName: "options" } }));
    expect(tree.root.findAllByType("Sheet" as never)).toHaveLength(1);
    await act(async () => tree.root.findByType("Sheet" as never).props.onClose());
    await act(async () => { trigger().props.onPressIn(); trigger().props.onPress(); trigger().props.onPressOut(); });
  }
  expect(existing).toHaveBeenCalledTimes(2); expect(navigate).toHaveBeenCalledTimes(2);
});

it.each([
  ["library", ["Pin"]], ["library pinned", ["Unpin"]],
  ["current synced", ["Pin", "Hide", "Unsync", "Move to past courses"]],
  ["current unsynced", ["Pin", "Hide", "Move to past courses"]],
  ["hidden", ["Show", "Move to past courses"]], ["past", ["Move to current"]],
])("retains the complete %s sheet inventory and invokes only the selected callback", async (_surface, labels) => {
  const callbacks = labels.map(() => vi.fn());
  const inventory: SwipeAction[] = labels.map((label, index) => ({ key: String(index), label, icon: () => null, tone: "neutral", onPress: callbacks[index]! }));
  await mount(createElement(CourseOptions, { courseKey: "course-a", title: identity.title, actions: inventory },
    createElement(CourseFeedback, null, createElement(CourseTile, { identity, width: 176, onPress: navigate })),
  ));
  for (let index = 0; index < labels.length; index++) {
    await act(async () => trigger().props.onLongPress());
    const buttons = tree.root.findByType("Sheet" as never).findAllByType("Pressable" as never);
    expect(buttons.map(button => button.props.accessibilityLabel)).toEqual(labels);
    await act(async () => buttons[index]!.props.onPress({ stopPropagation() {} }));
    expect(callbacks[index]).toHaveBeenCalledOnce(); expect(navigate).not.toHaveBeenCalled();
  }
});
