import { clockTimeLabel, localMinuteIso } from './free-time';
import type { TodayItem } from './experience';
import type { PlanSnapshot } from './planning-sheet';

export function previousPlanData(snapshot: PlanSnapshot | null, date: string, timeline: readonly TodayItem[], now = Date.now()) {
  if (!snapshot) return null;
  const sameDate = snapshot.date === date;
  return { snapshot, summary: `${new Date(`${snapshot.date}T12:00:00`).toLocaleDateString([], { weekday: 'long' })} · ${clockTimeLabel(snapshot.start)} – ${clockTimeLabel(snapshot.end)}`,
    sessions: snapshot.sessions.map(session => {
      if (!sameDate) return { ...session, status: null };
      const start = Date.parse(localMinuteIso(snapshot.date, session.startMinute));
      // Today has no task target ID. Exact time + kind + title/course is the
      // safe legacy equivalent; ambiguous matches never claim completion.
      const matches = timeline.filter(item => item.kind === 'study_session' && item.startAt && Date.parse(item.startAt) === start &&
        (session.kind === 'reviewer' ? item.reviewer?.id === session.id || item.reviewer?.id === `artifact:${session.id}` : !item.reviewer && item.title === session.title && (item.course?.id ?? null) === session.courseId));
      const matched = matches.length === 1 ? matches[0] : undefined;
      const status = matched?.status === 'completed' || matched?.status === 'submitted' ? 'Done' as const : matched?.status === 'skipped' ? 'Skipped' as const :
        start + session.minutes * 60000 <= now ? 'Not finished · moved to today' as const : 'Planned' as const;
      return { ...session, status };
    }) };
}
