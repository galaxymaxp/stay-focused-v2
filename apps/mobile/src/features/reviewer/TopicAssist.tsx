import { TOPIC_ACTIONS, TOPIC_LEVELS, TOPIC_LABELS, TOPIC_SHORT_LABELS, EXPOUND_LABEL, STUDY_OFFLINE, STUDY_GROUNDING_LABELS, selectTopic, topicLevelAction,
  type ReviewerReaderModel, type TopicAction, type TopicLevel, type TopicResult } from '@stay-focused/shared';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import type { ExperienceClient } from '../../services/experienceApi';
import { Copy } from '../../design/primitives';
import { useTheme } from '../../design/theme';
import { radius, shadows, spacing } from '../../design/tokens';
import { topicAssist } from './assistStore';
import { StudyText } from './StudyText';
import { StudyAnswerArea, useAnswerReveal } from './studyAnswerScroll';

type Entry = { status: 'pending' | 'ready' | 'error'; result?: TopicResult; error?: string };
type Props = {
  reviewer: ReviewerReaderModel; sectionId: string; owner: string; client: ExperienceClient; online: boolean; children: ReactNode;
};
type OptionLayout = { x: number; width: number };
function LevelThumb({ layout }: { layout: OptionLayout | undefined }) {
  const { colors, reducedMotion } = useTheme();
  const [x] = useState(() => new Animated.Value(0));
  const [width] = useState(() => new Animated.Value(0));
  const positioned = useRef(false);
  const targetX = layout?.x, targetWidth = layout?.width;
  useEffect(() => {
    if (targetX === undefined || !targetWidth) return;
    if (reducedMotion || !positioned.current) {
      x.setValue(targetX); width.setValue(targetWidth); positioned.current = true;
      return;
    }
    const easing = Easing.inOut(Easing.ease);
    // Translation runs natively; width requires the layout driver on its own node.
    const animation = Animated.parallel([
      Animated.timing(x, { toValue: targetX, duration: 200, easing, useNativeDriver: true }),
      Animated.timing(width, { toValue: targetWidth, duration: 200, easing, useNativeDriver: false }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [targetX, targetWidth, reducedMotion, x, width]);
  if (!layout) return null;
  return <Animated.View pointerEvents="none" accessible={false} style={{ position: 'absolute', left: 0, top: spacing[2], bottom: spacing[2], transform: [{ translateX: x }] }}>
    <Animated.View testID="topic-level-thumb" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ width, flex: 1, borderRadius: radius.pill, backgroundColor: colors.surfaceElevated, ...shadows.card }} />
  </Animated.View>;
}
export function TopicAssist(props: Props) {
  const selection = useMemo(() => selectTopic(props.reviewer, props.sectionId), [props.reviewer, props.sectionId]);
  // Keep the exact reset identity without reserializing the full topic on parent updates.
  const contentKey = useMemo(() => JSON.stringify([props.owner, selection?.reviewerId, selection?.sectionId, selection?.canonicalContent]), [props.owner, selection]);
  return <TopicAssistContent key={contentKey} {...props} />;
}
function TopicAssistContent({ reviewer, sectionId, owner, client, online, children }: Props) {
  const { colors } = useTheme();
  const selection = useMemo(() => selectTopic(reviewer, sectionId), [reviewer, sectionId]);
  const [level, setLevel] = useState<TopicLevel>('original');
  const [expanded, setExpanded] = useState(false);
  // Preserve RV2's compact labels below 380pt of available topic width.
  const [rowWidth, setRowWidth] = useState(0);
  const labels = rowWidth < 380 ? TOPIC_SHORT_LABELS : TOPIC_LABELS;
  const [layouts, setLayouts] = useState<Partial<Record<TopicLevel, OptionLayout>>>({});
  const [entries, setEntries] = useState<Partial<Record<TopicAction, Entry>>>({});
  const alive = useRef(true);
  const reveal = useAnswerReveal();
  const bodyId = `topic-${sectionId}-body`, expoundId = `topic-${sectionId}-expound`;
  useEffect(() => {
    alive.current = true;
    if (selection) for (const action of TOPIC_ACTIONS) void topicAssist.peek(owner, selection, action).then(result => {
      if (result && alive.current) setEntries(old => old[action] ? old : { ...old, [action]: { status: 'ready', result } });
    });
    return () => { alive.current = false; };
  }, [owner, selection]);
  const action = topicLevelAction(level), current = action ? entries[action] : undefined;
  const expound = entries.topic_expound;
  const canUse = (action: TopicAction) => !!selection && !!owner && (online || entries[action]?.status === 'ready');
  function run(action: TopicAction, target: string) {
    if (!selection) return;
    const token = reveal.begin(target);
    if (entries[action]?.status === 'ready') return;
    setEntries(old => ({ ...old, [action]: { status: 'pending' } }));
    void topicAssist.run(owner, client, selection, action, online).then(result => {
      if (alive.current) { setEntries(old => ({ ...old, [action]: { status: 'ready', result } })); reveal.complete(token); }
    }, () => {
      if (alive.current) {
        setEntries(old => ({ ...old, [action]: { status: 'error', error: online
          ? 'This explanation could not be generated. Try again in a moment.' : STUDY_OFFLINE } }));
        reveal.complete(token);
      }
    });
  }
  function choose(next: TopicLevel) {
    setLevel(next);
    const nextAction = topicLevelAction(next);
    if (nextAction) run(nextAction, bodyId); else reveal.cancel();
  }
  function toggleExpound() {
    setExpanded(!expanded);
    if (!expanded) run('topic_expound', expoundId); else reveal.cancel();
  }
  const renderEntry = (entry: Entry | undefined, retry: () => void) => entry?.status === 'ready' && entry.result
    ? <View style={{ gap: spacing[2] }}><Copy size="caption" muted>{STUDY_GROUNDING_LABELS[entry.result.grounding]}</Copy><StudyText text={entry.result.text} /></View>
    : entry?.status === 'error' ? <View><Copy>{entry.error}</Copy><Pressable accessibilityRole="button" accessibilityLabel="Retry topic explanation" disabled={!online} onPress={retry}><Copy color={colors.accent}>Retry</Copy></Pressable></View>
    : <Copy muted>Creating your explanation…</Copy>;
  return <View style={{ gap: spacing[3] }}>
    <View onLayout={event => setRowWidth(event.nativeEvent.layout.width)} testID="topic-level-available-width">
    <View testID="topic-level-pill" style={{ alignSelf: 'flex-start', maxWidth: '100%', flexDirection: 'row', alignItems: 'center', minHeight: spacing[12], paddingHorizontal: spacing[1], gap: spacing[1] }}>
      <View testID="topic-level-track" pointerEvents="none" accessible={false} style={{ position: 'absolute', left: 0, right: 0, top: spacing[1], bottom: spacing[1], borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary }} />
      <View accessibilityRole="radiogroup" accessibilityLabel="Topic level" style={{ minWidth: 0, minHeight: spacing[12], flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
        <LevelThumb layout={layouts[level]} />
        {TOPIC_LEVELS.map(item => { const a = topicLevelAction(item), disabled = !!a && !canUse(a); return <Pressable key={item}
          accessibilityRole="radio" accessibilityLabel={TOPIC_LABELS[item]} accessibilityState={{ checked: level === item, disabled }}
          onLayout={event => { const { x, width } = event.nativeEvent.layout; setLayouts(old => old[item]?.x === x && old[item]?.width === width ? old : { ...old, [item]: { x, width } }); }}
          disabled={disabled} onPress={() => choose(item)} hitSlop={{ top: 2, bottom: 2 }}
          style={{ minWidth: 0, flexShrink: 1, minHeight: 44, paddingHorizontal: spacing[2], justifyContent: 'center', borderRadius: radius.pill, opacity: disabled ? 0.45 : 1 }}>
          <Copy size="caption" numberOfLines={1} style={{ textAlign: 'center' }} color={colors.textPrimary}>{labels[item]}</Copy>
        </Pressable>; })}
      </View>
      <View style={{ minWidth: 0, minHeight: spacing[12], justifyContent: 'center' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={EXPOUND_LABEL} accessibilityState={{ expanded, disabled: !expanded && !canUse('topic_expound') }}
          disabled={!expanded && !canUse('topic_expound')} onPress={toggleExpound} hitSlop={{ top: 2, bottom: 2 }}
          style={{ minHeight: 44, paddingHorizontal: spacing[2], justifyContent: 'center', borderRadius: radius.pill, opacity: expanded || canUse('topic_expound') ? 1 : 0.45 }}>
          {expanded && <View testID="topic-expound-thumb" pointerEvents="none" accessible={false} style={{ position: 'absolute', left: 0, right: 0, top: spacing[1] + 2, bottom: spacing[1] + 2, borderRadius: radius.pill, backgroundColor: colors.surfaceElevated, ...shadows.card }} />}
          <Copy size="caption" numberOfLines={1} style={{ textAlign: 'center' }} color={colors.textPrimary}>{EXPOUND_LABEL}</Copy>
        </Pressable>
      </View>
    </View>
    </View>
    {!online && <Copy size="caption" muted>{STUDY_OFFLINE}</Copy>}
    <StudyAnswerArea id={bodyId}>{level === 'original' ? children : renderEntry(current, () => action && run(action, bodyId))}</StudyAnswerArea>
    {expanded && <StudyAnswerArea id={expoundId}><View style={{ gap: spacing[2] }}><Copy size="h3">Expound</Copy>{renderEntry(expound, () => run('topic_expound', expoundId))}</View></StudyAnswerArea>}
  </View>;
}
