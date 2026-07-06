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
  readonly accountId: string | null;
  readonly startAt: string | null;
  readonly endAt: string | null;
  readonly timeZone: string | null;
  readonly publicSyllabus: boolean | null;
  readonly syllabusBody: string | null;
  readonly updatedAt: string | null;
}

export interface CanvasModule {
  readonly id: string;
  readonly name: string;
  readonly position: number | null;
  readonly unlockAt: string | null;
  readonly itemCount: number | null;
  readonly requireSequentialProgress: boolean | null;
  readonly published: boolean | null;
  readonly prerequisiteModuleIds: readonly string[];
  readonly state: string | null;
}

export interface CanvasModuleItem {
  readonly id: string;
  readonly title: string;
  readonly position: number | null;
  readonly indent: number | null;
  readonly type: string;
  readonly contentId: string | null;
  readonly pageUrl: string | null;
  readonly externalUrl: string | null;
  readonly htmlUrl: string | null;
  readonly newTab: boolean | null;
  readonly published: boolean | null;
  readonly completionRequirement: CanvasCompletionRequirement | null;
  readonly contentDetails: CanvasModuleContentDetails | null;
}

export interface CanvasPageSummary {
  readonly pageId: string | null;
  readonly url: string;
  readonly title: string;
  readonly published: boolean | null;
  readonly frontPage: boolean | null;
  readonly editingRoles: string | null;
  readonly lockInfo: CanvasJsonObject | null;
  readonly unlockAt: string | null;
  readonly lockAt: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

export interface CanvasPageDetail extends CanvasPageSummary {
  readonly body: string | null;
}

export interface CanvasAssignmentGroup {
  readonly id: string;
  readonly name: string;
  readonly position: number | null;
  readonly groupWeight: number | null;
  readonly rules: CanvasJsonObject | null;
  readonly integrationData: CanvasJsonObject | null;
}

export interface CanvasAssignment {
  readonly id: string;
  readonly assignmentGroupId: string | null;
  readonly name: string;
  readonly description: string | null;
  readonly position: number | null;
  readonly pointsPossible: number | null;
  readonly gradingType: string | null;
  readonly submissionTypes: readonly CanvasAssignmentSubmissionType[];
  readonly dueAt: string | null;
  readonly unlockAt: string | null;
  readonly lockAt: string | null;
  readonly published: boolean | null;
  readonly muted: boolean | null;
  readonly omitFromFinalGrade: boolean | null;
  readonly anonymousGrading: boolean | null;
  readonly htmlUrl: string | null;
  readonly quizId: string | null;
  readonly discussionTopicId: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

export interface CanvasPlannerOverrideSummary {
  readonly id: string | null;
  readonly plannableType: string | null;
  readonly plannableId: string | null;
  readonly workflowState: string | null;
  readonly markedComplete: boolean | null;
  readonly dismissed: boolean | null;
  readonly deletedAt: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

export interface CanvasPlannerSubmissionState {
  readonly excused: boolean | null;
  readonly graded: boolean | null;
  readonly late: boolean | null;
  readonly missing: boolean | null;
  readonly needsGrading: boolean | null;
  readonly withFeedback: boolean | null;
}

export interface CanvasPlannerItem {
  readonly contextType: string | null;
  readonly contextCode: string | null;
  readonly courseId: string | null;
  readonly plannableId: string;
  readonly plannableType: string;
  readonly title: string | null;
  readonly plannerDate: string | null;
  readonly dueAt: string | null;
  readonly todoDate: string | null;
  readonly htmlUrl: string | null;
  readonly workflowState: string | null;
  readonly plannerOverride: CanvasPlannerOverrideSummary | null;
  readonly submission: CanvasPlannerSubmissionState | null;
}

export interface CanvasPlannerItemsListOptions {
  readonly startDate: string;
  readonly endDate: string;
  readonly contextCodes: readonly string[];
}

export interface CanvasAnnouncement {
  readonly id: string;
  readonly contextCode: string | null;
  readonly title: string;
  readonly message: string | null;
  readonly postedAt: string | null;
  readonly delayedPostAt: string | null;
  readonly lockAt: string | null;
  readonly todoDate: string | null;
  readonly workflowState: string | null;
  readonly published: boolean | null;
  readonly locked: boolean | null;
  readonly htmlUrl: string | null;
}

export interface CanvasAnnouncementsListOptions {
  readonly courseId: string;
  readonly startDate: string;
  readonly endDate: string;
}

export interface CanvasFile {
  readonly id: string;
  readonly folderId: string | null;
  readonly displayName: string | null;
  readonly filename: string | null;
  readonly contentType: string | null;
  readonly size: number | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
  readonly modifiedAt: string | null;
  readonly lockAt: string | null;
  readonly unlockAt: string | null;
  readonly locked: boolean | null;
  readonly hidden: boolean | null;
  readonly hiddenForUser: boolean | null;
  readonly visibilityLevel: string | null;
  readonly mediaClass: string | null;
  readonly mediaEntryId: string | null;
  readonly downloadUrl: string | null;
}

export interface CanvasFileDownloadOptions {
  readonly maxBytes: number;
  readonly timeoutMs: number;
  readonly maxRedirects: number;
}

export interface CanvasDownloadedFile {
  readonly bytes: Uint8Array;
  readonly byteLength: number;
  readonly contentType: string | null;
}

export type CanvasHostnameResolver = (
  hostname: string,
) => Promise<readonly string[]>;

export type CanvasNullableDate = string | null;

export type CanvasJson =
  | string
  | number
  | boolean
  | null
  | CanvasJsonObject
  | readonly CanvasJson[];

export interface CanvasJsonObject {
  readonly [key: string]: CanvasJson | undefined;
}

export type CanvasCompletionRequirement = CanvasJsonObject;

export type CanvasModuleContentDetails = CanvasJsonObject;

export type CanvasAssignmentSubmissionType =
  | "discussion_topic"
  | "online_quiz"
  | "on_paper"
  | "none"
  | "external_tool"
  | "online_text_entry"
  | "online_url"
  | "online_upload"
  | "media_recording"
  | "student_annotation"
  | (string & {});

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
  | "canvas_not_found"
  | "canvas_rate_limited"
  | "canvas_unavailable"
  | "canvas_timeout"
  | "canvas_network_error"
  | "canvas_malformed_json"
  | "canvas_invalid_response"
  | "canvas_redirect_rejected"
  | "canvas_pagination_rejected"
  | "canvas_file_download_failed"
  | "canvas_file_download_timeout"
  | "canvas_file_redirect_rejected"
  | "canvas_file_too_large"
  | "canvas_request_failed";

export interface CanvasClientOptions {
  readonly baseUrl: string;
  readonly personalAccessToken: string;
  readonly fetchImpl?: typeof fetch;
  readonly resolveHostname?: CanvasHostnameResolver;
  readonly timeoutMs?: number;
  readonly maxPages?: number;
  readonly allowHttpForTesting?: boolean;
  readonly now?: () => Date;
}
