import { router, useLocalSearchParams } from "expo-router";

import { WorkScreen } from "../../../src/features/work/WorkScreen";
import { TASK_EDITOR_PATHNAME } from "../../../src/navigation/appRoutes";

export default function WorkRoute() {
  // The editor sets `reloaded` on return so the backlog refetches without the
  // tab having to stay mounted or poll.
  const params = useLocalSearchParams<{ reloaded?: string }>();
  const reloadToken = Array.isArray(params.reloaded) ? params.reloaded[0] : params.reloaded;

  return (
    <WorkScreen
      onAddTask={() => router.push(TASK_EDITOR_PATHNAME)}
      onOpenTask={(taskId) => router.push({ pathname: TASK_EDITOR_PATHNAME, params: { taskId } })}
      {...(reloadToken ? { reloadToken } : {})}
    />
  );
}
