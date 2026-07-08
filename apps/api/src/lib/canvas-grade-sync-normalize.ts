import type {
  CanvasCourseGradeSummary,
  CanvasGradeAssignment,
  CanvasOwnSubmission,
  CanvasVisibleNumber,
  CanvasVisibleText,
} from "@stay-focused/canvas";
import type {
  CanvasAssignmentNormalizedStatus,
  CanvasAssignmentSubmissionWorkflowState,
  CanvasGradeVisibilityState,
  CanvasLatePolicyStatus,
  Json,
} from "@stay-focused/db";

import {
  CANVAS_COURSE_GRADE_SUMMARY_FINGERPRINT_VERSION,
  fingerprintCanvasCourseGradeSummary,
  fingerprintCanvasGradeAssignmentSubmission,
  fingerprintCanvasGradeAssignmentSubmissionSnapshot,
} from "@/lib/canvas-grade-sync-fingerprint";

export const CANVAS_ASSIGNMENT_NORMALIZED_STATUSES = [
  "unknown",
  "excused",
  "unavailable",
  "locked",
  "missing",
  "graded_hidden",
  "graded",
  "submitted_late",
  "submitted",
  "late_unsubmitted",
  "available",
  "upcoming",
  "no_due_date",
] as const satisfies readonly CanvasAssignmentNormalizedStatus[];

export type CanvasGradeSyncFailureCode =
  | "canvas_connection_missing"
  | "canvas_course_not_found"
  | "canvas_course_not_selected"
  | "canvas_authentication_failed"
  | "canvas_permission_denied"
  | "canvas_rate_limited"
  | "canvas_timeout"
  | "canvas_unavailable"
  | "canvas_grade_sync_partial"
  | "canvas_grade_sync_failed"
  | "canvas_storage_failed"
  | "canvas_sync_in_progress"
  | "invalid_request";

interface SyncJsonObject {
  readonly [key: string]: Json | undefined;
}

export interface CanvasGradeSyncAssignmentSubmissionPayloadWithoutFingerprint
  extends SyncJsonObject {
  readonly canvas_assignment_id: string;
  readonly canvas_assignment_group_id: string | null;
  readonly name: string;
  readonly points_possible: number | null;
  readonly grading_type: string | null;
  readonly submission_types: readonly string[];
  readonly due_at: string | null;
  readonly unlock_at: string | null;
  readonly lock_at: string | null;
  readonly published: boolean | null;
  readonly muted: boolean | null;
  readonly omit_from_final_grade: boolean | null;
  readonly quiz_id: string | null;
  readonly discussion_topic_id: string | null;
  readonly workflow_state: CanvasAssignmentSubmissionWorkflowState | null;
  readonly normalized_status: CanvasAssignmentNormalizedStatus;
  readonly submitted_at: string | null;
  readonly graded_at: string | null;
  readonly posted_at: string | null;
  readonly attempt: number | null;
  readonly submission_type: string | null;
  readonly grade_matches_current_submission: boolean | null;
  readonly late: boolean | null;
  readonly missing: boolean | null;
  readonly excused: boolean | null;
  readonly assignment_visible: boolean | null;
  readonly late_policy_status: CanvasLatePolicyStatus | null;
  readonly seconds_late: number | null;
  readonly score: number | null;
  readonly grade: string | null;
  readonly score_visibility_state: CanvasGradeVisibilityState;
  readonly grade_visibility_state: CanvasGradeVisibilityState;
  readonly points_possible_at_sync: number | null;
  readonly has_submission_evidence: boolean;
}

export interface CanvasGradeSyncAssignmentSubmissionPayload
  extends CanvasGradeSyncAssignmentSubmissionPayloadWithoutFingerprint {
  readonly source_fingerprint: string;
}

export interface CanvasGradeSyncAssignmentSubmissionSnapshotPayload {
  readonly assignments: readonly CanvasGradeSyncAssignmentSubmissionPayload[];
  readonly assignmentCount: number;
  readonly submissionEvidenceCount: number;
  readonly ignoredSubmissionEvidenceCount: number;
  readonly statusCounts: Record<CanvasAssignmentNormalizedStatus, number>;
  readonly snapshotFingerprint: string;
  readonly fingerprintVersion: string;
}

