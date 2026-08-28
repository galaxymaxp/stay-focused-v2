import type { TaskView } from "@stay-focused/shared/task-planning";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../auth";
import { getApiBaseUrl } from "../../config/apiBaseUrl";
import { colors, spacing } from "../../design/tokens";
import { listTasks, updateTask } from "../../services/taskApi";
import { WorkView } from "./WorkView";

interface WorkScreenProps {
  readonly onAddTask: () => void;
  readonly onOpenTask: (taskId: string) => void;
  /** Set by the route so returning from the editor reloads the backlog. */
  readonly reloadToken?: string;
}

/**
 * Data container for Work.
 *
 * Reads both task statuses so completed work stays reachable without a second
 * screen. The list is capped by the route at 50 per page; pages are followed
 * until exhausted or a safety bound is reached, so a large backlog still groups
 * correctly instead of silently truncating at the first page.
 */
export function WorkScreen({ onAddTask, onOpenTask, reloadToken }: WorkScreenProps) {
  const { session } = useAuth();
  const accessToken = session?.accessToken;
  const [tasks, setTasks] = useState<readonly TaskView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const loadRef = useRef(0);

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      const apiBaseUrl = getApiBaseUrl();
      const token = accessToken?.trim();
      if (!apiBaseUrl || !token) {
        setError("Sign in again to load your work.");
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const requestId = ++loadRef.current;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);

      const collected: TaskView[] = [];
      let cursor: string | undefined;
      let failure: string | null = null;
      // Bounded so a paging bug cannot spin: 10 pages of 50 is far beyond a
      // realistic student backlog.
      for (let page = 0; page < 10; page += 1) {
        const result = await listTasks({
          accessToken: token,
          apiBaseUrl,
          ...(cursor ? { cursor } : {}),
        });
        if (!result.ok) {
          failure = result.error.message;
          break;
        }
        collected.push(...result.data.tasks);
        if (!result.data.nextCursor) break;
        cursor = result.data.nextCursor;
      }

      if (requestId !== loadRef.current) return;
      setNow(new Date());
      if (failure) {
        // Previously loaded work stays on screen; the error explains the gap.
        setError(failure);
      } else {
        setError(null);
        setTasks(collected);
      }
      setLoading(false);
      setRefreshing(false);
    },
    [accessToken],
  );

  useEffect(() => {
    void load("initial");
  }, [load, reloadToken]);

  const handleToggleComplete = useCallback(
    async (task: TaskView) => {
      const apiBaseUrl = getApiBaseUrl();
      const token = accessToken?.trim();
      if (!apiBaseUrl || !token) return;
      const nextStatus = task.status === "pending" ? "completed" : "pending";
      setBusyTaskId(task.id);
      const result = await updateTask({
        accessToken: token,
        apiBaseUrl,
        status: nextStatus,
        taskId: task.id,
      });
      setBusyTaskId(null);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      const updated = result.data;
      setError(null);
      setNow(new Date());
      setTasks((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
    },
    [accessToken],
  );

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl onRefresh={() => void load("refresh")} refreshing={refreshing} />
        }
      >
        <WorkView
          busyTaskId={busyTaskId}
          error={error}
          loading={loading}
          now={now}
          onAddTask={onAddTask}
          onOpenTask={(task) => onOpenTask(task.id)}
          onRetry={() => void load("initial")}
          onToggleComplete={(task) => void handleToggleComplete(task)}
          refreshing={refreshing}
          tasks={tasks}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: spacing[12],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
  },
});
