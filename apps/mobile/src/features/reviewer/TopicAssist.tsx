import { TOPIC_ACTIONS, TOPIC_LEVELS, TOPIC_LABELS, TOPIC_SHORT_LABELS, EXPOUND_LABEL, STUDY_OFFLINE, STUDY_GROUNDING_LABELS, selectTopic, topicLevelAction,
  type ReviewerReaderModel, type TopicAction, type TopicLevel, type TopicResult } from '@stay-focused/shared';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { ExperienceClient } from '../../services/experienceApi';
import { Copy } from '../../design/primitives';
import { useTheme } from '../../design/theme';
import { radius, spacing } from '../../design/tokens';
import { topicAssist } from './assistStore';
import { StudyText } from './StudyText';
import { StudyAnswerArea, useAnswerReveal } from './studyAnswerScroll';

type Entry = { status: 'pending' | 'ready' | 'error'; result?: TopicResult; error?: string };
type Props = {
  reviewer: ReviewerReaderModel; sectionId: string; owner: string; client: ExperienceClient; online: boolean; children: ReactNode;
};
export function TopicAssist(props: Props) {
  const selection = useMemo(() => selectTopic(props.reviewer, props.sectionId), [props.reviewer, props.sectionId]);
  return <TopicAssistContent key={JSON.stringify([props.owner, selection?.reviewerId, selection?.sectionId, selection?.canonicalContent])} {...props} />;
}
function TopicAssistContent({ reviewer, sectionId, owner, client, online, children }: Props) {
  const { colors } = useTheme();
  const selection = useMemo(() => selectTopic(reviewer, sectionId), [reviewer, sectionId]);
  const [level, setLevel] = useState<TopicLevel>('original');
  const [expanded, setExpanded] = useState(false);
  // Below 380pt, each quarter has less than ~85pt for the longest full label.
  const [rowWidth, setRowWidth] = useState(0);
  const labels = rowWidth < 380 ? TOPIC_SHORT_LABELS : TOPIC_LABELS;
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
    <View testID="topic-level-pill" onLayout={event => setRowWidth(event.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: spacing[1], borderRadius: radius.control, backgroundColor: colors.surfaceSecondary }}>
      <View accessibilityRole="radiogroup" accessibilityLabel="Topic level" style={{ flex: 3, minWidth: 0, minHeight: 44, flexDirection: 'row', alignItems: 'center' }}>
        {TOPIC_LEVELS.map(item => { const a = topicLevelAction(item), disabled = !!a && !canUse(a); return <Pressable key={item}
          accessibilityRole="radio" accessibilityLabel={TOPIC_LABELS[item]} accessibilityState={{ checked: level === item, disabled }}
          disabled={disabled} onPress={() => choose(item)} hitSlop={{ top: spacing[1] + 2, bottom: spacing[1] + 2 }}
          style={{ flex: 1, minWidth: 0, minHeight: spacing[8], paddingHorizontal: spacing[1], justifyContent: 'center', borderRadius: radius.control, backgroundColor: level === item ? colors.blueSoft : undefined, opacity: disabled ? 0.45 : 1 }}>
          <Copy size="caption" numberOfLines={1} style={{ textAlign: 'center' }} color={level === item ? colors.accent : colors.textSecondary}>{labels[item]}</Copy>
        </Pressable>; })}
      </View>
      <View importantForAccessibility="no" style={{ width: 1, height: spacing[5], backgroundColor: colors.separator }} />
      <Pressable accessibilityRole="button" accessibilityLabel={EXPOUND_LABEL} accessibilityState={{ expanded, disabled: !expanded && !canUse('topic_expound') }}
        disabled={!expanded && !canUse('topic_expound')} onPress={toggleExpound} hitSlop={{ top: spacing[1] + 2, bottom: spacing[1] + 2 }}
        style={{ flex: 1, minWidth: 0, minHeight: spacing[8], paddingHorizontal: spacing[1], justifyContent: 'center', borderRadius: radius.control, backgroundColor: expanded ? colors.blueSoft : undefined, opacity: canUse('topic_expound') ? 1 : 0.45 }}>
        <Copy size="caption" numberOfLines={1} style={{ textAlign: 'center' }} color={expanded ? colors.accent : colors.textSecondary}>{EXPOUND_LABEL}</Copy>
      </Pressable>
    </View>
    {!online && <Copy size="caption" muted>{STUDY_OFFLINE}</Copy>}
    <StudyAnswerArea id={bodyId}>{level === 'original' ? children : renderEntry(current, () => action && run(action, bodyId))}</StudyAnswerArea>
    {expanded && <StudyAnswerArea id={expoundId}><View style={{ gap: spacing[2] }}><Copy size="h3">Expound</Copy>{renderEntry(expound, () => run('topic_expound', expoundId))}</View></StudyAnswerArea>}
  </View>;
}
