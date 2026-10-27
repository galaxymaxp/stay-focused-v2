import { describe, expect, it } from 'vitest';
import { generateContentStudyPlan, generateDeterministicStudyPlan, selectReviewerCandidates, validateStudyPlanningRequest, type PlannerTask, type PlanningCandidates } from './task-planning';
import { createPlanningSessionMemory, builtPlanningSelection, defaultPlanningDraft, movePlanningEntry, planningCourseGroups, planningDraftSummary, planningTitle, resetPlanningOrder, scopedPlanningItems, togglePlanningCourse, togglePlanningItems } from './planning-sheet';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const range = { startsAt: '2026-10-25T00:00:00.000Z', endsAt: '2026-10-26T00:00:00.000Z' };
const free = [{ startsAt: '2026-10-25T09:00:00.000Z', endsAt: '2026-10-25T11:00:00.000Z' }];
const tasks: PlannerTask[] = [1, 2].map(n => ({ id: id(n), title: `Task ${n}`, courseId: id(n + 10), estimatedMinutes: 80,
  dueAt: null, priority: 'medium', createdAt: `2026-10-0${n}T00:00:00.000Z` }));
const reviewers = [3, 4].map(n => ({ id: id(n), title: `Review ${n}`, courseId: id(11), estimatedMinutes: 20 }));
const input = { mode: 'reviewers_tasks' as const, tasks, reviewers, planningRange: range, availability: free };
const data: PlanningCandidates = { planningRange: range, availability: free, freeWindowMinutes: 120,
  courses: [11, 12].map(n => ({ id: id(n), name: `Course ${n}`, items: [
    ...tasks.filter(task => task.courseId === id(n)).map(task => ({ ...task, courseId: task.courseId!, kind: 'task' as const, estimateMinutes: task.estimatedMinutes, openedWithin24h: false })),
    ...reviewers.filter(item => item.courseId === id(n)).map((item, smartRank) => ({ ...item, kind: 'reviewer' as const, smartRank, estimateMinutes: 20,
      openedWithin24h: false, dueAt: null, priority: 'medium' as const, createdAt: range.startsAt })),
  ] })), personalItems: [] };
