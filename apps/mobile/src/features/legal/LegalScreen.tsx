import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import type { LegalDocument } from '@stay-focused/shared';
import { Screen } from '../../components/Screen';
import { useTheme } from '../../design/theme';
import { hitTarget, spacing, typography } from '../../design/tokens';
import { LegalLinks } from './LegalLinks';

/** No remote content or auth gate: these screens also work offline. */
export function LegalScreen({ document, path }: { document: LegalDocument; path: '/privacy' | '/terms' }) {
  const { colors } = useTheme();
  const body = { color: colors.textPrimary, fontSize: typography.body, lineHeight: typography.body * 1.65 };
  return <Screen contentContainerStyle={{ gap: spacing[6] }}>
    <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.canGoBack() ? router.back() : router.replace('/sign-in')} style={{ minHeight: hitTarget.min, justifyContent: 'center' }}>
      <Text style={{ color: colors.textSecondary, fontSize: typography.body }}>Back</Text>
    </Pressable>
    <View style={{ gap: spacing[2] }}>
      <Text accessibilityRole="header" style={{ color: colors.textPrimary, fontSize: typography.h1, fontWeight: '600' }}>{document.title}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: typography.caption }}>Updated {document.updated}</Text>
      <Text selectable style={{ color: colors.textSecondary, fontSize: typography.caption }}>Also at stay-focused-ten.vercel.app{path}</Text>
    </View>
    {document.sections.map(section => <View key={section.heading} style={{ gap: spacing[3] }}>
      <Text accessibilityRole="header" style={{ color: colors.textPrimary, fontSize: typography.h2, fontWeight: '600' }}>{section.heading}</Text>
      {section.paragraphs.map(paragraph => <Text selectable key={paragraph} style={body}>{paragraph}</Text>)}
      {section.bullets?.map(bullet => <Text selectable key={bullet} style={body}>• {bullet}</Text>)}
    </View>)}
    <LegalLinks />
  </Screen>;
}
