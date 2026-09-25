import type { ActivityDetail, ActivitySummary } from "@stay-focused/shared";
import { router, useLocalSearchParams } from "expo-router";
import { Plus, Circle } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { Linking, Pressable, View } from "react-native";

import { useAuth } from "../../auth";
import {
  Action,
  Copy,
  Notice,
  Page,
  Surface,
  IconAction,
} from "../../design/primitives";
import { courseIdentity } from "../../design/courseIdentity";
import { CourseCard, CourseMark } from "../../design/CourseViews";
import { useTheme } from "../../design/theme";
import { spacing } from "../../design/tokens";
import { createGenerationIntent } from "../../services/generationRecovery";
import { SyncStatus } from "../sync/SyncStatus";
import { useCanvasSync } from "../sync/CanvasSyncProvider";
import { available, capabilityNote, deadline } from "./presentation";
import {
  PERSONAL_COURSE_KEY,
  courseKeyOf,
  groupCourseTasks,
  relativeDue,
  summarizeTaskCourses,
  type TaskCourseSummary,
  type TaskGroupKey,
} from "./tasksPresentation";
import { useExperience } from "./useExperience";

function activitiesPath() {
  return `/api/experience/activities?utcOffsetMinutes=${-new Date().getTimezoneOffset()}`;
}

function identityFor(summary: Pick<TaskCourseSummary, "key" | "course">) {
  return summary.course
    ? courseIdentity(summary.course)
    : courseIdentity({ id: PERSONAL_COURSE_KEY, name: "Personal tasks", code: null });
}

/** Level 1: one card per course, with real due/missing/completed counts. */
export function TasksScreen() {
  const { colors } = useTheme();
  const { sync } = useCanvasSync();
  const tasks = useExperience<{ items: ActivitySummary[] }>(activitiesPath());
  const courses = useMemo(() => summarizeTaskCourses(tasks.data?.items ?? []), [tasks.data]);
  return (
    <Page
      title="Tasks"
      onRefresh={() => {
        tasks.refresh();
        void sync();
      }}
      headerAction={<IconAction label="Add a task" onPress={() => router.push("/task")}><Plus size={18} color={colors.accent} /></IconAction>}
      actions={[{ label: "Manage personal & completed tasks", onPress: () => router.push("/personal-tasks") }]}
    >
      <SyncStatus />
      {tasks.loading && !tasks.data ? <Notice>Loading your activities…</Notice> : null}
      {tasks.error && !tasks.data ? (
        <Surface><Copy size="h3">Tasks could not be loaded</Copy><Copy muted>{tasks.error}</Copy><Action secondary onPress={tasks.refresh}>Try again</Action></Surface>
      ) : null}
      {tasks.data && courses.length === 0 ? (
        <Surface><Copy size="h3">No tasks yet</Copy><Copy muted>Canvas assignments with deadlines appear here after a sync. You can also add your own.</Copy></Surface>
      ) : null}
      {courses.map((summary) => {
        const identity = identityFor(summary);
        return (
          <CourseCard
            key={summary.key}
            identity={identity}
            testID={`task-course-${summary.key}`}
            accessibilityLabel={`${identity.title}: ${summary.due} due, ${summary.missing} past due, ${summary.completed} completed`}
            onPress={() => router.push({ pathname: "/work/[courseKey]", params: { courseKey: summary.key } })}
          >
            <TaskCounts summary={summary} />
          </CourseCard>
        );
      })}
    </Page>
  );
}

function TaskCounts({ summary }: { summary: TaskCourseSummary }) {
  const { colors } = useTheme();
  const parts: { label: string; color: string; strong?: boolean }[] = [];
  if (summary.missing > 0) parts.push({ label: `${summary.missing} past due`, color: colors.danger, strong: true });
  parts.push({ label: `${summary.due} due`, color: summary.due > 0 ? colors.textPrimary : colors.textMuted });
  parts.push({ label: `${summary.completed} completed`, color: colors.textMuted });
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: spacing[3] }}>
      {parts.map((part) => (
        <Copy key={part.label} size="caption" color={part.color} style={{ fontWeight: part.strong ? "600" : "400" }}>{part.label}</Copy>
      ))}
    </View>
  );
}

