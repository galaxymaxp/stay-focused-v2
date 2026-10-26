"use client";
import { builtPlanningSelection, defaultPlanningDraft, movePlanningEntry, planningDraftSummary, allPlanningItems, planningOverrideKey, planningItemKey, planningTitle,
  resetPlanningOrder, scopedPlanningItems, togglePlanningItems, type PlanningDraft, type PlanOverrides } from '@stay-focused/shared';
import { PLAN_EMPTY_COPY, type PlanMode, type PlanSelection, type PlanningCandidates, type StudyPlanningRequest } from '@stay-focused/shared/task-planning';
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Icon } from '../../components/ui';
import { PlanButton } from './plan-button';

export interface BuiltPlanningChoice { readonly mode: PlanMode; readonly selection: PlanSelection; readonly draft: PlanningDraft }
export function PlanningControl({ request, active, load, onBuild, disabled, overrides, onItemCheck }: {
  request: StudyPlanningRequest; active: BuiltPlanningChoice | null; load: (request: StudyPlanningRequest) => Promise<PlanningCandidates>;
  onBuild: (choice: BuiltPlanningChoice) => void; disabled?: boolean; overrides?: PlanOverrides; onItemCheck?: (key: string, checked: boolean) => void;
}) {
  const [open, setOpen] = useState(false), [data, setData] = useState<PlanningCandidates | null>(null);
  const [storedDraft, setDraft] = useState<PlanningDraft | null>(null), [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null), panel = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState(400);
  const latest = useRef({ load, active, overrides }); latest.current = { load, active, overrides };
  const excluded = JSON.stringify([...(overrides?.removed ?? []), ...(overrides?.skipped ?? [])]);
  const draft = useMemo(() => {
    if (!storedDraft) return null;
    const keys = new Set(JSON.parse(excluded) as string[]);
    if (data) for (const item of allPlanningItems(data)) if (keys.has(planningOverrideKey(item))) keys.add(planningItemKey(item));
    const checked = storedDraft.checked.filter(key => !keys.has(key));
    return checked.length === storedDraft.checked.length ? storedDraft : { ...storedDraft, checked };
  }, [storedDraft, excluded, data]);
  const requestKey = JSON.stringify(request);
  useEffect(() => {
    if (!open) return;
    let live = true;
    setData(null); setDraft(null); setError(null);
    void latest.current.load(JSON.parse(requestKey) as StudyPlanningRequest).then(value => {
      if (!live) return;
      setData(value); setDraft(() => { const draft = latest.current.active?.draft ?? defaultPlanningDraft(value); const keys = new Set([...(latest.current.overrides?.removed ?? []), ...(latest.current.overrides?.skipped ?? [])]); for (const item of allPlanningItems(value)) if (keys.has(planningOverrideKey(item))) keys.add(planningItemKey(item)); return { ...draft, checked: draft.checked.filter(key => !keys.has(key)) }; });
    }).catch(() => { if (live) setError('Could not load planning items. Close and try again.'); });
    return () => { live = false; };
  }, [open, requestKey]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const fit = () => setPanelHeight(Math.max(160, window.innerHeight - (root.current?.getBoundingClientRect().bottom ?? 0) - 16));
    fit(); window.addEventListener('resize', fit);
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return; }
      if (event.key !== 'Tab') return;
      const stops = [...(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]') ?? [])];
      const first = stops[0], last = stops.at(-1);
      if (event.shiftKey && (!panel.current?.contains(document.activeElement) || document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (!panel.current?.contains(document.activeElement) || document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); window.removeEventListener('resize', fit); previous?.focus(); };
  }, [open]);
  const summary = data && draft ? planningDraftSummary(data, draft) : null;
  const shown = data && draft ? scopedPlanningItems(data, draft) : [];
  const groups = draft?.groupOrder.map(id => ({ id, name: data?.courses.find(course => course.id === id)?.name ?? 'Personal', items: shown.filter(item => (item.courseId ?? 'personal') === id) })).filter(group => group.items.length) ?? [];
  const dragging = useRef<{ id: string; group: boolean } | null>(null);
  const reorder = (from: string, to: string, group: boolean) => { if (data && draft) setDraft(movePlanningEntry(data, draft, from, to, group)); };
  const drag = (id: string, group: boolean) => ({ draggable: true, onDragStart: (event: DragEvent) => {
    event.stopPropagation(); dragging.current = { id, group }; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', id);
  }, onDragEnd: () => { dragging.current = null; }, onDragOver: (event: DragEvent) => { if (dragging.current?.group === group) { event.preventDefault(); event.stopPropagation(); } },
  onDrop: (event: DragEvent) => { event.preventDefault(); event.stopPropagation(); if (dragging.current?.group === group) reorder(dragging.current.id, id, group); dragging.current = null; } });
  const moves = (id: string, ids: readonly string[], group: boolean, name: string) => {
    const index = ids.indexOf(id);
    return <span className="plan-moves">{([-1, 1] as const).map(delta => <button type="button" key={delta} className="subtle" aria-label={`Move ${name} ${delta < 0 ? 'up' : 'down'}`}
      disabled={!ids[index + delta]} onClick={() => reorder(id, ids[index + delta]!, group)}>{delta < 0 ? '↑' : '↓'}</button>)}</span>;
  };
  return <div className="planning-control" ref={root}>
    <PlanButton disabled={disabled} onPress={() => { setExpanded(false); setOpen(true); }} />
    {open && <><div className="planning-dim" onClick={() => setOpen(false)} aria-hidden="true" />
      <div className="planning-sheet" ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="planning-title" style={{ '--planning-height': `${panelHeight}px` } as React.CSSProperties}>
        <header className="row between"><h2 id="planning-title">Plan your free time</h2><span className="meta">{data?.freeWindowMinutes ?? '…'} min</span><button type="button" className="subtle" aria-label="Close planning" onClick={() => setOpen(false)}><Icon name="x" /></button></header>
        {error && <p role="alert">{error}</p>}{!data && !error && <p role="status">Loading planning items…</p>}
        {data && draft && summary && <>
          <fieldset><legend>Courses</legend><div className="plan-segments" role="group" aria-label="Courses">{(['all', 'select'] as const).map(value => <button type="button" key={value} aria-pressed={draft.courses === value} onClick={() => setDraft({ ...draft, courses: value })}>{value === 'all' ? 'All' : 'Select'}</button>)}</div>
            {draft.courses === 'select' && <div className="plan-course-chips">{data.courses.map(course => <button type="button" key={course.id} aria-pressed={draft.courseIds.includes(course.id)} onClick={() => setDraft({ ...draft, courseIds: draft.courseIds.includes(course.id) ? draft.courseIds.filter(id => id !== course.id) : [...draft.courseIds, course.id] })}>{course.name}</button>)}</div>}
          </fieldset>
          <fieldset><legend>Include</legend><div className="plan-segments" role="group" aria-label="Include">{(['reviewers', 'tasks', 'reviewers_tasks'] as const).map(value => <button type="button" key={value} aria-pressed={draft.mode === value} onClick={() => setDraft({ ...draft, mode: value })}>{value === 'reviewers_tasks' ? 'Both' : value === 'reviewers' ? 'Reviewers' : 'Tasks'}</button>)}</div></fieldset>
          <button type="button" className="plan-summary" aria-expanded={expanded} aria-controls="planning-items" onClick={() => setExpanded(!expanded)}>
            {summary.count} items · ~{summary.minutes} min of {data.freeWindowMinutes} min free{summary.minutes > data.freeWindowMinutes ? ` · ~${summary.notFitMinutes} min won't fit` : ''}<Icon name="chevron-down" />
          </button>
          {!shown.length && <p role="status">{draft.courses === 'select' ? 'Nothing to plan in these courses.' : PLAN_EMPTY_COPY[draft.mode]}</p>}
          {expanded && <div id="planning-items" className="stack">
            <div className="row between"><strong>{draft.order === 'smart' ? 'Smart order' : 'Manual order'}</strong>{draft.order === 'manual' && <button type="button" className="subtle" onClick={() => setDraft(resetPlanningOrder(data, draft))}>Reset to smart order</button>}</div>
            {groups.map(group => {
              const keys = group.items.map(planningItemKey), checked = keys.filter(key => draft.checked.includes(key)).length;
              return <section key={group.id} className="plan-course-group">
                <div className="plan-group-header" {...drag(group.id, true)}><TriCheckbox label={`${group.name}, ${group.items.length} items`} checked={checked === keys.length ? true : checked ? 'mixed' : false} onChange={() => setDraft(togglePlanningItems(draft, keys))} /><strong>{group.name} · {group.items.length}</strong>{moves(group.id, groups.map(group => group.id), true, group.name)}</div>
                {group.items.map(item => <div key={planningItemKey(item)} className="plan-item-row" {...drag(planningItemKey(item), false)}>
                  <TriCheckbox label={item.title} checked={draft.checked.includes(planningItemKey(item))} onChange={() => { const key = planningItemKey(item); onItemCheck?.(planningOverrideKey(item), !draft.checked.includes(key)); setDraft(togglePlanningItems(draft, [key])); }} />
                  <Icon name={item.kind === 'reviewer' ? 'book-open' : 'clipboard-list'} /><span className="grow" title={item.title}><PlanningTitle title={item.title} />{item.openedWithin24h && <small>Opened today</small>}</span><span className="meta">{item.estimateMinutes}m</span>
                  {moves(planningItemKey(item), keys, false, item.title)}
                </div>)}
              </section>;
            })}
          </div>}
          <button type="button" className="subtle" onClick={() => setDraft(defaultPlanningDraft(data))}>Reset to all</button>
          {draft.courses === 'select' && !draft.courseIds.length && <p role="status">Pick at least one course</p>}
          <button type="button" className="primary plan-build" disabled={draft.courses === 'select' && !draft.courseIds.length} onClick={() => { onBuild({ mode: draft.mode, selection: builtPlanningSelection(data, draft), draft }); setOpen(false); }}>Build plan</button>
        </>}
      </div></>}
  </div>;
}
function TriCheckbox({ label, checked, onChange }: { label: string; checked: boolean | 'mixed'; onChange: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = checked === 'mixed'; }, [checked]);
  return <label className="plan-checkbox"><input ref={ref} type="checkbox" aria-label={label} aria-checked={checked} checked={checked === true} onChange={onChange} /></label>;
}
function PlanningTitle({ title }: { title: string }) {
  const ref = useRef<HTMLSpanElement>(null), [limit, setLimit] = useState(24);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // Conservative maximum glyph width reserves two lines without losing the
    // filename suffix to CSS's trailing line clamp on narrow phone panels.
    const measure = () => setLimit(Math.max(8, Math.floor(node.clientWidth / 12) * 2));
    const observer = new ResizeObserver(measure); observer.observe(node); measure();
    return () => observer.disconnect();
  }, []);
  return <span ref={ref} className="plan-item-title">{planningTitle(title, limit)}</span>;
}
