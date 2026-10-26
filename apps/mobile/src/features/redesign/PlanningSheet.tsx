import { builtPlanningSelection, defaultPlanningDraft, movePlanningEntry, planningDraftSummary, allPlanningItems, planningOverrideKey, planningItemKey, planningTitle,
  resetPlanningOrder, scopedPlanningItems, togglePlanningItems, type PlanningDraft, type PlanOverrides } from '@stay-focused/shared';
import { PLAN_EMPTY_COPY, type PlanMode, type PlanSelection, type PlanningCandidates, type StudyPlanningRequest } from '@stay-focused/shared/task-planning';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Action, ContentIcon, Copy, SegmentedControl, Sheet } from '../../design/primitives';
import { useTheme } from '../../design/theme';
import { radius, spacing } from '../../design/tokens';
import { PlanButton } from './PlanButton';
import { useLibraryOrganizer } from './useLibraryOrganizer';

export interface BuiltPlanningChoice { readonly mode: PlanMode; readonly selection: PlanSelection; readonly draft: PlanningDraft }
export function PlanningControl({ request, active, load, onBuild, disabled, overrides, onItemCheck }: {
  request: StudyPlanningRequest; active: BuiltPlanningChoice | null; load: (request: StudyPlanningRequest) => Promise<PlanningCandidates>;
  onBuild: (choice: BuiltPlanningChoice) => void; disabled?: boolean; overrides?: PlanOverrides; onItemCheck?: (key: string, checked: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <PlanButton disabled={disabled} onPress={() => setOpen(true)} />
    {open && <PlanningSheet overrides={overrides} onItemCheck={onItemCheck} request={request} active={active} load={load} onBuild={choice => { onBuild(choice); setOpen(false); }} onClose={() => setOpen(false)} />}
  </>;
}
export function PlanningSheet({ request, active, load, onBuild, onClose, overrides, onItemCheck }: {
  request: StudyPlanningRequest; active: BuiltPlanningChoice | null; load: (request: StudyPlanningRequest) => Promise<PlanningCandidates>;
  onBuild: (choice: BuiltPlanningChoice) => void; onClose: () => void; overrides?: PlanOverrides; onItemCheck?: (key: string, checked: boolean) => void;
}) {
  const [data, setData] = useState<PlanningCandidates | null>(null), [storedDraft, setDraft] = useState<PlanningDraft | null>(null);
  const [error, setError] = useState<string | null>(null), [expanded, setExpanded] = useState(false);
  const latest = useRef({ active, load, overrides }); latest.current = { active, load, overrides };
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
    let live = true; setData(null); setDraft(null); setError(null);
    void latest.current.load(JSON.parse(requestKey) as StudyPlanningRequest).then(value => {
      if (live) { setData(value); setDraft(() => { const draft = latest.current.active?.draft ?? defaultPlanningDraft(value); const keys = new Set([...(latest.current.overrides?.removed ?? []), ...(latest.current.overrides?.skipped ?? [])]); for (const item of allPlanningItems(value)) if (keys.has(planningOverrideKey(item))) keys.add(planningItemKey(item)); return { ...draft, checked: draft.checked.filter(key => !keys.has(key)) }; }); }
    }).catch(() => { if (live) setError('Could not load planning items. Close and try again.'); });
    return () => { live = false; };
  }, [requestKey]);
  const { colors } = useTheme();
  const summary = data && draft ? planningDraftSummary(data, draft) : null;
  const shown = data && draft ? scopedPlanningItems(data, draft) : [];
  const groups = draft?.groupOrder.map(id => ({ id, name: data?.courses.find(course => course.id === id)?.name ?? 'Personal', items: shown.filter(item => (item.courseId ?? 'personal') === id) })).filter(group => group.items.length) ?? [];
  const entries = groups.flatMap(group => [{ key: `group:${group.id}`, scope: 'groups' }, ...group.items.map(item => ({ key: planningItemKey(item), scope: group.id }))]);
  const [dragScope, setDragScope] = useState<string | null>(null);
  const keys = entries.map(entry => entry.key), visible = entries.filter(entry => !dragScope || entry.scope === dragScope).map(entry => entry.key);
  const reorder = (from: string, to: string, group: boolean) => { if (data && draft) setDraft(movePlanningEntry(data, draft, from, to, group)); };
  const moving = useRef<string | null>(null);
  const organizer = useLibraryOrganizer('planning-items', keys, visible, next => {
    const from = moving.current;
    if (!from) return;
    const oldOrder = keys.filter(key => visible.includes(key)), nextOrder = next.filter(key => visible.includes(key));
    const to = oldOrder[nextOrder.indexOf(from)];
    if (!to) return;
    reorder(from.startsWith('group:') ? from.slice(6) : from, to.startsWith('group:') ? to.slice(6) : to, from.startsWith('group:'));
  });
  const dragHandle = (key: string, scope: string, label: string) => <Pressable accessibilityRole="button" accessibilityLabel={`Reorder ${label}`}
    accessibilityHint="Hold and drag, or use Move up and Move down" delayLongPress={350}
    onTouchStart={organizer.touchStart} onLongPress={() => { setDragScope(scope); moving.current = key; organizer.hold(key); }}
    style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}><Copy muted>≡</Copy></Pressable>;
  const move = (id: string, ids: readonly string[], group: boolean, delta: number) => { const to = ids[ids.indexOf(id) + delta]; if (to) reorder(id, to, group); };
  const moves = (id: string, ids: readonly string[], group: boolean, label: string) => <View style={{ flexDirection: 'row' }}>
    {([-1, 1] as const).map(delta => <Pressable key={delta} accessibilityRole="button" accessibilityLabel={`Move ${label} ${delta < 0 ? 'up' : 'down'}`} disabled={!ids[ids.indexOf(id) + delta]}
      accessibilityState={{ disabled: !ids[ids.indexOf(id) + delta] }} onPress={() => move(id, ids, group, delta)}
      style={{ minWidth: 44, minHeight: 44, opacity: ids[ids.indexOf(id) + delta] ? 1 : 0.35, justifyContent: 'center', alignItems: 'center' }}><Copy>{delta < 0 ? '↑' : '↓'}</Copy></Pressable>)}
  </View>;
  const actions = (id: string, ids: readonly string[], group: boolean) => ({
    accessibilityActions: [{ name: 'moveUp', label: 'Move up' }, { name: 'moveDown', label: 'Move down' }],
    onAccessibilityAction: (event: { nativeEvent: { actionName: string } }) => { if (event.nativeEvent.actionName === 'moveUp') move(id, ids, group, -1); if (event.nativeEvent.actionName === 'moveDown') move(id, ids, group, 1); },
  });
  return <Sheet title="Plan your free time" titleMeta={<Copy muted size="caption">{data?.freeWindowMinutes ?? '…'} min</Copy>} closeLabel="Close" onClose={onClose} maxHeight="65%" scrollRef={organizer.scrollRef} onScroll={organizer.onScroll} scrollEnabled={!organizer.dragging} dragEnabled={!organizer.dragging}>
    {error && <NoticeText text={error} />}{!data && !error && <Copy accessibilityLiveRegion="polite">Loading planning items…</Copy>}
    {data && draft && summary && <>
      <Copy size="h3">Courses</Copy><SegmentedControl segments={[{ value: 'all' as const, label: 'All' }, { value: 'select' as const, label: 'Select' }]} value={draft.courses} onChange={courses => setDraft({ ...draft, courses })} />
      {draft.courses === 'select' && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>{data.courses.map(course => <Pressable key={course.id} accessibilityRole="checkbox" accessibilityLabel={course.name} accessibilityState={{ checked: draft.courseIds.includes(course.id) }} aria-checked={draft.courseIds.includes(course.id)}
        onPress={() => setDraft({ ...draft, courseIds: draft.courseIds.includes(course.id) ? draft.courseIds.filter(id => id !== course.id) : [...draft.courseIds, course.id] })}
        style={{ minHeight: 44, maxWidth: '100%', justifyContent: 'center', paddingHorizontal: spacing[3], borderRadius: radius.control, borderWidth: 1, borderColor: draft.courseIds.includes(course.id) ? colors.textPrimary : colors.separator }}><Copy>{course.name}</Copy></Pressable>)}</View>}
      <Copy size="h3">Include</Copy><SegmentedControl segments={[{ value: 'reviewers' as const, label: 'Reviewers' }, { value: 'tasks' as const, label: 'Tasks' }, { value: 'reviewers_tasks' as const, label: 'Both' }]} value={draft.mode} onChange={mode => setDraft({ ...draft, mode })} />
      <Pressable accessibilityRole="button" accessibilityLabel="Planning summary" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Copy color={colors.textSecondary}>{summary.count} items · ~{summary.minutes} min of {data.freeWindowMinutes} min free{summary.minutes > data.freeWindowMinutes ? ` · ~${summary.notFitMinutes} min won't fit` : ''}</Copy>
      </Pressable>
      {!shown.length && <Copy accessibilityLiveRegion="polite">{draft.courses === 'select' ? 'Nothing to plan in these courses.' : PLAN_EMPTY_COPY[draft.mode]}</Copy>}
      {expanded && <>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Copy size="h3">{draft.order === 'smart' ? 'Smart order' : 'Manual order'}</Copy>{draft.order === 'manual' && <Action secondary onPress={() => setDraft(resetPlanningOrder(data, draft))}>Reset to smart order</Action>}</View>
        <View ref={organizer.listRef} {...organizer.panHandlers} onTouchEnd={organizer.touchEnd} onTouchCancel={organizer.touchCancel}>
          {groups.flatMap(group => {
            const itemKeys = group.items.map(planningItemKey), checked = itemKeys.filter(key => draft.checked.includes(key)).length;
            return [
              <View key={`group:${group.id}`} onLayout={event => organizer.layouts.current.set(`group:${group.id}`, event.nativeEvent.layout)} style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: colors.separator }}>
                <Pressable accessibilityRole="checkbox" accessibilityLabel={`${group.name}, ${itemKeys.length} items`} accessibilityState={{ checked: checked === itemKeys.length ? true : checked ? 'mixed' : false }} aria-checked={checked === itemKeys.length ? true : checked ? 'mixed' : false} {...actions(group.id, groups.map(group => group.id), true)} onPress={() => setDraft(togglePlanningItems(draft, itemKeys))} style={{ minHeight: 48, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Copy>{checked === itemKeys.length ? '☑' : checked ? '−' : '☐'}</Copy><Copy size="h3" style={{ flex: 1 }}>{group.name} · {itemKeys.length}</Copy>
                </Pressable>{moves(group.id, groups.map(group => group.id), true, group.name)}{dragHandle(`group:${group.id}`, 'groups', group.name)}
              </View>,
              ...group.items.map(item => <View key={planningItemKey(item)} onLayout={event => organizer.layouts.current.set(planningItemKey(item), event.nativeEvent.layout)} style={{ borderBottomWidth: 1, borderColor: colors.separator, paddingVertical: 4 }}>
                <Pressable accessibilityRole="checkbox" accessibilityLabel={`${item.title}, ${item.estimateMinutes} minutes${item.openedWithin24h ? ', Opened today' : ''}`} accessibilityState={{ checked: draft.checked.includes(planningItemKey(item)) }} aria-checked={draft.checked.includes(planningItemKey(item))}
                  {...actions(planningItemKey(item), itemKeys, false)} onPress={() => { const key = planningItemKey(item); onItemCheck?.(planningOverrideKey(item), !draft.checked.includes(key)); setDraft(togglePlanningItems(draft, [key])); }} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Copy>{draft.checked.includes(planningItemKey(item)) ? '☑' : '☐'}</Copy><ContentIcon kind={item.kind} small /><View style={{ flex: 1 }}><PlanningTitle title={item.title} />{item.openedWithin24h && <Copy muted size="caption">Opened today</Copy>}</View><Copy muted size="caption">{item.estimateMinutes}m</Copy>
                </Pressable>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>{moves(planningItemKey(item), itemKeys, false, item.title)}{dragHandle(planningItemKey(item), group.id, item.title)}</View>
              </View>),
            ];
          })}
        </View>
      </>}
      <Action secondary onPress={() => setDraft(defaultPlanningDraft(data))}>Reset to all</Action>
      {draft.courses === 'select' && !draft.courseIds.length && <Copy accessibilityLiveRegion="polite">Pick at least one course</Copy>}
      <Action disabled={draft.courses === 'select' && !draft.courseIds.length} onPress={() => onBuild({ mode: draft.mode, selection: builtPlanningSelection(data, draft), draft })}>Build plan</Action>
    </>}
  </Sheet>;
}
function NoticeText({ text }: { text: string }) { return <View accessibilityRole="alert"><Copy>{text}</Copy></View>; }
function PlanningTitle({ title }: { title: string }) {
  const [limit, setLimit] = useState(24);
  return <View onLayout={event => setLimit(Math.max(8, Math.floor(event.nativeEvent.layout.width / 15) * 2))}>
    <Copy numberOfLines={2} ellipsizeMode="middle">{planningTitle(title, limit)}</Copy>
  </View>;
}
