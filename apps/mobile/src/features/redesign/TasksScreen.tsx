import type { ActivityDetail, ActivitySummary } from "@stay-focused/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Linking, View } from "react-native";

import { useAuth } from "../../auth";
import {
  Action,
  Copy,
  Notice,
  Page,
  RowLink,
  Surface,
} from "../../design/primitives";
import { useTheme } from "../../design/theme";
import { createGenerationIntent } from "../../services/generationRecovery";
import { available, capabilityNote, deadline } from "./presentation";
import { useExperience } from "./useExperience";

export function TasksScreen() {
  const tasks = useExperience<{ items: ActivitySummary[] }>(
    `/api/experience/activities?utcOffsetMinutes=${-new Date().getTimezoneOffset()}`,
  );
  return (
    <Page
      title="Tasks"
      subtitle="Make room for what matters."
      onRefresh={tasks.refresh}
    >
      <Action secondary onPress={() => router.push("/task")}>
        Add a task
      </Action>
      {tasks.loading && <Notice>Loading your activities…</Notice>}
      {tasks.error && <Notice>{tasks.error}</Notice>}
      {(["now", "next", "later"] as const).map((group) => {
        const items =
          tasks.data?.items.filter(
            (item) =>
              item.urgency === group &&
              item.status !== "completed" &&
              item.status !== "submitted",
          ) ?? [];
        return (
          <View key={group} style={{ gap: 12 }}>
            <Copy size="h2">
              {group === "now" ? "Now" : group === "next" ? "Next" : "Later"}
            </Copy>
            {items.length ? (
              items.map((item) => <ActivityCard key={item.id} item={item} />)
            ) : (
              <Copy muted>Nothing here right now.</Copy>
            )}
          </View>
        );
      })}
      <Action secondary onPress={() => router.push("/personal-tasks")}>
        Manage personal & completed tasks
      </Action>
    </Page>
  );
}
function ActivityCard({ item }: { item: ActivitySummary }) {
  const { colors } = useTheme();
  return (
    <Surface>
      <RowLink
        label={`Open activity: ${item.title}`}
        onPress={() =>
          router.push({ pathname: "/activity", params: { id: item.id } })
        }
      >
        <Copy
          color={item.isOverdue ? colors.danger : colors.accent}
          size="caption"
        >
          {item.course?.code ?? item.course?.name ?? "Personal"}
          {item.isOverdue ? " · Overdue" : ""}
        </Copy>
        <Copy size="h3">{item.title}</Copy>
        <Copy muted size="caption">
          {deadline(item.dueAt)}
          {item.estimatedMinutes ? ` · ${item.estimatedMinutes} min` : ""}
        </Copy>
        {item.hasGeneratedDraft && <Copy size="caption">Draft ready</Copy>}
      </RowLink>
    </Surface>
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
