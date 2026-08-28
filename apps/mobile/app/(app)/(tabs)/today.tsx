import { UpcomingSurface } from "../../../src/app-shell/UpcomingSurface";

export default function TodayRoute() {
  return (
    <UpcomingSurface
      title="Today"
      summary="The time-based execution surface: what you are working on now and what is left today."
      reads={[
        "Persisted study sessions for today, from GET /api/study-sessions",
        "Each block's task title, status, priority, and due date, from the embedded task summary",
        "Work that did not fit, from the last plan preview or apply",
      ]}
      testID="today-placeholder"
    />
  );
}
