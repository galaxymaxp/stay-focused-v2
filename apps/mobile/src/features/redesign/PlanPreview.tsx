import { plannerShortTime, freeTimeDuration, plannerFit, plannerBlocks, plannerToneKeys, plannerToneTarget, PREVIOUS_PLAN_EMPTY, type PlannerBlock, type PreviousPlanView } from '@stay-focused/shared';
import { proposalTargetKey, type DeterministicStudyPlan, type PlanningCandidates } from '@stay-focused/shared/task-planning';
import { Animated, Pressable, View } from 'react-native';
import type { useLibraryOrganizer } from './useLibraryOrganizer';
import { EyeOff, X } from 'lucide-react-native';
import { SwipeRow, swipeAccessibility } from '../../design/SwipeRow';
import { Copy } from '../../design/primitives';
import { useTheme } from '../../design/theme';

const TONES = ['blue', 'violet', 'green', 'orange'] as const;
/** Existing ring palette and target assignment, unchanged. */
export function planToneFor(taskIds: readonly string[], taskId: string): (typeof TONES)[number] {
  const index = taskIds.indexOf(taskId);
  return TONES[(index < 0 ? 0 : index) % TONES.length]!;
}
export function planTaskIds(plan: Pick<DeterministicStudyPlan, 'sessions'>): string[] {
  return [...new Set(plan.sessions.map(proposalTargetKey))];
}
export function PlannerButton({ children, onPress, disabled = false, secondary = false, label }: {
  children: string; onPress: () => void; disabled?: boolean; secondary?: boolean; label?: string;
}) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label ?? children} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={{ minHeight: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, opacity: disabled ? 0.4 : 1,
      backgroundColor: secondary ? 'transparent' : colors.textPrimary, borderWidth: secondary ? 1 : 0, borderColor: colors.separator }}>
    <Copy color={secondary ? colors.textPrimary : colors.backgroundPrimary} style={{ fontSize: 16, fontWeight: '600' }}>{children}</Copy>
  </Pressable>;
}
export function PlannerDot({ targets, target }: { targets: readonly string[]; target: string }) {
  const { colors } = useTheme();
  return <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors[planToneFor(targets, target)] }} />;
}
export function PlanFitCard({ plan, blocks, free, candidates }: { plan: DeterministicStudyPlan | null; blocks: readonly PlannerBlock[]; free: number; candidates?: PlanningCandidates | null }) {
  const { colors } = useTheme(), fit = plannerFit(plan, blocks, free), targets = plannerToneKeys(blocks, candidates?.courses);
  return <View testID="plan-fit" style={{ backgroundColor: colors.surfacePrimary, borderWidth: 1, borderColor: colors.separator, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 18, gap: 10 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
      <Copy style={{ fontSize: 16, fontWeight: '600' }}>{fit.headline}</Copy><Copy muted style={{ fontSize: 13, fontVariant: ['tabular-nums'] }}>{fit.ratio}</Copy>
    </View>
    <View accessible accessibilityLabel={fit.ratio} style={{ height: 6, borderRadius: 3, overflow: 'hidden', flexDirection: 'row', backgroundColor: colors.separator }}>
      {fit.segments.map(segment => <View key={segment.key} testID="fit-segment" style={{ width: `${segment.fraction * 100}%`, height: 6, backgroundColor: colors[planToneFor(targets, segment.targetKey)], borderRightWidth: 2, borderColor: colors.surfacePrimary }} />)}
    </View>
    <Copy muted style={{ fontSize: 13, lineHeight: 19.5 }}>{fit.subline}</Copy>
  </View>;
}
export function PlanTimeline({ blocks, end, candidates, onOpen, onSkip, onRemove, onMoveUp, organizer }: { blocks: readonly PlannerBlock[]; end: number; candidates?: PlanningCandidates | null; onOpen?: (block: PlannerBlock) => void; onSkip?: (key: string) => void; onRemove?: (block: PlannerBlock) => void; onMoveUp?: (index: number) => void; organizer?: ReturnType<typeof useLibraryOrganizer> }) {
  const { colors, reducedMotion } = useTheme(), targets = plannerToneKeys(blocks, candidates?.courses);
  return <View ref={organizer?.listRef} {...organizer?.panHandlers} onTouchEnd={organizer?.touchEnd} onTouchCancel={organizer?.touchCancel} style={{ gap: 8 }}>
    {blocks.map((block, index) => {
      const actions = block.selectionKey && onSkip && onRemove && onMoveUp ? [
        { key: 'skip', label: 'Skip tonight', icon: EyeOff, tone: 'neutral' as const, onPress: () => onSkip(block.selectionKey) },
        { key: 'remove', label: 'Remove', icon: X, tone: 'neutral' as const, onPress: () => onRemove(block) },
        ...(index ? [{ key: 'moveUp', label: 'Move up', icon: X, tone: 'neutral' as const, onPress: () => onMoveUp(index) }] : []),
      ] : [];
      const card = <Pressable accessibilityRole="button" accessibilityLabel={`${block.kind === 'reviewer' ? 'Review: ' : ''}${block.title}`} disabled={!onOpen && !actions.length} {...swipeAccessibility(actions)} delayLongPress={350} onTouchStart={organizer?.touchStart} onLongPress={organizer && block.selectionKey ? () => organizer.hold(block.key) : undefined} onPress={() => { if (organizer) organizer.tap(block.key, () => onOpen?.(block)); else onOpen?.(block); }}
        style={{ flex: 1, minWidth: 0, minHeight: 80, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.surfacePrimary, borderWidth: organizer?.dragging === block.key ? 1 : 0, borderColor: 'rgba(255,255,255,0.12)', gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><PlannerDot targets={targets} target={plannerToneTarget(block)} /><Copy muted size="caption">{candidates?.courses.find(course => course.id === block.courseId)?.name.split('|')[0]?.trim() ?? block.savedItem?.course?.code ?? 'Personal'}</Copy></View>
        <Copy style={{ fontSize: 15, fontWeight: '600', lineHeight: 20.25 }}>{block.title}</Copy>
        <Copy muted size="caption">{block.minutes} min · {block.kind === 'reviewer' ? 'Reviewer' : 'Task'}</Copy>
      </Pressable>;
      const lifted = organizer?.dragging === block.key;
      return <Animated.View key={block.key} testID={'timeline-block-' + block.key} onLayout={event => organizer?.layouts.current.set(block.key, event.nativeEvent.layout)} style={{ flexDirection: 'row', gap: 12, alignItems: 'stretch', zIndex: lifted ? 10 : 0, transform: lifted ? [{ translateY: organizer.translate }, { scale: reducedMotion ? 1 : 1.03 }, { rotate: reducedMotion ? '0deg' : '-1deg' }] : [], shadowColor: '#000', shadowOpacity: lifted ? .5 : 0, shadowRadius: 34, shadowOffset: { width: 0, height: 16 }, elevation: lifted ? 16 : 0 }}>
        <Copy muted style={{ width: 44, paddingTop: 14, textAlign: 'right', fontSize: 13, fontVariant: ['tabular-nums'] }}>{block.start}</Copy>
        <View style={{ flex: 1, minWidth: 0 }}>{actions.length ? <SwipeRow planner disabled={!!organizer?.dragging} background={colors.surfacePrimary} leading={[{ ...actions[0]!, label: 'Skip' }]} trailing={[actions[1]!]}>{card}</SwipeRow> : card}</View>
      </Animated.View>;
    })}
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Copy muted style={{ width: 44, textAlign: 'right', fontSize: 13 }}>{plannerShortTime(end)}</Copy><Copy muted size="caption">Free time ends</Copy></View>
  </View>;
}
export function PreviousPlan({ previous, onRestore, disabled }: { previous: PreviousPlanView; onRestore: () => void; disabled?: boolean }) {
  const { colors } = useTheme();
  if (!previous) return <View style={{ borderRadius: 22, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.separator, paddingVertical: 40, paddingHorizontal: 24, gap: 8 }}><Copy style={{ fontSize: 16, fontWeight: '600', textAlign: 'center' }}>No previous plan yet</Copy><Copy muted style={{ fontSize: 14, lineHeight: 21, textAlign: 'center' }}>{PREVIOUS_PLAN_EMPTY}</Copy></View>;
  const done = previous.sessions.filter(session => session.status === 'Done').length;
  return <View style={{ gap: 20 }}>
    <View style={{ backgroundColor: colors.surfacePrimary, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 18, gap: 6 }}><Copy style={{ fontSize: 16, fontWeight: '600' }}>{previous.summary}</Copy>{previous.sessions.some(session => session.status !== null) && <Copy muted style={{ fontSize: 13 }}>{done} of {previous.sessions.length} blocks done.</Copy>}</View>
    {previous.sessions.map((session, index) => <View key={`${session.kind}:${session.id}:${index}`} style={{ flexDirection: 'row', gap: 12 }}><Copy muted style={{ width: 44, paddingTop: 14, textAlign: 'right', fontSize: 13 }}>{plannerShortTime(session.startMinute)}</Copy><View style={{ flex: 1, backgroundColor: colors.surfacePrimary, borderRadius: 16, padding: 14, gap: 4 }}><Copy style={{ fontSize: 15, fontWeight: '600' }}>{session.title}</Copy><Copy muted size="caption">{session.status ?? `${session.minutes} min · ${session.kind === 'reviewer' ? 'Reviewer' : 'Task'}`}</Copy></View></View>)}
    <PlannerButton secondary disabled={disabled} onPress={onRestore}>Restore this plan</PlannerButton>
  </View>;
}
/** Compatibility export for isolated preview consumers; Today hosts this content in the sheet. */
export function PlanPreview({ plan, from, to, busy, onApply }: { plan: DeterministicStudyPlan; from: number; to: number; busy: boolean; onApply: () => void; onDiscard?: () => void }) {
  const blocks = plannerBlocks(plan);
  return <View style={{ gap: 20 }}><PlanFitCard plan={plan} blocks={blocks} free={freeTimeDuration(from, to)} /><PlanTimeline blocks={blocks} end={to} /><PlannerButton disabled={busy || !blocks.length} onPress={onApply}>Use this plan</PlannerButton></View>;
}