export interface CanvasGradeSyncCourseSummaryPayloadWithoutFingerprint
  extends SyncJsonObject {
  readonly current_score: number | null;
  readonly current_score_visibility_state: CanvasGradeVisibilityState;
  readonly current_grade: string | null;
  readonly current_grade_visibility_state: CanvasGradeVisibilityState;
  readonly final_score: number | null;
  readonly final_score_visibility_state: CanvasGradeVisibilityState;
  readonly final_grade: string | null;
  readonly final_grade_visibility_state: CanvasGradeVisibilityState;
}

export interface CanvasGradeSyncCourseSummaryPayload
  extends CanvasGradeSyncCourseSummaryPayloadWithoutFingerprint {
  readonly source_fingerprint: string;
  readonly fingerprintVersion: typeof CANVAS_COURSE_GRADE_SUMMARY_FINGERPRINT_VERSION;
  readonly visibleFieldCount: number;
  readonly notApplicable: boolean;
}

export interface CanvasAssignmentStatusInput {
  readonly assignment: Pick<
    CanvasGradeAssignment,
    | "assignmentVisible"
    | "canvasAssignmentId"
    | "dueAt"
    | "lockAt"
    | "published"
    | "title"
    | "unlockAt"
  >;
  readonly authoritative: boolean;
  readonly now: Date;
  readonly submission:
    | Pick<
        CanvasOwnSubmission,
        | "assignmentVisible"
        | "attempt"
        | "excused"
        | "grade"
        | "gradedAt"
        | "late"
        | "latePolicyStatus"
        | "missing"
        | "postedAt"
        | "score"
        | "submittedAt"
        | "workflowState"
      >
    | null;
}

export class CanvasGradeSyncNormalizationError extends Error {
  public readonly code = "canvas_grade_sync_failed";

  public constructor(message: string) {
    super(message);
    this.name = "CanvasGradeSyncNormalizationError";
  }
}

export function createCanvasGradeAssignmentSubmissionSnapshotPayload({
  assignments,
  authoritative = true,
  now = new Date(),
  submissions,
}: {
  readonly assignments: readonly CanvasGradeAssignment[];
  readonly authoritative?: boolean;
  readonly now?: Date;
  readonly submissions: readonly CanvasOwnSubmission[];
}): CanvasGradeSyncAssignmentSubmissionSnapshotPayload {
  const assignmentIds = new Set<string>();
  for (const assignment of assignments) {
    const id = requiredIdentifier(assignment.canvasAssignmentId, "assignment");
    if (assignmentIds.has(id)) {
      throw new CanvasGradeSyncNormalizationError(
        "duplicate Canvas assignment identity.",
      );
    }
    assignmentIds.add(id);
  }

  const submissionsByAssignment = new Map<string, CanvasOwnSubmission>();
  let ignoredSubmissionEvidenceCount = 0;
  for (const submission of submissions) {
    const id = requiredIdentifier(submission.canvasAssignmentId, "submission");
    if (!assignmentIds.has(id)) {
      ignoredSubmissionEvidenceCount += 1;
      continue;
    }
    if (submissionsByAssignment.has(id)) {
      throw new CanvasGradeSyncNormalizationError(
        "duplicate Canvas submission identity.",
      );
    }
    submissionsByAssignment.set(id, submission);
  }

  const payloads = [...assignments]
    .sort((left, right) =>
      left.canvasAssignmentId.localeCompare(right.canvasAssignmentId),
    )
    .map((assignment) => {
      const submission =
        submissionsByAssignment.get(assignment.canvasAssignmentId) ?? null;
      return mapAssignmentSubmissionPayload({
        assignment,
        authoritative,
        now,
        submission,
      });
    });

  const snapshot = fingerprintCanvasGradeAssignmentSubmissionSnapshot(payloads);
  return {
    assignments: payloads,
    assignmentCount: payloads.length,
    submissionEvidenceCount: submissionsByAssignment.size,
    ignoredSubmissionEvidenceCount,
    statusCounts: countAssignmentStatuses(payloads),
    snapshotFingerprint: snapshot.value,
    fingerprintVersion: snapshot.version,
  };
}

