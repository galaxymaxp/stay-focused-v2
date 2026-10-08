// Public shapes of the Canvas grade routes, as apps/mobile/src/services/canvasApi.ts
// reads them. The grade routes answer with top-level envelopes.
export type CanvasNormalizedAssignmentStatus =
  | "unknown"
  | "excused"
  | "unavailable"
  | "locked"
  | "missing"
  | "graded_hidden"
  | "graded"
  | "submitted_late"
  | "submitted"
  | "late_unsubmitted"
  | "available"
  | "upcoming"
  | "no_due_date";

export type CanvasGradeVisibilityState =
  | "unknown"
  | "visible"
  | "hidden"
  | "unavailable"
  | "not_applicable";

export interface CanvasVisibleScore {
  readonly state: CanvasGradeVisibilityState;
  readonly value: number | null;
}

export interface CanvasVisibleGrade {
  readonly state: CanvasGradeVisibilityState;
  readonly value: string | null;
}

export interface CanvasGradeSyncStatusPayload {
  readonly status: "never_synced" | "running" | "succeeded" | "partial" | "failed";
  readonly assignmentSubmissionState: string;
  readonly courseGradeSummaryState: string;
  readonly authoritativeAssignmentSubmission: boolean;
  readonly lastCheckedAt: string | null;
  readonly lastSuccessfulSyncAt: string | null;
  readonly stale: boolean;
  readonly failureCode: string | null;
}

export interface CanvasGradeAssignmentListItem {
  readonly id: string;
  readonly title: string;
  readonly dueAt: string | null;
  readonly unlockAt: string | null;
  readonly lockAt: string | null;
  readonly pointsPossible: number | null;
  readonly gradingType: string | null;
  readonly submissionTypes: readonly string[];
  readonly normalizedStatus: CanvasNormalizedAssignmentStatus;
  readonly workflowState: string | null;
  readonly submittedAt: string | null;
  readonly gradedAt: string | null;
  readonly attempt: number | null;
  readonly late: boolean;
  readonly missing: boolean;
  readonly excused: boolean;
  readonly assignmentVisible: boolean | null;
  readonly score: CanvasVisibleScore;
  readonly grade: CanvasVisibleGrade;
  readonly lastSyncedAt: string | null;
}

export interface CanvasGradeAssignmentDetail extends CanvasGradeAssignmentListItem {
  readonly allowedAttempts: number | null;
  readonly hideInGradebook: boolean | null;
  readonly postManually: boolean | null;
  readonly submissionType: string | null;
  readonly postedAt: string | null;
  readonly secondsLate: number | null;
  readonly latePolicyStatus: string | null;
  readonly gradeMatchesCurrentSubmission: boolean | null;
  readonly pointsPossibleAtSync: number | null;
  readonly sync: CanvasGradeSyncStatusPayload;
}

export interface CanvasCourseGradeSummary {
  readonly currentScore: CanvasVisibleScore;
  readonly currentGrade: CanvasVisibleGrade;
  readonly finalScore: CanvasVisibleScore;
  readonly finalGrade: CanvasVisibleGrade;
  readonly lastSyncedAt: string | null;
  readonly sync: CanvasGradeSyncStatusPayload;
}

export interface CanvasGradeAssignmentListPayload {
  readonly items: readonly CanvasGradeAssignmentListItem[];
  readonly page: {
    readonly limit: number;
    readonly offset: number;
    readonly nextOffset: number | null;
    readonly hasMore: boolean;
  };
  readonly sync: CanvasGradeSyncStatusPayload;
}

export interface CanvasSyncJobStatusView {
  readonly id: string;
  readonly jobType: "course_content" | "course_grades";
  readonly status:
    | "queued"
    | "running"
    | "succeeded"
    | "failed"
    | "cancellation_requested"
    | "cancelled"
    | "expired";
  readonly stage: string;
  readonly outcome?: string | null;
  readonly retryable?: boolean;
  readonly progress: { readonly message: string };
  readonly updatedAt: string;
}

export interface CanvasApiClientError {
  readonly code: string;
  readonly message: string;
  readonly status?: number;
  readonly apiCode?: string;
}
