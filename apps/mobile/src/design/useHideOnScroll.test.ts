import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LayoutChangeEvent, NativeScrollEvent } from "react-native";
import { boundedScroll, clampHeader, snapHeader, useHideOnScroll } from "./useHideOnScroll";

const state = vi.hoisted(() => ({ reducedMotion: false }));
vi.mock("./theme", () => ({ motion: { small: 180 }, useTheme: () => ({ reducedMotion: state.reducedMotion }) }));

describe("layout-stable scroll arithmetic", () => {
  it("follows each slow delta in both directions and clamps at either endpoint", () => {
    let offset = 0;
    for (let y = 1; y <= 80; y++) {
      offset = clampHeader(offset, 1, 50);
      expect(offset).toBe(Math.min(y, 50));
    }
    for (let y = 1; y <= 80; y++) {
      offset = clampHeader(offset, -1, 50);
      expect(offset).toBe(Math.max(50 - y, 0));
    }
  });
  it("clamps fast flings without overshoot", () => {
    expect(clampHeader(10, 800, 50)).toBe(50);
    expect(clampHeader(40, -800, 50)).toBe(0);
  });
  it("bounds elastic bounce and short content", () => {
    expect(boundedScroll(-30, 2000, 700)).toBe(0);
    expect(boundedScroll(1400, 2000, 700)).toBe(1300);
    expect(boundedScroll(100, 600, 700)).toBe(0);
    for (const value of [NaN, Infinity, -Infinity]) {
      expect(boundedScroll(value, 2000, 700)).toBeNaN();
      expect(boundedScroll(100, value, 700)).toBeNaN();
      expect(boundedScroll(100, 2000, value)).toBeNaN();
    }
  });
  it.each([[24, 50, 100, false, 0], [25, 50, 100, false, 50], [50, 50, 0, false, 0], [50, 50, 100, true, 0]])(
    "snaps %s/%s at y=%s forced=%s to %s", (offset, height, y, forced, expected) => {
      expect(snapHeader(offset as number, height as number, y as number, forced as boolean)).toBe(expected);
    });
});

let rendered: ReactTestRenderer | undefined;
let header: ReturnType<typeof useHideOnScroll>;
let renders = 0;
function Harness(props: NonNullable<Parameters<typeof useHideOnScroll>[0]>) { renders++; header = useHideOnScroll(props); return null; }
const layout = (height: number) => ({ nativeEvent: { layout: { height } } }) as LayoutChangeEvent;
const nativeEvent = (y: number, content = 2000, viewport = 700) => ({ contentOffset: { y }, contentSize: { height: content }, layoutMeasurement: { height: viewport } }) as NativeScrollEvent;
// The Node stub executes the same worklet callbacks synchronously.
const event = async (y: number, eventName = "onScroll", content = 2000, viewport = 700) => {
  await act(async () => (header.onScroll as unknown as (event: { nativeEvent: NativeScrollEvent; eventName: string }) => void)({ nativeEvent: nativeEvent(y, content, viewport), eventName }));
};
const translation = () => (header.style as unknown as { transform: { translateY: number }[] }).transform[0]!.translateY;
async function mount(props = {}) {
  await act(async () => { rendered = create(createElement(Harness, props)); });
  await act(async () => header.onLayout(layout(50)));
}
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); state.reducedMotion = false; renders = 0; });
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); rendered = undefined; });

describe("UI scroll header wiring (Node worklet boundary)", () => {
  it("preserves position and its delta anchor on invalid raw evidence", async () => {
    await mount(); await event(20);
    await event(Infinity); await event(100, "onScroll", Infinity); await event(100, "onScroll", 2000, NaN);
    await act(async () => header.onContentSizeChange(360, -1));
    await act(async () => header.onViewportLayout(layout(Infinity)));
    expect(translation()).toBe(-20);
    await event(21); expect(translation()).toBe(-21);
  });
  it("moves by transform with a constant inset and no per-scroll React render", async () => {
    await mount(); const count = renders;
    for (let y = 1; y <= 70; y++) { await event(y); expect(translation()).toBe(-Math.min(y, 50)); expect(header.height).toBe(50); }
    for (let y = 69; y >= 0; y--) await event(y);
    expect(translation()).toBe(-0); expect(renders).toBe(count);
    expect(header.style).not.toHaveProperty("height");
  });
  it.each(["onEndDrag", "onMomentumEnd"])("snaps at %s and can reverse a fast fling", async name => {
    await mount(); await event(30); await event(30, name); expect(translation()).toBe(-50);
    await event(10); await event(10, name); expect(translation()).toBe(-50);
    await event(0); expect(translation()).toBe(-0);
  });
  it("keeps bounce clamped and exposes short/refreshed/resized content", async () => {
    await mount(); await event(1400); expect(translation()).toBe(-50);
    await event(1300); expect(translation()).toBe(-50);
    await event(1290); expect(translation()).toBe(-40);
    await act(async () => header.onContentSizeChange(360, 600)); expect(translation()).toBe(-0);
    await event(100); await act(async () => header.onViewportLayout(layout(2200))); expect(translation()).toBe(-0);
    await event(100, "onScroll", 600); expect(translation()).toBe(-0);
  });
  it("forwards native metrics to the existing reader observer", async () => {
    const onScroll = vi.fn(); await mount({ onScroll }); await event(100);
    expect(onScroll).toHaveBeenCalledExactlyOnceWith(nativeEvent(100));
  });
  it("pins focus/query, releases without a jump, and disables cleanly", async () => {
    await mount(); await event(100);
    await act(async () => rendered!.update(createElement(Harness, { forceVisible: true })));
    await event(900); expect(translation()).toBe(-0);
    await act(async () => rendered!.update(createElement(Harness, { forceVisible: false })));
    await event(901); expect(translation()).toBe(-1);
    await act(async () => rendered!.update(createElement(Harness, { enabled: false })));
    await event(1000); expect(translation()).toBe(-0);
  });
  it("uses instant endpoints for Reduce Motion and keeps the inset", async () => {
    state.reducedMotion = true; await mount();
    for (let y = 1; y < 25; y++) { await event(y); expect(translation()).toBe(-0); }
    await event(25); expect(translation()).toBe(-50); expect(header.height).toBe(50);
    await event(0); expect(translation()).toBe(-0);
  });
  it("hides accessibility/hit descendants only when the whole overlay is offscreen", async () => {
    await mount(); await event(49); expect(header.animatedProps.accessibilityElementsHidden).toBe(false);
    await event(50); expect(header.animatedProps).toMatchObject({ accessibilityElementsHidden: true, pointerEvents: "none", importantForAccessibility: "no-hide-descendants" });
    await event(49); expect(header.animatedProps.pointerEvents).toBe("auto");
  });
  it("remeasures on font/width changes and ignores invalid measurements", async () => {
    await mount(); await event(50); await act(async () => header.onLayout(layout(90)));
    expect(header.height).toBe(90); expect(translation()).toBe(-90);
    expect(header.animatedProps.accessibilityElementsHidden).toBe(true);
    await event(100); expect(translation()).toBe(-90);
    await act(async () => header.onLayout(layout(NaN))); expect(header.height).toBe(90);
  });
});