export function createCanvasCourseGradeSummaryPayload(
  summary: CanvasCourseGradeSummary,
): CanvasGradeSyncCourseSummaryPayload {
  const payloadWithoutFingerprint = {
    current_score: visibleNumberValue(summary.currentScore),
    current_score_visibility_state: visibilityState(summary.currentScore),
    current_grade: visibleTextValue(summary.currentGrade),
    current_grade_visibility_state: visibilityState(summary.currentGrade),
    final_score: visibleNumberValue(summary.finalScore),
    final_score_visibility_state: visibilityState(summary.finalScore),
    final_grade: visibleTextValue(summary.finalGrade),
    final_grade_visibility_state: visibilityState(summary.finalGrade),
  } satisfies CanvasGradeSyncCourseSummaryPayloadWithoutFingerprint;
  const fingerprint = fingerprintCanvasCourseGradeSummary(payloadWithoutFingerprint);
  const states = [
    payloadWithoutFingerprint.current_score_visibility_state,
    payloadWithoutFingerprint.current_grade_visibility_state,
    payloadWithoutFingerprint.final_score_visibility_state,
    payloadWithoutFingerprint.final_grade_visibility_state,
  ];

  return {
    ...payloadWithoutFingerprint,
    source_fingerprint: fingerprint.value,
    fingerprintVersion: fingerprint.version,
    visibleFieldCount: states.filter((state) => state === "visible").length,
    notApplicable: states.every(
      (state) => state === "unavailable" || state === "not_applicable",
    ),
  };
}

export function deriveCanvasAssignmentStatus({
  assignment,
  authoritative,
  now,
  submission,
}: CanvasAssignmentStatusInput): CanvasAssignmentNormalizedStatus {
  if (!authoritative || !isFiniteDate(now)) {
    return "unknown";
  }
  if (
    !nonBlankText(assignment.canvasAssignmentId) ||
    !nonBlankText(assignment.title)
  ) {
    return "unknown";
  }

  const dueAt = parseInstant(assignment.dueAt);
  const unlockAt = parseInstant(assignment.unlockAt);
  const lockAt = parseInstant(assignment.lockAt);
  if (!dueAt.ok || !unlockAt.ok || !lockAt.ok) {
    return "unknown";
  }
  if (
    unlockAt.value !== null &&
    lockAt.value !== null &&
    unlockAt.value > lockAt.value
  ) {
    return "unknown";
  }
  if (!isVisibilityWrapperValid(submission?.score ?? null)) {
    return "unknown";
  }
  if (!isVisibilityWrapperValid(submission?.grade ?? null)) {
    return "unknown";
  }

  const workflow = normalizeWorkflowState(submission?.workflowState ?? null);
  const unsupportedWorkflow =
    submission?.workflowState !== null &&
    submission?.workflowState !== undefined &&
    workflow === null;
  const latePolicyStatus = normalizeLatePolicyStatus(
    submission?.latePolicyStatus ?? null,
  );
  const unsupportedLatePolicy =
    submission?.latePolicyStatus !== null &&
    submission?.latePolicyStatus !== undefined &&
    latePolicyStatus === null;
  const late = submission?.late === true || latePolicyStatus === "late";
  const missing =
    submission?.missing === true || latePolicyStatus === "missing";
  const hasVisibleGrade =
    submission?.score.state === "visible" ||
    submission?.grade.state === "visible";
  const hasGradedWorkflowEvidence =
    workflow === "graded" ||
    submission?.gradedAt != null ||
    submission?.postedAt != null;
  const hasSubmittedEvidence =
    submission?.submittedAt != null ||
    workflow === "submitted" ||
    workflow === "pending_review" ||
    workflow === "graded" ||
    (typeof submission?.attempt === "number" && submission.attempt > 0);
  const hasGradeEvidence = hasVisibleGrade || hasGradedWorkflowEvidence;

  if (submission?.excused === true) {
    return "excused";
  }
  if (
    assignment.assignmentVisible === false ||
    assignment.published === false ||
    submission?.assignmentVisible === false
  ) {
    return "unavailable";
  }
  if (isLockedAfterClose({ lockAt: lockAt.value, now }) && !hasGradeEvidence && !hasSubmittedEvidence) {
    return "locked";
  }
  if (missing) {
    return "missing";
  }
  if (hasGradedWorkflowEvidence && !hasVisibleGrade) {
    return "graded_hidden";
  }
  if (hasVisibleGrade) {
    return "graded";
  }
  if (late && hasSubmittedEvidence) {
    return "submitted_late";
  }
  if (hasSubmittedEvidence) {
    return "submitted";
  }
  if (late) {
    return "late_unsubmitted";
  }
  if (unsupportedWorkflow || unsupportedLatePolicy) {
    return "unknown";
  }
  if (isFutureUnlockOrDue({ dueAt: dueAt.value, now, unlockAt: unlockAt.value })) {
    return "upcoming";
  }
  if (dueAt.value === null) {
    return "no_due_date";
  }
  return "available";
}

