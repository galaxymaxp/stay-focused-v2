"use client";
import { allPlanningItems, reorderProposal, moveProposalUp, planningItemKey, planningOverrideKey, previousPlanData, restoreSelectionFromSnapshot, snapshotFromPlan, takenOutItems, applyPlanOverrides, builtPlanningSelection, defaultPlanningDraft, planningSelectionHash, resolveFreeWindow,
  freeTimeDuration, freeTimePlanningRange, localMinuteIso, type PlanDeviceState, type PlanOverrides, type FreeTimeRange, type TodayItem } from '@stay-focused/shared';
import type { PlanMode, PlanSelection, PlanningCandidates, StudyPlanningRequest, DeterministicStudyPlan, StudySessionView, ProposedStudySession } from '@stay-focused/shared/task-planning';
import { useEffect, useMemo, useRef, useState } from 'react';
import { planDeviceStore } from './planDeviceStore';

interface ClockWindow { readonly ready: boolean; readonly window: FreeTimeRange | null; readonly adjusting: { current: boolean }; save(value: FreeTimeRange): void }
interface Input {
  readonly identity: string; readonly ownerId: string; readonly date: string; readonly clock: ClockWindow;
  readonly around: FreeTimeRange | null; readonly timeline: readonly TodayItem[]; readonly timelineReady: boolean;
  readonly enabled: boolean; readonly busy: boolean; readonly previewing: boolean; readonly preview: DeterministicStudyPlan | null;
  readonly mode: PlanMode; readonly selection?: PlanSelection;
  load(request: StudyPlanningRequest): Promise<PlanningCandidates>;
  remember?(mode: PlanMode, selection: PlanSelection, candidates: PlanningCandidates): void;
  queue(request: StudyPlanningRequest): void; clear(): void;
}
const empty: PlanDeviceState = { lastUsed: null, overrides: { removed: [], skipped: [] }, previous: null, welcomeDismissed: false };

