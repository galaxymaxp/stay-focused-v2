import type { TaskView } from "@stay-focused/shared/task-planning";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "../../auth";
import { getApiBaseUrl } from "../../config/apiBaseUrl";
import { Screen } from "../../components/Screen";
import { colors } from "../../design/tokens";
import { createTask, deleteTask, listTasks, updateTask } from "../../services/taskApi";
import { TaskEditor, type TaskDraft } from "./TaskEditor";

interface TaskEditorScreenProps {
  /** Null creates a new task; a task id loads that task for editing. */
  readonly taskId: string | null;
  readonly onDone: () => void;
  readonly onCancel: () => void;
}

export function TaskEditorScreen({ taskId, onDone, onCancel }: TaskEditorScreenProps) {
  const { session } = useAuth();
  const accessToken = session?.accessToken;
  const [task, setTask] = useState<TaskView | null>(null);
  const [loading, setLoading] = useState(Boolean(taskId));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) return;
    const apiBaseUrl = getApiBaseUrl();
    const token = accessToken?.trim();
    if (!apiBaseUrl || !token) {
      setError("Sign in again to open this task.");
      setLoading(false);
      return;
    }
    let active = true;
    void (async () => {
      // The list endpoint is reused rather than adding a single-task fetch the
      // editor would be the only caller of; the page is already bounded at 50.
      const result = await listTasks({ accessToken: token, apiBaseUrl });
      if (!active) return;
      if (!result.ok) {
        setError(result.error.message);
      } else {
        const found = result.data.tasks.find((entry) => entry.id === taskId) ?? null;
        if (!found) setError("This task no longer exists.");
        setTask(found);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [accessToken, taskId]);

  const handleSave = useCallback(
    async (draft: TaskDraft) => {
      const apiBaseUrl = getApiBaseUrl();
      const token = accessToken?.trim();
      if (!apiBaseUrl || !token) {
        setError("Sign in again to save this task.");
        return;
      }
      setSaving(true);
      const result = taskId
        ? await updateTask({ accessToken: token, apiBaseUrl, taskId, ...draft })
        : await createTask({ accessToken: token, apiBaseUrl, ...draft });
      setSaving(false);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      onDone();
    },
    [accessToken, onDone, taskId],
  );

  const handleDelete = useCallback(async () => {
    const apiBaseUrl = getApiBaseUrl();
    const token = accessToken?.trim();
    if (!apiBaseUrl || !token || !taskId) return;
    setDeleting(true);
    const result = await deleteTask({ accessToken: token, apiBaseUrl, taskId });
    setDeleting(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    onDone();
  }, [accessToken, onDone, taskId]);

  if (loading) {
    return (
      <Screen centered scroll={false}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      </Screen>
    );
  }

  return (
    <TaskEditor
      deleting={deleting}
      error={error}
      onCancel={onCancel}
      onDelete={taskId ? () => void handleDelete() : undefined}
      onSave={(draft) => void handleSave(draft)}
      saving={saving}
      task={task}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    justifyContent: "center",
  },
});
