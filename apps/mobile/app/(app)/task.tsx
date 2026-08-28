import { router, useLocalSearchParams } from "expo-router";

import { TaskEditorScreen } from "../../src/features/work/TaskEditorScreen";
import { APP_ROUTES } from "../../src/navigation/appRoutes";

export default function TaskEditorRoute() {
  const params = useLocalSearchParams<{ taskId?: string }>();
  const raw = Array.isArray(params.taskId) ? params.taskId[0] : params.taskId;
  const taskId = raw?.trim() ? raw.trim() : null;

  const back = (reload: boolean) => {
    if (reload) {
      // Replacing with a fresh token guarantees Work refetches even when the
      // user edits several tasks in a row.
      router.dismissTo({
        pathname: APP_ROUTES.work,
        params: { reloaded: String(Date.now()) },
      });
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace(APP_ROUTES.work);
  };

  return (
    <TaskEditorScreen
      onCancel={() => back(false)}
      onDone={() => back(true)}
      taskId={taskId}
    />
  );
}
