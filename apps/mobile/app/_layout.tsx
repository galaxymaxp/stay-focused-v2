import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppLifecycle } from "../src/app-shell/AppLifecycle";
import { AuthProvider } from "../src/auth";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppLifecycle />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
