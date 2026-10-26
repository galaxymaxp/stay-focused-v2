import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PlanningControl, type PlanningSheetProps } from './PlanningSheet';
import type { PlanningCandidates } from '@stay-focused/shared/task-planning';
import { defaultPlanningDraft, planningDraftSummary, previousPlanData } from '@stay-focused/shared';
const mocks = vi.hoisted(() => ({ load: vi.fn(), build: vi.fn(), hold: vi.fn(), check: vi.fn(), apply: vi.fn(), restore: vi.fn() }));
vi.mock('react-native', () => ({ View: 'View', Pressable: 'Pressable' }));
vi.mock('lucide-react-native', () => ({ EyeOff: 'EyeOff', X: 'X' }));
vi.mock('../../design/primitives', () => ({ Copy: 'Copy', SkeletonBlock: 'SkeletonBlock', SegmentedControl: 'SegmentedControl', Sheet: 'Sheet' }));
vi.mock('../../design/theme', async () => { const { palettes } = await import('../../design/themeTokens'); return { useTheme: () => ({ colors: palettes.light }) }; });
vi.mock('./PlanButton', () => ({ PlanButton: 'PlanButton' }));
vi.mock('./useLibraryOrganizer', () => ({ useLibraryOrganizer: () => ({ scrollRef: { current: null }, listRef: { current: null }, layouts: { current: new Map() }, panHandlers: {}, hold: mocks.hold, touchStart() {}, touchEnd() {}, touchCancel() {}, onScroll() {}, dragging: null }) }));
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const range = { startsAt: '2026-10-25T09:00:00.000Z', endsAt: '2026-10-25T10:00:00.000Z' };
const fixture = (): PlanningCandidates => ({ planningRange: range, availability: [range], freeWindowMinutes: 60, personalItems: [], courses: [1, 2].map(n => ({ id: id(n), name: n === 1 ? 'CC17 | CITCS 3F Group A | MOBILE APPLICATION DESIGN AND DEVELOPMENT' : 'Chemistry', items: [
  { kind: 'task', id: id(n + 10), title: `Task ${n}`, courseId: id(n), estimateMinutes: 40, openedWithin24h: false, dueAt: null, priority: 'medium', createdAt: range.startsAt },
  { kind: 'reviewer', id: id(n + 20), title: `Reviewer ${n}.pdf`, courseId: id(n), estimateMinutes: 20, openedWithin24h: n === 1, dueAt: null, priority: 'medium', createdAt: range.startsAt },
] })) });
let tree: ReactTestRenderer | undefined;
const root = () => tree!.root;
const named = (label: string) => { const matches = root().findAll(node => String(node.type) === 'Pressable' && node.props.accessibilityLabel === label); return matches.find(node => node.props.accessibilityRole === 'checkbox') ?? matches[0]!; };
const control = (index: number) => root().findAllByType('SegmentedControl' as never)[index]!;
const text = () => root().findAllByType('Copy' as never).map(node => [node.props.children].flat().join('')).join('\n');
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.clearAllMocks(); mocks.load.mockResolvedValue(fixture()); });
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; vi.unstubAllGlobals(); });
async function mount(extra: Partial<PlanningSheetProps> = {}) { await act(async () => { tree = create(createElement(PlanningControl, { request: { planningRange: range, availability: [range] }, active: null, load: mocks.load, onBuild: mocks.build, ...extra })); }); await act(async () => root().findByType('PlanButton' as never).props.onPress()); }
it('one single-scroll sheet renders fit/timeline, defaults Both/smart, and applies without changing selection', async () => {
  const data = fixture(), plan = planningDraftSummary(data, defaultPlanningDraft(data)).plan;
  await mount({ plan, candidates: data, onApply: mocks.apply });
  expect(mocks.load).not.toHaveBeenCalled(); expect(root().findAllByType('Sheet' as never)).toHaveLength(1);
  expect(root().findByType('Sheet' as never).props.maxHeight).toBe('94%'); expect(root().findAllByType('ScrollView' as never)).toHaveLength(0);
  expect(control(0).props.value).toBe('proposed'); expect(control(1).props.value).toBe('reviewers_tasks');
  expect(text()).toContain('Free time ends'); expect(text()).toContain('60 / 60 min');
  expect(text()).toContain('1 more items (40 min) wait for your next free window.');
  await act(async () => named('Use this plan').props.onPress()); expect(mocks.apply).toHaveBeenCalledTimes(1); expect(mocks.build).not.toHaveBeenCalled();
});
it('course list uses splitCourseName, no chips; selecting none disables apply and Include previews without reads', async () => {
  await mount(); await act(async () => named('Courses').props.onPress());
  expect(text()).toContain('Mobile Application Design and Development'); expect(text()).toContain('2 items');
  for (const name of fixture().courses.map(course => course.name)) await act(async () => named(name).props.onPress());
  expect(named('Use this plan').props.disabled).toBe(true); expect(text()).toContain('Pick at least one course');
  await act(async () => named('Chemistry').props.onPress());
  for (const mode of ['reviewers', 'tasks', 'reviewers_tasks']) await act(async () => control(1).props.onChange(mode));
  expect(mocks.build.mock.calls.at(-1)![0].selection.courseIds).toEqual([id(2)]); expect(mocks.load).toHaveBeenCalledTimes(1);
});
it('first accordion opens; other courses toggle independently, full titles and Remove/Put back use canonical keys', async () => {
  await mount({ onItemCheck: mocks.check });
  expect(named('CC17 smart order').props.accessibilityState.expanded).toBe(true);
  expect(named('Chemistry smart order').props.accessibilityState.expanded).toBe(false);
  await act(async () => named('Task 1').props.onPress()); expect(mocks.check).toHaveBeenLastCalledWith(`task:${id(11)}`, false);
  await act(async () => named('Task 1').props.onPress()); expect(mocks.check).toHaveBeenLastCalledWith(`task:${id(11)}`, true);
  expect(named('Reviewer 1.pdf').props.accessibilityState.checked).toBe(false);
  await act(async () => named('Chemistry smart order').props.onPress()); expect(named('Task 2')).toBeTruthy();
  await act(async () => named('CC17 smart order').props.onPress()); expect(root().findAll(node => node.props.accessibilityLabel === 'Task 1' && node.props.accessibilityRole === 'checkbox')).toHaveLength(0);
});
it('drag grip and accessibility moves select manual order; reset keeps exclusions', async () => {
  await mount({ overrides: { removed: [`task:${id(11)}`], skipped: [] } });
  await act(async () => named('Reorder Reviewer 1.pdf').props.onAccessibilityAction({ nativeEvent: { actionName: 'moveUp' } }));
  expect(mocks.build.mock.calls.at(-1)![0].selection.order).toBe('manual');
  expect(mocks.build.mock.calls.at(-1)![0].selection.items).not.toContainEqual({ kind: 'task', id: id(11) });
  await act(async () => named('Reorder Task 1').props.onLongPress()); expect(mocks.hold).toHaveBeenCalledWith(`task:${id(11)}`);
  await act(async () => named('Reset to smart order').props.onPress()); expect(mocks.build.mock.calls.at(-1)![0].selection.order).toBe('smart');
  expect(named('Task 1').props.accessibilityState.checked).toBe(false);
});
it('Taken out is conditional and default open; exact reasons and Put back invoke the action', async () => {
  await mount({ overrides: { removed: [`task:${id(11)}`], skipped: [`reviewer:${id(22)}`] }, onItemCheck: mocks.check });
  expect(named('Taken out').props.accessibilityState.expanded).toBe(true);
  expect(text()).toContain('Skipped tonight · returns next window'); expect(text()).toContain('Removed from plan');
  await act(async () => named('Put back Task 1').props.onPress()); expect(mocks.check).toHaveBeenLastCalledWith(`task:${id(11)}`, true);
  await act(async () => named('Taken out').props.onPress()); expect(root().findAll(node => node.props.accessibilityLabel === 'Put back Task 1')).toHaveLength(0);
});
it('Previous empty state is real; populated snapshot has statuses and Restore returns to Proposed', async () => {
  await mount(); expect(root().findAll(node => node.props.accessibilityLabel === 'Taken out')).toHaveLength(0);
  await act(async () => control(0).props.onChange('previous')); expect(text()).toContain('No previous plan yet');
  expect(root().findAll(node => node.props.accessibilityLabel === 'Restore this plan')).toHaveLength(0);
  await act(async () => tree!.unmount());
  const previous = previousPlanData({ date: '2026-10-25', start: 540, end: 600, sessions: [{ kind: 'task', id: id(11), title: 'Task 1', courseId: id(1), startMinute: 540, minutes: 40 }] }, '2026-10-25', [], Date.parse('2026-10-26T00:00:00Z'));
  await mount({ previous, onRestore: mocks.restore }); await act(async () => control(0).props.onChange('previous'));
  expect(text()).toContain('Not finished · moved to today'); await act(async () => named('Restore this plan').props.onPress());
  expect(mocks.restore).toHaveBeenCalledTimes(1); expect(control(0).props.value).toBe('proposed');
});
it('Close changes no plan; stale candidate completion cannot replace a newer range', async () => {
  let finish!: (data: PlanningCandidates) => void; mocks.load.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await mount(); const nextRange = { ...range, endsAt: '2026-10-25T11:00:00.000Z' };
  mocks.load.mockResolvedValue({ ...fixture(), freeWindowMinutes: 120, availability: [nextRange] });
  await act(async () => tree!.update(createElement(PlanningControl, { request: { planningRange: range, availability: [nextRange] }, active: null, load: mocks.load, onBuild: mocks.build })));
  await act(async () => finish({ ...fixture(), freeWindowMinutes: 999 })); expect(text()).not.toContain('999');
  await act(async () => root().findByType('Sheet' as never).props.onClose()); expect(mocks.build).not.toHaveBeenCalled();
});

