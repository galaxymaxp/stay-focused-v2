import { describe, expect, it } from "vitest";

import type {
  CanvasGradeAssignmentListItem,
  CanvasGradeSyncStatusPayload,
} from "../../services/canvasApi";
import {
  INITIAL_GRADE_READ_REQUESTS,
  POST_SYNC_REFRESH_REQUESTS,
  formatSyncGuidance,
  formatSyncStatusLabel,
  formatVisibleGrade,
  formatVisibleScore,
  getAssignmentStatusPresentation,
  isNetworkGradeError,
  mergeGradeAssignmentPages,
  shouldApplyGradeRequest,
  shouldReplaceAssignmentsAfterSync,
} from "./canvasGradePresentation";

describe("Canvas grade presentation model", () => {
  it("uses GET-only initial read operations and explicit post-sync refresh reads", () => {
    expect(INITIAL_GRADE_READ_REQUESTS).toEqual([
      "syncStatus",
      "summary",
      "assignmentList",
    ]);
    expect(INITIAL_GRADE_READ_REQUESTS).not.toContain("syncGrades");
    expect(POST_SYNC_REFRESH_REQUESTS).toEqual([
      "syncStatus",
      "summary",
      "firstAssignmentPage",
    ]);
  });

  it.each([
    ["unknown", "Unknown"],
    ["excused", "Excused"],
    ["missing", "Missing"],
    ["graded_hidden", "Grade hidden"],
    ["submitted_late", "Submitted late"],
    ["no_due_date", "No due date"],
  ] as const)("formats %s status honestly", (status, label) => {
    expect(getAssignmentStatusPresentation(status)).toMatchObject({ label });
  });

  it("keeps hidden and unknown grades separate from zeroes", () => {
    expect(formatVisibleScore({ state: "hidden", value: null }, 10)).toBe(
      "Score hidden in Canvas",
    );
    expect(formatVisibleGrade({ state: "unknown", value: null })).toBe(
      "Canvas has not provided a visible grade",
    );
    expect(formatVisibleScore({ state: "visible", value: 0 }, 10)).toBe("0 / 10");
    expect(formatVisibleGrade({ state: "not_applicable", value: null })).toBe(
      "Not applicable",
    );
  });

  it("represents never-synced, partial, stale, and failed sync states", () => {
    expect(formatSyncStatusLabel(sync({ status: "never_synced" }))).toBe(
      "Never synced",
    );
    expect(formatSyncGuidance(sync({ status: "never_synced" }))).toContain(
      "No grade synchronization",
    );
    expect(formatSyncStatusLabel(sync({ status: "partial" }))).toBe(
      "Latest sync partial",
    );
    expect(formatSyncGuidance(sync({ status: "partial" }))).toContain(
      "incomplete",
    );
    expect(formatSyncStatusLabel(sync({ stale: true }))).toBe(
      "Stale synchronized data",
    );
    expect(formatSyncGuidance(sync({ status: "failed" }))).toContain(
      "Already loaded data",
    );
  });

  it("appends paginated assignments without duplicates", () => {
    const first = [assignment("a"), assignment("b")];
    const second = [assignment("b"), assignment("c")];

    expect(mergeGradeAssignmentPages(first, second).map((item) => item.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("preserves prior rows after failed explicit sync when data is loaded", () => {
    expect(
      shouldReplaceAssignmentsAfterSync({
        loadedAssignmentCount: 2,
        syncStatus: "failed",
      }),
    ).toBe(false);
    expect(
      shouldReplaceAssignmentsAfterSync({
        loadedAssignmentCount: 2,
        syncStatus: "partial",
      }),
    ).toBe(true);
    expect(
      shouldReplaceAssignmentsAfterSync({
        loadedAssignmentCount: 0,
        syncStatus: "failed",
      }),
    ).toBe(true);
  });

  it("guards stale request results after unmount or course change", () => {
    expect(
      shouldApplyGradeRequest({
        activeCourseId: "course-a",
        latestRequestId: 2,
        requestCourseId: "course-a",
        requestId: 2,
      }),
    ).toBe(true);
    expect(
      shouldApplyGradeRequest({
        activeCourseId: "course-b",
        latestRequestId: 2,
        requestCourseId: "course-a",
        requestId: 2,
      }),
    ).toBe(false);
    expect(
      shouldApplyGradeRequest({
        activeCourseId: "course-a",
        latestRequestId: 3,
        requestCourseId: "course-a",
        requestId: 2,
      }),
    ).toBe(false);
  });

  it("marks network errors as non-destructive warnings", () => {
    expect(isNetworkGradeError({ code: "network_error", message: "Offline" })).toBe(
      true,
    );
    expect(
      isNetworkGradeError({ code: "canvas_grade_sync_failed", message: "Failed" }),
    ).toBe(false);
  });
});

function sync(
  overrides: Partial<CanvasGradeSyncStatusPayload> = {},
): CanvasGradeSyncStatusPayload {
  return { ...baseSync(), ...overrides };
}

function baseSync(): CanvasGradeSyncStatusPayload {
  return {
    assignmentSubmissionState: "succeeded",
    authoritativeAssignmentSubmission: true,
    courseGradeSummaryState: "succeeded",
    failureCode: null,
    lastCheckedAt: "2026-07-08T00:00:00.000Z",
    lastSuccessfulSyncAt: "2026-07-08T00:00:00.000Z",
    stale: false,
    status: "succeeded",
  };
}

function assignment(id: string): CanvasGradeAssignmentListItem {
  return {
    assignmentVisible: true,
    attempt: null,
    dueAt: null,
    excused: false,
    grade: { state: "unknown", value: null },
    gradedAt: null,
    gradingType: null,
    id,
    lastSyncedAt: null,
    late: false,
    lockAt: null,
    missing: false,
    normalizedStatus: "available",
    pointsPossible: null,
    score: { state: "unknown", value: null },
    submissionTypes: [],
    submittedAt: null,
    title: `Fictional ${id}`,
    unlockAt: null,
    workflowState: null,
  };
}
