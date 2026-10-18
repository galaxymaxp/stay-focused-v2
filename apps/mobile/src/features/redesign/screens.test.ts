import { createElement, type ReactElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ActivityDetail,
  ActivityDraft,
  LibraryArtifactDetail,
  CourseLearningWorkspace,
  CourseSummary,
  GenerateCourseSummary,
  LibraryArtifactSummary,
  LibraryOverview,
  TodayOverview,
  TodayScreenData,
} from "@stay-focused/shared";
import { GenerateCourseScreen, GenerateMaterialScreen, GenerateScreen } from "./GenerateScreen";
import { ArtifactScreen, LibraryCourseScreen, LibraryScreen } from "./LibraryScreen";
import { ActivityScreen, TasksCourseScreen, TasksScreen } from "./TasksScreen";
import { TodayScreen } from "./TodayScreen";
import { DayRingClock } from "./DayRingClock";
import { localDate } from "./presentation";
import { TASK_COURSE_GRADES_PATHNAME, courseRouteParams } from "../../navigation/appRoutes";
import { AnnouncementDetailScreen, AnnouncementsScreen } from "../announcements/AnnouncementsScreen";

const mocks = vi.hoisted(() => ({
  artifact: null as LibraryArtifactDetail | null,
  offlineMissing: false,
  storeConfirmed: vi.fn(),
  data: {} as Record<string, unknown>,
  errors: {} as Record<string, { message: string; code: string }>,
  paths: [] as string[],
  library: {
    items: [] as (LibraryArtifactSummary & { offlineReady?: boolean })[],
    offlineStats: null as { total: number; current: number; approximateBytes: number } | null,
    errorCode: null as string | null,
    categories: null as LibraryOverview["categories"] | null,
    localReady: true,
    refreshing: false,
    error: null as string | null,
  },
  push: vi.fn(),
  navigate: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
  openURL: vi.fn(),
  sync: vi.fn(),
  params: {} as Record<string, string>,
  request: vi.fn(),
  refresh: vi.fn(),
  createIntent: vi.fn(),
  acceptIntent: vi.fn(async () => ({ generationId: "job" })),
  alert: vi.fn(),
  removeLocal: vi.fn(),
  deleteReviewer: vi.fn(async () => ({ ok: true })),
  vibration: vi.fn(),
  haptic: { tap: vi.fn(), select: vi.fn(), press: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  prefs: { pinned: { course: [] as string[], artifact: [] as string[], today: [] as string[], announcement: [] as string[] }, hidden: { generate: [] as string[], library: [] as string[], libraryItems: [] as string[], today: [] as string[], announcements: [] as string[], queue: [] as string[] }, read: { announcements: [] as string[] }, libraryOrder: {} as Record<string, string[]>, librarySort: {} as Record<string, import("./listPreferences").LibrarySort> },
  reorderLibrary: vi.fn(),
  sortLibrary: vi.fn(),
  markRead: vi.fn(),
  pin: vi.fn(),
  hide: vi.fn(),
  unsync: vi.fn(async () => true),
  selectedCourseIds: new Set<string>(),
  reducedMotion: true,
  focused: true,
  queueOpen: false,
  navigationListeners: new Map<string, Set<() => void>>(),
  appState: "active",
  appListeners: new Set<(state: string) => void>(),
}));
const graceNavigation = {
  dispatch: vi.fn(),
  isFocused: () => mocks.focused,
  getParent: () => undefined,
  addListener: (name: string, listener: () => void) => {
    const listeners = mocks.navigationListeners.get(name) ?? new Set();
    listeners.add(listener);
    mocks.navigationListeners.set(name, listeners);
    return () => listeners.delete(listener);
  },
};
vi.mock("expo-router", () => ({
  router: { push: mocks.push, navigate: mocks.navigate, back: mocks.back, replace: mocks.replace, canGoBack: () => true },
  useLocalSearchParams: () => mocks.params,
}));
vi.mock('./GenerationCore', () => ({ GenerationCore: 'GenerationCore' }));
vi.mock('../queue/useQueueItems', () => ({ useQueueItems: () => ({ refresh: mocks.refresh, show: vi.fn(), open: mocks.queueOpen }) }));
vi.mock("expo-router/react-navigation", () => ({
  useIsFocused: () => mocks.focused,
  useNavigation: () => graceNavigation,
  usePreventRemove: vi.fn(),
}));
vi.mock('../courses/CourseBatchControls', () => ({ CourseBatchControls: 'CourseBatchControls' }));
vi.mock("../../auth", () => ({
  useAuth: () => ({ session: { user: { id: "owner" }, accessToken: "token" } }),
}));
vi.mock("../../design/theme", async () => {
  const tokens = await import("../../design/themeTokens");
  return {
    ...tokens,
    useTheme: () => ({
      colors: tokens.palettes.light,
      reducedMotion: mocks.reducedMotion,
      active: true,
    }),
  };
});
vi.mock("../../design/primitives", () => ({
  Sheet: "Sheet",
  RowLink: "RowLink",
  Page: (props: { children?: import("react").ReactNode; headerBelow?: import("react").ReactNode; headerBelowFixed?: import("react").ReactNode; headerAction?: import("react").ReactNode }) =>
    createElement("Page", props, props.headerAction, props.headerBelowFixed, props.headerBelow, props.children),
  Action: "Action",
  Surface: "Surface",
  Notice: "Notice",
  Copy: "Copy",
  ContentIcon: "ContentIcon",
  IconAction: "IconAction",
  FilterChip: "FilterChip",
  SegmentedControl: "SegmentedControl",
  DoneButton: "DoneButton",
  SearchField: "SearchField",
  SkeletonBlock: "SkeletonBlock",
  SkeletonCards: "SkeletonCards",
}));
vi.mock("../../design/CourseViews", () => ({
  CourseCard: "CourseCard",
  CourseMark: "CourseMark",
  CourseTile: "CourseTile",
}));
vi.mock("../sync/CanvasSyncProvider", () => ({
  useCanvasSync: () => ({ snapshot: { phase: "idle", total: 0, finished: 0, lastSyncedAt: null }, dataVersion: 0, sync: mocks.sync, syncCourse: mocks.sync, unsyncCourse: mocks.unsync, selectedCourseIds: mocks.selectedCourseIds, courseStates: {} }),
}));
vi.mock('./useLibraryCourseSequence', () => ({ useLibraryCourseSequence: () => ({ data: null, loading: false, error: false }) }));
vi.mock("./useListPreferences", () => ({
  useListPreferences: () => ({ prefs: mocks.prefs, pin: mocks.pin, hide: mocks.hide, markRead: mocks.markRead, reorderLibrary: mocks.reorderLibrary, sortLibrary: mocks.sortLibrary }),
}));
vi.mock("../../design/SwipeRow", () => ({
  SwipeRow: "SwipeRow",
  animateNextLayout: vi.fn(),
  swipeAccessibility: (actions: { key: string; label: string }[]) => ({ accessibilityActions: actions.map((action) => ({ name: action.key, label: action.label })) }),
}));
vi.mock("../sync/SyncStatus", () => ({ SyncStatus: "SyncStatus" }));
vi.mock("../reviewer/ReviewerReader", () => ({ ReviewerReaderScreen: "ReviewerReaderScreen" }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView", useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }) }));
vi.mock("../../auth/sessionStore", () => ({ sessionStore: { getItem: async () => null, setItem: async () => {} } }));
vi.mock("./DayOrb", () => ({ DayOrb: "DayOrb", DAY_ORB_FILL: 0.642, dayOrbTouch: { active: false } }));
vi.mock("react-native", () => ({
  AppState: {
    get currentState() { return mocks.appState; },
    addEventListener: (_name: string, listener: (state: string) => void) => {
      mocks.appListeners.add(listener);
      return { remove: () => mocks.appListeners.delete(listener) };
    },
  },
  Alert: { alert: mocks.alert },
  View: "View",
  StyleSheet: { absoluteFill: { position: "absolute" } },
  ScrollView: "ScrollView",
  Pressable: "Pressable",
  TextInput: "TextInput",
  KeyboardAvoidingView: "KeyboardAvoidingView",
  Platform: { OS: "android" },
  StatusBar: "StatusBar",
  Linking: { openURL: mocks.openURL },
  BackHandler: { addEventListener: () => ({ remove() {} }) },
  Easing: { out: () => 0, in: () => 0, inOut: () => 0, cubic: 0, quad: 0, sin: 0 },
  Vibration: { vibrate: mocks.vibration },
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
  PanResponder: { create: (handlers: unknown) => ({ panHandlers: handlers }) },
  Animated: {
    View: "AnimatedView",
    ScrollView: "AnimatedScrollView",
    Value: class {
      setValue() {}
      stopAnimation() {}
      interpolate(config: unknown) { return config; }
    },
    ValueXY: class {
      x = 0;
      y = 0;
      setValue() {}
      stopAnimation() {}
    },
    spring: () => ({ start() {} }),
    timing: () => ({ start() {} }),
    // Exit animations finish at once, so their completion (e.g. closing) runs.
    parallel: () => ({ start(done?: (result: { finished: boolean }) => void) { done?.({ finished: true }); } }),
    multiply: (a: unknown, b: unknown) => ({ a, b }),
    add: (a: unknown, b: unknown) => ({ a, b }),
    event: () => vi.fn(),
  },
}));
vi.mock("react-native-svg", () => ({
  default: "Svg",
  Rect: "Rect",
  G: "G",
  Circle: "Circle",
  Path: "Path",
  Line: "Line",
  Defs: "Defs",
  LinearGradient: "LinearGradient",
  RadialGradient: "RadialGradient",
  Stop: "Stop",
  Text: "SvgText",
}));
vi.mock("lucide-react-native", () => ({
  ArrowDownWideNarrow: "ArrowDownWideNarrow",
  FileText: "FileText",
  ChevronDown: "ChevronDown",
  ChevronRight: "ChevronRight",
  Plus: "Plus",
  Circle: "Circle",
  Sun: "Sun",
  Moon: "Moon",
  BookOpen: "BookOpen",
  ClipboardList: "ClipboardList",
  ExternalLink: "ExternalLink",
  Eye: "Eye",
  EyeOff: "EyeOff",
  ListChecks: "ListChecks",
  Square: "Square",
  RotateCw: "RotateCw",
  Check: "Check",
  Pin: "Pin",
  PinOff: "PinOff",
  CloudOff: "CloudOff",
  X: "X",
  Mail: "Mail",
  MailOpen: "MailOpen",
  Lock: "Lock",
  LockOpen: "LockOpen",
  Trash2: "Trash2",
  ChevronLeft: "ChevronLeft",
  CalendarDays: "CalendarDays",
}));
vi.mock("../../design/haptics", () => ({ haptic: mocks.haptic }));
vi.mock("../../config/apiBaseUrl", () => ({ getApiBaseUrl: () => "https://example.test" }));
vi.mock("../../services/reviewerLibraryApi", () => ({ deleteReviewer: mocks.deleteReviewer }));
vi.mock("../../services/localLibrary/deviceLibrary", () => ({ removeLocalArtifact: mocks.removeLocal }));
vi.mock("./useExperience", () => ({
  useExperienceClient: () => ({
    baseUrl: "https://api.example",
    accessToken: "token",
  }),
  useExperience: (path: string | null) => {
    if (path) mocks.paths.push(path);
    const failure = path ? mocks.errors[path] : undefined;
    return {
      data: path && !failure ? (mocks.data[path] ?? null) : null,
      loading: false,
      error: failure?.message ?? null,
      errorCode: failure?.code ?? null,
      refresh: mocks.refresh,
    };
  },
}));
vi.mock("./useLocalLibrary", () => ({
  useLocalLibrary: () => ({ ...mocks.library, refresh: vi.fn() }),
  useLocalArtifact: () => ({ offlineMissing: mocks.offlineMissing, data: mocks.artifact, loading: false, error: null, deviceCopy: false, refresh: vi.fn(), storeConfirmed: mocks.storeConfirmed }),
}));
vi.mock("../../services/localLibrary/localArtifactDatabase", () => ({
  // This online screen fixture has no pending device edit or local body.
  getLocalArtifactStore: async () => ({
    readPendingDraftEdit: async () => null,
    listPendingDraftEdits: async () => [],
    readDraftCopyReceipt: async () => null,
    readDetail: async () => null,
  }),
}));
vi.mock("../../services/experienceApi", () => ({
  experienceRequest: mocks.request,
  ExperienceApiError: class extends Error { constructor(readonly code: string, message: string) { super(message); } },
}));
vi.mock("../../services/generationRecovery", () => ({
  createGenerationIntent: mocks.createIntent,
  acceptGeneration: mocks.acceptIntent,
}));

let rendered: ReactTestRenderer | undefined;
beforeEach(() => {
  mocks.artifact = null;
  mocks.offlineMissing = false;
  mocks.data = {};
  mocks.errors = {};
  mocks.paths = [];
  mocks.params = {};
  mocks.library = { items: [], offlineStats: null, errorCode: null, categories: null, localReady: true, refreshing: false, error: null };
  mocks.prefs = { pinned: { course: [], artifact: [], today: [], announcement: [] }, hidden: { generate: [], library: [], libraryItems: [], today: [], announcements: [], queue: [] }, read: { announcements: [] }, libraryOrder: {}, librarySort: {} };
  mocks.selectedCourseIds = new Set();
  mocks.reducedMotion = true;
  mocks.focused = true;
  mocks.queueOpen = false;
  mocks.appState = "active";
  mocks.navigationListeners.clear();
  mocks.appListeners.clear();
  vi.clearAllMocks();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterEach(async () => {
  if (rendered) await act(async () => rendered!.unmount());
  rendered = undefined;
  vi.useRealTimers();
});
async function render(element: ReactElement) {
  await act(async () => {
    rendered = create(element);
  });
  return rendered!.root;
}
const supported = { status: "available" as const },
  unavailable = { status: "unavailable" as const };
const savedQuiz: LibraryArtifactSummary = {
  id: "quiz:saved",
  title: "Saved quiz",
  type: "quiz",
  course: null,
  updatedAt: "2026-09-13",
  createdAt: "2026-09-13",
  sourceId: null,
  sourceTitle: null,
  activityId: null,
  lastOpenedAt: null,
  status: "completed",
  relatedArtifactIds: [],
};

describe("Generate and confirmed Library Remake grace", () => {
  async function submit(kind: "generate" | "remake") {
    mocks.createIntent.mockResolvedValue({ key: "grace-key" });
    if (kind === "generate") {
      mocks.data["/api/experience/courses/course"] = workspace;
      mocks.params = { courseId: "course", materialId: "file:one" };
      const root = await render(createElement(GenerateMaterialScreen));
      await act(async () => root.findAll(node => String(node.type) === "Action" && node.props.children === "Generate Reviewer")[0]!.props.onPress());
      return GenerateMaterialScreen;
    }
    mocks.params = { courseKey: "course" };
    mocks.library.items = [{ ...savedQuiz, id: "artifact:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", type: "reviewer", course: workspace.course, sourceMaterialId: "file:one" }];
    const root = await render(createElement(LibraryCourseScreen));
    const swipe = root.findAll(node => String(node.type) === "SwipeRow")[0]!;
    const action = (swipe.props.trailing as { key: string; onPress: () => void }[]).find(item => item.key === "remake")!;
    await act(async () => action.onPress());
    expect(mocks.createIntent).not.toHaveBeenCalled();
    const buttons = mocks.alert.mock.calls.at(-1)![2] as { text: string; onPress?: () => void }[];
    await act(async () => buttons.find(button => button.text === "Remake")!.onPress!());
    return LibraryCourseScreen;
  }

  it("confirmed Remake schedules the observe-only route at 2000ms", async () => {
    vi.useFakeTimers(); await submit("remake");
    expect(mocks.acceptIntent).toHaveBeenCalledTimes(1);
    await act(async () => { vi.advanceTimersByTime(1999); });
    expect(mocks.push).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(mocks.push).toHaveBeenCalledExactlyOnceWith({ pathname: "/generation", params: { intent: "grace-key" } });
    expect(mocks.acceptIntent).toHaveBeenCalledTimes(1);
  });

  it.each(["generate", "remake"] as const)("%s cancels on blur within the window", async kind => {
    vi.useFakeTimers(); const Screen = await submit(kind);
    await act(async () => { vi.advanceTimersByTime(1000); });
    mocks.focused = false;
    await act(async () => rendered!.update(createElement(Screen)));
    mocks.focused = true;
    await act(async () => rendered!.update(createElement(Screen)));
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.acceptIntent).toHaveBeenCalledTimes(1);
  });

  it.each(["generate", "remake"] as const)("%s cancels when Queue opens without blur", async kind => {
    vi.useFakeTimers(); const Screen = await submit(kind);
    mocks.queueOpen = true;
    await act(async () => rendered!.update(createElement(Screen)));
    mocks.queueOpen = false;
    await act(async () => rendered!.update(createElement(Screen)));
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it.each(["generate", "remake"] as const)("%s cancels on navigation events before blur commits", async kind => {
    vi.useFakeTimers(); await submit(kind);
    mocks.navigationListeners.get("state")!.forEach(listener => listener());
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it.each(["generate", "remake"] as const)("%s stays put after background and return", async kind => {
    vi.useFakeTimers(); await submit(kind);
    mocks.appState = "background"; mocks.appListeners.forEach(listener => listener("background"));
    mocks.appState = "active"; mocks.appListeners.forEach(listener => listener("active"));
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
function generateCourse(course: Partial<GenerateCourseSummary> & Pick<CourseSummary, "id">): GenerateCourseSummary {
  return { name: course.id, code: null, status: null, materialCount: null, reviewerCount: null, lastActivityAt: null, syncState: "synced", period: "current", termName: null, lastSuccessfulSyncAt: null, ...course };
}
function copyText(root: ReactTestRenderer["root"]) {
  return root.findAll((node) => String(node.type) === "Copy").map((node) => [node.props.children].flat().join(""));
}
const workspace: CourseLearningWorkspace = {
  course: {
    id: "course",
    name: "Course",
    code: null,
    status: null,
    materialCount: 1,
    reviewerCount: null,
    lastActivityAt: null,
  },
  materials: {
    items: [
      {
        id: "file:one",
        courseId: "course",
        sourceId: "file:one",
        reviewerArtifactId: null,
        title: "Real material",
        kind: "slides",
        readiness: "ready",
        count: 4,
        moduleTitle: "Module from Canvas",
        generation: {
          reviewer: supported,
          quiz: unavailable,
          activityAssistance: unavailable,
        },
      },
    ],
    nextOffset: null,
    totalKnown: 1,
  },
  capabilities: {
    reviewerGeneration: supported,
    quizGeneration: unavailable,
    activityMaker: unavailable,
    planner: supported,
    calendar: unavailable,
  },
};
function todayFixture(): TodayScreenData {
  return {
    date: localDate(), utcOffsetMinutes: -new Date().getTimezoneOffset(), asOf: new Date().toISOString(),
    progress: { completed: 0, total: 0, scheduledMinutes: 0 }, urgent: [], current: null, next: null,
    later: [], overdue: [], upcomingDeadlines: [], timeline: [],
    plannerState: { status: 'not_planned', lastPlannedAt: null, needsTaskImport: false },
    capabilities: workspace.capabilities, announcements: { items: [], nextOffset: null }, activities: { items: [] },
  };
}
const ringTouch = (root: ReactTestRenderer["root"]) => root.findAll((node) => node.props.testID === "day-ring-touch")[0]!;
/** A touch at a design point on the 340-point clock (scale 1 at this window width). */
const touchAt = (x: number, y: number) => ({ nativeEvent: { locationX: x, locationY: y } });
/** Where the ring passes a minute of the day, optionally off the visible track. */
const ringAt = (minutes: number, offset = 0) => {
  const angle = (minutes / 1440) * Math.PI * 2 - Math.PI / 2;
  return { x: 170 + (136 + offset) * Math.cos(angle), y: 170 + (136 + offset) * Math.sin(angle) };
};
describe("B25 screen interactions", () => {
  it.each([TodayScreen, TasksScreen, TasksCourseScreen, LibraryCourseScreen])("opts the reading screen into secondary-header collapse: %s", async Screen => {
    const root = await render(createElement(Screen));
    const page = root.findAll(node => String(node.type) === "Page")[0]!;
    expect(page.props.hideHeaderBelowOnScroll).toBe(true);
    expect(page.props.headerBelowAlwaysVisible).not.toBe(true);
    if (Screen === TodayScreen) {
      expect(page.props.subtitle).toBeUndefined();
      expect(copyText(root)).toContain(new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }));
    }
    if (Screen === LibraryCourseScreen) {
      expect(page.props.onScroll).toBeTypeOf("function");
      expect(page.props.headerBelowFixed).toBeDefined();
      expect(root.findAll(node => String(node.type) === "SegmentedControl").length).toBeGreaterThan(0);
    }
  });
  it("shows a configuration error instead of a sign-in prompt on Generate and Tasks", async () => {
    mocks.errors["/api/experience/courses"] = { code: "missing_api_base_url", message: "App configuration error\nThis version of Stay Focused is missing its server connection configuration." };
    const generate = await render(createElement(GenerateScreen));
    expect(copyText(generate).join(" ")).toContain("App configuration error");
    expect(copyText(generate).join(" ")).not.toContain("Please sign in again");
    await act(async () => rendered!.unmount());
    mocks.errors[`/api/experience/activities?utcOffsetMinutes=${-new Date().getTimezoneOffset()}`] = { code: "missing_api_base_url", message: "App configuration error\nThis version of Stay Focused is missing its server connection configuration." };
    const tasks = await render(createElement(TasksScreen));
    expect(copyText(tasks).join(" ")).toContain("App configuration error");
    expect(copyText(tasks).join(" ")).not.toContain("Please sign in again");
  });
  it("shows an intentional announcement empty state", async () => {
    mocks.data["/api/experience/announcements?limit=100"] = { items: [], nextOffset: null };
    const root = await render(createElement(AnnouncementsScreen));
    expect(root.findAll(node => String(node.type) === "Copy").map(node => node.props.children)).toContain("No announcements");
  });

  it("opens a readable announcement detail without raw HTML or missing metadata crashes", async () => {
    mocks.data["/api/experience/announcements?limit=100"] = {
      items: [{
        id: "announcement",
        course: { id: "course", code: null, name: "Biology" },
        title: "Schedule updated",
        body: "Monday class moves online.\n\n- Use the course room.",
        preview: "Monday class moves online.",
        postedAt: null,
        authorName: null,
        htmlUrl: null,
        attachments: [],
        links: [],
      }],
      nextOffset: null,
    };
    const list = await render(createElement(AnnouncementsScreen));
    const row = list.findAll(node => String(node.type) === "RowLink").find(node => node.props.label === "Unread: Schedule updated")!;
    await act(async () => row.props.onPress());
    expect(mocks.push).toHaveBeenLastCalledWith({ pathname: "/announcement", params: { id: "announcement" } });

    await act(async () => rendered!.unmount());
    mocks.params = { id: "announcement" };
    const root = await render(createElement(AnnouncementDetailScreen));
    const renderedText = root.findAll(node => String(node.type) === "Copy").map(node => String(node.props.children)).join(" ");
    expect(renderedText).toContain("Monday class moves online.");
    expect(renderedText).toContain("Posted date unavailable");
    expect(renderedText).not.toMatch(/<p>|<li>/);
  });

  it("always offers a local Done that closes the announcement without opening Canvas", async () => {
    mocks.data["/api/experience/announcements?limit=100"] = {
      items: [{
        id: "announcement",
        course: { id: "course", code: null, name: "Biology" },
        title: "Schedule updated",
        body: "A long update. ".repeat(400),
        preview: null,
        postedAt: null,
        authorName: null,
        htmlUrl: "https://canvas.example/courses/1/discussion_topics/2",
        attachments: [],
        links: [],
      }],
      nextOffset: null,
    };
    mocks.params = { id: "announcement" };
    const root = await render(createElement(AnnouncementDetailScreen));
    const done = root.findAll(node => String(node.type) === "DoneButton");
    expect(done).toHaveLength(1);
    await act(async () => done[0]!.props.onPress());
    expect(mocks.back).toHaveBeenCalledTimes(1);
    expect(mocks.openURL).not.toHaveBeenCalled();
    // A visible close control and the dimmed backdrop are exits too.
    for (const testID of ["announcement-close", "announcement-backdrop"]) {
      await act(async () => rendered!.unmount());
      mocks.back.mockClear();
      const again = await render(createElement(AnnouncementDetailScreen));
      await act(async () => again.findAll(node => node.props.testID === testID)[0]!.props.onPress());
      expect(mocks.back, testID).toHaveBeenCalledTimes(1);
    }
    expect(mocks.openURL).not.toHaveBeenCalled();
    await act(async () => rendered!.unmount());
    const withCanvas = await render(createElement(AnnouncementDetailScreen));
    const canvasLink = withCanvas.findAll(node => String(node.type) === "Pressable").find(node => node.props.accessibilityLabel === "Open in Canvas")!;
    await act(async () => canvasLink.props.onPress());
    expect(mocks.openURL).toHaveBeenCalledWith("https://canvas.example/courses/1/discussion_topics/2");
  });

  it("marks announcements read (never hides them), pins them, and groups read and unread", async () => {
    mocks.data["/api/experience/announcements?limit=100"] = {
      items: [
        { id: "a1", course: { id: "c", code: "CIT17", name: "CIT17" }, title: "First", body: null, preview: null, postedAt: null, authorName: null, htmlUrl: "https://canvas.example/a1", attachments: [], links: [] },
        { id: "a2", course: { id: "c", code: "CIT17", name: "CIT17" }, title: "Second", body: null, preview: null, postedAt: null, authorName: null, htmlUrl: null, attachments: [], links: [] },
        { id: "a3", course: { id: "c", code: "CIT17", name: "CIT17" }, title: "Old", body: null, preview: null, postedAt: null, authorName: null, htmlUrl: null, attachments: [], links: [] },
      ],
      nextOffset: null,
    };
    mocks.prefs.pinned.announcement = ["a2"];
    mocks.prefs.read.announcements = ["a3"];
    const root = await render(createElement(AnnouncementsScreen));
    const text = copyText(root);
    expect(text.indexOf("Unread")).toBeLessThan(text.indexOf("Read"));
    const titles = root.findAll(node => String(node.type) === "RowLink").map(node => node.props.label);
    // Pinned first among unread; read items after, labelled as read.
    expect(titles).toEqual(["Unread: Second, pinned", "Unread: First", "Old"]);
    type Action = { key: string; onPress: () => void };
    const rowFor = (label: string) => root.findAll(node => String(node.type) === "SwipeRow").find(row => row.findAll(node => String(node.type) === "RowLink")[0]!.props.label === label)!;
    const first = rowFor("Unread: First");
    // Swipe right pins, swipe left marks read.
    expect((first.props.leading as Action[]).map(a => a.key)).toEqual(["pin"]);
    expect((first.props.trailing as Action[]).map(a => a.key)).toEqual(["read"]);
    await act(async () => (first.props.leading as Action[])[0]!.onPress());
    expect(mocks.pin).toHaveBeenCalledWith("announcement", "a1", true);
    await act(async () => (first.props.trailing as Action[])[0]!.onPress());
    expect(mocks.markRead).toHaveBeenCalledWith("a1", true);
    expect(mocks.hide).not.toHaveBeenCalled();
    // A read one can go back to unread.
    expect((rowFor("Old").props.trailing as Action[]).map(a => a.key)).toEqual(["unread"]);
    // Opening one reads it.
    await act(async () => root.findAll(node => String(node.type) === "RowLink").find(node => node.props.label === "Unread: Second, pinned")!.props.onPress());
    expect(mocks.markRead).toHaveBeenCalledWith("a2", true);
    // Long press opens every option, including Open in Canvas.
    const firstRow = root.findAll(node => String(node.type) === "RowLink").find(node => node.props.label === "Unread: First")!;
    expect(firstRow.props.accessibilityActions.map((a: { name: string }) => a.name)).toEqual(["pin", "read", "canvas"]);
    await act(async () => firstRow.props.onLongPress());
    const sheet = root.findAll(node => String(node.type) === "Sheet")[0]!;
    expect(sheet.findAll(node => String(node.type) === "RowLink").map(node => node.props.label)).toEqual(["Read announcement", "Open in Canvas", "Pin to top", "Mark as read"]);
    await act(async () => sheet.findAll(node => node.props.label === "Open in Canvas")[0]!.props.onPress());
    expect(mocks.openURL).toHaveBeenCalledWith("https://canvas.example/a1");
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("keeps local intake on the Generate page; Canvas sync lives in the profile", async () => {
    const root = await render(createElement(GenerateScreen));
    const source = root.findAll(node => String(node.type) === "RowLink" && node.props.label === "Other source")[0]!;
    await act(async () => source.props.onPress());
    expect(mocks.push).toHaveBeenLastCalledWith("/generate");
  });

  it("filters Generate courses while typing by code or name, and clearing restores the list", async () => {
    mocks.data["/api/experience/courses"] = { classificationSource: "canvas", items: [
      generateCourse({ id: "cit17", name: "CIT17 | Web Information Systems", code: "CIT17" }),
      generateCourse({ id: "cc11", name: "Communication in the Workplace", code: "CC11" }),
    ] };
    const root = await render(createElement(GenerateScreen));
    const titles = () => root.findAll((node) => String(node.type) === "CourseCard").map((node) => node.props.identity.title);
    const search = () => root.findAll((node) => String(node.type) === "SearchField")[0]!;
    expect(titles()).toHaveLength(2);
    await act(async () => search().props.onChangeText("cit 17"));
    expect(titles()).toEqual(["Web Information Systems"]);
    await act(async () => search().props.onChangeText("workplace"));
    expect(titles()).toEqual(["Communication in the Workplace"]);
    await act(async () => search().props.onChangeText("zz999"));
    expect(titles()).toEqual([]);
    expect(copyText(root)).toContain("No matching courses");
    await act(async () => search().props.onChangeText(""));
    expect(titles()).toHaveLength(2);
  });
  it("opens the existing completion editor only for a linked task", async () => {
    mocks.data[`/api/experience/activities?utcOffsetMinutes=${-new Date().getTimezoneOffset()}`] = { items: [
      { id: "linked", taskId: "task-1", title: "Linked", urgency: "next", status: "pending", dueAt: null, course: null },
      { id: "unlinked", taskId: null, title: "Canvas only", urgency: "next", status: "unknown", dueAt: null, course: null },
    ] };
    mocks.params = { courseKey: "personal" };
    const root = await render(createElement(TasksCourseScreen));
    expect(root.findAll(node => String(node.type) === "RowLink" && node.props.label === "Grades")).toHaveLength(0);
    const controls = root.findAll(node => String(node.type) === "IconAction" && node.props.label.startsWith("Edit completion:"));
    expect(controls).toHaveLength(1);
    await act(async () => controls[0]!.props.onPress());
    expect(mocks.push).toHaveBeenCalledWith({ pathname: "/task", params: { taskId: "task-1" } });
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("maps the displayed noon-to-evening ring drag to the same availability time", async () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    const root = await render(createElement(DayRingClock, { date: "2026-09-14", timeline: [], start: 360, end: 720, onChange: vi.fn(), onCommit }));
    const overlay = ringTouch(root);
    const noon = ringAt(720);
    await act(async () => {
      overlay.props.onPanResponderGrant(touchAt(noon.x, noon.y));
      // Noon is at the bottom; a quarter-circle clockwise is 6 PM on the left.
      overlay.props.onPanResponderMove(null, { dx: -136, dy: -136 });
      overlay.props.onPanResponderRelease();
    });
    expect(onCommit).toHaveBeenLastCalledWith(360, 1080);
  });
  it("collapses past courses below current courses and routes only synced courses to materials", async () => {
    mocks.data["/api/experience/courses"] = { classificationSource: "canvas", items: [
      generateCourse({ id: "current", name: "Current synced" }),
      generateCourse({ id: "unsynced", name: "Current unsynced", syncState: "not_synced" }),
      generateCourse({ id: "retry", name: "Previous failed", period: "previous", syncState: "sync_incomplete" }),
      generateCourse({ id: "course", name: "Previous synced", period: "previous" }),
    ] };
    const root = await render(createElement(GenerateScreen));
    expect(root.findAll(node => String(node.type) === 'CourseCard')).toHaveLength(2);
    const past = root.findAll(node => String(node.type) === 'Pressable' && node.props.accessibilityLabel === 'Past courses (2)')[0]!;
    expect(past.props.accessibilityState.expanded).toBe(false);
    await act(async () => past.props.onPress());
    expect(past.props.accessibilityState.expanded).toBe(true);
    const rows = root.findAll((node) => String(node.type) === "CourseCard");
    expect(rows.map((node) => node.props.accessibilityLabel)).toEqual([
      "Open Current synced, Synced", "Sync Current unsynced, Not synced · Tap to sync", "Sync Previous failed, Sync incomplete · Tap to retry", "Open Previous synced, Synced",
    ]);
    for (const [index, id] of [[1, "unsynced"], [2, "retry"]] as const) {
      await act(async () => rows[index]!.props.onPress());
      expect(mocks.push).toHaveBeenLastCalledWith({ pathname: "/canvas-settings", params: { courseId: id } });
    }
    await act(async () => rows[3]!.props.onPress());
    // Opening a course is a navigation entry, so back returns to this list.
    expect(mocks.push).toHaveBeenLastCalledWith({ pathname: "/courses/[courseId]", params: { courseId: "course", courseName: "Previous synced", courseCode: "" } });
    expect(mocks.paths.some((path) => path.startsWith("/api/experience/courses/"))).toBe(false);
  });
  it('keeps a pinned past course collapsed and offers both owner move controls', async () => {
    mocks.data['/api/experience/courses'] = { classificationSource: 'canvas', items: [
      generateCourse({ id: 'current', name: 'Current', courseState: 'current' }),
      generateCourse({ id: 'past', name: 'Past', courseState: 'past' }),
    ] };
    mocks.prefs.pinned.course = ['past'];
    mocks.request.mockResolvedValueOnce({}).mockResolvedValueOnce({});
    const root = await render(createElement(GenerateScreen));
    expect(root.findAll(node => String(node.type) === 'CourseCard').map(node => node.props.identity.title)).toEqual(['Current']);
    const current = root.findAll(node => String(node.type) === 'SwipeRow')[0]!;
    await act(async () => current.props.trailing.find((action: { key: string }) => action.key === 'course-state').onPress());
    expect(mocks.request).toHaveBeenLastCalledWith(expect.anything(), '/api/experience/courses/current/state', { method: 'PATCH', body: { override: 'past' } });
    await act(async () => root.findAll(node => String(node.type) === 'Pressable' && node.props.accessibilityLabel === 'Past courses (1)')[0]!.props.onPress());
    const past = root.findAll(node => String(node.type) === 'SwipeRow')[1]!;
    expect(past.props.leading ?? []).toEqual([]);
    await act(async () => past.props.trailing.find((action: { key: string }) => action.key === 'course-state').onPress());
    expect(mocks.request).toHaveBeenLastCalledWith(expect.anything(), '/api/experience/courses/past/state', { method: 'PATCH', body: { override: 'current' } });
    expect(mocks.refresh).toHaveBeenCalledTimes(2);
  });
  it('refreshes a past-course open once and a later explicit refresh once more', async () => {
    mocks.params = { courseId: 'course' };
    mocks.data['/api/experience/courses/course'] = { ...workspace, course: { ...workspace.course, courseState: 'past' } };
    const root = await render(createElement(GenerateCourseScreen));
    expect(mocks.sync).toHaveBeenCalledExactlyOnceWith({ id: 'course', displayName: workspace.course.name });
    await act(async () => rendered!.update(createElement(GenerateCourseScreen)));
    expect(mocks.sync).toHaveBeenCalledTimes(1);
    await act(async () => root.findAll(node => String(node.type) === 'Page')[0]!.props.onRefresh());
    expect(mocks.sync).toHaveBeenCalledTimes(2);
  });
  it("gives every Generate course the same title-first identity", async () => {
    mocks.data["/api/experience/courses"] = { classificationSource: "canvas", items: [
      generateCourse({ id: "capstone", name: "CIT6 | CITCS 3N GROUP A | CAPSTONE PROJECT 1", code: "CIT6 | CITCS 3N GROUP A" }),
    ] };
    const root = await render(createElement(GenerateScreen));
    const card = root.findAll((node) => String(node.type) === "CourseCard")[0]!;
    expect(card.props.identity).toMatchObject({ title: "Capstone Project 1", subtitle: "CIT6 · CITCS 3N Group A", monogram: "CIT6" });
    expect(root.findAll((node) => String(node.type) === "ContentIcon")).toHaveLength(0);
  });
  it("distinguishes a synced empty course, a sync-state denial, and a real loading failure", async () => {
    mocks.data["/api/experience/courses"] = { classificationSource: "canvas", items: [generateCourse({ id: "course" })] };
    mocks.data["/api/experience/courses/course"] = { ...workspace, materials: { items: [], nextOffset: null, totalKnown: 0 } };
    const copy = (root: ReactTestRenderer["root"]) => root.findAll((node) => String(node.type) === "Copy").map((node) => String(node.props.children));
    mocks.params = { courseId: "course" };
    let root = await render(createElement(GenerateCourseScreen));
    expect(copy(root)).toContain("No eligible materials found");
    expect(copy(root)).not.toContain("Materials could not be loaded");

    mocks.errors["/api/experience/courses/course"] = { code: "course_not_synced", message: "This course is not synced with Stay Focused yet." };
    await act(async () => rendered!.unmount()); root = await render(createElement(GenerateCourseScreen));
    expect(copy(root)).toContain("This course is not synced");
    expect(copy(root)).not.toContain("Materials could not be loaded");

    mocks.errors["/api/experience/courses/course"] = { code: "unavailable", message: "The server could not load this content." };
    await act(async () => rendered!.unmount()); root = await render(createElement(GenerateCourseScreen));
    expect(copy(root)).toContain("Materials could not be loaded");
    expect(root.findAll((node) => String(node.type) === "Action").some((node) => node.props.children === "Try again")).toBe(true);
  });
  it("selects real material, disables unavailable Quiz and opens Reviewer progress after two seconds", async () => {
    vi.useFakeTimers();
    mocks.data["/api/experience/courses"] = { classificationSource: "canvas", items: [generateCourse(workspace.course)] };
    mocks.data["/api/experience/courses/course"] = workspace;
    mocks.createIntent.mockResolvedValue({ key: "saved-key" });
    mocks.params = { courseId: "course" };
    const course = await render(createElement(GenerateCourseScreen));
    const row = course
      .findAll((node) => String(node.type) === "Pressable")
      .find((node) => node.props.accessibilityLabel === "Open material: Real material")!;
    await act(async () => row.props.onPress());
    // The material is its own stack entry: back returns to the course.
    expect(mocks.push).toHaveBeenLastCalledWith({ pathname: "/courses/[courseId]/material", params: { courseId: "course", materialId: "file:one" } });
    await act(async () => rendered!.unmount());
    mocks.params = { courseId: "course", materialId: "file:one" };
    const root = await render(createElement(GenerateMaterialScreen));
    const quiz = root
      .findAll((node) => String(node.type) === "Action")
      .find((node) => node.props.children === "Generate Quiz")!;
    expect(quiz.props.disabled).toBe(true);
    const reviewer = root
      .findAll((node) => String(node.type) === "Action")
      .find((node) => node.props.children === "Generate Reviewer")!;
    await act(async () => reviewer.props.onPress());
    expect(mocks.createIntent).toHaveBeenCalledWith(
      "owner",
      expect.objectContaining({
        body: { courseId: "course", materialId: "file:one" },
      }),
    );
    expect(mocks.createIntent).toHaveBeenCalledWith('owner', expect.objectContaining({ autoSubmit: true }));
    expect(mocks.acceptIntent).toHaveBeenCalledWith('owner', expect.anything(), { key: 'saved-key' });
    expect(mocks.push.mock.calls.some(call => call[0]?.pathname === '/generation')).toBe(false);
    await act(async () => { vi.advanceTimersByTime(1999); });
    expect(mocks.push.mock.calls.some(call => call[0]?.pathname === '/generation')).toBe(false);
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(mocks.push).toHaveBeenLastCalledWith({ pathname: '/generation', params: { intent: 'saved-key' } });
    expect(mocks.acceptIntent).toHaveBeenCalledTimes(1);
  });
  it("keeps Retry quiet, single-flight, and rejoins it after returning to the material", async () => {
    const needsPreparation = { ...workspace.materials.items[0]!, preparation: {status:'failed' as const,reasonCode:'preparation_failed' as const} };
    mocks.data["/api/experience/courses/course"] = {
      ...workspace,
      materials: { ...workspace.materials, items: [needsPreparation] },
    };
    mocks.params = { courseId: "course", materialId: "file:one" };
    let resolvePreparation!: (value: { items: typeof workspace.materials.items }) => void;
    mocks.request.mockImplementationOnce(() => new Promise((resolve) => { resolvePreparation = resolve; }));
    let root = await render(createElement(GenerateMaterialScreen));
    const prepare = root.findAll((node) => String(node.type) === "Action").find((node) => node.props.children === "Retry")!;
    await act(async () => { void prepare.props.onPress(); void prepare.props.onPress(); });
    expect(copyText(root).join(" ")).toContain("Couldn't prepare");
    expect(root.findAll((node) => String(node.type) === "GenerationCore")).toHaveLength(0);
    expect(mocks.request).toHaveBeenCalledTimes(1);

    await act(async () => rendered!.unmount());
    root = await render(createElement(GenerateMaterialScreen));
    expect(copyText(root).join(" ")).toContain("Couldn't prepare");
    expect(mocks.request).toHaveBeenCalledTimes(1);
    await act(async () => resolvePreparation({ items: [{ ...needsPreparation, preparation: {status:'ready',reasonCode:null} }] }));
    expect(root.findAll((node) => String(node.type) === "Action").some((node) => node.props.children === "Prepare material")).toBe(false);
  });
  it.each(['ready', 'preparing', 'failed'] as const)('shows calm %s status with generation gated on Ready', async status => {
    mocks.data['/api/experience/courses/course'] = { ...workspace, materials: { ...workspace.materials,
      items: [{ ...workspace.materials.items[0]!, preparation:{status,reasonCode:null} }] } };
    mocks.params = {courseId:'course',materialId:'file:one'};
    const root = await render(createElement(GenerateMaterialScreen));
    expect(copyText(root).join(' ')).toContain(status==='failed'?"Couldn't prepare":status==='ready'?'Ready':'Preparing');
    const actions=root.findAll(node=>String(node.type)==='Action');
    expect(actions.some(node=>node.props.children==='Retry')).toBe(status==='failed');
    expect(actions.find(node=>node.props.children==='Generate Reviewer')!.props.disabled).toBe(status!=='ready');
    expect(root.findAll(node=>String(node.type)==='GenerationCore')).toHaveLength(0);
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('hides Retry when the current material read is offline', async () => {
    mocks.data['/api/experience/courses/course'] = { ...workspace, materials: { ...workspace.materials,
      items: [{ ...workspace.materials.items[0]!, preparation:{status:'failed',reasonCode:'preparation_paused'} }] } };
    mocks.errors['/api/experience/courses/course/materials?offset=0']={code:'connection',message:'Offline'};
    mocks.params={courseId:'course',materialId:'file:one'};
    const root=await render(createElement(GenerateMaterialScreen));
    expect(copyText(root).join(' ')).toContain('Preparation paused. Tap Retry');
    expect(root.findAll(node=>String(node.type)==='Action').some(node=>node.props.children==='Retry')).toBe(false);
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it.each([true,false])('Preparing stays static with Reduce Motion %s',async reducedMotion=>{
    mocks.reducedMotion=reducedMotion;
    mocks.data['/api/experience/courses/course']={...workspace,materials:{...workspace.materials,
      items:[{...workspace.materials.items[0]!,preparation:{status:'preparing',reasonCode:null}}]}};
    mocks.params={courseId:'course',materialId:'file:one'};
    const root=await render(createElement(GenerateMaterialScreen));
    expect(copyText(root).join(' ')).toContain('Preparing');
    expect(root.findAll(node=>['GenerationCore','ActivityIndicator','AnimatedView'].includes(String(node.type)))).toHaveLength(0);
  });
  it("keeps the material page visible while saving one silent Reviewer request", async () => {
    mocks.data["/api/experience/courses/course"] = workspace;
    mocks.params = { courseId: "course", materialId: "file:one" };
    let resolveIntent!: (value: { key: string }) => void;
    mocks.createIntent.mockImplementationOnce(() => new Promise((resolve) => { resolveIntent = resolve; }));
    const root = await render(createElement(GenerateMaterialScreen));
    const reviewer = root.findAll((node) => String(node.type) === "Action").find((node) => node.props.children === "Generate Reviewer")!;
    await act(async () => { void reviewer.props.onPress(); void reviewer.props.onPress(); });
    expect(copyText(root).join(" ")).not.toContain("Submitting generation");
    expect(root.findAll((node) => String(node.type) === "GenerationCore")).toHaveLength(0);
    expect(mocks.createIntent).toHaveBeenCalledTimes(1);
    await act(async () => resolveIntent({ key: "intent" }));
    expect(mocks.push).not.toHaveBeenCalled();
    expect(root.findAll(node => String(node.type) === 'Notice').map(node => node.props.children).join(' ')).toContain('Request saved.');
  });
  it("continues silent admission when the student leaves before secure persistence completes", async () => {
    mocks.data["/api/experience/courses/course"] = workspace;
    mocks.params = { courseId: "course", materialId: "file:one" };
    let resolveIntent!: (value: { key: string }) => void;
    mocks.createIntent.mockImplementationOnce(() => new Promise(resolve => { resolveIntent = resolve; }));
    const root = await render(createElement(GenerateMaterialScreen));
    const button = root.findAll(node => String(node.type) === "Action" && node.props.children === "Generate Reviewer")[0]!;
    await act(async () => { void button.props.onPress(); });
    await act(async () => rendered!.unmount()); rendered = undefined;
    await act(async () => { resolveIntent({ key: "saved-after-navigation" }); });
    expect(mocks.acceptIntent).toHaveBeenCalledWith("owner", expect.anything(), { key: "saved-after-navigation" });
    expect(mocks.push).not.toHaveBeenCalled();
  });
  it("creates Quiz only from the persisted Reviewer linked to a material", async () => {
    vi.useFakeTimers();
    const reviewerWorkspace: CourseLearningWorkspace = {
      ...workspace,
      materials: {
        ...workspace.materials,
        items: workspace.materials.items.map((item) => ({
          ...item,
          reviewerArtifactId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          generation: { ...item.generation, quiz: supported },
        })),
      },
      capabilities: { ...workspace.capabilities, quizGeneration: supported },
    };
    mocks.data["/api/experience/courses"] = { classificationSource: "canvas", items: [generateCourse(workspace.course)] };
    mocks.data["/api/experience/courses/course"] = reviewerWorkspace;
    mocks.createIntent.mockResolvedValue({ key: "quiz-key" });
    mocks.params = { courseId: "course", materialId: "file:one" };
    const root = await render(createElement(GenerateMaterialScreen));
    const quiz = root.findAll((node) => String(node.type) === "Action").find((node) => node.props.children === "Generate Quiz")!;
    expect(quiz.props.disabled).toBe(false);
    await act(async () => quiz.props.onPress());
    expect(mocks.createIntent).toHaveBeenCalledWith("owner", expect.objectContaining({
      body: expect.objectContaining({
        sourceType: "reviewer",
        sourceIds: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
        reviewerArtifactId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    }));
    expect(mocks.push).toHaveBeenCalledExactlyOnceWith({ pathname: '/generation', params: { intent: 'quiz-key', start: '1' } });
    expect(mocks.acceptIntent).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(mocks.push).toHaveBeenCalledTimes(1);
  });
  it("opens a Library artifact without calling generation", async () => {
    mocks.library.items = [savedQuiz];
    mocks.library.categories = { reviewer: supported, quiz: supported, activity_output: supported };
    const grid = await render(createElement(LibraryScreen));
    const tile = grid.findAll((node) => String(node.type) === "CourseTile")[0]!;
    expect(tile.props.footnote).toBe("1 quiz");
    await act(async () => tile.props.onPress());
    expect(mocks.push).toHaveBeenLastCalledWith({ pathname: "/library/[courseKey]", params: { courseKey: "personal" } });
    await act(async () => rendered!.unmount());
    mocks.params = { courseKey: "personal" };
    const root = await render(createElement(LibraryCourseScreen));
    const open = root
      .findAll((node) => String(node.type) === "RowLink")
      .find((node) => node.props.label === "Quiz: Saved quiz")!;
    await act(async () => open.props.onPress());
    expect(mocks.push).toHaveBeenCalledWith({
      pathname: "/artifact",
      params: { id: "quiz:saved" },
    });
    expect(mocks.createIntent).not.toHaveBeenCalled();
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it.each([
    { reviewMinutes: 15, origin: 'manual' as const, expected: '~15 min review' },
    { reviewMinutes: null, origin: 'manual' as const, expected: null },
    { reviewMinutes: undefined, origin: 'manual' as const, expected: null },
    { reviewMinutes: 15, origin: 'automatic' as const, expected: 'Made automatically · ~15 min review' },
    { reviewMinutes: null, origin: 'automatic' as const, expected: 'Made automatically' },
  ])('renders the saved reviewer card secondary line: %j', async ({ reviewMinutes, origin, expected }) => {
    mocks.params = { courseKey: 'personal' };
    mocks.library.items = [{ ...savedQuiz, id: 'artifact:saved', type: 'reviewer', title: 'Saved reviewer', reviewMinutes, origin }];
    const root = await render(createElement(LibraryCourseScreen));
    const lines = copyText(root);
    if (expected) expect(lines).toContain(expected);
    else expect(lines.join(' ')).not.toContain('min review');
  });
  it('does not show reviewer estimates on quiz cards', async () => {
    mocks.params = { courseKey: 'personal' };
    mocks.library.items = [{ ...savedQuiz, reviewMinutes: 15 }];
    expect(copyText(await render(createElement(LibraryCourseScreen))).join(' ')).not.toContain('min review');
  });
  it("keeps device-saved work visible while the cloud refresh runs", async () => {
    mocks.library.items = [savedQuiz];
    mocks.library.refreshing = true;
    const root = await render(createElement(LibraryScreen));
    expect(root.findAll((node) => node.props.accessibilityLabel === "Loading Library")).toHaveLength(0);
    expect(root.findAll((node) => String(node.type) === "CourseTile").map((node) => node.props.accessibilityLabel)).toContain("Personal & other, 1 quiz");
    expect(copyText(root)).toContain("Checking for updates…");
  });
  it("shows device-saved work with a quiet notice when the cloud is unreachable", async () => {
    mocks.library.items = [savedQuiz];
    mocks.library.error = "Could not connect.";
    const root = await render(createElement(LibraryScreen));
    expect(root.findAll((node) => String(node.type) === "CourseTile")).toHaveLength(1);
    expect(copyText(root)).not.toContain("Library could not be loaded");
    expect(root.findAll((node) => String(node.type) === "Notice").map((node) => node.props.children)).toContain(
      "Showing work saved on this device. Refresh when you are back online.",
    );
  });
  it("shows the structural loading state only when nothing is saved on the device yet", async () => {
    mocks.library.refreshing = true;
    const root = await render(createElement(LibraryScreen));
    expect(root.findAll((node) => node.props.accessibilityLabel === "Loading Library" && String(node.type) === "View")).toHaveLength(1);
    expect(root.findAll((node) => String(node.type) === "SkeletonBlock").length).toBeGreaterThan(0);
  });
  it("keeps the B34 error surface when there is no saved work and the cloud fails", async () => {
    mocks.library.error = "Could not connect.";
    const root = await render(createElement(LibraryScreen));
    expect(copyText(root)).toContain("Library could not be loaded");
  });
  it("organizes Tasks course-first with real counts and opens a course", async () => {
    const day = 86_400_000, now = Date.now();
    const course = { id: "capstone", code: "CIT6 | CITCS 3N GROUP A", name: "CIT6 | CITCS 3N GROUP A | CAPSTONE PROJECT 1" };
    const other = { id: "security", code: "CC16 | CITCS 2N GROUP A", name: "CC16 | CITCS 2N GROUP A | IT SECURITY" };
    mocks.data[`/api/experience/activities?utcOffsetMinutes=${-new Date().getTimezoneOffset()}`] = { items: [
      { id: "a", title: "Chapter 2", status: "unknown", isOverdue: false, dueAt: new Date(now + 2 * day).toISOString(), course, urgency: "next" },
      { id: "b", title: "Proposal", status: "unknown", isOverdue: true, dueAt: new Date(now - day).toISOString(), course, urgency: "now" },
      { id: "c", title: "Chapter 1", status: "submitted", isOverdue: false, dueAt: new Date(now - 9 * day).toISOString(), course, urgency: "later" },
      { id: "d", title: "Firewall lab", status: "unknown", isOverdue: false, dueAt: new Date(now + 20 * day).toISOString(), course: other, urgency: "later" },
    ] };
    const root = await render(createElement(TasksScreen));
    const cards = root.findAll((node) => String(node.type) === "CourseCard");
    expect(cards.map((node) => node.props.accessibilityLabel)).toEqual([
      "Capstone Project 1: 1 due, 1 past due, 1 completed",
      "IT Security: 1 due, 0 past due, 0 completed",
    ]);
    await act(async () => cards[0]!.props.onPress());
    expect(mocks.push).toHaveBeenLastCalledWith({ pathname: "/work/[courseKey]", params: { courseKey: "capstone" } });
  });
  it("shows a course's past-due work first, then due soon, with completed collapsed", async () => {
    const day = 86_400_000, now = Date.now();
    const course = { id: "capstone", code: null, name: "Capstone" };
    mocks.data[`/api/experience/activities?utcOffsetMinutes=${-new Date().getTimezoneOffset()}`] = { items: [
      { id: "later", title: "Final paper", status: "unknown", isOverdue: false, dueAt: new Date(now + 30 * day).toISOString(), course },
      { id: "soon", title: "Chapter 2", status: "unknown", isOverdue: false, dueAt: new Date(now + 2 * day).toISOString(), course },
      { id: "missed", title: "Proposal", status: "unknown", isOverdue: true, dueAt: new Date(now - day).toISOString(), course },
      { id: "done", title: "Chapter 1", status: "completed", isOverdue: false, dueAt: new Date(now - 9 * day).toISOString(), course },
      { id: "elsewhere", title: "Other course", status: "unknown", isOverdue: false, dueAt: null, course: { id: "x", code: null, name: "X" } },
    ] };
    mocks.params = { courseKey: "capstone" };
    const root = await render(createElement(TasksCourseScreen));
    const text = copyText(root);
    expect(text.indexOf("Past due")).toBeLessThan(text.indexOf("Proposal"));
    expect(text.indexOf("Proposal")).toBeLessThan(text.indexOf("Due soon"));
    expect(text.indexOf("Due soon")).toBeLessThan(text.indexOf("Chapter 2"));
    expect(text.indexOf("Chapter 2")).toBeLessThan(text.indexOf("Final paper"));
    expect(text).not.toContain("Other course");
    expect(text).not.toContain("Chapter 1");
    const toggle = root.findAll((node) => String(node.type) === "Pressable").find((node) => node.props.accessibilityLabel === "Show 1 completed tasks")!;
    await act(async () => toggle.props.onPress());
    expect(copyText(root)).toContain("Chapter 1");
    const open = root.findAll((node) => String(node.type) === "Pressable").find((node) => node.props.accessibilityLabel === "Open task: Proposal")!;
    await act(async () => open.props.onPress());
    expect(mocks.push).toHaveBeenLastCalledWith({ pathname: "/activity", params: { id: "missed" } });
    const grades = root.findAll(node => String(node.type) === "RowLink" && node.props.label === "Grades")[0]!;
    await act(async () => grades.props.onPress());
    expect(mocks.push).toHaveBeenLastCalledWith({ pathname: TASK_COURSE_GRADES_PATHNAME,
      params: { ...courseRouteParams({ courseId: course.id, courseName: course.name }), courseKey: "capstone" } });
  });
  it("has no pull-to-refresh on Today, and pauses scrolling while the ring is held", async () => {
    vi.useFakeTimers();
    mocks.data[`/api/today?date=${localDate()}&utcOffsetMinutes=${-new Date().getTimezoneOffset()}`] = todayFixture();
    const root = await render(createElement(TodayScreen));
    const page = () => root.findAll((node) => String(node.type) === "Page")[0]!;
    expect(new Set(mocks.paths)).toEqual(new Set([
      `/api/today?date=${localDate()}&utcOffsetMinutes=${-new Date().getTimezoneOffset()}`,
    ]));
    expect(page().props.onRefresh).toBeUndefined();
    const overlay = ringTouch(root);
    const clock = root.findByType(DayRingClock).props;
    const end = ringAt(clock.end as number);
    await act(async () => {
      overlay.props.onPanResponderGrant(touchAt(end.x, end.y));
      vi.advanceTimersByTime(200);
    });
    expect(page().props.scrollEnabled).toBe(false);
    await act(async () => overlay.props.onPanResponderRelease());
    expect(page().props.scrollEnabled).toBe(true);
  });

  it("keeps Today quiet: no sync line, no free-time or hint text", async () => {
    mocks.data[`/api/today?date=${localDate()}&utcOffsetMinutes=${-new Date().getTimezoneOffset()}`] = todayFixture();
    const root = await render(createElement(TodayScreen));
    const text = copyText(root).join(" ");
    expect(root.findAll((node) => String(node.type) === "SyncStatus")).toHaveLength(0);
    expect(text).not.toMatch(/ free\b/);
    expect(text).not.toContain("Drag an end");
    expect(text).not.toContain("schedule has been updated");
  });

  it("fills a clear day with the illustration and brings its planning action back to the clock", async () => {
    const root = await render(createElement(TodayScreen));
    expect(copyText(root)).toContain("Your day is clear.");
    expect(copyText(root)).toContain("Nothing due.");
    const page = root.findAll((node) => String(node.type) === "Page")[0]!;
    const scrollTo = vi.fn();
    page.props.scrollRef.current = { scrollTo };
    const action = root.findAll((node) => String(node.type) === "Action").find((node) => node.props.children === "Plan your free time")!;
    await act(async () => action.props.onPress());
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("locks the clock so the free time cannot be dragged, while blocks stay tappable", async () => {
    const onCommit = vi.fn();
    const onToggleLock = vi.fn();
    const root = await render(createElement(DayRingClock, { date: "2026-09-13", timeline: [], start: 600, end: 720, onChange: vi.fn(), onCommit, locked: true, onToggleLock }));
    const end = ringAt(720);
    expect(ringTouch(root).props.onStartShouldSetPanResponder(touchAt(end.x, end.y))).toBe(false);
    const lock = root.findAll((node) => node.props.testID === "clock-lock")[0]!;
    expect(lock.props.accessibilityState).toEqual({ checked: true });
    await act(async () => lock.props.onPress());
    expect(onToggleLock).toHaveBeenCalledTimes(1);
  });

  it("opens the activity behind a block when a clock block is tapped", async () => {
    const onSegmentPress = vi.fn();
    const at = (h: number) => new Date(`2026-09-13T${String(h).padStart(2, "0")}:00:00`).toISOString();
    const timeline = [{ id: "session:1", kind: "study_session", title: "Dice Roller", course: null, startAt: at(15), endAt: at(16), dueAt: null, estimatedMinutes: 60, priority: "medium", status: "planned", source: "local", deepLinkTarget: { surface: "study_session", id: "1" } }];
    const lanePaths = (tree: ReactTestRenderer["root"]) => tree.findAll((node) => String(node.type) === "Path" && node.props.strokeWidth === 6 && !node.props.strokeDasharray);
    // While a new plan is previewed, the blocks it will replace fade back.
    const previewing = await render(createElement(DayRingClock, { date: "2026-09-13", timeline: timeline as never, start: 840, end: 1020, onChange: vi.fn(), onCommit: vi.fn(), proposed: [{ id: "p", from: 840, to: 900, color: "#000" }] }));
    expect(lanePaths(previewing)[0]!.props.opacity).toBeLessThan(0.5);
    await act(async () => rendered!.unmount());
    const root = await render(createElement(DayRingClock, { date: "2026-09-13", timeline: timeline as never, start: 840, end: 1020, onChange: vi.fn(), onCommit: vi.fn(), onSegmentPress }));
    expect(lanePaths(root)).toHaveLength(1);
    // On the inner lane at 3:30 PM.
    const angle = (930 / 1440) * Math.PI * 2 - Math.PI / 2;
    const point = { x: 170 + 116 * Math.cos(angle), y: 170 + 116 * Math.sin(angle) };
    const overlay = ringTouch(root);
    expect(overlay.props.onStartShouldSetPanResponder(touchAt(point.x, point.y))).toBe(true);
    await act(async () => {
      overlay.props.onPanResponderGrant(touchAt(point.x, point.y));
      overlay.props.onPanResponderRelease();
    });
    expect(onSegmentPress).toHaveBeenCalledWith("session:1");
    // A tap never claims the touch from the page.
    expect(overlay.props.onShouldBlockNativeResponder()).toBe(false);
  });
  it("sends a planner preview when the ring is committed, never applying silently", async () => {
    mocks.data[`/api/today?date=${localDate()}&utcOffsetMinutes=${-new Date().getTimezoneOffset()}`] = todayFixture();
    mocks.data[
      `/api/today?date=${localDate()}&utcOffsetMinutes=${-new Date().getTimezoneOffset()}`
    ] = {
      ...todayFixture(),
      timeline: [],
      next: null,
      later: [],
      plannerState: { needsTaskImport: false },
    } as unknown as TodayOverview;
    mocks.request.mockResolvedValue({ sessions: [], unscheduledWork: [] });
    const root = await render(createElement(TodayScreen));
    await act(async () =>
      root.findByType(DayRingClock).props.onCommit(600, 720),
    );
    expect(mocks.request).toHaveBeenCalledWith(
      expect.anything(),
      "/api/experience/planner/preview",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({ availability: expect.any(Array) }),
      }),
    );
    expect(mocks.request).toHaveBeenCalledTimes(1);
  });
  it("grabs an end at once, follows the finger continuously, and snaps only on release", async () => {
    vi.useFakeTimers();
    const onChange = vi.fn(),
      onCommit = vi.fn();
    const root = await render(createElement(DayRingClock, { date: "2026-09-13", timeline: [], start: 600, end: 720, onChange, onCommit }));
    const overlay = ringTouch(root);
    const end = ringAt(720);
    // Grab well outside the thin visible ring: the touch area is generous.
    const loose = ringAt(724, 24);
    expect(overlay.props.onStartShouldSetPanResponder(touchAt(loose.x, loose.y))).toBe(true);
    // Away from the free-time block the page keeps the touch.
    const away = ringAt(200);
    expect(overlay.props.onStartShouldSetPanResponder(touchAt(away.x, away.y))).toBe(false);
    // An end owns its touch immediately (the page cannot steal it) with no hold.
    await act(async () => overlay.props.onPanResponderGrant(touchAt(end.x, end.y)));
    expect(overlay.props.onShouldBlockNativeResponder()).toBe(true);
    expect(mocks.haptic.select).toHaveBeenCalled();
    // Drag a few minutes at once: the readout follows unsnapped.
    await act(async () => {
      overlay.props.onPanResponderMove(null, { dx: -16, dy: 0.6 });
      vi.advanceTimersByTime(20);
    });
    const live = copyText(root).join(" ");
    expect(live).toMatch(/Free until/);
    expect(onCommit).not.toHaveBeenCalled();
    await act(async () => overlay.props.onPanResponderRelease());
    const [from, to] = onCommit.mock.calls.at(-1)!;
    expect(from).toBe(600);
    expect(to % 15).toBe(0);
    expect(to).toBeGreaterThan(720);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("drags the whole block from its middle, keeping its length", async () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    const root = await render(createElement(DayRingClock, { date: "2026-09-13", timeline: [], start: 540, end: 720, onChange: vi.fn(), onCommit }));
    const overlay = ringTouch(root);
    const middle = ringAt(630);
    const later = ringAt(690);
    // Moving before the hold completes is a scroll: the page keeps it.
    await act(async () => {
      overlay.props.onPanResponderGrant(touchAt(middle.x, middle.y));
      overlay.props.onPanResponderMove(null, { dx: 0, dy: 30 });
      vi.advanceTimersByTime(400);
      overlay.props.onPanResponderRelease();
    });
    expect(onCommit).not.toHaveBeenCalled();
    await act(async () => {
      overlay.props.onPanResponderGrant(touchAt(middle.x, middle.y));
      expect(overlay.props.onShouldBlockNativeResponder()).toBe(false);
      vi.advanceTimersByTime(240);
      overlay.props.onPanResponderMove(null, { dx: later.x - middle.x, dy: later.y - middle.y });
      overlay.props.onPanResponderRelease();
    });
    expect(onCommit).toHaveBeenLastCalledWith(600, 780);
  });

  it("exposes accessible step adjustments for both edges and the whole block", async () => {
    const onChange = vi.fn(),
      onCommit = vi.fn();
    const root = await render(createElement(DayRingClock, { date: "2026-09-13", timeline: [], start: 600, end: 720, onChange, onCommit }));
    const control = (label: string) => root.findAll((node) => node.props.accessibilityLabel === label && node.props.accessibilityRole === "adjustable")[0]!;
    await act(async () => control("Availability end").props.onAccessibilityAction({ nativeEvent: { actionName: "increment" } }));
    expect(onCommit).toHaveBeenLastCalledWith(600, 735);
    await act(async () => control("Free time block").props.onAccessibilityAction({ nativeEvent: { actionName: "decrement" } }));
    expect(onCommit).toHaveBeenLastCalledWith(585, 705);
  });

  it("uses one swipe language: right to pin, left to hide; Library offers only Pin", async () => {
    type Action = { key: string; onPress: () => void };
    const keys = (row: { props: { leading?: Action[]; trailing?: Action[] } }) => [
      (row.props.leading ?? []).map((action) => action.key),
      (row.props.trailing ?? []).map((action) => action.key),
    ];
    mocks.data["/api/experience/courses"] = { classificationSource: "canvas", items: [
      generateCourse({ id: "synced", name: "Synced course" }),
      generateCourse({ id: "unsynced", name: "Unsynced course", syncState: "not_synced" }),
    ] };
    const generate = await render(createElement(GenerateScreen));
    const generateRows = generate.findAll((node) => String(node.type) === "SwipeRow");
    expect(generateRows.map(keys)).toEqual([[["pin"], ["hide", "unsync", "course-state"]], [["pin"], ["hide", "course-state"]]]);
    // A normal tap still opens the course.
    await act(async () => generate.findAll((node) => String(node.type) === "CourseCard")[0]!.props.onPress());
    expect(mocks.push).toHaveBeenLastCalledWith(expect.objectContaining({ pathname: "/courses/[courseId]" }));
    await act(async () => rendered!.unmount());

    const courseItem = { ...savedQuiz, id: "reviewer:cit17", type: "reviewer" as const, course: { id: "synced", code: "CIT17", name: "Web Information Systems" } };
    mocks.library.items = [courseItem, savedQuiz];
    mocks.selectedCourseIds = new Set(["synced"]);
    // Previously hidden Library entries come back: generated work is stable.
    mocks.prefs.hidden.library = ["synced"];
    const library = await render(createElement(LibraryScreen));
    const tiles = library.findAll((node) => String(node.type) === "SwipeRow");
    expect(tiles.map(keys)).toEqual([[["pin"], []], [["pin"], []]]);
    expect(copyText(library).join(" ")).not.toMatch(/hidden/);
    await act(async () => rendered!.unmount());

    mocks.params = { courseKey: "synced" };
    mocks.prefs.hidden.libraryItems = ["reviewer:cit17"];
    const course = await render(createElement(LibraryCourseScreen));
    expect(course.findAll((node) => String(node.type) === "SwipeRow").map(keys)).toEqual([[["pin"], []]]);
    expect(mocks.unsync).not.toHaveBeenCalled();
  });

  it("pins without a modal, surfaces pinned courses first, and keeps hidden ones recoverable", async () => {
    type Action = { key: string; onPress: () => void };
    mocks.data["/api/experience/courses"] = { classificationSource: "canvas", items: [
      generateCourse({ id: "first", name: "First" }),
      generateCourse({ id: "pinned", name: "Pinned one", period: "previous", courseState: 'current', courseStateOverridden: true }),
      generateCourse({ id: "hidden", name: "Hidden one" }),
    ] };
    mocks.prefs.pinned.course = ["pinned"];
    mocks.prefs.hidden.generate = ["hidden"];
    const root = await render(createElement(GenerateScreen));
    const text = copyText(root);
    expect(text.indexOf("Pinned")).toBeLessThan(text.indexOf("Current courses"));
    const cards = root.findAll((node) => String(node.type) === "CourseCard");
    expect(cards.map((node) => node.props.identity.title)).toEqual(["Pinned one", "First"]);
    expect(cards[0]!.props.pinned).toBe(true);
    const show = root.findAll((node) => String(node.type) === "Action").find((node) => node.props.children === "Show 1 hidden")!;
    expect(show).toBeTruthy();

    const firstRow = root.findAll((node) => String(node.type) === "SwipeRow")[1]!;
    await act(async () => (firstRow.props.leading as Action[])[0]!.onPress());
    expect(mocks.pin).toHaveBeenCalledWith("course", "first", true);
    await act(async () => (firstRow.props.trailing as Action[]).find((action) => action.key === "hide")!.onPress());
    expect(mocks.hide).toHaveBeenCalledWith("generate", "first", true);
    await act(async () => (firstRow.props.trailing as Action[]).find((action) => action.key === "unsync")!.onPress());
    expect(mocks.unsync).toHaveBeenCalledWith("first");
    // Hide and Unsync never touch saved work or generation.
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("pins Today items with a swipe right, keeps the real next item, and hides with a swipe left for the day", async () => {
    type Action = { key: string; onPress: () => void };
    const make = (id: string, title: string) => ({ id, kind: "canvas_activity", title, course: { id: "c", code: "CIT17", name: "CIT17" }, startAt: null, endAt: null, dueAt: null, estimatedMinutes: null, priority: "medium", status: "unknown", source: "canvas", deepLinkTarget: { surface: "activity", id } });
    mocks.data[`/api/today?date=${localDate()}&utcOffsetMinutes=${-new Date().getTimezoneOffset()}`] = todayFixture();
    mocks.data[`/api/today?date=${localDate()}&utcOffsetMinutes=${-new Date().getTimezoneOffset()}`] = {
      ...todayFixture(),
      timeline: [], next: make("next", "Next actual item"), later: [make("later", "IT Security reviewer")], upcomingDeadlines: [], plannerState: { needsTaskImport: false },
    } as unknown as TodayOverview;
    mocks.prefs.pinned.today = ["later"];
    const root = await render(createElement(TodayScreen));
    const labels = root.findAll((node) => String(node.type) === "RowLink").map((node) => node.props.label);
    // The pinned item leads Up Next, and the planner's next item still follows.
    expect(labels.indexOf("Pinned: IT Security reviewer")).toBeGreaterThanOrEqual(0);
    expect(labels.indexOf("Pinned: IT Security reviewer")).toBeLessThan(labels.indexOf("Open next item: Next actual item"));
    expect(labels.filter((label) => label.includes("IT Security reviewer"))).toHaveLength(1);
    const rows = root.findAll((node) => String(node.type) === "SwipeRow" && node.props.fullSwipe === true);
    const nextRow = rows.find((row) => row.findAll((node) => String(node.type) === "RowLink")[0]!.props.label === "Open next item: Next actual item")!;
    expect((nextRow.props.leading as Action[]).map((a) => a.key)).toEqual(["pin"]);
    expect((nextRow.props.trailing as Action[]).map((a) => a.key)).toEqual(["hide"]);
    await act(async () => (nextRow.props.leading as Action[])[0]!.onPress());
    expect(mocks.pin).toHaveBeenCalledWith("today", "next", true);
    await act(async () => (nextRow.props.trailing as Action[])[0]!.onPress());
    expect(mocks.hide).toHaveBeenCalledWith("today", `${localDate()}|next`, true);
    // Hiding is local: no Canvas or task request is made.
    expect(mocks.request).not.toHaveBeenCalled();
    expect(copyText(root).join(" ")).toContain("is hidden for today");
  });

  it("never asks the student to add Canvas work to Tasks, and shows plain deadlines", async () => {
    mocks.data[`/api/today?date=${localDate()}&utcOffsetMinutes=${-new Date().getTimezoneOffset()}`] = todayFixture();
    mocks.data[`/api/today?date=${localDate()}&utcOffsetMinutes=${-new Date().getTimezoneOffset()}`] = {
      ...todayFixture(),
      timeline: [],
      next: { id: "canvas:a", kind: "canvas_activity", title: "Midterm Seminar", course: { id: "c", code: "CIT5", name: "CIT5" }, startAt: null, endAt: null, dueAt: new Date(Date.now() + 2 * 86_400_000).toISOString(), estimatedMinutes: null, priority: "medium", status: "unknown", source: "canvas", deepLinkTarget: { surface: "activity", id: "canvas:a" } },
      later: [],
      upcomingDeadlines: [],
      plannerState: { needsTaskImport: true },
    } as unknown as TodayOverview;
    const root = await render(createElement(TodayScreen));
    const text = copyText(root).join(" ");
    expect(text).not.toContain("added to your tasks");
    expect(text).not.toContain("unknown");
    expect(text).not.toContain("\uFFFD");
    // A plain deadline: a time today, or a short date further out.
    expect(text).toMatch(/Due (\d|[A-Z][a-z]{2} \d)/);
    expect(root.findAll((node) => node.props.label === "Add a task" || node.props.children === "New Task")).toHaveLength(0);
  });
});

describe("passive Canvas navigation", () => {
  it("reads Generate, Tasks, and Library without requesting sync, including pull to refresh", async () => {
    for (const Screen of [GenerateScreen, TasksScreen, LibraryScreen]) {
      const root = await render(createElement(Screen));
      const page = root.findAll((node) => String(node.type) === "Page")[0]!;
      await act(async () => page.props.onRefresh());
      expect(mocks.sync).not.toHaveBeenCalled();
      await act(async () => rendered!.unmount());
      rendered = undefined;
    }
  });

  it("does not request sync when Today opens", async () => {
    await render(createElement(TodayScreen));
    expect(mocks.sync).not.toHaveBeenCalled();
  });
});

describe("B38 saved assignment Draft", () => {
  const draft: ActivityDraft = {
    id: "draft-one", activityId: "assignment", courseId: "security", type: "presentation", title: "Firewalls and VPN",
    sections: [], slides: [{ number: 1, title: "Scenario", body: "[Add your assigned scenario]", speakerNotes: null, sourceRefs: ["instructions"] }],
    sources: [{ id: "instructions", title: "Assignment", role: "instructions" }], warnings: [{ code: "missing_source_information", sectionId: "slide-1", message: "Add scenario" }],
    generationId: "job", createdAt: "2026-09-29", updatedAt: "2026-09-29", editable: true, revision: 1, status: "draft",
  };
  const artifact: LibraryArtifactSummary = { ...savedQuiz, id: "activity:draft-one", type: "activity_output", title: draft.title, activityId: "assignment" };

  it("shows the saved Draft editor without a separate Study Activity or worksheet", async () => {
    mocks.params = { id: artifact.id };
    mocks.artifact = { artifact, draft };
    const root = await render(createElement(ArtifactScreen));
    expect(root.findAll(node => String(node.type) === "Page")[0]!.props.title).toBe("Draft");
    expect(root.findAll(node => String(node.type) === "KeyboardAvoidingView")[0]!.props).toMatchObject({ enabled: true, behavior: "height" });
    const copy = root.findAll(node => String(node.type) === "Copy").map(node => String(node.props.children)).join(" ");
    expect(copy).toContain("Saved draft");
    expect(copy).not.toMatch(/Study activity|Questions \/ Tasks|My work|Mark as completed/);
    expect(root.findAll(node => String(node.type) === "TextInput" && node.props.accessibilityLabel === "Slide 1")[0]!.props.value).toBe("[Add your assigned scenario]");
  });

  it("saves edited placeholders into the same Draft and device copy", async () => {
    vi.useFakeTimers();
    mocks.params = { id: artifact.id };
    mocks.artifact = { artifact, draft };
    const root = await render(createElement(ArtifactScreen));
    const slide = root.findAll(node => String(node.type) === "TextInput" && node.props.accessibilityLabel === "Slide 1")[0]!;
    await act(async () => slide.props.onChangeText("My assigned scenario"));
    const edited = { ...draft, revision: 2, status: "edited" as const, slides: [{ ...draft.slides[0]!, body: "My assigned scenario" }] };
    mocks.request.mockResolvedValue(edited);
    await act(async () => root.findAll(node => String(node.type) === "Action" && node.props.children === "Save draft")[0]!.props.onPress());
    expect(mocks.request).toHaveBeenCalledWith(expect.anything(), "/api/experience/activity-drafts/draft-one", { method: "PATCH", body: { revision: 1, content: { title: draft.title, sections: [], slides: edited.slides } } });
    expect(mocks.storeConfirmed).toHaveBeenCalledWith({ artifact: expect.objectContaining({ id: artifact.id }), draft: edited });
    expect(mocks.createIntent).not.toHaveBeenCalled();
  });

  it("lists the assignment output once under Drafts without worksheet completion status", async () => {
    mocks.params = { courseKey: "personal" };
    mocks.library.items = [{ ...artifact, activityStudyStatus: "not_started" }];
    const root = await render(createElement(LibraryCourseScreen));
    const segment = root.findAll(node => String(node.type) === "SegmentedControl")[0]!;
    expect(segment.props.segments.map((value: { label: string }) => value.label)).toEqual(["All", "Reviewers", "Quizzes", "Drafts"]);
    await act(async () => segment.props.onChange("activity_output"));
    const cards = root.findAll(node => String(node.type) === "RowLink");
    expect(cards).toHaveLength(1);
    expect(cards[0]!.props.label).toBe(`Draft: ${draft.title}`);
    expect(root.findAll(node => String(node.type) === "Copy").map(node => String(node.props.children)).join(" ")).not.toContain("Not started");
    await act(async () => cards[0]!.props.onPress());
    expect(mocks.push).toHaveBeenCalledWith({ pathname: "/artifact", params: { id: artifact.id } });
  });

  it("keeps Canvas assignments separate and generates through the existing draft endpoint", async () => {
    mocks.params = { id: "canvas:assignment" };
    mocks.data["/api/experience/activities/canvas%3Aassignment"] = {
      id: "canvas:assignment", title: "Firewalls and VPN", course: null, instructions: "Use the assigned scenario", dueAt: null, resources: [], taskId: null,
      attachments: [],
      outputs: [artifact], generation: { activityAssistance: supported, reviewer: unavailable, quiz: unavailable },
    } satisfies Pick<ActivityDetail, "id" | "title" | "course" | "instructions" | "dueAt" | "resources" | "attachments" | "taskId" | "outputs" | "generation">;
    mocks.createIntent.mockResolvedValue({ key: "draft-request" });
    const root = await render(createElement(ActivityScreen));
    expect(root.findAll(node => String(node.type) === "Page")[0]!.props.title).toBe("Assignment");
    const generate = root.findAll(node => String(node.type) === "Action" && node.props.children === "Generate Draft")[0]!;
    await act(async () => generate.props.onPress());
    expect(mocks.createIntent).toHaveBeenCalledWith("owner", { title: draft.title, type: "activity_output", path: "/api/experience/activities/canvas%3Aassignment/generate", body: { mode: "draft" } });
    expect(mocks.push).toHaveBeenCalledWith({ pathname: "/generation", params: { intent: "draft-request", start: "1" } });
  });
});


describe('O1 calm offline Library', () => {
  it('shows the calm banner and availability marker in the course Library', async () => {
    mocks.params = { courseKey: 'personal' };
    mocks.library.items = [{ ...savedQuiz, course: null, offlineReady: true }];
    mocks.library.offlineStats = { total: 1, current: 1, approximateBytes: 1024 };
    mocks.library.errorCode = 'connection'; mocks.library.error = 'connection';
    const root = await render(createElement(LibraryCourseScreen));
    const copy = root.findAll(node => String(node.type) === 'Copy' || String(node.type) === 'Notice').map(node => node.props.children).join(' ');
    expect(copy).toContain("You're offline. Items marked Saved offline still open.");
    expect(copy).toContain('Saved offline');
    expect(root.findAll(node => String(node.type) === 'RowLink')[0]!.props.label).toContain('Saved offline');
    expect(copy).not.toContain('Try again');
  });
  it('opens a missing offline body with a Back action and no retry loop', async () => {
    mocks.params = { id: 'quiz:missing' }; mocks.offlineMissing = true;
    const root = await render(createElement(ArtifactScreen));
    const back = root.findAll(node => String(node.type) === 'Action' && node.props.children === 'Back');
    expect(back).toHaveLength(1);
    expect(root.findAll(node => String(node.type) === 'Action' && node.props.children === 'Try again')).toHaveLength(0);
    await act(async () => back[0]!.props.onPress());
    expect(mocks.back).toHaveBeenCalledOnce();
    expect(root.findAll(node => String(node.type) === 'Copy').map(node => node.props.children).join(' ')).toContain("This one isn't saved on your device yet.");
  });
});

describe('Library sorting controls', () => {
  it('exposes the visible Sort control and the requested preset menu', async () => {
    mocks.params = { courseKey: 'personal' };
    mocks.library.items = [savedQuiz];
    const root = await render(createElement(LibraryCourseScreen));
    const control = root.findAll(node => String(node.type) === 'Pressable' && node.props.accessibilityLabel === 'Sort Library: My order')[0]!;
    await act(async () => control.props.onPress());
    const options = root.findAll(node => String(node.type) === 'Pressable' && node.props.accessibilityRole === 'radio');
    expect(options.map(node => node.props.accessibilityLabel)).toEqual(['My order', 'Updated: newest first', 'Updated: oldest first', 'Alphabetical: A to Z', 'Alphabetical: Z to A']);
    await act(async () => options.find(node => node.props.accessibilityLabel === 'Alphabetical: A to Z')!.props.onPress());
    expect(mocks.sortLibrary).toHaveBeenCalledWith('personal', 'title_asc');
    expect(root.findAll(node => String(node.type) === 'Sheet')).toHaveLength(0);
  });
  it('applies saved alphabetic sorting before filters and includes course order for Canvas courses', async () => {
    mocks.params = { courseKey: 'course' };
    mocks.library.items = [{ ...savedQuiz, id: 'quiz:z', title: 'Zulu', course: workspace.course }, { ...savedQuiz, id: 'quiz:a', title: 'Alpha', course: workspace.course }];
    mocks.prefs.librarySort.course = 'title_asc';
    const root = await render(createElement(LibraryCourseScreen));
    expect(root.findAll(node => String(node.type) === 'RowLink').map(node => node.props.label)).toEqual(['Quiz: Alpha', 'Quiz: Zulu']);
    await act(async () => root.findAll(node => String(node.type) === 'Pressable' && node.props.accessibilityLabel.startsWith('Sort Library:'))[0]!.props.onPress());
    expect(root.findAll(node => String(node.type) === 'Pressable' && node.props.accessibilityLabel === 'Course order')).toHaveLength(1);
  });
});

describe('course Library bulk actions', () => {
  it('retains the durable course batch controls alongside device Library changes', async () => {
    mocks.params = { courseId: 'course' };
    mocks.data['/api/experience/courses/course'] = workspace;
    const root = await render(createElement(GenerateCourseScreen));
    expect(root.findAll(node => String(node.type) === 'CourseBatchControls')).toHaveLength(1);
  });
  it('marks already generated materials and offers their saved Reviewer', async () => {
    mocks.params = { courseId: 'course', materialId: 'file:one' };
    mocks.data['/api/experience/courses/course'] = { ...workspace, materials: { ...workspace.materials, items: [{ ...workspace.materials.items[0], reviewerArtifactId: 'saved' }] } };
    const root = await render(createElement(GenerateMaterialScreen));
    expect(root.findAll(node => String(node.type) === 'Action' && node.props.children === 'Remake Reviewer')).toHaveLength(1);
    const open = root.findAll(node => String(node.type) === 'Action' && node.props.children === 'Open saved Reviewer')[0]!;
    await act(async () => open.props.onPress());
    expect(mocks.push).toHaveBeenCalledWith({ pathname: '/artifact', params: { id: 'artifact:saved' } });
  });
  it('removes a draft only after confirmation and server success', async () => {
    mocks.params = { courseKey: 'personal' };
    mocks.library.items = [{ ...savedQuiz, id: 'activity:draft', type: 'activity_output', quiz: undefined }];
    const root = await render(createElement(LibraryCourseScreen));
    const row = root.findAll(node => String(node.type) === 'SwipeRow')[0]!;
    await act(async () => row.props.trailing[0].onPress());
    expect(mocks.request).not.toHaveBeenCalled();
    await act(async () => mocks.alert.mock.calls.at(-1)![2][1].onPress());
    expect(mocks.request).toHaveBeenCalledWith(expect.anything(), '/api/experience/activity-drafts/draft', { method: 'DELETE' });
    expect(mocks.removeLocal).toHaveBeenCalledWith('owner', 'activity:draft');
    expect(root.findAll(node => String(node.type) === 'SwipeRow')).toHaveLength(0);
  });
  it('keeps failed items visible while removing successful items from the whole course', async () => {
    mocks.params = { courseKey: 'personal' };
    mocks.library.items = [
      { ...savedQuiz, id: 'activity:failed', type: 'activity_output', quiz: undefined },
      { ...savedQuiz, id: 'activity:removed', type: 'activity_output', quiz: undefined },
    ];
    mocks.request.mockRejectedValueOnce(new Error('connection')).mockResolvedValueOnce({ deleted: true });
    const root = await render(createElement(LibraryCourseScreen));
    const first = root.findAll(node => String(node.type) === 'RowLink')[0]!;
    const list = root.findAll(node => String(node.type) === 'View' && node.props.onTouchEnd)[0]!;
    await act(async () => first.props.onLongPress());
    await act(async () => list.props.onTouchEnd());
    await act(async () => root.findAll(node => String(node.type) === 'Pressable' && node.props.accessibilityLabel === 'Select all')[0]!.props.onPress());
    await act(async () => root.findAll(node => String(node.type) === 'Pressable' && node.props.accessibilityLabel === 'Remove all')[0]!.props.onPress());
    await act(async () => mocks.alert.mock.calls.at(-1)![2][1].onPress());
    expect(mocks.removeLocal).toHaveBeenCalledExactlyOnceWith('owner', 'activity:removed');
    expect(root.findAll(node => String(node.type) === 'SwipeRow')).toHaveLength(1);
    expect(root.findAll(node => String(node.type) === 'Notice').map(node => node.props.children).join(' ')).toContain('1 could not be removed');
  });
});

describe('organizing saved items inside a course', () => {
  function setup() {
    mocks.params = { courseKey: 'personal' };
    mocks.library.items = ['a', 'b', 'c'].map(id => ({ ...savedQuiz, id: `quiz:${id}`, title: id }));
  }
  const cards = (root: ReactTestRenderer['root']) => root.findAll(node => String(node.type) === 'RowLink');
  const list = (root: ReactTestRenderer['root']) => root.findAll(node => String(node.type) === 'View' && node.props.onPanResponderMove)[0]!;
  const button = (root: ReactTestRenderer['root'], label: string) => root.findAll(node => String(node.type) === 'Pressable' && node.props.accessibilityLabel === label)[0]!;
  const touch = (y: number) => ({ nativeEvent: { pageY: y } });
  it('keeps bulk actions hidden until a hold, then shows four equal icon targets without a footer', async () => {
    setup();
    const root = await render(createElement(LibraryCourseScreen));
    const actions = () => root.findAll(node => String(node.type) === 'View' && node.props.accessibilityRole === 'toolbar')
      .flatMap(toolbar => toolbar.findAll(node => String(node.type) === 'Pressable' && node.props.accessibilityRole === 'button'));
    expect(actions()).toHaveLength(0);
    expect(copyText(root).join(' ')).not.toMatch(/Remake all|Remove all|Move to top|Move to bottom|Organize|Done/);
    await act(async () => { list(root).props.onTouchStart(touch(60)); cards(root)[0].props.onLongPress(); });
    await act(async () => list(root).props.onTouchEnd());
    expect(actions().map(node => node.props.accessibilityLabel)).toEqual(['Remake selected reviewers', 'Remove selected', 'Select all', 'Cancel selection']);
    expect(actions().map(node => node.props.style({ pressed: false }))).toEqual(Array(4).fill(expect.objectContaining({ flex: 1, height: 48, minWidth: 48 })));
    expect(root.findByType('Page' as never).props.footer).toBeUndefined();
    expect(root.findAll(node => String(node.type) === 'Pressable' && node.props.accessibilityLabel.startsWith('Sort Library:'))[0]!.props.disabled).toBe(true);
    expect(root.findAll(node => String(node.type) === 'SegmentedControl')).toHaveLength(0);
    await act(async () => button(root, 'Cancel selection').props.onPress());
    expect(actions()).toHaveLength(0);
    expect(root.findAll(node => String(node.type) === 'SegmentedControl')).toHaveLength(1);
  });
  it('selects all saved items including those beyond the first page, then switches to unselect all', async () => {
    setup();
    mocks.library.items = Array.from({ length: 60 }, (_, i) => ({ ...savedQuiz, id: `quiz:${i}` }));
    const root = await render(createElement(LibraryCourseScreen));
    expect(cards(root)).toHaveLength(50);
    await act(async () => { list(root).props.onTouchStart(touch(60)); cards(root)[0].props.onLongPress(); });
    await act(async () => list(root).props.onTouchEnd());
    await act(async () => button(root, 'Select all').props.onPress());
    expect(root.findByType('Page' as never).props.subtitle).toBe('60 selected');
    await act(async () => button(root, 'Unselect all').props.onPress());
    expect(root.findByType('Page' as never).props.subtitle).toBe('0 selected');
    expect(button(root, 'Remove selected').props.disabled).toBe(true);
    expect(button(root, 'Select all').props.disabled).toBe(false);
  });
  it('limits select all to the current category and leaves other saved work untouched', async () => {
    setup();
    mocks.library.items[0] = { ...savedQuiz, id: 'artifact:one', type: 'reviewer' };
    mocks.library.items[1] = { ...savedQuiz, id: 'artifact:two', type: 'reviewer' };
    const root = await render(createElement(LibraryCourseScreen));
    await act(async () => root.findAll(node => String(node.type) === 'SegmentedControl')[0]!.props.onChange('reviewer'));
    await act(async () => { list(root).props.onTouchStart(touch(60)); cards(root)[0].props.onLongPress(); });
    await act(async () => list(root).props.onTouchEnd());
    await act(async () => button(root, 'Select all').props.onPress());
    expect(root.findByType('Page' as never).props.subtitle).toBe('2 selected');
    await act(async () => button(root, 'Remove selected').props.onPress());
    expect(mocks.alert).toHaveBeenCalledWith('Remove saved work?', expect.stringContaining('2 selected items'), expect.any(Array));
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('confirms remake for selected sources and includes all sources only after select all', async () => {
    setup();
    mocks.library.items[0] = { ...savedQuiz, id: 'artifact:one', type: 'reviewer', sourceMaterialId: 'file:one' };
    mocks.library.items[1] = { ...savedQuiz, id: 'artifact:two', type: 'reviewer', sourceMaterialId: 'file:two' };
    const root = await render(createElement(LibraryCourseScreen));
    await act(async () => { list(root).props.onTouchStart(touch(60)); cards(root)[0].props.onLongPress(); });
    await act(async () => list(root).props.onTouchEnd());
    await act(async () => button(root, 'Remake selected reviewers').props.onPress());
    expect(mocks.alert).toHaveBeenLastCalledWith('Remake selected Reviewers?', expect.stringContaining('1 selected Reviewer source?'), expect.any(Array));
    await act(async () => button(root, 'Select all').props.onPress());
    await act(async () => button(root, 'Remake all reviewers').props.onPress());
    expect(mocks.alert).toHaveBeenLastCalledWith('Remake all Reviewers?', expect.stringContaining('2 selected Reviewer sources'), expect.any(Array));
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('holds to select, taps to multi-select, and X restores ordinary opening', async () => {
    setup();
    const root = await render(createElement(LibraryCourseScreen));
    await act(async () => { list(root).props.onTouchStart(touch(60)); cards(root)[0].props.onLongPress(); });
    expect(root.findByType('Page' as never).props.scrollEnabled).toBe(false);
    await act(async () => list(root).props.onTouchEnd());
    expect(root.findByType('Page' as never).props.subtitle).toBe('1 selected');
    await act(async () => { list(root).props.onTouchStart(touch(200)); cards(root)[1].props.onPress(); });
    expect(root.findByType('Page' as never).props.subtitle).toBe('2 selected');
    expect(mocks.push).not.toHaveBeenCalled();
    await act(async () => { list(root).props.onTouchStart(touch(200)); cards(root)[1].props.onPress(); });
    expect(root.findByType('Page' as never).props.subtitle).toBe('1 selected');
    await act(async () => button(root, 'Cancel selection').props.onPress());
    await act(async () => cards(root)[1].props.onPress());
    expect(mocks.push).toHaveBeenCalledWith({ pathname: '/artifact', params: { id: 'quiz:b' } });
  });
  it('drags only after a hold and saves the order on release', async () => {
    setup();
    const root = await render(createElement(LibraryCourseScreen));
    expect(list(root).props.onMoveShouldSetPanResponderCapture()).toBe(false);
    root.findAll(node => String(node.type) === 'AnimatedView' && node.props.onLayout).forEach((row, index) => row.props.onLayout({ nativeEvent: { layout: { x: 0, y: index * 134, width: 300, height: 120 } } }));
    await act(async () => { list(root).props.onTouchStart(touch(60)); cards(root)[0].props.onLongPress(); });
    expect(list(root).props.onMoveShouldSetPanResponderCapture()).toBe(true);
    await act(async () => list(root).props.onPanResponderMove(touch(220)));
    expect(mocks.reorderLibrary).not.toHaveBeenCalled();
    await act(async () => list(root).props.onPanResponderRelease());
    expect(mocks.reorderLibrary).toHaveBeenCalledExactlyOnceWith('personal', ['quiz:b', 'quiz:a', 'quiz:c']);
    expect(root.findByType('Page' as never).props.scrollEnabled).toBe(true);
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('cancels interrupted dragging without changing the saved order', async () => {
    setup();
    const root = await render(createElement(LibraryCourseScreen));
    await act(async () => { list(root).props.onTouchStart(touch(60)); cards(root)[0].props.onLongPress(); });
    await act(async () => list(root).props.onPanResponderTerminate());
    expect(mocks.reorderLibrary).not.toHaveBeenCalled();
    expect(root.findByType('Page' as never).props.scrollEnabled).toBe(true);
  });
  it('scrolls near the viewport edge during dragging and stops on release', async () => {
    vi.useFakeTimers();
    setup();
    const root = await render(createElement(LibraryCourseScreen));
    const scrollTo = vi.fn();
    root.findByType('Page' as never).props.scrollRef.current = {
      getNativeScrollRef: () => ({ measureInWindow: (callback: (x: number, y: number, w: number, h: number) => void) => callback(0, 100, 300, 500) }),
      scrollTo,
    };
    await act(async () => { list(root).props.onTouchStart(touch(200)); cards(root)[0].props.onLongPress(); });
    await act(async () => list(root).props.onPanResponderMove(touch(580)));
    await act(async () => { vi.advanceTimersByTime(32); });
    expect(scrollTo).toHaveBeenCalledWith({ y: 12, animated: false });
    await act(async () => list(root).props.onPanResponderRelease());
    scrollTo.mockClear();
    await act(async () => { vi.advanceTimersByTime(64); });
    expect(scrollTo).not.toHaveBeenCalled();
  });
  it('uses stored order and drags the tapped selection together', async () => {
    setup();
    mocks.prefs.libraryOrder.personal = ['quiz:c', 'quiz:b', 'quiz:a'];
    const root = await render(createElement(LibraryCourseScreen));
    expect(cards(root).map(card => card.props.label)).toEqual(['Quiz: c', 'Quiz: b', 'Quiz: a']);
    root.findAll(node => String(node.type) === 'AnimatedView' && node.props.onLayout).forEach((row, index) => row.props.onLayout({ nativeEvent: { layout: { x: 0, y: index * 134, width: 300, height: 120 } } }));
    await act(async () => { list(root).props.onTouchStart(touch(200)); cards(root)[1].props.onLongPress(); });
    await act(async () => list(root).props.onTouchEnd());
    await act(async () => { list(root).props.onTouchStart(touch(340)); cards(root)[2].props.onPress(); });
    await act(async () => { list(root).props.onTouchStart(touch(200)); cards(root)[1].props.onLongPress(); });
    await act(async () => list(root).props.onPanResponderMove(touch(50)));
    await act(async () => list(root).props.onPanResponderRelease());
    expect(mocks.reorderLibrary).toHaveBeenCalledWith('personal', ['quiz:b', 'quiz:a', 'quiz:c']);
  });
  it('confirms removal of the whole selected set without deleting on tap', async () => {
    setup();
    const root = await render(createElement(LibraryCourseScreen));
    await act(async () => { list(root).props.onTouchStart(touch(60)); cards(root)[0].props.onLongPress(); });
    await act(async () => list(root).props.onTouchEnd());
    await act(async () => { list(root).props.onTouchStart(touch(200)); cards(root)[1].props.onPress(); });
    await act(async () => button(root, 'Remove selected').props.onPress());
    expect(mocks.alert).toHaveBeenCalledWith('Remove saved work?', expect.stringContaining('2 selected items'), expect.any(Array));
    expect(mocks.request).not.toHaveBeenCalled();
  });
});
