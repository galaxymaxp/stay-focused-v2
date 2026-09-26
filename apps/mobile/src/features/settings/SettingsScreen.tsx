import { router } from "expo-router";
import { useMemo } from "react";
import { useLegacyTheme, type LegacyColors } from "../../design/theme";
import { StyleSheet, Text, View } from "react-native";

import { useAuth } from "../../auth";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { spacing, typography } from "../../design/tokens";

interface SettingsScreenProps {
  readonly onBack: () => void;
}

/**
 * Settings sits outside the primary tabs.
 *
 * Only account and sign out are implemented; sign out is real and already
 * worked, it was simply buried inside Courses and Library. The remaining groups
 * are named rather than mocked. Canvas connection and course sync live in
 * `CanvasSyncScreen` (Settings and appearance → Canvas connection & courses).
 */
export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const colors = useLegacyTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { isSigningOut, session, signOut } = useAuth();

  return (
    <Screen>
      <View style={styles.content}>
        <Button onPress={onBack} variant="ghost">
          Back
        </Button>

        <Text style={styles.title}>Settings</Text>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <Text style={styles.body} testID="settings-account-email">
            {session?.user.email ?? "No email on this account"}
          </Text>
          <Button
            fullWidth
            loading={isSigningOut}
            onPress={signOut}
            testID="settings-sign-out"
            variant="secondary"
          >
            Sign out
          </Button>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Preferences</Text>
          <Button variant="secondary" onPress={() => router.push("/appearance")}>Appearance</Button>
          <Button variant="secondary" onPress={() => router.push("/canvas-settings")}>Canvas connection and sync</Button>
          <Button variant="secondary" onPress={() => router.push("/processing")}>Uploads and notifications</Button>
        </Card>
      </View>
    </Screen>
  );
}

const createStyles = (colors: LegacyColors) => StyleSheet.create({
  content: {
    gap: spacing[4],
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h1,
    fontWeight: "800",
  },
  card: {
    gap: spacing[3],
  },
  cardTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h3,
    fontWeight: "800",
  },
  body: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
  list: {
    gap: spacing[2],
  },
  listItem: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
});
