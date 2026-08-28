import { UpcomingSurface } from "../../../src/app-shell/UpcomingSurface";

export default function WorkRoute() {
  return (
    <UpcomingSurface
      title="Work"
      summary="The cross-course backlog and planning input: everything outstanding, wherever it came from."
      reads={[
        "Manual and Canvas-derived tasks, from GET /api/tasks",
        "Canvas assignments imported as tasks, from POST /api/tasks/import/canvas",
        "Unscheduled work and the plan preview, from POST /api/study-plan/preview",
      ]}
      testID="work-placeholder"
    />
  );
}
