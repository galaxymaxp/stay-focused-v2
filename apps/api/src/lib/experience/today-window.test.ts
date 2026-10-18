import { describe, expect, it } from 'vitest';
import type { StudySessionRow } from '@stay-focused/db';
import { validateStudyPlanningRequest } from '@stay-focused/shared/task-planning';
import { composeToday, dayWindow } from './mappers';

// Reuses TC1 preflight fixtures; the approved projection resolves its counterexample.
describe('Today wrapped window projection', () => {
  it.each([
    ['2026-10-17T22:00:00+08:00', '2026-10-18T04:00:00+08:00'],
    ['2026-10-17T23:30:00+08:00', '2026-10-18T00:30:00+08:00'],
  ])('planner accepts overnight ISO window %s to %s', (startsAt, endsAt) => {
    expect(validateStudyPlanningRequest({
      planningRange: { startsAt: '2026-10-17T00:00:00+08:00', endsAt },
      availability: [{ startsAt, endsAt }],
    }).ok).toBe(true);
  });

  it('Today dayWindow always ends at the next midnight', () => {
    expect(dayWindow('2026-10-17', 480)).toEqual({
      start: Date.parse('2026-10-17T00:00:00+08:00'),
      end: Date.parse('2026-10-18T00:00:00+08:00'),
    });
  });

  const session = {
    id: 'synthetic-session', user_id: 'synthetic-owner', task_id: 'synthetic-task',
    study_plan_id: 'synthetic-plan', status: 'planned',
    starts_at: '2026-10-18T01:00:00+08:00', ends_at: '2026-10-18T02:00:00+08:00',
    created_at: '2026-10-17T20:00:00+08:00', updated_at: '2026-10-17T20:00:00+08:00',
  } satisfies StudySessionRow;
  const input = {
    userId: 'synthetic-owner', offset: 480, now: Date.parse('2026-10-18T01:30:00+08:00'),
    activities: [], tasks: [], plans: [], sessions: [session],
  };

  it('extended previous-date snapshot includes the current overnight session', () => {
    const yesterday = composeToday({ ...input, date: '2026-10-17', window: { endsAt: '2026-10-18T04:00:00+08:00' } });
    expect(yesterday.timeline.map(item => item.id)).toEqual(['session:synthetic-session']);
    expect(yesterday.current?.id).toBe('session:synthetic-session');
    expect(yesterday.next?.id).toBe('session:synthetic-session');
    expect(yesterday.progress).toEqual({ completed: 0, total: 1, scheduledMinutes: 60 });
  });

  it('trimmed next date excludes the previously owned morning', () => {
    const today = composeToday({ ...input, date: '2026-10-18', window: { startsAt: '2026-10-18T04:00:00+08:00' } });
    expect(today.timeline).toEqual([]);
    expect(today.current).toBeNull(); expect(today.next).toBeNull();
    expect(today.progress.total).toBe(0);
  });
  it('leaves no-override behavior identical to the original calendar-day snapshot', () => {
    expect(composeToday({ ...input, date: '2026-10-17' }).timeline).toEqual([]);
    const original = composeToday({ ...input, date: '2026-10-18' });
    expect(original.current?.id).toBe('session:synthetic-session');
    expect(composeToday({ ...input, date: '2026-10-18', window: {} })).toEqual(original);
  });
  it('includes later work and owner isolation over the extended window', () => {
    const overview = composeToday({ ...input, date: '2026-10-17', now: Date.parse('2026-10-17T23:30:00+08:00'),
      sessions: [session, { ...session, id: 'foreign', user_id: 'other' }], window: { endsAt: '2026-10-18T04:00:00+08:00' } });
    expect(overview.next?.id).toBe('session:synthetic-session');
    expect(overview.timeline).toHaveLength(1);
  });
});