export function countAssignmentStatuses(
  payloads: readonly Pick<
    CanvasGradeSyncAssignmentSubmissionPayload,
    "normalized_status"
  >[],
): Record<CanvasAssignmentNormalizedStatus, number> {
  const counts = Object.fromEntries(
    CANVAS_ASSIGNMENT_NORMALIZED_STATUSES.map((status) => [status, 0]),
  ) as Record<CanvasAssignmentNormalizedStatus, number>;
  for (const payload of payloads) {
    counts[payload.normalized_status] += 1;
  }
  return counts;
}

function mapAssignmentSubmissionPayload({
  assignment,
  authoritative,
  now,
  submission,
}: {
  readonly assignment: CanvasGradeAssignment;
  readonly authoritative: boolean;
  readonly now: Date;
  readonly submission: CanvasOwnSubmission | null;
}): CanvasGradeSyncAssignmentSubmissionPayload {
  const normalizedStatus = deriveCanvasAssignmentStatus({
    assignment,
    authoritative,
    now,
    submission,
  });
  const payloadWithoutFingerprint = {
    canvas_assignment_id: requiredIdentifier(
      assignment.canvasAssignmentId,
      "assignment",
    ),
    canvas_assignment_group_id: nullableIdentifier(
      assignment.assignmentGroupId,
    ),
    name: requiredText(assignment.title, "assignment title"),
    points_possible: nullableNumber(assignment.pointsPossible),
    grading_type: nullableBoundedText(assignment.gradingType, 80),
    submission_types: [...assignment.submissionTypes]
      .map((type) => requiredText(type, "submission type"))
      .sort((left, right) => left.localeCompare(right)),
    due_at: nullableDate(assignment.dueAt),
    unlock_at: nullableDate(assignment.unlockAt),
    lock_at: nullableDate(assignment.lockAt),
    published: assignment.published,
    muted: assignment.muted,
    omit_from_final_grade: assignment.omitFromFinalGrade,
    quiz_id: nullableIdentifier(assignment.quizId),
    discussion_topic_id: nullableIdentifier(assignment.discussionTopicId),
    workflow_state: normalizeWorkflowState(submission?.workflowState ?? null),
    normalized_status: normalizedStatus,
    submitted_at: nullableDate(submission?.submittedAt ?? null),
    graded_at: nullableDate(submission?.gradedAt ?? null),
    posted_at: nullableDate(submission?.postedAt ?? null),
    attempt: nullableNonNegativeInteger(submission?.attempt ?? null),
    submission_type: nullableBoundedText(submission?.submissionType ?? null, 80),
    grade_matches_current_submission:
      submission?.gradeMatchesCurrentSubmission ?? null,
    late: submission?.late ?? null,
    missing: submission?.missing ?? null,
    excused: submission?.excused ?? null,
    assignment_visible:
      submission?.assignmentVisible ?? assignment.assignmentVisible ?? null,
    late_policy_status: normalizeLatePolicyStatus(
      submission?.latePolicyStatus ?? null,
    ),
    seconds_late: nullableNonNegativeInteger(submission?.secondsLate ?? null),
    score: visibleNumberValue(
      submission?.score ?? { state: "unknown", value: null },
    ),
    grade: visibleTextValue(
      submission?.grade ?? { state: "unknown", value: null },
    ),
    score_visibility_state: visibilityState(
      submission?.score ?? { state: "unknown", value: null },
    ),
    grade_visibility_state: visibilityState(
      submission?.grade ?? { state: "unknown", value: null },
    ),
    points_possible_at_sync: nullableNumber(assignment.pointsPossible),
    has_submission_evidence: submission !== null,
  } satisfies CanvasGradeSyncAssignmentSubmissionPayloadWithoutFingerprint;
  const fingerprint = fingerprintCanvasGradeAssignmentSubmission(
    payloadWithoutFingerprint,
  );
  return {
    ...payloadWithoutFingerprint,
    source_fingerprint: fingerprint.value,
  };
}

