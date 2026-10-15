export type CourseState = 'current' | 'past';

/** Bounded Canvas evidence. Missing/invalid dates never prove completion. */
export interface CourseStateEvidence {
  readonly override?: CourseState | null;
  readonly concluded?: boolean | null;
  readonly workflowState?: string | null;
  readonly enrollmentStates?: readonly (string | null)[] | null;
  readonly endAt?: string | null;
  readonly termEndAt?: string | null;
}

export function isPastCourse(course: CourseStateEvidence, now: number = Date.now()): boolean {
  if (course.override) return course.override === 'past';
  const completed = (state: string | null | undefined) =>
    ['completed', 'concluded'].includes(state?.trim().toLowerCase() ?? '');
  const ended = (date: string | null | undefined) =>
    typeof date === 'string' && Number.isFinite(Date.parse(date)) && Date.parse(date) < now;
  return course.concluded === true || completed(course.workflowState) ||
    (course.enrollmentStates?.some(completed) ?? false) || ended(course.endAt) || ended(course.termEndAt);
}

export function courseState(course: CourseStateEvidence, now: number = Date.now()) {
  return { courseState: isPastCourse(course, now) ? 'past' as const : 'current' as const,
    courseStateOverridden: course.override === 'current' || course.override === 'past' };
}
