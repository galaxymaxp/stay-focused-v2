import { createHash } from "node:crypto";

import type { Json } from "@stay-focused/db";

import type {
  CanvasGradeSyncAssignmentSubmissionPayload,
  CanvasGradeSyncAssignmentSubmissionPayloadWithoutFingerprint,
  CanvasGradeSyncCourseSummaryPayload,
  CanvasGradeSyncCourseSummaryPayloadWithoutFingerprint,
} from "@/lib/canvas-grade-sync-normalize";

export const CANVAS_GRADE_ASSIGNMENT_SUBMISSION_FINGERPRINT_VERSION =
  "canvas-grade-assignment-submission-v1";
export const CANVAS_GRADE_ASSIGNMENT_SUBMISSION_SNAPSHOT_FINGERPRINT_VERSION =
  "canvas-grade-assignment-submission-snapshot-v1";
export const CANVAS_COURSE_GRADE_SUMMARY_FINGERPRINT_VERSION =
  "canvas-course-grade-summary-v1";

export interface CanvasGradeSyncFingerprint<TVersion extends string> {
  readonly value: string;
  readonly version: TVersion;
}

export function fingerprintCanvasGradeAssignmentSubmission(
  payload: CanvasGradeSyncAssignmentSubmissionPayloadWithoutFingerprint,
): CanvasGradeSyncFingerprint<
  typeof CANVAS_GRADE_ASSIGNMENT_SUBMISSION_FINGERPRINT_VERSION
> {
  return {
    value: hashCanonical(
      CANVAS_GRADE_ASSIGNMENT_SUBMISSION_FINGERPRINT_VERSION,
      payload,
    ),
    version: CANVAS_GRADE_ASSIGNMENT_SUBMISSION_FINGERPRINT_VERSION,
  };
}

export function fingerprintCanvasGradeAssignmentSubmissionSnapshot(
  payloads: readonly CanvasGradeSyncAssignmentSubmissionPayload[],
): CanvasGradeSyncFingerprint<
  typeof CANVAS_GRADE_ASSIGNMENT_SUBMISSION_SNAPSHOT_FINGERPRINT_VERSION
> {
  const normalized = [...payloads]
    .map((payload) => pickKnownFields(payload, ASSIGNMENT_SUBMISSION_FIELDS))
    .sort((left, right) =>
      String(left.canvas_assignment_id).localeCompare(
        String(right.canvas_assignment_id),
      ),
    );

  return {
    value: hashCanonical(
      CANVAS_GRADE_ASSIGNMENT_SUBMISSION_SNAPSHOT_FINGERPRINT_VERSION,
      normalized,
    ),
    version: CANVAS_GRADE_ASSIGNMENT_SUBMISSION_SNAPSHOT_FINGERPRINT_VERSION,
  };
}

export function fingerprintCanvasCourseGradeSummary(
  payload: CanvasGradeSyncCourseSummaryPayloadWithoutFingerprint,
): CanvasGradeSyncFingerprint<
  typeof CANVAS_COURSE_GRADE_SUMMARY_FINGERPRINT_VERSION
> {
  return {
    value: hashCanonical(CANVAS_COURSE_GRADE_SUMMARY_FINGERPRINT_VERSION, payload),
    version: CANVAS_COURSE_GRADE_SUMMARY_FINGERPRINT_VERSION,
  };
}

export function pickCourseGradeSummaryFingerprintPayload(
  payload: CanvasGradeSyncCourseSummaryPayload,
): CanvasGradeSyncCourseSummaryPayloadWithoutFingerprint {
  return {
    current_score: payload.current_score,
    current_score_visibility_state: payload.current_score_visibility_state,
    current_grade: payload.current_grade,
    current_grade_visibility_state: payload.current_grade_visibility_state,
    final_score: payload.final_score,
    final_score_visibility_state: payload.final_score_visibility_state,
    final_grade: payload.final_grade,
    final_grade_visibility_state: payload.final_grade_visibility_state,
  };
}

function hashCanonical(version: string, payload: unknown): string {
  return createHash("sha256")
    .update(version)
    .update("\n")
    .update(canonicalSerialize(payload))
    .digest("hex");
}

export function canonicalSerialize(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (value === undefined) {
    return ["undefined"];
  }
  if (value === null) {
    return ["null"];
  }
  if (typeof value === "string") {
    return ["string", value];
  }
  if (typeof value === "number") {
    return ["number", value];
  }
  if (typeof value === "boolean") {
    return ["boolean", value];
  }
  if (Array.isArray(value)) {
    return ["array", value.map(canonicalize)];
  }
  if (isRecord(value)) {
    return [
      "object",
      Object.keys(value)
        .sort(compareScalar)
        .map((key) => [key, canonicalize(value[key])]),
    ];
  }
  return ["unsupported", String(value)];
}

function pickKnownFields<TField extends string>(
  value: Readonly<Record<string, unknown>>,
  fields: readonly TField[],
): Record<TField, Json | undefined> {
  const picked = {} as Record<TField, Json | undefined>;
  for (const field of fields) {
    picked[field] = value[field] as Json | undefined;
  }
  return picked;
}

function compareScalar(left: unknown, right: unknown): number {
  return String(left).localeCompare(String(right));
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const ASSIGNMENT_SUBMISSION_FIELDS = [
  "canvas_assignment_id",
  "canvas_assignment_group_id",
  "name",
  "points_possible",
  "grading_type",
  "submission_types",
  "due_at",
  "unlock_at",
  "lock_at",
  "published",
  "muted",
  "omit_from_final_grade",
  "quiz_id",
  "discussion_topic_id",
  "workflow_state",
  "normalized_status",
  "submitted_at",
  "graded_at",
  "posted_at",
  "attempt",
  "submission_type",
  "grade_matches_current_submission",
  "late",
  "missing",
  "excused",
  "assignment_visible",
  "late_policy_status",
  "seconds_late",
  "score",
  "grade",
  "score_visibility_state",
  "grade_visibility_state",
  "points_possible_at_sync",
  "has_submission_evidence",
  "source_fingerprint",
] as const satisfies readonly (keyof CanvasGradeSyncAssignmentSubmissionPayload)[];
