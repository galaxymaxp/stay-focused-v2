import type { CanvasCourseRow, Database, Json, ProcessingJobDatabaseRow } from '@stay-focused/db';
import { courseState, isPastCourse } from '@stay-focused/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

export function storedCourseEvidence(row: Partial<CanvasCourseRow>) {
  return { override: row.course_state_override, concluded: row.concluded,
    workflowState: row.workflow_state, enrollmentStates: row.enrollment_states,
    endAt: row.end_at, termEndAt: row.term_end_at };
}
export function storedCourseState(row: Partial<CanvasCourseRow>, now = Date.now()) {
  return courseState(storedCourseEvidence(row), now);
}
export function isPastStoredCourse(row: Partial<CanvasCourseRow>, now = Date.now()) {
  return isPastCourse(storedCourseEvidence(row), now);
}
export async function readOwnedCourse(client: SupabaseClient<Database>, userId: string, courseId: string) {
  const result = await client.from('canvas_courses').select('*').eq('user_id', userId).eq('id', courseId).maybeSingle();
  if (result.error) throw new Error('course_state_unavailable');
  return result.data?.user_id === userId ? result.data : null;
}
export async function isPastOwnedCourse(client: SupabaseClient<Database>, userId: string, courseId: string) {
  const row = await readOwnedCourse(client, userId, courseId);
  // Missing course evidence cannot admit background work.
  return !row || isPastStoredCourse(row);
}

/** Only server-persisted metadata; never trust a request-supplied owner. */
export function metadataCourseId(value: Json): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const meta = value as { readonly [key: string]: Json | undefined };
  return typeof meta.canvasCourseId === 'string' ? meta.canvasCourseId : typeof meta.courseId === 'string' ? meta.courseId : null;
}

/** Bounded list projection reads metadata only, never source bodies or paths. */
export async function currentCourseJobs<T extends ProcessingJobDatabaseRow>(client: SupabaseClient<Database>, userId: string, jobs: readonly T[]): Promise<T[]> {
  if (!jobs.length) return [];
  const sources = await client.from('processing_job_sources').select('id,user_id,metadata')
    .eq('user_id', userId).in('id', [...new Set(jobs.map(job => job.source_snapshot_id))]);
  if (sources.error || !sources.data) throw new Error('course_state_unavailable');
  const sourceMap = new Map(sources.data.filter(source => source.user_id === userId).map(source => [source.id, source]));
  const activities = new Map<string, string>();
  for (const source of sourceMap.values()) {
    const meta = source.metadata;
    if (meta && typeof meta === 'object' && !Array.isArray(meta) && 'activityId' in meta && typeof meta.activityId === 'string') activities.set(source.id, meta.activityId);
  }
  const assignmentIds = [...new Set([...activities.values()].filter(id => /^canvas:[a-f0-9-]{36}$/i.test(id)).map(id => id.slice(7)))];
  const assignments = assignmentIds.length ? await client.from('canvas_assignments').select('id,course_id,user_id,canvas_connection_id').eq('user_id', userId).in('id', assignmentIds) : null;
  if (assignments?.error) throw new Error('course_state_unavailable');
  const assignmentMap = new Map(assignments?.data?.filter(row => row.user_id === userId).map(row => [`canvas:${row.id}`, row]) ?? []);
  const courseIds = [...new Set([...sources.data.flatMap(source => {
    const id = metadataCourseId(source.metadata); return id ? [id] : [];
  }), ...[...assignmentMap.values()].map(row => row.course_id)])];
  const courses = courseIds.length ? await client.from('canvas_courses').select('*').eq('user_id', userId).in('id', courseIds) : null;
  if (courses?.error) throw new Error('course_state_unavailable');
  const current = new Set(courses?.data?.filter(course => course.user_id === userId && !isPastStoredCourse(course)).map(course => course.id) ?? []);
  return jobs.filter(job => {
    if (job.user_id !== userId) return false;
    const source = sourceMap.get(job.source_snapshot_id);
    if (!source) return false;
    const activityId = activities.get(source.id);
    const assignment = activityId ? assignmentMap.get(activityId) : null;
    if (activityId && !assignment) return false;
    const courseId = metadataCourseId(source.metadata) ?? assignment?.course_id;
    if (assignment && !courses?.data?.some(course => course.id === assignment.course_id && course.canvas_connection_id === assignment.canvas_connection_id)) return false;
    return !courseId || current.has(courseId);
  });
}
