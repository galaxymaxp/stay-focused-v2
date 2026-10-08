"use client";
import type { ActivitySummary } from "@stay-focused/shared";
import type { StudySessionView } from "@stay-focused/shared/task-planning";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { timeLabel } from "../app-model/presentation";
import { CourseMark } from "../components/course";
import { Heading, Notice, State } from "../components/ui";
import { useAction, useResource } from "../lib/hooks";
import { useAuth } from "../components/providers";

// Web port of apps/mobile/app/(app)/study-session.tsx: a planned block of time
// for one activity or task. The work itself is the activity, so it leads.

export function StudySessionScreen({ id }: { id: string }) {
  const { api } = useAuth();
  const date = useSearchParams().get("date");
  const dayStart = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00`) : null;
  const dayEnd = dayStart ? new Date(dayStart.getTime() + 86_400_000) : null;
  const range = dayStart && dayEnd
    ? `&startsAt=${encodeURIComponent(dayStart.toISOString())}&endsAt=${encodeURIComponent(dayEnd.toISOString())}`
    : "";
  const sessions = useResource<{ sessions: StudySessionView[] }>(`/api/study-sessions?limit=200${range}`);
  const activities = useResource<{ items: ActivitySummary[] }>(
    `/api/experience/activities?utcOffsetMinutes=${-new Date().getTimezoneOffset()}`,
  );
  const action = useAction();
  const session = sessions.data?.sessions.find((item) => item.id === id);
  const activity = session ? (activities.data?.items.find((item) => item.taskId === session.taskId) ?? null) : null;
  const title = activity?.title ?? session?.task?.title ?? "Planned work";
  const update = (status: "completed" | "skipped" | "planned") =>
    void action.run(async () => {
      await api(`/api/study-sessions/${encodeURIComponent(id)}`, { method: "PATCH", body: { status } });
      sessions.refresh();
    });
  const minutes = session ? Math.round((Date.parse(session.endsAt) - Date.parse(session.startsAt)) / 60000) : 0;
  return (
    <>
      <Heading
        title="Work session"
        crumb={title}
        subtitle={activity?.course?.code ?? activity?.course?.name ?? undefined}
        back="/schedule"
      />
      <State resource={sessions} />
      {sessions.data && !session && (
        <Notice>This session is no longer available. Return to Today to refresh your schedule.</Notice>
      )}
      {session && (
        <section className="surface stack session-card">
          <div className="row">
            {activity?.course && <CourseMark course={activity.course} size={40} />}
            <div>
              <h2>{title}</h2>
              <p className="muted count-up">
                {timeLabel(session.startsAt)} – {timeLabel(session.endsAt)} · {minutes} min ·{" "}
                {session.status === "planned" ? "Planned" : session.status === "completed" ? "Done" : "Skipped"}
              </p>
            </div>
          </div>
          <div className="row wrap">
            {activity ? (
              <Link className="button primary" href={`/tasks/${encodeURIComponent(activity.id)}`}>
                Open activity
              </Link>
            ) : session.task ? (
              <Link className="button primary" href={`/tasks/${encodeURIComponent(`task:${session.task.id}`)}`}>
                Open task
              </Link>
            ) : null}
            {session.status !== "completed" && (
              <button disabled={action.busy} onClick={() => update("completed")}>
                Mark this block done
              </button>
            )}
            {session.status !== "skipped" && (
              <button className="subtle" disabled={action.busy} onClick={() => update("skipped")}>
                Skip this block
              </button>
            )}
            {session.status !== "planned" && (
              <button className="subtle" disabled={action.busy} onClick={() => update("planned")}>
                Keep it planned
              </button>
            )}
          </div>
          {action.message && <Notice error>{action.message}</Notice>}
        </section>
      )}
    </>
  );
}
