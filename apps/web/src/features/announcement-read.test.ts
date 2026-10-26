import { createElement, Fragment, type ReactElement, type ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { StudentAnnouncement } from "@stay-focused/shared";
import DetailPage from "../../app/(app)/announcements/[id]/page";
import { AnnouncementsWorkspace } from "./announcements";
import { TodayScreen } from "./today/today-screen";
import { useListPreferences } from "../lib/list-preferences";

const mocks = vi.hoisted(() => ({
  owner: "", items: null as StudentAnnouncement[] | null,
  get: vi.fn<(key: string) => string | null>(), set: vi.fn<(key: string, value: string) => void>(), request: vi.fn(),
}));
vi.mock("next/link", () => ({ default: ({ children, ...props }: { children?: ReactNode; href: string }) => createElement("a", props, children) }));
vi.mock("next/navigation", () => ({ useSelectedLayoutSegment: () => null, useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../components/providers", () => ({ useAuth: () => ({
  session: mocks.owner ? { user: { id: mocks.owner } } : null, api: { request: mocks.request },
}) }));
vi.mock("../components/ui", () => ({ Heading: "Heading", Icon: "Icon", Notice: "Notice", State: () => null, ContentIcon: "ContentIcon" }));
vi.mock("../components/course", () => ({ CourseMark: () => null, CourseDot: () => null }));
vi.mock("../components/crumbs", () => ({ PageCrumb: () => null }));
vi.mock("../components/brand", () => ({ BookLoader: () => null }));
vi.mock("../components/clear-day", () => ({ ClearDay: () => null }));
vi.mock("../components/snapshot-status", () => ({ SnapshotStatus: () => null }));
vi.mock("../lib/canvas-refresh", () => ({ useCanvasRefresh: () => ({}), CanvasRefreshStatus: () => null }));
vi.mock("./day-clock/DayRingClock", () => ({ DayRingClock: () => null }));
vi.mock("./today/plan-preview", () => ({ PlanPreview: () => null }));
vi.mock("./today/today-planner", () => ({ TodayPlanner: "TodayPlanner" }));
vi.mock("./today/today-calendar", () => ({ TodayCalendar: () => null }));
const clockAdjusting = vi.hoisted(() => ({ current: false }));
vi.mock("./day-clock/use-today-clock-window", () => ({ useTodayClockWindow: () => ({
  date: "2026-10-19", path: "/api/today", window: null, save: vi.fn(),
  adjusting: clockAdjusting, setAdjusting: vi.fn(), reconcile: vi.fn(),
}) }));
vi.mock("../lib/hooks", () => ({ useResource: (path: string) => ({
  data: path === "/api/today" ? {
    announcements: { items: mocks.items ?? [] }, timeline: [], overdue: [], later: [],
    activities: { items: [] }, upcomingDeadlines: [],
  } : mocks.items ? { items: mocks.items } : null,
  loading: mocks.items === null, error: null, refresh: vi.fn(),
}) }));

const first: StudentAnnouncement = {
  id: "announcement:course/one", title: "Class update", body: "Read this update.",
  course: { id: "course", code: "BIO", name: "Biology" }, preview: null,
  postedAt: null, authorName: null, htmlUrl: null, attachments: [], links: [],
};
const second = { ...first, id: "announcement:course/two", title: "Second update" };
let tree: ReactTestRenderer | undefined;
let prefs: ReturnType<typeof useListPreferences>;
let sequence = 0;
function Probe() { prefs = useListPreferences(); return null; }
function App({ detail }: { detail?: ReactElement }) {
  return createElement(Fragment, null, createElement(Probe), createElement(TodayScreen),
    createElement(AnnouncementsWorkspace, null, detail));
}
async function render(id: string | null = first.id) {
  // Exercise the real async [id] route and its URI decoding, like a direct URL.
  const detail = id === null ? undefined : await DetailPage({ params: Promise.resolve({ id: encodeURIComponent(id) }) });
  await act(async () => {
    if (tree) tree.update(createElement(App, { detail }));
    else tree = create(createElement(App, { detail }));
  });
}
const listLinks = () => tree!.root.findAll(node => node.type === "a" && node.props.className === "announcement-open");
const firstLink = () => listLinks().find(node => node.props.href === `/announcements/${encodeURIComponent(first.id)}`)!;
const todayLinks = () => tree!.root.findAll(node => node.type === "a" && node.props.href === `/announcements/${encodeURIComponent(first.id)}` && node.props.className === "grow");
const writes = () => mocks.set.mock.calls.filter(([key]) => key.startsWith("sf.list-preferences.v1."));
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  mocks.owner = `an1b-web-${sequence++}`; mocks.items = [first, second]; mocks.get.mockReturnValue(null);
  vi.stubGlobal("localStorage", { getItem: mocks.get, setItem: mocks.set });
  vi.stubGlobal("window", { addEventListener: vi.fn(), removeEventListener: vi.fn() });
});
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; vi.unstubAllGlobals(); });

