"use client";
import type { TodayItem, TodayOverview } from "@stay-focused/shared";
import type {
  DeterministicStudyPlan,
  StudyPlanningRequest,
} from "@stay-focused/shared/task-planning";
import Link from "next/link";
import { useState } from "react";
import { CountUp } from "../components/count-up";
import { DayRing } from "../components/day-ring";
import { useAuth } from "../components/providers";
import { Empty, Heading, Icon, Notice, RowLink, State } from "../components/ui";
import { dateLabel, localDate, timeLabel } from "../lib/api";
import { useAction, useResource } from "../lib/hooks";
export function TodayScreen() {
  const date = localDate(),
    { api, session } = useAuth();
  const today = useResource<TodayOverview>(
    `/api/today?date=${date}&utcOffsetMinutes=${-new Date().getTimezoneOffset()}`,
    60000,
  );
  const [start, setStart] = useState(() =>
      Math.min(
        1380,
        Math.ceil((new Date().getHours() * 60 + new Date().getMinutes()) / 15) *
          15,
      ),
    ),
    [end, setEnd] = useState(() => Math.min(1440, start + 120));
  const [preview, setPreview] = useState<{
      plan: DeterministicStudyPlan;
      request: StudyPlanningRequest;
    } | null>(null),
    action = useAction();
  const name =
    typeof session?.user.user_metadata?.full_name === "string"
      ? session.user.user_metadata.full_name.split(" ")[0]
      : null;
  function change(from: number, to: number) {
    setStart(from);
    setEnd(to);
    setPreview(null);
  }
  function plan() {
    void action.run(async () => {
      const base = new Date(`${date}T00:00:00`).getTime();
      const range = {
        startsAt: new Date(base + start * 60000).toISOString(),
        endsAt: new Date(base + end * 60000).toISOString(),
      };
      const request = { planningRange: range, availability: [range] };
      setPreview({
        plan: await api<DeterministicStudyPlan>("/api/study-plan/preview", {
          method: "POST",
          body: request,
        }),
        request,
      });
    });
  }
  const next = today.data?.current ?? today.data?.next ?? today.data?.urgent[0];
  const planned =
    today.data?.timeline.filter((item) => item.startAt && item.endAt) ?? [];
  const at = (minutes: number) =>
    timeLabel(
      new Date(
        new Date(`${date}T00:00:00`).getTime() + minutes * 60000,
      ).toISOString(),
    );
  return (
    <>
      <Heading
        title={`${new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening"}${name ? `, ${name}` : ""}`}
        subtitle={new Date().toLocaleDateString([], {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
        action={
          <Link href="/schedule" className="button" aria-label="Open schedule">
            <Icon name="calendar" />
            <span className="desktop-only">Open schedule</span>
          </Link>
        }
      />
      <State resource={today} />
      {today.data && (
        <div className="today-layout">
          <div className="stack">
            <section className="surface study-window">
              <div className="row between section-head">
                <h2>Study window</h2>
                <p className="meta">
                  <CountUp value={today.data.progress.completed} /> of{" "}
                  <CountUp value={today.data.progress.total} /> items completed
                  · <CountUp value={today.data.progress.scheduledMinutes} />{" "}
                  minutes scheduled
                </p>
              </div>
              <div className="study-window-body">
                <DayRing
                  date={date}
                  timeline={today.data.timeline}
                  start={start}
                  end={end}
                  onChange={change}
                />
                <div className="stack study-window-plan">
                  <div>
                    <p className="window-range count-up">
                      {at(start)} – {at(end)}
                    </p>
                    <p className="muted">
                      <CountUp value={end - start} />{" "}
                      minutes available
                    </p>
                  </div>
                  {preview ? (
                    <div className="stack plan-preview">
                      <h3>Your study plan</h3>
                      {preview.plan.sessions.length === 0 ? (
                        <p className="muted">
                          No pending work fits this time. Add a task or adjust
                          your availability.
                        </p>
                      ) : (
                        <ol className="time-blocks">
                          {preview.plan.sessions.map((s) => (
                            <li key={s.proposalId}>
                              <span className="meta">
                                {timeLabel(s.startsAt)} – {timeLabel(s.endsAt)}
                              </span>
                              <strong>{s.taskTitle}</strong>
                            </li>
                          ))}
                        </ol>
                      )}
                      {preview.plan.unscheduledWork.length > 0 && (
                        <Notice>
                          {preview.plan.unscheduledWork.length} tasks need more
                          available time.
                        </Notice>
                      )}
                      <div className="row wrap">
                        <button
                          className="primary"
                          disabled={
                            action.busy || preview.plan.sessions.length === 0
                          }
                          onClick={() =>
                            void action.run(async () => {
                              await api("/api/study-plan/apply", {
                                method: "POST",
                                body: preview.request,
                              });
                              setPreview(null);
                              today.refresh();
                              action.setMessage(
                                "Your study schedule is saved.",
                              );
                            })
                          }
                        >
                          Save schedule
                        </button>
                        <button
                          className="subtle"
                          onClick={() => setPreview(null)}
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {planned.length > 0 ? (
                        <ol className="time-blocks">
                          {planned.map((item) => (
                            <li key={item.id}>
                              <span className="meta">
                                {timeLabel(item.startAt!)} –{" "}
                                {timeLabel(item.endAt!)}
                              </span>
                              <strong>{item.title}</strong>
                              {item.course && (
                                <span className="meta">
                                  {item.course.name}
                                </span>
                              )}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="muted">
                          Nothing is planned yet. Set the time you have, then
                          let Stay Focused fit your tasks into it.
                        </p>
                      )}
                      <div>
                        <button
                          className="primary"
                          onClick={plan}
                          disabled={action.busy}
                        >
                          Plan this study time
                        </button>
                      </div>
                    </>
                  )}
                  {action.message && <Notice>{action.message}</Notice>}
                </div>
              </div>
            </section>
            {today.data.overdue.length > 0 && (
              <section className="stack">
                <h2>Needs attention</h2>
                {today.data.overdue.map((item) => (
                  <TodayRow key={item.id} item={item} />
                ))}
              </section>
            )}
            {today.data.upcomingDeadlines.length > 0 && (
              <section className="stack">
                <h2>Upcoming deadlines</h2>
                {today.data.upcomingDeadlines.map((item) => (
                  <TodayRow key={item.id} item={item} />
                ))}
              </section>
            )}
          </div>
          <aside className="stack today-rail">
            <h2>Up Next</h2>
            {next ? (
              <TodayRow item={next} />
            ) : (
              <Empty title="Your next step is open.">
                <Link href="/tasks">Add a task to plan your day.</Link>
              </Empty>
            )}
            <div className="row between">
              <h2>Later Today</h2>
              <Link href="/schedule">See all</Link>
            </div>
            {today.data.later.length ? (
              today.data.later.map((item) => (
                <TodayRow key={item.id} item={item} />
              ))
            ) : (
              <p className="muted">Nothing else scheduled today.</p>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
function TodayRow({ item }: { item: TodayItem }) {
  return (
    <RowLink
      href={
        item.deepLinkTarget.surface === "activity"
          ? `/tasks/${encodeURIComponent(item.deepLinkTarget.id)}`
          : "/schedule"
      }
      title={item.title}
      icon={item.kind === "study_session" ? "book-open" : "square-check-big"}
      tag={item.course?.name}
      detail={`${item.startAt ? timeLabel(item.startAt) : dateLabel(item.dueAt)}${item.estimatedMinutes ? ` · ${item.estimatedMinutes} min` : ""}`}
    />
  );
}
