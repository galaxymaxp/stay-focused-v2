import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ClockOptions, clockTimeFields, clockTimeMinutes } from "./ClockOptions";

vi.mock("react-native", () => ({ View: "View", Modal: "Modal", Pressable: "Pressable", ScrollView: "ScrollView", Switch: "Switch", TextInput: "TextInput", useWindowDimensions: () => ({ width: 390, height: 844 }) }));
vi.mock("lucide-react-native", () => ({ Ellipsis: "Ellipsis" }));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }) }));
vi.mock("../../design/primitives", () => ({ Action: "Action", Copy: "Copy" }));
vi.mock("../../design/theme", async () => {
  const { palettes } = await import("../../design/themeTokens");
  return { useTheme: () => ({ colors: palettes.light }) };
});

let tree: ReactTestRenderer | undefined;
const commit = vi.fn(), toggle = vi.fn();
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.clearAllMocks(); });
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; });
async function mount(locked = true) {
  await act(async () => { tree = create(createElement(ClockOptions, { start: 1320, end: 240, locked, onToggleLock: toggle, onCommit: commit, disabled: false }), {
    createNodeMock: element => element.type === "View" ? { measureInWindow: (callback: (x: number, y: number, w: number, h: number) => void) => callback(300, 100, 44, 44) } : null,
  }); });
  const trigger = tree!.root.find(node => String(node.type) === "Pressable" && node.props.accessibilityLabel === "Clock options");
  expect(trigger.props.style({ pressed: false })).toMatchObject({ width: 44, height: 44 });
  await act(async () => trigger.props.onPress());
}
function field(label: string) { return tree!.root.find(node => String(node.type) === "TextInput" && node.props.accessibilityLabel === label); }
const save = () => tree!.root.find(node => String(node.type) === "Action");
it.each([true, false])("converts typed hours and minutes for hour12=%s", hour12 => {
  for (const minute of [0, 30, 720, 1320, 1439]) expect(clockTimeMinutes(clockTimeFields(minute, hour12), hour12)).toBe(minute);
  expect(clockTimeMinutes({ hour: "", minute: "00", pm: false }, hour12)).toBeNaN();
  expect(clockTimeMinutes({ hour: "25", minute: "00", pm: false }, hour12)).toBeNaN();
  expect(clockTimeMinutes({ hour: "01", minute: "60", pm: false }, hour12)).toBeNaN();
});
it("keeps the clock modal free of planning controls", async () => {
  await mount();
  expect(tree!.root.findAll(node => node.props.accessibilityRole === "radio" || node.props.accessibilityRole === "radiogroup")).toHaveLength(0);
});
it("keeps typed edits available while locked and uses the supplied commit", async () => {
  await mount();
  const lock = tree!.root.find(node => String(node.type) === "Switch");
  expect(lock.props.accessibilityLabel).toBe("Lock clock"); expect(lock.props.value).toBe(true);
  await act(async () => lock.props.onValueChange(false)); expect(toggle).toHaveBeenCalledOnce();
  expect(save().props.disabled).toBe(false);
  await act(async () => save().props.onPress());
  expect(commit).toHaveBeenCalledWith(1320, 240);
  expect(tree!.root.findAll(node => String(node.type) === "Modal")).toHaveLength(0);
});
it("does not save empty or equal times and exposes an inline error", async () => {
  await mount();
  await act(async () => field("Free time starts").props.onChangeText(""));
  await act(async () => save().props.onPress()); expect(commit).not.toHaveBeenCalled();
  expect(tree!.root.findAll(node => node.props.accessibilityRole === "alert")).toHaveLength(1);
  await act(async () => {
    field("Free time starts").props.onChangeText(field("Free time ends").props.value);
    field("Free time starts minute").props.onChangeText(field("Free time ends minute").props.value);
  });
  // Match AM/PM too when the device uses a 12-hour clock.
  const periods = tree!.root.findAll(node => String(node.type) === "Pressable" && String(node.props.accessibilityLabel).endsWith("AM or PM"));
  if (periods.length && periods[0]!.find(node => String(node.type) === "Copy").props.children !== periods[1]!.find(node => String(node.type) === "Copy").props.children) await act(async () => periods[0]!.props.onPress());
  await act(async () => save().props.onPress()); expect(commit).not.toHaveBeenCalled();
});
