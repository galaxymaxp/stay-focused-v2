import { generateContentStudyPlan, type PlanMode, type PlanSelection, type PlanningCandidate, type PlanningCandidates } from './task-planning';

export const planningItemKey = (item: { kind: string; id: string }) => `${item.kind}:${item.id}`;
export interface PlanningDraft {
  readonly courses: 'all' | 'select';
  readonly courseIds: readonly string[];
  readonly mode: PlanMode;
  readonly order: 'smart' | 'manual';
  readonly groupOrder: readonly string[];
  readonly itemOrder: readonly string[];
  readonly checked: readonly string[];
}
export const allPlanningItems = (data: PlanningCandidates): readonly PlanningCandidate[] => [...data.courses.flatMap(course => course.items), ...data.personalItems];
export function defaultPlanningDraft(data: PlanningCandidates): PlanningDraft {
  const items = allPlanningItems(data);
  return { courses: 'all', courseIds: data.courses.map(course => course.id), mode: 'reviewers_tasks', order: 'smart',
    groupOrder: [...data.courses.map(course => course.id), ...(data.personalItems.length ? ['personal'] : [])],
    itemOrder: items.map(planningItemKey), checked: items.filter(item => !item.openedWithin24h).map(planningItemKey) };
}
export function scopedPlanningItems(data: PlanningCandidates, draft: PlanningDraft): readonly PlanningCandidate[] {
  const rank = new Map(draft.itemOrder.map((key, index) => [key, index]));
  const items = allPlanningItems(data).filter(item =>
    (draft.courses === 'all' || (!!item.courseId && draft.courseIds.includes(item.courseId))) &&
    (draft.mode === 'reviewers_tasks' || item.kind === (draft.mode === 'tasks' ? 'task' : 'reviewer')));
  return [...items].sort((a, b) => draft.groupOrder.indexOf(a.courseId ?? 'personal') - draft.groupOrder.indexOf(b.courseId ?? 'personal') ||
    (rank.get(planningItemKey(a)) ?? Infinity) - (rank.get(planningItemKey(b)) ?? Infinity));
}
export function builtPlanningSelection(data: PlanningCandidates, draft: PlanningDraft): PlanSelection {
  return { order: draft.order, ...(draft.courses === 'select' ? { courseIds: draft.courseIds } : {}),
    items: scopedPlanningItems(data, draft).filter(item => draft.checked.includes(planningItemKey(item))).map(({ kind, id }) => ({ kind, id })) };
}
export function planningDraftSummary(data: PlanningCandidates, draft: PlanningDraft) {
  const selection = builtPlanningSelection(data, draft);
  const items = allPlanningItems(data);
  const plan = generateContentStudyPlan({ mode: draft.mode, planningRange: data.planningRange, availability: data.availability, selection,
    tasks: items.filter(item => item.kind === 'task').map(item => ({ id: item.id, title: item.title, courseId: item.courseId,
      estimatedMinutes: item.estimateMinutes, dueAt: item.dueAt, priority: item.priority, createdAt: item.createdAt })),
    reviewers: items.filter(item => item.kind === 'reviewer').sort((a, b) => (a.smartRank ?? 0) - (b.smartRank ?? 0))
      .map(item => ({ id: item.id, title: item.title, courseId: item.courseId, estimatedMinutes: item.estimateMinutes })),
  });
  const keys = new Set(selection.items?.map(planningItemKey));
  return { count: keys.size, minutes: items.filter(item => keys.has(planningItemKey(item))).reduce((sum, item) => sum + item.estimateMinutes, 0),
    notFitMinutes: plan.notFit?.reduce((sum, item) => sum + item.minutes, 0) ?? 0, plan };
}
export function togglePlanningItems(draft: PlanningDraft, keys: readonly string[]): PlanningDraft {
  const checked = new Set(draft.checked);
  const remove = keys.every(key => checked.has(key));
  for (const key of keys) { if (remove) checked.delete(key); else checked.add(key); }
  return { ...draft, checked: [...checked] };
}
/** Same visible-item move semantics as Library; reject cross-course row drops. */
export function movePlanningEntry(data: PlanningCandidates, draft: PlanningDraft, from: string, to: string, group = false): PlanningDraft {
  const items = allPlanningItems(data);
  if (!group) {
    const source = items.find(item => planningItemKey(item) === from), target = items.find(item => planningItemKey(item) === to);
    if (!source || !target || source.courseId !== target.courseId) return draft;
  }
  const order = [...(group ? draft.groupOrder : draft.itemOrder)];
  const source = order.indexOf(from), target = order.indexOf(to);
  if (source < 0 || target < 0 || source === target) return draft;
  order.splice(source, 1); order.splice(target, 0, from);
  return { ...draft, order: 'manual', ...(group ? { groupOrder: order } : { itemOrder: order }) };
}
export function resetPlanningOrder(data: PlanningCandidates, draft: PlanningDraft): PlanningDraft {
  const defaults = defaultPlanningDraft(data);
  return { ...draft, order: 'smart', groupOrder: defaults.groupOrder, itemOrder: defaults.itemOrder };
}
export const planningSelectionHash = (mode: PlanMode, selection?: PlanSelection) => JSON.stringify([mode, selection ?? null]);

/** Device-process memory survives navigation; date/owner changes and a fresh
 * JS process (reload) start with defaults. Never synchronized or stored on disk. */
export function createPlanningSessionMemory<T>() {
  let current: { identity: string; value: T } | null = null;
  return {
    read(identity: string): T | null { if (current?.identity !== identity) current = null; return current?.value ?? null; },
    build(identity: string, value: T) { current = { identity, value }; },
    reset() { current = null; },
  };
}

/** A middle ellipsis preserves file extensions; the complete name remains the a11y label. */
export function planningTitle(title: string, limit = 70): string {
  if (title.length <= limit) return title;
  const extension = /\.[^.\s]+$/u.exec(title)?.[0] ?? '';
  const tail = Math.max(extension.length, Math.min(24, Math.floor((limit - 1) / 2)));
  return `${title.slice(0, Math.max(1, limit - tail - 1))}…${title.slice(-tail)}`;
}
