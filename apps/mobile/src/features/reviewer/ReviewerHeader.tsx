import type { LibraryArtifactSummary, ReviewerReaderModel } from '@stay-focused/shared';
import { Download, Ellipsis, Globe } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Copy, IconAction } from '../../design/primitives';
import { GlassPill } from '../../components/GlassPill';
import { useTheme } from '../../design/theme';
import { density, hitTarget, radius, spacing, typography } from '../../design/tokens';
import type { ExperienceClient } from '../../services/experienceApi';
import { ShareReviewerMenu, type ShareReviewerTrigger } from './ShareReviewerMenu';

export function ReviewerHeader({ artifact, reviewer, secondaryLine, topicCount, client, offline, onExport, onQuiz, quizBusy = false }: {
  artifact: LibraryArtifactSummary;
  reviewer: ReviewerReaderModel;
  secondaryLine: string | null;
  topicCount: number;
  client: ExperienceClient;
  offline: boolean;
  onExport: () => void;
  onQuiz: () => void;
  quizBusy?: boolean;
}) {
  return (
    <View style={{ gap: spacing[1], paddingRight: spacing[2] }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] }}>
        <Copy size="h1" style={{ flex: 1, minWidth: 0, fontSize: 26, lineHeight: 33 }}>{artifact.title}</Copy>
        {artifact.id.startsWith('artifact:') ? <ShareReviewerMenu
          artifactId={artifact.id.slice('artifact:'.length)} reviewer={reviewer} client={client} offline={offline}
          renderTrigger={share => <ReviewerActions onExport={onExport} share={share} offline={offline} />} /> :
          <ReviewerActions onExport={onExport} />}
      </View>
      {secondaryLine || topicCount > 1 ? <View testID="reviewer-meta" style={{ gap: spacing[1] }}>
        {secondaryLine ? <Copy muted size="caption" style={{ lineHeight: typography.caption * 1.2 }}>{secondaryLine}</Copy> : null}
        {topicCount > 1 ? <Copy muted size="caption" style={{ lineHeight: typography.caption * 1.2 }}>{`${topicCount} topics`}</Copy> : null}
      </View> : null}
      {!artifact.relatedArtifactIds.some(id => id.startsWith('quiz:')) && <View style={{ paddingTop: spacing[2] }}>
        <GlassPill size="sm" label={quizBusy ? 'Generating quiz' : 'Generate quiz'} busy={quizBusy} disabled={offline} onPress={onQuiz} />
      </View>}
      <Copy muted size="caption">Tap a key point to select it. Hold its group to select all.</Copy>
    </View>
  );
}

/** Reviewer-only version of QueueDropdown's measured native Modal pattern. */
function ReviewerActions({ onExport, share, offline = false }: {
  onExport: () => void;
  share?: ShareReviewerTrigger;
  offline?: boolean;
}) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const trigger = useRef<View>(null);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  const close = () => setAnchor(null);
  const top = anchor ? Math.max(insets.top, Math.min(anchor.top, height / 2)) : 0;
  return <>
    <View ref={trigger} collapsable={false}>
      <IconAction label="Reviewer actions" onPress={() => trigger.current?.measureInWindow((x, y, w, h) => {
        setAnchor({ top: y + h, right: Math.max(insets.right + spacing[2], width - x - w) });
      })}><Ellipsis size={density.utilityIcon} color={colors.textPrimary} /></IconAction>
    </View>
    {anchor && <Modal visible transparent animationType="none" onRequestClose={close}>
      <View style={{ flex: 1 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close reviewer actions" onPress={close}
          style={{ position: 'absolute', inset: 0 }} />
        <View accessibilityViewIsModal style={{ position: 'absolute', top, right: anchor.right,
          width: Math.min(width - insets.left - insets.right - spacing[4], 280),
          maxHeight: height - top - insets.bottom - spacing[4], backgroundColor: colors.surfaceElevated,
          borderColor: colors.separator, borderWidth: 1, borderRadius: radius.card, padding: spacing[2] }}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Pressable accessibilityRole="button" onPress={() => { close(); onExport(); }}
              style={{ minHeight: hitTarget.min, flexDirection: 'row', alignItems: 'center', gap: spacing[2], padding: spacing[2] }}>
              <Download size={density.utilityIcon} color={colors.textPrimary} /><Copy>Export</Copy>
            </Pressable>
            {share && <Pressable accessibilityRole="button" accessibilityState={{ disabled: share.disabled }} disabled={share.disabled}
              accessibilityHint={offline ? 'Try again when connected.' : undefined}
              onPress={() => { close(); share.onPress(); }}
              style={{ minHeight: hitTarget.min, flexDirection: 'row', alignItems: 'center', gap: spacing[2], padding: spacing[2], opacity: share.disabled ? 0.5 : 1 }}>
              <Globe size={density.utilityIcon} color={colors.textPrimary} />
              <View style={{ flex: 1 }}><Copy>Share</Copy>{offline ? <Copy muted size="caption">Try again when connected.</Copy> : null}</View>
            </Pressable>}
          </ScrollView>
        </View>
      </View>
    </Modal>}
  </>;
}
