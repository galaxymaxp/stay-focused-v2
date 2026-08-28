import { ActivityIndicator, StyleSheet, Text } from "react-native";

import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { colors, spacing, typography } from "../design/tokens";

/**
 * Shown while the persisted Supabase session is being restored, before any
 * route decision can be made. Moved out of the former switcher unchanged so
 * every layout that has to wait for auth renders the same thing.
 */
export function RestoringState() {
  return (
    <Screen centered scroll={false}>
      <Card elevated style={styles.restoringCard} testID="auth-restoring-state">
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.restoringTitle}>Restoring session</Text>
        <Text style={styles.mutedText}>Checking your saved sign-in state.</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  restoringCard: {
    alignItems: "center",
    gap: spacing[3],
  },
  restoringTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h3,
    fontWeight: "800",
  },
  mutedText: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
    textAlign: "center",
  },
});
