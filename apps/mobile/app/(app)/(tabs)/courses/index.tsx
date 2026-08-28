import { router } from "expo-router";

import { CoursesScreen } from "../../../../src/features/courses/CoursesScreen";
import {
  APP_ROUTES,
  COURSE_GRADES_PATHNAME,
  COURSE_REVIEWER_PATHNAME,
  courseRouteParams,
} from "../../../../src/navigation/appRoutes";

export default function CoursesRoute() {
  return (
    <CoursesScreen
      onCreateReviewer={() => router.push(APP_ROUTES.generate)}
      onCreateReviewerFromCanvas={(courseId, courseName) =>
        router.push({
          pathname: COURSE_REVIEWER_PATHNAME,
          params: courseRouteParams({ courseId, courseName }),
        })
      }
      onOpenGrades={(courseId, courseName) =>
        router.push({
          pathname: COURSE_GRADES_PATHNAME,
          params: courseRouteParams({ courseId, courseName }),
        })
      }
      onOpenLibrary={() => router.navigate(APP_ROUTES.library)}
    />
  );
}
