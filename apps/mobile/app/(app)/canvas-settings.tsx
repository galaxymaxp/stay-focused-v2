import { router } from "expo-router";
import { CoursesScreen } from "../../src/features/courses/CoursesScreen";
export default function CanvasSettings() { return <CoursesScreen onCreateReviewer={() => router.push("/generate")} onCreateReviewerFromCanvas={(courseId, courseName) => router.push({ pathname: "/courses/[courseId]/reviewer", params: { courseId, courseName } })} onOpenGrades={(courseId, courseName) => router.push({ pathname: "/courses/[courseId]/grades", params: { courseId, courseName } })} onOpenLibrary={() => router.navigate("/library")} />; }
