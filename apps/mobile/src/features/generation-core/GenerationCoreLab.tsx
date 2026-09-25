import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../../design/theme";
import { palettes, ucInspiredPalettes } from "../../design/themeTokens";
import type { ThemeColors } from "../../design/themeTokens";
import { KnowledgeCore } from "./KnowledgeCore";
import {
  CORE_STATE_COPY,
  CORE_STATES,
  coreLabTheme,
  type CoreLabTheme,
  type CoreState,
} from "./coreModel";

const THEMES: readonly { readonly value: CoreLabTheme; readonly label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "uc_light", label: "UC Light" },
  { value: "uc_dark", label: "UC Dark" },
];

function coreState(value: string | undefined): CoreState {
  return CORE_STATES.includes(value as CoreState) ? value as CoreState : "idle";
}

function labTheme(value: string | undefined): CoreLabTheme {
  return THEMES.some((theme) => theme.value === value) ? value as CoreLabTheme : "dark";
}

export function GenerationCoreLab() {
  const { reducedMotion: systemReducedMotion } = useTheme();
  const params = useLocalSearchParams<{ preset?: string; state?: string; theme?: string; reduced?: string; capture?: string }>();
  const preset = typeof params.preset === "string" ? params.preset.split("-") : [];
  const presetState = preset.find((value) => CORE_STATES.includes(value as CoreState));
  const presetTheme = preset.find((value) => THEMES.some((theme) => theme.value === value));
  const presetReduced = preset.includes("reduced");
  const [state, setState] = useState<CoreState>(() => coreState(params.state ?? presetState));
  const [themeKey, setThemeKey] = useState<CoreLabTheme>(() => labTheme(params.theme ?? presetTheme));
  const [reducedMotion, setReducedMotion] = useState(params.reduced === "1" || presetReduced);
  useEffect(() => {
    setState(coreState(params.state ?? presetState));
    setThemeKey(labTheme(params.theme ?? presetTheme));
    setReducedMotion(params.reduced === "1" || presetReduced);
  }, [params.reduced, params.state, params.theme, presetReduced, presetState, presetTheme]);
  const theme = useMemo(
    () => coreLabTheme(themeKey, palettes, ucInspiredPalettes),
    [themeKey],
  );
  const copy = CORE_STATE_COPY[state];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.backgroundPrimary }]}>
      <StatusBar
        backgroundColor={theme.colors.backgroundPrimary}
        barStyle={theme.mode === "dark" ? "light-content" : "dark-content"}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back"
            onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
            style={({ pressed }) => [
              styles.back,
              { backgroundColor: theme.colors.surfacePrimary, opacity: pressed ? 0.65 : 1 },
            ]}
          >
            <Text style={[styles.backLabel, { color: theme.colors.textPrimary }]}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: theme.colors.textMuted }]}>DEVELOPMENT LAB</Text>
            <Text style={[styles.labTitle, { color: theme.colors.textPrimary }]}>Knowledge Core</Text>
          </View>
        </View>

        <Text style={[styles.source, { color: theme.colors.textSecondary }]}>Module 1 – Introduction to the Android Platform.pptx</Text>
        <View accessibilityLiveRegion="polite" style={styles.statusFrame}>
          <Text style={[styles.status, { color: theme.colors.textPrimary }]}>{copy.title}</Text>
        </View>

        <View style={styles.coreFrame}>
          <KnowledgeCore
            active
            colors={theme.colors}
            mode={theme.mode}
            reducedMotion={reducedMotion || systemReducedMotion}
            state={state}
          />
        </View>

        <Text style={[styles.detail, { color: theme.colors.textSecondary }]}>{copy.detail}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View Queue, unavailable in the visual prototype"
          accessibilityState={{ disabled: true }}
          disabled
          style={({ pressed }) => [
            styles.queueButton,
            {
              backgroundColor: theme.colors.surfacePrimary,
              borderColor: theme.colors.separator,
              opacity: pressed ? 0.72 : 1,
            },
          ]}
        >
          <Text style={[styles.queueLabel, { color: theme.colors.accent }]}>View Queue</Text>
        </Pressable>

        {params.capture !== "1" && !preset.includes("capture") ? <View style={[styles.controls, { borderColor: theme.colors.separator, backgroundColor: theme.colors.surfacePrimary }]}>
          <Text style={[styles.controlTitle, { color: theme.colors.textPrimary }]}>Visual state</Text>
          <View style={styles.chipRow}>
            {CORE_STATES.map((value) => (
              <Chip
                key={value}
                label={value[0]!.toUpperCase() + value.slice(1)}
                onPress={() => setState(value)}
                selected={state === value}
                colors={theme.colors}
                testID={`core-state-${value}`}
              />
            ))}
          </View>
          <Text style={[styles.controlTitle, { color: theme.colors.textPrimary }]}>Appearance</Text>
          <View style={styles.chipRow}>
            {THEMES.map((value) => (
              <Chip
                key={value.value}
                label={value.label}
                onPress={() => setThemeKey(value.value)}
                selected={themeKey === value.value}
                colors={theme.colors}
                testID={`core-theme-${value.value}`}
              />
            ))}
          </View>
          <Chip
            label={`Reduced Motion simulation: ${reducedMotion ? "On" : "Off"}`}
            onPress={() => setReducedMotion((value) => !value)}
            selected={reducedMotion}
            colors={theme.colors}
            testID="core-reduced-motion"
          />
        </View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({
  label,
  selected,
  onPress,
  colors,
  testID,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly colors: ThemeColors;
  readonly testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.accent : colors.surfaceSecondary,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text style={[styles.chipLabel, { color: selected ? colors.onAccent : colors.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 36, alignItems: "center" },
  header: { width: "100%", minHeight: 50, flexDirection: "row", alignItems: "center" },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  backLabel: { fontSize: 38, fontWeight: "300", lineHeight: 39, marginTop: -4 },
  headerCopy: { marginLeft: 12, gap: 1 },
  eyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 1.15 },
  labTitle: { fontSize: 18, lineHeight: 23, fontWeight: "600" },
  source: { marginTop: 28, fontSize: 13, lineHeight: 18, textAlign: "center" },
  statusFrame: { width: "100%", minHeight: 76, paddingTop: 18, alignItems: "center", justifyContent: "center" },
  status: { maxWidth: 330, fontSize: 25, lineHeight: 31, fontWeight: "600", textAlign: "center" },
  coreFrame: { height: 320, width: 320, alignItems: "center", justifyContent: "center" },
  detail: { width: 310, minHeight: 42, fontSize: 14, lineHeight: 20, textAlign: "center" },
  queueButton: { marginTop: 8, width: "82%", minHeight: 52, borderRadius: 28, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  queueLabel: { fontSize: 16, fontWeight: "600" },
  controls: { width: "100%", marginTop: 28, padding: 14, borderRadius: 18, borderWidth: 1, gap: 10 },
  controlTitle: { marginTop: 2, fontSize: 13, fontWeight: "600" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { minHeight: 44, paddingHorizontal: 12, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  chipLabel: { fontSize: 12, lineHeight: 16, fontWeight: "600" },
});
