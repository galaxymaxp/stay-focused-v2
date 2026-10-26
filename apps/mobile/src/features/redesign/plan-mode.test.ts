import { todayPlanningMemory } from "./planningSession";
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ActivitySummary, TodayItem, TodayScreenData } from '@stay-focused/shared';
import type { DeterministicStudyPlan, PlanMode } from '@stay-focused/shared/task-planning';
import { TodayScreen } from './TodayScreen';
import { planModeStore } from './planMode';
import { arrangeToday } from './presentation';
vi.mock("./PlanningSheet", () => ({ PlanningControl: "PlanningControl" }));









const mocks = vi.hoisted(() => ({ candidates: vi.fn(), request: vi.fn(), push: vi.fn(), save: vi.fn(), date: '2026-10-24', data: null as TodayScreenData | null,
  adjusting: { current: false }, client: { baseUrl: 'https://api.test', accessToken: 'token' }, owner: 'owner' }));
vi.mock('react-native', () => ({ View: 'View', Pressable: 'Pressable' }));
vi.mock('lucide-react-native', () => ({ EyeOff: 'EyeOff', Pin: 'Pin', PinOff: 'PinOff' }));
vi.mock('expo-router', () => ({ router: { push: mocks.push, navigate: vi.fn() } }));
vi.mock('expo-router/react-navigation', () => ({ useIsFocused: () => true }));
vi.mock('../../auth', () => ({ useAuth: () => ({ session: { user: { id: mocks.owner } } }) }));
vi.mock('../../auth/sessionStore', () => ({ sessionStore: { getItem: async () => null, setItem: async () => {} } }));
vi.mock('../../services/experienceApi', () => ({ experienceRequest: (client: unknown, path: string, options: unknown) => path === '/api/experience/planner/candidates' ? mocks.candidates(client, path, options) : mocks.request(client, path, options) }));
vi.mock('../../design/haptics', () => ({ haptic: { success: vi.fn() } }));
vi.mock('../../design/theme', async () => { const { palettes } = await import('../../design/themeTokens'); return { useTheme: () => ({ colors: palettes.light, mode: 'light', reducedMotion: true }) }; });
vi.mock('../../design/primitives', () => ({ Action: 'Action', Copy: 'Copy', Notice: 'Notice', Page: 'Page', RowLink: 'RowLink', Surface: 'Surface', ContentIcon: 'ContentIcon', SkeletonBlock: 'SkeletonBlock', SkeletonCards: 'SkeletonCards' }));
vi.mock('../../design/SwipeRow', () => ({ SwipeRow: 'SwipeRow', animateNextLayout: vi.fn(), swipeAccessibility: () => ({}) }));
vi.mock('../../design/ClearDay', () => ({ ClearDay: 'ClearDay' }));
vi.mock('./DayOrb', () => ({ dayOrbTouch: { active: false } }));
vi.mock('./DayRingClock', () => ({ DayRingClock: 'DayRingClock' }));
vi.mock('./PlanPreview', () => ({ PlanPreview: 'PlanPreview', planTaskIds: () => [], planToneFor: () => 'blue' }));
vi.mock('./TodayCalendar', () => ({ TodayCalendar: 'TodayCalendar' }));
vi.mock('./AppUpdateNotice', () => ({ AppUpdateBanner: 'AppUpdateBanner' }));
vi.mock('./SnapshotStatus', () => ({ SnapshotStatus: 'SnapshotStatus' }));
vi.mock('./useExperience', () => ({ useExperienceClient: () => mocks.client, useExperience: () => ({ data: mocks.data, loading: false, error: null, refresh: vi.fn() }) }));
vi.mock('./useTodayClockWindow', () => ({ useTodayClockWindow: () => ({ date: mocks.date, path: '/api/today', ready: true, adjusting: mocks.adjusting, window: null, save: mocks.save, reconcile: vi.fn(), setAdjusting: (active: boolean) => { mocks.adjusting.current = active; } }) }));
vi.mock('./useListPreferences', () => ({ useListPreferences: () => ({ prefs: { pinned: { today: [] }, hidden: { today: [] } }, pin: vi.fn(), hide: vi.fn() }) }));
vi.mock('../announcements/AnnouncementsScreen', () => ({ AnnouncementItem: 'AnnouncementItem', useArrangedAnnouncements: () => ({ unread: [] }) }));

let tree: ReactTestRenderer | undefined;
const plan = (tag: string): DeterministicStudyPlan => ({ algorithmVersion: 'deterministic-v1', planningRange: { startsAt: tag, endsAt: tag }, availability: [], sessions: [], unscheduledWork: [] });
const course = { id: 'course', code: 'BIO', name: 'Biology' };
const reviewer: TodayItem = { id: 'session:reviewer', kind: 'study_session', title: 'Same title', course,
  startAt: '2026-10-24T15:00:00Z', endAt: '2026-10-24T15:30:00Z', dueAt: null, estimatedMinutes: 30, estimateSource: null,
  priority: 'medium', status: 'planned', source: 'local', deepLinkTarget: { surface: 'study_session', id: 'reviewer' }, reviewer: { id: 'artifact:reviewer' } };
