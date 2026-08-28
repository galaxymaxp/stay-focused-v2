import { router } from "expo-router";

import { SettingsScreen } from "../../src/features/settings/SettingsScreen";
import { POST_SIGN_IN_ROUTE } from "../../src/navigation/appRoutes";

/**
 * Pushed above the tabs, never a tab itself. There is no in-app entry point
 * yet: the header that would host one is part of the shell redesign, so for now
 * this is reachable by route and deep link.
 */
export default function SettingsRoute() {
  return (
    <SettingsScreen
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }
        router.replace(POST_SIGN_IN_ROUTE);
      }}
    />
  );
}
