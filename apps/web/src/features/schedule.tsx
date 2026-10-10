"use client";
import type { ActivitySummary } from "@stay-focused/shared";
import type {
  StudySessionView,
  DeterministicStudyPlan,
  StudyPlanningRequest,
} from "@stay-focused/shared/task-planning";
import Link from "next/link";
import { useState } from "react";
import { CourseDot } from "../components/course";
import { useAuth } from "../components/providers";
import { Empty, Heading, Icon, Notice, State } from "../components/ui";
import { dateLabel, localDate, timeLabel } from "../lib/api";
import { useAction, useResource } from "../lib/hooks";
import { CanvasRefreshStatus, useCanvasRefresh } from "../lib/canvas-refresh";
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
    60000,
  );
  // Deadlines in this week, so planned time sits next to what is due.
  const activities = useResource<{ items: ActivitySummary[] }>(
    `/api/experience/activities?utcOffsetMinutes=${-new Date().getTimezoneOffset()}`,
    60000,
  );
  const refreshSchedule = () => { sessions.refresh(); activities.refresh(); };
  const canvasRefresh = useCanvasRefresh("all", refreshSchedule);
  const dueOn = (day: Date) =>
    (activities.data?.items ?? [])
      .filter(
        (a) =>
          a.dueAt &&
          localDate(new Date(a.dueAt)) === localDate(day) &&
          a.status !== "completed" &&
          a.status !== "submitted",
      )
      .sort((a, b) => Date.parse(a.dueAt!) - Date.parse(b.dueAt!));
  const dueThisWeek = (activities.data?.items ?? []).filter(
      (a) =>
        a.dueAt &&
        Date.parse(a.dueAt) >= start.getTime() &&
        Date.parse(a.dueAt) < end.getTime() &&
        a.status !== "completed" &&
        a.status !== "submitted",
  ).length;
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
  function shiftWeek(daysBy: number) {
    const next = new Date(start);
    next.setDate(next.getDate() + daysBy);
    setDate(localDate(next));
    clear();
  }
  function setStatus(id: string, status: "planned" | "completed" | "skipped") {
    void action.run(async () => {
      await api(`/api/study-sessions/${id}`, { method: "PATCH", body: { status } });
      sessions.refresh();
    });
  }
  const today = localDate();
  const planned = sessions.data?.sessions.filter((s) => s.status === "planned").length ?? 0;
  return (
    <>
      <Heading
        title="Schedule"
        subtitle={
          sessions.data
            ? `${planned} planned ${planned === 1 ? "block" : "blocks"}${activities.data ? ` · ${dueThisWeek} due this week` : activities.error ? " · Deadlines unavailable" : " · Loading deadlines…"}`
            : "Make room for what matters."
        }
        back="/today"
      />
      <div className="stack">
        <div className="row wrap week-tools">
          <div className="row week-nav">
            <button className="icon-button subtle" aria-label="Previous week" onClick={() => shiftWeek(-7)}>
              <Icon name="chevron-left" />
            </button>
            <label>
              <span className="sr-only">Week starting</span>
              <input
                type="date"
                required
                aria-label="Week starting"
                value={date}
                onChange={(e) => {
                  if (e.target.value) {
                    setDate(e.target.value);
                    clear();
                  }
                }}
              />
            </label>
            <button className="icon-button subtle" aria-label="Next week" onClick={() => shiftWeek(7)}>
              <Icon name="chevron-right" />
            </button>
            {date !== today && (
              <button
                className="subtle"
                onClick={() => {
                  setDate(today);
                  clear();
                }}
              >
                This week
              </button>
            )}
          </div>
          <button className="subtle" onClick={refreshSchedule}>
            <Icon name="refresh-cw" />
            <span className="desktop-only">Refresh schedule</span>
          </button>
        </div>
        <CanvasRefreshStatus refresh={canvasRefresh} />
        <State resource={[sessions, activities]} />
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
                    <section
                      key={day.toISOString()}
                      className={`calendar-day${localDate(day) === today ? " today" : ""}`}
                    >
                      <h2>
                        {day.toLocaleDateString([], { weekday: "short" })}
                        <span className="calendar-date">
                          {day.toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </h2>
                      {dueOn(day).map((a) => (
                        <Link
                          key={a.id}
                          className={`due-chip${a.isOverdue ? " overdue" : ""}`}
                          href={`/tasks/${encodeURIComponent(a.id)}`}
                          title={a.title}
                        >
                          {a.course ? <CourseDot course={a.course} /> : <span className="due-dot" aria-hidden="true" />}
                          <span className="grow">
                            <strong>{a.title}</strong>
                            <span className="meta">
                              Due {timeLabel(a.dueAt)}
                              {a.course?.code ? ` · ${a.course.code.split("|")[0]!.trim()}` : ""}
                            </span>
                          </span>
                        </Link>
                      ))}
                      {rows.map((s) => {
                        const title = s.task?.title ?? "Study session";
                        return (
                          <div className={`session ${s.status}`} key={s.id}>
                            <Link
                              className="session-open"
                              href={`/schedule/session/${encodeURIComponent(s.id)}?date=${localDate(day)}`}
                            >
                              {title}
                            </Link>
                            <span className="meta">
                              {timeLabel(s.startsAt)} – {timeLabel(s.endsAt)}
                              {s.status !== "planned" && ` · ${s.status === "completed" ? "Done" : "Skipped"}`}
                            </span>
                            <span className="session-actions">
                              <button
                                className="icon-button subtle"
                                disabled={action.busy}
                                aria-label={`${s.status === "completed" ? "Reopen" : "Complete"} ${title}`}
                                title={s.status === "completed" ? "Reopen" : "Mark done"}
                                aria-pressed={s.status === "completed"}
                                onClick={() => setStatus(s.id, s.status === "completed" ? "planned" : "completed")}
                              >
                                <Icon name="check" />
                              </button>
                              <button
                                className="icon-button subtle"
                                disabled={action.busy}
                                aria-label={`${s.status === "skipped" ? "Restore" : "Skip"} ${title}`}
                                title={s.status === "skipped" ? "Keep it planned" : "Skip this block"}
                                aria-pressed={s.status === "skipped"}
                                onClick={() => setStatus(s.id, s.status === "skipped" ? "planned" : "skipped")}
                              >
                                <Icon name="x" />
                              </button>
                            </span>
                          </div>
                        );
                      })}
                      {!rows.length && !dueOn(day).length && (
                        <p className="meta calendar-free">Free</p>
                      )}
                    </section>
                  );
                })}
              </div>
            </div>
            {!sessions.data.sessions.length && !dueThisWeek && (
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
        <section className="surface stack planner-card">
          <div>
            <h2>Plan available time</h2>
            <p className="muted">
              Preview a plan from your pending tasks before saving it.
            </p>
          </div>
          <div className="row wrap planner-fields">
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
          <button
            className="primary"
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
          </div>
          {from >= to && (
            <p className="meta">Choose an end time after the start.</p>
          )}
          {preview && (
            <div className="stack plan-proposal">
              {preview.plan.sessions.map((s) => (
                <p key={s.proposalId} className="proposal-row">
                  <strong>{s.taskTitle}</strong>
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
