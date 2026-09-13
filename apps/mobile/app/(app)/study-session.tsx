import type { StudySessionView } from "@stay-focused/shared/task-planning";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Action, Copy, Notice, Page } from "../../src/design/primitives";
import { useExperience, useExperienceClient } from "../../src/features/redesign/useExperience";
import { timeLabel } from "../../src/features/redesign/presentation";
import { experienceRequest } from "../../src/services/experienceApi";
export default function StudySession() {
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>();
  const dayStart = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00`) : null;
  const dayEnd = dayStart ? new Date(dayStart.getTime()) : null;
  dayEnd?.setDate(dayEnd.getDate() + 1);
  const range = dayStart && dayEnd ? `&startsAt=${encodeURIComponent(dayStart.toISOString())}&endsAt=${encodeURIComponent(dayEnd.toISOString())}` : "";
  const result = useExperience<{ sessions: StudySessionView[] }>(id ? `/api/study-sessions?limit=200${range}` : null); const client = useExperienceClient();
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const session = result.data?.sessions.find(item => item.id === id);
  return <Page title="Study session" back>{result.error && <Notice>{result.error}</Notice>}{result.loading && <Notice>Loading session…</Notice>}{result.data && !session && <Notice>This session is no longer available. Return to Today to refresh your schedule.</Notice>}{session && <><Copy size="h2">{session.task?.title ?? "Study"}</Copy><Copy muted>{timeLabel(session.startsAt)} – {timeLabel(session.endsAt)} · {session.status}</Copy>{(["completed", "skipped", "planned"] as const).map(status => <Action key={status} secondary disabled={busy || session.status === status} onPress={() => { setBusy(true); void experienceRequest(client, `/api/study-sessions/${encodeURIComponent(id)}`, { method: "PATCH", body: { status } }).then(result.refresh).catch(cause => setError(cause instanceof Error ? cause.message : "Could not update session.")).finally(() => setBusy(false)); }}>{status === "completed" ? "Mark completed" : status === "skipped" ? "Skip session" : "Mark planned"}</Action>)}{session.task && <Action secondary onPress={() => router.push({ pathname: "/task", params: { taskId: session.task!.id } })}>Open task</Action>}</>}{error && <Notice>{error}</Notice>}</Page>;
}
