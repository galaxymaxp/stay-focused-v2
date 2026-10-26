import { todayPlanningMemory } from "../today/planning-session";
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ActivitySummary, TodayItem, TodayScreenData } from "@stay-focused/shared";
import type { DeterministicStudyPlan } from "@stay-focused/shared/task-planning";
import { TodayScreen } from "../today/today-screen";
import { DayRingClock } from "./DayRingClock";
import { ClockOptions } from "./clock-options";
import { CLOCK } from "./dayClock";
import { planModeStore } from "../../lib/plan-mode";
import { arrangeToday } from "../../app-model/presentation";
vi.mock("../today/planning-sheet", () => ({ PlanningControl: "PlanningControl" }));












// TP2 Today integration: device selection, stale responses and reviewer navigation.
const mocks = vi.hoisted(() => ({ api: vi.fn(), push: vi.fn(), entries: new Map<string, string>() }));
vi.mock("../../components/providers", () => ({ useAuth: () => ({ api: mocks.api, session: { user: { id: "owner" } } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
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

const course = { id: "course-1", code: "BIO101", name: "Biology" };
const reviewerBlock: TodayItem = {
  id: "session:review", kind: "study_session", title: "Essay draft", course, startAt: new Date(2026, 9, 24, 15).toISOString(),
  endAt: new Date(2026, 9, 24, 15, 30).toISOString(), dueAt: null, estimatedMinutes: 30, estimateSource: null, priority: "medium",
  status: "planned", source: "local", deepLinkTarget: { surface: "study_session", id: "review" }, reviewer: { id: "artifact:reviewer-1" },
};
const taskBlock: TodayItem = { ...reviewerBlock, id: "session:task", startAt: new Date(2026, 9, 24, 16).toISOString(), endAt: new Date(2026, 9, 24, 17).toISOString(),
  deepLinkTarget: { surface: "study_session", id: "task" }, reviewer: undefined };
// Same title and course as the reviewer block: the old title match must not capture it.
const activity = { id: "task:essay", title: "Essay draft", course, taskId: "essay" } as unknown as ActivitySummary;
const fixture = (): TodayScreenData => ({
  date: "2026-10-24", utcOffsetMinutes: -new Date().getTimezoneOffset(), asOf: new Date().toISOString(),
  progress: { completed: 0, total: 0, scheduledMinutes: 0 }, urgent: [], current: null, next: null,
  later: [], overdue: [], upcomingDeadlines: [], timeline: [reviewerBlock, taskBlock],
  plannerState: { status: "current", lastPlannedAt: null, needsTaskImport: false },
  capabilities: { reviewerGeneration: { status: "available" }, quizGeneration: { status: "available" }, activityMaker: { status: "available" }, planner: { status: "available" }, calendar: { status: "available" } },
  announcements: { items: [], nextOffset: null }, activities: { items: [activity] },
});
const plan = (marker: string): DeterministicStudyPlan => ({
  algorithmVersion: "deterministic-v1", planningRange: { startsAt: marker, endsAt: marker }, availability: [], sessions: [], unscheduledWork: [],
});

let tree: ReactTestRenderer | undefined;
const noop = { addEventListener() {}, removeEventListener() {} };
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 24, 12));
  todayPlanningMemory.reset(); mocks.api.mockReset(); mocks.push.mockReset(); mocks.entries.clear(); planModeStore.reset();
  mocks.entries.set("sf.today.free-time.2026-10-24", JSON.stringify({ start: 600, end: 720 }));
  mocks.api.mockImplementation(async (path: string, options?: { body: import('@stay-focused/shared/task-planning').StudyPlanningRequest }) => path.startsWith("/api/today") ? fixture() : path === '/api/experience/planner/candidates'
    ? { courses: [], personalItems: ['task', 'reviewer'].map(kind => ({ kind, id: 'selected', title: 'Synthetic selection', courseId: null, estimateMinutes: 30, openedWithin24h: false, dueAt: null, priority: 'medium', createdAt: options!.body.planningRange.startsAt })), planningRange: options!.body.planningRange, availability: options!.body.availability, freeWindowMinutes: 120 } : plan("default"));
  vi.stubGlobal("localStorage", { getItem: (key: string) => mocks.entries.get(key) ?? null, setItem: (key: string, value: string) => { mocks.entries.set(key, value); } });
  vi.stubGlobal("window", { ...noop, matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) });
  vi.stubGlobal("document", { ...noop, visibilityState: "visible" });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  await act(async () => { tree = create(createElement(TodayScreen), { createNodeMock: element =>
    (element.props as { className?: string }).className?.startsWith("day-clock")
      ? { clientWidth: CLOCK.size, getBoundingClientRect: () => ({ left: 0, top: 0, width: CLOCK.size, height: CLOCK.size }) } : null }); });
  mocks.api.mockClear();
});
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; vi.useRealTimers(); vi.unstubAllGlobals(); planModeStore.reset(); });
const tick = async (ms: number) => { await act(async () => { vi.advanceTimersByTime(ms); }); };
const options = () => tree!.root.findByType(ClockOptions).props;
const control = () => tree!.root.findByType("PlanningControl" as never);
const choice = (mode: "reviewers" | "tasks" | "reviewers_tasks") => ({ mode, selection: { order: "manual", items: [{ kind: mode === "tasks" ? "task" : "reviewer", id: "selected" }] }, draft: { mode } });
const previews = () => mocks.api.mock.calls.filter(([path]) => path === "/api/experience/planner/preview");
const shown = () => tree!.root.findAllByType("PlanPreview" as never).map(node => (node.props as { plan: DeterministicStudyPlan }).plan);

