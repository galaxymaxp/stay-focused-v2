import { WELCOME_BODY, WELCOME_TITLE } from '@stay-focused/shared';
import { Pressable, View } from 'react-native';
import { Copy } from '../../design/primitives';
import { useTheme } from '../../design/theme';

export function TodayWelcome({ source, dismissed, ready, onDismiss }: { source: string; dismissed: boolean; ready: boolean; onDismiss: () => void }) {
  const { colors } = useTheme();
  if (!ready || source !== 'first-run' || dismissed) return null;
  return <View testID="today-welcome" style={{ backgroundColor: colors.surfacePrimary, borderWidth: 1, borderColor: colors.separator, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
    <View style={{ flex: 1, gap: 6 }}><Copy style={{ fontSize: 14, fontWeight: '600' }}>{WELCOME_TITLE}</Copy><Copy muted style={{ fontSize: 13, lineHeight: 19.5 }}>{WELCOME_BODY}</Copy></View>
    <Pressable accessibilityRole="button" accessibilityLabel="Dismiss welcome note" onPress={onDismiss} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}><Copy muted style={{ fontSize: 20 }}>×</Copy></Pressable>
  </View>;
}
