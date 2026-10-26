import { builtPlanningSelection, defaultPlanningDraft, draftWithOverrides, freeTimeDuration, movePlanningEntry, planningDraftSummary, planningItemKey, planningOverrideKey, plannerBlocks, plannerToneKeys, plannerWindowLabel, resetPlanningOrder, scopedPlanningItems, splitCourseName, takenOutItems, togglePlanningItems,
  type PlannerBlock, type PlanningDraft, type PlanOverrides, type PreviousPlanView, type TodayItem } from '@stay-focused/shared';
import { type DeterministicStudyPlan, type PlanMode, type PlanSelection, type PlanningCandidates, type StudyPlanningRequest } from '@stay-focused/shared/task-planning';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Copy, SegmentedControl, Sheet } from '../../design/primitives';
import { useTheme } from '../../design/theme';
import { PlanUndoBar, type RemovedPlanBlock } from './PlanUndoBar';
import { PlannerSkeleton } from './PlannerSkeleton';
import { PlanButton } from './PlanButton';
import { PlanFitCard, PlanTimeline, PlannerButton, PlannerDot, PreviousPlan } from './PlanPreview';
import { useLibraryOrganizer } from './useLibraryOrganizer';

export interface BuiltPlanningChoice { readonly mode: PlanMode; readonly selection: PlanSelection; readonly draft: PlanningDraft }
export interface PlanningSheetProps {
  request: StudyPlanningRequest; active: BuiltPlanningChoice | null; load: (request: StudyPlanningRequest) => Promise<PlanningCandidates>;
  onBuild: (choice: BuiltPlanningChoice) => void; disabled?: boolean; overrides?: PlanOverrides; onItemCheck?: (key: string, checked: boolean) => void;
  candidates?: PlanningCandidates | null; plan?: DeterministicStudyPlan | null; timeline?: readonly TodayItem[];
  start?: number; end?: number; busy?: boolean; onApply?: () => void; onOpen?: (block: PlannerBlock) => void;
  previous?: PreviousPlanView; onRestore?: () => void;
  onSkip?: (key: string) => void; onRemove?: (key: string) => void; onPutBack?: (key: string) => void; onMoveUp?: (index: number) => void; onReorder?: (keys: readonly string[]) => void;
}
export function PlanningControl(props: PlanningSheetProps) {
  const [open, setOpen] = useState(false);
  return <><PlanButton disabled={props.disabled} onPress={() => setOpen(true)} />{open && <PlanningSheet {...props} onClose={() => setOpen(false)} />}</>;
}
export function RoundCheck({ checked }: { checked: boolean }) {
  const { colors } = useTheme();
  return <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: checked ? colors.textPrimary : colors.textMuted, backgroundColor: checked ? colors.textPrimary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{checked && <Copy color={colors.backgroundPrimary} style={{ fontSize: 13, fontWeight: '700' }}>{'✓'}</Copy>}</View>;
}
export function PlanningSheet({ request, active, load, onBuild, onClose, overrides, onItemCheck, candidates, plan, timeline = [], start, end, busy, onApply, onOpen, previous = null, onRestore, onSkip, onRemove, onPutBack, onMoveUp, onReorder }: PlanningSheetProps & { onClose: () => void }) {
  const [removed, setRemoved] = useState<RemovedPlanBlock | null>(null);
  const removeBlock = (block: PlannerBlock) => { onRemove?.(block.selectionKey); setRemoved({ key: block.selectionKey, title: block.title, expiresAt: Date.now() + 5000 }); };
  const [loaded, setData] = useState<PlanningCandidates | null>(candidates ?? null), [storedDraft, setDraft] = useState<PlanningDraft | null>(null);
  const [error, setError] = useState<string | null>(null), [tab, setTab] = useState('proposed'), [pickerOpen, setPickerOpen] = useState(false), [trayOpen, setTrayOpen] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const latest = useRef({ load, candidates }); latest.current = { load, candidates };
  const requestKey = JSON.stringify(request);
  useEffect(() => {
    if (latest.current.candidates) return;
    let live = true; setError(null);
    void latest.current.load(JSON.parse(requestKey) as StudyPlanningRequest).then(value => { if (live) setData(value); }).catch(() => { if (live) setError('Could not load planning items. Close and try again.'); });
    return () => { live = false; };
  }, [requestKey]);
  const data = candidates ?? loaded;
  const draft = useMemo(() => data ? draftWithOverrides(data, storedDraft ?? active?.draft ?? defaultPlanningDraft(data), overrides) : null, [data, storedDraft, active, overrides]);
  const { colors } = useTheme();
  const summary = useMemo(() => data && draft ? planningDraftSummary(data, draft) : null, [data, draft]);
  const displayPlan = plan ?? (timeline.some(item => item.kind === 'study_session' && item.status === 'planned') ? null : summary?.plan ?? null);
  const blocks = plannerBlocks(displayPlan, data, timeline);
  const from = start ?? new Date(request.availability?.[0]?.startsAt ?? request.planningRange.startsAt).getHours() * 60 + new Date(request.availability?.[0]?.startsAt ?? request.planningRange.startsAt).getMinutes();
  const to = end ?? new Date(request.availability?.[0]?.endsAt ?? request.planningRange.endsAt).getHours() * 60 + new Date(request.availability?.[0]?.endsAt ?? request.planningRange.endsAt).getMinutes();
  const shown = data && draft ? scopedPlanningItems(data, draft) : [];
  const groups = draft?.groupOrder.map(id => ({ id, ...splitCourseName(data?.courses.find(course => course.id === id)?.name ?? 'Personal'), items: shown.filter(item => (item.courseId ?? 'personal') === id) })).filter(group => group.items.length) ?? [];
  const targets = plannerToneKeys(blocks, data?.courses);
  const tray = data ? takenOutItems(data, overrides ?? { removed: [], skipped: [] }) : [];
  const update = (next: PlanningDraft) => { if (data) { setDraft(next); onBuild({ mode: next.mode, selection: builtPlanningSelection(data, next), draft: next }); } };
  const reorder = (from: string, to: string, group = false) => { if (data && draft) update(movePlanningEntry(data, draft, from, to, group)); };
  const moving = useRef<string | null>(null);
  const headerHeights = useRef(new Map<string, number>());
  const [dragScope, setDragScope] = useState<string | null>(null);
  const keys = groups.flatMap(group => [`group:${group.id}`, ...((openGroups[group.id] ?? group === groups[0]) ? group.items.map(planningItemKey) : [])]);
  const visible = keys.filter(key => !dragScope || (dragScope === 'groups' ? key.startsWith('group:') : groups.find(group => group.id === dragScope)?.items.some(item => planningItemKey(item) === key)));
  const organizer = useLibraryOrganizer('planning-items', keys, visible, next => {
    const from = moving.current;
    if (!from) return;
    const oldOrder = keys.filter(key => visible.includes(key)), nextOrder = next.filter(key => visible.includes(key));
    const to = oldOrder[nextOrder.indexOf(from)];
    if (to) reorder(from.startsWith('group:') ? from.slice(6) : from, to.startsWith('group:') ? to.slice(6) : to, from.startsWith('group:'));
  });
  const blockKeys = blocks.map(block => block.key);
  const blockOrganizer = useLibraryOrganizer('planning-timeline', blockKeys, blockKeys, next => {
    setDraft(null);
    onReorder?.(next.flatMap(key => { const block = blocks.find(block => block.key === key); return block ? [block.selectionKey] : []; }));
  }, true);
  const dragging = !!organizer.dragging || !!blockOrganizer.dragging;
  const actions = (id: string, ids: readonly string[], group = false) => ({
    accessibilityActions: [{ name: 'moveUp', label: 'Move up' }, { name: 'moveDown', label: 'Move down' }],
    onAccessibilityAction: (event: { nativeEvent: { actionName: string } }) => { const delta = event.nativeEvent.actionName === 'moveUp' ? -1 : event.nativeEvent.actionName === 'moveDown' ? 1 : 0; const to = ids[ids.indexOf(id) + delta]; if (delta && to) reorder(id, to, group); },
  });
  const grip = (key: string, scope: string, title: string, ids: readonly string[], group = false) => <Pressable accessibilityRole="button" accessibilityLabel={`Reorder ${title}`} accessibilityHint="Hold and drag, or use Move up and Move down" {...actions(group ? key.slice(6) : key, ids, group)} delayLongPress={350}
    onTouchStart={organizer.touchStart} onLongPress={() => { setDragScope(scope); moving.current = key; organizer.hold(key); }} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Copy muted style={{ fontSize: 20 }}>{'⠿'}</Copy></Pressable>;
  const check = (key: string, checked: boolean) => { if (!draft) return; setDraft(togglePlanningItems(draft, [key])); const item = shown.find(item => planningItemKey(item) === key); if (item) onItemCheck?.(planningOverrideKey(item), checked); };
  return <Sheet appearance="planner" title="Plan your free time" onClose={onClose} maxHeight="94%" footer={<PlanUndoBar removed={removed} onUndo={key => onPutBack?.(key)} onExpire={() => setRemoved(null)} />} scrollRef={value => { organizer.scrollRef.current = value; blockOrganizer.scrollRef.current = value; }} onScroll={event => { organizer.onScroll(event); blockOrganizer.onScroll(event); }} scrollEnabled={!dragging} dragEnabled={!dragging}
    renderHeader={close => <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingVertical: 10 }}><View style={{ flex: 1, gap: 4 }}><Copy style={{ fontSize: 20, fontWeight: '600', letterSpacing: -0.2 }}>Plan your free time</Copy><Copy muted style={{ fontSize: 13 }}>{plannerWindowLabel(from, to)}</Copy></View><Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}><Copy style={{ fontSize: 20 }}>{'×'}</Copy></Pressable></View>}>
    <SegmentedControl planner segments={[{ value: 'proposed', label: 'Proposed' }, { value: 'previous', label: 'Previous' }]} value={tab} onChange={setTab} />
    {tab === 'previous' ? <PreviousPlan previous={previous} disabled={busy || !data} onRestore={() => { setDraft(null); onRestore?.(); setTab('proposed'); }} /> : !data || !draft ? blocks.length ? <View style={{ gap: 20 }}>
      <PlanFitCard plan={displayPlan} blocks={blocks} free={freeTimeDuration(from, to)} /><PlanTimeline blocks={blocks} end={to} onOpen={onOpen} onSkip={onSkip} onRemove={onRemove ? removeBlock : undefined} onMoveUp={onMoveUp ? index => { setDraft(null); onMoveUp(index); } : undefined} organizer={onReorder ? blockOrganizer : undefined} />
      {error && <View accessibilityRole="alert"><Copy>{error}</Copy></View>}
      <PlannerButton disabled onPress={() => {}}>Use this plan</PlannerButton>
    </View> : error ? <View accessibilityRole="alert"><Copy>{error}</Copy></View> : <PlannerSkeleton /> : <View style={{ gap: 20 }}>
      <PlanFitCard candidates={data} plan={displayPlan} blocks={blocks} free={data.freeWindowMinutes} /><PlanTimeline blocks={blocks} end={to} candidates={data} onOpen={onOpen} onSkip={onSkip} onRemove={onRemove ? removeBlock : undefined} onMoveUp={onMoveUp ? index => { setDraft(null); onMoveUp(index); } : undefined} organizer={onReorder ? blockOrganizer : undefined} />
      {!!tray.length && <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: colors.separator, borderRadius: 18, paddingHorizontal: 16, paddingBottom: 10 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Taken out" accessibilityState={{ expanded: trayOpen }} onPress={() => setTrayOpen(!trayOpen)} style={{ minHeight: 44, justifyContent: 'center' }}><Copy style={{ fontSize: 14, fontWeight: '600' }}>Taken out · {tray.length} {trayOpen ? '^' : '?'}</Copy></Pressable>
        {trayOpen && tray.map(entry => <View key={entry.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderColor: colors.separator, paddingVertical: 8 }}><PlannerDot targets={targets} target={entry.item.courseId ?? planningItemKey(entry.item)} /><View style={{ flex: 1, gap: 2 }}><Copy style={{ fontSize: 13, lineHeight: 18 }}>{entry.item.title}</Copy><Copy muted size="caption">{entry.reason === 'skipped' ? 'Skipped tonight · returns next window' : 'Removed from plan'}</Copy></View><Pressable accessibilityRole="button" accessibilityLabel={`Put back ${entry.item.title}`} onPress={() => { onItemCheck?.(entry.key, true); setDraft({ ...draft, checked: [...new Set([...draft.checked, planningItemKey(entry.item)])] }); }} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.separator, justifyContent: 'center' }}><Copy style={{ fontSize: 13 }}>Put back</Copy></Pressable></View>)}
      </View>}
      <View style={{ gap: 4 }}><SectionLabel>Adjust</SectionLabel>
        <Pressable accessibilityRole="button" accessibilityLabel="Courses" accessibilityState={{ expanded: pickerOpen }} onPress={() => setPickerOpen(!pickerOpen)} style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: colors.separator }}><Copy style={{ flex: 1 }}>Courses</Copy><Copy muted>{draft.courses === 'all' ? `All ${data.courses.length}` : `${draft.courseIds.length} of ${data.courses.length}`} {'⌄'}</Copy></Pressable>
        {pickerOpen && data.courses.map(course => { const name = splitCourseName(course.name), checked = draft.courses === 'all' || draft.courseIds.includes(course.id); return <Pressable key={course.id} accessibilityRole="checkbox" accessibilityLabel={course.name} accessibilityState={{ checked }} onPress={() => { const selected = draft.courses === 'all' ? data.courses.map(course => course.id) : draft.courseIds; update({ ...draft, courses: 'select', courseIds: checked ? selected.filter(id => id !== course.id) : [...selected, course.id] }); }} style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}><PlannerDot targets={data.courses.map(course => course.id)} target={course.id} /><View style={{ flex: 1, gap: 2 }}><Copy style={{ fontSize: 14, fontWeight: '600' }}>{name.code}</Copy><Copy muted style={{ fontSize: 13, lineHeight: 18 }}>{name.name}</Copy></View><Copy muted size="caption">{course.items.length} items</Copy><RoundCheck checked={checked} /></Pressable>; })}
        <View style={{ minHeight: 52, gap: 12, flexDirection: 'row', alignItems: 'center' }}><Copy style={{ flex: 1 }}>Include</Copy><View style={{ flex: 3, minWidth: 0 }}><SegmentedControl segments={[{ value: 'reviewers' as const, label: 'Reviewers' }, { value: 'tasks' as const, label: 'Tasks' }, { value: 'reviewers_tasks' as const, label: 'Both' }]} value={draft.mode} onChange={mode => update({ ...draft, mode })} /></View></View>
      </View>
      <View ref={organizer.listRef} {...organizer.panHandlers} onTouchEnd={organizer.touchEnd} onTouchCancel={organizer.touchCancel}>
        <SectionLabel>{draft.order === 'smart' ? 'Smart order' : 'Manual order'}</SectionLabel><Copy muted size="caption">Uncheck to remove · drag to reorder</Copy>
        {draft.order === 'manual' && <PlannerButton secondary onPress={() => update(resetPlanningOrder(data, draft))}>Reset to smart order</PlannerButton>}
        {groups.map((group, index) => { const open = openGroups[group.id] ?? index === 0, ids = group.items.map(planningItemKey); return <View key={group.id} onLayout={event => organizer.layouts.current.set(`group:${group.id}`, event.nativeEvent.layout)} style={{ borderBottomWidth: 1, borderColor: colors.separator }}>
          <View onLayout={event => headerHeights.current.set(group.id, event.nativeEvent.layout.height)} style={{ flexDirection: 'row', alignItems: 'center' }}><Pressable accessibilityRole="button" accessibilityLabel={`${group.code} smart order`} accessibilityState={{ expanded: open }} {...actions(group.id, groups.map(group => group.id), true)} onPress={() => setOpenGroups({ ...openGroups, [group.id]: !open })} style={{ minHeight: 60, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}><PlannerDot targets={data.courses.map(course => course.id)} target={group.id} /><View style={{ flex: 1, gap: 3 }}><Copy style={{ fontSize: 14, lineHeight: 19 }}><Copy style={{ fontWeight: '600' }}>{group.code}</Copy> · {group.name}</Copy><Copy muted size="caption">{group.items.filter(item => blocks.some(block => block.selectionKey === planningItemKey(item))).length} of {group.items.filter(item => draft.checked.includes(planningItemKey(item))).length} in plan · {group.items.reduce((sum, item) => sum + item.estimateMinutes, 0)} min</Copy></View><Copy muted>{open ? '^' : '?'}</Copy></Pressable>{grip(`group:${group.id}`, 'groups', group.code, groups.map(group => group.id), true)}</View>
          {open && <View style={{ paddingLeft: 22, paddingBottom: 10 }}>{group.items.map(item => { const key = planningItemKey(item), checked = draft.checked.includes(key), removed = overrides?.removed.includes(planningOverrideKey(item)), skipped = overrides?.skipped.includes(planningOverrideKey(item)); const status = removed ? 'Removed' : skipped ? 'Skipped tonight' : blocks.some(block => block.selectionKey === key) ? 'In plan' : 'Next free window'; return <View key={key} onLayout={event => { const parent = organizer.layouts.current.get(`group:${group.id}`); organizer.layouts.current.set(key, { ...event.nativeEvent.layout, y: (parent?.y ?? 0) + (headerHeights.current.get(group.id) ?? 60) + event.nativeEvent.layout.y }); }} style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 4 }}><Pressable accessibilityRole="checkbox" accessibilityLabel={item.title} accessibilityState={{ checked }} {...actions(key, ids)} onPress={() => check(key, !checked)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><RoundCheck checked={checked} /></Pressable><View style={{ flex: 1, gap: 2, paddingVertical: 6 }}><Copy color={checked ? colors.textPrimary : colors.textMuted} style={{ fontSize: 14, lineHeight: 19, textDecorationLine: removed ? 'line-through' : 'none' }}>{item.title}</Copy><Copy muted size="caption">{item.estimateMinutes} min · {item.kind === 'reviewer' ? 'Reviewer' : 'Task'} · {status}</Copy></View>{grip(key, group.id, item.title, ids)}</View>; })}</View>}
        </View>; })}
      </View>
      {draft.courses === 'select' && !draft.courseIds.length && <Copy>Pick at least one course</Copy>}
      <PlannerButton disabled={busy || !blocks.length || (draft.courses === 'select' && !draft.courseIds.length) || (!!onApply && !plan)} onPress={() => { if (onApply) onApply(); else onBuild({ mode: draft.mode, selection: builtPlanningSelection(data, draft), draft }); onClose(); }}>Use this plan</PlannerButton>
    </View>}
  </Sheet>;
}
function SectionLabel({ children }: { children: string }) { return <Copy muted style={{ fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.04, marginBottom: 6 }}>{children}</Copy>; }
