"use client";
import { SnapshotStatus } from "../../components/snapshot-status";
import { CanvasRefreshStatus, useCanvasRefresh } from "../../lib/canvas-refresh";
import type {
  TodayItem,
  TodayScreenData,
} from "@stay-focused/shared";
import type {
  DeterministicStudyPlan,
  StudyPlanningRequest,
} from "@stay-focused/shared/task-planning";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { todayHideKey } from "../../app-model/listPreferences";
import {
  activityFor,
  arrangeToday,
  available,
  deadline,
  greetingFor,
  localDate,
  scheduleState,
  timeLabel,
  todayItemDetail,
  todaySchedule,
  urgencyOf,
  type Urgency,
} from "../../app-model/presentation";
import { BookLoader } from "../../components/brand";
import { CourseDot } from "../../components/course";
import { ClearDay } from "../../components/clear-day";
import { useAuth } from "../../components/providers";
import { ContentIcon, Heading, Icon, Notice } from "../../components/ui";
import { useResource } from "../../lib/hooks";
import { setWorkDone } from "../../lib/complete-work";
import { useListPreferences } from "../../lib/list-preferences";
import { DayRingClock } from "../day-clock/DayRingClock";
import { readFreeTime, writeFreeTime } from "../day-clock/free-time-store";
import {
  clockLabel,
  formatFreeTime,
  freeTimeAround,
  planTaskIds,
  planToneFor,
  planningRequest,
  timelineSegments,
} from "../day-clock/timeline";
import { PlanPreview } from "./plan-preview";
import { TodayCalendar } from "./today-calendar";

// Web counterpart of apps/mobile/src/features/redesign/TodayScreen.tsx: the
// clock and plan on the left, the day's work on the right.

const CLOCK_LOCK_KEY = "sf.today.clock-locked";
const store = {
  get(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Not remembered this time. */
    }
  },
};