function visibilityState(
  wrapper: CanvasVisibleNumber | CanvasVisibleText,
): CanvasGradeVisibilityState {
  return wrapper.state;
}

function visibleNumberValue(wrapper: CanvasVisibleNumber): number | null {
  return wrapper.state === "visible" ? wrapper.value : null;
}

function visibleTextValue(wrapper: CanvasVisibleText): string | null {
  return wrapper.state === "visible" ? wrapper.value : null;
}

function isVisibilityWrapperValid(
  wrapper: CanvasVisibleNumber | CanvasVisibleText | null,
): boolean {
  if (wrapper === null) {
    return true;
  }
  if (wrapper.state === "visible") {
    if (typeof wrapper.value === "number") {
      return Number.isFinite(wrapper.value);
    }
    return typeof wrapper.value === "string";
  }
  return wrapper.value === null;
}

function normalizeWorkflowState(
  value: string | null,
): CanvasAssignmentSubmissionWorkflowState | null {
  const normalized = normalizeText(value);
  if (
    normalized === "submitted" ||
    normalized === "unsubmitted" ||
    normalized === "graded" ||
    normalized === "pending_review"
  ) {
    return normalized;
  }
  return null;
}

function normalizeLatePolicyStatus(
  value: string | null,
): CanvasLatePolicyStatus | null {
  const normalized = normalizeText(value);
  if (
    normalized === "late" ||
    normalized === "missing" ||
    normalized === "extended" ||
    normalized === "none"
  ) {
    return normalized;
  }
  return null;
}

function requiredIdentifier(value: string, label: string): string {
  const normalized = nullableIdentifier(value);
  if (normalized === null) {
    throw new CanvasGradeSyncNormalizationError(`${label} identifier missing.`);
  }
  return normalized;
}

function nullableIdentifier(value: string | null): string | null {
  return normalizeText(value);
}

function requiredText(value: string, label: string): string {
  const normalized = normalizeText(value);
  if (normalized === null) {
    throw new CanvasGradeSyncNormalizationError(`${label} missing.`);
  }
  return normalized;
}

function nullableBoundedText(
  value: string | null,
  maximumLength: number,
): string | null {
  const normalized = normalizeText(value);
  if (normalized === null) {
    return null;
  }
  if (normalized.length > maximumLength) {
    throw new CanvasGradeSyncNormalizationError("text value too large.");
  }
  return normalized;
}

function normalizeText(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function nullableDate(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new CanvasGradeSyncNormalizationError("timestamp value invalid.");
  }
  return new Date(parsed).toISOString();
}

function nullableNumber(value: number | null): number | null {
  if (value === null) {
    return null;
  }
  if (!Number.isFinite(value)) {
    throw new CanvasGradeSyncNormalizationError("numeric value invalid.");
  }
  return value;
}

function nullableNonNegativeInteger(value: number | null): number | null {
  if (value === null) {
    return null;
  }
  if (!Number.isInteger(value) || value < 0) {
    throw new CanvasGradeSyncNormalizationError("integer value invalid.");
  }
  return value;
}

function parseInstant(
  value: string | null,
): { readonly ok: true; readonly value: number | null } | { readonly ok: false } {
  if (value === null) {
    return { ok: true, value: null };
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? { ok: true, value: parsed } : { ok: false };
}

function isLockedAfterClose({
  lockAt,
  now,
}: {
  readonly lockAt: number | null;
  readonly now: Date;
}): boolean {
  return lockAt !== null && lockAt <= now.getTime();
}

function isFutureUnlockOrDue({
  dueAt,
  now,
  unlockAt,
}: {
  readonly dueAt: number | null;
  readonly now: Date;
  readonly unlockAt: number | null;
}): boolean {
  const nowMs = now.getTime();
  return (
    (unlockAt !== null && unlockAt > nowMs) ||
    (dueAt !== null && dueAt > nowMs)
  );
}

function nonBlankText(value: string | null | undefined): boolean {
  return normalizeText(value) !== null;
}

function isFiniteDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}
