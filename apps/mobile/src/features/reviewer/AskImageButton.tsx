import { STUDY_OFFLINE, type StudyImageTarget } from '@stay-focused/shared';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../../design/theme';
import { hitTarget, spacing } from '../../design/tokens';

export function AskImageButton({ image, offline, onAsk }: { image?: StudyImageTarget; offline: boolean; onAsk?: (image: StudyImageTarget) => void }) {
  const { colors } = useTheme();
  const disabled = offline || !image || !onAsk;
  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel="Ask about this image" accessibilityState={{ disabled }} disabled={disabled}
      onPress={() => image && onAsk?.(image)} style={{ minHeight: hitTarget.min, flexDirection: 'row', alignItems: 'center', gap: spacing[2], opacity: disabled ? 0.5 : 1 }}>
      <Text accessible={false} style={{ color: colors.accent, borderWidth: 1, borderColor: colors.accent, borderRadius: 12, width: 22, textAlign: 'center' }}>?</Text>
      <Text style={{ color: colors.accent }}>Ask about this image</Text>
    </Pressable>
    {offline ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>{STUDY_OFFLINE}</Text> : null}
  </View>;
}
