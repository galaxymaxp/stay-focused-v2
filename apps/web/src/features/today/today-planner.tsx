"use client";
import { builtPlanningSelection, defaultPlanningDraft, draftWithOverrides, movePlanningEntry, planningDraftSummary, planningItemKey, planningOverrideKey, plannerBlocks, plannerWindowLabel, resetPlanningOrder, scopedPlanningItems, splitCourseName, takenOutItems, togglePlanningItems,
  type PlannerBlock, type PlanningDraft, type PlanOverrides, type PreviousPlanView, type TodayItem } from '@stay-focused/shared';
import type { DeterministicStudyPlan, PlanMode, PlanSelection, PlanningCandidates } from '@stay-focused/shared/task-planning';
import { useMemo, useRef, useState, type DragEvent } from 'react';
import { PlanFitCard, PlanTimeline, PlannerDot, PreviousPlan } from './plan-preview';

export interface BuiltPlanningChoice { readonly mode: PlanMode; readonly selection: PlanSelection; readonly draft: PlanningDraft }
export interface TodayPlannerProps {
  candidates: PlanningCandidates | null; plan: DeterministicStudyPlan | null; timeline: readonly TodayItem[];
  active: BuiltPlanningChoice | null; overrides: PlanOverrides; start: number; end: number; busy: boolean;
  adjust: boolean; onToggleAdjust: () => void; onBuild: (choice: BuiltPlanningChoice) => void;
  onItemCheck: (key: string, checked: boolean) => void; onApply: () => void; onOpen: (block: PlannerBlock) => void;
  previous: PreviousPlanView; onRestore: () => void;
}
export function TodayPlanner({ candidates: data, plan, timeline, active, overrides, start, end, busy, adjust, onToggleAdjust, onBuild, onItemCheck, onApply, onOpen, previous, onRestore }: TodayPlannerProps) {
  const [tab, setTab] = useState('proposed'), [storedDraft, setDraft] = useState<PlanningDraft | null>(null), [openGroups, setOpenGroups] = useState<Record<string, boolean>>({}), [trayOpen, setTrayOpen] = useState(true);
  const draft = useMemo(() => data ? draftWithOverrides(data, storedDraft ?? active?.draft ?? defaultPlanningDraft(data), overrides) : null, [data, storedDraft, active, overrides]);
  const summary = useMemo(() => data && draft ? planningDraftSummary(data, draft) : null, [data, draft]);
  const displayPlan = plan ?? (timeline.some(item => item.kind === 'study_session' && item.status === 'planned') ? null : summary?.plan ?? null);
  const blocks = plannerBlocks(displayPlan, data, timeline), next = blocks[0];
  const tray = data ? takenOutItems(data, overrides) : [];
  const shown = data && draft ? scopedPlanningItems(data, draft) : [];
  const groups = draft?.groupOrder.map(id => ({ id, ...splitCourseName(data?.courses.find(course => course.id === id)?.name ?? 'Personal'), items: shown.filter(item => (item.courseId ?? 'personal') === id) })).filter(group => group.items.length) ?? [];
  const update = (next: PlanningDraft) => { if (data) { setDraft(next); onBuild({ mode: next.mode, selection: builtPlanningSelection(data, next), draft: next }); } };
  const reorder = (from: string, to: string, group = false) => { if (data && draft) update(movePlanningEntry(data, draft, from, to, group)); };
  const dragging = useRef<{ key: string; group: boolean } | null>(null);
  const drop = (key: string, group = false) => ({ onDragOver: (event: DragEvent) => { if (dragging.current?.group === group) event.preventDefault(); }, onDrop: (event: DragEvent) => { event.preventDefault(); if (dragging.current?.group === group) reorder(dragging.current.key, key, group); dragging.current = null; } });
  const grip = (key: string, ids: readonly string[], label: string, group = false) => <span className="planner-grip-wrap"><button type="button" className="planner-grip" draggable aria-label={`Reorder ${label}`} title="Drag or use Arrow Up / Arrow Down to reorder"
    onDragStart={event => { event.stopPropagation(); dragging.current = { key, group }; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', key); }} onDragEnd={() => { dragging.current = null; }}
    onKeyDown={event => { if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); const to = ids[ids.indexOf(key) + (event.key === 'ArrowUp' ? -1 : 1)]; if (to) reorder(key, to, group); } }}>⠿</button>
    {([-1, 1] as const).map(delta => <button type="button" key={delta} className="planner-key-move" aria-label={`Move ${label} ${delta < 0 ? 'up' : 'down'}`} disabled={!ids[ids.indexOf(key) + delta]} onClick={() => reorder(key, ids[ids.indexOf(key) + delta]!, group)}>{delta < 0 ? 'Move up' : 'Move down'}</button>)}</span>;
  return <section className="today-planner" aria-label="Tonight's plan">
    <header className="planner-header"><div><h2>Tonight</h2><p className="meta">Planned automatically · {plannerWindowLabel(start, end).split(' · ')[0]}</p></div>
      <div className="planner-tabs" role="tablist" aria-label="Plans">{['proposed', 'previous'].map(value => <button type="button" role="tab" aria-selected={tab === value} aria-controls={`planner-${value}`} id={`planner-tab-${value}`} key={value} onClick={() => setTab(value)}>{value === 'proposed' ? 'Proposed' : 'Previous'}</button>)}</div></header>
    {tab === 'previous' ? <div role="tabpanel" id="planner-previous" aria-labelledby="planner-tab-previous"><PreviousPlan previous={previous} disabled={busy || !data} onRestore={() => { onRestore(); setTab('proposed'); }} /></div> : <div role="tabpanel" id="planner-proposed" aria-labelledby="planner-tab-proposed" className="planner-proposal">
      {next && <section className="planner-next"><div><span className="planner-kicker">Up next</span><span className="planner-block-course"><PlannerDot targets={blocks.map(block => block.targetKey)} target={next.targetKey} />{data?.courses.find(course => course.id === next.courseId)?.name.split('|')[0]?.trim() ?? next.savedItem?.course?.code ?? 'Personal'}</span><h3>{next.title}</h3><span className="meta">{next.start} · {next.minutes} min · {next.kind === 'reviewer' ? 'Reviewer' : 'Task'}</span></div><button type="button" className="planner-primary" onClick={() => onOpen(next)}>Start now</button></section>}
      {!data && !blocks.length ? <p role="status">Loading planning items…</p> : <>
        <div className="planner-plan-row"><PlanTimeline blocks={blocks} end={end} candidates={data} onOpen={onOpen} /><div className="planner-side"><PlanFitCard plan={displayPlan} blocks={blocks} free={data?.freeWindowMinutes ?? 0} />
          {!!tray.length && <section className="planner-tray"><button type="button" className="planner-tray-heading" aria-expanded={trayOpen} onClick={() => setTrayOpen(!trayOpen)}>Taken out · {tray.length}</button>{trayOpen && tray.map(entry => <div className="planner-tray-row" key={entry.key}><PlannerDot targets={blocks.map(block => block.targetKey)} target={planningItemKey(entry.item)} /><span className="grow"><span>{entry.item.title}</span><small>{entry.reason === 'skipped' ? 'Skipped tonight · returns next window' : 'Removed from plan'}</small></span><button type="button" className="planner-outline" aria-label={`Put back ${entry.item.title}`} onClick={() => { onItemCheck(entry.key, true); if (draft) setDraft({ ...draft, checked: [...new Set([...draft.checked, planningItemKey(entry.item)])] }); }}>Put back</button></div>)}</section>}
          <button type="button" className="planner-outline" aria-expanded={adjust} aria-controls="planner-adjust" onClick={onToggleAdjust}>{adjust ? 'Hide plan settings' : 'Adjust plan'}</button>
          <button type="button" className="planner-primary" disabled={busy || !plan?.sessions.length} onClick={onApply}>Use this plan</button>
        </div></div>
        {adjust && data && draft && <div className="planner-adjust" id="planner-adjust"><div className="planner-course-picker"><h3 className="planner-kicker">Courses</h3>
          {data.courses.map(course => { const name = splitCourseName(course.name), checked = draft.courses === 'all' || draft.courseIds.includes(course.id); return <button type="button" key={course.id} className="planner-course-row" role="checkbox" aria-checked={checked} aria-label={course.name} onClick={() => { const ids = draft.courses === 'all' ? data.courses.map(course => course.id) : draft.courseIds; update({ ...draft, courses: 'select', courseIds: checked ? ids.filter(id => id !== course.id) : [...ids, course.id] }); }}><PlannerDot targets={data.courses.map(course => course.id)} target={course.id} /><span className="grow"><strong>{name.code}</strong><span className="meta">{name.name}</span></span><small>{course.items.length} items</small><RoundCheck checked={checked} /></button>; })}
          <div className="planner-include"><span>Include</span><div className="planner-segments" role="group" aria-label="Include">{(['reviewers', 'tasks', 'reviewers_tasks'] as const).map(mode => <button type="button" key={mode} aria-pressed={draft.mode === mode} onClick={() => update({ ...draft, mode })}>{mode === 'reviewers_tasks' ? 'Both' : mode === 'reviewers' ? 'Reviewers' : 'Tasks'}</button>)}</div></div>
          {draft.courses === 'select' && !draft.courseIds.length && <p role="status">Pick at least one course</p>}
        </div><div className="planner-order"><div className="row between wrap"><h3 className="planner-kicker">{draft.order === 'manual' ? 'Manual order' : 'Smart order'}</h3><span className="meta">Uncheck to remove · drag to reorder</span></div>
          {draft.order === 'manual' && <button type="button" className="planner-outline" onClick={() => update(resetPlanningOrder(data, draft))}>Reset to smart order</button>}
          {groups.map((group, index) => { const open = openGroups[group.id] ?? index === 0, ids = group.items.map(planningItemKey); return <section className="planner-order-course" key={group.id}><div className="planner-order-heading" {...drop(group.id, true)}><button type="button" aria-label={`${group.code} smart order`} aria-expanded={open} onClick={() => setOpenGroups({ ...openGroups, [group.id]: !open })}><PlannerDot targets={data.courses.map(course => course.id)} target={group.id} /><span className="grow"><strong>{group.code}</strong><span className="meta"> · {group.name}</span></span><small>{group.items.filter(item => blocks.some(block => block.selectionKey === planningItemKey(item))).length} of {group.items.length} in plan</small><span aria-hidden="true">{open ? '⌃' : '⌄'}</span></button>{grip(group.id, groups.map(group => group.id), group.code, true)}</div>
            {open && <div className="planner-order-items">{group.items.map(item => { const key = planningItemKey(item), checked = draft.checked.includes(key), removed = overrides.removed.includes(planningOverrideKey(item)), skipped = overrides.skipped.includes(planningOverrideKey(item)); const status = removed ? 'Removed' : skipped ? 'Skipped tonight' : blocks.some(block => block.selectionKey === key) ? 'In plan' : 'Next free window'; return <div className="planner-order-item" key={key} {...drop(key)}><button type="button" role="checkbox" aria-checked={checked} aria-label={item.title} onClick={() => { setDraft(togglePlanningItems(draft, [key])); onItemCheck(planningOverrideKey(item), !checked); }}><RoundCheck checked={checked} /></button><span className={`grow${removed ? ' planner-removed' : ''}`}><span className="planner-full-title">{item.title}</span><small>{item.estimateMinutes} min · {item.kind === 'reviewer' ? 'Reviewer' : 'Task'} · {status}</small></span>{grip(key, ids, item.title)}</div>; })}</div>}
          </section>; })}
        </div></div>}
      </>}
    </div>}
  </section>;
}
function RoundCheck({ checked }: { checked: boolean }) { return <span className="planner-round-check" data-checked={checked} aria-hidden="true">{checked ? '✓' : ''}</span>; }
