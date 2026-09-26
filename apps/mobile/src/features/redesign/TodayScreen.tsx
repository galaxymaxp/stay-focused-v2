import type {
  ExperienceCapabilities,
  TodayItem,
  TodayOverview,
  StudentAnnouncementList,
} from "@stay-focused/shared";
import type { DeterministicStudyPlan } from "@stay-focused/shared/task-planning";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { View } from "react-native";

import {
  Action,
  Copy,
  Notice,
  Page,
  RowLink,
  Surface,
  ContentIcon,
} from "../../design/primitives";
import { experienceRequest } from "../../services/experienceApi";
import { DayRingClock } from "./DayRingClock";
import {
  available,
  deadline,
  localDate,
  planningRequest,
  timeLabel,
  todayItemDetail,
} from "./presentation";
import { useExperience, useExperienceClient } from "./useExperience";
import {
  announcementCourseLabel,
  formatAnnouncementDate,
} from "../announcements/announcementPresentation";
import { openAnnouncement } from "../announcements/AnnouncementsScreen";
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
  // Canvas deadlines in the coming week that are not already scheduled today.
  const dueSoon = (today.data?.upcomingDeadlines ?? [])
    .filter((item) => item.dueAt && Date.parse(item.dueAt) - Date.now() < 7 * 86_400_000)
    .slice(0, 3);
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
      actions={[{ label: "Schedule & availability", onPress: () => setExpanded(!expanded) }]}
      refreshEnabled={!ringActive}
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
          {today.data?.next ? (
            <Surface>
              <TodayRow item={today.data.next} dominant />
            </Surface>
          ) : (
            <Surface>
              <RowLink inset icon={<ContentIcon kind="task" />} label="Open Tasks" onPress={() => router.navigate("/work")}>
                <Copy size="h3">Room to focus</Copy>
                <Copy muted size="bodySmall">Nothing scheduled next. Plan your time or open Tasks.</Copy>
              </RowLink>
            </Surface>
          )}
          </View>
          <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Copy size="h2">Later Today</Copy>
          <Action secondary onPress={() => setExpanded(!expanded)}>{expanded ? "Close schedule" : "See schedule"}</Action>
          </View>
          {today.data?.later.length ? (
            today.data.later.map((item) => (
              <TodayRow key={item.id} item={item} />
            ))
          ) : (
            <Copy muted size="bodySmall">Your day is clear. Make room for what matters.</Copy>
          )}
          </View>
          {dueSoon.length > 0 && (
            <View style={{ gap: 8 }}>
              <Copy size="h2">Due soon</Copy>
              <Surface>
                {dueSoon.map((item) => (
                  <TodayRow key={item.id} item={item} withDay />
                ))}
              </Surface>
            </View>
          )}
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
        ) : announcements.data?.items.length ? (
          <Surface>
            {announcements.data.items.map(item => (
              <RowLink
                key={item.id}
                label={`Read announcement: ${item.title}`}
                onPress={() => openAnnouncement(item.id)}
              >
                <Copy muted size="caption">{announcementCourseLabel(item)} · {formatAnnouncementDate(item.postedAt)}</Copy>
                <Copy size="h3">{item.title}</Copy>
              </RowLink>
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
function TodayRow({
  item,
  dominant = false,
  withDay = false,
}: {
  item: TodayItem;
  dominant?: boolean;
  /** Deadlines beyond today name their day. */
  withDay?: boolean;
}) {
  const detail = withDay && item.dueAt ? deadline(item.dueAt) : todayItemDetail(item);
  return (
    <RowLink
      inset={dominant}
      icon={<ContentIcon kind={item.kind === "study_session" ? "reviewer" : "task"} small={!dominant} />}
      label={`${dominant ? "Open next item" : "Open"}: ${item.title}`}
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
      <Copy muted size="caption">
        {item.course?.code ??
          item.course?.name ??
          (item.kind === "study_session" ? "Study" : "Personal")}
      </Copy>
      <Copy size="h3">{item.title}</Copy>
      {detail ? <Copy muted size="caption">{withDay ? `Due ${detail}` : detail}</Copy> : null}
    </RowLink>
  );
}
