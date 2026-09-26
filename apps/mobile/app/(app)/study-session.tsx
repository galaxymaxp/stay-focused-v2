import type { ActivitySummary } from "@stay-focused/shared";
import type { StudySessionView } from "@stay-focused/shared/task-planning";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { Action, Copy, Notice, Page, SkeletonCards } from "../../src/design/primitives";
import { useExperience, useExperienceClient } from "../../src/features/redesign/useExperience";
import { timeLabel } from "../../src/features/redesign/presentation";
import { experienceRequest } from "../../src/services/experienceApi";

/**
 * A planned block of time for one activity or task. The planner makes these
 * when a schedule is applied; the work itself is the activity, so the
 * activity is the main way forward and the session only tracks the block.
 */
export default function StudySession() {
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>();
  const dayStart = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00`) : null;
  const dayEnd = dayStart ? new Date(dayStart.getTime()) : null;
  dayEnd?.setDate(dayEnd.getDate() + 1);
  const range = dayStart && dayEnd ? `&startsAt=${encodeURIComponent(dayStart.toISOString())}&endsAt=${encodeURIComponent(dayEnd.toISOString())}` : "";
  const result = useExperience<{ sessions: StudySessionView[] }>(id ? `/api/study-sessions?limit=200${range}` : null);
  const activities = useExperience<{ items: ActivitySummary[] }>(`/api/experience/activities?utcOffsetMinutes=${-new Date().getTimezoneOffset()}`);
  const client = useExperienceClient();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const session = result.data?.sessions.find((item) => item.id === id);
  const activity = session ? activities.data?.items.find((item) => item.taskId === session.taskId) ?? null : null;
  const title = activity?.title ?? session?.task?.title ?? "Planned work";
  const update = (status: "completed" | "skipped" | "planned") => {
    setBusy(true);
    void experienceRequest(client, `/api/study-sessions/${encodeURIComponent(id)}`, { method: "PATCH", body: { status } })
      .then(result.refresh)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Could not update session."))
      .finally(() => setBusy(false));
  };
  return (
    <Page title="Work session" back subtitle={activity?.course?.code ?? activity?.course?.name ?? undefined}>
      {result.error && <Notice>{result.error}</Notice>}
      {result.loading && !result.data ? <SkeletonCards rows={2} label="Loading session" /> : null}
      {result.data && !session && <Notice>This session is no longer available. Return to Today to refresh your schedule.</Notice>}
      {session && (
        <>
          <Copy size="h2">{title}</Copy>
          <Copy muted>
            {timeLabel(session.startsAt)} – {timeLabel(session.endsAt)} · {session.status === "planned" ? "Planned" : session.status === "completed" ? "Done" : "Skipped"}
          </Copy>
          {activity ? (
            <Action onPress={() => router.push({ pathname: "/activity", params: { id: activity.id } })}>Open activity</Action>
          ) : session.task ? (
            <Action onPress={() => router.push({ pathname: "/task", params: { taskId: session.task!.id } })}>Open task</Action>
          ) : null}
          {session.status !== "completed" ? <Action secondary disabled={busy} onPress={() => update("completed")}>Mark this block done</Action> : null}
          {session.status !== "skipped" ? <Action secondary disabled={busy} onPress={() => update("skipped")}>Skip this block</Action> : null}
          {session.status !== "planned" ? <Action secondary disabled={busy} onPress={() => update("planned")}>Keep it planned</Action> : null}
        </>
      )}
      {error && <Notice>{error}</Notice>}
    </Page>
  );
}