it("defaults to Both without menu radios and applies exactly the previewed selection", async () => {
  expect(options().planMode).toBeUndefined();
  expect(control().props.active).toBeNull();
  await act(async () => options().onCommit(600, 780)); await tick(400);
  expect(previews()).toHaveLength(1);
  const body = previews()[0]![1].body;
  expect(body.mode).toBe("reviewers_tasks");
  expect(body.selection).toEqual({ order: "smart", items: [{ kind: "task", id: "selected" }, { kind: "reviewer", id: "selected" }] });
  await act(async () => { await Promise.resolve(); });
  const preview = tree!.root.findByType("PlanPreview" as never);
  await act(async () => (preview.props as { onApply: () => void }).onApply());
  const apply = mocks.api.mock.calls.find(([path]) => path === "/api/experience/planner/replan")!;
  expect(apply[1].body).toEqual(body);
});

it("builds a new selection and drops a late older-selection preview", async () => {
  let resolveOld!: (value: DeterministicStudyPlan) => void;
  mocks.api.mockImplementationOnce(() => new Promise(done => { resolveOld = done; }));
  await act(async () => options().onCommit(600, 780)); await tick(400);
  expect(previews()[0]![1].body.mode).toBe("reviewers_tasks");
  mocks.api.mockImplementationOnce(async () => plan("reviewers"));
  await act(async () => control().props.onBuild(choice("reviewers")));
  expect(control().props.active.selection).toEqual(choice("reviewers").selection);
  await tick(399); expect(previews()).toHaveLength(1);
  await tick(1); expect(previews()).toHaveLength(2);
  expect(previews()[1]![1].body).toMatchObject({ mode: "reviewers", availability: previews()[0]![1].body.availability });
  await act(async () => { resolveOld(plan("old-mode")); await Promise.resolve(); });
  expect(shown().map(value => value.planningRange.startsAt)).toEqual(["reviewers"]);
});

it("ignores stored modes while automatic proposals and clock release keep the active selection", async () => {
  await act(async () => planModeStore.apply("tasks")); await tick(1000);
  expect(previews()).toHaveLength(1);
  expect(previews()[0]![1].body.mode).toBe("reviewers_tasks");
  await act(async () => control().props.onBuild(choice("reviewers"))); await tick(400);
  await act(async () => planModeStore.apply("reviewers_tasks")); await tick(400);
  expect(previews()).toHaveLength(2);
  await act(async () => options().onCommit(660, 840)); await tick(400);
  expect(previews()[2]![1].body).toMatchObject({ mode: "reviewers", selection: choice("reviewers").selection });
});
it("reload clears the local selection", async () => {
  await act(async () => control().props.onBuild(choice("tasks"))); await tick(400);
  await act(async () => tree!.unmount());
  todayPlanningMemory.reset(); // a reload creates a fresh JS module instance
  await act(async () => { tree = create(createElement(TodayScreen)); });
  expect(control().props.active).toBeNull();
});

it("opens a reviewer block's saved reviewer and keeps task blocks on their session", async () => {
  const clock = tree!.root.findByType(DayRingClock);
  await act(async () => clock.props.onSegmentPress("session:review"));
  expect(mocks.push).toHaveBeenLastCalledWith("/library/artifact%3Areviewer-1");
  await act(async () => clock.props.onSegmentPress("session:task"));
  // The task block resolves to its activity as before.
  expect(mocks.push).toHaveBeenLastCalledWith("/tasks/task%3Aessay");
  const labels = tree!.root.findAll(node => node.type === "button" && typeof node.props["aria-label"] === "string" && node.props["aria-label"].includes("Essay draft"))
    .map(node => node.props["aria-label"] as string);
  expect(labels.some(label => label.includes("Review: Essay draft"))).toBe(true);
});
it("keeps reviewer identities separate from same-title tasks in Today sections", () => {
  const otherReviewer = { ...reviewerBlock, id: "session:other-reviewer", reviewer: { id: "artifact:other" } };
  const arranged = arrangeToday({ next: reviewerBlock, later: [taskBlock, otherReviewer], dueSoon: [] }, [], [], "2026-10-24");
  expect(arranged.next).toBe(reviewerBlock); expect(arranged.later).toEqual([taskBlock, otherReviewer]);
});
