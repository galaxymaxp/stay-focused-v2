import { createElement, type ComponentProps } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CourseNavigation } from "./course-navigation";

vi.mock("next/link", () => ({ default: (props: ComponentProps<"a">) => createElement("a", props) }));
let tree: ReactTestRenderer;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("window", new EventTarget());
});
afterEach(async () => { await act(async () => tree?.unmount()); vi.unstubAllGlobals(); });
it("shows touch feedback without activating and clears on every cancellation and external release path", async () => {
  const navigate = vi.fn(), pointer = vi.fn();
  await act(async () => { tree = create(createElement(CourseNavigation, { href: "/generate/new", onClick: navigate, onPointerDown: pointer }, "Your own material")); });
  const link = () => tree.root.findByType("a");
  const down = () => act(async () => link().props.onPointerDown({ isPrimary: true, button: 0, defaultPrevented: false }));
  for (const reset of ["onPointerUp", "onPointerCancel", "onPointerLeave", "onBlur", "onDragStart"]) {
    await down(); expect(link().props["data-pressed"]).toBe(true);
    await act(async () => link().props[reset]({}));
    expect(link().props["data-pressed"]).toBeUndefined();
  }
  for (const type of ["pointerup", "pointercancel"]) {
    await down(); await act(async () => { window.dispatchEvent(new Event(type)); });
    expect(link().props["data-pressed"]).toBeUndefined();
  }
  expect(pointer).toHaveBeenCalledTimes(7); expect(navigate).not.toHaveBeenCalled();
  expect(link().props.href).toBe("/generate/new");
  await act(async () => link().props.onClick()); expect(navigate).toHaveBeenCalledOnce();
});
it("ignores secondary and prevented presses and cleans up a held press on unmount", async () => {
  const remove = vi.spyOn(window, "removeEventListener");
  await act(async () => { tree = create(createElement(CourseNavigation, { href: "/library" })); });
  const link = tree.root.findByType("a");
  for (const event of [{ isPrimary: false, button: 0 }, { isPrimary: true, button: 2 }, { isPrimary: true, button: 0, defaultPrevented: true }]) {
    await act(async () => link.props.onPointerDown(event)); expect(link.props["data-pressed"]).toBeUndefined();
  }
  await act(async () => link.props.onPointerDown({ isPrimary: true, button: 0 }));
  await act(async () => tree.unmount());
  expect(remove).toHaveBeenCalledWith("pointerup", expect.any(Function), true);
  expect(remove).toHaveBeenCalledWith("pointercancel", expect.any(Function), true);
});
