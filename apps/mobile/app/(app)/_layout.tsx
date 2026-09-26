import { Redirect, Stack } from "expo-router";

import { AppActivityProvider } from "../../src/app-shell/AppActivityProvider";
import { RestoringState } from "../../src/app-shell/RestoringState";
import { useAuth } from "../../src/auth";
import { APP_ROUTES } from "../../src/navigation/appRoutes";
import { hierarchyMotion, modalMotion, sheetMotion } from "../../src/design/navigationMotion";
import { useTheme } from "../../src/design/theme";
import { CanvasSyncProvider } from "../../src/features/sync/CanvasSyncProvider";

/**
 * The authenticated stack. Tabs are one screen inside it, so Generate,
 * Processing, and anything else pushed above the tabs keep the tab bar's state
 * intact underneath and get real back behavior. Contextual detail (an
 * announcement, a quick task editor, text/camera Generate) is presented
 * modally; everything else continues the horizontal hierarchy.
 */
export default function AppLayout() {
  const { isRestoring, session } = useAuth();
  const { colors, reducedMotion } = useTheme();

  if (isRestoring) return <RestoringState />;
  if (!session) return <Redirect href={APP_ROUTES.signIn} />;

  return (
    <CanvasSyncProvider>
      <AppActivityProvider>
      <Stack key={session.user.id} screenOptions={hierarchyMotion(reducedMotion, colors.backgroundPrimary)}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="generate" options={modalMotion(reducedMotion)} />
        <Stack.Screen name="announcement" options={sheetMotion()} />
        <Stack.Screen name="processing" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="task" options={modalMotion(reducedMotion)} />
      </Stack>
      </AppActivityProvider>
    </CanvasSyncProvider>
  );
}
