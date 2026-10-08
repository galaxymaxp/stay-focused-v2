import { router } from "expo-router";

import { ReviewerGenerateScreen } from "../../src/features/reviewer/ReviewerGenerateScreen";
import { APP_ROUTES } from "../../src/navigation/appRoutes";

/**
 * Other source opens as a sheet over Generate.
 */
export default function GenerateRoute() {
  return (
    <ReviewerGenerateScreen onOpenLibrary={() => router.dismissTo(APP_ROUTES.library)} />
  );
}
