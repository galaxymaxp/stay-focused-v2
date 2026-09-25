import { Stack } from "expo-router";

import { hierarchyMotion } from "../../../../src/design/navigationMotion";
import { useTheme } from "../../../../src/design/theme";

/** Library hierarchy: course grid → one course's saved work. Outputs open above the tabs. */
export default function LibraryLayout() {
  const { reducedMotion } = useTheme();
  return <Stack screenOptions={hierarchyMotion(reducedMotion)} />;
}
