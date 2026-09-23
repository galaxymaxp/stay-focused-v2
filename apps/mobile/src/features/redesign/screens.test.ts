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
import { GenerateScreen } from "./GenerateScreen";
import { LibraryScreen } from "./LibraryScreen";
import { TasksScreen } from "./TasksScreen";
import { TodayScreen } from "./TodayScreen";
import { DayRingClock } from "./DayRingClock";
import { localDate } from "./presentation";
import { AnnouncementsScreen } from "../announcements/AnnouncementsScreen";

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
  request: vi.fn(),
  createIntent: vi.fn(),
  vibration: vi.fn(),
}));
vi.mock("expo-router", () => ({
  router: { push: mocks.push, navigate: mocks.navigate },
  useLocalSearchParams: () => ({}),
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
}));
vi.mock("react-native", () => ({
  View: "View",
  ScrollView: "ScrollView",
  Pressable: "Pressable",
  TextInput: "TextInput",
  Linking: { openURL: vi.fn() },
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
    spring: () => ({ start() {} }),
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
  mocks.library = { items: [], categories: null, localReady: true, refreshing: false, error: null };
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
function libraryCards(root: ReactTestRenderer["root"]) {
  return root.findAll((node) => String(node.type) === "RowLink").map((node) => node.props.label as string);
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
    const root = await render(createElement(AnnouncementsScreen));
    const row = root.findAll(node => String(node.type) === "RowLink").find(node => node.props.label === "Read announcement: Schedule updated")!;
    await act(async () => row.props.onPress());
    const renderedText = root.findAll(node => String(node.type) === "Copy").map(node => String(node.props.children)).join(" ");
    expect(renderedText).toContain("Monday class moves online.");
    expect(renderedText).toContain("Posted date unavailable");
    expect(renderedText).not.toMatch(/<p>|<li>/);
  });

  it("keeps Canvas and local intake actions reachable from Generate options", async () => {
    const root = await render(createElement(GenerateScreen));
    const page = root.findAll(node => String(node.type) === "Page")[0]!;
    await act(async () => page.props.actions.find((item: { label: string }) => item.label === "Canvas connection & sync").onPress());
    expect(mocks.push).toHaveBeenLastCalledWith("/canvas-settings");
    await act(async () => page.props.actions.find((item: { label: string }) => item.label === "Use text, camera or a local file").onPress());
    expect(mocks.push).toHaveBeenLastCalledWith("/generate");
  });
  it("opens the existing completion editor only for a linked task", async () => {
    mocks.data[`/api/experience/activities?utcOffsetMinutes=${-new Date().getTimezoneOffset()}`] = { items: [
      { id: "linked", taskId: "task-1", title: "Linked", urgency: "next", status: "pending", dueAt: null, course: null },
      { id: "unlinked", taskId: null, title: "Canvas only", urgency: "next", status: "unknown", dueAt: null, course: null },
    ] };
    const root = await render(createElement(TasksScreen));
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
    const handle = root.findAll(node => String(node.type) === "AnimatedView").find(node => node.props.accessibilityLabel === "Availability end")!;
    await act(async () => {
      handle.props.onPanResponderGrant();
      vi.advanceTimersByTime(300);
      // Noon is at the top; a quarter-circle clockwise is 6 PM at the right.
      handle.props.onPanResponderMove(null, { dx: 126, dy: 126 });
      handle.props.onPanResponderRelease();
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
    const rows = root.findAll((node) => String(node.type) === "RowLink");
    expect(rows.map((node) => node.props.label)).toEqual([
      "Open Current synced, Synced", "Sync Current unsynced, Not synced · Tap to sync", "Sync Previous failed, Sync incomplete · Tap to retry", "Open Previous synced, Synced",
    ]);
    for (const [index, id] of [[1, "unsynced"], [2, "retry"]] as const) {
      await act(async () => rows[index]!.props.onPress());
      expect(mocks.push).toHaveBeenLastCalledWith({ pathname: "/canvas-settings", params: { courseId: id } });
    }
    expect(mocks.paths.some((path) => path.startsWith("/api/experience/courses/"))).toBe(false);
    await act(async () => rows[3]!.props.onPress());
    expect(mocks.paths).toContain("/api/experience/courses/course");
  });
  it("distinguishes a synced empty course, a sync-state denial, and a real loading failure", async () => {
    mocks.data["/api/experience/courses"] = { classificationSource: "canvas", items: [generateCourse({ id: "course" })] };
    mocks.data["/api/experience/courses/course"] = { ...workspace, materials: { items: [], nextOffset: null, totalKnown: 0 } };
    const copy = (root: ReactTestRenderer["root"]) => root.findAll((node) => String(node.type) === "Copy").map((node) => String(node.props.children));
    const open = async (root: ReactTestRenderer["root"]) => act(async () => root.findAll((node) => String(node.type) === "RowLink")[0]!.props.onPress());
    let root = await render(createElement(GenerateScreen));
    await open(root);
    expect(copy(root)).toContain("No study materials found");
    expect(copy(root)).not.toContain("Materials could not be loaded");

    mocks.errors["/api/experience/courses/course"] = { code: "course_not_synced", message: "This course is not synced with Stay Focused yet." };
    await act(async () => rendered!.unmount()); root = await render(createElement(GenerateScreen));
    await open(root);
    expect(copy(root)).toContain("This course is not synced");
    expect(copy(root)).not.toContain("Materials could not be loaded");

    mocks.errors["/api/experience/courses/course"] = { code: "unavailable", message: "The server could not load this content." };
    await act(async () => rendered!.unmount()); root = await render(createElement(GenerateScreen));
    await open(root);
    expect(copy(root)).toContain("Materials could not be loaded");
    expect(root.findAll((node) => String(node.type) === "Action").some((node) => node.props.children === "Try again")).toBe(true);
  });
  it("selects real material, disables unavailable Quiz and persists Reviewer intent before navigation", async () => {
    mocks.data["/api/experience/courses"] = { classificationSource: "canvas", items: [generateCourse(workspace.course)] };
    mocks.data["/api/experience/courses/course"] = workspace;
    mocks.createIntent.mockResolvedValue({ key: "saved-key" });
    const root = await render(createElement(GenerateScreen));
    const course = root
      .findAll((node) => String(node.type) === "RowLink")
      .find((node) => node.props.label.startsWith("Open Course"))!;
    await act(async () => course.props.onPress());
    const row = root
      .findAll((node) => String(node.type) === "Pressable")
      .find((node) => node.props.accessibilityState?.selected === false)!;
    await act(async () => row.props.onPress());
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
    const root = await render(createElement(GenerateScreen));
    await act(async () => root.findAll((node) => String(node.type) === "RowLink").find((node) => node.props.label.startsWith("Open Course"))!.props.onPress());
    await act(async () => root.findAll((node) => String(node.type) === "Pressable").find((node) => node.props.accessibilityState?.selected === false)!.props.onPress());
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
    const root = await render(createElement(LibraryScreen));
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
    expect(libraryCards(root)).toContain("Quiz: Saved quiz");
    expect(copyText(root)).toContain("Checking for updates…");
  });
  it("shows device-saved work with a quiet notice when the cloud is unreachable", async () => {
    mocks.library.items = [savedQuiz];
    mocks.library.error = "Could not connect.";
    const root = await render(createElement(LibraryScreen));
    expect(libraryCards(root)).toContain("Quiz: Saved quiz");
    expect(copyText(root)).not.toContain("Library could not be loaded");
    expect(root.findAll((node) => String(node.type) === "Notice").map((node) => node.props.children)).toContain(
      "Showing work saved on this device. Refresh when you are back online.",
    );
  });
  it("shows the structural loading state only when nothing is saved on the device yet", async () => {
    mocks.library.refreshing = true;
    const root = await render(createElement(LibraryScreen));
    // One skeleton per horizontal page: All, Reviewers, Quizzes, Activity Outputs.
    expect(root.findAll((node) => node.props.accessibilityLabel === "Loading Library" && String(node.type) === "View")).toHaveLength(4);
  });
  it("keeps the B34 error surface when there is no saved work and the cloud fails", async () => {
    mocks.library.error = "Could not connect.";
    const root = await render(createElement(LibraryScreen));
    expect(copyText(root)).toContain("Library could not be loaded");
  });
  it("uses server urgency groups and preserves server order", async () => {
    mocks.data[
      `/api/experience/activities?utcOffsetMinutes=${-new Date().getTimezoneOffset()}`
    ] = {
      items: [
        {
          id: "a",
          title: "First",
          urgency: "next",
          status: "pending",
          course: null,
          dueAt: null,
        },
        {
          id: "b",
          title: "Second",
          urgency: "next",
          status: "pending",
          course: null,
          dueAt: null,
        },
      ],
    };
    const root = await render(createElement(TasksScreen));
    const titles = root
      .findAll((node) => String(node.type) === "Copy")
      .map((node) => node.props.children);
    expect(titles.indexOf("First")).toBeLessThan(titles.indexOf("Second"));
    expect(titles.indexOf("Next")).toBeLessThan(titles.indexOf("First"));
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
  it("requires hold before dragging, haptics on hold, and exposes accessible adjustments", async () => {
    vi.useFakeTimers();
    const onChange = vi.fn(),
      onCommit = vi.fn();
    const root = await render(
      createElement(DayRingClock, {
        date: "2026-09-13",
        timeline: [],
        start: 600,
        end: 720,
        onChange,
        onCommit,
      }),
    );
    const handle = root
      .findAll((node) => String(node.type) === "AnimatedView")
      .find((node) => node.props.accessibilityLabel === "Availability end")!;
    await act(async () => {
      handle.props.onPanResponderGrant();
      handle.props.onPanResponderMove(null, { dx: 20, dy: 0 });
    });
    expect(onChange).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(300);
      handle.props.onPanResponderMove(null, { dx: 20, dy: 0 });
      handle.props.onPanResponderRelease();
    });
    expect(mocks.vibration).toHaveBeenCalledWith(10);
    expect(onCommit).toHaveBeenCalled();
    await act(async () =>
      handle.props.onAccessibilityAction({
        nativeEvent: { actionName: "increment" },
      }),
    );
    expect(onCommit).toHaveBeenLastCalledWith(600, 735);
  });
});
