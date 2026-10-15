import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ExperienceFailure } from './experience/errors';
import { readOwnedCourse, storedCourseState } from './course-state';

export async function setOwnedCourseState(client: SupabaseClient<Database>, userId: string, courseId: string, body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 ||
    !('override' in body) || (body.override !== null && body.override !== 'current' && body.override !== 'past')) {
    throw new ExperienceFailure(400, 'invalid_request');
  }
  const course = await readOwnedCourse(client, userId, courseId);
  if (!course) throw new ExperienceFailure(404, 'not_found');
  const updated = await client.from('canvas_courses').update({ course_state_override: body.override })
    .eq('user_id', userId).eq('canvas_connection_id', course.canvas_connection_id).eq('id', courseId).select('*').maybeSingle();
  if (updated.error) throw new ExperienceFailure(503, 'unavailable');
  if (!updated.data || updated.data.user_id !== userId) throw new ExperienceFailure(404, 'not_found');
  return { id: courseId, ...storedCourseState(updated.data) };
}
