import type { ExperienceRepository } from './repository';
import { composeActivities, isSubmittedCanvasSubmission } from './mappers';

/** One owner-scoped source of truth for Tasks, Today and planner eligibility. */
export async function readActivityContext(repository: ExperienceRepository, userId: string, now: number, dayEnd: number, includeArchivedCourses = false) {
  const owned = async <T extends Parameters<ExperienceRepository['rows']>[0]>(table: T) =>
    (await repository.rows(table, userId)).filter(row => row.user_id === userId);
  const [assignments, tasks, courses, submissions, preferences] = await Promise.all([
    owned('canvas_assignments'), owned('tasks'), owned('canvas_courses'),
    owned('canvas_assignment_submissions'), owned('canvas_course_sync_preferences'),
  ]);
  const courseMap = new Map(courses.map(course => [course.id, course]));
  const assignmentMap = new Map(assignments.map(assignment => [assignment.id, assignment]));
  const selectedCourseIds = new Set(preferences.filter(p => p.selected && courseMap.get(p.course_id)?.canvas_connection_id === p.canvas_connection_id).map(p => p.course_id));
  const matchedSubmissions = submissions.filter(s => {
    const assignment = assignmentMap.get(s.assignment_id);
    return assignment && assignment.course_id === s.course_id && assignment.canvas_connection_id === s.canvas_connection_id;
  });
  const unavailableAssignmentIds = new Set(matchedSubmissions.filter(s => s.assignment_visible === false || s.absent_after_sync_at).map(s => s.assignment_id));
  const visibleAssignments = assignments.filter(a => a.published !== false && !unavailableAssignmentIds.has(a.id));
  const submittedAssignmentIds = new Set(matchedSubmissions.filter(isSubmittedCanvasSubmission).map(s => s.assignment_id));
  return { activities: composeActivities({ userId, assignments: visibleAssignments, tasks, courses, selectedCourseIds: includeArchivedCourses ? undefined : selectedCourseIds, includeArchivedCourses, submittedAssignmentIds, now, dayEnd }), assignments, tasks, courses };
}
