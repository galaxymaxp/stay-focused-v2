import { router, useLocalSearchParams } from "expo-router";

import { CanvasGradeScreen } from "../../../../../src/features/courses/CanvasGradeScreen";
import {
  APP_ROUTES,
  readCourseIdParam,
  readCourseNameParam,
} from "../../../../../src/navigation/appRoutes";

export default function TaskCourseGradesRoute() {
  const params = useLocalSearchParams<{ courseKey: string; courseId: string; courseName?: string }>();

  return (
    <CanvasGradeScreen
      courseId={readCourseIdParam(params.courseId)}
      courseName={readCourseNameParam(params.courseName)}
      onBackToCourses={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }
        const courseKey = readCourseIdParam(params.courseKey);
        router.replace(courseKey ? { pathname: "/work/[courseKey]", params: { courseKey } } : APP_ROUTES.work);
      }}
    />
  );
}
