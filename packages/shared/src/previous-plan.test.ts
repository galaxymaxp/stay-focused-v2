import { expect, it } from 'vitest';
import { localMinuteIso } from './free-time';
import { previousPlanData } from './previous-plan';
import type { TodayItem } from './experience';
const date = '2026-10-27';
const snapshot = { date, start: 1200, end: 1320, sessions: [0, 1, 2, 3].map(n => ({ kind: 'task' as const, id: String(n), title: `Synthetic ${n}`, courseId: null, startMinute: 1200 + n * 30, minutes: 30 })) };
it('maps exact same-date sessions to done, skipped, unfinished and planned', () => {
  const timeline = snapshot.sessions.map((session, n) => ({ kind: 'study_session', title: session.title, course: null, startAt: localMinuteIso(date, session.startMinute), status: n === 0 ? 'completed' : n === 1 ? 'skipped' : 'planned' }) as TodayItem);
  expect(previousPlanData(snapshot, date, timeline, Date.parse(localMinuteIso(date, 1290)))?.sessions.map(session => session.status)).toEqual(['Done', 'Skipped', 'Not finished · moved to today', 'Planned']);
});
it('never infers completion for ambiguous matches or a task/reviewer title collision', () => {
  const row = { kind: 'study_session', title: 'Synthetic 0', course: null, startAt: localMinuteIso(date, 1200), status: 'completed' } as TodayItem;
  const now = Date.parse(localMinuteIso(date, 1240));
  expect(previousPlanData(snapshot, date, [row, row], now)?.sessions[0]?.status).toBe('Not finished · moved to today');
  expect(previousPlanData(snapshot, date, [{ ...row, reviewer: { id: 'reviewer' } }], now)?.sessions[0]?.status).toBe('Not finished · moved to today');
});
it('older snapshots have weekday/window summary and no same-day statuses; no snapshot is empty', () => {
  expect(previousPlanData(snapshot, '2026-10-28', [])?.summary).toContain('Tuesday');
  expect(previousPlanData(snapshot, '2026-10-28', [])?.sessions.every(session => session.status === null)).toBe(true);
  expect(previousPlanData(null, date, [])).toBeNull();
});
