import { clockTimeLabel } from "@stay-focused/shared";
import { freeTimePlanningRange, freeTimeEnd, wrapMinute } from "@stay-focused/shared";
import type { TodayItem } from "@stay-focused/shared";
import { proposalTargetKey, type PlanMode, type ProposedStudySession, type StudyPlanningRequest } from "@stay-focused/shared/task-planning";

// Mirrors the Today helpers in apps/mobile/src/features/redesign/presentation.ts.

/** Scheduled items as minute ranges on the clock's inner lane. */
export function timelineSegments(items: readonly TodayItem[], date: string) {
  const start = new Date(`${date}T00:00:00`).getTime();
  return items.flatMap((item) => {
    if (!item.startAt || !item.endAt || item.status === "skipped") return [];
    const from = Math.max(0, (new Date(item.startAt).getTime() - start) / 60000);
    const to = (new Date(item.endAt).getTime() - start) / 60000;
    return to > from
      ? [{ id: item.id, from, to, kind: item.kind, title: item.title }]
      : [];
  });
}
export type TimelineSegment = ReturnType<typeof timelineSegments>[number];

/**
 * The free time that holds the day's planned blocks, for when none was saved:
 * the run of upcoming blocks starting with the next one (blocks less than an
 * hour apart belong together), on the fifteen-minute grid.
 */
export function freeTimeAround(
  segments: readonly { readonly from: number; readonly to: number }[],
  nowMinutes: number,
): { start: number; end: number } | null {
  const upcoming = segments.map(s => ({ from: s.from, to: freeTimeEnd(s.from, s.to) }))
    .filter((s) => s.to > nowMinutes)
    .sort((a, b) => a.from - b.from);
  if (upcoming.length === 0) return null;
  let last = upcoming[0]!.to;
  for (const segment of upcoming.slice(1)) {
    if (segment.from - last > 60) break;
    last = Math.max(last, segment.to);
  }
  const start = Math.max(0, Math.floor(upcoming[0]!.from / 15) * 15);
  const end = Math.min(start + 1425, Math.ceil(last / 15) * 15);
  return end > start ? { start: wrapMinute(start), end: end <= 1440 ? end : wrapMinute(end) } : null;
}

/**
 * Only describes availability; the server planner owns allocation and order.
 * The planning range is the whole day, so applying refits all of today's work
 * inside the free time instead of leaving old blocks outside it.
 */
export function planningRequest(
  date: string,
  start: number,
  end: number,
  mode?: PlanMode,
): StudyPlanningRequest {
  return { ...freeTimePlanningRange(date, start, end), ...(mode ? { mode } : {}) };
}

/** "2 h 15 min", "45 min", "3 h". */
export function formatFreeTime(minutes: number) {
  const whole = Math.round(minutes);
  const hours = Math.floor(whole / 60),
    rest = whole % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export const clockLabel = clockTimeLabel;

export const PLAN_TONES = ["blue", "violet", "green", "orange"] as const;
export type PlanTone = (typeof PLAN_TONES)[number];
/** One stable color per planned task or reviewer, shared by the preview bar and the clock ring. */
export function planToneFor(targetKeys: readonly string[], targetKey: string): PlanTone {
  const index = targetKeys.indexOf(targetKey);
  return PLAN_TONES[(index < 0 ? 0 : index) % PLAN_TONES.length]!;
}
export function planTaskIds(plan: {
  readonly sessions: readonly ProposedStudySession[];
}): string[] {
  return [...new Set(plan.sessions.map(proposalTargetKey))];
}
