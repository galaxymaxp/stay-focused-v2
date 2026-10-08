import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { useMemo, type ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppLifecycle } from "../src/app-shell/AppLifecycle";
import { AuthProvider } from "../src/auth";
import { ThemeProvider, useTheme } from "../src/design/theme";

/**
 * Navigators paint their own container behind every screen while it moves.
 * Without the app's palette that container is React Navigation's light gray,
 * which showed through every tab cross-fade and stack slide as a flash (white
 * in dark mode). Handing it the app background keeps transitions in-tone.
 */
function NavigationTheme({ children }: { children: ReactNode }) {
  const { colors, mode } = useTheme();
  const theme = useMemo(() => {
    const base = mode === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.accent,
        background: colors.backgroundPrimary,
        card: colors.backgroundPrimary,
        text: colors.textPrimary,
        border: colors.separator,
      },
    };
  }, [colors, mode]);
  return <NavigationThemeProvider value={theme}>{children}</NavigationThemeProvider>;
}

function RootStack() {
  const { colors } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.backgroundPrimary } }} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider><NavigationTheme><AuthProvider>
        <AppLifecycle />
        <RootStack />
      </AuthProvider></NavigationTheme></ThemeProvider>
    </SafeAreaProvider>
  );
}
