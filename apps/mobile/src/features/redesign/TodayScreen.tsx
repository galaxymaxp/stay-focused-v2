import { useTodayPlan } from "./useTodayPlan";
import { useQuietPlanner } from "./useQuietPlanner";
import { useTodayClockWindow } from "./useTodayClockWindow";
import { AppUpdateBanner } from './AppUpdateNotice';
import { SnapshotStatus } from "./SnapshotStatus";
import type {
  TodayItem,
  TodayScreenData,
} from "@stay-focused/shared";
import { proposalTargetKey, type PlanningCandidates, type DeterministicStudyPlan } from "@stay-focused/shared/task-planning";
import { PlanningControl } from "./PlanningSheet";
import { todayPlanningMemory } from './planningSession';
import { router } from "expo-router";
import { EyeOff, Pin, PinOff } from "lucide-react-native";
import { useIsFocused } from "expo-router/react-navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, View, type ScrollView } from "react-native";

import { haptic } from "../../design/haptics";
import { ClearDay } from "../../design/ClearDay";
import { courseAccent, courseIdentity } from "../../design/courseIdentity";

import { Action, Copy, Notice, Page, RowLink, Surface, ContentIcon, SkeletonBlock, SkeletonCards } from "../../design/primitives";
import { SwipeRow, animateNextLayout, swipeAccessibility, type SwipeAction } from "../../design/SwipeRow";
import { useTheme } from "../../design/theme";
import { spacing } from "../../design/tokens";
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

/** Opening Today refreshes its persisted read models at most every three minutes. */
const RESYNC_MS = 3 * 60_000;
let lastResync = 0;
const CLOCK_LOCK_KEY = "sf.today.clock-locked";

/** Any finger on Today pauses the orb, so touches are handled without waiting on a frame. */
const orbTouchPause = {
  onTouchStart: () => { dayOrbTouch.active = true; },
  onTouchEnd: () => { dayOrbTouch.active = false; },
  onTouchCancel: () => { dayOrbTouch.active = false; },
};

