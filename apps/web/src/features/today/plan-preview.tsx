"use client";
import { plannerShortTime, freeTimeDuration, plannerBlocks, plannerToneKeys, plannerToneTarget, plannerFit, PREVIOUS_PLAN_EMPTY, type PlannerBlock, type PreviousPlanView } from '@stay-focused/shared';
import type { DeterministicStudyPlan, PlanningCandidates } from '@stay-focused/shared/task-planning';
import { planToneFor } from '../day-clock/timeline';

export function PlanFitCard({ plan, blocks, free, candidates }: { plan: DeterministicStudyPlan | null; blocks: readonly PlannerBlock[]; free: number; candidates?: PlanningCandidates | null }) {
  const fit = plannerFit(plan, blocks, free), targets = plannerToneKeys(blocks, candidates?.courses);
  return <section className="planner-fit" aria-label="Plan fit"><div className="planner-fit-heading"><strong>{fit.headline}</strong><span className="meta">{fit.ratio}</span></div>
    <div className="planner-fit-bar" role="img" aria-label={fit.ratio}>{fit.segments.map(segment => <span key={segment.key} data-testid="fit-segment" style={{ width: `${segment.fraction * 100}%`, background: `var(--${planToneFor(targets, segment.targetKey)})` }} />)}</div>
    <p className="meta">{fit.subline}</p></section>;
}
export function PlannerDot({ targets, target }: { targets: readonly string[]; target: string }) {
  return <span className="planner-dot" aria-hidden="true" style={{ background: `var(--${planToneFor(targets, target)})` }} />;
}
export function PlanTimeline({ blocks, end, candidates, onOpen, onSkip, onRemove, onMoveUp }: { blocks: readonly PlannerBlock[]; end: number; candidates?: PlanningCandidates | null; onOpen?: (block: PlannerBlock) => void; onSkip?: (key: string) => void; onRemove?: (key: string) => void; onMoveUp?: (index: number) => void }) {
  const targets = plannerToneKeys(blocks, candidates?.courses);
  return <div className="planner-timeline" aria-label="Plan timeline">{blocks.map((block, index) => <div className="planner-block" key={block.key}><span className="planner-time">{block.start}</span><div className="planner-action-card">
    <button type="button" className="planner-block-card" onClick={() => onOpen?.(block)} disabled={!onOpen} aria-label={`${block.kind === 'reviewer' ? 'Review: ' : ''}${block.title}`}>
      <span className="planner-block-course"><PlannerDot targets={targets} target={plannerToneTarget(block)} />{candidates?.courses.find(course => course.id === block.courseId)?.name.split('|')[0]?.trim() ?? block.savedItem?.course?.code ?? 'Personal'}</span>
      <strong>{block.title}</strong><span className="meta">{block.minutes} min · {block.kind === 'reviewer' ? 'Reviewer' : 'Task'}</span>
    </button>{onSkip && onRemove && onMoveUp && <div className="planner-block-actions" role="group" aria-label={`Actions for ${block.title}`}>
      <button type="button" aria-label="Move up" title="Move up" disabled={index === 0 || !block.selectionKey} onClick={() => onMoveUp(index)}><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 11.5V2.5M3 6.5l4-4 4 4" /></svg></button>
      <button type="button" aria-label="Skip tonight" title="Skip tonight" disabled={!block.selectionKey} onClick={() => onSkip(block.selectionKey)}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 2l12 12M6.6 6.7a2 2 0 002.7 2.7M4.2 4.4C2.9 5.3 2 6.6 1.5 8c1.1 3 3.8 5 6.5 5 1.3 0 2.5-.4 3.6-1.1M7 3.1c.3 0 .7-.1 1-.1 2.7 0 5.4 2 6.5 5-.3.8-.7 1.5-1.2 2.2" /></svg></button>
      <button type="button" aria-label="Remove" title="Remove" disabled={!block.selectionKey} onClick={() => onRemove(block.selectionKey)}><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8" /></svg></button>
    </div>}</div></div>)}<div className="planner-block planner-end"><span className="planner-time">{plannerShortTime(end)}</span><span className="meta">Free time ends</span></div></div>;
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