export function TodayScreen() {
  const { api, session } = useAuth(),
    router = useRouter(),
    date = localDate();
  const today = useResource<TodayScreenData>(
    `/api/today?date=${date}&utcOffsetMinutes=${-new Date().getTimezoneOffset()}`,
    60000,
  );
  const capabilities = { ...today, data: today.data?.capabilities ?? null };
  const announcements = { ...today, data: today.data?.announcements ?? null };
  const activities = { ...today, data: today.data?.activities ?? null };
  const canvasRefresh = useCanvasRefresh("all", () => { today.refresh(); }, false);
  const { prefs, pin, hide, read } = useListPreferences();
  const meta = session?.user.user_metadata ?? {};
  const displayName = [meta.full_name, meta.name].find(
    (v): v is string => typeof v === "string" && !!v.trim(),
  );
  const firstName = displayName?.trim().split(/\s+/)[0];

  // Free time: remembered per day, otherwise wrapped around today's planned blocks.
  const [start, setStart] = useState(() =>
    Math.min(1410, Math.ceil((new Date().getHours() * 60 + new Date().getMinutes()) / 15) * 15),
  );
  const [end, setEnd] = useState(() => Math.min(1440, start + 120));
  const [windowKnown, setWindowKnown] = useState(false);
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    setLocked(store.get(CLOCK_LOCK_KEY) === "1");
    const saved = readFreeTime(date);
    setWindowKnown(!!saved);
    if (saved) {
      setStart(saved.start);
      setEnd(saved.end);
    }
  }, [date]);
  const planned = today.data?.timeline;
  useEffect(() => {
    if (windowKnown || !planned) return;
    const now = new Date();
    const around = freeTimeAround(
      timelineSegments(planned.filter((item) => item.status === "planned"), date),
      now.getHours() * 60 + now.getMinutes(),
    );
    if (around) {
      setStart(around.start);
      setEnd(around.end);
      setWindowKnown(true);
    }
  }, [date, planned, windowKnown]);

  const [preview, setPreview] = useState<DeterministicStudyPlan | null>(null);
  const [previewRequest, setPreviewRequest] = useState<StudyPlanningRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const busyRef = useRef(false);
  const plannerReady = available(capabilities.data?.planner);

  const change = (from: number, to: number) => {
    setStart(from);
    setEnd(to);
    setPreview(null);
    setPreviewRequest(null);
    setWindowKnown(true);
    writeFreeTime(date, { start: from, end: to });
  };
  async function plan(from: number, to: number) {
    if (busyRef.current || !plannerReady) return;
    busyRef.current = true;
    setBusy(true);
    setNote(null);
    setPreview(null);
    setPreviewRequest(null);
    try {
      const request = planningRequest(date, from, to);
      setPreview(
        await api<DeterministicStudyPlan>("/api/experience/planner/preview", {
          method: "POST",
          body: request,
        }),
      );
      setPreviewRequest(request);
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not preview your plan.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function apply() {
    if (!previewRequest || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await api("/api/experience/planner/replan", { method: "POST", body: previewRequest });
      setPreview(null);
      setPreviewRequest(null);
      setNote("Saved. These blocks are on your Schedule.");
      today.refresh();
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not update your schedule.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function complete(item: TodayItem) {
    if (busyRef.current) return;
    const activity = activityFor(item, activities.data?.items ?? []);
    if (!activity) {
      setNote("This item is still loading. Try again in a moment.");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      await setWorkDone(api, activity, true);
      setPreview(null);
      setPreviewRequest(null);
      today.refresh();
      setNote(`“${item.title}” is marked done.`);
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not mark it done.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const openItem = (item: TodayItem) => {
    const activity = activityFor(item, activities.data?.items ?? []);
    if (activity) router.push(`/tasks/${encodeURIComponent(activity.id)}`);
    else if (item.deepLinkTarget.surface === "activity")
      router.push(`/tasks/${encodeURIComponent(item.deepLinkTarget.id)}`);
    else
      router.push(`/schedule/session/${encodeURIComponent(item.deepLinkTarget.id)}?date=${date}`);
  };

  // Canvas deadlines in the coming week that are not already scheduled today.
  const upcoming = (today.data?.upcomingDeadlines ?? []).filter(
    (item) => item.dueAt && Date.parse(item.dueAt) - Date.now() < 7 * 86_400_000,
  );
  const arranged = arrangeToday(
    {
      next: today.data?.next ?? null,
      later: today.data?.later ?? [],
      dueSoon: upcoming.slice(0, 3),
      others: [...(today.data?.timeline ?? []), ...upcoming],
    },
    prefs.pinned.today,
    prefs.hidden.today,
    date,
  );
  const [showHidden, setShowHidden] = useState(false);
  const [lastHidden, setLastHidden] = useState<TodayItem | null>(null);
  const rowActions = (item: TodayItem) => {
    const pinned = prefs.pinned.today.includes(item.id);
    return {
      pinned,
      onPin: () => pin("today", item.id, !pinned),
      onHide: () => {
        hide("today", todayHideKey(date, item.id), true);
        if (pinned) pin("today", item.id, false);
        setLastHidden(item);
      },
    };
  };
  const unhide = (item: TodayItem) => {
    hide("today", todayHideKey(date, item.id), false);
    if (lastHidden?.id === item.id) setLastHidden(null);
  };
  const row = (item: TodayItem, options: { dominant?: boolean; withDay?: boolean } = {}) => (
    <TodayRow key={item.id} item={item} {...options} {...rowActions(item)} onOpen={() => openItem(item)} />
  );
  const unreadAnnouncements = (announcements.data?.items ?? [])
    .filter((item) => !prefs.read.announcements.includes(item.id))
    .slice(0, 3);
  const proposed = preview
    ? preview.sessions.map((session) => {
        const at = new Date(session.startsAt);
        const from = at.getHours() * 60 + at.getMinutes();
        return {
          id: session.proposalId,
          from,
          to: from + session.durationMinutes,
          tone: planToneFor(planTaskIds(preview), session.taskId),
        };
      })
    : [];

  return (
    <>
      <Heading
        title={`${greetingFor(new Date().getHours())}${firstName ? `, ${firstName}` : ""}`}
        crumb="Today"
        subtitle={new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
        action={
          <Link href="/schedule" className="button" aria-label="Open schedule">
            <Icon name="calendar" />
            <span className="desktop-only">Open schedule</span>
          </Link>
        }
      />
      <SnapshotStatus {...today} refreshing={today.refreshing || announcements.refreshing || activities.refreshing}
        error={today.error ?? announcements.error ?? activities.error} refresh={() => { today.refresh(); }} />
      <CanvasRefreshStatus refresh={canvasRefresh} />
      <div className="today-v2">
        <div className="stack today-clock-column">
          <section className="surface stack today-clock-card">
            <DayRingClock
              orbReady={today.data !== null || !today.loading}
              date={date}
              timeline={today.data?.timeline ?? []}
              start={start}
              end={end}
              locked={locked}
              onToggleLock={() => {
                const next = !locked;
                setLocked(next);
                store.set(CLOCK_LOCK_KEY, next ? "1" : "0");
              }}
              onSegmentPress={(id) => {
                const item = today.data?.timeline.find((entry) => entry.id === id);
                if (item) openItem(item);
              }}
              onCommit={(from, to) => {
                change(from, to);
                void plan(from, to);
              }}
              disabled={busy || !plannerReady}
              proposed={proposed}
            />
            <p className="free-time-line">
              <span className="free-swatch" aria-hidden="true" />
              {formatFreeTime(end - start)} free · {clockLabel(start)} – {clockLabel(end)}
            </p>
            <p className="meta center">
              {locked
                ? "The clock is locked. Unlock it to change your free time."
                : "Drag an end to resize your free time, or the middle to move it. A plan preview follows."}
            </p>
            <details className="ring-settings">
              <summary>Adjust available time</summary>
              <div className="ring-controls">
                <label>
                  Available from
                  <input
                    aria-label="Available from"
                    type="range"
                    min="0"
                    max="1425"
                    step="15"
                    value={start}
                    aria-valuetext={clockLabel(start)}
                    disabled={locked}
                    onChange={(e) => change(Math.min(Number(e.target.value), end - 15), end)}
                  />
                  <span className="count-up">{clockLabel(start)}</span>
                </label>
                <label>
                  Available until
                  <input
                    aria-label="Available until"
                    type="range"
                    min="15"
                    max="1440"
                    step="15"
                    value={end}
                    aria-valuetext={clockLabel(end)}
                    disabled={locked}
                    onChange={(e) => change(start, Math.max(Number(e.target.value), start + 15))}
                  />
                  <span className="count-up">{clockLabel(end)}</span>
                </label>
              </div>
              <button disabled={busy || !plannerReady} onClick={() => void plan(start, end)}>
                Preview plan
              </button>
            </details>
            {!plannerReady && capabilities.data && (
              <p className="meta center">Planning is not available right now.</p>
            )}
          </section>
          {busy && !preview && (
            <section className="surface plan-loading" aria-label="Planning">
              <span className="plan-loading-bar short" />
              <span className="plan-loading-bar" />
            </section>
          )}
          {note && <Notice>{note}</Notice>}
          {preview && (
            <PlanPreview
              plan={preview}
              from={start}
              to={end}
              busy={busy}
              onApply={() => void apply()}
              onDiscard={() => {
                setPreview(null);
                setPreviewRequest(null);
              }}
            />
          )}
        </div>

        <div className="stack today-work-column">
          {today.error && !today.data ? (
            <div>
              <Notice error>{today.error}</Notice>
              <button className="button retry-button" onClick={today.refresh}>Try again</button>
            </div>
          ) : today.loading && !today.data ? (
            <BookLoader label="Loading your day" />
          ) : (
            <>
              <section className="stack">
                <h2>Up Next</h2>
                {arranged.pinned.map((item) => row(item, { dominant: true }))}
                {arranged.next
                  ? row(arranged.next, { dominant: true })
                  : arranged.pinned.length === 0 && (
                      <Link className="item-row" href="/tasks">
                        <span className="content-icon">
                          <Icon name="square-check-big" />
                        </span>
                        <span className="grow">
                          <strong>Room to focus</strong>
                          <span className="meta">Nothing scheduled next. Plan your time or open Tasks.</span>
                        </span>
                        <Icon name="chevron-right" />
                      </Link>
                    )}
              </section>
              {!!today.data?.overdue.length && (
                <section className="stack">
                  <h2>Overdue</h2>
                  <p className="meta">Handed in on paper? Mark it done — Canvas can&apos;t see paper submissions until they&apos;re graded.</p>
                  <div className="list-card schedule-list">
                    {today.data.overdue.map((item) => (
                      <div key={item.id} className="schedule-row overdue">
                        <span className="grow">
                          <span className="meta">{item.course?.code ?? item.course?.name ?? "Personal"}</span>
                          <strong>{item.title}</strong>
                          <span className="meta">Due {deadline(item.dueAt)}</span>
                        </span>
                        <button className="subtle" disabled={busy || activities.loading} onClick={() => void complete(item)} aria-label={`Mark ${item.title} done`}>
                          Done
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              <TodayTimeline
                items={todaySchedule([
                  ...(today.data?.timeline ?? []),
                  ...(today.data?.current ? [today.data.current] : []),
                  ...(today.data?.urgent ?? []).filter((item) => item.dueAt && localDate(new Date(item.dueAt)) === date),
                  ...upcoming.filter((item) => item.dueAt && localDate(new Date(item.dueAt)) === date),
                ])}
                onOpen={openItem}
              />
              {lastHidden && (
                <p className="row between hidden-undo" role="status">
                  <span className="meta">“{lastHidden.title}” is hidden for today.</span>
                  <button className="subtle" onClick={() => unhide(lastHidden)}>
                    Undo
                  </button>
                </p>
              )}
              <div className="today-split">
                <section className="stack">
                  <div className="row between">
                    <h2>Later Today</h2>
                    <Link href="/schedule">See schedule</Link>
                  </div>
                  {arranged.later.length ? (
                    <div className="list-card">{arranged.later.map((item) => row(item))}</div>
                  ) : (
                    <ClearDay action={<Link className="button subtle" href="/schedule">Plan your free time</Link>} />
                  )}
                </section>
                {arranged.dueSoon.length > 0 && (
                  <section className="stack">
                    <h2>Due soon</h2>
                    <div className="list-card">
                      {arranged.dueSoon.map((item) => row(item, { withDay: true }))}
                    </div>
                  </section>
                )}
              </div>
              <TodayCalendar items={activities.data?.items ?? []} />
              {arranged.hidden.length > 0 && (
                <section className="stack">
                  <button className="subtle hidden-toggle" onClick={() => setShowHidden((v) => !v)}>
                    {showHidden ? "Done" : `Show ${arranged.hidden.length} hidden today`}
                  </button>
                  {showHidden &&
                    arranged.hidden.map((item) => (
                      <div key={item.id} className="row hidden-row">
                        <span className="grow">{item.title}</span>
                        <button className="subtle" onClick={() => unhide(item)}>
                          Show
                        </button>
                      </div>
                    ))}
                </section>
              )}
            </>
          )}
          <section className="stack">
            <div className="row between">
              <h2>Announcements</h2>
              <Link href="/announcements">View all</Link>
            </div>
            {announcements.loading && !announcements.data ? (
              <p className="muted">Checking Canvas updates…</p>
            ) : announcements.error && !announcements.data ? (
              <p className="muted">Announcements are unavailable right now.</p>
            ) : unreadAnnouncements.length ? (
              <div className="list-card">
                {unreadAnnouncements.map((item) => (
                  <div key={item.id} className="announcement-row">
                    <CourseDot course={item.course} />
                    <Link href={`/announcements/${encodeURIComponent(item.id)}`} className="grow">
                      <strong>{item.title}</strong>
                      <span className="meta">
                        {[item.course.code ?? item.course.name, item.postedAt ? deadline(item.postedAt) : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </Link>
                    <button className="subtle" onClick={() => read(item.id, true)}>
                      Mark read
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">
                {announcements.data?.items.length ? "You're all caught up." : "No recent Canvas announcements."}
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function TodayTimeline({ items, onOpen }: { items: readonly TodayItem[]; onOpen: (item: TodayItem) => void }) {
  if (!items.length) return null;
  let nowShown = false;
  return (
    <section className="stack">
      <h2>Today&apos;s schedule</h2>
      <div className="list-card schedule-list">
        {items.map((item) => {
          const state = scheduleState(item);
          const showNow = !nowShown && (state === "current" || state === "upcoming");
          if (showNow) nowShown = true;
          const label =
            state === "overdue"
              ? "Overdue"
              : state === "current"
                ? "Now"
                : state === "completed"
                  ? "Done"
                  : item.startAt
                    ? timeLabel(item.startAt)
                    : item.dueAt
                      ? timeLabel(item.dueAt)
                      : "Anytime";
          return (
            <div key={item.id}>
              {showNow && <div className="now-rule">Now</div>}
              <button
                className={`schedule-row ${state}`}
                aria-label={`${label}, ${item.course?.code ?? item.course?.name ?? "Personal"}, ${item.title}`}
                onClick={() => onOpen(item)}
              >
                <span className="schedule-time">{label}</span>
                {item.course && state === "upcoming" ? <CourseDot course={item.course} /> : <span className={`state-dot ${state}`} />}
                <span className="grow">
                  <span className="meta">{item.course?.code ?? item.course?.name ?? "Personal"}</span>
                  <strong>{item.title}</strong>
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TodayRow({
  item,
  dominant = false,
  withDay = false,
  pinned,
  onPin,
  onHide,
  onOpen,
}: {
  item: TodayItem;
  dominant?: boolean;
  /** Deadlines beyond today name their day. */
  withDay?: boolean;
  pinned: boolean;
  onPin: () => void;
  onHide: () => void;
  onOpen: () => void;
}) {
  const detail = withDay && item.dueAt ? deadline(item.dueAt) : todayItemDetail(item);
  const urgency = urgencyOf(item);
  // A planner session is time set aside for an activity: show it as that work.
  const session = item.kind === "study_session";
  const courseName = item.course?.code ?? item.course?.name ?? (session ? null : "Personal");
  const course = session ? [courseName, "Work session"].filter(Boolean).join(" · ") : courseName!;
  return (
    <div className={`today-row${dominant ? " dominant item-row" : ""}`}>
      <button className="today-row-open" onClick={onOpen} aria-label={`${pinned ? "Pinned" : dominant ? "Open next item" : "Open"}: ${item.title}`}>
        {session ? (
          <span className="content-icon">
            <Icon name="clock" />
          </span>
        ) : (
          <ContentIcon kind="task" />
        )}
        <span className="grow">
          <span className="meta">
            {pinned && <span className="pinned-label">Pinned · </span>}
            {course}
          </span>
          <strong>{item.title}</strong>
          {detail && (
            <span className={`meta urgency ${urgencyClass(urgency)}`}>{withDay ? `Due ${detail}` : detail}</span>
          )}
        </span>
      </button>
      <span className="row-actions">
        <button className="icon-button subtle" aria-label={pinned ? `Unpin ${item.title}` : `Pin ${item.title}`} aria-pressed={pinned} onClick={onPin} title={pinned ? "Unpin" : "Pin to Up Next"}>
          <Icon name="pin" />
        </button>
        <button className="icon-button subtle" aria-label={`Hide ${item.title} for today`} onClick={onHide} title="Hide for today">
          <Icon name="eye-off" />
        </button>
      </span>
    </div>
  );
}

/** Only the date/time line carries urgency, so the list stays calm. */
function urgencyClass(urgency: Urgency) {
  return urgency === "overdue" || urgency === "today"
    ? "danger"
    : urgency === "tomorrow"
      ? "orange"
      : urgency === "week"
        ? "amber"
        : "";
}
