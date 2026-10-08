import { useLocalSearchParams } from "expo-router";

import { CanvasSyncScreen } from "../../src/features/sync/CanvasSyncScreen";

/** Canvas course sync: search, tap, sync, done. Generate opens it with a course in focus. */
export default function CanvasSettings() {
  const { courseId } = useLocalSearchParams<{ courseId?: string }>();
  return <CanvasSyncScreen focusCourseId={typeof courseId === "string" ? courseId : null} />;
}
