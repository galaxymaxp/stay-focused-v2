import { createElement, type ReactElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CourseLearningWorkspace,
  LibraryOverview,
  TodayOverview,
} from "@stay-focused/shared";
import { GenerateScreen } from "./GenerateScreen";
import { LibraryScreen } from "./LibraryScreen";
import { TasksScreen } from "./TasksScreen";
import { TodayScreen } from "./TodayScreen";
import { DayRingClock } from "./DayRingClock";
import { localDate } from "./presentation";

const mocks = vi.hoisted(() => ({
  data: {} as Record<string, unknown>,
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
  PanResponder: { create: (handlers: unknown) => ({ panHandlers: handlers }) },
  Animated: {
    View: "AnimatedView",
    Value: class {
      setValue() {}
      stopAnimation() {}
    },
    spring: () => ({ start() {} }),
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
}));
vi.mock("./useExperience", () => ({
  useExperienceClient: () => ({
    baseUrl: "https://api.example",
    accessToken: "token",
  }),
  useExperience: (path: string | null) => ({
    data: path ? (mocks.data[path] ?? null) : null,
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
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
  it("selects real material, disables unavailable Quiz and persists Reviewer intent before navigation", async () => {
    mocks.data["/api/experience/courses"] = { items: [workspace.course] };
    mocks.data["/api/experience/courses/course"] = workspace;
    mocks.createIntent.mockResolvedValue({ key: "saved-key" });
    const root = await render(createElement(GenerateScreen));
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
  it("opens a Library artifact without calling generation", async () => {
    mocks.data["/api/experience/library?type=all&limit=50"] = {
      items: [
        {
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
        },
      ],
      categories: {
        reviewer: supported,
        quiz: supported,
        activity_output: supported,
      },
      nextOffset: null,
    } as LibraryOverview;
    const root = await render(createElement(LibraryScreen));
    const open = root
      .findAll((node) => String(node.type) === "RowLink")
      .find((node) => node.props.label === "Practice: Saved quiz")!;
    await act(async () => open.props.onPress());
    expect(mocks.push).toHaveBeenCalledWith({
      pathname: "/artifact",
      params: { id: "quiz:saved" },
    });
    expect(mocks.createIntent).not.toHaveBeenCalled();
    expect(mocks.request).not.toHaveBeenCalled();
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
