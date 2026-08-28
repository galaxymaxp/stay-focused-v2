import { router } from "expo-router";

import { ProcessingScreen } from "../../src/features/processing/ProcessingScreen";
import { POST_SIGN_IN_ROUTE } from "../../src/navigation/appRoutes";

/**
 * Reachable from Generate and from a completion notification. A notification
 * tap can open this on a cold start, so back must resolve to a real destination
 * rather than assuming a screen underneath.
 */
export default function ProcessingRoute() {
  return (
    <ProcessingScreen
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
