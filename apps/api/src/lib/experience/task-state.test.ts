import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readActivityContext } from './task-state';
import { experienceRepository } from './repository';
import { composeToday } from './mappers';
import { importSchedulableCanvasAssignments, listOwnedStudySessions, loadOwnedPlannerTasks, toStudySessionView } from '../task-planning-repository';

const now = Date.parse('2026-10-10T09:00:00Z');
const owner = 'owner';
const course = { id: 'course', user_id: owner, canvas_connection_id: 'connection', workflow_state: 'available', end_at: null, course_code: 'BIO', name: 'Biology' };
const assignment = { id: 'assignment', user_id: owner, course_id: course.id, canvas_connection_id: 'connection', name: 'New title', due_at: '2026-10-11T09:00:00Z', submission_types: ['online_upload'], published: true };
const task = { id: 'task', user_id: owner, source_type: 'canvas', canvas_assignment_row_id: assignment.id, title: 'Old title', due_at: '2026-10-09T09:00:00Z', status: 'pending', estimated_minutes: 60, priority: 'medium', created_at: '2026-10-01T09:00:00Z' };
const preference = { id: 'preference', user_id: owner, course_id: course.id, canvas_connection_id: 'connection', selected: true };
const submission = { id: 'submission', user_id: owner, course_id: course.id, canvas_connection_id: 'connection', assignment_id: assignment.id, workflow_state: 'submitted', submitted_at: '2026-10-09T09:00:00Z', missing: false };
const session = { id: 'session', user_id: owner, task_id: task.id, status: 'planned', starts_at: '2026-10-10T09:00:00Z', ends_at: '2026-10-10T10:00:00Z', task };
type Rows = Partial<Record<string, readonly Record<string, unknown>[]>>;
function fixture(overrides: Rows = {}) {
  const data: Rows = { canvas_courses: [course], canvas_assignments: [assignment], tasks: [task], canvas_course_sync_preferences: [preference], canvas_assignment_submissions: [submission], study_sessions: [session], ...overrides };
  const queries: { table: string; owner: unknown; start: number }[] = [];
  const rpc = vi.fn(async () => ({ data: [], error: null }));
  const client = { rpc, from(table: string) {
    const query = { table, owner: undefined as unknown, start: 0 };
    let end = Infinity;
    const builder = {
      select: () => builder,
      eq: (key: string, value: unknown) => { if (key === 'user_id') query.owner = value; return builder; },
      order: () => builder,
      limit: () => builder,
      range: (start: number, last: number) => { query.start = start; end = last + 1; return builder; },
      then(resolve: (value: { data: readonly Record<string, unknown>[]; error: null }) => unknown) {
        queries.push(query);
        return Promise.resolve(resolve({ data: (data[table] ?? []).slice(query.start, end), error: null }));
      },
    };
    return builder;
  } } as unknown as SupabaseClient<Database>;
  const read = () => readActivityContext(experienceRepository(client), owner, now, now + 86_400_000);
  return { client, read, queries, rpc };
}
afterEach(() => vi.useRealTimers());

describe('canonical task state across clients and planning', () => {
  it('keeps submitted imported work completed in Tasks, Today and Schedule without mutating saved state', async () => {
    const { client, read } = fixture();
    const context = await read();
    expect(context.activities).toMatchObject([{ id: 'canvas:assignment', title: 'New title', course: { id: 'course' }, status: 'submitted', isOverdue: false }]);
    const today = composeToday({ userId: owner, date: '2026-10-10', offset: 0, now, activities: context.activities, tasks: context.tasks, sessions: [session as unknown as Database['public']['Tables']['study_sessions']['Row']], plans: [] });
    expect(today.current).toBeNull(); expect(today.next).toBeNull(); expect(today.overdue).toEqual([]);
    expect(today.timeline[0]?.status).toBe('submitted');
    const scheduled = await listOwnedStudySessions(client, owner, { limit: 200 });
    expect(toStudySessionView(scheduled[0]!)).toMatchObject({ status: 'completed', task: { status: 'completed', dueAt: assignment.due_at, title: assignment.name } });
    expect(task.status).toBe('pending'); expect(session.status).toBe('planned');
  });

  it.each([
    { canvas_course_sync_preferences: [] },
    { canvas_course_sync_preferences: [{ ...preference, selected: false }] },
    { canvas_courses: [{ ...course, workflow_state: 'completed' }] },
    { canvas_courses: [{ ...course, end_at: '2026-10-01T00:00:00Z' }] },
    { canvas_courses: [{ ...course, workflow_state: 'deleted' }] },
    { canvas_assignment_submissions: [{ ...submission, assignment_visible: false }] },
    { canvas_assignment_submissions: [{ ...submission, absent_after_sync_at: '2026-10-10T08:00:00Z' }] },
    { canvas_assignments: [{ ...assignment, published: false }] },
    { canvas_assignments: [] },
  ] satisfies Rows[])('excludes unavailable work and its planned sessions: %j', async overrides => {
    const { client, read } = fixture(overrides);
    expect((await read()).activities).toEqual([]);
    expect(await loadOwnedPlannerTasks(client, owner)).toEqual([]);
    expect(await listOwnedStudySessions(client, owner, { limit: 200 })).toEqual([]);
  });

  it('never hides genuine personal tasks when courses are deselected', async () => {
    const { read } = fixture({ canvas_course_sync_preferences: [], tasks: [{ ...task, id: 'personal', source_type: 'manual', canvas_assignment_row_id: null }] });
    expect((await read()).activities).toMatchObject([{ id: 'task:personal', source: 'local', course: null }]);
  });

  it('plans imported work only when current Canvas evidence leaves it open, using its revised deadline', async () => {
    vi.useFakeTimers(); vi.setSystemTime(now);
    const { client } = fixture({ canvas_assignment_submissions: [{ ...submission, workflow_state: 'unsubmitted', submitted_at: null, missing: true }] });
    expect(await loadOwnedPlannerTasks(client, owner)).toMatchObject([{ id: task.id, title: assignment.name, dueAt: assignment.due_at }]);
  });

  it('does not schedule submitted tasks even when explicitly requested', async () => {
    const { client } = fixture();
    expect(await loadOwnedPlannerTasks(client, owner, [task.id])).toEqual([]);
  });

  it('does not silently import work from a finished course', async () => {
    const { client, rpc } = fixture({ tasks: [], canvas_courses: [{ ...course, workflow_state: 'completed' }], canvas_assignment_submissions: [] });
    expect(await importSchedulableCanvasAssignments(client, owner, now)).toBe(0);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('preserves unknown evidence and reopens work Canvas explicitly marks unsubmitted', async () => {
    for (const rows of [[], [{ ...submission, workflow_state: 'unsubmitted', missing: true }]]) {
      expect((await fixture({ canvas_assignment_submissions: rows }).read()).activities[0]?.status).toBe('pending');
    }
  });

  it('checks owner and connection on preferences and submissions', async () => {
    expect((await fixture({ canvas_course_sync_preferences: [{ ...preference, user_id: 'other' }] }).read()).activities).toEqual([]);
    expect((await fixture({ canvas_course_sync_preferences: [{ ...preference, canvas_connection_id: 'other' }] }).read()).activities).toEqual([]);
    const { read, queries } = fixture({ canvas_assignment_submissions: [{ ...submission, canvas_connection_id: 'other' }] });
    expect((await read()).activities[0]?.status).toBe('pending');
    expect(queries.every(query => query.owner === owner)).toBe(true);
  });
});
