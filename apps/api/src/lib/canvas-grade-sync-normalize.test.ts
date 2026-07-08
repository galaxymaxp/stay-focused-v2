import type {
  CanvasCourseGradeSummary,
  CanvasGradeAssignment,
  CanvasOwnSubmission,
} from "@stay-focused/canvas";
import { describe, expect, it } from "vitest";

import {
  CANVAS_ASSIGNMENT_NORMALIZED_STATUSES,
  CanvasGradeSyncNormalizationError,
  createCanvasCourseGradeSummaryPayload,
  createCanvasGradeAssignmentSubmissionSnapshotPayload,
  deriveCanvasAssignmentStatus,
} from "@/lib/canvas-grade-sync-normalize";

describe("Canvas grade sync normalization", () => {
  const now = new Date("2026-07-08T12:00:00.000Z");

  it.each([
    [
      "unknown",
      assignment({ dueAt: "not-a-date" }),
      null,
      "unknown",
    ],
    [
      "excused",
      assignment(),
      submission({ excused: true, late: true, missing: true }),
      "excused",
    ],
    [
      "unavailable",
      assignment({ assignmentVisible: false }),
      null,
      "unavailable",
    ],
    [
      "locked",
      assignment({ lockAt: "2026-07-07T00:00:00.000Z" }),
      null,
      "locked",
    ],
    [
      "missing",
      assignment(),
      submission({ missing: true }),
      "missing",
    ],
    [
      "graded_hidden",
      assignment(),
      submission({
        workflowState: "graded",
        score: { state: "hidden", value: null },
        grade: { state: "hidden", value: null },
      }),
      "graded_hidden",
    ],
    [
      "graded",
      assignment(),
      submission({ score: { state: "visible", value: 0 } }),
      "graded",
    ],
    [
      "submitted_late",
      assignment(),
      submission({ late: true, submittedAt: "2026-07-07T01:00:00.000Z" }),
      "submitted_late",
    ],
    [
      "submitted",
      assignment(),
      submission({ submittedAt: "2026-07-07T01:00:00.000Z" }),
      "submitted",
    ],
    [
      "late_unsubmitted",
      assignment(),
      submission({ late: true }),
      "late_unsubmitted",
    ],
    [
      "available",
      assignment({ dueAt: "2026-07-07T00:00:00.000Z" }),
      null,
      "available",
    ],
    [
      "upcoming",
      assignment({ dueAt: "2026-07-09T00:00:00.000Z" }),
      null,
      "upcoming",
    ],
    [
      "no_due_date",
      assignment({ dueAt: null }),
      null,
      "no_due_date",
    ],
  ])(
    "derives %s from conservative Canvas evidence",
    (_label, canvasAssignment, canvasSubmission, expected) => {
      expect(
        deriveCanvasAssignmentStatus({
          assignment: canvasAssignment,
          authoritative: true,
          now,
          submission: canvasSubmission,
        }),
      ).toBe(expected);
    },
  );

  it("exposes every allowed status in the canonical status list", () => {
    expect(CANVAS_ASSIGNMENT_NORMALIZED_STATUSES).toEqual([
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
    ]);
  });

  it("does not infer missing from due dates and compares timestamps as instants", () => {
    expect(
      deriveCanvasAssignmentStatus({
        assignment: assignment({ dueAt: "2026-07-08T21:00:00+09:00" }),
        authoritative: true,
        now,
        submission: null,
      }),
    ).toBe("available");

    expect(
      deriveCanvasAssignmentStatus({
        assignment: assignment({ dueAt: null }),
        authoritative: true,
        now,
        submission: null,
      }),
    ).toBe("no_due_date");
  });

  it("does not let locked state override submitted or graded evidence", () => {
    const locked = assignment({ lockAt: "2026-07-07T00:00:00.000Z" });

    expect(
      deriveCanvasAssignmentStatus({
        assignment: locked,
        authoritative: true,
        now,
        submission: submission({ submittedAt: "2026-07-06T01:00:00.000Z" }),
      }),
    ).toBe("submitted");
    expect(
      deriveCanvasAssignmentStatus({
        assignment: locked,
        authoritative: true,
        now,
        submission: submission({ grade: { state: "visible", value: "" } }),
      }),
    ).toBe("graded");
  });

  it("treats malformed or unsupported evidence as unknown unless stronger flags resolve it", () => {
    expect(
      deriveCanvasAssignmentStatus({
        assignment: assignment(),
        authoritative: true,
        now,
        submission: submission({ workflowState: "fictional_state" }),
      }),
    ).toBe("unknown");

    expect(
      deriveCanvasAssignmentStatus({
        assignment: assignment(),
        authoritative: true,
        now,
        submission: submission({
          excused: true,
          workflowState: "fictional_state",
        }),
      }),
    ).toBe("excused");
  });

  it("normalizes joined assignment and submission snapshots without unsafe payloads", () => {
    const snapshot = createCanvasGradeAssignmentSubmissionSnapshotPayload({
      assignments: [
        assignment({ canvasAssignmentId: "2", title: "Fictional B" }),
        assignment({ canvasAssignmentId: "1", title: "Fictional A" }),
      ],
      now,
      submissions: [
        submission({
          canvasAssignmentId: "1",
          score: { state: "visible", value: 0 },
          grade: { state: "visible", value: "" },
        }) as CanvasOwnSubmission & { body: string; comments: string[] },
        submission({ canvasAssignmentId: "outside-course" }),
      ],
    });

    expect(snapshot.assignmentCount).toBe(2);
    expect(snapshot.submissionEvidenceCount).toBe(1);
    expect(snapshot.ignoredSubmissionEvidenceCount).toBe(1);
    expect(snapshot.assignments.map((item) => item.canvas_assignment_id)).toEqual([
      "1",
      "2",
    ]);
    expect(snapshot.assignments[0]).toMatchObject({
      grade: "",
      grade_visibility_state: "visible",
      normalized_status: "graded",
      score: 0,
      score_visibility_state: "visible",
    });
    expect(JSON.stringify(snapshot)).not.toMatch(
      /body|comments|attachments|rubric|grader|preview|unposted/i,
    );
  });

  it("rejects duplicate authoritative assignment and submission identities", () => {
    expect(() =>
      createCanvasGradeAssignmentSubmissionSnapshotPayload({
        assignments: [assignment(), assignment()],
        now,
        submissions: [],
      }),
    ).toThrow(CanvasGradeSyncNormalizationError);

    expect(() =>
      createCanvasGradeAssignmentSubmissionSnapshotPayload({
        assignments: [assignment()],
        now,
        submissions: [submission(), submission()],
      }),
    ).toThrow(CanvasGradeSyncNormalizationError);
  });

  it("creates deterministic fingerprints that ignore response order and track status or score changes", () => {
    const first = createCanvasGradeAssignmentSubmissionSnapshotPayload({
      assignments: [
        assignment({ canvasAssignmentId: "2" }),
        assignment({ canvasAssignmentId: "1" }),
      ],
      now,
      submissions: [
        submission({ canvasAssignmentId: "1", late: true }),
        submission({
          canvasAssignmentId: "2",
          score: { state: "visible", value: 10 },
        }),
      ],
    });
    const reordered = createCanvasGradeAssignmentSubmissionSnapshotPayload({
      assignments: [
        assignment({ canvasAssignmentId: "1" }),
        assignment({ canvasAssignmentId: "2" }),
      ],
      now,
      submissions: [
        submission({
          canvasAssignmentId: "2",
          score: { state: "visible", value: 10 },
        }),
        submission({ canvasAssignmentId: "1", late: true }),
      ],
    });
    const changedScore = createCanvasGradeAssignmentSubmissionSnapshotPayload({
      assignments: [
        assignment({ canvasAssignmentId: "1" }),
        assignment({ canvasAssignmentId: "2" }),
      ],
      now,
      submissions: [
        submission({ canvasAssignmentId: "1", late: true }),
        submission({
          canvasAssignmentId: "2",
          score: { state: "visible", value: 9 },
        }),
      ],
    });
    const changedStatus = createCanvasGradeAssignmentSubmissionSnapshotPayload({
      assignments: [
        assignment({ canvasAssignmentId: "1" }),
        assignment({ canvasAssignmentId: "2" }),
      ],
      now,
      submissions: [
        submission({ canvasAssignmentId: "1", submittedAt: "2026-07-07T00:00:00Z" }),
        submission({
          canvasAssignmentId: "2",
          score: { state: "visible", value: 10 },
        }),
      ],
    });

    expect(reordered.snapshotFingerprint).toBe(first.snapshotFingerprint);
    expect(changedScore.snapshotFingerprint).not.toBe(first.snapshotFingerprint);
    expect(changedStatus.snapshotFingerprint).not.toBe(first.snapshotFingerprint);
  });

  it("maps course grade summary visibility without preserving hidden values", () => {
    const visible = createCanvasCourseGradeSummaryPayload({
      currentScore: { state: "visible", value: 0 },
      currentGrade: { state: "visible", value: "" },
      finalScore: { state: "hidden", value: null },
      finalGrade: { state: "unavailable", value: null },
    });
    const hidden = createCanvasCourseGradeSummaryPayload(summary());
    const hiddenAgain = createCanvasCourseGradeSummaryPayload(summary());

    expect(visible).toMatchObject({
      current_score: 0,
      current_score_visibility_state: "visible",
      current_grade: "",
      current_grade_visibility_state: "visible",
      final_score: null,
      final_score_visibility_state: "hidden",
      final_grade: null,
      final_grade_visibility_state: "unavailable",
      visibleFieldCount: 2,
    });
    expect(hidden.source_fingerprint).toBe(hiddenAgain.source_fingerprint);
    expect(hidden.notApplicable).toBe(false);
  });
});

