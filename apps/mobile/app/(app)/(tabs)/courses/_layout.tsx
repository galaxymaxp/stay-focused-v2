import { Stack } from "expo-router";

import { hierarchyMotion } from "../../../../src/design/navigationMotion";
import { useTheme } from "../../../../src/design/theme";

/**
 * Generate hierarchy: course list → course → material. Each level is a real
 * stack entry, so header back, Android back and the swipe gesture all return
 * one level instead of leaving the tab.
 */
export default function CoursesLayout() {
  const { colors, reducedMotion } = useTheme();
  return <Stack screenOptions={hierarchyMotion(reducedMotion, colors.backgroundPrimary)} />;
}
