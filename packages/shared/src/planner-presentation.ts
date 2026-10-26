import { clockTimeLabel, freeTimeDuration } from './free-time';
import { allPlanningItems, planningItemKey, planningOverrideKey, type PlanningDraft, type PlanOverrides } from './planning-sheet';
import { previousPlanData } from './previous-plan';
import { isReviewerProposal, proposalTargetKey, proposalTitle, type DeterministicStudyPlan, type PlanningCandidates } from './task-planning';
import type { TodayItem } from './experience';

export type PreviousPlanView = ReturnType<typeof previousPlanData>;
export interface PlannerBlock {
  readonly key: string; readonly targetKey: string; readonly selectionKey: string; readonly title: string;
  readonly kind: 'task' | 'reviewer'; readonly id: string; readonly courseId: string | null;
  readonly start: string; readonly minutes: number; readonly savedItem?: TodayItem;
}
export function plannerDuration(minutes: number): string {
  const whole = Math.round(minutes), hours = Math.floor(whole / 60), rest = whole % 60;
  return hours ? `${hours} h${rest ? ` ${rest} min` : ''}` : `${rest} min`;
}
export const plannerShortTime = (minute: number) => clockTimeLabel(minute).replace(/\s[AP]M$/u, '');
export const plannerWindowLabel = (start: number, end: number) => `${clockTimeLabel(start)} – ${clockTimeLabel(end)} · ${plannerDuration(freeTimeDuration(start, end))} free`;
export const PREVIOUS_PLAN_EMPTY = 'After tonight, your last plan shows here with what you finished, so you can restore it or compare it with the next proposal.';
export const WELCOME_TITLE = 'We picked 8–10 PM to start';
export const WELCOME_BODY = 'Your plan is already built for that window. Drag either end of the arc to match your evenings, and the plan rebuilds itself.';

export function draftWithOverrides(data: PlanningCandidates, draft: PlanningDraft, overrides?: PlanOverrides): PlanningDraft {
  const excluded = new Set([...(overrides?.removed ?? []), ...(overrides?.skipped ?? [])]);
  return { ...draft, checked: draft.checked.filter(key => {
    const item = allPlanningItems(data).find(item => planningItemKey(item) === key);
    return !excluded.has(key) && (!item || !excluded.has(planningOverrideKey(item)));
  }) };
}
/** The server proposal wins. Saved sessions are shown when there is no new proposal. */
export function plannerBlocks(plan: DeterministicStudyPlan | null, candidates: PlanningCandidates | null = null, timeline: readonly TodayItem[] = []): readonly PlannerBlock[] {
  if (!plan) return timeline.filter(item => item.kind === 'study_session' && item.status === 'planned' && item.startAt && item.endAt)
    .sort((a, b) => Date.parse(a.startAt!) - Date.parse(b.startAt!)).map(item => ({
      key: item.id, selectionKey: item.reviewer ? `reviewer:${item.reviewer.id.replace(/^artifact:/u, '')}` : item.task ? `task:${item.task.id}` : '', targetKey: item.reviewer ? `reviewer:${item.reviewer.id.replace(/^artifact:/u, '')}` : item.task ? `task:${item.task.id}` : item.id,
      title: item.title, kind: item.reviewer ? 'reviewer' : 'task', id: item.reviewer?.id ?? item.deepLinkTarget.id,
      courseId: item.course?.id ?? null, start: plannerShortTime(new Date(item.startAt!).getHours() * 60 + new Date(item.startAt!).getMinutes()),
      minutes: Math.round((Date.parse(item.endAt!) - Date.parse(item.startAt!)) / 60000), savedItem: item,
    }));
  const items = candidates ? allPlanningItems(candidates) : [];
  return plan.sessions.map(session => {
    const kind = isReviewerProposal(session) ? 'reviewer' as const : 'task' as const;
    const id = isReviewerProposal(session) ? session.reviewerId : session.taskId;
    const target = plan.planningTargets?.find(target => target.kind === kind && target.id === id);
    const candidate = items.find(item => item.kind === kind && (item.id === id || item.id === target?.selectionId || item.canvasAssignmentId === id || (!!target && item.canvasAssignmentId === target.selectionId)));
    const at = new Date(session.startsAt);
    return { key: session.proposalId, selectionKey: planningItemKey({ kind, id: candidate?.id ?? target?.selectionId ?? id }), targetKey: proposalTargetKey(session), title: proposalTitle(session), kind, id,
      courseId: isReviewerProposal(session) ? session.courseId : target?.courseId ?? candidate?.courseId ?? null,
      start: plannerShortTime(at.getHours() * 60 + at.getMinutes()), minutes: session.durationMinutes };
  });
}
/** Use the existing ring palette, consistently keyed by course on planner content. */
export const plannerToneTarget = (block: Pick<PlannerBlock, 'courseId' | 'targetKey'>) => block.courseId ?? block.targetKey;
export function plannerToneKeys(blocks: readonly PlannerBlock[], courses: readonly { id: string }[] = []) {
  return [...new Set([...courses.map(course => course.id), ...blocks.map(plannerToneTarget)])];
}
export function plannerFit(plan: DeterministicStudyPlan | null, blocks: readonly PlannerBlock[], free: number) {
  const used = blocks.reduce((sum, block) => sum + block.minutes, 0);
  const waiting = plan?.notFit?.length ?? plan?.unscheduledWork.length ?? 0;
  const waitingMinutes = plan?.notFit?.reduce((sum, item) => sum + item.minutes, 0) ?? plan?.unscheduledWork.reduce((sum, item) => sum + item.unscheduledMinutes, 0) ?? 0;
  return { used, free, headline: !blocks.length ? 'Nothing fits yet' : !waiting ? 'Everything fits' : `${blocks.length} blocks fill your ${plannerDuration(free)}`,
    ratio: `${used} / ${free} min`, subline: waiting ? `${waiting} more items (${plannerDuration(waitingMinutes)}) wait for your next free window.` : 'Every selected item is in tonight’s plan.',
    segments: blocks.map(block => ({ key: block.key, targetKey: plannerToneTarget(block), fraction: Math.min(1, block.minutes / Math.max(1, free)) })) };
}
