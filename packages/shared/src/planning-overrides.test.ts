import { describe, expect, it } from 'vitest';
import { applyPlanOverrides, orderPlanningSelection, reorderProposal, FIRST_RUN_WINDOW, moveProposalUp, resolveFreeWindow, restoreSelectionFromSnapshot, snapshotFromPlan, splitCourseName, takenOutItems } from './planning-sheet';
import { generateContentStudyPlan, type PlanningCandidates } from './task-planning';
import { localMinuteIso } from './free-time';

const range = { startsAt: localMinuteIso('2026-10-27', 1200), endsAt: localMinuteIso('2026-10-27', 1320) };
const item = (id: string, kind: 'task' | 'reviewer' = 'task', courseId: string | null = 'c') => ({ id, kind, title: id, courseId, estimateMinutes: 30, openedWithin24h: false, dueAt: null, priority: 'medium' as const, createdAt: range.startsAt });
const candidates: PlanningCandidates = { courses: [{ id: 'c', name: 'Course', items: [item('1'), item('2', 'reviewer'), item('3')] }], personalItems: [item('4', 'task', null)], freeWindowMinutes: 120, planningRange: range, availability: [range] };
describe('PL1 windows and exclusions', () => {
  it('resolves saved, around, last and first-run in that order without mutating input', () => {
    const windows = [{ start: 100, end: 200 }, { start: 300, end: 400 }, { start: 500, end: 600 }];
    expect(resolveFreeWindow({ savedForDate: windows[0], aroundPlanned: windows[1], lastUsed: windows[2] })).toEqual({ window: windows[0], source: 'saved' });
    expect(resolveFreeWindow({ aroundPlanned: windows[1], lastUsed: windows[2] })).toEqual({ window: windows[1], source: 'around' });
    expect(resolveFreeWindow({ lastUsed: windows[2] })).toEqual({ window: windows[2], source: 'last' });
    expect(resolveFreeWindow({})).toEqual({ window: FIRST_RUN_WINDOW, source: 'first-run' });
  });
  it.each([null, {}, { start: 5, end: 5 }, { start: -1, end: 6 }, { start: 1.5, end: 20 }, { start: 0, end: 1440 }])('rejects invalid persisted window %j', lastUsed => {
    expect(resolveFreeWindow({ lastUsed }).source).toBe('first-run');
  });
  it('accepts a wrapped last-used window', () => expect(resolveFreeWindow({ lastUsed: { start: 1320, end: 120 } }).source).toBe('last'));
  it('makes implicit course scope explicit and preserves manual item order', () => {
    const overrides = { removed: ['task:1'], skipped: ['reviewer:2'] };
    expect(applyPlanOverrides({ order: 'smart', courseIds: ['c'] }, candidates, overrides)).toEqual({ order: 'smart', courseIds: ['c'], items: [{ kind: 'task', id: '3' }] });
    expect(applyPlanOverrides({ order: 'manual', items: [item('4'), item('3'), item('1')] }, candidates, overrides).items).toEqual([{ kind: 'task', id: '4' }, { kind: 'task', id: '3' }]);
    expect(applyPlanOverrides({ order: 'smart', items: [] }, candidates, overrides).items).toEqual([]);
  });
  it('lists skipped before removed in candidate order, once per target', () => {
    expect(takenOutItems(candidates, { skipped: ['task:3', 'task:1'], removed: ['task:4', 'task:1'] }).map(({ key, reason }) => [key, reason])).toEqual([['task:1', 'skipped'], ['task:3', 'skipped'], ['task:4', 'removed']]);
  });
});
describe('PL1 manual order and snapshots', () => {
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const selection = { order: 'manual' as const, courseIds: [id(10)], items: [1, 2, 3].map(n => ({ kind: 'reviewer' as const, id: id(n) })) };
  const plan = generateContentStudyPlan({ mode: 'reviewers', planningRange: range, availability: [range], tasks: [], reviewers: [1, 2, 3].map(n => ({ id: id(n), title: `Reviewer ${n}`, courseId: id(10), estimatedMinutes: 45 })), selection });
  it('swaps adjacent targets, retains selected not-fit targets and course scope', () => {
    expect(moveProposalUp({ ...plan, selection }, 1)).toEqual({ ...selection, items: [selection.items[1], selection.items[0], selection.items[2]] });
    expect(moveProposalUp({ ...plan, selection }, 0)).toEqual(selection);
    expect(moveProposalUp({ ...plan, selection }, -1)).toEqual(selection);
  });
  it('timeline drop changes global order, retaining not-fit work, scope and canonical aliases', () => {
    expect(reorderProposal({ ...plan, selection }, [`reviewer:${id(2)}`, `reviewer:${id(1)}`])).toEqual({ ...selection, items: [selection.items[1], selection.items[0], selection.items[2]] });
    expect(reorderProposal({ ...plan, selection }, ['unknown'])).toEqual(selection);
  });
  it('snapshots session times/kinds/titles and restores exact target order manually', () => {
    const snapshot = snapshotFromPlan('2026-10-27', 1200, 1320, plan);
    expect(snapshot.sessions[0]).toEqual({ kind: 'reviewer', id: id(1), title: 'Reviewer 1', courseId: id(10), startMinute: 1200, minutes: 45 });
    expect(restoreSelectionFromSnapshot(snapshot)).toEqual({ order: 'manual', items: plan.sessions.map(s => ({ kind: 'reviewer', id: 'reviewerId' in s ? s.reviewerId : '' })) });
  });
  it('deduplicates split target sessions for the strict selection contract', () => {
    const snapshot = snapshotFromPlan('2026-10-27', 1200, 1320, { ...plan, sessions: [plan.sessions[0]!, plan.sessions[0]!] });
    expect(restoreSelectionFromSnapshot(snapshot).items).toHaveLength(1);
  });
  it('moves by proposal block index before deduplicating split target sessions', () => {
    const split = { ...plan, selection, sessions: [plan.sessions[0]!, plan.sessions[0]!, plan.sessions[1]!] };
    expect(moveProposalUp(split, 1).items).toEqual(selection.items);
  });
});
it('cleans piped all-caps course names and preserves non-piped names', () => {
  expect(splitCourseName('CC17 | CITCS 3F Group A | MOBILE APPLICATION DESIGN AND DEVELOPMENT')).toEqual({ code: 'CC17', name: 'Mobile Application Design and Development' });
  expect(splitCourseName('C | Section | THE ART OF DESIGN IN THE WORLD FOR ALL TO SEE')).toEqual({ code: 'C', name: 'The Art of Design in the World for All to See' });
  expect(splitCourseName('C | Already Mixed Case')).toEqual({ code: 'C', name: 'Already Mixed Case' });
  expect(splitCourseName('Plain Course')).toEqual({ code: 'Plain Course', name: '' });
});

it('saved cross-course order normalizes Canvas aliases and preserves unchecked exclusions and remaining work', () => {
  const data = { ...candidates, courses: [{ ...candidates.courses[0]!, items: candidates.courses[0]!.items.map(item => item.id === '1' ? { ...item, canvasAssignmentId: 'canonical' } : item) }] };
  const selected = applyPlanOverrides({ order: 'smart' }, data, { removed: ['task:3'], skipped: [] });
  expect(orderPlanningSelection(selected, data, ['task:4', 'task:canonical'])).toEqual({ order: 'manual', items: [{ kind: 'task', id: '4' }, { kind: 'task', id: '1' }, { kind: 'reviewer', id: '2' }] });
});
