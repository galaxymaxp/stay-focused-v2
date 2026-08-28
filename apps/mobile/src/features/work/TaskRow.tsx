import type { TaskView } from "@stay-focused/shared/task-planning";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, hitTarget, radius, spacing, typography } from "../../design/tokens";
import {
  describeSource,
  formatDueLabel,
  formatEstimate,
} from "./workPresentation";

interface TaskRowProps {
  readonly task: TaskView;
  readonly now: Date;
  readonly busy?: boolean;
  readonly onOpen: (task: TaskView) => void;
  readonly onToggleComplete: (task: TaskView) => void;
}

/**
 * One task in the backlog.
 *
 * Two tap targets only: the status control and the row itself. Metadata is a
 * single sentence rather than a run of chips, so a long list stays scannable —
 * priority appears only when it is high, since medium is the default and
 * carries no signal.
 */
export function TaskRow({ task, now, busy = false, onOpen, onToggleComplete }: TaskRowProps) {
  const completed = task.status === "completed";
  const due = formatDueLabel(task.dueAt, now);
  const source = describeSource(task);
  const meta = [
    due?.text,
    task.priority === "high" && !completed ? "High priority" : null,
    formatEstimate(task.estimatedMinutes),
    source,
  ].filter((part): part is string => Boolean(part));

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel={
          completed ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`
        }
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed, busy, disabled: busy }}
        disabled={busy}
        hitSlop={8}
        onPress={() => onToggleComplete(task)}
        style={styles.statusControl}
      >
        <View style={[styles.statusDot, completed ? styles.statusDotDone : null]}>
          {completed ? <Text style={styles.statusCheck}>✓</Text> : null}
        </View>
      </Pressable>

      <Pressable
        accessibilityHint="Opens this task to edit or delete it"
        accessibilityLabel={taskAccessibilityLabel(task, due?.text ?? null, source)}
        accessibilityRole="button"
        onPress={() => onOpen(task)}
        style={({ pressed }) => [styles.body, pressed ? styles.bodyPressed : null]}
      >
        <Text
          numberOfLines={2}
          style={[styles.title, completed ? styles.titleDone : null]}
        >
          {task.title}
        </Text>
        <View style={styles.metaLine}>
          {due?.isOverdue && !completed ? (
            <Text style={styles.overdueMark}>Overdue</Text>
          ) : null}
          <Text numberOfLines={2} style={styles.meta}>
            {meta.join(" · ")}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

function taskAccessibilityLabel(
  task: TaskView,
  due: string | null,
  source: string | null,
): string {
  return [task.title, due, source].filter(Boolean).join(", ");
}

const styles = StyleSheet.create({
  row: {
    alignItems: "flex-start",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.tight,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  statusControl: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: hitTarget.min,
    minWidth: 28,
  },
  statusDot: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  statusDotDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  statusCheck: {
    color: colors.card,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 16,
  },
  body: {
    flex: 1,
    gap: spacing[1],
    minHeight: hitTarget.min,
    justifyContent: "center",
  },
  bodyPressed: {
    opacity: 0.6,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h3,
    fontWeight: "600",
    lineHeight: 22,
  },
  titleDone: {
    color: colors.textMuted,
    textDecorationLine: "line-through",
  },
  metaLine: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  overdueMark: {
    color: colors.error,
    fontFamily: typography.fontFamily,
    fontSize: typography.caption,
    fontWeight: "800",
  },
  meta: {
    color: colors.textMuted,
    flexShrink: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 18,
  },
});
