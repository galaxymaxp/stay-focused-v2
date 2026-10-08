"use client";
import type {
  StudySessionView,
  DeterministicStudyPlan,
  StudyPlanningRequest,
} from "@stay-focused/shared/task-planning";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../components/providers";
import { Empty, Heading, Notice, State } from "../components/ui";
import { dateLabel, localDate, timeLabel } from "../lib/api";
import { useAction, useResource } from "../lib/hooks";
export function ScheduleScreen() {
  const { api } = useAuth(),
    [date, setDate] = useState(localDate()),
    [from, setFrom] = useState("09:00"),
    [to, setTo] = useState("11:00");
  const start = new Date(`${date}T00:00:00`),
    end = new Date(start);
  end.setDate(end.getDate() + 7);
  const sessions = useResource<{ sessions: StudySessionView[] }>(
    `/api/study-sessions?startsAt=${encodeURIComponent(start.toISOString())}&endsAt=${encodeURIComponent(end.toISOString())}&limit=200`,
  );
  const [preview, setPreview] = useState<{
      plan: DeterministicStudyPlan;
      request: StudyPlanningRequest;
    } | null>(null),
    action = useAction();
  const days = Array.from({ length: 7 }, (_, index) => {
    const d = new Date(start);
    d.setDate(d.getDate() + index);
    return d;
  });
  function clear() {
    setPreview(null);
  }
  return (
    <>
      <Heading
        title="Schedule"
        subtitle="Make room for what matters."
        back="/today"
      />
      <div className="stack">
        <div className="row wrap between">
          <label>
            Week starting
            <input
              type="date"
              required
              value={date}
              onChange={(e) => {
                if (e.target.value) {
                  setDate(e.target.value);
                  clear();
                }
              }}
            />
          </label>
          <button onClick={sessions.refresh}>Refresh schedule</button>
        </div>
        <State resource={sessions} />
        {sessions.data && (
          <>
            <div className="scroll-panel">
              <div className="calendar-week">
                {days.map((day) => {
                  const rows = sessions.data!.sessions.filter(
                    (s) =>
                      Date.parse(s.startsAt) <
                        new Date(
                          day.getFullYear(),
                          day.getMonth(),
                          day.getDate() + 1,
                        ).getTime() && Date.parse(s.endsAt) > day.getTime(),
                  );
                  return (
                    <section key={day.toISOString()} className="calendar-day">
                      <h2>
                        {day.toLocaleDateString([], { weekday: "short" })}
                      </h2>
                      <p className="meta">
                        {day.toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      {rows.map((s) => (
                        <div className="session stack" key={s.id}>
                          <Link
                            href={`/tasks/${encodeURIComponent(`task:${s.taskId}`)}`}
                          >
                            {s.task?.title ?? "Study session"}
                          </Link>
                          <p>
                            {timeLabel(s.startsAt)} – {timeLabel(s.endsAt)}
                          </p>
                          <span className="meta">{s.status}</span>
                          <button
                            disabled={action.busy}
                            onClick={() =>
                              void action.run(async () => {
                                await api(`/api/study-sessions/${s.id}`, {
                                  method: "PATCH",
                                  body: {
                                    status:
                                      s.status === "completed"
                                        ? "planned"
                                        : "completed",
                                  },
                                });
                                sessions.refresh();
                              })
                            }
                          >
                            {s.status === "completed" ? "Reopen" : "Complete"}
                          </button>
                          <button
                            className="subtle"
                            disabled={action.busy}
                            onClick={() =>
                              void action.run(async () => {
                                await api(`/api/study-sessions/${s.id}`, {
                                  method: "PATCH",
                                  body: { status: "skipped" },
                                });
                                sessions.refresh();
                              })
                            }
                          >
                            Skip session
                          </button>
                        </div>
                      ))}
                      {!rows.length && (
                        <p className="meta">No study sessions.</p>
                      )}
                    </section>
                  );
                })}
              </div>
            </div>
            {!sessions.data.sessions.length && (
              <Empty title="Your schedule has room.">
                Choose available time below to plan your pending tasks.
              </Empty>
            )}
            {sessions.data.sessions.length === 200 && (
              <Notice>
                This week has at least 200 sessions. Choose a later start date
                to see more.
              </Notice>
            )}
          </>
        )}
        <section className="surface stack">
          <h2>Plan available time</h2>
          <p className="muted">
            Preview a plan from your pending tasks before saving it.
          </p>
          <div className="row wrap">
            <label>
              From
              <input
                type="time"
                required
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  clear();
                }}
              />
            </label>
            <label>
              Until
              <input
                type="time"
                required
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  clear();
                }}
              />
            </label>
          </div>
          <button
            disabled={action.busy || !from || !to || from >= to}
            onClick={() =>
              void action.run(async () => {
                const range = {
                  startsAt: new Date(`${date}T${from}`).toISOString(),
                  endsAt: new Date(`${date}T${to}`).toISOString(),
                };
                const request = { planningRange: range, availability: [range] };
                setPreview({
                  plan: await api<DeterministicStudyPlan>(
                    "/api/study-plan/preview",
                    { method: "POST", body: request },
                  ),
                  request,
                });
              })
            }
          >
            Preview study plan
          </button>
          {from >= to && (
            <p className="meta">Choose an end time after the start.</p>
          )}
          {preview && (
            <div className="stack">
              {preview.plan.sessions.map((s) => (
                <p key={s.proposalId}>
                  {s.taskTitle}
                  <span className="meta">
                    {dateLabel(s.startsAt)} – {timeLabel(s.endsAt)}
                    {s.scheduledAfterDeadline ? " · After deadline" : ""}
                  </span>
                </p>
              ))}
              {!preview.plan.sessions.length && (
                <p>No pending tasks fit this time.</p>
              )}
              {preview.plan.unscheduledWork.map((s) => (
                <p key={s.taskId} className="meta">
                  {s.taskTitle}: {s.unscheduledMinutes} minutes still need time.
                </p>
              ))}
              <button
                className="primary"
                disabled={action.busy || !preview.plan.sessions.length}
                onClick={() =>
                  void action.run(async () => {
                    await api("/api/study-plan/apply", {
                      method: "POST",
                      body: preview.request,
                    });
                    setPreview(null);
                    sessions.refresh();
                    action.setMessage("Your study schedule is saved.");
                  })
                }
              >
                Save schedule
              </button>
            </div>
          )}
        </section>
        {action.message && <Notice>{action.message}</Notice>}
      </div>
    </>
  );
}
