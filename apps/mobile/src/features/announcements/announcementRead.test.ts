import { todayPlanningMemory } from "../redesign/planningSession";
import { createElement, Fragment } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { StudentAnnouncement } from "@stay-focused/shared";
import { AnnouncementDetailScreen, AnnouncementsScreen } from "./AnnouncementsScreen";
import { TodayScreen } from "../redesign/TodayScreen";
import { useListPreferences } from "../redesign/useListPreferences";
beforeEach(() => todayPlanningMemory.reset());
vi.mock("../redesign/PlanningSheet", () => ({ PlanningControl: "PlanningControl" }));








const mocks = vi.hoisted(() => ({
  owner: "", id: "", items: null as StudentAnnouncement[] | null,
  get: vi.fn<(key: string) => Promise<string | null>>(),
  set: vi.fn<(key: string, value: string) => Promise<void>>(), push: vi.fn(), request: vi.fn(),
}));
vi.mock("../../auth", () => ({ useAuth: () => ({ session: mocks.owner ? { user: { id: mocks.owner } } : null }) }));
vi.mock("../../auth/sessionStore", () => ({ sessionStore: { getItem: mocks.get, setItem: mocks.set } }));
vi.mock("expo-router", () => ({ useLocalSearchParams: () => ({ id: mocks.id }), router: { push: mocks.push } }));
vi.mock("expo-router/react-navigation", () => ({ useIsFocused: () => true }));
vi.mock("lucide-react-native", () => ({ BookOpen: "Icon", ExternalLink: "Icon", Mail: "Icon", MailOpen: "Icon", Pin: "Icon", PinOff: "Icon", X: "Icon", EyeOff: "Icon" }));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
vi.mock("react-native", () => ({
  View: "View", Pressable: "Pressable", ScrollView: "ScrollView", StatusBar: "StatusBar",
  BackHandler: { addEventListener: () => ({ remove() {} }) }, Linking: { openURL: vi.fn() },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
  Easing: { in: vi.fn(), out: vi.fn() },
  Animated: {
    View: "AnimatedView", Value: class { interpolate() { return 0; } },
    add: vi.fn(), timing: () => ({ start() {} }), spring: () => ({ start() {} }),
  },
}));
vi.mock("../../design/theme", async () => {
  const { palettes } = await import("../../design/themeTokens");
  return { useTheme: () => ({ colors: palettes.light, mode: "light", reducedMotion: true }), motion: { sheet: {} } };
});
vi.mock("../../design/primitives", () => ({
  Page: "Page", Copy: "Copy", Action: "Action", Notice: "Notice", Surface: "Surface",
  RowLink: "RowLink", Sheet: "Sheet", DoneButton: "DoneButton", ContentIcon: "ContentIcon",
  SkeletonCards: "SkeletonCards", SkeletonBlock: "SkeletonBlock",
}));
vi.mock("../../design/SwipeRow", () => ({ SwipeRow: "SwipeRow", animateNextLayout: vi.fn(), swipeAccessibility: () => ({}) }));
vi.mock("../../design/sheetDrag", () => ({ useSheetDrag: () => ({ touchHandlers: {}, drag: 0 }) }));
vi.mock("../../design/haptics", () => ({ haptic: { tap: vi.fn() } }));
vi.mock("../../design/ClearDay", () => ({ ClearDay: () => null }));
vi.mock("../redesign/DayOrb", () => ({ dayOrbTouch: { active: false } }));
vi.mock("../redesign/DayRingClock", () => ({ DayRingClock: () => null }));
vi.mock("../redesign/PlanPreview", () => ({ PlanPreview: () => null, planTaskIds: () => [], planToneFor: () => "accent" }));
vi.mock("../redesign/TodayCalendar", () => ({ TodayCalendar: () => null }));
vi.mock("../redesign/SnapshotStatus", () => ({ SnapshotStatus: () => null }));
vi.mock("../redesign/AppUpdateNotice", () => ({ AppUpdateBanner: () => null }));
vi.mock("../../services/experienceApi", () => ({ experienceRequest: mocks.request }));
const clockAdjusting = vi.hoisted(() => ({ current: false }));
vi.mock("../redesign/useTodayClockWindow", () => ({
  useTodayClockWindow: () => ({ date: "2026-10-19", path: "/api/today", window: null, save: vi.fn(), adjusting: clockAdjusting, setAdjusting: vi.fn(), reconcile: vi.fn() }),
}));
vi.mock("../redesign/useExperience", () => ({
  useExperienceClient: () => ({}),
  useExperience: (path: string) => ({
    data: path === "/api/today" ? {
      announcements: { items: mocks.items ?? [] }, timeline: [], overdue: [], later: [],
      activities: { items: [] }, upcomingDeadlines: [],
    } : mocks.items ? { items: mocks.items } : null,
    loading: mocks.items === null, error: null, refresh: vi.fn(),
  }),
}));

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
function App({ detail = true }: { detail?: boolean }) {
  return createElement(Fragment, null, createElement(Probe), createElement(TodayScreen),
    createElement(AnnouncementsScreen), detail ? createElement(AnnouncementDetailScreen) : null);
}
async function render(detail = true) {
  await act(async () => {
    if (tree) tree.update(createElement(App, { detail }));
    else tree = create(createElement(App, { detail }));
  });
}
async function flush() { await act(async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); }); }
const rows = (title: string) => tree!.root.findAll(node => String(node.type) === "RowLink" && node.props.label === title);
const writes = () => mocks.set.mock.calls.filter(([key]) => key.startsWith("sf.list-preferences.v1."));
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  mocks.owner = `an1b-mobile-${sequence++}`; mocks.id = first.id; mocks.items = [first, second];
  mocks.get.mockResolvedValue(null); mocks.set.mockResolvedValue(undefined);
});
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; });

