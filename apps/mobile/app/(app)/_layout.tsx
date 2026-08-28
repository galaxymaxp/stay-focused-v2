import { Redirect, Stack } from "expo-router";

import { RestoringState } from "../../src/app-shell/RestoringState";
import { useAuth } from "../../src/auth";
import { APP_ROUTES } from "../../src/navigation/appRoutes";

/**
 * The authenticated stack. Tabs are one screen inside it, so Generate,
 * Processing, and anything else pushed above the tabs keep the tab bar's state
 * intact underneath and get real back behavior.
 */
export default function AppLayout() {
  const { isRestoring, session } = useAuth();

  if (isRestoring) return <RestoringState />;
  if (!session) return <Redirect href={APP_ROUTES.signIn} />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="generate" options={{ presentation: "modal" }} />
      <Stack.Screen name="processing" />
    </Stack>
  );
}
