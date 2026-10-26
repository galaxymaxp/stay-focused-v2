"use client";
import { applyPlanOverrides, builtPlanningSelection, defaultPlanningDraft, planningSelectionHash, resolveFreeWindow,
  freeTimePlanningRange, localMinuteIso, type PlanDeviceState, type PlanOverrides, type FreeTimeRange, type TodayItem } from '@stay-focused/shared';
import type { PlanMode, PlanSelection, PlanningCandidates, StudyPlanningRequest, DeterministicStudyPlan } from '@stay-focused/shared/task-planning';
import { useEffect, useRef, useState } from 'react';
import { planDeviceStore } from './plan-device-store';

interface ClockWindow { readonly ready: boolean; readonly window: FreeTimeRange | null; readonly adjusting: { current: boolean }; save(value: FreeTimeRange): void }
interface Input {
  readonly identity: string; readonly ownerId: string; readonly date: string; readonly clock: ClockWindow;
  readonly around: FreeTimeRange | null; readonly timeline: readonly TodayItem[]; readonly timelineReady: boolean;
  readonly enabled: boolean; readonly busy: boolean; readonly previewing: boolean; readonly preview: DeterministicStudyPlan | null;
  readonly mode: PlanMode; readonly selection?: PlanSelection;
  load(request: StudyPlanningRequest): Promise<PlanningCandidates>;
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
  const [candidateState, setCandidates] = useState<{ key: string; data: PlanningCandidates } | null>(null);
  const [candidateError, setCandidateError] = useState<{ key: string; message: string } | null>(null);
  const eligible = ready && input.enabled && input.timelineReady;
  useEffect(() => {
    if (!eligible) return;
    let active = true;
    setCandidateError(null);
    const request = { ...freeTimePlanningRange(date, start, end), mode: 'reviewers_tasks' as const };
    void live.current.load(request).then(data => { if (active) setCandidates({ key: requestKey, data }); })
      .catch(() => { if (active) setCandidateError({ key: requestKey, message: 'Could not load planning items. Try again in a moment.' }); });
    return () => { active = false; };
  }, [eligible, requestKey, date, start, end]);
  const candidates = candidateState?.key === requestKey ? candidateState.data : null;
  const defaults = candidates ? builtPlanningSelection(candidates, defaultPlanningDraft(candidates)) : { order: 'smart' as const };
  const selection = input.selection ?? defaults;
  const overrides = preferences.overrides;
  const selectionKey = planningSelectionHash(input.mode, selection);
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
    } else if (!input.preview && !hasPlanned && !queued.current.keys.has(autoKey)) latestQueue.current(input.mode, selection);
  }, [eligible, candidates, identity, autoKey, hasPlanned, input.busy, input.previewing, input.preview, input.mode, selection, clock.adjusting]);
  function propose(mode = input.mode, selected = selection) {
    live.current.clear();
    if (candidates) latestQueue.current(mode, selected);
    else intent.current = { identity, mode, selection: selected };
  }
  function change(from: number, to: number) {
    const window = resolveFreeWindow({ savedForDate: { start: from, end: to } });
    if (window.source !== 'saved') return;
    live.current.clear();
    setMoved({ identity, window: window.window });
    clock.save(window.window);
    intent.current = { identity, mode: input.mode, selection: input.selection };
  }
  return { start, end, windowSource: resolved.source, welcomeDismissed: preferences.welcomeDismissed,
    candidates, selection, overrides, ready, candidateNote: candidateError?.key === requestKey ? candidateError.message : null,
    change, propose,
    dismissWelcome: () => { setDevice({ identity, value: { ...preferences, welcomeDismissed: true } }); void planDeviceStore.dismissWelcome(); },
  };
}
