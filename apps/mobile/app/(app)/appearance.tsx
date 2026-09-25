import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { Action, Copy, Notice, Page, SegmentedControl, Surface } from "../../src/design/primitives";
import { useTheme, type PaletteFamily, type ThemePreference } from "../../src/design/theme";
import { spacing } from "../../src/design/tokens";

const modes: readonly { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Automatic" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];
const families: readonly { value: PaletteFamily; label: string }[] = [
  { value: "standard", label: "Stay Focused" },
  { value: "uc_inspired", label: "UC-inspired" },
];

export default function Appearance() {
  const { preference, setPreference, family, setFamily, reducedMotion } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const save = (task: Promise<void>) => void task.catch(() => setError("Could not save your appearance preference."));
  return (
    <Page title="Settings" back>
      <Surface style={{ gap: spacing[3] }}>
        <Copy size="h3">Appearance</Copy>
        <View style={{ gap: spacing[2] }}>
          <Copy muted size="caption">Mode</Copy>
          <SegmentedControl segments={modes} value={preference} onChange={(value) => save(setPreference(value))} />
        </View>
        <View style={{ gap: spacing[2] }}>
          <Copy muted size="caption">Color theme</Copy>
          <SegmentedControl segments={families} value={family} onChange={(value) => save(setFamily(value))} />
          {family === "uc_inspired" ? (
            <Copy muted size="caption">
              Inspired by the University of the Cordilleras for evaluation. This is not official UC branding.
            </Copy>
          ) : null}
        </View>
        <Copy muted size="caption">Reduced motion follows your device setting: {reducedMotion ? "on" : "off"}.</Copy>
      </Surface>
      {error ? <Notice>{error}</Notice> : null}
      <Action secondary onPress={() => router.push("/canvas-settings")}>Canvas connection & courses</Action>
      <Action secondary onPress={() => router.push("/settings")}>Account & sign out</Action>
    </Page>
  );
}
