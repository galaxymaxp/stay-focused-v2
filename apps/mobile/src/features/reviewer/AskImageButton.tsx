import { STUDY_OFFLINE, type StudyImageTarget } from '@stay-focused/shared';
import { Pressable, Text, View } from 'react-native';
import { CircleHelp } from 'lucide-react-native';
import { useTheme } from '../../design/theme';
import { hitTarget, spacing, typography } from '../../design/tokens';

export function AskImageButton({ image, offline, onAsk, hideOfflineNote = false }: { image?: StudyImageTarget; offline: boolean; onAsk?: (image: StudyImageTarget) => void; hideOfflineNote?: boolean }) {
  const { colors } = useTheme();
  const disabled = offline || !image || !onAsk;
  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel="Ask about this image" accessibilityState={{ disabled }} disabled={disabled}
      onPress={() => image && onAsk?.(image)} style={{ width: '100%', minHeight: hitTarget.min, flexDirection: 'row', alignItems: 'center', gap: spacing[2], opacity: disabled ? 0.5 : 1 }}>
      <CircleHelp size={20} color={colors.accent} accessible={false} />
      <Text style={{ color: colors.accent, fontSize: typography.body, fontWeight: '400' }}>Ask about this image</Text>
    </Pressable>
    {offline && !hideOfflineNote ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>{STUDY_OFFLINE}</Text> : null}
  </View>;
}
