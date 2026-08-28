import type { TaskView } from "@stay-focused/shared/task-planning";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { colors, hitTarget, radius, spacing, typography } from "../../design/tokens";
import { TaskRow } from "./TaskRow";
import {
  describeWorkload,
  groupPendingTasks,
  sortCompleted,
  summarizeWork,
} from "./workPresentation";

export interface WorkViewProps {
  readonly tasks: readonly TaskView[];
  readonly now: Date;
  readonly loading: boolean;
  readonly refreshing: boolean;
  readonly error: string | null;
  readonly busyTaskId: string | null;
  readonly onAddTask: () => void;
  readonly onOpenTask: (task: TaskView) => void;
  readonly onToggleComplete: (task: TaskView) => void;
  readonly onRetry: () => void;
}

/**
 * The Work surface, as a pure view over already-loaded tasks.
 *
 * Kept free of data fetching so the layout can be exercised directly with
 * fixtures during design review and so every derived value comes from the
 * tested presentation module.
 */
export function WorkView({
  tasks,
  now,
  loading,
  refreshing,
  error,
  busyTaskId,
  onAddTask,
  onOpenTask,
  onToggleComplete,
  onRetry,
}: WorkViewProps) {
  const [showCompleted, setShowCompleted] = useState(false);

  const summary = useMemo(() => summarizeWork(tasks, now), [tasks, now]);
  const groups = useMemo(() => groupPendingTasks(tasks, now), [tasks, now]);
  const completed = useMemo(() => sortCompleted(tasks), [tasks]);
  const workload = describeWorkload(summary);

  // A first load has nothing to keep on screen; a refresh keeps the previous
  // list visible and only marks the header.
  if (loading && tasks.length === 0) {
    return (
      <View style={styles.container}>
        <WorkHeader onAddTask={onAddTask} subtitle="Loading your work…" />
        <LoadingRows />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WorkHeader
        onAddTask={onAddTask}
        subtitle={refreshing ? "Refreshing…" : workload ?? "Nothing open right now"}
      />

      {error ? (
        <Card style={styles.errorCard}>
          <Text style={styles.errorTitle}>Your work could not be loaded</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <Button onPress={onRetry} variant="secondary">
            Try again
          </Button>
        </Card>
      ) : null}

      {groups.length === 0 && !error ? (
        <EmptyState
          hasCompleted={summary.completedCount > 0}
          onAddTask={onAddTask}
        />
      ) : null}

      {groups.map((group) => (
        <View key={group.id} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{group.title}</Text>
            <Text style={styles.sectionCount}>{group.tasks.length}</Text>
          </View>
          <View style={styles.sectionBody}>
            {group.tasks.map((task) => (
              <TaskRow
                busy={busyTaskId === task.id}
                key={task.id}
                now={now}
                onOpen={onOpenTask}
                onToggleComplete={onToggleComplete}
                task={task}
              />
            ))}
          </View>
        </View>
      ))}

      {completed.length > 0 ? (
        <View style={styles.section}>
          <Pressable
            accessibilityLabel={`${showCompleted ? "Hide" : "Show"} ${completed.length} completed ${completed.length === 1 ? "task" : "tasks"}`}
            accessibilityRole="button"
            accessibilityState={{ expanded: showCompleted }}
            onPress={() => setShowCompleted((value) => !value)}
            style={styles.completedToggle}
          >
            <Text style={styles.sectionTitle}>Completed</Text>
            <Text style={styles.sectionCount}>
              {showCompleted ? "Hide" : String(completed.length)}
            </Text>
          </Pressable>
          {showCompleted ? (
            <View style={styles.sectionBody}>
              {completed.map((task) => (
                <TaskRow
                  busy={busyTaskId === task.id}
                  key={task.id}
                  now={now}
                  onOpen={onOpenTask}
                  onToggleComplete={onToggleComplete}
                  task={task}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function WorkHeader({
  onAddTask,
  subtitle,
}: {
  readonly onAddTask: () => void;
  readonly subtitle: string;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle}>Work</Text>
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
      </View>
      <Button onPress={onAddTask} testID="work-add-task" variant="primary">
        Add task
      </Button>
    </View>
  );
}

function EmptyState({
  hasCompleted,
  onAddTask,
}: {
  readonly hasCompleted: boolean;
  readonly onAddTask: () => void;
}) {
  return (
    <Card style={styles.emptyCard} testID="work-empty-state">
      <Text style={styles.emptyTitle}>
        {hasCompleted ? "Nothing left open" : "No work yet"}
      </Text>
      <Text style={styles.emptyBody}>
        {hasCompleted
          ? "Everything in your backlog is done. Add what comes next when you are ready."
          : "Add what you need to work on, or import assignments from a synced Canvas course."}
      </Text>
      <Button fullWidth onPress={onAddTask} variant="primary">
        Add a task
      </Button>
    </Card>
  );
}

function LoadingRows() {
  return (
    <View
      accessibilityLabel="Loading your work"
      accessibilityRole="progressbar"
      style={styles.loading}
      testID="work-loading"
    >
      <ActivityIndicator color={colors.textMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[6],
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[3],
    justifyContent: "space-between",
  },
  headerText: {
    flexGrow: 1,
    flexShrink: 1,
    gap: spacing[1],
    minWidth: 180,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.display,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    lineHeight: 22,
  },
  section: {
    gap: spacing[3],
  },
  sectionHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: spacing[2],
    justifyContent: "space-between",
  },
  completedToggle: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: hitTarget.min,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h2,
    fontWeight: "700",
  },
  sectionCount: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    fontWeight: "600",
  },
  sectionBody: {
    gap: spacing[2],
  },
  emptyCard: {
    gap: spacing[3],
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h2,
    fontWeight: "700",
  },
  emptyBody: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    lineHeight: 22,
  },
  errorCard: {
    borderColor: colors.error,
    gap: spacing[3],
  },
  errorTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h3,
    fontWeight: "700",
  },
  errorBody: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
  loading: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    paddingVertical: spacing[10],
  },
});
