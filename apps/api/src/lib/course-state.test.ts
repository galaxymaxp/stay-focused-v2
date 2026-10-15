import { describe, expect, it } from 'vitest';
import type { Database, ProcessingJobDatabaseRow } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { currentCourseJobs } from './course-state';
import { setOwnedCourseState } from './course-state-mutation';
import { listOwnedProcessingJobs } from './processing-jobs/repository';

type Row = Record<string, unknown>;
function fixture(tables: Record<string, Row[]>) {
  const reads: string[] = [], writes: string[] = [];
  const client = { from(table: string) {
    reads.push(table);
    const filters: ((row: Row) => boolean)[] = [];
    let limit = Infinity, mutation: Row | null = null;
    const run = () => {
      const rows = (tables[table] ?? []).filter(row => filters.every(test => test(row))).slice(0, limit);
      if (mutation) { writes.push(table); for (const row of rows) Object.assign(row, mutation); }
      return { data: rows, error: null };
    };
    const query = {
      select: () => query, order: () => query,
      eq: (key: string, value: unknown) => { filters.push(row => row[key] === value); return query; },
      in: (key: string, values: unknown[]) => { filters.push(row => values.includes(row[key])); return query; },
      limit: (count: number) => { limit = count; return query; },
      or: (value: string) => { const cursor = value.split('created_at.lt.')[1]!.split(',')[0]!; filters.push(row => String(row.created_at) < cursor); return query; },
      update: (value: Row) => { mutation = value; return query; },
      maybeSingle: async () => { const result = run(); return { ...result, data: result.data[0] ?? null }; },
      then: <T>(resolve: (value: ReturnType<typeof run>) => T) => Promise.resolve(run()).then(resolve),
    };
    return query;
  } } as unknown as SupabaseClient<Database>;
  return { client, reads, writes };
}
const course = (id: string, user = 'owner', state: Row = {}) => ({ id, user_id: user, canvas_connection_id: 'connection', workflow_state: 'available', ...state });
const job = (id: string, source: string, created = '2026-10-14') => ({ id, source_snapshot_id: source, user_id: 'owner', created_at: created } as ProcessingJobDatabaseRow);
describe('owner course state and Queue projections', () => {
  it('sets either override and clears it without altering Canvas evidence', async () => {
    const row = { ...course('course'), concluded: true };
    const { client } = fixture({ canvas_courses: [row] });
    expect(await setOwnedCourseState(client, 'owner', 'course', { override: 'current' })).toMatchObject({ courseState: 'current', courseStateOverridden: true });
    expect(await setOwnedCourseState(client, 'owner', 'course', { override: 'past' })).toMatchObject({ courseState: 'past', courseStateOverridden: true });
    expect(await setOwnedCourseState(client, 'owner', 'course', { override: null })).toMatchObject({ courseState: 'past', courseStateOverridden: false });
    expect(row.concluded).toBe(true);
  });
  it('fails closed for another owner and performs no mutation', async () => {
    const { client, writes } = fixture({ canvas_courses: [course('foreign', 'other')] });
    await expect(setOwnedCourseState(client, 'owner', 'foreign', { override: 'past' })).rejects.toMatchObject({ status: 404, code: 'not_found' });
    expect(writes).toEqual([]);
  });
  it.each([{}, { override: 'unknown' }, { override: 'past', userId: 'other' }, []])('rejects invalid override input %j', async body => {
    const { client, reads } = fixture({});
    await expect(setOwnedCourseState(client, 'owner', 'course', body)).rejects.toMatchObject({ status: 400 });
    expect(reads).toEqual([]);
  });
  it('omits past reviewers, quizzes and activity jobs while preserving personal/current jobs', async () => {
    const assignment = '11111111-1111-4111-8111-111111111111';
    const jobs = [job('reviewer', 'r'), job('quiz', 'q'), job('activity', 'a'), job('personal', 'p'), job('current', 'c')];
    const { client } = fixture({ canvas_courses: [course('past', 'owner', { term_end_at: '2020-01-01' }), course('current')],
      canvas_assignments: [{ id: assignment, user_id: 'owner', course_id: 'past', canvas_connection_id: 'connection' }],
      processing_job_sources: [
        { id: 'r', user_id: 'owner', metadata: { canvasCourseId: 'past' } },
        { id: 'q', user_id: 'owner', metadata: { courseId: 'past' } },
        { id: 'a', user_id: 'owner', metadata: { activityId: `canvas:${assignment}` } },
        { id: 'p', user_id: 'owner', metadata: {} }, { id: 'c', user_id: 'owner', metadata: { canvasCourseId: 'current' } },
      ] });
    expect((await currentCourseJobs(client, 'owner', jobs)).map(row => row.id)).toEqual(['personal', 'current']);
  });
  it('continues Queue history through a complete page of hidden past jobs', async () => {
    const rows = [job('hidden', 'past-source', '2026-10-15'), job('visible', 'personal-source', '2026-10-14')];
    const { client } = fixture({ processing_jobs: rows as unknown as Row[], canvas_courses: [course('past', 'owner', { course_state_override: 'past' })],
      processing_job_sources: [{ id: 'past-source', user_id: 'owner', metadata: { canvasCourseId: 'past' } }, { id: 'personal-source', user_id: 'owner', metadata: {} }] });
    expect((await listOwnedProcessingJobs(client, 'owner', { scope: 'all', limit: 1 })).map(row => row.id)).toEqual(['visible']);
  });
});
