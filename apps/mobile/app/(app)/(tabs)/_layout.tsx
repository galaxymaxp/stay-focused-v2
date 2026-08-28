import { Tabs } from "expo-router";

import { colors, hitTarget, typography } from "../../../src/design/tokens";

/**
 * Primary navigation: Today, Work, Courses, Library.
 *
 * Deliberately unstyled beyond the existing tokens. Icons, tab-bar treatment,
 * and accent colour are open design decisions, so this uses labels and the
 * palette already in `tokens.ts` rather than introducing a new visual language
 * during a structural migration.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          minHeight: hitTarget.min,
        },
        tabBarLabelStyle: {
          fontFamily: typography.fontFamily,
          fontSize: typography.caption,
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen name="today" options={{ title: "Today" }} />
      <Tabs.Screen name="work" options={{ title: "Work" }} />
      <Tabs.Screen name="courses" options={{ title: "Courses" }} />
      <Tabs.Screen name="library" options={{ title: "Library" }} />
    </Tabs>
  );
}
