import { Stack } from "expo-router";

/**
 * Courses owns a stack so a course's reviewer and grade screens push inside the
 * tab. Back returns to the course list and the other tabs keep their state,
 * which is what the switcher's `onBackToCourses` callbacks approximated.
 */
export default function CoursesLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