const activity = { id: 'task:essay', title: 'Same title', course, taskId: 'essay' } as ActivitySummary;
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 24, 12));
  todayPlanningMemory.reset(); planModeStore.reset(); mocks.request.mockReset(); mocks.push.mockReset(); mocks.owner = 'owner'; mocks.date = '2026-10-24';
  mocks.data = { date: mocks.date, capabilities: { planner: { status: 'available' } }, announcements: { items: [] },
    activities: { items: [activity] }, timeline: [reviewer], next: reviewer, later: [], overdue: [], upcomingDeadlines: [] } as unknown as TodayScreenData;
  mocks.candidates.mockReset();
  mocks.candidates.mockImplementation(async (_client: unknown, _path: string, options: { body: import('@stay-focused/shared/task-planning').StudyPlanningRequest }) => ({ courses: [], personalItems: ['task', 'reviewer'].map(kind => ({ kind, id: 'selected', title: 'Synthetic selection', courseId: null, estimateMinutes: 30, openedWithin24h: false, dueAt: null, priority: 'medium', createdAt: options.body.planningRange.startsAt })), planningRange: options.body.planningRange, availability: options.body.availability, freeWindowMinutes: 120 }));
  mocks.request.mockResolvedValue(plan('default'));
  await act(async () => { tree = create(createElement(TodayScreen)); });
});
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; planModeStore.reset(); vi.useRealTimers(); vi.unstubAllGlobals(); });
const tick = async (ms = 400) => { await act(async () => { vi.advanceTimersByTime(ms); }); };
const clock = () => tree!.root.findByType('DayRingClock' as never);
const previews = () => mocks.request.mock.calls.filter(([, path]) => path === '/api/experience/planner/preview');
const control = () => tree!.root.findByType('PlanningControl' as never);
const choice = (mode: PlanMode) => ({ mode, selection: { order: 'manual', items: [{ kind: mode === 'tasks' ? 'task' : 'reviewer', id: 'selected' }] }, draft: { mode } });
const choose = async (mode: PlanMode) => { await act(async () => control().props.onBuild(choice(mode))); };

it('defaults to both, previews each mode and applies exactly the preview request', async () => {
  expect(clock().props.planMode).toBeUndefined();
  expect(control().props.active).toBeNull();
  for (const mode of ['reviewers', 'tasks', 'reviewers_tasks'] as const) {
    await choose(mode); await tick(); expect(previews().at(-1)![2].body.mode).toBe(mode);
  }
  await act(async () => tree!.root.findByType('PlanPreview' as never).props.onApply());
  expect(mocks.request.mock.calls.find(([, path]) => path === '/api/experience/planner/replan')![2].body).toEqual(previews().at(-1)![2].body);
});
it('drops late mode, range, date and owner responses', async () => {
  let finish!: (value: DeterministicStudyPlan) => void;
  mocks.request.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => clock().props.onCommit(600, 780)); await tick();
  await choose('reviewers'); mocks.request.mockResolvedValue(plan('latest')); await tick();
  await act(async () => finish(plan('old-mode')));
  expect(tree!.root.findByType('PlanPreview' as never).props.plan.planningRange.startsAt).toBe('latest');
  for (const change of ['range', 'date', 'owner']) {
    mocks.request.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    await act(async () => clock().props.onCommit(600, 780)); await tick();
    await act(async () => {
      if (change === 'range') clock().props.onCommit(660, 840);
      else { if (change === 'date') mocks.date = '2026-10-25'; else mocks.owner = 'other'; tree!.update(createElement(TodayScreen)); }
    });
    await act(async () => finish(plan(`old-${change}`)));
    expect(tree!.root.findAllByType('PlanPreview' as never)).toHaveLength(0);
    if (change === 'range') await tick();
  }
});
it('opens the saved reviewer even when a task has the same title and course', async () => {
  await act(async () => clock().props.onSegmentPress(reviewer.id));
  expect(mocks.push).toHaveBeenCalledWith({ pathname: '/artifact', params: { id: 'artifact:reviewer' } });
  expect(tree!.root.findAll(node => String(node.type) === 'ContentIcon' && node.props.kind === 'reviewer').length).toBeGreaterThan(0);
});
it('ignores stored modes and clock release keeps the active selection', async () => {
  await act(async () => planModeStore.apply('tasks')); await tick(); expect(previews()).toHaveLength(0);
  await choose('reviewers'); await tick();
  await act(async () => planModeStore.apply('reviewers_tasks')); await tick(); expect(previews()).toHaveLength(1);
  await act(async () => clock().props.onCommit(660, 840)); await tick();
  expect(previews().at(-1)![2].body).toMatchObject({ mode: 'reviewers', selection: choice('reviewers').selection });
  await act(async () => { mocks.date = '2026-10-25'; tree!.update(createElement(TodayScreen)); });
  expect(control().props.active).toBeNull();
});
it('reload clears the built selection', async () => {
  await choose('tasks'); await tick();
  await act(async () => tree!.unmount());
  todayPlanningMemory.reset(); // a reload creates a fresh JS module instance
  await act(async () => { tree = create(createElement(TodayScreen)); });
  expect(control().props.active).toBeNull();
});
it('keeps reviewers and same-title tasks distinct in Today sections', () => {
  const task = { ...reviewer, id: 'session:task', reviewer: undefined };
  const otherReviewer = { ...reviewer, id: 'session:other-reviewer', reviewer: { id: 'artifact:other' } };
  const arranged = arrangeToday({ next: reviewer, later: [task, otherReviewer], dueSoon: [] }, [], [], mocks.date);
  expect(arranged.next).toBe(reviewer); expect(arranged.later).toEqual([task, otherReviewer]);
});