function assignment(
  overrides: Partial<CanvasGradeAssignment> = {},
): CanvasGradeAssignment {
  return {
    allowedAttempts: null,
    allowedAttemptsUnlimited: null,
    assignmentGroupId: "group-1",
    assignmentVisible: true,
    canvasAssignmentId: "1",
    discussionTopicId: null,
    dueAt: "2026-07-07T00:00:00.000Z",
    gradingType: "points",
    hideInGradebook: null,
    lockAt: null,
    muted: false,
    omitFromFinalGrade: false,
    pointsPossible: 10,
    postManually: null,
    published: true,
    quizId: null,
    submissionTypes: ["online_upload"],
    title: "Fictional Assignment",
    unlockAt: null,
    ...overrides,
  };
}

function submission(
  overrides: Partial<CanvasOwnSubmission> = {},
): CanvasOwnSubmission {
  return {
    assignmentVisible: true,
    attempt: null,
    canvasAssignmentId: "1",
    excused: null,
    grade: { state: "unknown", value: null },
    gradeMatchesCurrentSubmission: null,
    gradedAt: null,
    late: null,
    latePolicyStatus: null,
    missing: null,
    postedAt: null,
    score: { state: "unknown", value: null },
    secondsLate: null,
    submittedAt: null,
    submissionType: null,
    workflowState: null,
    ...overrides,
  };
}

function summary(
  overrides: Partial<CanvasCourseGradeSummary> = {},
): CanvasCourseGradeSummary {
  return {
    currentGrade: { state: "hidden", value: null },
    currentScore: { state: "hidden", value: null },
    finalGrade: { state: "unavailable", value: null },
    finalScore: { state: "unavailable", value: null },
    ...overrides,
  };
}
