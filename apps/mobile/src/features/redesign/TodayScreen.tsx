import type {
  ActivitySummary,
  ExperienceCapabilities,
  TodayItem,
  TodayOverview,
  StudentAnnouncementList,
} from "@stay-focused/shared";
import type { DeterministicStudyPlan } from "@stay-focused/shared/task-planning";
import { router } from "expo-router";
import { EyeOff, Pin, PinOff } from "lucide-react-native";
import { useIsFocused } from "@react-navigation/native";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";

import { haptic } from "../../design/haptics";
import { courseAccent, courseIdentity } from "../../design/courseIdentity";

import { Action, Copy, Notice, Page, RowLink, Surface, ContentIcon, SkeletonBlock, SkeletonCards } from "../../design/primitives";
import { SwipeRow, animateNextLayout, swipeAccessibility, type SwipeAction } from "../../design/SwipeRow";
import { useTheme } from "../../design/theme";
import { sessionStore } from "../../auth/sessionStore";
import { useAuth } from "../../auth";
import { experienceRequest } from "../../services/experienceApi";
import { dayOrbTouch } from "./DayOrb";
import { DayRingClock } from "./DayRingClock";

import { PlanPreview, planTaskIds, planToneFor } from "./PlanPreview";
import { TodayCalendar } from "./TodayCalendar";
import {
  activityFor,
  arrangeToday,
  available,
  deadline,
  freeTimeAround,
  greetingFor,
  localDate,
  scheduleState,
  todaySchedule,
  timeLabel,
  planningRequest,
  timelineSegments,
  todayItemDetail,
  urgencyOf,
  type Urgency,
} from "./presentation";
import { useExperience, useExperienceClient } from "./useExperience";
import { AnnouncementItem, useArrangedAnnouncements } from "../announcements/AnnouncementsScreen";
import { todayHideKey } from "./listPreferences";
import { useListPreferences } from "./useListPreferences";
import { useCanvasSync } from "../sync/CanvasSyncProvider";

/** Opening Today resyncs Canvas and refreshes the day, at most every three minutes. */
const RESYNC_MS = 3 * 60_000;
let lastResync = 0;
const CLOCK_LOCK_KEY = "sf.today.clock-locked";

function activitiesPath() {
  return `/api/experience/activities?utcOffsetMinutes=${-new Date().getTimezoneOffset()}`;
}

/** Any finger on Today pauses the orb, so touches are handled without waiting on a frame. */
const orbTouchPause = {
  onTouchStart: () => { dayOrbTouch.active = true; },
  onTouchEnd: () => { dayOrbTouch.active = false; },
  onTouchCancel: () => { dayOrbTouch.active = false; },
};

