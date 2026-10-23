import { createElement, type ReactElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CourseOptions } from "./CourseOptions";
import { CourseCard, CourseFeedback } from "./CourseViews";
import { courseIdentity } from "./courseIdentity";
import type { SwipeAction } from "./SwipeRow";
const state = vi.hoisted(() => ({ owner: "owner-a", path: "/courses", reducedMotion: false, focus: vi.fn() }));
const animation = vi.hoisted(() => ({ spring: vi.fn() }));
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
const menu = () => createElement(CourseOptions, { courseKey: "course-a", title: "Full synthetic course title", actions, pinned: true });
const trigger = () => tree.root.findAllByType("Pressable" as never).find(node => node.props.accessibilityLabel?.startsWith("Course options for"))!;
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
  await act(async () => trigger().props.onPress(event));
  expect(event.stopPropagation).toHaveBeenCalledOnce(); expect(pin).not.toHaveBeenCalled();
  expect(trigger().props.accessibilityState.expanded).toBe(true);
  expect(trigger().props.style).toMatchObject({ minWidth: 48, minHeight: 48 });
  const action = tree.root.findAllByType("Pressable" as never).find(node => node.props.accessibilityLabel === "Pin")!;
  expect(action.props.accessibilityState).toEqual({ selected: true });
  expect(state.focus).toHaveBeenCalled();
  await act(async () => tree.root.findByType("Sheet" as never).props.onClose());
  expect(pin).not.toHaveBeenCalled(); expect(trigger().props.accessibilityState.expanded).toBe(false);
  await act(async () => trigger().props.onPress(event));
  await act(async () => tree.root.findAllByType("Pressable" as never).find(node => node.props.accessibilityLabel === "Pin")!.props.onPress(event));
  expect(pin).toHaveBeenCalledOnce(); expect(trigger().props.accessibilityState.expanded).toBe(false);
});
it("dismisses on Escape and drops captured options on owner or route changes", async () => {
  await mount();
  const open = () => act(async () => trigger().props.onPress({ stopPropagation() {} }));
  await open(); const escape = new Event("keydown"); Object.defineProperty(escape, "key", { value: "Escape" });
  await act(async () => { document.dispatchEvent(escape); }); expect(trigger().props.accessibilityState.expanded).toBe(false);
  for (const update of [() => { state.owner = "owner-b"; }, () => { state.path = "/library"; }]) {
    await open(); update(); await act(async () => tree.update(menu()));
    expect(tree.root.findAllByType("Sheet" as never)).toHaveLength(0);
  }
  expect(pin).not.toHaveBeenCalled();
});
it("bounds feedback outside clipping, leaves options still, and resets without navigation", async () => {
  const element = () => createElement(CourseFeedback, { options: menu() }, createElement(CourseCard, {
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
