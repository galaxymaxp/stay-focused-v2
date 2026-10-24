import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { TodayScreenData } from "@stay-focused/shared";
import { TodayScreen } from "../today/today-screen";
import { DayRingClock } from "./DayRingClock";
import { ClockOptions } from "./clock-options";
import { SnapshotStatus } from "../../components/snapshot-status";
import { CLOCK, ringPoint } from "./dayClock";

const mocks = vi.hoisted(() => ({ api: vi.fn(), writes: vi.fn(), entries: new Map<string, string>(), mounts: 0, reduced: true }));
vi.mock("../../components/providers", () => ({ useAuth: () => ({ api: mocks.api, session: { user: { id: "owner" } } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({ default: "Link" }));
vi.mock("../../components/ui", () => ({ Icon: "Icon", ContentIcon: "ContentIcon", Heading: "Heading", Notice: "Notice" }));
vi.mock("../../components/brand", () => ({ BookLoader: "BookLoader" }));
vi.mock("../../components/course", () => ({ CourseDot: "CourseDot" }));
vi.mock("../today/today-calendar", () => ({ TodayCalendar: "TodayCalendar" }));
vi.mock("../today/plan-preview", () => ({ PlanPreview: "PlanPreview" }));
vi.mock("./DeferredDayOrb", () => ({ DeferredDayOrb: "DeferredDayOrb" }));
vi.mock("../../lib/motion", () => ({ useSpringNumber: () => 1 }));
vi.mock("../../lib/list-preferences", () => ({ useListPreferences: () => ({ prefs: { pinned: { today: [] }, hidden: { today: [] }, read: { announcements: [] } }, pin: vi.fn(), hide: vi.fn(), read: vi.fn() }) }));
vi.mock("../../lib/screen-snapshots", () => ({ readScreenSnapshot: async () => null, writeScreenSnapshot: async () => {}, snapshotEpoch: () => 0, isScreenSnapshotPath: () => false }));

let tree: ReactTestRenderer | undefined;
const listeners = { window: new Map<string, Set<() => void>>(), document: new Map<string, Set<() => void>>() };
const listen = (surface: "window" | "document") => ({
  addEventListener: (name: string, listener: () => void) => { const set = listeners[surface].get(name) ?? new Set(); set.add(listener); listeners[surface].set(name, set); },
  removeEventListener: (name: string, listener: () => void) => { listeners[surface].get(name)?.delete(listener); },
});
const fixture = (): TodayScreenData => ({
  date: "2026-10-24", utcOffsetMinutes: -new Date().getTimezoneOffset(), asOf: new Date().toISOString(),
  progress: { completed: 0, total: 0, scheduledMinutes: 0 }, urgent: [], current: null, next: null,
  later: [], overdue: [], upcomingDeadlines: [], timeline: [],
  plannerState: { status: "not_planned", lastPlannedAt: null, needsTaskImport: false },
  capabilities: { reviewerGeneration: { status: "available" }, quizGeneration: { status: "available" }, activityMaker: { status: "available" }, planner: { status: "available" }, calendar: { status: "available" } },
  announcements: { items: [], nextOffset: null }, activities: { items: [] },
});
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 24, 12));
  mocks.api.mockReset(); mocks.writes.mockReset(); mocks.entries.clear(); mocks.mounts = 0;
  mocks.reduced = true;
  listeners.window.clear(); listeners.document.clear();
  mocks.entries.set("sf.today.free-time.2026-10-24", JSON.stringify({ start: 600, end: 720 }));
  mocks.api.mockImplementation(async (path: string) => path.startsWith("/api/today") ? fixture() : { sessions: [], unscheduledWork: [] });
  vi.stubGlobal("localStorage", { getItem: (key: string) => mocks.entries.get(key) ?? null, setItem: (key: string, value: string) => { mocks.entries.set(key, value); mocks.writes(key, value); } });
  vi.stubGlobal("window", { ...listen("window"), matchMedia: () => ({ matches: mocks.reduced, addEventListener() {}, removeEventListener() {} }) });
  vi.stubGlobal("document", { ...listen("document"), visibilityState: "visible" });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  await act(async () => { tree = create(createElement(TodayScreen), { createNodeMock: element => {
    if ((element.props as { className?: string }).className?.startsWith("day-clock")) {
      mocks.mounts += 1;
      return { clientWidth: CLOCK.size, getBoundingClientRect: () => ({ left: 0, top: 0, width: CLOCK.size, height: CLOCK.size }) };
    }
    return null;
  } }); });
  mocks.api.mockClear(); mocks.writes.mockClear();
});
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; vi.useRealTimers(); vi.unstubAllGlobals(); });
const ring = () => tree!.root.findByProps({ className: "day-clock-touch" });
const event = (minute: number, pointerType = "mouse") => {
  const point = ringPoint(minute);
  return { button: 0, pointerType, pointerId: 1, clientX: point.x, clientY: point.y, currentTarget: { setPointerCapture() {} } };
};
const tick = async (ms: number) => { await act(async () => { vi.advanceTimersByTime(ms); }); };
const writes = () => mocks.writes.mock.calls.filter(([key]) => String(key).startsWith("sf.today.free-time."));
const previews = () => mocks.api.mock.calls.filter(([path]) => path === "/api/experience/planner/preview");
const reads = () => mocks.api.mock.calls.filter(([path]) => path !== "/api/experience/planner/preview");
it.each([["start", 600, 1], ["end", 720, 1], ["end", 720, 100], ["move", 660, 100]] as const)("%s drag (%i, %i ms/move) remains local; release saves once", async (_kind, at, delay) => {
  const instance = tree!.root.findByType(DayRingClock); const mounts = mocks.mounts;
  expect(instance.props.start).toBe(600); expect(instance.props.end).toBe(720); expect(instance.props.disabled).toBe(false);
  await act(async () => ring().props.onPointerDown(event(at)));
  expect(tree!.root.findByProps({ "data-testid": "day-ring" }).props.className).toContain("adjusting");
  for (let step = 1; step <= 20; step++) {
    await act(async () => ring().props.onPointerMove(event(at + step * 2)));
    await tick(delay);
  }
  expect(mocks.api).not.toHaveBeenCalled(); expect(writes()).toHaveLength(0);
  await act(async () => ring().props.onPointerUp());
  expect(writes()).toHaveLength(1); expect(mocks.api).not.toHaveBeenCalled();
  await tick(399); expect(previews()).toHaveLength(0);
  await tick(1); expect(previews()).toHaveLength(1); expect(reads()).toHaveLength(0);
  expect(tree!.root.findByType(DayRingClock)).toBe(instance); expect(mocks.mounts).toBe(mounts);
  expect(instance.props.disabled).toBe(false);
});
it("cancels a dragged range without saving or requesting", async () => {
  await act(async () => ring().props.onPointerDown(event(720)));
  await act(async () => ring().props.onPointerMove(event(850)));
  await act(async () => ring().props.onPointerCancel()); await tick(1000);
  expect(writes()).toHaveLength(0); expect(mocks.api).not.toHaveBeenCalled();
  expect(tree!.root.findByType(DayRingClock).props.end).toBe(720);
});
it('a handle tap saves once; a short touch on the middle remains a scroll candidate', async () => {
  await act(async () => ring().props.onPointerDown(event(720)));
  await act(async () => ring().props.onPointerUp());
  expect(writes()).toHaveLength(1); await tick(400); expect(previews()).toHaveLength(1);
  mocks.api.mockClear(); mocks.writes.mockClear();
  await act(async () => ring().props.onPointerDown(event(660, 'touch')));
  await tick(100); await act(async () => ring().props.onPointerUp()); await tick(500);
  expect(writes()).toHaveLength(0); expect(mocks.api).not.toHaveBeenCalled();
});
it('touch hold moves the whole range locally and commits once', async () => {
  await act(async () => ring().props.onPointerDown(event(660, 'touch'))); await tick(240);
  await act(async () => ring().props.onPointerMove(event(720, 'touch')));
  expect(mocks.api).not.toHaveBeenCalled(); expect(writes()).toHaveLength(0);
  await act(async () => ring().props.onPointerUp()); expect(writes()).toHaveLength(1);
  await tick(400); expect(previews()).toHaveLength(1); expect(reads()).toHaveLength(0);
});
it("coalesces consecutive keyboard steps and typed overnight entry without refetches", async () => {
  for (let i = 0; i < 3; i++) {
    await act(async () => tree!.root.findByProps({ role: "slider", "aria-label": "Free time ends" }).props.onKeyDown({ key: "ArrowRight", preventDefault() {} }));
    await tick(100);
  }
  await act(async () => tree!.root.findByType(ClockOptions).props.onCommit(1320, 240));
  expect(writes()).toHaveLength(4); expect(mocks.api).not.toHaveBeenCalled();
  await tick(400); expect(previews()).toHaveLength(1); expect(reads()).toHaveLength(0);
  const body = previews()[0]![1].body;
  expect(body.availability[0].endsAt).toBe(new Date(2026, 9, 25, 4).toISOString());
});
it("suppresses focus, visibility and polling while held, then retains reconnect and explicit refresh", async () => {
  await act(async () => ring().props.onPointerDown(event(720)));
  await act(async () => {
    listeners.window.get("focus")?.forEach(listener => listener());
    listeners.document.get("visibilitychange")?.forEach(listener => listener());
  });
  await tick(61_000); expect(mocks.api).not.toHaveBeenCalled();
  await act(async () => ring().props.onPointerCancel());
  await act(async () => listeners.window.get("online")?.forEach(listener => listener()));
  expect(reads()).toHaveLength(1);
  await act(async () => listeners.window.get("focus")?.forEach(listener => listener()));
  expect(reads()).toHaveLength(2);
  const status = tree!.root.findByType(SnapshotStatus);
  // The visible saved-snapshot refresh button calls the real resource refresh.
  await act(async () => status.props.refresh());
  expect(reads()).toHaveLength(3); expect(writes()).toHaveLength(0);
});