export function TodayScreen() {
  const { session } = useAuth();
  const displayName = [session?.user.userMetadata?.full_name, session?.user.userMetadata?.name].find(value => typeof value === "string" && value.trim()) as string | undefined;
  const firstName = displayName?.trim().split(/\s+/)[0];
  const date = localDate();
  const today = useExperience<TodayOverview>(
    `/api/today?date=${date}&utcOffsetMinutes=${-new Date().getTimezoneOffset()}`,
    60000,
  );
  const capabilities = useExperience<ExperienceCapabilities>(
    "/api/experience/capabilities",
  );
  const announcements = useExperience<StudentAnnouncementList>(
    "/api/experience/announcements?limit=20",
    60000,
  );
  const activities = useExperience<{ items: ActivitySummary[] }>(activitiesPath());
  const focused = useIsFocused();
  const client = useExperienceClient();
  const { sync } = useCanvasSync();
  // No pull-to-refresh on Today: coming back to it is the refresh.
  const refreshers = useRef({ today, announcements, activities, sync });
  refreshers.current = { today, announcements, activities, sync };
  useEffect(() => {
    if (!focused) return;
    const now = Date.now();
    if (now - lastResync < RESYNC_MS) return;
    const first = lastResync === 0;
    lastResync = now;
    const current = refreshers.current;
    void current.sync();
    // The first visit already loads fresh data on mount.
    if (!first) {
      current.today.refresh();
      current.announcements.refresh();
      current.activities.refresh();
    }
  }, [focused]);
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    let live = true;
    void Promise.resolve(sessionStore.getItem(CLOCK_LOCK_KEY)).then((value) => {
      if (live && value === "1") setLocked(true);
    }).catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const toggleLock = () => {
    const next = !locked;
    setLocked(next);
    void Promise.resolve(sessionStore.setItem(CLOCK_LOCK_KEY, next ? "1" : "0")).catch(() => {});
  };
  const openItem = (item: TodayItem) => {
    const activity = activityFor(item, activities.data?.items ?? []);
    if (activity) router.push({ pathname: "/activity", params: { id: activity.id } });
    else if (item.deepLinkTarget.surface === "activity") router.push({ pathname: "/activity", params: { id: item.deepLinkTarget.id } });
    else router.push({ pathname: "/study-session", params: { id: item.deepLinkTarget.id, date: localDate() } });
  };
  const { colors, mode, reducedMotion } = useTheme();
  const { prefs, pin, hide } = useListPreferences();
  // Canvas deadlines in the coming week that are not already scheduled today.
  const upcoming = (today.data?.upcomingDeadlines ?? [])
    .filter((item) => item.dueAt && Date.parse(item.dueAt) - Date.now() < 7 * 86_400_000);
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
  const announcementList = useArrangedAnnouncements(announcements.data?.items ?? []);
  // Today shows only what hasn't been read yet.
  const shownAnnouncements = announcementList.unread.slice(0, 3);
  const [showHidden, setShowHidden] = useState(false);
  const [lastHidden, setLastHidden] = useState<TodayItem | null>(null);
  const cardFill = mode === "dark" ? colors.surfacePrimary : colors.surfaceElevated;
  const glide = (update: () => void) => {
    animateNextLayout(reducedMotion);
    update();
  };
  // Swipe right pins to Up Next; swipe left hides from today's plan only.
  const rowActions = (item: TodayItem) => {
    const pinned = prefs.pinned.today.includes(item.id);
    const leading: SwipeAction[] = [{
      key: "pin",
      label: pinned ? "Unpin" : "Pin",
      icon: pinned ? PinOff : Pin,
      tone: "accent",
      onPress: () => glide(() => pin("today", item.id, !pinned)),
    }];
    const trailing: SwipeAction[] = [{
      key: "hide",
      label: "Hide",
      icon: EyeOff,
      tone: "neutral",
      exits: true,
      onPress: () => {
        glide(() => hide("today", todayHideKey(date, item.id), true));
        if (pinned) pin("today", item.id, false);
        setLastHidden(item);
      },
    }];
    return { leading, trailing, pinned };
  };
  const unhide = (item: TodayItem) => {
    glide(() => hide("today", todayHideKey(date, item.id), false));
    if (lastHidden?.id === item.id) setLastHidden(null);
  };
  const swipeItem = (item: TodayItem, options: { dominant?: boolean; withDay?: boolean; fill: string }) => {
    const swipe = rowActions(item);
    return (
      <SwipeRow key={item.id} fullSwipe leading={swipe.leading} trailing={swipe.trailing} background={options.fill}>
        <TodayRow item={item} dominant={options.dominant} withDay={options.withDay} pinned={swipe.pinned} swipeActions={[...swipe.leading, ...swipe.trailing]} onOpen={() => openItem(item)} />
      </SwipeRow>
    );
  };
  // Holding the ring must never scroll the page.
  const [ringActive, setRingActive] = useState(false);
  const requestBusy = useRef(false);
  const [start, setStart] = useState(() =>
    Math.min(
      1410,
      Math.ceil((new Date().getHours() * 60 + new Date().getMinutes()) / 15) *
        15,
    ),
  );
  const [end, setEnd] = useState(() => Math.min(1440, start + 120));
  const [preview, setPreview] = useState<DeterministicStudyPlan | null>(null);
  const [busy, setBusy] = useState(false),
    [note, setNote] = useState<string | null>(null),
    [expanded, setExpanded] = useState(false);
  const [previewRequest, setPreviewRequest] = useState<ReturnType<
    typeof planningRequest
  > | null>(null);
  // The free time is remembered per day, so the planned blocks it holds and
  // the window you set stay together across launches.
  const windowKey = `sf.today.free-time.${date}`;
  const [windowKnown, setWindowKnown] = useState(false);
  useEffect(() => {
    let live = true;
    void Promise.resolve(sessionStore.getItem(windowKey)).then((raw) => {
      if (!live) return;
      try {
        const saved = raw ? (JSON.parse(raw) as { start?: unknown; end?: unknown }) : null;
        if (saved && typeof saved.start === "number" && typeof saved.end === "number" && saved.end > saved.start) {
          setStart(saved.start);
          setEnd(saved.end);
          setWindowKnown(true);
          return;
        }
      } catch {
        // Unreadable: fall back to the day's planned blocks below.
      }
      setWindowKnown(false);
    }).catch(() => {});
    return () => {
      live = false;
    };
  }, [windowKey]);
  // Nothing saved yet: wrap the free time around today's planned blocks.
  const planned = today.data?.timeline;
  useEffect(() => {
    if (windowKnown || !planned) return;
    const now = new Date();
    const around = freeTimeAround(timelineSegments(planned.filter((item) => item.status === "planned"), date), now.getHours() * 60 + now.getMinutes());
    if (around) {
      setStart(around.start);
      setEnd(around.end);
      setWindowKnown(true);
    }
  }, [date, planned, windowKnown]);
  const change = (from: number, to: number) => {
    setStart(from);
    setEnd(to);
    setPreview(null);
    setPreviewRequest(null);
    setWindowKnown(true);
    void Promise.resolve(sessionStore.setItem(windowKey, JSON.stringify({ start: from, end: to }))).catch(() => {});
  };
  async function plan(from: number, to: number) {
    if (requestBusy.current || !available(capabilities.data?.planner)) return;
    requestBusy.current = true;
    setBusy(true);
    setNote(null);
    setPreview(null);
    setPreviewRequest(null);
    try {
      const request = planningRequest(date, from, to);
      const result = await experienceRequest<DeterministicStudyPlan>(
        client,
        "/api/experience/planner/preview",
        { method: "POST", body: request },
      );
      setPreview(result);
      setPreviewRequest(request);
    } catch (error) {
      setNote(
        error instanceof Error ? error.message : "Could not preview your plan.",
      );
    } finally {
      requestBusy.current = false;
      setBusy(false);
    }
  }
  async function apply() {
    if (!previewRequest || requestBusy.current) return;
    requestBusy.current = true;
    setBusy(true);
    try {
      await experienceRequest(client, "/api/experience/planner/replan", {
        method: "POST",
        body: previewRequest,
      });
      setPreview(null);
      setPreviewRequest(null);
      haptic.success();
      today.refresh();
    } catch (error) {
      setNote(
        error instanceof Error
          ? error.message
          : "Could not update your schedule.",
      );
    } finally {
      requestBusy.current = false;
      setBusy(false);
    }
  }
  return (
    <Page
      title={`${greetingFor(new Date().getHours())}${firstName ? `, ${firstName}` : ""}`}
      subtitle={new Date().toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
      })}
      scrollEnabled={!ringActive}
      scrollTouch={orbTouchPause}
    >
      <DayRingClock
        locked={locked}
        onToggleLock={toggleLock}
        onSegmentPress={(id) => {
          const item = today.data?.timeline.find((entry) => entry.id === id);
          if (item) openItem(item);
        }}
        onAdjustingChange={setRingActive}
        date={date}
        timeline={today.data?.timeline ?? []}
        start={start}
        end={end}
        onChange={change}
        onCommit={(from, to) => {
          change(from, to);
          void plan(from, to);
        }}
        disabled={busy || !available(capabilities.data?.planner)}
        proposed={
          preview
            ? preview.sessions.map((session) => {
                const at = new Date(session.startsAt);
                const from = at.getHours() * 60 + at.getMinutes();
                return { id: session.proposalId, from, to: from + session.durationMinutes, color: colors[planToneFor(planTaskIds(preview), session.taskId)] };
              })
            : []
        }
      />
      {busy && !preview ? <PlanPreviewLoading /> : null}
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
      {today.error ? (
        <Notice>{today.error}</Notice>
      ) : today.loading ? (
        <SkeletonCards rows={3} label="Loading your day" />
      ) : (
        <>
          <View style={{ gap: 8 }}>
          <Copy size="h2">Up Next</Copy>
          {arranged.pinned.map((item) => (
            <SwipeCard key={item.id} fill={colors.backgroundPrimary}>
              {swipeItem(item, { dominant: true, fill: colors.backgroundPrimary })}
            </SwipeCard>
          ))}
          {arranged.next ? (
            <SwipeCard fill={colors.backgroundPrimary}>
              {swipeItem(arranged.next, { dominant: true, fill: colors.backgroundPrimary })}
            </SwipeCard>
          ) : arranged.pinned.length === 0 ? (
            <Surface>
              <RowLink inset icon={<ContentIcon kind="task" />} label="Open Tasks" onPress={() => router.navigate("/work")}>
                <Copy size="h3">Room to focus</Copy>
                <Copy muted size="bodySmall">Nothing scheduled next. Plan your time or open Tasks.</Copy>
              </RowLink>
            </Surface>
          ) : null}
          </View>
          <TodayTimeline items={todaySchedule([...(today.data?.overdue ?? []), ...(today.data?.timeline ?? []), ...(today.data?.current ? [today.data.current] : []), ...upcoming.filter(item => item.dueAt && localDate(new Date(item.dueAt)) === date)])} onOpen={openItem} />
          {lastHidden ? (
            <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Copy muted size="caption" style={{ flex: 1 }} numberOfLines={1}>{`“${lastHidden.title}” is hidden for today.`}</Copy>
              <Action secondary label={`Undo hiding ${lastHidden.title}`} onPress={() => unhide(lastHidden)}>Undo</Action>
            </View>
          ) : null}
          <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Copy size="h2">Later Today</Copy>
          <Action secondary onPress={() => setExpanded(!expanded)}>{expanded ? "Close schedule" : "See schedule"}</Action>
          </View>
          {arranged.later.length ? (
            arranged.later.map((item) => swipeItem(item, { fill: colors.backgroundPrimary }))
          ) : (
            <Copy muted size="bodySmall">Your day is clear. Make room for what matters.</Copy>
          )}
          </View>
          {arranged.dueSoon.length > 0 && (
            <View style={{ gap: 8 }}>
              <Copy size="h2">Due soon</Copy>
              <Surface>
                {arranged.dueSoon.map((item) => swipeItem(item, { withDay: true, fill: cardFill }))}
              </Surface>
            </View>
          )}
          <TodayCalendar
            items={activities.data?.items ?? []}
            onOpen={(item) => router.push({ pathname: "/activity", params: { id: item.id } })}
          />
          {arranged.hidden.length > 0 ? (
            <View style={{ gap: 8 }}>
              <Action secondary onPress={() => glide(() => setShowHidden((value) => !value))}>
                {showHidden ? "Done" : `Show ${arranged.hidden.length} hidden today`}
              </Action>
              {showHidden
                ? arranged.hidden.map((item) => (
                    <View key={item.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, opacity: 0.75 }}>
                      <View style={{ flex: 1 }}><TodayRow item={item} onOpen={() => openItem(item)} /></View>
                      <Action secondary label={`Show ${item.title} again`} onPress={() => unhide(item)}>Show</Action>
                    </View>
                  ))
                : null}
            </View>
          ) : null}
        </>
      )}
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Copy size="h2">Announcements</Copy>
          <Action secondary onPress={() => router.push("/announcements")}>View all</Action>
        </View>
        {announcements.loading ? (
          <SkeletonCards rows={2} label="Checking Canvas updates" />
        ) : announcements.error ? (
          <Surface>
            <RowLink inset label="Open announcements" onPress={() => router.push("/announcements")}>
              <Copy size="h3">Canvas updates</Copy>
              <Copy muted size="bodySmall">Announcements are unavailable right now.</Copy>
            </RowLink>
          </Surface>
        ) : shownAnnouncements.length ? (
          <Surface>
            {shownAnnouncements.map(item => (
              <AnnouncementItem
                key={item.id}
                item={item}
                background={cardFill}
                read={false}
                leaveWhenRead
                pinned={announcementList.isPinned(item.id)}
                onPin={(pinned) => announcementList.setPinned(item.id, pinned)}
                onRead={(read) => announcementList.setRead(item.id, read)}
              />
            ))}
          </Surface>
        ) : (
          <Copy muted size="bodySmall">{announcements.data?.items.length ? "You're all caught up." : "No recent Canvas announcements."}</Copy>
        )}
      </View>
      {expanded && (
        <Surface>
          <Copy size="h2">Your available time</Copy>
          <Copy muted>
            Choose when you can study. Preview the plan before updating your
            schedule.
          </Copy>
          <Copy>
            {Math.floor(start / 60)}:{String(start % 60).padStart(2, "0")} –{" "}
            {end === 1440
              ? "24:00"
              : `${Math.floor(end / 60)}:${String(end % 60).padStart(2, "0")}`}
          </Copy>
          <View style={{ gap: 8 }}>
            <Action
              secondary
              disabled={busy || start < 15}
              onPress={() => change(start - 15, end)}
            >
              Start 15 minutes earlier
            </Action>
            <Action
              secondary
              disabled={busy || start + 15 >= end}
              onPress={() => change(start + 15, end)}
            >
              Start 15 minutes later
            </Action>
            <Action
              secondary
              disabled={busy || end - 15 <= start}
              onPress={() => change(start, end - 15)}
            >
              End 15 minutes earlier
            </Action>
            <Action
              secondary
              disabled={busy || end >= 1440}
              onPress={() => change(start, end + 15)}
            >
              End 15 minutes later
            </Action>
          </View>
          <Action
            disabled={busy || !available(capabilities.data?.planner)}
            onPress={() => void plan(start, end)}
          >
            Preview schedule
          </Action>
          {!available(capabilities.data?.planner) && (
            <Notice>Planning is not available right now.</Notice>
          )}
          {today.data?.timeline.map((item) => (
            <TodayRow key={item.id} item={item} onOpen={() => openItem(item)} />
          ))}
        </Surface>
      )}
    </Page>
  );
}
function TodayTimeline({ items, onOpen }: { items: readonly TodayItem[]; onOpen: (item: TodayItem) => void }) {
  const { colors, mode } = useTheme();
  if (!items.length) return null;
  let nowShown = false;
  return <View style={{ gap: 8 }}>
    <Copy size="h2">Today&apos;s schedule</Copy>
    <Surface style={{ gap: 0 }}>
      {items.map((item, index) => {
        const state = scheduleState(item);
        const showNow = !nowShown && (state === "current" || state === "upcoming");
        if (showNow) nowShown = true;
        const tint = state === "overdue" ? colors.danger : state === "current" ? colors.success : state === "completed" ? colors.textMuted : item.course ? courseAccent(courseIdentity(item.course), mode).fg : colors.accent;
        const label = state === "overdue" ? "Overdue" : state === "current" ? "Now" : state === "completed" ? "Done" : item.startAt ? timeLabel(item.startAt) : item.dueAt ? timeLabel(item.dueAt) : "Anytime";
        return <View key={item.id}>
          {showNow ? <Copy size="caption" color={colors.success} style={{ textAlign: "center", fontWeight: "700", paddingVertical: 8 }}>──── NOW ────</Copy> : null}
          <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${item.course?.code ?? item.course?.name ?? "Personal"}, ${item.title}`} onPress={() => onOpen(item)} style={({ pressed }) => ({ flexDirection: "row", minHeight: 64, gap: 10, alignItems: "center", paddingVertical: 9, opacity: pressed ? 0.6 : state === "completed" ? 0.6 : 1, borderBottomWidth: index === items.length - 1 ? 0 : 1, borderColor: colors.separator })}>
            <Copy size="caption" color={tint} style={{ width: 70, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{label}</Copy>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tint }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Copy muted size="caption" numberOfLines={1}>{item.course?.code ?? item.course?.name ?? "Personal"}</Copy>
              <Copy size="bodySmall" numberOfLines={2} style={{ fontWeight: state === "current" ? "700" : "500" }}>{item.title}</Copy>
            </View>
          </Pressable>
        </View>;
      })}
    </Surface>
  </View>;
}
/** A card that slides as one piece; the page color sits under it while it moves. */
function SwipeCard({ children, fill }: { children: ReactNode; fill: string }) {
  return <View style={{ borderRadius: 16, backgroundColor: fill }}>{children}</View>;
}

function TodayRow({
  item,
  dominant = false,
  withDay = false,
  pinned = false,
  swipeActions = [],
  onOpen,
}: {
  onOpen: () => void;
  item: TodayItem;
  dominant?: boolean;
  /** Deadlines beyond today name their day. */
  withDay?: boolean;
  pinned?: boolean;
  swipeActions?: readonly SwipeAction[];
}) {
  const { colors } = useTheme();
  const detail = withDay && item.dueAt ? deadline(item.dueAt) : todayItemDetail(item);
  const urgency = urgencyOf(item);
  // A planner session is time set aside for an activity: show it as that
  // activity's work, never as a separate "study" item.
  const session = item.kind === "study_session";
  const courseName = item.course?.code ?? item.course?.name ?? (session ? null : "Personal");
  const course = session ? [courseName, "Work session"].filter(Boolean).join(" · ") : courseName!;
  const row = (
    <RowLink
      inset={dominant}
      icon={<ContentIcon kind="task" small={!dominant} />}
      label={`${pinned ? "Pinned" : dominant ? "Open next item" : "Open"}: ${item.title}`}
      {...(swipeActions.length ? swipeAccessibility(swipeActions) : {})}
      onPress={onOpen}
    >
      {pinned ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Pin size={11} color={colors.accent} strokeWidth={2} style={{ transform: [{ rotate: "35deg" }] }} />
          <Copy size="caption" color={colors.accent} style={{ fontWeight: "600" }}>Pinned</Copy>
          <Copy muted size="caption">{`· ${course}`}</Copy>
        </View>
      ) : (
        <Copy muted size="caption">{course}</Copy>
      )}
      <Copy size="h3">{item.title}</Copy>
      {detail ? (
        <Copy size="caption" color={urgencyColor(colors, urgency)} style={urgency === "overdue" || urgency === "today" ? { fontWeight: "600" } : undefined}>
          {withDay ? `Due ${detail}` : detail}
        </Copy>
      ) : null}
    </RowLink>
  );
  // Up Next items are cards; the card moves with the swipe.
  if (!dominant) return row;
  return <Surface>{row}</Surface>;
}

/** Placeholder while the planner answers: the preview's shape, shimmering. */
function PlanPreviewLoading() {
  return (
    <Surface style={{ gap: 12 }}>
      <SkeletonBlock width="36%" height={14} />
      <SkeletonBlock width="100%" height={58} radius={12} />
    </Surface>
  );
}

/** Only the date/time line carries urgency, so the list stays calm. */
function urgencyColor(colors: ReturnType<typeof useTheme>["colors"], urgency: Urgency) {
  switch (urgency) {
    case "overdue":
    case "today":
      return colors.danger;
    case "tomorrow":
      return colors.orange;
    case "week":
      return colors.amber;
    default:
      return colors.textSecondary;
  }
}
