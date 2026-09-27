import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AccessibilityInfo, AppState, useColorScheme } from "react-native";

import { sessionStore } from "../auth/sessionStore";
import { loadFeedbackPreferences } from "./feedback";

import {
  palettes,
  paletteFor,
  resolveTheme,
  type PaletteFamily,
  type ThemeColors,
  type ThemePreference,
} from "./themeTokens";
export * from "./themeTokens";
const ThemeContext = createContext({
  colors: palettes.light as ThemeColors,
  mode: "light" as "light" | "dark",
  preference: "system" as ThemePreference,
  setPreference: async (_value: ThemePreference) => {},
  family: "standard" as PaletteFamily,
  setFamily: async (_value: PaletteFamily) => {},
  reducedMotion: true,
  active: true,
});
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, updatePreference] = useState<ThemePreference>("system");
  const [family, updateFamily] = useState<PaletteFamily>("standard");
  const [reducedMotion, setReducedMotion] = useState(true);
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    let live = true;
    void loadFeedbackPreferences();
    void Promise.resolve(sessionStore.getItem("sf.appearance"))
      .then((value) => {
        if (
          live &&
          (value === "dark" || value === "light" || value === "system")
        )
          updatePreference(value);
      })
      .catch(() => {});
    void Promise.resolve(sessionStore.getItem("sf.palette"))
      .then((value) => {
        if (live && (value === "standard" || value === "uc_inspired")) updateFamily(value);
      })
      .catch(() => {});
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (live) setReducedMotion(value);
      })
      .catch(() => {});
    const motionListener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReducedMotion,
    );
    const stateListener = AppState.addEventListener("change", (value) =>
      setActive(value === "active"),
    );
    return () => {
      live = false;
      motionListener.remove();
      stateListener.remove();
    };
  }, []);
  const mode = resolveTheme(preference, system);
  const value = useMemo(
    () => ({
      colors: paletteFor(family, mode),
      mode,
      preference,
      family,
      setFamily: async (next: PaletteFamily) => {
        await sessionStore.setItem("sf.palette", next);
        updateFamily(next);
      },
      reducedMotion,
      active,
      setPreference: async (next: ThemePreference) => {
        await sessionStore.setItem("sf.appearance", next);
        updatePreference(next);
      },
    }),
    [family, mode, preference, reducedMotion, active],
  );
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);

export function useLegacyTheme() {
  const { colors: c } = useTheme();
  return useMemo(
    () => ({
      background: c.backgroundPrimary,
      card: c.surfacePrimary,
      cardElevated: c.surfaceElevated,
      cardPressed: c.surfaceSecondary,
      accent: c.accent,
      accentPressed: c.accent,
      accentText: c.onAccent,
      textPrimary: c.textPrimary,
      textSecondary: c.textSecondary,
      textMuted: c.textMuted,
      border: c.separator,
      borderStrong: c.textMuted,
      error: c.danger,
      errorSurface: c.surfaceElevated,
      success: c.success,
      successSurface: c.surfaceElevated,
      transparent: "transparent",
    }),
    [c],
  );
}
export type LegacyColors = ReturnType<typeof useLegacyTheme>;
