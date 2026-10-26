import { expect, it } from 'vitest';
import { plannerBlocks, plannerFit, plannerToneKeys, plannerToneTarget } from './planner-presentation';
import { defaultPlanningDraft, planningDraftSummary } from './planning-sheet';
import type { PlanningCandidates } from './task-planning';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const range = { startsAt: '2026-10-27T12:00:00.000Z', endsAt: '2026-10-27T14:00:00.000Z' };
const data: PlanningCandidates = {
  planningRange: range, availability: [range], freeWindowMinutes: 120, personalItems: [],
  courses: [{ id: id(1), name: 'Synthetic course', items: [
    { kind: 'task', id: id(2), canvasAssignmentId: id(3), title: 'Synthetic task', courseId: id(1), estimateMinutes: 150, openedWithin24h: false, dueAt: null, priority: 'medium', createdAt: range.startsAt },
  ] }],
};
const plan = planningDraftSummary(data, defaultPlanningDraft(data)).plan;

it('fit uses actual session minutes, waiting minutes and course-keyed fractions', () => {
  const blocks = plannerBlocks(plan, data), fit = plannerFit(plan, blocks, 120);
  expect(fit).toMatchObject({ used: 120, free: 120, ratio: '120 / 120 min', headline: `${blocks.length} blocks fill your 2 h`, subline: '1 more items (30 min) wait for your next free window.' });
  expect(fit.segments.reduce((sum, segment) => sum + segment.fraction, 0)).toBe(1);
  expect(fit.segments.every(segment => segment.targetKey === id(1))).toBe(true);
});
it('fit distinguishes everything fitting from an empty proposal', () => {
  const fitted = { ...plan, notFit: [], unscheduledWork: [] };
  expect(plannerFit(fitted, plannerBlocks(fitted, data), 120).headline).toBe('Everything fits');
  expect(plannerFit(null, [], 120)).toMatchObject({ headline: 'Nothing fits yet', ratio: '0 / 120 min', segments: [] });
});
it('course tones stay stable between the fit, timeline and course list when order changes', () => {
  const blocks = plannerBlocks(plan, data);
  expect(plannerToneKeys([...blocks].reverse(), [{ id: id(9) }, { id: id(1) }])).toEqual([id(9), id(1)]);
  expect(blocks.map(plannerToneTarget)).toEqual(blocks.map(() => id(1)));
  expect(plannerToneTarget({ courseId: null, targetKey: 'task:personal' })).toBe('task:personal');
});
it('Canvas aliases resolve back to the candidate check key for every split block', () => {
  const aliased = { ...plan, sessions: plan.sessions.map(session => ({ ...session, taskId: id(3) })), planningTargets: [{ kind: 'task' as const, id: id(3), selectionId: id(3), title: 'Synthetic task', courseId: id(1) }] };
  expect(plannerBlocks(aliased, data).map(block => block.selectionKey)).toEqual(plan.sessions.map(() => `task:${id(2)}`));
  expect(plannerBlocks(aliased, data).every(block => block.courseId === id(1))).toBe(true);
});
