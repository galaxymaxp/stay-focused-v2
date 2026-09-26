import { Stack } from "expo-router";

import { hierarchyMotion } from "../../../../src/design/navigationMotion";
import { useTheme } from "../../../../src/design/theme";

/** Tasks hierarchy: courses → one course's tasks. Task detail opens above the tabs. */
export default function WorkLayout() {
  const { colors, reducedMotion } = useTheme();
  return <Stack screenOptions={hierarchyMotion(reducedMotion, colors.backgroundPrimary)} />;
}
