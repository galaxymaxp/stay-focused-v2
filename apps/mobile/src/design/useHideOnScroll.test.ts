import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from "react-native";

const state = vi.hoisted(() => ({ reducedMotion: true, timing: vi.fn(), stop: vi.fn() }));
vi.mock("./theme", () => ({ motion: { small: 180 }, useTheme: () => ({ reducedMotion: state.reducedMotion }) }));
vi.mock("react-native", () => ({
  Easing: { inOut: (value: unknown) => value, quad: "quad" },
  Animated: {
    Value: class {
      constructor(public value: number) {}
      setValue(value: number) { this.value = value; }
      stopAnimation() { state.stop(); }
      interpolate(config: { outputRange: number[] }) { return { __getValue: () => this.value * config.outputRange[1]! }; }
    },
    timing: (value: { setValue: (next: number) => void }, config: { toValue: number }) => {
      state.timing(config);
      return { start: () => value.setValue(config.toValue) };
    },
  },
}));

import { nextHeaderVisibility, useHideOnScroll, type HeaderVisibilityState } from "./useHideOnScroll";

const metrics = { y: 0, headerHeight: 50, contentHeight: 2000, viewportHeight: 700 };
const shown: HeaderVisibilityState = { visible: true, anchorY: 0 };
const hidden: HeaderVisibilityState = { visible: false, anchorY: 100 };
const decide = (prev: HeaderVisibilityState, y: number) => nextHeaderVisibility(prev, { ...metrics, y });

describe("nextHeaderVisibility", () => {
  it("hides only past the measured header height plus 24pt", () => {
    expect(decide(shown, 74).visible).toBe(true);
    expect(decide(shown, 75).visible).toBe(false);
  });
  it("ignores jitter in both directions", () => {
    expect(decide(hidden, 92).visible).toBe(false);
    expect(decide({ visible: true, anchorY: 92 }, 100).visible).toBe(true);
  });
  it("shows on upward travel greater than 8pt", () => expect(decide(hidden, 91).visible).toBe(true));
  it("accumulates slow upward movement rather than requiring a single large event", () => {
    let next = hidden;
    for (const y of [98, 96, 94, 92, 90]) next = decide(next, y);
    expect(next.visible).toBe(true);
  });
  it("tracks the highest offset before an upward reversal", () => {
    expect(decide(decide(hidden, 150), 141).visible).toBe(true);
  });
  it.each([0, -20])("shows at the top or pull-to-refresh overscroll (%s)", y => {
    expect(decide(hidden, y)).toEqual(shown);
  });
  it("keeps short and exactly fitting content shown", () => {
    for (const contentHeight of [0, 500, 700]) {
      expect(nextHeaderVisibility(hidden, { ...metrics, y: 100, contentHeight }).visible).toBe(true);
    }
  });
  it("pins focused search and active queries even during downward match jumps", () => {
    expect(nextHeaderVisibility(hidden, { ...metrics, y: 1200, forceVisible: true }).visible).toBe(true);
  });
  it("waits for valid header and viewport measurements", () => {
    expect(nextHeaderVisibility(shown, { ...metrics, y: 100, headerHeight: 0 })).toEqual(shown);
    expect(nextHeaderVisibility(shown, { ...metrics, y: 100, viewportHeight: 0 })).toEqual(shown);
    expect(decide(hidden, NaN)).toEqual(hidden);
  });
});

let rendered: ReactTestRenderer | undefined;
let header: ReturnType<typeof useHideOnScroll>;
function Harness(props: { enabled?: boolean; forceVisible?: boolean }) {
  header = useHideOnScroll(props);
  return null;
}
const layout = (height: number) => ({ nativeEvent: { layout: { height } } }) as LayoutChangeEvent;
const scroll = (y: number) => ({ nativeEvent: { contentOffset: { y }, contentSize: { height: 2000 }, layoutMeasurement: { height: 700 } } }) as NativeSyntheticEvent<NativeScrollEvent>;
async function mount(props = {}) {
  await act(async () => { rendered = create(createElement(Harness, props)); });
  await act(async () => header.onLayout(layout(50)));
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.reducedMotion = true;
  vi.clearAllMocks();
});
afterEach(async () => {
  if (rendered) await act(async () => rendered!.unmount());
  rendered = undefined;
});

describe("useHideOnScroll", () => {
  it("instantly removes height and opacity with Reduce Motion, restoring at the top", async () => {
    await mount();
    await act(async () => header.onScroll(scroll(100)));
    expect(header.visible).toBe(false);
    expect((header.style.height as unknown as { __getValue: () => number }).__getValue()).toBe(0);
    expect(header.style.opacity).toMatchObject({ value: 0 });
    expect(state.timing).not.toHaveBeenCalled();
    await act(async () => header.onScroll(scroll(-10)));
    expect(header.visible).toBe(true);
    expect((header.style.height as unknown as { __getValue: () => number }).__getValue()).toBe(50);
  });
  it("uses the existing 180ms eased motion token with layout animation", async () => {
    state.reducedMotion = false;
    await mount();
    await act(async () => header.onScroll(scroll(100)));
    expect(state.timing).toHaveBeenLastCalledWith({ toValue: 0, duration: 180, easing: "quad", useNativeDriver: false });
    await act(async () => rendered!.unmount());
    rendered = undefined;
    expect(state.stop).toHaveBeenCalled();
  });
  it("restores and holds the region when forced visible, then permits scrolling again", async () => {
    await mount();
    await act(async () => header.onScroll(scroll(100)));
    await act(async () => rendered!.update(createElement(Harness, { forceVisible: true })));
    await act(async () => header.onScroll(scroll(900)));
    expect(header.visible).toBe(true);
    await act(async () => rendered!.update(createElement(Harness, { forceVisible: false })));
    expect(header.visible).toBe(true);
    await act(async () => header.onScroll(scroll(920)));
    expect(header.visible).toBe(false);
  });
  it("remeasures natural content even while hidden, including a width/font change", async () => {
    await mount();
    await act(async () => header.onScroll(scroll(100)));
    expect(header.contentStyle).toMatchObject({ position: "absolute", left: 0, right: 0 });
    await act(async () => header.onLayout(layout(90)));
    await act(async () => header.onScroll(scroll(0)));
    expect((header.style.height as unknown as { __getValue: () => number }).__getValue()).toBe(90);
  });
  it("shows after a refresh shortens content without another scroll event", async () => {
    await mount();
    await act(async () => header.onScroll(scroll(100)));
    await act(async () => header.onContentSizeChange(360, 600));
    expect(header.visible).toBe(true);
  });
  it("shows when a viewport resize makes the content fit", async () => {
    await mount();
    await act(async () => header.onScroll(scroll(100)));
    await act(async () => header.onViewportLayout(layout(2200)));
    expect(header.visible).toBe(true);
  });
  it("never hides when disabled", async () => {
    await mount({ enabled: false });
    await act(async () => header.onScroll(scroll(100)));
    expect(header.visible).toBe(true);
  });
});