export function TodayScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const { session } = useAuth();
  const displayName = [session?.user.userMetadata?.full_name, session?.user.userMetadata?.name].find(value => typeof value === "string" && value.trim()) as string | undefined;
  const firstName = displayName?.trim().split(/\s+/)[0];
  const clockWindow = useTodayClockWindow();
  const date = clockWindow.date;
  const { adjusting } = clockWindow;
  const today = useExperience<TodayScreenData>(
    clockWindow.path,
    60000,
    undefined, undefined, Infinity, adjusting,
  );
  const capabilities = { ...today, data: today.data?.capabilities ?? null };
  const announcements = { ...today, data: today.data?.announcements ?? null };
  const activities = { ...today, data: today.data?.activities ?? null };
  const focused = useIsFocused();
  const client = useExperienceClient();
  const identity = `${session?.user.id ?? ""}:${date}`;
  const [, renderBuiltChoice] = useState(0);
  const remembered = todayPlanningMemory.read(identity);
  const activePlan = remembered;
  const planMode = activePlan?.mode ?? "reviewers_tasks";
  const { preview, previewRequest, previewing, previewNote, queuePreview, clearPreview } = useQuietPlanner(
    identity, request => experienceRequest<DeterministicStudyPlan>(client, "/api/experience/planner/preview", { method: "POST", body: request }),
  );

  // No pull-to-refresh on Today: coming back to it is the refresh.
  const refreshers = useRef({ today, announcements, activities });
  refreshers.current = { today, announcements, activities };
  useEffect(() => {
    if (!focused || adjusting.current) return;
    const now = Date.now();
    if (now - lastResync < RESYNC_MS) return;
    const first = lastResync === 0;
    lastResync = now;
    const current = refreshers.current;
    // The first visit already loads fresh data on mount.
    if (!first) {
      current.today.refresh();
    }
  }, [focused, adjusting]);
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
    if (item.reviewer) { router.push({ pathname: "/artifact", params: { id: item.reviewer.id } }); return; }
    const activity = activityFor(item, activities.data?.items ?? []);
    if (activity) router.push({ pathname: "/activity", params: { id: activity.id } });
    else if (item.deepLinkTarget.surface === "activity") router.push({ pathname: "/activity", params: { id: item.deepLinkTarget.id } });
    else router.push({ pathname: "/study-session", params: { id: item.deepLinkTarget.id, date } });
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
  const [busy, setBusy] = useState(false),
    [note, setNote] = useState<string | null>(null),
    [expanded, setExpanded] = useState(false);
  const planner = useTodayPlan({ identity, ownerId: session?.user.id ?? "", date, clock: clockWindow,
    around: freeTimeAround(timelineSegments((today.data?.timeline ?? []).filter(item => item.status === "planned"), date),
      (Date.now() - new Date(date + "T00:00:00").getTime()) / 60000),
    timeline: today.data?.timeline ?? [], timelineReady: !!today.data, enabled: available(capabilities.data?.planner), busy, previewing, preview,
    mode: planMode, selection: activePlan?.selection,
    load: request => experienceRequest<PlanningCandidates>(client, "/api/experience/planner/candidates", { method: "POST", body: request }),
    queue: queuePreview, clear: clearPreview });
  const { start, end, change } = planner;
  async function apply() {
    if (!previewRequest || requestBusy.current) return;
    requestBusy.current = true;
    setBusy(true);
    try {
      await experienceRequest(client, "/api/experience/planner/replan", {
        method: "POST",
        body: previewRequest,
      });
      clearPreview();
      haptic.success();
      clockWindow.reconcile();
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
      hideHeaderBelowOnScroll
      headerBelow={<>
        <Copy muted size="caption" style={{ paddingHorizontal: spacing[5] }}>{new Date().toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
      })}</Copy>
        <SnapshotStatus {...today} refreshing={today.refreshing || announcements.refreshing || activities.refreshing}
          error={today.error ?? announcements.error ?? activities.error} refresh={() => { today.refresh(); }} />
      </>}
      scrollEnabled={!ringActive}
      scrollRef={scrollRef}
      scrollTouch={orbTouchPause}
    >
      <AppUpdateBanner />
      <DayRingClock
        locked={locked}
        onToggleLock={toggleLock}
        onSegmentPress={(id) => {
          const item = today.data?.timeline.find((entry) => entry.id === id);
          if (item) openItem(item);
        }}
        onAdjustingChange={(active) => { clockWindow.setAdjusting(active); setRingActive(active); if (active) clearPreview(); }}
        date={date}
        timeline={today.data?.timeline ?? []}
        start={start}
        end={end}
        onChange={() => { /* The clock owns its draft; commit saves and previews. */ }}
        onCommit={change}
        disabled={busy || !available(capabilities.data?.planner)}
        proposed={
          preview
            ? preview.sessions.map((session) => {
                const at = new Date(session.startsAt);
                const from = (at.getTime() - new Date(`${date}T00:00:00`).getTime()) / 60000;
                return { id: session.proposalId, from, to: from + session.durationMinutes, color: colors[planToneFor(planTaskIds(preview), proposalTargetKey(session))] };
              })
            : []
        }
      />
      <PlanningControl key={identity} request={planningRequest(date, start, end, "reviewers_tasks")} active={activePlan}
        disabled={busy || !available(capabilities.data?.planner)}
        load={request => experienceRequest<PlanningCandidates>(client, "/api/experience/planner/candidates", { method: "POST", body: request })}
        onBuild={choice => {
          todayPlanningMemory.build(identity, choice);
          renderBuiltChoice(revision => revision + 1); setNote(null);
          planner.propose(choice.mode, choice.selection);
        }} />
      {(busy || previewing) && !preview ? <PlanPreviewLoading /> : null}
      {(note || previewNote || planner.candidateNote) && <Notice>{note || previewNote || planner.candidateNote}</Notice>}
      {preview && (
        <PlanPreview
          plan={preview}
          from={start}
          to={end}
          busy={busy}
          onApply={() => void apply()}
          onDiscard={() => {
                  clearPreview();
          }}
        />
      )}
      {today.error && !today.data ? (
        <Notice>{today.error}</Notice>
      ) : today.loading && !today.data ? (
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
            <ClearDay action={<Action secondary pill onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: !reducedMotion })}>Plan your free time</Action>} />
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
        {announcements.loading && !announcements.data ? (
          <SkeletonCards rows={2} label="Checking Canvas updates" />
        ) : announcements.error && !announcements.data ? (
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
            onPress={() => planner.propose()}
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
          <Pressable accessibilityRole="button" accessibilityLabel={`${item.reviewer ? "Review" : "Task"}: ${label}, ${item.course?.code ?? item.course?.name ?? "Personal"}, ${item.title}`} onPress={() => onOpen(item)} style={({ pressed }) => ({ flexDirection: "row", minHeight: 64, gap: 10, alignItems: "center", paddingVertical: 9, opacity: pressed ? 0.6 : state === "completed" ? 0.6 : 1, borderBottomWidth: index === items.length - 1 ? 0 : 1, borderColor: colors.separator })}>
            <Copy size="caption" color={tint} style={{ width: 70, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{label}</Copy>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tint }} />
            <ContentIcon kind={item.reviewer ? "reviewer" : "task"} small />
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
  const course = session ? [courseName, item.reviewer ? "Review session" : "Work session"].filter(Boolean).join(" · ") : courseName!;
  const row = (
    <RowLink
      inset={dominant}
      icon={<ContentIcon kind={item.reviewer ? "reviewer" : "task"} small={!dominant} />}
      label={`${pinned ? "Pinned" : dominant ? "Open next item" : "Open"}: ${item.reviewer ? "Review: " : ""}${item.title}`}
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
