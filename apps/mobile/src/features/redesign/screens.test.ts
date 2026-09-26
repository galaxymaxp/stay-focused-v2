import { createElement, type ReactElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CourseLearningWorkspace,
  CourseSummary,
  GenerateCourseSummary,
  LibraryArtifactSummary,
  LibraryOverview,
  TodayOverview,
} from "@stay-focused/shared";
import { GenerateCourseScreen, GenerateMaterialScreen, GenerateScreen } from "./GenerateScreen";
import { LibraryCourseScreen, LibraryScreen } from "./LibraryScreen";
import { TasksCourseScreen, TasksScreen } from "./TasksScreen";
import { TodayScreen } from "./TodayScreen";
import { DayRingClock } from "./DayRingClock";
import { localDate } from "./presentation";
import { AnnouncementDetailScreen, AnnouncementsScreen } from "../announcements/AnnouncementsScreen";

const mocks = vi.hoisted(() => ({
  data: {} as Record<string, unknown>,
  errors: {} as Record<string, { message: string; code: string }>,
  paths: [] as string[],
  library: {
    items: [] as LibraryArtifactSummary[],
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
  createIntent: vi.fn(),
  vibration: vi.fn(),
  prefs: { pinned: { course: [] as string[], artifact: [] as string[], today: [] as string[], announcement: [] as string[] }, hidden: { generate: [] as string[], library: [] as string[], libraryItems: [] as string[], today: [] as string[], announcements: [] as string[] } },
  pin: vi.fn(),
  hide: vi.fn(),
  unsync: vi.fn(async () => true),
  selectedCourseIds: new Set<string>(),
}));
vi.mock("expo-router", () => ({
  router: { push: mocks.push, navigate: mocks.navigate, back: mocks.back, replace: mocks.replace, canGoBack: () => true },
  useLocalSearchParams: () => mocks.params,
}));
vi.mock("@react-navigation/native", () => ({
  useIsFocused: () => true,
  useNavigation: () => ({ dispatch: vi.fn() }),
  usePreventRemove: vi.fn(),
}));
vi.mock("../../auth", () => ({
  useAuth: () => ({ session: { user: { id: "owner" }, accessToken: "token" } }),
}));
vi.mock("../../design/theme", async () => {
  const tokens = await import("../../design/themeTokens");
  return {
    ...tokens,
    useTheme: () => ({
      colors: tokens.palettes.light,
      reducedMotion: true,
      active: true,
    }),
  };
});
vi.mock("../../design/primitives", () => ({
  Sheet: "Sheet",
  RowLink: "RowLink",
  Page: "Page",
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
  useCanvasSync: () => ({ snapshot: { phase: "idle", total: 0, finished: 0, lastSyncedAt: null }, dataVersion: 0, sync: mocks.sync, unsyncCourse: mocks.unsync, selectedCourseIds: mocks.selectedCourseIds, courseStates: {} }),
}));
vi.mock("./useListPreferences", () => ({
  useListPreferences: () => ({ prefs: mocks.prefs, pin: mocks.pin, hide: mocks.hide }),
}));
vi.mock("../../design/SwipeRow", () => ({
  SwipeRow: "SwipeRow",
  animateNextLayout: vi.fn(),
  swipeAccessibility: (actions: { key: string; label: string }[]) => ({ accessibilityActions: actions.map((action) => ({ name: action.key, label: action.label })) }),
}));
vi.mock("../sync/SyncStatus", () => ({ SyncStatus: "SyncStatus" }));
vi.mock("../reviewer/ReviewerReader", () => ({ ReviewerReaderScreen: "ReviewerReaderScreen" }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView", useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }) }));
vi.mock("./DayOrb", () => ({ DayOrb: "DayOrb", DAY_ORB_FILL: 0.642 }));
vi.mock("react-native", () => ({
  View: "View",
  ScrollView: "ScrollView",
  Pressable: "Pressable",
  TextInput: "TextInput",
  StatusBar: "StatusBar",
  Linking: { openURL: mocks.openURL },
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
    parallel: () => ({ start() {} }),
    multiply: (a: unknown, b: unknown) => ({ a, b }),
    event: () => vi.fn(),
  },
}));
vi.mock("react-native-svg", () => ({
  default: "Svg",
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
  Pin: "Pin",
  PinOff: "PinOff",
  CloudOff: "CloudOff",
  X: "X",
}));
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
      refresh: vi.fn(),
    };
  },
}));
vi.mock("./useLocalLibrary", () => ({
  useLocalLibrary: () => ({ ...mocks.library, refresh: vi.fn() }),
  useLocalArtifact: () => ({ data: null, loading: false, error: null, deviceCopy: false, refresh: vi.fn(), storeConfirmed: vi.fn() }),
}));
vi.mock("../../services/experienceApi", () => ({
  experienceRequest: mocks.request,
}));
vi.mock("../../services/generationRecovery", () => ({
  createGenerationIntent: mocks.createIntent,
}));

