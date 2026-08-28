import { router, useLocalSearchParams } from "expo-router";

import { CanvasSourceReviewerScreen } from "../../../../../src/features/courses/CanvasSourceReviewerScreen";
import {
  APP_ROUTES,
  readCourseIdParam,
  readCourseNameParam,
} from "../../../../../src/navigation/appRoutes";

export default function CourseReviewerRoute() {
  const params = useLocalSearchParams<{ courseId: string; courseName?: string }>();

  return (
    <CanvasSourceReviewerScreen
      courseId={readCourseIdParam(params.courseId)}
      courseName={readCourseNameParam(params.courseName)}
      onBackToCourses={() => backToCourses()}
      onOpenLibrary={() => router.navigate(APP_ROUTES.library)}
    />
  );
}

/**
 * A cold start from a deep link has nothing to go back to, so fall through to
 * the course list rather than leaving the user on a dead back action.
 */
function backToCourses(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(APP_ROUTES.courses);
}