it("marks the displayed [id] page once, updates list dots/counts and mounted Today, and preserves unread until reopened", async () => {
  await render(null);
  expect(todayLinks()).toHaveLength(1); expect(writes()).toHaveLength(0);
  expect(firstLink().props["aria-label"]).toBe(`Unread: ${first.title}`);
  await render();
  expect(tree!.root.findByType("article").findByType("h2").children).toEqual([first.title]);
  expect(todayLinks()).toHaveLength(0);
  expect(firstLink().props["aria-label"]).toBe(first.title);
  expect(firstLink().find(node => node.props.className === "unread-dot")).toBeTruthy();
  expect(tree!.root.find(node => String(node.type) === "Heading" && node.props.title === "Announcements").props.subtitle).toBe("1 unread");
  expect(writes()).toHaveLength(1);
  const unreadButton = tree!.root.find(node => node.type === "button" && node.props["aria-label"] === `Mark ${first.title} as unread`);
  await act(async () => unreadButton.props.onClick());
  mocks.items = [{ ...first, body: "Refreshed body" }, second]; await render();
  expect(todayLinks()).toHaveLength(1); expect(writes()).toHaveLength(2);
  expect(firstLink().props["aria-label"]).toBe(`Unread: ${first.title}`);
  await render(null); await render();
  expect(todayLinks()).toHaveLength(0); expect(writes()).toHaveLength(3);
});

it("never marks loading or missing data and marks each resolved route id once per open", async () => {
  mocks.items = null; await render(); expect(writes()).toHaveLength(0);
  mocks.items = [second]; await render(); expect(writes()).toHaveLength(0);
  mocks.items = [first, second]; await render(); expect(writes()).toHaveLength(1);
  await render(second.id); expect(prefs.prefs.read.announcements).toEqual([second.id, first.id]);
  await act(async () => { prefs.read(first.id, false); });
  await render("missing"); await render(); expect(prefs.prefs.read.announcements).toContain(first.id);
});

it("merges the initial detail mark with stored preferences before parent hydration effects", async () => {
  mocks.get.mockImplementation((key: string) => key.startsWith("sf.list-preferences.v1.")
    ? JSON.stringify({ pinned: { course: ["saved-course"] }, read: { announcements: [second.id] } }) : null);
  // No sibling preference hook hydrates first: the detail's update must load storage itself.
  const detail = await DetailPage({ params: Promise.resolve({ id: encodeURIComponent(first.id) }) });
  await act(async () => { tree = create(createElement(AnnouncementsWorkspace, null, detail)); });
  expect(writes()).toHaveLength(1);
  expect(JSON.parse(writes()[0]![1])).toMatchObject({
    pinned: { course: ["saved-course"] }, read: { announcements: [first.id, second.id] },
  });
  await act(async () => tree!.unmount()); tree = undefined;
  await render(null); expect(todayLinks()).toHaveLength(0);
});

it("waits for an owner and isolates a later owner on the same detail", async () => {
  mocks.owner = ""; await render(); expect(writes()).toHaveLength(0);
  mocks.owner = `ready-${sequence}`; await render(); expect(writes()).toHaveLength(1);
  expect(writes()[0]![0]).toBe(`sf.list-preferences.v1.${mocks.owner}`);
  mocks.owner = `other-${sequence}`; await render(); expect(writes()).toHaveLength(2);
  expect(writes()[1]![0]).toBe(`sf.list-preferences.v1.${mocks.owner}`);
});

it("keeps a detail mark in memory if browser storage is denied", async () => {
  mocks.get.mockImplementation(() => { throw new Error("denied"); });
  mocks.set.mockImplementation(() => { throw new Error("denied"); });
  await render(); expect(todayLinks()).toHaveLength(0);
  await act(async () => { prefs.read(first.id, false); }); await render();
  expect(todayLinks()).toHaveLength(1); expect(writes()).toHaveLength(2);
});
vi.mock("./today/plan-button", () => ({ PlanButton: "PlanButton" }));
