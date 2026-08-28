import { router, useLocalSearchParams } from "expo-router";

import { CanvasGradeScreen } from "../../../../../src/features/courses/CanvasGradeScreen";
import {
  APP_ROUTES,
  readCourseIdParam,
  readCourseNameParam,
} from "../../../../../src/navigation/appRoutes";

export default function CourseGradesRoute() {
  const params = useLocalSearchParams<{ courseId: string; courseName?: string }>();

  return (
    <CanvasGradeScreen
      courseId={readCourseIdParam(params.courseId)}
      courseName={readCourseNameParam(params.courseName)}
      onBackToCourses={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }
        router.replace(APP_ROUTES.courses);
      }}
    />
  );
}
