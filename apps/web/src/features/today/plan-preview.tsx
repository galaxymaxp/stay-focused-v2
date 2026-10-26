"use client";
import { plannerShortTime, freeTimeDuration, plannerBlocks, plannerFit, PREVIOUS_PLAN_EMPTY, type PlannerBlock, type PreviousPlanView } from '@stay-focused/shared';
import type { DeterministicStudyPlan, PlanningCandidates } from '@stay-focused/shared/task-planning';
import { planToneFor } from '../day-clock/timeline';

export function PlanFitCard({ plan, blocks, free }: { plan: DeterministicStudyPlan | null; blocks: readonly PlannerBlock[]; free: number }) {
  const fit = plannerFit(plan, blocks, free), targets = blocks.map(block => block.targetKey);
  return <section className="planner-fit" aria-label="Plan fit"><div className="planner-fit-heading"><strong>{fit.headline}</strong><span className="meta">{fit.ratio}</span></div>
    <div className="planner-fit-bar" role="img" aria-label={fit.ratio}>{fit.segments.map(segment => <span key={segment.key} data-testid="fit-segment" style={{ width: `${segment.fraction * 100}%`, background: `var(--${planToneFor(targets, segment.targetKey)})` }} />)}</div>
    <p className="meta">{fit.subline}</p></section>;
}
export function PlannerDot({ targets, target }: { targets: readonly string[]; target: string }) {
  return <span className="planner-dot" aria-hidden="true" style={{ background: `var(--${planToneFor(targets, target)})` }} />;
}
export function PlanTimeline({ blocks, end, candidates, onOpen }: { blocks: readonly PlannerBlock[]; end: number; candidates?: PlanningCandidates | null; onOpen?: (block: PlannerBlock) => void }) {
  const targets = blocks.map(block => block.targetKey);
  return <div className="planner-timeline" aria-label="Plan timeline">{blocks.map(block => <div className="planner-block" key={block.key}><span className="planner-time">{block.start}</span>
    <button type="button" className="planner-block-card" onClick={() => onOpen?.(block)} disabled={!onOpen} aria-label={`${block.kind === 'reviewer' ? 'Review: ' : ''}${block.title}`}>
      <span className="planner-block-course"><PlannerDot targets={targets} target={block.targetKey} />{candidates?.courses.find(course => course.id === block.courseId)?.name.split('|')[0]?.trim() ?? block.savedItem?.course?.code ?? 'Personal'}</span>
      <strong>{block.title}</strong><span className="meta">{block.minutes} min · {block.kind === 'reviewer' ? 'Reviewer' : 'Task'}</span>
    </button></div>)}<div className="planner-block planner-end"><span className="planner-time">{plannerShortTime(end)}</span><span className="meta">Free time ends</span></div></div>;
}
export function PreviousPlan({ previous, onRestore, disabled }: { previous: PreviousPlanView; onRestore: () => void; disabled?: boolean }) {
  if (!previous) return <section className="planner-previous-empty"><strong>No previous plan yet</strong><p className="meta">{PREVIOUS_PLAN_EMPTY}</p></section>;
  const done = previous.sessions.filter(session => session.status === 'Done').length;
  return <div className="planner-proposal"><section className="planner-fit"><strong>{previous.summary}</strong>{previous.sessions.some(session => session.status !== null) && <p className="meta">{done} of {previous.sessions.length} blocks done.</p>}</section>
    <div className="planner-timeline">{previous.sessions.map((session, index) => <div className="planner-block" key={`${session.kind}:${session.id}:${index}`}><span className="planner-time">{plannerShortTime(session.startMinute)}</span><div className="planner-block-card"><strong>{session.title}</strong><span className="meta">{session.status ?? `${session.minutes} min · ${session.kind === 'reviewer' ? 'Reviewer' : 'Task'}`}</span></div></div>)}</div>
    <button type="button" className="planner-outline" disabled={disabled} onClick={onRestore}>Restore this plan</button></div>;
}
/** Standalone preview uses the same components as the inline Today planner. */
export function PlanPreview({ plan, from, to, busy, onApply }: { plan: DeterministicStudyPlan; from: number; to: number; busy: boolean; onApply: () => void; onDiscard?: () => void }) {
  const blocks = plannerBlocks(plan);
  return <section className="planner-proposal" aria-label="Proposed plan"><PlanFitCard plan={plan} blocks={blocks} free={freeTimeDuration(from, to)} /><PlanTimeline blocks={blocks} end={to} /><button className="planner-primary" disabled={busy || !blocks.length} onClick={onApply}>Use this plan</button></section>;
}