/** Shared behavior, with platform-local storage adapters and the existing quiet queue. */
export function useTodayPlan(input: Input) {
  const { identity, ownerId, date, clock } = input;
  const live = useRef(input); live.current = input;
  const [device, setDevice] = useState<{ identity: string; value: PlanDeviceState } | null>(null);
  useEffect(() => {
    let active = true;
    void planDeviceStore.read(date, ownerId).then(value => { if (active) setDevice({ identity, value }); });
    return () => { active = false; };
  }, [identity, date, ownerId]);
  const ready = clock.ready && device?.identity === identity;
  const preferences = device?.identity === identity ? device.value : empty;
  const [moved, setMoved] = useState<{ identity: string; window: FreeTimeRange } | null>(null);
  const resolved = resolveFreeWindow({ savedForDate: moved?.identity === identity ? moved.window : clock.window,
    aroundPlanned: input.around, lastUsed: preferences.lastUsed });
  const { start, end } = resolved.window;
  const requestKey = JSON.stringify([identity, start, end]);
  const resolvedWindow = useRef({ start, end }); resolvedWindow.current = { start, end };
  const [candidateState, setCandidates] = useState<{ key: string; data: PlanningCandidates } | null>(null);
  const [candidateError, setCandidateError] = useState<{ key: string; message: string } | null>(null);
  const eligible = ready && input.enabled && input.timelineReady;
  useEffect(() => {
    if (!eligible) return;
    let active = true;
    setCandidateError(null);
    const window = resolvedWindow.current;
    const request = { ...freeTimePlanningRange(date, window.start, window.end), mode: 'reviewers_tasks' as const };
    void live.current.load(request).then(data => { if (active) setCandidates({ key: identity, data }); })
      .catch(() => { if (active) setCandidateError({ key: identity, message: 'Could not load planning items. Try again in a moment.' }); });
    return () => { active = false; };
  }, [eligible, identity, date]);
  // A clock release updates availability locally; it never refetches candidates.
  const candidates = useMemo(() => candidateState?.key === identity ? { ...candidateState.data, ...freeTimePlanningRange(date, start, end), freeWindowMinutes: freeTimeDuration(start, end) } : null, [candidateState, identity, date, start, end]);
  const defaults = candidates ? builtPlanningSelection(candidates, defaultPlanningDraft(candidates)) : { order: 'smart' as const };
  const [choice, setChoice] = useState<{ identity: string; mode: PlanMode; selection: PlanSelection } | null>(null);
  const mode = choice?.identity === identity ? choice.mode : input.mode;
  const selection = choice?.identity === identity ? choice.selection : input.selection ?? defaults;
  const activeChoice = useRef({ mode, selection }); activeChoice.current = { mode, selection };
  const overrides = preferences.overrides;
  const activeOverrides = useRef(overrides); activeOverrides.current = overrides;
  const selectionKey = planningSelectionHash(mode, selection);
  const overridesKey = JSON.stringify([[...overrides.removed].sort(), [...overrides.skipped].sort()]);
  const autoKey = JSON.stringify([requestKey, selectionKey, overridesKey]);
  const queued = useRef<{ identity: string; keys: Set<string> }>({ identity, keys: new Set() });
  if (queued.current.identity !== identity) queued.current = { identity, keys: new Set() };
  const intent = useRef<{ identity: string; mode: PlanMode; selection?: PlanSelection } | null>(null);
  function queue(mode: PlanMode, selected: PlanSelection, excluded: PlanOverrides = overrides) {
    if (!candidates || !eligible || live.current.clock.adjusting.current) return;
    const scoped = { ...candidates, courses: candidates.courses.map(course => ({ ...course, items: course.items.filter(item => mode === 'reviewers_tasks' || item.kind === (mode === 'tasks' ? 'task' : 'reviewer')) })),
      personalItems: candidates.personalItems.filter(item => mode === 'reviewers_tasks' || item.kind === (mode === 'tasks' ? 'task' : 'reviewer')) };
    queued.current.keys.add(JSON.stringify([requestKey, planningSelectionHash(mode, selected), JSON.stringify([[...excluded.removed].sort(), [...excluded.skipped].sort()])]));
    live.current.queue({ ...freeTimePlanningRange(date, start, end), mode, selection: applyPlanOverrides(selected, scoped, excluded) });
  }
  const latestQueue = useRef(queue); latestQueue.current = queue;
  const windowStart = Date.parse(localMinuteIso(date, start)), windowEnd = Date.parse(localMinuteIso(date, end < start ? end + 1440 : end));
  const hasPlanned = input.timeline.some(item => item.kind === 'study_session' && item.status === 'planned' && item.startAt && item.endAt &&
    Date.parse(item.startAt) < windowEnd && Date.parse(item.endAt) > windowStart);
  useEffect(() => {
    if (!eligible || !candidates || input.busy || input.previewing || clock.adjusting.current) return;
    const pending = intent.current;
    if (pending?.identity === identity) {
      intent.current = null;
      latestQueue.current(pending.mode, pending.selection ?? selection);
    } else if (!input.preview && !hasPlanned && !queued.current.keys.has(autoKey)) latestQueue.current(mode, selection);
  }, [eligible, candidates, identity, autoKey, hasPlanned, input.busy, input.previewing, input.preview, mode, selection, clock.adjusting]);
  function remember(mode: PlanMode, selected: PlanSelection) {
    activeChoice.current = { mode, selection: selected };
    setChoice({ identity, mode, selection: selected });
    if (candidates) live.current.remember?.(mode, selected, candidates);
  }
  function propose(mode = activeChoice.current.mode, selected = activeChoice.current.selection) {
    remember(mode, selected);
    live.current.clear();
    if (candidates) latestQueue.current(mode, selected);
    else intent.current = { identity, mode, selection: selected };
  }
  function change(from: number, to: number) {
    const window = resolveFreeWindow({ savedForDate: { start: from, end: to } });
    if (window.source !== 'saved') return;
    dismissWelcome();
    live.current.clear();
    setMoved({ identity, window: window.window });
    clock.save(window.window);
    intent.current = { identity, mode: activeChoice.current.mode, selection: candidates ? activeChoice.current.selection : choice?.identity === identity ? choice.selection : input.selection };
  }
  function updateOverrides(next: PlanOverrides) {
    activeOverrides.current = next;
    setDevice(old => old?.identity === identity ? { identity, value: { ...old.value, overrides: next } } : old);
    void planDeviceStore.saveOverrides(date, next);
  }
  const items = candidates ? allPlanningItems(candidates) : [];
  function canonical(key: string) {
    const item = items.find(item => planningItemKey(item) === key || planningOverrideKey(item) === key);
    const target = input.preview?.planningTargets?.find(target => planningItemKey(target) === key);
    return item ? planningOverrideKey(item) : target ? planningItemKey({ kind: target.kind, id: target.selectionId }) : key;
  }
  function exclude(key: string, reason: 'removed' | 'skipped') {
    if (!ready || !candidates) return;
    key = canonical(key);
    const old = activeOverrides.current;
    const next = { ...old, [reason]: [...new Set([...old[reason], key])] };
    updateOverrides(next);
    live.current.clear();
    latestQueue.current(activeChoice.current.mode, activeChoice.current.selection, next);
  }
  function putBack(key: string) {
    if (!ready || !candidates) return;
    const item = items.find(item => planningItemKey(item) === key || planningOverrideKey(item) === canonical(key));
    const aliases = new Set([key, canonical(key), ...(item ? [planningItemKey(item), planningOverrideKey(item)] : [])]);
    const next = { removed: activeOverrides.current.removed.filter(key => !aliases.has(key)), skipped: activeOverrides.current.skipped.filter(key => !aliases.has(key)) };
    updateOverrides(next);
    let selected = activeChoice.current.selection;
    if (item && selected.items && !selected.items.some(target => aliases.has(planningItemKey(target)))) selected = { ...selected, items: [...selected.items, { kind: item.kind, id: item.id }] };
    remember(activeChoice.current.mode, selected);
    live.current.clear(); latestQueue.current(activeChoice.current.mode, selected, next);
  }
  function moveUp(index: number) {
    if (!input.preview || !candidates) return;
    propose(activeChoice.current.mode, moveProposalUp({ ...input.preview, selection: activeChoice.current.selection }, index));
  }
  function reorder(keys: readonly string[]) {
    if (!input.preview || !candidates) return;
    propose(activeChoice.current.mode, reorderProposal({ ...input.preview, selection: activeChoice.current.selection }, keys.map(canonical)));
  }
  async function applied(sessions?: readonly StudySessionView[]) {
    if (!input.preview) return;
    const plan = sessions ? { ...input.preview, sessions: sessions.flatMap((session): ProposedStudySession[] => {
      const timing = { proposalId: session.id, startsAt: session.startsAt, endsAt: session.endsAt,
        durationMinutes: Math.round((Date.parse(session.endsAt) - Date.parse(session.startsAt)) / 60000), scheduledAfterDeadline: false as const };
      return session.kind === 'reviewer' && session.reviewer ? [{ ...timing, kind: 'reviewer' as const, reviewerId: session.reviewer.id.replace(/^artifact:/u, ''), reviewerTitle: session.reviewer.title, courseId: session.reviewer.courseId }] :
        session.taskId && session.task ? [{ ...timing, kind: 'task' as const, taskId: session.taskId, taskTitle: session.task.title }] : [];
    }) } : input.preview;
    const raw = snapshotFromPlan(date, start, end, plan);
    const value = { ...raw, sessions: raw.sessions.map(session => ({ ...session, courseId: session.courseId ?? items.find(item => item.kind === session.kind && item.id === session.id)?.courseId ?? null })) };
    await planDeviceStore.saveSnapshot(value, ownerId);
    if (live.current.identity === identity) setDevice(old => old?.identity === identity ? { identity, value: { ...old.value, previous: value } } : old);
  }
  function restorePrevious() {
    if (!preferences.previous || !candidates) return;
    const restored = restoreSelectionFromSnapshot(preferences.previous);
    const keys = new Set(restored.items?.map(item => canonical(planningItemKey(item))));
    const next = { removed: activeOverrides.current.removed.filter(key => !keys.has(canonical(key))), skipped: activeOverrides.current.skipped.filter(key => !keys.has(canonical(key))) };
    updateOverrides(next); remember('reviewers_tasks', restored);
    live.current.clear(); latestQueue.current('reviewers_tasks', restored, next);
  }
  function dismissWelcome() {
    setDevice(old => old?.identity === identity ? { identity, value: { ...old.value, welcomeDismissed: true } } : old);
    void planDeviceStore.dismissWelcome();
  }
  return { start, end, windowSource: resolved.source, welcomeDismissed: preferences.welcomeDismissed,
    candidates, selection, overrides, ready, candidateNote: candidateError?.key === identity ? candidateError.message : null,
    change, propose, skip: (key: string) => exclude(key, 'skipped'), remove: (key: string) => exclude(key, 'removed'), putBack, moveUp, reorder, applied,
    takenOut: candidates ? takenOutItems(candidates, overrides) : [], previousPlan: previousPlanData(preferences.previous, date, input.timeline), restorePrevious,
    dismissWelcome,
  };
}