/** Level 2: one course's tasks, ordered by what needs attention now. */
export function TasksCourseScreen() {
  const { colors } = useTheme();
  const { courseKey: rawKey } = useLocalSearchParams<{ courseKey?: string }>();
  const courseKey = (Array.isArray(rawKey) ? rawKey[0] : rawKey) ?? PERSONAL_COURSE_KEY;
  const tasks = useExperience<{ items: ActivitySummary[] }>(activitiesPath());
  const [showCompleted, setShowCompleted] = useState(false);
  const now = Date.now();
  const items = useMemo(() => (tasks.data?.items ?? []).filter((item) => courseKeyOf(item) === courseKey), [courseKey, tasks.data]);
  const summary = summarizeTaskCourses(items)[0];
  const identity = identityFor({ key: courseKey, course: summary?.course ?? null });
  const groups = groupCourseTasks(items, now);
  return (
    <Page back title={identity.title} subtitle={identity.subtitle ?? undefined} onRefresh={tasks.refresh} headerLeading={<CourseMark identity={identity} size={34} />}>
      {tasks.loading && !tasks.data ? <Notice>Loading tasks…</Notice> : null}
      {tasks.error && !tasks.data ? (
        <Surface><Copy size="h3">Tasks could not be loaded</Copy><Copy muted>{tasks.error}</Copy><Action secondary onPress={tasks.refresh}>Try again</Action></Surface>
      ) : null}
      {tasks.data && items.length === 0 ? (
        <Surface><Copy size="h3">No tasks in this course</Copy><Copy muted>Assignments with deadlines or submissions will appear after your next Canvas sync.</Copy></Surface>
      ) : null}
      {summary ? <TaskCounts summary={summary} /> : null}
      {groups.map((group) => {
        if (group.items.length === 0) return null;
        const completed = group.key === "completed";
        const heading = { fontWeight: "600" as const, letterSpacing: 0.4, textTransform: "uppercase" as const };
        return (
          <View key={group.key} style={{ gap: spacing[2] }}>
            {completed ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${showCompleted ? "Hide" : "Show"} ${group.items.length} completed tasks`}
                accessibilityState={{ expanded: showCompleted }}
                onPress={() => setShowCompleted((value) => !value)}
                style={({ pressed }) => ({ minHeight: 44, flexDirection: "row", alignItems: "center", gap: spacing[2], opacity: pressed ? 0.6 : 1 })}
              >
                <Copy muted size="caption" style={[heading, { flex: 1 }]}>{group.title} · {group.items.length}</Copy>
                <Copy size="caption" color={colors.accent}>{showCompleted ? "Hide" : "Show"}</Copy>
              </Pressable>
            ) : (
              <Copy size="caption" color={group.key === "missing" ? colors.danger : colors.textSecondary} style={heading}>{group.title}</Copy>
            )}
            {!completed || showCompleted ? (
              <Surface style={{ padding: 0, overflow: "hidden", gap: 0 }}>
                {group.items.map((item, index) => <TaskLine key={item.id} item={item} group={group.key} first={index === 0} now={now} />)}
              </Surface>
            ) : null}
          </View>
        );
      })}
    </Page>
  );
}

function TaskLine({ item, group, first, now }: { item: ActivitySummary; group: TaskGroupKey; first: boolean; now: number }) {
  const { colors } = useTheme();
  const done = group === "completed";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", borderTopWidth: first ? 0 : 1, borderColor: colors.separator }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open task: ${item.title}`}
        onPress={() => router.push({ pathname: "/activity", params: { id: item.id } })}
        style={({ pressed }) => ({ flex: 1, minHeight: 60, paddingVertical: spacing[3], paddingLeft: spacing[4], paddingRight: spacing[2], gap: 2, backgroundColor: pressed ? colors.surfaceSecondary : undefined })}
      >
        <Copy size="bodySmall" color={done ? colors.textSecondary : colors.textPrimary} style={{ fontWeight: "600", fontSize: 15, lineHeight: 20 }}>{item.title}</Copy>
        <Copy size="caption" color={group === "missing" ? colors.danger : colors.textSecondary}>
          {group === "missing" ? "Past due · " : ""}
          {done ? (item.status === "submitted" ? "Submitted" : "Completed") : relativeDue(item.dueAt, now)}
          {item.hasGeneratedDraft ? " · Draft ready" : ""}
        </Copy>
      </Pressable>
      {item.taskId ? (
        <IconAction label={`Edit completion: ${item.title}`} onPress={() => router.push({ pathname: "/task", params: { taskId: item.taskId! } })}>
          <Circle size={18} color={colors.textMuted} />
        </IconAction>
      ) : null}
    </View>
  );
}
export function ActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const activity = useExperience<ActivityDetail>(
    id ? `/api/experience/activities/${encodeURIComponent(id)}` : null,
  );
  const { session } = useAuth();
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  async function create() {
    if (
      !activity.data ||
      !session ||
      busyRef.current ||
      !available(activity.data.generation.activityAssistance)
    )
      return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const intent = await createGenerationIntent(session.user.id, {
        title: activity.data.title,
        type: "activity_output",
        path: `/api/experience/activities/${encodeURIComponent(activity.data.id)}/generate`,
        body: { mode: "draft" },
      });
      router.push({ pathname: "/generation", params: { intent: intent.key } });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not start your draft.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  return (
    <Page title="Activity" back onRefresh={activity.refresh}>
      {activity.error && <Notice>{activity.error}</Notice>}
      {activity.loading && <Notice>Loading activity…</Notice>}
      {activity.data && (
        <>
          <Copy muted>{activity.data.course?.name ?? "Personal task"}</Copy>
          <Copy size="h1">{activity.data.title}</Copy>
          <Copy muted>{deadline(activity.data.dueAt)}</Copy>
          <Surface>
            <Copy size="h2">Instructions</Copy>
            <Copy>
              {activity.data.instructions ?? "No instructions provided."}
            </Copy>
          </Surface>
          {activity.data.resources.map((resource) => (
            <Action
              key={resource.url}
              secondary
              onPress={() => {
                if (/^https?:\/\//i.test(resource.url))
                  void Linking.openURL(resource.url).catch(() =>
                    setError("Could not open this resource."),
                  );
              }}
            >
              {resource.title}
            </Action>
          ))}
          {activity.data.taskId && (
            <Action
              secondary
              onPress={() =>
                router.push({
                  pathname: "/task",
                  params: { taskId: activity.data!.taskId! },
                })
              }
            >
              Edit task & completion
            </Action>
          )}
          {activity.data.outputs.map((output) => (
            <Action
              secondary
              key={output.id}
              onPress={() =>
                router.push({
                  pathname: "/artifact",
                  params: { id: output.id },
                })
              }
            >
              Open {output.title}
            </Action>
          ))}
          <Action
            disabled={
              busy || !available(activity.data.generation.activityAssistance)
            }
            onPress={() => void create()}
          >
            Create Draft
          </Action>
          {!available(activity.data.generation.activityAssistance) && (
            <Notice>
              {capabilityNote(activity.data.generation.activityAssistance)}
            </Notice>
          )}
        </>
      )}
      {error && <Notice>{error}</Notice>}
    </Page>
  );
}
