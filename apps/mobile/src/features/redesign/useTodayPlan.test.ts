import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { localMinuteIso, type PlanDeviceState, type TodayItem } from '@stay-focused/shared';
import type { PlanningCandidates } from '@stay-focused/shared/task-planning';
import { useTodayPlan } from './useTodayPlan';
const mocks = vi.hoisted(() => ({ read: vi.fn(), saveOverrides: vi.fn(), saveSnapshot: vi.fn(), dismissWelcome: vi.fn() }));
vi.mock('./planDeviceStore', () => ({ planDeviceStore: mocks }));
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const date = '2026-10-27';
const range = { startsAt: localMinuteIso(date, 1200), endsAt: localMinuteIso(date, 1320) };
const candidates: PlanningCandidates = { courses: [], personalItems: [
  { kind: 'task', id: id(1), title: 'Synthetic task', courseId: null, estimateMinutes: 30, openedWithin24h: false, dueAt: null, priority: 'medium', createdAt: range.startsAt },
  { kind: 'reviewer', id: id(2), title: 'Synthetic reviewer', courseId: null, estimateMinutes: 20, openedWithin24h: false, dueAt: null, priority: 'medium', createdAt: range.startsAt },
], freeWindowMinutes: 120, planningRange: range, availability: [range] };
let device: PlanDeviceState;
let tree: ReactTestRenderer | undefined;
let current: ReturnType<typeof useTodayPlan>;
type Input = Parameters<typeof useTodayPlan>[0];
let input: Input;
function Probe() { current = useTodayPlan(input); return null; }
async function render() { await act(async () => { if (tree) tree.update(createElement(Probe)); else tree = create(createElement(Probe)); }); }
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.clearAllMocks();
  device = { lastUsed: null, overrides: { removed: [], skipped: [] }, previous: null, welcomeDismissed: false };
  mocks.read.mockImplementation(async () => device);
  input = { identity: 'owner:' + date, ownerId: 'owner', date,
    clock: { ready: true, window: null, adjusting: { current: false }, save: vi.fn() },
    around: null, timeline: [], timelineReady: true, enabled: true, busy: false, previewing: false, preview: null,
    mode: 'reviewers_tasks', load: vi.fn().mockResolvedValue(candidates), queue: vi.fn(), clear: vi.fn() };
});
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; vi.unstubAllGlobals(); });
it('first-run resolves 20-22 and queues exactly once with eligible defaults, without saving', async () => {
  await render(); expect([current.start, current.end, current.windowSource]).toEqual([1200, 1320, 'first-run']);
  expect(input.queue).toHaveBeenCalledTimes(1);
  expect(input.queue).toHaveBeenCalledWith(expect.objectContaining({ mode: 'reviewers_tasks', selection: { order: 'smart', items: [{ kind: 'task', id: id(1) }, { kind: 'reviewer', id: id(2) }] } }));
  await render(); await render(); expect(input.queue).toHaveBeenCalledTimes(1); expect(input.load).toHaveBeenCalledTimes(1); expect(input.clock.save).not.toHaveBeenCalled();
});
it('uses last-used on a new date; saved beats around and last, around beats last', async () => {
  device = { ...device, lastUsed: { start: 600, end: 720 } };
  await render(); expect([current.start, current.end, current.windowSource]).toEqual([600, 720, 'last']);
  input = { ...input, around: { start: 900, end: 1000 } }; await render(); expect(current.windowSource).toBe('around');
  input = { ...input, clock: { ...input.clock, window: { start: 100, end: 200 } } }; await render();
  expect([current.start, current.end, current.windowSource]).toEqual([100, 200, 'saved']);
});
it('does not queue automatically for a saved planned session overlapping the window', async () => {
  input = { ...input, timeline: [{ kind: 'study_session', status: 'planned', startAt: range.startsAt, endAt: range.endsAt } as TodayItem] };
  await render(); expect(input.queue).not.toHaveBeenCalled();
});
it('waits for capability, storage/window and timeline readiness', async () => {
  input = { ...input, enabled: false }; await render(); expect(input.load).not.toHaveBeenCalled();
  input = { ...input, enabled: true, timelineReady: false }; await render(); expect(input.queue).not.toHaveBeenCalled();
  input = { ...input, timelineReady: true, clock: { ...input.clock, ready: false } }; await render(); expect(input.queue).not.toHaveBeenCalled();
  input = { ...input, clock: { ...input.clock, ready: true } }; await render(); expect(input.queue).toHaveBeenCalledTimes(1);
});
it('excludes persisted overrides in auto and explicit payloads; kinds remain scoped', async () => {
  device = { ...device, overrides: { removed: [`task:${id(1)}`], skipped: [] } };
  await render(); expect(vi.mocked(input.queue).mock.calls[0]![0].selection?.items).toEqual([{ kind: 'reviewer', id: id(2) }]);
  await act(async () => current.propose('tasks', { order: 'smart' }));
  expect(vi.mocked(input.queue).mock.lastCall![0].selection?.items).toEqual([]);
});
it('clock release previews the new window with overrides and does not save defaults', async () => {
  await render(); await act(async () => current.change(1260, 1380));
  expect(input.clock.save).toHaveBeenCalledWith({ start: 1260, end: 1380 });
  expect(vi.mocked(input.queue).mock.lastCall![0].availability).toEqual([{ startsAt: localMinuteIso(date,1260), endsAt: localMinuteIso(date,1380) }]);
  expect(input.queue).toHaveBeenCalledTimes(2);
});
it('drops old candidate responses across dates', async () => {
  let finish!: (value: PlanningCandidates) => void;
  input = { ...input, load: vi.fn().mockImplementationOnce(() => new Promise<PlanningCandidates>(resolve => { finish = resolve; })).mockResolvedValue(candidates) };
  await render(); expect(input.queue).not.toHaveBeenCalled();
  input = { ...input, date: '2026-10-28', identity: 'owner:2026-10-28' }; await render(); expect(input.queue).toHaveBeenCalledTimes(1);
  await act(async () => finish({ ...candidates, personalItems: [] })); expect(input.queue).toHaveBeenCalledTimes(1); expect(current.candidates?.personalItems).toHaveLength(2);
});
