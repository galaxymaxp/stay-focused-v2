import { generateContentStudyPlan, type PlanMode, type PlanSelection, type PlanningCandidate, type PlanningCandidates } from './task-planning';
import { isReviewerProposal, proposalTitle, type DeterministicStudyPlan } from './task-planning';
import { validFreeTime, type FreeTimeRange } from './free-time';

export const FIRST_RUN_WINDOW = { start: 20 * 60, end: 22 * 60 } as const;
export function resolveFreeWindow(input: { savedForDate?: unknown; aroundPlanned?: unknown; lastUsed?: unknown }) {
  for (const [source, window] of [['saved', input.savedForDate], ['around', input.aroundPlanned], ['last', input.lastUsed], ['first-run', FIRST_RUN_WINDOW]] as const) {
    if (validFreeTime(window)) return { window: { start: window.start, end: window.end }, source };
  }
  throw new Error('Invalid first-run window');
}
export interface PlanOverrides { readonly removed: readonly string[]; readonly skipped: readonly string[] }
/** Materialize implicit scope before excluding keys; retain smart/manual semantics. */
export function applyPlanOverrides(selection: PlanSelection, candidates: PlanningCandidates, overrides: PlanOverrides): PlanSelection {
  const excluded = new Set([...overrides.removed, ...overrides.skipped]);
  const items = selection.items ?? allPlanningItems(candidates).filter(item =>
    !selection.courseIds || (!!item.courseId && selection.courseIds.includes(item.courseId)));
  const aliases = new Map(allPlanningItems(candidates).map(item => [planningItemKey(item), item.canvasAssignmentId ? `task:${item.canvasAssignmentId}` : planningItemKey(item)]));
  return { ...selection, items: items.filter(item => !excluded.has(planningItemKey(item)) && !excluded.has(aliases.get(planningItemKey(item)) ?? '')).map(({ kind, id }) => ({ kind, id })) };
}
export function takenOutItems(candidates: PlanningCandidates, overrides: PlanOverrides) {
  const items = allPlanningItems(candidates), skipped = new Set(overrides.skipped), removed = new Set(overrides.removed);
  const has = (keys: Set<string>, item: PlanningCandidate) => keys.has(planningItemKey(item)) || keys.has(planningOverrideKey(item));
  return [
    ...items.filter(item => has(skipped, item)).map(item => ({ key: planningOverrideKey(item), item, reason: 'skipped' as const })),
    ...items.filter(item => has(removed, item) && !has(skipped, item)).map(item => ({ key: planningOverrideKey(item), item, reason: 'removed' as const })),
  ];
}
/** selection is local request metadata; legacy server responses need no new fields. */
export function moveProposalUp(plan: DeterministicStudyPlan & { readonly selection?: PlanSelection }, index: number): PlanSelection {
  const proposed = plan.sessions.map(session => {
    const kind = isReviewerProposal(session) ? 'reviewer' as const : 'task' as const;
    const id = isReviewerProposal(session) ? session.reviewerId : session.taskId;
    return { kind, id: plan.planningTargets?.find(target => target.kind === kind && target.id === id)?.selectionId ?? id };
  });
  if (Number.isInteger(index) && index > 0 && index < proposed.length) [proposed[index - 1], proposed[index]] = [proposed[index]!, proposed[index - 1]!];
  const items = [...new Map(proposed.map(item => [planningItemKey(item), item])).values()];
  const seen = new Set(items.map(planningItemKey));
  const rest = plan.selection?.items ?? plan.notFit ?? [];
  for (const item of rest) {
    const target = { kind: item.kind, id: plan.planningTargets?.find(target => target.kind === item.kind && target.id === item.id)?.selectionId ?? item.id };
    if (!seen.has(planningItemKey(target))) { items.push(target); seen.add(planningItemKey(target)); }
  }
  return { order: 'manual', items, ...(plan.selection?.courseIds ? { courseIds: plan.selection.courseIds } : {}) };
}
/** Timeline drops may cross course groups. Retain selected work outside the
 * visible proposal and normalize server task IDs to canonical selection IDs. */
export function reorderProposal(plan: DeterministicStudyPlan & { readonly selection?: PlanSelection }, keys: readonly string[]): PlanSelection {
  const selection = moveProposalUp(plan, 0);
  const canonical = (key: string) => {
    const target = plan.planningTargets?.find(target => planningItemKey(target) === key);
    return target ? planningItemKey({ kind: target.kind, id: target.selectionId }) : key;
  };
  const ranks = new Map([...new Set(keys.map(canonical))].map((key, index) => [key, index]));
  return { ...selection, items: [...(selection.items ?? [])].sort((a, b) => (ranks.get(planningItemKey(a)) ?? Infinity) - (ranks.get(planningItemKey(b)) ?? Infinity)) };
}
export interface PlanSnapshot extends FreeTimeRange {
  readonly date: string;
  readonly sessions: readonly { readonly kind: 'task' | 'reviewer'; readonly id: string; readonly title: string;
    readonly courseId: string | null; readonly startMinute: number; readonly minutes: number }[];
}
export function snapshotFromPlan(date: string, start: number, end: number, plan: DeterministicStudyPlan): PlanSnapshot {
  return { date, start, end, sessions: plan.sessions.map(session => {
    const at = new Date(session.startsAt);
    const day = new Date(at.getFullYear(), at.getMonth(), at.getDate());
    const base = new Date(`${date}T00:00:00`);
    return { kind: isReviewerProposal(session) ? 'reviewer' : 'task', id: isReviewerProposal(session) ? session.reviewerId : session.taskId,
      title: proposalTitle(session), courseId: isReviewerProposal(session) ? session.courseId : plan.planningTargets?.find(target => target.kind === 'task' && target.id === session.taskId)?.courseId ?? null,
      startMinute: Math.round((day.getTime() - base.getTime()) / 86_400_000) * 1440 + at.getHours() * 60 + at.getMinutes(), minutes: session.durationMinutes };
  }) };
}
export function restoreSelectionFromSnapshot(snapshot: PlanSnapshot): PlanSelection {
  return { order: 'manual', items: [...new Map(snapshot.sessions.map(({ kind, id }) => [planningItemKey({ kind, id }), { kind, id }])).values()] };
}
export function splitCourseName(raw: string): { code: string; name: string } {
  if (!raw.includes('|')) return { code: raw, name: '' };
  const parts = raw.split('|').map(part => part.trim()), name = parts.at(-1) ?? '';
  const small = new Set(['and', 'in', 'of', 'the', 'for', 'to']);
  return { code: parts[0] ?? '', name: name === name.toUpperCase() ? name.toLowerCase().split(/\s+/u)
    .map((word, index) => index > 0 && small.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : name };
}

export const planningItemKey = (item: { kind: string; id: string }) => `${item.kind}:${item.id}`;
/** Canvas exclusions follow the stable assignment alias across local admission. */
export const planningOverrideKey = (item: PlanningCandidate) => item.canvasAssignmentId ? `task:${item.canvasAssignmentId}` : planningItemKey(item);
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