let rendered: ReactTestRenderer | undefined;
beforeEach(() => {
  mocks.data = {};
  mocks.errors = {};
  mocks.paths = [];
  mocks.params = {};
  mocks.library = { items: [], categories: null, localReady: true, refreshing: false, error: null };
  mocks.prefs = { pinned: { course: [], artifact: [], today: [], announcement: [] }, hidden: { generate: [], library: [], libraryItems: [], today: [], announcements: [] } };
  mocks.selectedCourseIds = new Set();
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
const ringTouch = (root: ReactTestRenderer["root"]) => root.findAll((node) => node.props.testID === "day-ring-touch")[0]!;
/** A touch at a design point on the 340-point clock (scale 1 at this window width). */
const touchAt = (x: number, y: number) => ({ nativeEvent: { locationX: x, locationY: y } });
/** Where the ring passes a minute of the day, optionally off the visible track. */
const ringAt = (minutes: number, offset = 0) => {
  const angle = (minutes / 1440) * Math.PI * 2 - Math.PI / 2;
  return { x: 170 + (136 + offset) * Math.cos(angle), y: 170 + (136 + offset) * Math.sin(angle) };
};
describe("B25 screen interactions", () => {
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
    const row = list.findAll(node => String(node.type) === "RowLink").find(node => node.props.label === "Read announcement: Schedule updated")!;
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

  it("offers announcement pin, hide and Canvas as gestures, long press and accessible actions", async () => {
    mocks.data["/api/experience/announcements?limit=100"] = {
      items: [
        { id: "a1", course: { id: "c", code: "CIT17", name: "CIT17" }, title: "First", body: null, preview: null, postedAt: null, authorName: null, htmlUrl: "https://canvas.example/a1", attachments: [], links: [] },
        { id: "a2", course: { id: "c", code: "CIT17", name: "CIT17" }, title: "Second", body: null, preview: null, postedAt: null, authorName: null, htmlUrl: null, attachments: [], links: [] },
      ],
      nextOffset: null,
    };
    mocks.prefs.pinned.announcement = ["a2"];
    mocks.prefs.hidden.announcements = [];
    const root = await render(createElement(AnnouncementsScreen));
    const titles = root.findAll(node => String(node.type) === "RowLink").map(node => node.props.label);
    // Pinned first.
    expect(titles[0]).toBe("Read announcement: Second, pinned");
    type Action = { key: string; onPress: () => void };
    const rows = root.findAll(node => String(node.type) === "SwipeRow");
    const first = rows.find(row => row.findAll(node => String(node.type) === "RowLink")[0]!.props.label === "Read announcement: First")!;
    // Swipe right pins, swipe left hides.
    expect((first.props.leading as Action[]).map(a => a.key)).toEqual(["pin"]);
    expect((first.props.trailing as Action[]).map(a => a.key)).toEqual(["hide"]);
    await act(async () => (first.props.leading as Action[])[0]!.onPress());
    expect(mocks.pin).toHaveBeenCalledWith("announcement", "a1", true);
    await act(async () => (first.props.trailing as Action[])[0]!.onPress());
    expect(mocks.hide).toHaveBeenCalledWith("announcements", "a1", true);
    // Long press opens every option, including Open in Canvas.
    const firstRow = root.findAll(node => String(node.type) === "RowLink").find(node => node.props.label === "Read announcement: First")!;
    expect(firstRow.props.accessibilityActions.map((a: { name: string }) => a.name)).toEqual(["pin", "hide", "canvas"]);
    await act(async () => firstRow.props.onLongPress());
    expect(mocks.vibration).toHaveBeenCalled();
    const sheet = root.findAll(node => String(node.type) === "Sheet")[0]!;
    const options = sheet.findAll(node => String(node.type) === "RowLink").map(node => node.props.label);
    expect(options).toEqual(["Read announcement", "Open in Canvas", "Pin to top", "Hide"]);
    await act(async () => sheet.findAll(node => node.props.label === "Open in Canvas")[0]!.props.onPress());
    expect(mocks.openURL).toHaveBeenCalledWith("https://canvas.example/a1");
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("keeps local intake on the Generate page; Canvas sync lives in the profile", async () => {
    const root = await render(createElement(GenerateScreen));
    const page = root.findAll(node => String(node.type) === "Page")[0]!;
    expect(page.props.actions.map((item: { label: string }) => item.label)).toEqual(["Use text, camera or a local file"]);
    await act(async () => page.props.actions[0].onPress());
    expect(mocks.push).toHaveBeenLastCalledWith("/generate");
  });

  it("filters Generate courses while typing by code or name, and clearing restores the list", async () => {
    mocks.data["/api/experience/courses"] = { classificationSource: "canvas", items: [
      generateCourse({ id: "cit17", name: "CIT17 | Web Information Systems", code: "CIT17" }),
      generateCourse({ id: "cc11", name: "Communication in the Workplace", code: "CC11" }),
    ] };
    const root = await render(createElement(GenerateScreen));
    const titles = () => root.findAll((node) => String(node.type) === "CourseCard").map((node) => node.props.identity.title);
    const search = () => root.findAll((node) => String(node.type) === "Page")[0]!.props.headerBelow.props.children;
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
  it("groups current before previous courses and routes only synced courses to materials", async () => {
    mocks.data["/api/experience/courses"] = { classificationSource: "canvas", items: [
      generateCourse({ id: "current", name: "Current synced" }),
      generateCourse({ id: "unsynced", name: "Current unsynced", syncState: "not_synced" }),
      generateCourse({ id: "retry", name: "Previous failed", period: "previous", syncState: "sync_incomplete" }),
      generateCourse({ id: "course", name: "Previous synced", period: "previous" }),
    ] };
    const root = await render(createElement(GenerateScreen));
    const text = root.findAll((node) => String(node.type) === "Copy").map((node) => String(node.props.children));
    expect(text.indexOf("Current courses")).toBeLessThan(text.indexOf("Previous courses"));
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
  it("selects real material, disables unavailable Quiz and persists Reviewer intent before navigation", async () => {
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
    expect(mocks.push).toHaveBeenCalledWith({
      pathname: "/generation",
      params: { intent: "saved-key" },
    });
  });
  it("creates Quiz only from the persisted Reviewer linked to a material", async () => {
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
  });
  it("pauses scrolling and pull-to-refresh while the ring is held", async () => {
    vi.useFakeTimers();
    mocks.data["/api/experience/capabilities"] = workspace.capabilities;
    const root = await render(createElement(TodayScreen));
    const page = () => root.findAll((node) => String(node.type) === "Page")[0]!;
    expect(page().props.refreshEnabled).toBe(true);
    const overlay = ringTouch(root);
    const clock = root.findByType(DayRingClock).props;
    const end = ringAt(clock.end as number);
    await act(async () => {
      overlay.props.onPanResponderGrant(touchAt(end.x, end.y));
      vi.advanceTimersByTime(200);
    });
    expect(page().props.refreshEnabled).toBe(false);
    expect(page().props.scrollEnabled).toBe(false);
    await act(async () => overlay.props.onPanResponderRelease());
    expect(page().props.refreshEnabled).toBe(true);
    expect(page().props.scrollEnabled).toBe(true);
  });
  it("sends a planner preview when the ring is committed, never applying silently", async () => {
    mocks.data["/api/experience/capabilities"] = workspace.capabilities;
    mocks.data[
      `/api/today?date=${localDate()}&utcOffsetMinutes=${-new Date().getTimezoneOffset()}`
    ] = {
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
    expect(mocks.vibration).toHaveBeenCalledWith(6);
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
    expect(generateRows.map(keys)).toEqual([[["pin"], ["hide", "unsync"]], [["pin"], ["hide"]]]);
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
      generateCourse({ id: "pinned", name: "Pinned one", period: "previous" }),
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
    mocks.data["/api/experience/capabilities"] = workspace.capabilities;
    mocks.data[`/api/today?date=${localDate()}&utcOffsetMinutes=${-new Date().getTimezoneOffset()}`] = {
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
    expect(mocks.vibration).toHaveBeenCalledWith(8);
    await act(async () => (nextRow.props.trailing as Action[])[0]!.onPress());
    expect(mocks.hide).toHaveBeenCalledWith("today", `${localDate()}|next`, true);
    // Hiding is local: no Canvas or task request is made.
    expect(mocks.request).not.toHaveBeenCalled();
    expect(copyText(root).join(" ")).toContain("is hidden for today");
  });

  it("never asks the student to add Canvas work to Tasks, and shows plain deadlines", async () => {
    mocks.data["/api/experience/capabilities"] = workspace.capabilities;
    mocks.data[`/api/today?date=${localDate()}&utcOffsetMinutes=${-new Date().getTimezoneOffset()}`] = {
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
