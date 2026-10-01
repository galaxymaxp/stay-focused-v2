import { ASSIST_LABELS, ASSIST_RESULT_LABELS, ASSIST_TYPES, type AssistType } from '@stay-focused/shared';
import { AlignLeft, ArrowLeftRight, Check, FlaskConical, Lightbulb, RotateCcw } from 'lucide-react-native';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { ActivityIndicator, Pressable, View, type ScrollView } from 'react-native';
import { useAuth } from '../../auth';
import { getApiBaseUrl } from '../../config/apiBaseUrl';
import { haptic } from '../../design/haptics';
import { Copy, Notice, Sheet, SkeletonBlock } from '../../design/primitives';
import { useTheme } from '../../design/theme';
import { radius, spacing } from '../../design/tokens';
import { assistStore, keyOf, useAssistEntries, type AssistEntry, type AssistTarget } from './assistStore';
import { SmartSelectionPanel } from './SmartSelectionPanel';

const ICONS: Record<AssistType, ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  summarize: AlignLeft, explain_simply: Lightbulb, analogy: ArrowLeftRight, example: FlaskConical,
};
const HINTS: Record<AssistType, string> = {
  summarize: 'The short version', explain_simply: 'In plain words', analogy: 'Compare it to something', example: 'See it in action',
};

/**
 * Study Assist for one passage: a block's explanation or a single key point.
 * Every option can run at once; each shows its own state. Requests keep going
 * after the sheet closes, and the Reviewer marks the passage when they land.
 */
export function StudyAssistSheet({ target, onClose }: { target: AssistTarget | null; onClose: () => void }) {
  const { session } = useAuth();
  const { colors } = useTheme();
  const key = target ? keyOf(target) : '';
  const entries = useAssistEntries(key);
  const owner = session?.user.id ?? '';
  const [shown, setShown] = useState<AssistType | null>(() => ASSIST_TYPES.find(type => entries[type]?.status === 'ready' && !entries[type]?.seen) ?? null);

  useEffect(() => {
    if (!target) return;
    assistStore.setOpen(key);
    void assistStore.hydrate(owner, target);
    return () => assistStore.setOpen(null);
  }, [key, owner, target]);
  // Opened results are seen; a result that lands while open is seen at once.
  useEffect(() => {
    if (key) assistStore.markSeen(key);
  }, [entries, key]);
  // Show the first saved result when nothing is chosen yet.
  useEffect(() => {
    if (!shown) {
      const first = ASSIST_TYPES.find(type => entries[type]?.status === 'ready');
      if (first) setShown(first);
    }
  }, [entries, shown]);

  function choose(type: AssistType) {
    if (!target) return;
    setShown(type);
    const entry = entries[type];
    if (entry?.status === 'ready' || entry?.status === 'pending') {
      haptic.select();
      return;
    }
    haptic.tap();
    assistStore.run(owner, { baseUrl: getApiBaseUrl() ?? '', accessToken: session?.accessToken ?? '' }, target, type);
  }

  const current = shown ? entries[shown] : undefined;
  // Selected text (or an open learning action) replaces the whole-topic quick assists.
  const [studying, setStudying] = useState(false);
  const scroll = useRef<ScrollView>(null);
  // Never let the sheet shrink while open: swapping the tall quick assists for the
  // one-row selection actions would otherwise slide the text under a finger that is
  // still holding it, and Android would stretch the selection across the jump.
  const [minHeight, setMinHeight] = useState(0);
  return <Sheet title="Study Assist" onClose={onClose} scrollRef={scroll}>
    {target ? <View onLayout={event => { const height = event.nativeEvent.layout.height; setMinHeight(current => Math.max(current, height)); }} style={{ gap: spacing[3], minHeight }}>
      <SmartSelectionPanel selection={target.selection} onActiveChange={setStudying} scrollRef={scroll} />
      {studying ? null : <>
      <Copy size="caption" color={colors.textMuted} style={{ fontWeight: '700', letterSpacing: 0.8, paddingTop: spacing[2] }}>QUICK ASSISTS · WHOLE {target.pointIndex !== undefined ? 'KEY POINT' : 'CONCEPT'}</Copy>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
        {ASSIST_TYPES.map(type => <OptionTile key={type} type={type} entry={entries[type]} selected={shown === type} onPress={() => choose(type)} />)}
      </View>
      {current?.status === 'pending' && shown ? <View accessibilityLiveRegion="polite" style={{ gap: spacing[2], paddingTop: spacing[1] }}>
        <SkeletonBlock width="92%" height={12} />
        <SkeletonBlock width="84%" height={12} />
        <SkeletonBlock width="60%" height={12} />
        <Copy muted size="caption">Creating your {ASSIST_LABELS[shown].toLowerCase()}. You can close this. The passage turns green when it’s ready.</Copy>
      </View> : null}
      {current?.status === 'ready' && shown ? <View accessibilityLiveRegion="polite" style={{ gap: spacing[2], backgroundColor: colors.surfacePrimary, borderRadius: radius.card, borderWidth: 1, borderColor: colors.separator, padding: spacing[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <View style={{ backgroundColor: colors.greenSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Copy size="caption" color={colors.green} style={{ fontWeight: '700' }}>{ASSIST_RESULT_LABELS[shown]}</Copy>
          </View>
          <Copy muted size="caption">Saved for offline study</Copy>
        </View>
        <Copy style={{ lineHeight: 25 }}>{current.text}</Copy>
      </View> : null}
      {current?.status === 'error' ? <Notice>{current.error}</Notice> : null}
      {!current ? <Copy muted size="caption">Results are AI-generated and saved on this device.</Copy> : null}
      </>}
    </View> : <Notice>This passage is no longer available. Reopen the Reviewer to choose another.</Notice>}
  </Sheet>;
}

function OptionTile({ type, entry, selected, onPress }: { type: AssistType; entry: AssistEntry | undefined; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const Icon = ICONS[type];
  const ready = entry?.status === 'ready';
  const tone = ready ? colors.green : colors.accent;
  const status = entry?.status === 'pending' ? 'Creating…' : ready ? 'Ready' : entry?.status === 'error' ? 'Tap to retry' : HINTS[type];
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${ASSIST_LABELS[type]}, ${status}`}
    accessibilityState={{ selected, busy: entry?.status === 'pending' }}
    onPress={onPress}
    style={({ pressed }) => ({
      flexBasis: '47%', flexGrow: 1, minHeight: 78, borderRadius: radius.control, padding: spacing[3], gap: 6,
      backgroundColor: selected ? (ready ? colors.greenSoft : colors.blueSoft) : colors.surfaceSecondary,
      opacity: pressed ? 0.75 : 1,
    })}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Icon size={18} color={tone} strokeWidth={1.9} />
      {entry?.status === 'pending' ? <ActivityIndicator size="small" color={colors.accent} />
        : ready ? <Check size={16} color={colors.green} strokeWidth={2.4} />
        : entry?.status === 'error' ? <RotateCcw size={15} color={colors.warning} strokeWidth={2} /> : null}
    </View>
    <Copy size="bodySmall" style={{ fontWeight: '600' }}>{ASSIST_LABELS[type]}</Copy>
    <Copy muted size="caption" numberOfLines={1} color={entry?.status === 'error' ? colors.warning : undefined}>{status}</Copy>
  </Pressable>;
}
