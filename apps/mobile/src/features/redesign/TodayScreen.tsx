import type {
  ExperienceCapabilities,
  TodayItem,
  TodayOverview,
  StudentAnnouncementList,
} from "@stay-focused/shared";
import type { DeterministicStudyPlan } from "@stay-focused/shared/task-planning";
import { router } from "expo-router";
import { EyeOff, Pin, PinOff } from "lucide-react-native";
import { useRef, useState, type ReactNode } from "react";
import { Vibration, View } from "react-native";

import {
  Action,
  Copy,
  Notice,
  Page,
  RowLink,
  Surface,
  ContentIcon,
} from "../../design/primitives";
import { SwipeRow, animateNextLayout, swipeAccessibility, type SwipeAction } from "../../design/SwipeRow";
import { useTheme } from "../../design/theme";
import { experienceRequest } from "../../services/experienceApi";
import { DayRingClock } from "./DayRingClock";
import {
  arrangeToday,
  available,
  deadline,
  localDate,
  planningRequest,
  timeLabel,
  todayItemDetail,
} from "./presentation";
import { useExperience, useExperienceClient } from "./useExperience";
import { AnnouncementItem, useArrangedAnnouncements } from "../announcements/AnnouncementsScreen";
import { todayHideKey } from "./listPreferences";
import { useListPreferences } from "./useListPreferences";
import { SyncStatus } from "../sync/SyncStatus";
import { useCanvasSync } from "../sync/CanvasSyncProvider";

export function TodayScreen() {
  const date = localDate();
  const today = useExperience<TodayOverview>(
    `/api/today?date=${date}&utcOffsetMinutes=${-new Date().getTimezoneOffset()}`,
    60000,
  );
  const capabilities = useExperience<ExperienceCapabilities>(
    "/api/experience/capabilities",
  );
  const announcements = useExperience<StudentAnnouncementList>(
    "/api/experience/announcements?limit=3",
    60000,
  );
  const client = useExperienceClient();
  const { sync } = useCanvasSync();
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
  const shownAnnouncements = [...announcementList.pinned, ...announcementList.rest].slice(0, 3);
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
      onPress: () => {
        if (!pinned) Vibration.vibrate(8);
        glide(() => pin("today", item.id, !pinned));
      },
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
        <TodayRow item={item} dominant={options.dominant} withDay={options.withDay} pinned={swipe.pinned} swipeActions={[...swipe.leading, ...swipe.trailing]} />
      </SwipeRow>
    );
  };
  // Dragging a ring handle downward must never start pull-to-refresh.
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
  const change = (from: number, to: number) => {
    setStart(from);
    setEnd(to);
    setPreview(null);
    setPreviewRequest(null);
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
      setNote("Your schedule has been updated.");
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
      title={
        new Date().getHours() < 12
          ? "Good morning"
          : new Date().getHours() < 18
            ? "Good afternoon"
            : "Good evening"
      }
      subtitle={new Date().toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
      })}
      onRefresh={() => {
        today.refresh();
        announcements.refresh();
        void sync();
      }}
      refreshEnabled={!ringActive}
      scrollEnabled={!ringActive}
    >
      <SyncStatus />
      <DayRingClock
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
      />
      {busy && <Notice>Updating your plan…</Notice>}
      {note && <Notice>{note}</Notice>}
      {preview && (
        <Surface>
          <Copy size="h2">Your plan preview</Copy>
          {preview.sessions.length === 0 && (
            <Copy muted>No study sessions fit this window.</Copy>
          )}
          {preview.sessions.map((session) => (
            <Copy key={session.proposalId}>
              {timeLabel(session.startsAt)} · {session.taskTitle} ·{" "}
              {session.durationMinutes} min
            </Copy>
          ))}
          {preview.unscheduledWork.map((item) => (
            <Copy key={item.taskId} muted>
              {item.taskTitle}: {item.unscheduledMinutes} min still to schedule
            </Copy>
          ))}
          <Copy muted size="caption">
            Applying replaces planned sessions in this window and preserves
            completed work.
          </Copy>
          <Action disabled={busy} onPress={() => void apply()}>
            Apply this schedule
          </Action>
        </Surface>
      )}
      {today.error ? (
        <Notice>{today.error}</Notice>
      ) : today.loading ? (
        <Notice>Loading your day…</Notice>
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
          {arranged.hidden.length > 0 ? (
            <View style={{ gap: 8 }}>
              <Action secondary onPress={() => glide(() => setShowHidden((value) => !value))}>
                {showHidden ? "Done" : `Show ${arranged.hidden.length} hidden today`}
              </Action>
              {showHidden
                ? arranged.hidden.map((item) => (
                    <View key={item.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, opacity: 0.75 }}>
                      <View style={{ flex: 1 }}><TodayRow item={item} /></View>
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
          <Notice>Checking Canvas updates...</Notice>
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
                pinned={announcementList.isPinned(item.id)}
                onPin={(pinned) => announcementList.setPinned(item.id, pinned)}
                onHide={(hidden) => announcementList.setHidden(item.id, hidden)}
              />
            ))}
          </Surface>
        ) : (
          <Copy muted size="bodySmall">No recent Canvas announcements.</Copy>
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
            <TodayRow key={item.id} item={item} />
          ))}
        </Surface>
      )}
    </Page>
  );
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
}: {
  item: TodayItem;
  dominant?: boolean;
  /** Deadlines beyond today name their day. */
  withDay?: boolean;
  pinned?: boolean;
  swipeActions?: readonly SwipeAction[];
}) {
  const { colors } = useTheme();
  const detail = withDay && item.dueAt ? deadline(item.dueAt) : todayItemDetail(item);
  const course = item.course?.code ?? item.course?.name ?? (item.kind === "study_session" ? "Study" : "Personal");
  const row = (
    <RowLink
      inset={dominant}
      icon={<ContentIcon kind={item.kind === "study_session" ? "reviewer" : "task"} small={!dominant} />}
      label={`${pinned ? "Pinned" : dominant ? "Open next item" : "Open"}: ${item.title}`}
      {...(swipeActions.length ? swipeAccessibility(swipeActions) : {})}
      onPress={() =>
        router.push(
          item.deepLinkTarget.surface === "activity"
            ? { pathname: "/activity", params: { id: item.deepLinkTarget.id } }
            : {
                pathname: "/study-session",
                params: { id: item.deepLinkTarget.id, date: localDate() },
              },
        )
      }
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
      {detail ? <Copy muted size="caption">{withDay ? `Due ${detail}` : detail}</Copy> : null}
    </RowLink>
  );
  // Up Next items are cards; the card moves with the swipe.
  if (!dominant) return row;
  return <Surface>{row}</Surface>;
}
