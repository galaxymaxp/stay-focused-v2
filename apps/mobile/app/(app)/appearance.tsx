import { router } from "expo-router";
import { useState } from "react";
import { Action, Copy, Notice, Page, Surface } from "../../src/design/primitives";
import { useTheme } from "../../src/design/theme";
export default function Appearance() {
  const { preference, setPreference, reducedMotion } = useTheme(); const [error, setError] = useState<string | null>(null);
  return <Page title="Settings" back><Surface><Copy size="h2">Appearance</Copy>{(["system", "light", "dark"] as const).map(value => <Action key={value} secondary={preference !== value} label={`${value} theme${preference === value ? ", selected" : ""}`} onPress={() => { void setPreference(value).catch(() => setError("Could not save your appearance preference.")); }}>{value === "system" ? "Use device setting" : value === "light" ? "Light" : "Dark"}</Action>)}<Copy muted>Reduced motion follows your device setting: {reducedMotion ? "on" : "off"}.</Copy></Surface>{error && <Notice>{error}</Notice>}<Action secondary onPress={() => router.push("/canvas-settings")}>Canvas connection & sync</Action><Action secondary onPress={() => router.push("/settings")}>Account & sign out</Action></Page>;
}
