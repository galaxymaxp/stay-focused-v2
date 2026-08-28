import { StyleSheet, Text, View } from "react-native";

import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { colors, spacing, typography } from "../design/tokens";

interface UpcomingSurfaceProps {
  readonly title: string;
  readonly summary: string;
  /** What this surface will read once it is built. Stated plainly so the
   *  placeholder does not imply behavior the app does not have. */
  readonly reads: readonly string[];
  readonly testID: string;
}

/**
 * A destination that exists in navigation but has no implementation yet.
 *
 * The tab structure is being established now so later milestones fill a slot
 * instead of reshaping navigation again. These screens say exactly that rather
 * than showing a mock of data the app cannot load.
 */
export function UpcomingSurface({ title, summary, reads, testID }: UpcomingSurfaceProps) {
  return (
    <Screen>
      <View style={styles.content} testID={testID}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.summary}>{summary}</Text>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Not built yet</Text>
          <Text style={styles.cardBody}>This screen will read:</Text>
          <View style={styles.list}>
            {reads.map((item) => (
              <Text key={item} style={styles.listItem}>
                {`•  ${item}`}
              </Text>
            ))}
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
  summary: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    lineHeight: 23,
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
  cardBody: {
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
