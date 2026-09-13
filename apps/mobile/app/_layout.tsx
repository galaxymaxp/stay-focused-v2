import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppLifecycle } from "../src/app-shell/AppLifecycle";
import { AuthProvider } from "../src/auth";
import { ThemeProvider } from "../src/design/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider><AuthProvider>
        <AppLifecycle />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider></ThemeProvider>
    </SafeAreaProvider>
  );
}
