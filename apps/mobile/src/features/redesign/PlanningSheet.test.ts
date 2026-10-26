import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PlanningControl } from './PlanningSheet';
import type { PlanningCandidates } from '@stay-focused/shared/task-planning';
import { defaultPlanningDraft, planningDraftSummary } from '@stay-focused/shared';
const mocks = vi.hoisted(() => ({ load: vi.fn(), build: vi.fn(), hold: vi.fn() }));
vi.mock('react-native', () => ({ View: 'View', Pressable: 'Pressable' }));
vi.mock('../../design/primitives', () => ({ Action: 'Action', ContentIcon: 'ContentIcon', Copy: 'Copy', SegmentedControl: 'SegmentedControl', Sheet: 'Sheet' }));
vi.mock('../../design/theme', async () => { const { palettes } = await import('../../design/themeTokens'); return { useTheme: () => ({ colors: palettes.light }) }; });
vi.mock('./PlanButton', () => ({ PlanButton: 'PlanButton' }));
vi.mock('./useLibraryOrganizer', () => ({ useLibraryOrganizer: () => ({ scrollRef: { current: null }, listRef: { current: null }, layouts: { current: new Map() }, panHandlers: {}, hold: mocks.hold, touchStart() {}, touchEnd() {}, touchCancel() {}, onScroll() {}, dragging: null }) }));
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const range = { startsAt: '2026-10-25T09:00:00.000Z', endsAt: '2026-10-25T10:00:00.000Z' };
const fixture = (): PlanningCandidates => ({ planningRange: range, availability: [range], freeWindowMinutes: 60, personalItems: [], courses: [1, 2].map(n => ({ id: id(n), name: `Course ${n}`, items: [
  { kind: 'task', id: id(n + 10), title: `Task ${n}`, courseId: id(n), estimateMinutes: 40, openedWithin24h: false, dueAt: null, priority: 'medium', createdAt: range.startsAt },
  { kind: 'reviewer', id: id(n + 20), title: `Reviewer ${n}.pdf`, courseId: id(n), estimateMinutes: 20, openedWithin24h: n === 1, dueAt: null, priority: 'medium', createdAt: range.startsAt },
] })) });
let tree: ReactTestRenderer | undefined;
const root = () => tree!.root;
const named = (label: string) => root().find(node => String(node.type) === 'Pressable' && node.props.accessibilityLabel === label);
const action = (label: string) => root().find(node => String(node.type) === 'Action' && (node.props.children === label || node.props.label === label));
const control = (index: number) => root().findAllByType('SegmentedControl' as never)[index]!;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.clearAllMocks(); mocks.load.mockResolvedValue(fixture()); });
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; vi.unstubAllGlobals(); });
async function mount() { await act(async () => { tree = create(createElement(PlanningControl, { request: { planningRange: range, availability: [range] }, active: null, load: mocks.load, onBuild: mocks.build })); }); }
async function open() { await act(async () => root().findByType('PlanButton' as never).props.onPress()); }
it('opens one opaque single-scroll Sheet; default two-tap build sends eligible All/Both/smart', async () => {
  await mount(); expect(mocks.load).not.toHaveBeenCalled(); await open();
  expect(mocks.load).toHaveBeenCalledTimes(1); expect(root().findAllByType('Sheet' as never)).toHaveLength(1);
  expect(root().findByType('Sheet' as never).props.maxHeight).toBe('65%');
  expect(root().findAllByType('ScrollView' as never)).toHaveLength(0); // Sheet owns the sole scroll container
  expect(control(0).props.value).toBe('all'); expect(control(1).props.value).toBe('reviewers_tasks');
  await act(async () => action('Build plan').props.onPress());
  expect(mocks.build.mock.calls[0]![0].selection).toEqual({ order: 'smart', items: [{ kind: 'task', id: id(11) }, { kind: 'task', id: id(12) }, { kind: 'reviewer', id: id(22) }] });
  expect(root().findAllByType('Sheet' as never)).toHaveLength(0);
});
it('Select none disables Build; Include changes scope without a read or sync', async () => {
  await mount(); await open(); await act(async () => control(0).props.onChange('select'));
  for (const n of [1, 2]) await act(async () => named(`Course ${n}`).props.onPress());
  expect(action('Build plan').props.disabled).toBe(true);
  expect(root().findAllByType('Copy' as never).some(node => node.props.children === 'Pick at least one course')).toBe(true);
  await act(async () => named('Course 2').props.onPress());
  for (const mode of ['reviewers', 'tasks', 'reviewers_tasks']) {
    await act(async () => control(1).props.onChange(mode)); expect(control(1).props.value).toBe(mode);
  }
  await act(async () => action('Build plan').props.onPress());
  expect(mocks.build.mock.calls[0]![0].selection.courseIds).toEqual([id(2)]);
  expect(mocks.load).toHaveBeenCalledTimes(1);
});
it('summary matches not-fit, recent opens are unchecked and tri-state headers support opt-in', async () => {
  await mount(); await open();
  const expected = planningDraftSummary(fixture(), defaultPlanningDraft(fixture()));
  const summary = named('Planning summary');
  expect(summary.findByType('Copy' as never).props.children.join('')).toContain(`~${expected.notFitMinutes} min won't fit`);
  await act(async () => summary.props.onPress());
  const recent = named('Reviewer 1.pdf, 20 minutes, Opened today');
  expect(recent.props.accessibilityState.checked).toBe(false);
  expect(named('Course 1, 2 items').props.accessibilityState.checked).toBe('mixed');
  await act(async () => recent.props.onPress());
  expect(named('Course 1, 2 items').props.accessibilityState.checked).toBe(true);
  await act(async () => action('Build plan').props.onPress());
  expect(mocks.build.mock.calls[0]![0].selection.items).toContainEqual({ kind: 'reviewer', id: id(21) });
});
it('accessible row and group moves switch to Manual; Reset restores Smart without changing checks', async () => {
  await mount(); await open(); await act(async () => named('Planning summary').props.onPress());
  await act(async () => named('Task 1, 40 minutes').props.onAccessibilityAction({ nativeEvent: { actionName: 'moveDown' } }));
  expect(action('Reset to smart order')).toBeTruthy();
  await act(async () => named('Course 2, 2 items').props.onAccessibilityAction({ nativeEvent: { actionName: 'moveUp' } }));
  await act(async () => action('Build plan').props.onPress());
  expect(mocks.build.mock.calls[0]![0].selection.order).toBe('manual');
  expect(mocks.build.mock.calls[0]![0].selection.items[0].id).toBe(id(12));
  await open(); await act(async () => named('Planning summary').props.onPress());
  await act(async () => named('Move Task 1 down').props.onPress());
  await act(async () => action('Reset to smart order').props.onPress());
  expect(root().findAllByType('Copy' as never).some(node => node.props.children === 'Smart order')).toBe(true);
});
it('Close/back callback changes no plan; Reset to all restores defaults', async () => {
  await mount(); await open(); await act(async () => control(1).props.onChange('tasks'));
  await act(async () => action('Reset to all').props.onPress()); expect(control(1).props.value).toBe('reviewers_tasks');
  await act(async () => root().findByType('Sheet' as never).props.onClose());
  expect(mocks.build).not.toHaveBeenCalled(); expect(root().findAllByType('Sheet' as never)).toHaveLength(0);
});
it('drops an older candidate read when range changes', async () => {
  let finish!: (data: PlanningCandidates) => void;
  mocks.load.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await mount(); await open();
  const nextRange = { ...range, endsAt: '2026-10-25T11:00:00.000Z' };
  mocks.load.mockResolvedValue({ ...fixture(), freeWindowMinutes: 120, availability: [nextRange] });
  await act(async () => tree!.update(createElement(PlanningControl, { request: { planningRange: range, availability: [nextRange] }, active: null, load: mocks.load, onBuild: mocks.build })));
  await act(async () => finish({ ...fixture(), freeWindowMinutes: 999 }));
  expect(root().findAllByType('Copy' as never).some(node => node.props.children?.[0] === 999)).toBe(false);
});
it('per-item checks invoke remove/putBack without building, group selection stays scoped', async () => {
  const check = vi.fn();
  await act(async () => { tree = create(createElement(PlanningControl, { request: { planningRange: range, availability: [range] }, active: null, load: mocks.load, onBuild: mocks.build, onItemCheck: check })); });
  await open(); await act(async () => named('Planning summary').props.onPress());
  await act(async () => named('Task 1, 40 minutes').props.onPress());
  expect(check).toHaveBeenLastCalledWith(`task:${id(11)}`, false);
  await act(async () => named('Task 1, 40 minutes').props.onPress());
  expect(check).toHaveBeenLastCalledWith(`task:${id(11)}`, true);
  expect(mocks.build).not.toHaveBeenCalled();
});
it('persisted removed/skipped items start unchecked and stay excluded from Build', async () => {
  await act(async () => { tree = create(createElement(PlanningControl, { request: { planningRange: range, availability: [range] }, active: null, load: mocks.load, onBuild: mocks.build,
    overrides: { removed: [`task:${id(11)}`], skipped: [`reviewer:${id(22)}`] } })); });
  await open(); await act(async () => named('Planning summary').props.onPress());
  expect(named('Task 1, 40 minutes').props.accessibilityState.checked).toBe(false);
  expect(named('Reviewer 2.pdf, 20 minutes').props.accessibilityState.checked).toBe(false);
  await act(async () => action('Build plan').props.onPress());
  expect(mocks.build.mock.calls[0]![0].selection.items).toEqual([{ kind: 'task', id: id(12) }]);
});

it('Reset to all and group checks preserve removals until an item is explicitly put back', async () => {
  await act(async () => { tree = create(createElement(PlanningControl, { request: { planningRange: range, availability: [range] }, active: null, load: mocks.load, onBuild: mocks.build,
    overrides: { removed: [`task:${id(11)}`], skipped: [] } })); });
  await open(); await act(async () => action('Reset to all').props.onPress());
  await act(async () => named('Planning summary').props.onPress());
  expect(named('Task 1, 40 minutes').props.accessibilityState.checked).toBe(false);
  await act(async () => named('Course 1, 2 items').props.onPress());
  expect(named('Task 1, 40 minutes').props.accessibilityState.checked).toBe(false);
  await act(async () => action('Build plan').props.onPress());
  expect(mocks.build.mock.calls[0]![0].selection.items).not.toContainEqual({ kind: 'task', id: id(11) });
});
