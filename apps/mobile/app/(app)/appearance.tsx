import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { Action, Copy, Notice, Page, SegmentedControl, Surface } from "../../src/design/primitives";
import { useTheme, type PaletteFamily, type ThemePreference } from "../../src/design/theme";
import { spacing } from "../../src/design/tokens";
import { getFeedbackPreferences, loadFeedbackPreferences, saveFeedbackPreferences, type FeedbackPreferences } from "../../src/design/feedback";

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
  const [feedback, setFeedback] = useState<FeedbackPreferences>(getFeedbackPreferences);
  useEffect(() => { void loadFeedbackPreferences().then(setFeedback); }, []);
  const toggle = (key: keyof FeedbackPreferences) => {
    const next = { ...feedback, [key]: !feedback[key] };
    setFeedback(next);
    void saveFeedbackPreferences(next).catch(() => { setFeedback(feedback); setError("Could not save your feedback preference."); });
  };
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
      <Surface style={{ gap: spacing[2] }}>
        <Copy size="h3">Feedback</Copy>
        <Action secondary label={`Sounds ${feedback.sounds ? "on" : "off"}`} onPress={() => toggle("sounds")}>{`Sounds · ${feedback.sounds ? "On" : "Off"}`}</Action>
        <Action secondary label={`Haptics ${feedback.haptics ? "on" : "off"}`} onPress={() => toggle("haptics")}>{`Haptics · ${feedback.haptics ? "On" : "Off"}`}</Action>
      </Surface>
      {error ? <Notice>{error}</Notice> : null}
      {__DEV__ ? <Action secondary onPress={() => router.push("/generation-core-lab" as never)}>Knowledge Core Lab</Action> : null}
      <Action secondary onPress={() => router.push("/canvas-settings")}>Canvas connection & courses</Action>
      <Action secondary onPress={() => router.push("/settings")}>Account & sign out</Action>
    </Page>
  );
}
