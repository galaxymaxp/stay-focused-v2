import { StyleSheet, Text, View } from "react-native";

import { useAuth } from "../../auth";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { colors, spacing, typography } from "../../design/tokens";

interface SettingsScreenProps {
  readonly onBack: () => void;
}

/**
 * Settings sits outside the primary tabs.
 *
 * Only account and sign out are implemented; sign out is real and already
 * worked, it was simply buried inside Courses and Library. The remaining groups
 * are named rather than mocked, because Canvas connection and course selection
 * still live in `CoursesScreen` and moving them is its own milestone.
 */
export function SettingsScreen({ onBack }: SettingsScreenProps) {
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
          <Text style={styles.cardTitle}>Not moved here yet</Text>
          <Text style={styles.body}>
            These still live on their current screens and will move in a later
            milestone:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>•  Canvas connection and disconnect</Text>
            <Text style={styles.listItem}>•  Course inventory and selection</Text>
            <Text style={styles.listItem}>•  Completion notifications</Text>
            <Text style={styles.listItem}>•  Appearance</Text>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
