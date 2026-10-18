import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useGraceNavigation } from "./useGraceNavigation";

const mocks = vi.hoisted(() => ({
  push: vi.fn(), focused: true, state: "active",
  events: new Map<string, Set<() => void>>(),
  appListeners: new Set<(state: string) => void>(),
}));
const navigation = {
  isFocused: () => mocks.focused,
  getParent: () => parent,
  addListener: (name: string, listener: () => void) => listen(name, listener),
};
const parent = {
  getParent: () => undefined,
  addListener: (name: string, listener: () => void) => listen(`parent:${name}`, listener),
};
function listen(name: string, listener: () => void) {
  const listeners = mocks.events.get(name) ?? new Set();
  mocks.events.set(name, listeners);
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
vi.mock("expo-router", () => ({ router: { push: mocks.push } }));
vi.mock("expo-router/react-navigation", () => ({
  useIsFocused: () => mocks.focused, useNavigation: () => navigation,
}));
vi.mock("react-native", () => ({ AppState: {
  get currentState() { return mocks.state; },
  addEventListener: (_name: string, listener: (state: string) => void) => {
    mocks.appListeners.add(listener);
    return { remove: () => mocks.appListeners.delete(listener) };
  },
} }));
let tree: ReactTestRenderer | undefined;
let grace: ReturnType<typeof useGraceNavigation>;
function Harness({ blocked = false }: { blocked?: boolean }) {
  grace = useGraceNavigation(blocked);
  return null;
}
const target = { pathname: "/generation", params: { intent: "saved" } } as const;
async function mount() {
  await act(async () => { tree = create(createElement(Harness)); });
}
async function tick(ms: number) {
  await act(async () => { vi.advanceTimersByTime(ms); });
}
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  mocks.focused = true; mocks.state = "active";
  mocks.events.clear(); mocks.appListeners.clear();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterEach(async () => {
  await act(async () => tree?.unmount()); tree = undefined;
  expect(vi.getTimerCount()).toBe(0);
  expect(mocks.appListeners.size).toBe(0);
  expect([...mocks.events.values()].every(listeners => !listeners.size)).toBe(true);
  vi.useRealTimers();
});

it("pushes once at 2000ms and never before", async () => {
  await mount(); grace.schedule(target);
  await tick(1999); expect(mocks.push).not.toHaveBeenCalled();
  await tick(1); expect(mocks.push).toHaveBeenCalledExactlyOnceWith(target);
  await tick(10000); expect(mocks.push).toHaveBeenCalledTimes(1);
});
it.each(["blur", "state", "parent:state", "parent:blur"])("cancels on %s without waiting for a render", async event => {
  await mount(); grace.schedule(target); await tick(1000);
  mocks.events.get(event)!.forEach(listener => listener());
  await tick(2000); expect(mocks.push).not.toHaveBeenCalled();
});
it("cancels on focus loss and never resumes on return", async () => {
  await mount(); grace.schedule(target); mocks.focused = false;
  await act(async () => tree!.update(createElement(Harness)));
  mocks.focused = true;
  await act(async () => tree!.update(createElement(Harness)));
  await tick(3000); expect(mocks.push).not.toHaveBeenCalled();
});
it.each(["background", "inactive"])("cancels on %s and never resumes on active", async state => {
  await mount(); grace.schedule(target); await tick(1000);
  mocks.state = state; mocks.appListeners.forEach(listener => listener(state));
  mocks.state = "active"; mocks.appListeners.forEach(listener => listener("active"));
  await tick(3000); expect(mocks.push).not.toHaveBeenCalled();
});
it("unmount cancels and a late persistence callback cannot schedule", async () => {
  await mount(); grace.schedule(target);
  await act(async () => tree!.unmount()); tree = undefined;
  grace.schedule(target); await tick(3000);
  expect(mocks.push).not.toHaveBeenCalled();
});
it("rescheduling replaces the timer and target", async () => {
  await mount(); grace.schedule(target); await tick(1000);
  const next = { pathname: "/generation", params: { intent: "next" } } as const;
  grace.schedule(next); expect(vi.getTimerCount()).toBe(1);
  await tick(1999); expect(mocks.push).not.toHaveBeenCalled();
  await tick(1); expect(mocks.push).toHaveBeenCalledExactlyOnceWith(next);
});
it("opening a popout cancels permanently", async () => {
  await mount(); grace.schedule(target);
  await act(async () => tree!.update(createElement(Harness, { blocked: true })));
  await act(async () => tree!.update(createElement(Harness, { blocked: false })));
  await tick(3000); expect(mocks.push).not.toHaveBeenCalled();
});
it("does not schedule while unfocused, blocked or inactive", async () => {
  await mount(); mocks.focused = false;
  await act(async () => tree!.update(createElement(Harness)));
  grace.schedule(target); mocks.focused = true;
  await act(async () => tree!.update(createElement(Harness, { blocked: true })));
  grace.schedule(target);
  await act(async () => tree!.update(createElement(Harness)));
  mocks.state = "background"; grace.schedule(target);
  expect(vi.getTimerCount()).toBe(0);
});
