/**
 * Route identities for the app shell.
 *
 * Kept as plain data in `src/` so navigation decisions stay unit-testable and
 * so route strings have one definition instead of being spelled inline at every
 * call site.
 */
export const APP_ROUTES = {
  signIn: "/sign-in",
  signUp: "/sign-up",
  today: "/today",
  work: "/work",
  courses: "/courses",
  library: "/library",
  generate: "/generate",
  processing: "/processing",
  settings: "/settings",
  task: "/task",
} as const;

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];

/**
 * Dynamic destinations are addressed by pathname plus params rather than a
 * pre-built string, so the router owns escaping and Expo Router's generated
 * route types can check both halves.
 */
export const TASK_EDITOR_PATHNAME = "/task" as const;
export const COURSE_REVIEWER_PATHNAME = "/courses/[courseId]/reviewer" as const;
export const COURSE_GRADES_PATHNAME = "/courses/[courseId]/grades" as const;

/**
 * Where an authenticated session lands.
 *
 * Today is the intended destination, but it is still a placeholder, so landing
 * there would replace a working screen with an empty one. Courses is the
 * closest working equivalent to the switcher's previous default. Flip this to
 * `APP_ROUTES.today` when the Today surface ships.
 */
export const POST_SIGN_IN_ROUTE: AppRoute = APP_ROUTES.courses;

export interface CourseRouteInput {
  readonly courseId: string;
  readonly courseName: string;
}

/**
 * The index signature is required by Expo Router's param type. It is declared
 * narrowly as `string | undefined` so the named members stay meaningful rather
 * than degrading to an untyped bag.
 */
export interface CourseRouteParams {
  readonly [param: string]: string | undefined;
  readonly courseId: string;
  readonly courseName?: string;
}

/**
 * The course name travelled as switcher state before routing existed. It moves
 * into route params so a course screen can be restored from a URL, a deep link,
 * or a cold start rather than only from an in-memory transition.
 *
 * A blank name is omitted rather than sent as an empty param, so the screen
 * falls back to its own label instead of rendering nothing.
 */
export function courseRouteParams({
  courseId,
  courseName,
}: CourseRouteInput): CourseRouteParams {
  const trimmedName = courseName.trim();
  return {
    courseId: courseId.trim(),
    ...(trimmedName ? { courseName: trimmedName } : {}),
  };
}

/**
 * Router params arrive as `string | string[] | undefined` because a param can
 * legally repeat in a URL. Screens need one displayable string, and an absent
 * or blank name must not render as "undefined".
 */
export function readCourseNameParam(
  value: string | readonly string[] | undefined,
  fallback = "Course",
): string {
  const first = Array.isArray(value) ? value[0] : value;
  const trimmed = typeof first === "string" ? first.trim() : "";
  return trimmed || fallback;
}

export function readCourseIdParam(
  value: string | readonly string[] | undefined,
): string {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === "string" ? first.trim() : "";
}
