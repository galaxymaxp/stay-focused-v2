import { router } from "expo-router";

import { ReviewerGenerateScreen } from "../../src/features/reviewer/ReviewerGenerateScreen";
import { APP_ROUTES } from "../../src/navigation/appRoutes";

/**
 * Generate is contextual: presented modally over whichever tab opened it, so it
 * is never a destination the user has to navigate away from to get back to
 * their work.
 */
export default function GenerateRoute() {
  return (
    <ReviewerGenerateScreen
      onOpenCourses={() => router.dismissTo(APP_ROUTES.courses)}
      onOpenLibrary={() => router.dismissTo(APP_ROUTES.library)}
      onOpenProcessing={() => router.dismissTo(APP_ROUTES.processing)}
    />
  );
}
