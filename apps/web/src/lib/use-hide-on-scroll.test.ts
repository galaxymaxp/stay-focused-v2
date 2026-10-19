import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextScrollVisibility, useHideOnScroll } from "./use-hide-on-scroll";

class MediaQuery extends EventTarget {
  constructor(public matches: boolean) { super(); }
  change(matches: boolean) { this.matches = matches; this.dispatchEvent(new Event("change")); }
}
let phone: MediaQuery;
let motion: MediaQuery;
let browser: EventTarget & { scrollY: number; matchMedia: (query: string) => MediaQuery };
let tree: ReactTestRenderer | undefined;
let header: ReturnType<typeof useHideOnScroll>;
function Probe(props: { forceVisible?: boolean }) { header = useHideOnScroll(props); return null; }
const scroll = async (y: number) => {
  await act(async () => { browser.scrollY = y; browser.dispatchEvent(new Event("scroll")); });
};
async function mount(props = {}) {
  await act(async () => { tree = create(createElement(Probe, props)); });
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  phone = new MediaQuery(true);
  motion = new MediaQuery(false);
  browser = Object.assign(new EventTarget(), { scrollY: 0,
    matchMedia: vi.fn((query: string) => query === "(max-width: 760px)" ? phone : motion) });
  vi.stubGlobal("window", browser);
});
afterEach(async () => {
  await act(async () => tree?.unmount()); tree = undefined;
  vi.unstubAllGlobals();
});

describe("web course search scroll visibility", () => {
  it("uses a 12px accumulated direction threshold and restores at the top", async () => {
    await mount();
    for (const y of [4, 8, 11]) { await scroll(y); expect(header.hidden).toBe(false); }
    await scroll(12); expect(header.hidden).toBe(true);
    await scroll(40);
    for (const y of [36, 32, 29]) { await scroll(y); expect(header.hidden).toBe(true); }
    await scroll(28); expect(header.hidden).toBe(false);
    await scroll(40); expect(header.hidden).toBe(true);
    await scroll(-1); expect(header.hidden).toBe(false);
  });
  it("ignores invalid metrics", () => {
    const state = { hidden: false, anchor: 0 };
    expect(nextScrollVisibility(state, NaN)).toBe(state);
    expect(nextScrollVisibility(state, Infinity)).toBe(state);
  });
  it("animates translation and opacity for 200ms with ease", async () => {
    await mount(); await scroll(100);
    expect(header.style).toEqual({ transform: "translateY(calc(-100% - 16px))", opacity: 0,
      transition: "transform 200ms ease, opacity 200ms ease", pointerEvents: "none" });
    await scroll(88);
    expect(header.style).toMatchObject({ transform: "translateY(0)", opacity: 1 });
  });
  it("switches instantly with Reduce Motion including a live preference change", async () => {
    motion.matches = true;
    await mount(); await scroll(100);
    expect(header.hidden).toBe(true); expect(header.style?.transition).toBe("none");
    await act(async () => motion.change(false));
    expect(header.hidden).toBe(false);
    expect(header.style?.transition).toBe("transform 200ms ease, opacity 200ms ease");
    await act(async () => motion.change(true)); await scroll(120);
    expect(header.hidden).toBe(true); expect(header.style?.transition).toBe("none");
  });
  it("is disabled above 760px and resets on desktop/phone resizing", async () => {
    phone.matches = false;
    await mount(); await scroll(100);
    expect(header.hidden).toBe(false); expect(header.style).toBeUndefined();
    await act(async () => phone.change(true));
    await scroll(111); expect(header.hidden).toBe(false);
    await scroll(112); expect(header.hidden).toBe(true);
    await act(async () => phone.change(false));
    expect(header.hidden).toBe(false); expect(header.style).toBeUndefined();
    expect(browser.matchMedia).toHaveBeenCalledWith("(max-width: 760px)");
  });
  it("immediately restores forced search and holds it through scrolling", async () => {
    await mount(); await scroll(100); expect(header.hidden).toBe(true);
    await act(async () => tree!.update(createElement(Probe, { forceVisible: true })));
    await scroll(500); expect(header.hidden).toBe(false);
    await act(async () => tree!.update(createElement(Probe, { forceVisible: false })));
    await scroll(511); expect(header.hidden).toBe(false);
    await scroll(512); expect(header.hidden).toBe(true);
  });
  it("cleans up passive scroll and media listeners on unmount", async () => {
    const add = vi.spyOn(browser, "addEventListener");
    const remove = vi.spyOn(browser, "removeEventListener");
    const phoneRemove = vi.spyOn(phone, "removeEventListener");
    const motionRemove = vi.spyOn(motion, "removeEventListener");
    await mount();
    expect(add).toHaveBeenCalledWith("scroll", expect.any(Function), { passive: true });
    await act(async () => tree!.unmount()); tree = undefined;
    expect(remove).toHaveBeenCalledWith("scroll", add.mock.calls[0]![1]);
    expect(phoneRemove).toHaveBeenCalledWith("change", expect.any(Function));
    expect(motionRemove).toHaveBeenCalledWith("change", expect.any(Function));
  });
  it("keeps SSR and environments without matchMedia visible", async () => {
    vi.stubGlobal("window", undefined); await mount();
    expect(header.hidden).toBe(false); expect(header.style).toBeUndefined();
  });
});
