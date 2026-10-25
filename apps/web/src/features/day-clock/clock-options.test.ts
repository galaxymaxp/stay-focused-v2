import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ClockOptions } from "./clock-options";
vi.mock("../../components/ui", () => ({ Icon: "Icon" }));
let tree: ReactTestRenderer | undefined;
let listeners: Map<string, (event: unknown) => void>;
const commit = vi.fn(), toggle = vi.fn(), focus = vi.fn(), firstFocus = vi.fn();
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.clearAllMocks(); listeners = new Map();
  vi.stubGlobal("document", { addEventListener: (key: string, listener: (event: unknown) => void) => listeners.set(key, listener), removeEventListener: (key: string) => listeners.delete(key) });
});
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.unstubAllGlobals(); });
const trigger = () => tree!.root.findByProps({ "aria-label": "Clock options", "aria-haspopup": "dialog" });
const save = () => tree!.root.findAllByType("button").find(node => node.props.children === "Save free time")!;
async function mount() {
  await act(async () => { tree = create(createElement(ClockOptions, { start: 1320, end: 240, locked: true, onToggleLock: toggle, onCommit: commit, disabled: false }), {
    createNodeMock: element => {
      const props = element.props as Record<string, unknown>;
      if (element.type === "button" && props["aria-haspopup"]) return { focus };
      if (element.type === "div" && props.role === "dialog") return { querySelector: () => ({ focus: firstFocus }) };
      if (props.className === "clock-options") return { contains: () => false };
      return null;
    },
  }); });
  await act(async () => trigger().props.onClick());
}
it("uses a checked lock switch and commits wrapped typed times while locked", async () => {
  await mount();
  expect(firstFocus).toHaveBeenCalledOnce();
  const lock = tree!.root.findByProps({ role: "switch" }); expect(lock.props["aria-label"]).toBe("Lock clock"); expect(lock.props["aria-checked"]).toBe(true);
  await act(async () => lock.props.onClick()); expect(toggle).toHaveBeenCalledOnce();
  expect(save().props.disabled).toBe(false);
  const starts = tree!.root.findByProps({ "aria-label": "Free time starts" }), ends = tree!.root.findByProps({ "aria-label": "Free time ends" });
  expect(starts.props.type).toBe("time"); expect(ends.props.type).toBe("time");
  await act(async () => { starts.props.onChange({ target: { value: "23:30" } }); ends.props.onChange({ target: { value: "00:30" } }); });
  await act(async () => save().props.onClick()); expect(commit).toHaveBeenCalledWith(1410, 30); expect(focus).toHaveBeenCalledOnce();
});
it.each(["", "04:00"])("rejects invalid start %j inline without a commit", async value => {
  await mount();
  await act(async () => tree!.root.findByProps({ "aria-label": "Free time starts" }).props.onChange({ target: { value } }));
  await act(async () => save().props.onClick());
  expect(commit).not.toHaveBeenCalled(); expect(tree!.root.findByProps({ role: "alert" }).props.children).toContain("different");
});
it("closes on Escape, restores focus and cleans up outside listeners", async () => {
  await mount(); const preventDefault = vi.fn();
  await act(async () => listeners.get("keydown")!({ key: "Escape", preventDefault }));
  expect(preventDefault).toHaveBeenCalledOnce(); expect(focus).toHaveBeenCalledOnce(); expect(listeners.size).toBe(0);
  await act(async () => trigger().props.onClick());
  await act(async () => listeners.get("mousedown")!({ target: {} }));
  expect(trigger().props["aria-expanded"]).toBe(false);
});
it("keeps clock options free of planning controls", async () => {
  await mount();
  expect(tree!.root.findAllByProps({ type: "radio" })).toHaveLength(0);
  expect(tree!.root.findAllByProps({ className: "clock-plan-mode" })).toHaveLength(0);
});
it("omits the group when no plan mode is wired", async () => {
  await mount();
  expect(tree!.root.findAllByProps({ className: "clock-plan-mode" })).toHaveLength(0);
});