it('skeleton shows only without cached candidates; cached candidates stay visible during refresh', async () => {
  let finish!: (data: PlanningCandidates) => void; mocks.load.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await mount(); expect(root().findAll(node => node.props.testID === 'planner-skeleton')).toHaveLength(1);
  expect(root().findAll(node => node.props.testID === 'skeleton-block-row')).toHaveLength(3);
  expect(root().findAll(node => node.props.testID === 'skeleton-course-row')).toHaveLength(4);
  expect(named('Use this plan').props.disabled).toBe(true);
  await act(async () => finish(fixture())); expect(root().findAll(node => node.props.testID === 'planner-skeleton')).toHaveLength(0);
  await act(async () => tree!.update(createElement(PlanningControl, { request: { planningRange: range, availability: [{ ...range, endsAt: '2026-10-25T11:00:00.000Z' }] }, active: null, load: () => new Promise<PlanningCandidates>(() => {}), onBuild: mocks.build })));
  expect(root().findAll(node => node.props.testID === 'planner-skeleton')).toHaveLength(0); expect(text()).toContain('Free time ends');
});

it('restoring replaces an edited local draft with the active restored selection', async () => {
  const data = fixture();
  const previous = previousPlanData({ date: '2026-10-25', start: 540, end: 600, sessions: [{ kind: 'task', id: id(12), title: 'Task 2', courseId: id(2), startMinute: 540, minutes: 40 }] }, '2026-10-25', []);
  const restored = { ...defaultPlanningDraft(data), mode: 'tasks' as const, checked: [`task:${id(12)}`] };
  const props: PlanningSheetProps = { request: { planningRange: range, availability: [range] }, active: null, candidates: data, load: mocks.load, onBuild: mocks.build, previous,
    onRestore: () => tree!.update(createElement(PlanningControl, { ...props, active: { mode: 'tasks', selection: { order: 'manual', items: [{ kind: 'task', id: id(12) }] }, draft: restored } })),
  };
  await mount(props);
  await act(async () => control(1).props.onChange('reviewers'));
  await act(async () => control(0).props.onChange('previous'));
  await act(async () => named('Restore this plan').props.onPress());
  expect(control(0).props.value).toBe('proposed');
  expect(control(1).props.value).toBe('tasks');
  expect(named('Task 1').props.accessibilityState.checked).toBe(false);
  await act(async () => named('Chemistry smart order').props.onPress());
  expect(named('Task 2').props.accessibilityState.checked).toBe(true);
});

it('cached plan blocks stay visible while candidates are pending', async () => {
  mocks.load.mockImplementationOnce(() => new Promise<PlanningCandidates>(() => {}));
  const data = fixture(), plan = planningDraftSummary(data, defaultPlanningDraft(data)).plan;
  await mount({ plan });
  expect(root().findAll(node => node.props.testID === 'planner-skeleton')).toHaveLength(0);
  expect(text()).toContain('Free time ends');
  expect(text()).toContain('60 / 60 min');
  expect(named('Use this plan').props.disabled).toBe(true);
});
