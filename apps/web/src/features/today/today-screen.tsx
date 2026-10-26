"use client";
import "./planner.css";
import { defaultPlanningDraft, planningItemKey } from "@stay-focused/shared";
import { useTodayPlan } from "./use-today-plan";
import { freeTimeDuration } from "@stay-focused/shared";
import { useQuietPlanner } from "../day-clock/use-quiet-planner";

import { useTodayClockWindow } from "../day-clock/use-today-clock-window";
import { SnapshotStatus } from "../../components/snapshot-status";
import { CanvasRefreshStatus, useCanvasRefresh } from "../../lib/canvas-refresh";
import type {
  TodayItem,
  TodayScreenData,
} from "@stay-focused/shared";
import {
  proposalTargetKey,
  type StudySessionView, type PlanningCandidates, type DeterministicStudyPlan,
} from "@stay-focused/shared/task-planning";
import { TodayWelcome } from "./today-welcome";
import { TodayPlanner } from "./today-planner";
import { PlanButton } from "./plan-button";
import { todayPlanningMemory } from './planning-session';
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
import {
  clockLabel,
  formatFreeTime,
  freeTimeAround,
  planTaskIds,
  planToneFor,
  timelineSegments,
} from "../day-clock/timeline";
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
    router = useRouter();
  const clockWindow = useTodayClockWindow();
  const date = clockWindow.date;
  const { adjusting } = clockWindow;
  const today = useResource<TodayScreenData>(
    clockWindow.path,
    60000,
    "data", false, undefined, adjusting,
  );

  // New builds carry a device-local selection; the preview queue always drops older work.
  const identity = `${session?.user.id ?? ""}:${date}`;
  const [, renderBuiltChoice] = useState(0);
  const remembered = todayPlanningMemory.read(identity);
  const activePlan = remembered;
  const planMode = activePlan?.mode ?? "reviewers_tasks";
  const { preview, previewRequest, previewing, previewNote, queuePreview, clearPreview } = useQuietPlanner(
    identity, request => api<DeterministicStudyPlan>("/api/experience/planner/preview", { method: "POST", body: request }),
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

  const [locked, setLocked] = useState(false);
  useEffect(() => { setLocked(store.get(CLOCK_LOCK_KEY) === "1"); }, []);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const busyRef = useRef(false);
  const plannerReady = available(capabilities.data?.planner);

  const planner = useTodayPlan({ identity, ownerId: session?.user.id ?? "", date, clock: clockWindow,
    around: freeTimeAround(timelineSegments((today.data?.timeline ?? []).filter(item => item.status === "planned"), date),
      (Date.now() - new Date(date + "T00:00:00").getTime()) / 60000),
    timeline: today.data?.timeline ?? [], timelineReady: !!today.data, enabled: plannerReady, busy, previewing, preview,
    mode: planMode, selection: activePlan?.selection,
    load: request => api<PlanningCandidates>("/api/experience/planner/candidates", { method: "POST", body: request }),
    remember: (mode, selection, candidates) => {
      const draft = todayPlanningMemory.read(identity)?.draft ?? defaultPlanningDraft(candidates);
      todayPlanningMemory.build(identity, { mode, selection, draft: { ...draft, mode, order: selection.order, courses: selection.courseIds ? 'select' : 'all', courseIds: selection.courseIds ?? candidates.courses.map(course => course.id),
        ...(selection.items ? { itemOrder: selection.items.map(planningItemKey), checked: selection.items.map(planningItemKey) } : {}) } });
      renderBuiltChoice(revision => revision + 1);
    },
    queue: queuePreview, clear: clearPreview });
  const { start, end, change } = planner;
  async function apply() {
    if (!previewRequest || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await api<{ sessions: readonly StudySessionView[] }>("/api/experience/planner/replan", { method: "POST", body: previewRequest });
      await planner.applied(result?.sessions);
      clearPreview();
      setNote("Saved. These blocks are on your Schedule.");
      clockWindow.reconcile();
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
      clearPreview();
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
    // A reviewer block opens its saved reviewer; it is never matched to a task.
    if (item.reviewer) { router.push(`/library/${encodeURIComponent(item.reviewer.id)}`); return; }
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
      next: today.data?.next?.kind === "study_session" ? null : today.data?.next ?? null,
      later: (today.data?.later ?? []).filter(item => item.kind !== "study_session"),
      dueSoon: upcoming.slice(0, 3),
      others: [...(today.data?.timeline ?? []).filter(item => item.kind !== "study_session"), ...upcoming],
    },
    prefs.pinned.today,
    prefs.hidden.today,
    date,
  );
  const [adjustPlan, setAdjustPlan] = useState(false);
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
        const from = (at.getTime() - new Date(`${date}T00:00:00`).getTime()) / 60000;
        return {
          id: session.proposalId,
          from,
          to: from + session.durationMinutes,
          tone: planToneFor(planTaskIds(preview), proposalTargetKey(session)),
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
              onCommit={change}
              onAdjustingChange={(active) => { clockWindow.setAdjusting(active); if (active) clearPreview(); }}
              disabled={busy || !plannerReady}
              proposed={proposed}
            />
            <PlanButton disabled={busy || !plannerReady} onPress={() => setAdjustPlan(value => !value)} />
            <p className="free-time-line">
              <span className="free-swatch" aria-hidden="true" />
              {formatFreeTime(freeTimeDuration(start, end))} free · {clockLabel(start)} – {clockLabel(end)}
            </p>
            <p className="meta center">
              {locked
                ? "The clock is locked. Use Clock options to type your free time."
                : "Drag an end to resize your free time, or the middle to move it. A plan preview follows."}
            </p>
            {!plannerReady && capabilities.data && (
              <p className="meta center">Planning is not available right now.</p>
            )}
          </section>
          <TodayWelcome source={planner.windowSource} dismissed={planner.welcomeDismissed} ready={planner.ready} onDismiss={planner.dismissWelcome} />
        </div>

        <div className="stack today-work-column">
          <TodayPlanner key={identity} candidates={planner.candidates} plan={preview} timeline={today.data?.timeline ?? []}
            active={activePlan} overrides={planner.overrides} start={start} end={end} busy={busy || previewing}
            adjust={adjustPlan} onToggleAdjust={() => setAdjustPlan(value => !value)}
            onSkip={planner.skip} onRemove={planner.remove} onMoveUp={planner.moveUp}
            onItemCheck={(key, checked) => checked ? planner.putBack(key) : planner.remove(key)}
            onBuild={choice => { todayPlanningMemory.build(identity, choice); renderBuiltChoice(revision => revision + 1); setNote(null); planner.propose(choice.mode, choice.selection); }}
            onApply={() => void apply()} previous={planner.previousPlan} onRestore={planner.restorePrevious}
            onOpen={block => { if (block.savedItem) openItem(block.savedItem); else if (block.kind === "reviewer") router.push(`/library/${encodeURIComponent(block.id)}`); else router.push(`/tasks/${encodeURIComponent(activities.data?.items.find(item => item.taskId === block.id || item.id === block.id)?.id ?? block.id)}`); }} />
          {(note || previewNote || planner.candidateNote) && <Notice>{note || previewNote || planner.candidateNote}</Notice>}
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
                <h2>Tasks to do</h2>
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
                ]).filter(item => item.kind !== "study_session")}
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
                    <h2>Later tasks</h2>
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
                aria-label={`${label}, ${item.course?.code ?? item.course?.name ?? "Personal"}, ${item.reviewer ? "Review: " : ""}${item.title}`}
                onClick={() => onOpen(item)}
              >
                <span className="schedule-time">{label}</span>
                {item.course && state === "upcoming" ? <CourseDot course={item.course} /> : <span className={`state-dot ${state}`} />}
                <span className="grow">
                  <span className="meta">{item.course?.code ?? item.course?.name ?? "Personal"}</span>
                  <strong>{item.reviewer && <Icon name="book-open" />}{item.title}</strong>
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
  const course = session ? [courseName, item.reviewer ? "Review session" : "Work session"].filter(Boolean).join(" · ") : courseName!;
  return (
    <div className={`today-row${dominant ? " dominant item-row" : ""}`}>
      <button className="today-row-open" onClick={onOpen} aria-label={`${pinned ? "Pinned" : dominant ? "Open next item" : "Open"}: ${item.title}`}>
        {item.reviewer ? (
          <ContentIcon kind="reviewer" />
        ) : session ? (
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
      ? ""
      : urgency === "week"
        ? ""
        : "";
}