it("marks displayed detail once, updates the list dot/count and mounted Today, and preserves unread until reopened", async () => {
  await render(false); await flush();
  expect(rows(`Unread: ${first.title}`)).toHaveLength(2); // List and Today.
  expect(writes()).toHaveLength(0); // Rendering lists alone never reads them.
  await render(); await flush();
  expect(rows(`Unread: ${first.title}`)).toHaveLength(0);
  expect(rows(first.title)).toHaveLength(1); // Read list row, absent from Today.
  expect(rows(first.title)[0]!.props.icon.props.testID).toBe("announcement-read");
  expect(tree!.root.find(node => String(node.type) === "Page" && node.props.title === "Announcements").props.subtitle).toBe("1 unread");
  expect(writes()).toHaveLength(1);
  await act(async () => prefs.markRead(first.id, false)); await flush();
  mocks.items = [{ ...first, body: "Refreshed body" }, second];
  await render(); await flush();
  expect(rows(`Unread: ${first.title}`)).toHaveLength(2);
  expect(writes()).toHaveLength(2);
  await render(false); await render(); await flush();
  expect(rows(`Unread: ${first.title}`)).toHaveLength(0);
  expect(writes()).toHaveLength(3);
});

it("does not mark loading/missing details, and marks each resolved route id on open", async () => {
  mocks.items = null; await render(); await flush(); expect(writes()).toHaveLength(0);
  mocks.items = [second]; await render(); expect(writes()).toHaveLength(0);
  mocks.items = [first, second]; await render(); await flush(); expect(writes()).toHaveLength(1);
  mocks.id = second.id; await render(); await flush(); expect(prefs.prefs.read.announcements).toEqual([second.id, first.id]);
  await act(async () => prefs.markRead(first.id, false)); await flush();
  mocks.id = "missing"; await render(); mocks.id = first.id; await render(); await flush();
  expect(prefs.prefs.read.announcements).toContain(first.id);
});

it("queues early detail read/unread behind hydration without losing existing preferences", async () => {
  let resolve!: (raw: string) => void;
  mocks.get.mockImplementation((key: string) => key.startsWith("sf.list-preferences.v1.")
    ? new Promise<string>(done => { resolve = done; }) : Promise.resolve(null));
  await render(); expect(writes()).toHaveLength(0);
  await act(async () => prefs.markRead(first.id, false));
  await act(async () => resolve(JSON.stringify({ pinned: { course: ["saved-course"] }, read: { announcements: [second.id] } })));
  await flush();
  expect(prefs.prefs.pinned.course).toEqual(["saved-course"]);
  expect(prefs.prefs.read.announcements).toEqual([second.id]);
  expect(writes()).toHaveLength(2);
  expect(JSON.parse(writes()[1]![1]).read.announcements).toEqual([second.id]);
  expect(rows(`Unread: ${first.title}`)).toHaveLength(2);
});

it("persists a detail mark made before hydration and notifies Today when storage resolves", async () => {
  let resolve!: (raw: string) => void;
  mocks.get.mockImplementation((key: string) => key.startsWith("sf.list-preferences.v1.")
    ? new Promise<string>(done => { resolve = done; }) : Promise.resolve(null));
  await render(); expect(writes()).toHaveLength(0);
  await act(async () => resolve(JSON.stringify({ pinned: { course: ["saved-course"] }, read: { announcements: [second.id] } })));
  await flush();
  expect(prefs.prefs.read.announcements).toEqual([first.id, second.id]);
  expect(prefs.prefs.pinned.course).toEqual(["saved-course"]);
  expect(writes()).toHaveLength(1);
  expect(JSON.parse(writes()[0]![1]).read.announcements).toEqual([first.id, second.id]);
  expect(rows(`Unread: ${first.title}`)).toHaveLength(0);
});

it("waits for owner readiness and isolates a later owner on the same open detail", async () => {
  mocks.owner = ""; await render(); await flush(); expect(writes()).toHaveLength(0);
  mocks.owner = `ready-${sequence}`; await render(); await flush();
  expect(writes()).toHaveLength(1);
  expect(writes()[0]![0]).toBe(`sf.list-preferences.v1.${mocks.owner}`);
  mocks.owner = `other-${sequence}`; await render(); await flush();
  expect(writes()).toHaveLength(2);
  expect(writes()[1]![0]).toBe(`sf.list-preferences.v1.${mocks.owner}`);
});

it("keeps the existing mobile row tap mark before navigation", async () => {
  await render(false); await flush();
  await act(async () => rows(`Unread: ${first.title}`)[0]!.props.onPress()); await flush();
  expect(prefs.prefs.read.announcements).toContain(first.id);
  expect(mocks.push).toHaveBeenCalledWith({ pathname: "/announcement", params: { id: first.id } });
});
