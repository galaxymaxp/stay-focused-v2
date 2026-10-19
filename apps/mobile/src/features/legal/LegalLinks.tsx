import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { useTheme } from '../../design/theme';
import { hitTarget, spacing, typography } from '../../design/tokens';

export function LegalLinks() {
  const { colors } = useTheme();
  const style = { color: colors.textSecondary, fontSize: typography.caption, minHeight: hitTarget.min, minWidth: hitTarget.min, padding: spacing[3], textAlign: 'center' as const, textAlignVertical: 'center' as const };
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing[6] }}>
    <Link href="/privacy" accessibilityLabel="Privacy Policy" style={style}>Privacy</Link>
    <Text accessible={false} style={{ color: colors.textSecondary, fontSize: typography.caption }}>·</Text>
    <Link href="/terms" accessibilityLabel="Terms of Service" style={style}>Terms</Link>
  </View>;
}