describe('TP2 selection contract and sheet model', () => {
  it.each(['.pdf', '.pptx', '.customextension'])('keeps %s intact in narrow middle-ellipsis titles', extension => {
    const title = `A long synthetic instructional filename${extension}`;
    const display = planningTitle(title, 8);
    expect(display).toContain('…'); expect(display.endsWith(extension)).toBe(true);
    expect(planningTitle('Short.pdf', 20)).toBe('Short.pdf');
  });
  it('leaves omitted-selection and old mode-only requests byte-identical', () => {
    const plan = generateContentStudyPlan(input);
    expect(JSON.stringify(generateContentStudyPlan({ ...input, selection: undefined }))).toBe(JSON.stringify(plan));
    expect(validateStudyPlanningRequest({ planningRange: range, availability: free, mode: 'tasks' })).toMatchObject({ ok: true, value: { mode: 'tasks' } });
    expect(generateContentStudyPlan({ ...input, mode: 'tasks' })).toEqual({ ...generateDeterministicStudyPlan(input), mode: 'tasks', candidates: { tasks: 2, reviewers: 0 } });
  });
  it('default two-tap All/Both/smart equals the TP1 result and totals match not-fit', () => {
    const draft = defaultPlanningDraft(data), summary = planningDraftSummary(data, draft);
    const { notFit, ...plan } = summary.plan;
    expect(plan).toEqual(generateContentStudyPlan(input));
    expect(notFit?.reduce((sum, item) => sum + item.minutes, 0)).toBe(summary.notFitMinutes);
    expect(summary.minutes - summary.plan.sessions.reduce((sum, item) => sum + item.durationMinutes, 0)).toBe(summary.notFitMinutes);
  });
  it.each(['reviewers', 'tasks', 'reviewers_tasks'] as const)('restricts %s and one/several/no courses', mode => {
    const draft = { ...defaultPlanningDraft(data), courses: 'select' as const, courseIds: [id(11)], mode };
    const selected = scopedPlanningItems(data, draft);
    expect(selected.every(item => item.courseId === id(11))).toBe(true);
    expect(selected.every(item => mode === 'reviewers_tasks' || item.kind === (mode === 'tasks' ? 'task' : 'reviewer'))).toBe(true);
    expect(scopedPlanningItems(data, { ...draft, courseIds: [] })).toEqual([]);
    expect(scopedPlanningItems(data, { ...draft, courseIds: [id(11), id(12)], mode: 'reviewers_tasks' })).toHaveLength(4);
  });
  it('Courses list keeps unchecked courses listed and re-including all returns to all', () => {
    const draft = defaultPlanningDraft(data), off = togglePlanningCourse(data, draft, id(12));
    expect(off).toMatchObject({ courses: 'select', courseIds: [id(11)] });
    expect(planningCourseGroups(data, off).map(group => [group.id, group.included])).toEqual([[id(11), true], [id(12), false]]);
    expect(builtPlanningSelection(data, off).items?.every(item => item.kind === 'reviewer' || item.id === id(1))).toBe(true);
    expect(togglePlanningCourse(data, off, id(12))).toMatchObject({ courses: 'all', courseIds: [id(11), id(12)] });
    expect(planningCourseGroups(data, { ...draft, mode: 'reviewers' }).map(group => group.id)).toEqual([id(11)]);
  });
  it('honors manual order without the split and excludes later work after exhaustion', () => {
    const plan = generateContentStudyPlan({ ...input, selection: { order: 'manual', items: [
      { kind: 'reviewer', id: id(3) }, { kind: 'task', id: id(2) }, { kind: 'task', id: id(1) }, { kind: 'reviewer', id: id(4) },
    ] } });
    expect(plan.sessions.map(item => item.kind === 'reviewer' ? item.reviewerId : item.taskId)).toEqual([id(3), id(2), id(1)]);
    expect(plan.sessions.map(item => item.durationMinutes)).toEqual([20, 80, 20]);
    expect(plan.notFit).toEqual([{ kind: 'task', id: id(1), minutes: 60 }, { kind: 'reviewer', id: id(4), minutes: 20 }]);
  });
  it('keeps manual order chronological when a reviewer skips a short window before a busy gap', () => {
    const availability = [
      { startsAt: '2026-10-25T09:00:00.000Z', endsAt: '2026-10-25T09:10:00.000Z' },
      { startsAt: '2026-10-25T10:00:00.000Z', endsAt: '2026-10-25T10:40:00.000Z' },
    ];
    const plan = generateContentStudyPlan({ ...input, availability, tasks: [{ ...tasks[0]!, estimatedMinutes: 20 }],
      selection: { order: 'manual', items: [{ kind: 'reviewer', id: id(3) }, { kind: 'task', id: id(1) }] } });
    expect(plan.sessions.map(session => [session.kind ?? 'task', session.startsAt, session.durationMinutes])).toEqual([
      ['reviewer', '2026-10-25T10:00:00.000Z', 20], ['task', '2026-10-25T10:20:00.000Z', 20],
    ]);
    expect(plan.notFit).toEqual([]);
  });
  it('never overbooks or duplicates reviewer targets across disjoint windows', () => {
    const plan = generateContentStudyPlan({ ...input, availability: [free[0]!, { startsAt: '2026-10-25T12:00:00.000Z', endsAt: '2026-10-25T12:10:00.000Z' }], selection: { order: 'smart' } });
    expect(plan.sessions.reduce((sum, item) => sum + item.durationMinutes, 0)).toBeLessThanOrEqual(130);
    expect(plan.sessions.every(item => free.some(window => Date.parse(item.startsAt) >= Date.parse(window.startsAt) && Date.parse(item.endsAt) <= Date.parse(window.endsAt)) || Date.parse(item.startsAt) >= Date.parse('2026-10-25T12:00:00Z'))).toBe(true);
    expect(plan.sessions.filter(item => item.kind === 'reviewer' && item.reviewerId === id(3))).toHaveLength(1);
  });
  it('defaults recent reviewers off but explicit opt-in bypasses the 24h rule', () => {
    const source = { id: id(3), title: 'Review', courseId: id(11), createdAt: range.startsAt, reviewMinutes: 20, lastOpenedAt: range.startsAt };
    const args = { reviewers: [source], currentCourseIds: new Set([id(11)]), excludedIds: new Set<string>(), nextDueByCourse: new Map<string, number>(), now: Date.parse(range.startsAt) };
    expect(selectReviewerCandidates(args)).toEqual([]);
    expect(selectReviewerCandidates({ ...args, explicitlySelectedIds: new Set([id(3)]) })).toHaveLength(1);
    const recent = { ...data, courses: data.courses.map(course => ({ ...course, items: course.items.map(item => item.id === id(3) ? { ...item, openedWithin24h: true } : item) })) };
    const draft = defaultPlanningDraft(recent);
    expect(draft.checked).not.toContain(`reviewer:${id(3)}`);
    expect(builtPlanningSelection(recent, togglePlanningItems(draft, [`reviewer:${id(3)}`])).items).toContainEqual({ kind: 'reviewer', id: id(3) });
  });
  it('moves rows inside a course and whole groups, rejects cross-course, resets order and defaults', () => {
    const defaults = defaultPlanningDraft(data);
    const moved = movePlanningEntry(data, defaults, `reviewer:${id(3)}`, `task:${id(1)}`);
    expect(moved.order).toBe('manual');
    expect(movePlanningEntry(data, moved, `task:${id(1)}`, `task:${id(2)}`)).toBe(moved);
    expect(movePlanningEntry(data, moved, id(12), id(11), true).groupOrder[0]).toBe(id(12));
    expect(resetPlanningOrder(data, moved)).toEqual(defaults);
    expect(defaultPlanningDraft(data)).toEqual(defaults); // fresh date/reload
  });
  it.each([
    { order: 'random' }, { order: 'manual' }, { order: 'smart', courseIds: ['bad'] },
    { order: 'smart', courseIds: [id(11), id(11).toUpperCase()] },
    { order: 'smart', items: [{ kind: 'quiz', id: id(1) }] },
    { order: 'smart', items: [{ kind: 'task', id: id(1) }, { kind: 'task', id: id(1) }] },
    { order: 'smart', items: [{ kind: 'task', id: id(1), userId: id(1) }] },
  ])('rejects malformed selection %j', selection => {
    expect(validateStudyPlanningRequest({ planningRange: range, availability: free, selection })).toMatchObject({ ok: false });
  });
});

it('device session memory survives navigation, resets on owner/date and fresh reload', () => {
 const memory = createPlanningSessionMemory<string>();
 memory.build('a:2026-10-25', 'choice'); expect(memory.read('a:2026-10-25')).toBe('choice');
 expect(memory.read('a:2026-10-26')).toBeNull(); expect(memory.read('a:2026-10-25')).toBeNull();
 memory.build('a:2026-10-25', 'choice'); expect(memory.read('b:2026-10-25')).toBeNull();
 expect(createPlanningSessionMemory<string>().read('a:2026-10-25')).toBeNull();
});
