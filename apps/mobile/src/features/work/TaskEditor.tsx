import type { TaskPriority, TaskView } from "@stay-focused/shared/task-planning";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "../../components/Button";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { colors, hitTarget, radius, spacing, typography } from "../../design/tokens";
import { PRIORITY_LABELS } from "./workPresentation";
import {
  MAX_TASK_TITLE_LENGTH,
  formatDueInput,
  parseDueInput,
  parseEstimateInput,
} from "./taskEditorInput";

export interface TaskDraft {
  readonly title: string;
  readonly notes: string | null;
  readonly priority: TaskPriority;
  readonly dueAt: string | null;
  readonly estimatedMinutes: number;
}

interface TaskEditorProps {
  readonly task: TaskView | null;
  readonly saving: boolean;
  readonly deleting?: boolean;
  readonly error: string | null;
  readonly onSave: (draft: TaskDraft) => void;
  readonly onDelete?: () => void;
  readonly onCancel: () => void;
}

const PRIORITIES: readonly TaskPriority[] = ["low", "medium", "high"];

/**
 * Create and edit form for a task.
 *
 * Fields are limited to what the task routes accept: title, notes, priority,
 * due date, and estimate. Course assignment is absent because manual tasks
 * cannot carry Canvas provenance, and status is handled by the row control
 * rather than buried in a form.
 */
export function TaskEditor({
  task,
  saving,
  deleting = false,
  error,
  onSave,
  onDelete,
  onCancel,
}: TaskEditorProps) {
  const isCanvasTask = task?.sourceType === "canvas";
  const [title, setTitle] = useState(task?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [due, setDue] = useState(formatDueInput(task?.dueAt ?? null));
  const [estimate, setEstimate] = useState(String(task?.estimatedMinutes ?? 30));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidation("Give the task a title.");
      return;
    }
    if (trimmedTitle.length > MAX_TASK_TITLE_LENGTH) {
      setValidation(`Keep the title under ${MAX_TASK_TITLE_LENGTH} characters.`);
      return;
    }
    const dueAt = parseDueInput(due);
    if (dueAt === "invalid") {
      setValidation("Use a date like 2026-09-14, optionally with a time: 2026-09-14 17:00.");
      return;
    }
    const estimatedMinutes = parseEstimateInput(estimate);
    if (estimatedMinutes === null) {
      setValidation("Estimate must be a whole number of minutes between 1 and 1440.");
      return;
    }
    setValidation(null);
    onSave({
      title: trimmedTitle,
      notes: notes.trim() || null,
      priority,
      dueAt,
      estimatedMinutes,
    });
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={styles.content}
      >
        <Text style={styles.title}>{task ? "Edit task" : "New task"}</Text>
        {isCanvasTask ? (
          <Text style={styles.provenance}>
            This task came from Canvas. Your edits are kept and will not be
            overwritten the next time assignments are imported.
          </Text>
        ) : null}

        <View style={styles.fields}>
          <TextField
            label="Title"
            onChangeText={(value) => {
              setTitle(value);
              setValidation(null);
            }}
            placeholder="What needs doing?"
            testID="task-title-input"
            value={title}
          />

          <View style={styles.field}>
            <Text style={styles.label}>Priority</Text>
            <View
              accessibilityRole="radiogroup"
              style={styles.priorityRow}
            >
              {PRIORITIES.map((option) => {
                const selected = option === priority;
                return (
                  <Pressable
                    accessibilityLabel={`${PRIORITY_LABELS[option]} priority`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    key={option}
                    onPress={() => setPriority(option)}
                    style={[styles.priorityOption, selected ? styles.priorityOptionOn : null]}
                  >
                    <Text
                      style={[styles.priorityText, selected ? styles.priorityTextOn : null]}
                    >
                      {PRIORITY_LABELS[option]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <TextField
            autoCapitalize="none"
            label="Due (optional)"
            onChangeText={(value) => {
              setDue(value);
              setValidation(null);
            }}
            placeholder="2026-09-14 17:00"
            testID="task-due-input"
            value={due}
          />

          <TextField
            inputMode="numeric"
            keyboardType="number-pad"
            label="Estimated minutes"
            onChangeText={(value) => {
              setEstimate(value);
              setValidation(null);
            }}
            placeholder="30"
            testID="task-estimate-input"
            value={estimate}
          />

          <TextField
            label="Notes (optional)"
            multiline
            numberOfLines={4}
            onChangeText={setNotes}
            placeholder="Anything you need to remember"
            testID="task-notes-input"
            value={notes}
          />
        </View>

        {validation || error ? (
          <View style={styles.errorBox} testID="task-editor-error">
            <Text style={styles.errorText}>{validation ?? error}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button fullWidth loading={saving} onPress={handleSave} testID="task-save" variant="primary">
            {task ? "Save changes" : "Add task"}
          </Button>
          <Button fullWidth onPress={onCancel} variant="ghost">
            Cancel
          </Button>
        </View>

        {task && onDelete ? (
          <View style={styles.deleteBlock}>
            {confirmingDelete ? (
              <>
                <Text style={styles.deleteWarning}>
                  Delete this task permanently? Any study blocks scheduled for it
                  are removed too.
                </Text>
                <Button
                  fullWidth
                  loading={deleting}
                  onPress={onDelete}
                  testID="task-delete-confirm"
                  variant="danger"
                >
                  Delete task
                </Button>
                <Button fullWidth onPress={() => setConfirmingDelete(false)} variant="ghost">
                  Keep task
                </Button>
              </>
            ) : (
              <Button
                fullWidth
                onPress={() => setConfirmingDelete(true)}
                testID="task-delete"
                variant="ghost"
              >
                Delete task
              </Button>
            )}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[5],
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h1,
    fontWeight: "800",
  },
  provenance: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
  fields: {
    gap: spacing[4],
  },
  field: {
    gap: spacing[2],
  },
  label: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    fontWeight: "700",
  },
  priorityRow: {
    flexDirection: "row",
    gap: spacing[2],
  },
  priorityOption: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: hitTarget.min,
    paddingHorizontal: spacing[3],
  },
  priorityOptionOn: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.borderStrong,
  },
  priorityText: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    fontWeight: "600",
  },
  priorityTextOn: {
    color: colors.textPrimary,
    fontWeight: "800",
  },
  errorBox: {
    backgroundColor: colors.errorSurface,
    borderColor: colors.error,
    borderRadius: radius.control,
    borderWidth: 1,
    padding: spacing[3],
  },
  errorText: {
    color: colors.error,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
  actions: {
    gap: spacing[2],
  },
  deleteBlock: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing[2],
    paddingTop: spacing[4],
  },
  deleteWarning: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
});
