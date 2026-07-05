export interface CanvasProfile {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly sortableName: string | null;
  readonly shortName: string | null;
}

export interface CanvasCourse {
  readonly id: string;
  readonly name: string;
  readonly courseCode: string | null;
  readonly workflowState: string | null;
  readonly enrollmentTermId: string | null;
  readonly startAt: string | null;
  readonly endAt: string | null;
}

export type CanvasCapability =
  | "profile"
  | "courses"
  | "enrollments"
  | "syllabus"
  | "modules"
  | "pages"
  | "files"
  | "assignments"
  | "assignment_groups"
  | "submissions"
  | "grades"
  | "grading_periods"
  | "rubrics"
  | "announcements"
  | "discussions"
  | "classic_quizzes"
  | "new_quizzes"
  | "planner"
  | "calendar"
  | "learning_object_dates"
  | "outcomes"
  | "media_captions"
  | "conversations"
  | "history"
  | "what_if_grades";

export type CanvasCapabilityStatus =
  | "available"
  | "permission_denied"
  | "not_enabled"
  | "not_supported"
  | "temporarily_failed"
  | "not_tested";

export interface CanvasCapabilityProbeResult {
  readonly capability: CanvasCapability;
  readonly status: CanvasCapabilityStatus;
  readonly testedAt: string | null;
  readonly safeErrorCode: string | null;
  readonly courseId: string | null;
  readonly integrationVersion: string;
}

export type CanvasClientErrorCode =
  | "invalid_base_url"
  | "missing_access_token"
  | "canvas_unauthorized"
  | "canvas_forbidden"
  | "canvas_rate_limited"
  | "canvas_unavailable"
  | "canvas_timeout"
  | "canvas_malformed_json"
  | "canvas_invalid_response"
  | "canvas_pagination_rejected"
  | "canvas_request_failed";

export interface CanvasClientOptions {
  readonly baseUrl: string;
  readonly personalAccessToken: string;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
  readonly maxPages?: number;
  readonly allowHttpForTesting?: boolean;
  readonly now?: () => Date;
}
