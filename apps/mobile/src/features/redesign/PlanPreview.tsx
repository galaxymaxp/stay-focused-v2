import { freeTimeEnd, minuteInWindow, clockTimeLabel, planBlockMarks } from "@stay-focused/shared";
import { useState } from 'react';
import { isReviewerProposal, planEmptyMessage, proposalTargetKey, proposalTitle, type DeterministicStudyPlan } from "@stay-focused/shared/task-planning";
import { View } from "react-native";

import { Action, ContentIcon, Copy, Surface } from "../../design/primitives";
import { useTheme, type ThemeColors } from "../../design/theme";
import { radius, spacing } from "../../design/tokens";
import { formatFreeTime } from "./DayRingClock";

const TONES = ["blue", "violet", "green", "orange"] as const;

/** One stable color per task, shared by the preview bar and the clock ring. */
export function planToneFor(taskIds: readonly string[], taskId: string): (typeof TONES)[number] {
  const index = taskIds.indexOf(taskId);
  return TONES[(index < 0 ? 0 : index) % TONES.length]!;
}

export function planTaskIds(plan: Pick<DeterministicStudyPlan, "sessions">): string[] {
  return [...new Set(plan.sessions.map(proposalTargetKey))];
}

function minuteOfDay(iso: string) {
  const date = new Date(iso);
  return date.getHours() * 60 + date.getMinutes();
}

const hourLabel = clockTimeLabel;

/**
 * The planner's proposal drawn to scale across the free window, so the
 * student sees the shape of the evening at a glance: one block per session,
 * colored per task (matching the clock ring), empty space left empty. Work
 * that did not fit sits as a dashed block after the window. Nothing changes
 * until Apply.
 */
export function PlanPreview({
  plan,
  from,
  to,
  busy,
  onApply,
  onDiscard,
}: {
  plan: DeterministicStudyPlan;
  from: number;
  to: number;
  busy: boolean;
  onApply: () => void;
  onDiscard: () => void;
}) {
  const { colors } = useTheme();
  const until = freeTimeEnd(from, to);
  const [barWidth, setBarWidth] = useState(0);
  const span = Math.max(15, until - from);
  const taskIds = planTaskIds(plan);
  const planned = plan.sessions.reduce((total, session) => total + session.durationMinutes, 0);
  const unscheduled = plan.notFit?.reduce((total, item) => total + item.minutes, 0) ?? plan.unscheduledWork.reduce((total, item) => total + item.unscheduledMinutes, 0);
  const hours = Array.from({ length: Math.floor(until / 60) - Math.ceil(from / 60) + 1 }, (_, index) => (Math.ceil(from / 60) + index) * 60).filter((m) => m > from && m < until);
  return (
    <Surface style={{ gap: spacing[3] }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Copy size="h3">Proposed plan</Copy>
        <Copy muted size="caption" style={{ fontVariant: ["tabular-nums"] }}>{formatFreeTime(planned)} planned</Copy>
      </View>
      {plan.sessions.length === 0 && planEmptyMessage(plan) ? <Copy muted>{planEmptyMessage(plan)}</Copy> : null}
      <View
        onLayout={event => setBarWidth(event.nativeEvent.layout.width)}
        accessible
        accessibilityLabel={
          plan.sessions.length
            ? `Proposed plan: ${plan.sessions.map((session) => `${isReviewerProposal(session) ? "Review" : "Task"}: ${proposalTitle(session)} at ${hourLabel(minuteOfDay(session.startsAt))} for ${session.durationMinutes} minutes`).join("; ")}`
            : "No sessions fit this window"
        }
        style={{ height: 58, borderRadius: radius.control, backgroundColor: colors.surfaceSecondary }}
      >
        {hours.map((minutes) => (
          <View key={minutes} style={{ position: "absolute", top: 0, bottom: 0, width: 1, left: `${((minutes - from) / span) * 100}%`, backgroundColor: colors.separator }} />
        ))}
        {plan.sessions.map((session) => {
          const start = minuteInWindow(minuteOfDay(session.startsAt), from);
          const tone = planToneFor(taskIds, proposalTargetKey(session));
          const late = session.scheduledAfterDeadline;
          const marks = planBlockMarks({ shape: 'linear', length: Math.min(session.durationMinutes, until - start) / span * barWidth, thickness: 50 }, 0, 34);
          return (
            <View
              key={session.proposalId}
              style={{
                position: "absolute",
                top: 4,
                bottom: 4,
                left: `${(Math.max(0, start - from) / span) * 100}%`,
                width: `${(Math.min(session.durationMinutes, until - start) / span) * 100}%`,
                paddingHorizontal: 6,
                justifyContent: "center",
                borderRadius: radius.control - 4,
                backgroundColor: blockFill(colors, tone),
                borderWidth: late ? 1.5 : 0,
                borderColor: colors.danger,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                {marks.kind && <ContentIcon kind={isReviewerProposal(session) ? "reviewer" : "task"} small />}
                <Copy size="caption" numberOfLines={1} color={colors[tone]} style={{ fontWeight: "700", fontSize: 11, flex: 1 }}>{proposalTitle(session)}</Copy>
              </View>
              <Copy size="caption" numberOfLines={1} color={colors[tone]} style={{ fontSize: 10, opacity: 0.85, fontVariant: ["tabular-nums"] }}>
                {late ? "after due · " : ""}{session.durationMinutes}m
              </Copy>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: -spacing[2] }}>
        <Copy muted size="caption" style={{ fontVariant: ["tabular-nums"] }}>{hourLabel(from)}</Copy>
        <Copy muted size="caption" style={{ fontVariant: ["tabular-nums"] }}>{hourLabel(to)}</Copy>
      </View>
      {unscheduled > 0 ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
          <View style={{ width: 28, height: 14, borderRadius: 4, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.textMuted }} />
          <Copy muted size="caption" style={{ flex: 1 }} numberOfLines={1}>
            {formatFreeTime(unscheduled)} more didn&apos;t fit
          </Copy>
        </View>
      ) : null}
      <View style={{ flexDirection: "row", gap: spacing[2] }}>
        <View style={{ flex: 1 }}><Action secondary pill disabled={busy} onPress={onDiscard}>Discard</Action></View>
        <View style={{ flex: 2 }}><Action pill disabled={busy || plan.sessions.length === 0} onPress={onApply}>Apply plan</Action></View>
      </View>
    </Surface>
  );
}

function blockFill(colors: ThemeColors, tone: (typeof TONES)[number]) {
  return colors[`${tone}Soft`];
}
