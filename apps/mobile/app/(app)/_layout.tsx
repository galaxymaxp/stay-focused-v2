import { Redirect, Stack } from "expo-router";

import { RestoringState } from "../../src/app-shell/RestoringState";
import { useAuth } from "../../src/auth";
import { APP_ROUTES } from "../../src/navigation/appRoutes";
import { useTheme } from "../../src/design/theme";

/**
 * The authenticated stack. Tabs are one screen inside it, so Generate,
 * Processing, and anything else pushed above the tabs keep the tab bar's state
 * intact underneath and get real back behavior.
 */
export default function AppLayout() {
  const { isRestoring, session } = useAuth();
  const { reducedMotion } = useTheme();

  if (isRestoring) return <RestoringState />;
  if (!session) return <Redirect href={APP_ROUTES.signIn} />;

  return (
    <Stack key={session.user.id} screenOptions={{ headerShown: false, animation: reducedMotion ? "fade" : "default" }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="generate" options={{ presentation: "modal" }} />
      <Stack.Screen name="processing" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="task" options={{ presentation: "modal" }} />
    </Stack>
  );
}
