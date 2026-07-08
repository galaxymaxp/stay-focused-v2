import { CanvasClientError } from "@stay-focused/canvas";
import type {
  CanvasClient,
  CanvasCourseGradeSummary,
  CanvasGradeAssignment,
  CanvasOwnSubmission,
} from "@stay-focused/canvas";
import type {
  CanvasConnectionRow,
  CanvasCourseRow,
  Database,
} from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { syncCanvasCourseGrades } from "@/lib/canvas-grade-sync";

type Dependencies = NonNullable<
  Parameters<typeof syncCanvasCourseGrades>[0]["dependencies"]
>;

const client = {} as SupabaseClient<Database>;

describe("syncCanvasCourseGrades", () => {
  it("synchronizes an owned selected course and returns only safe aggregates", async () => {
    const captured = createCapturedPersistence();
    const logger = { info: vi.fn(), warn: vi.fn() };
    const result = await syncCanvasCourseGrades({
      client,
      courseId: "course-row-1",
      userId: "user-1",
      dependencies: baseDependencies({
        logger,
        persistAssignmentSubmissionSnapshot: captured.persistAssignment,
        persistCourseGradeSummary: captured.persistSummary,
      }),
    });
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({
      assignmentSubmission: {
        assignmentCount: 1,
        persistedCount: 1,
        status: "succeeded",
        submissionEvidenceCount: 1,
      },
      courseGradeSummary: {
        status: "succeeded",
        visibleFieldCount: 2,
      },
      status: "succeeded",
    });
    expect(captured.assignmentSnapshots).toHaveLength(1);
    expect(captured.summaryPayloads).toHaveLength(1);
    expect(serialized).not.toContain("Private Fictional Assignment");
    expect(serialized).not.toContain("canvas-course-1");
    expect(serialized).not.toContain("secret-token");
    expect(serialized).not.toMatch(/body|comments|attachments|rubric|grader|preview|unposted/i);
    expect(JSON.stringify(captured.assignmentSnapshots[0])).not.toMatch(
      /body|comments|attachments|rubric|grader|preview|unposted|secret-token/i,
    );
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain("course-row-1");
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain("secret-token");
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it.each([
    [
      "missing connection",
      {
        category: "resource_not_found" as const,
        code: "canvas_connection_missing" as const,
      },
    ],
    [
      "cross-user course",
      {
        category: "resource_not_found" as const,
        code: "canvas_course_not_found" as const,
      },
    ],
    [
      "unselected course",
      {
        category: "resource_not_found" as const,
        code: "canvas_course_not_selected" as const,
      },
    ],
    [
      "connection ownership mismatch",
      {
        category: "authentication_failure" as const,
        code: "canvas_authentication_failed" as const,
      },
    ],
  ])("fails safely before Canvas calls for %s", async (_name, failure) => {
    const createCanvasClient = vi.fn();
    const result = await syncCanvasCourseGrades({
      client,
      courseId: "course-row-1",
      userId: "user-1",
      dependencies: {
        createCanvasClient,
        loadContext: async () => ({ ok: false, failure }),
        now: fixedClock(),
      },
    });

    expect(result.status).toBe("failed");
    expect(result.assignmentSubmission.failureCode).toBe(failure.code);
    expect(JSON.stringify(result)).not.toMatch(/secret-token|canvas-user|stack/i);
    expect(createCanvasClient).not.toHaveBeenCalled();
  });

  it("rejects overlapping non-stale grade sync before Canvas calls", async () => {
    const createCanvasClient = vi.fn();
    const result = await syncCanvasCourseGrades({
      client,
      courseId: "course-row-1",
      userId: "user-1",
      dependencies: baseDependencies({
        beginSync: async () => ({
          ok: false,
          failure: {
            category: "partial_sync",
            code: "canvas_sync_in_progress",
          },
        }),
        createCanvasClient,
      }),
    });

    expect(result.status).toBe("failed");
    expect(result.assignmentSubmission.failureCode).toBe("canvas_sync_in_progress");
    expect(createCanvasClient).not.toHaveBeenCalled();
  });

  it("preserves assignment snapshot when assignment retrieval fails but summary succeeds", async () => {
    const persistAssignment = vi.fn();
    const result = await syncCanvasCourseGrades({
      client,
      courseId: "course-row-1",
      userId: "user-1",
      dependencies: baseDependencies({
        canvas: {
          getOwnCourseGradeSummary: vi.fn(async () => summary()),
          listCourseAssignments: vi.fn(async () => {
            throw new CanvasClientError(
              "canvas_rate_limited",
              "Canvas rate limit.",
            );
          }),
          listOwnCourseSubmissions: vi.fn(),
        },
        persistAssignmentSubmissionSnapshot: persistAssignment,
      }),
    });

    expect(result.status).toBe("partial");
    expect(result.assignmentSubmission).toMatchObject({
      failureCode: "canvas_rate_limited",
      status: "failed",
    });
    expect(result.courseGradeSummary.status).toBe("succeeded");
    expect(persistAssignment).not.toHaveBeenCalled();
  });

  it("does not persist a partial assignment family when submissions fail after assignments succeed", async () => {
    const persistAssignment = vi.fn();
    const result = await syncCanvasCourseGrades({
      client,
      courseId: "course-row-1",
      userId: "user-1",
      dependencies: baseDependencies({
        canvas: {
          getOwnCourseGradeSummary: vi.fn(async () => summary()),
          listCourseAssignments: vi.fn(async () => [assignment()]),
          listOwnCourseSubmissions: vi.fn(async () => {
            throw new CanvasClientError(
              "canvas_pagination_rejected",
              "Unsafe pagination.",
            );
          }),
        },
        persistAssignmentSubmissionSnapshot: persistAssignment,
      }),
    });

    expect(result.status).toBe("partial");
    expect(result.assignmentSubmission.failureCode).toBe("canvas_grade_sync_failed");
    expect(result.courseGradeSummary.status).toBe("succeeded");
    expect(persistAssignment).not.toHaveBeenCalled();
  });

  it("keeps successful assignment data current when course summary fails", async () => {
    const result = await syncCanvasCourseGrades({
      client,
      courseId: "course-row-1",
      userId: "user-1",
      dependencies: baseDependencies({
        canvas: {
          getOwnCourseGradeSummary: vi.fn(async () => {
            throw new CanvasClientError(
              "canvas_unavailable",
              "Canvas unavailable.",
            );
          }),
          listCourseAssignments: vi.fn(async () => [assignment()]),
          listOwnCourseSubmissions: vi.fn(async () => [submission()]),
        },
      }),
    });

    expect(result.status).toBe("partial");
    expect(result.assignmentSubmission.status).toBe("succeeded");
    expect(result.courseGradeSummary).toMatchObject({
      failureCode: "canvas_unavailable",
      status: "failed",
    });
  });

  it("reports storage failure without exposing SQL errors or replacing failed family data", async () => {
    const result = await syncCanvasCourseGrades({
      client,
      courseId: "course-row-1",
      userId: "user-1",
      dependencies: baseDependencies({
        persistAssignmentSubmissionSnapshot: async () => ({
          ok: false,
          failure: {
            category: "persistence_failure",
            code: "canvas_storage_failed",
          },
        }),
      }),
    });

    expect(result.status).toBe("partial");
    expect(result.assignmentSubmission).toMatchObject({
      failureCode: "canvas_storage_failed",
      persistedCount: 0,
      status: "failed",
    });
    expect(JSON.stringify(result).toLowerCase()).not.toContain("duplicate key");
  });

  it("returns unchanged families for repeated identical persistence diagnostics", async () => {
    const result = await syncCanvasCourseGrades({
      client,
      courseId: "course-row-1",
      userId: "user-1",
      dependencies: baseDependencies({
        persistAssignmentSubmissionSnapshot: async () => ({
          ok: true,
          value: {
            inserted: 0,
            markedAbsent: 0,
            persistedCount: 1,
            unchanged: 1,
            updated: 0,
          },
        }),
        persistCourseGradeSummary: async () => ({
          ok: true,
          value: {
            inserted: 0,
            unchanged: 1,
            updated: 0,
            visibleFieldCount: 2,
          },
        }),
      }),
    });

    expect(result.status).toBe("succeeded");
    expect(result.assignmentSubmission.status).toBe("unchanged");
    expect(result.courseGradeSummary.status).toBe("unchanged");
  });
});

function baseDependencies(
  overrides: Partial<Dependencies> & {
    readonly canvas?: ReturnType<typeof fakeCanvas>;
  } = {},
): Dependencies {
  const canvas = overrides.canvas ?? fakeCanvas();
  return {
    beginSync:
      overrides.beginSync ??
      (async () => ({
        ok: true,
        state: {
          lastCheckedAt: "2026-07-08T12:00:00.000Z",
          lastSuccessfulSyncAt: null,
        },
      })),
    createCanvasClient: overrides.createCanvasClient ?? vi.fn(() => canvas),
    finishSync:
      overrides.finishSync ??
      (async (input) => ({
        ok: true,
        state: {
          lastCheckedAt: input.completedAt,
          lastSuccessfulSyncAt:
            input.assignmentFamilyState === "succeeded" &&
            input.submissionFamilyState === "succeeded"
              ? input.completedAt
              : null,
        },
      })),
    loadContext:
      overrides.loadContext ??
      (async () => ({
        ok: true,
        value: {
          connection: connection(),
          course: course(),
          token: "secret-token",
        },
      })),
    logger: overrides.logger,
    now: overrides.now ?? fixedClock(),
    persistAssignmentSubmissionSnapshot:
      overrides.persistAssignmentSubmissionSnapshot ??
      (async () => ({
        ok: true,
        value: {
          inserted: 1,
          markedAbsent: 0,
          persistedCount: 1,
          unchanged: 0,
          updated: 0,
        },
      })),
    persistCourseGradeSummary:
      overrides.persistCourseGradeSummary ??
      (async () => ({
        ok: true,
        value: {
          inserted: 1,
          unchanged: 0,
          updated: 0,
          visibleFieldCount: 2,
        },
      })),
  };
}

function createCapturedPersistence(): {
  readonly assignmentSnapshots: unknown[];
  readonly persistAssignment: Dependencies["persistAssignmentSubmissionSnapshot"];
  readonly persistSummary: Dependencies["persistCourseGradeSummary"];
  readonly summaryPayloads: unknown[];
} {
  const assignmentSnapshots: unknown[] = [];
  const summaryPayloads: unknown[] = [];
  return {
    assignmentSnapshots,
    persistAssignment: async ({ snapshot }) => {
      assignmentSnapshots.push(snapshot);
      return {
        ok: true,
        value: {
          inserted: 1,
          markedAbsent: 0,
          persistedCount: 1,
          unchanged: 0,
          updated: 0,
        },
      };
    },
    persistSummary: async ({ summary: payload }) => {
      summaryPayloads.push(payload);
      return {
        ok: true,
        value: {
          inserted: 1,
          unchanged: 0,
          updated: 0,
          visibleFieldCount: payload.visibleFieldCount,
        },
      };
    },
    summaryPayloads,
  };
}

function fakeCanvas(): {
  readonly getOwnCourseGradeSummary: Pick<
    CanvasClient,
    "getOwnCourseGradeSummary"
  >["getOwnCourseGradeSummary"];
  readonly listCourseAssignments: Pick<
    CanvasClient,
    "listCourseAssignments"
  >["listCourseAssignments"];
  readonly listOwnCourseSubmissions: Pick<
    CanvasClient,
    "listOwnCourseSubmissions"
  >["listOwnCourseSubmissions"];
} {
  return {
    getOwnCourseGradeSummary: vi.fn(async (_courseId: string) => summary()),
    listCourseAssignments: vi.fn(async (_courseId: string) => [assignment()]),
    listOwnCourseSubmissions: vi.fn(async (_courseId: string) => [
      {
        ...submission(),
        attachments: [{ display_name: "private.pdf" }],
        body: "private body",
        comments: ["private comment"],
        preview_url: "https://canvas.example.invalid/preview",
        rubric_assessment: { private: true },
        unposted_grade: "secret",
      },
    ]),
  };
}

function connection(
  overrides: Partial<CanvasConnectionRow> = {},
): CanvasConnectionRow {
  return {
    base_url: "https://canvas.example.invalid",
    canvas_user_email: null,
    canvas_user_id: "canvas-user",
    canvas_user_name: "Fictional User",
    created_at: "2026-07-08T00:00:00.000Z",
    encryption_version: "v1",
    id: "connection-1",
    last_error_code: null,
    last_verified_at: "2026-07-08T00:00:00.000Z",
    status: "active",
    token_auth_tag: "tag",
    token_ciphertext: "ciphertext",
    token_iv: "iv",
    updated_at: "2026-07-08T00:00:00.000Z",
    user_id: "user-1",
    ...overrides,
  };
}

function course(overrides: Partial<CanvasCourseRow> = {}): CanvasCourseRow {
  return {
    account_id: null,
    canvas_connection_id: "connection-1",
    canvas_course_id: "canvas-course-1",
    canvas_updated_at: null,
    course_code: "FC101",
    created_at: "2026-07-08T00:00:00.000Z",
    end_at: null,
    enrollment_term_id: null,
    first_synced_at: "2026-07-08T00:00:00.000Z",
    id: "course-row-1",
    last_synced_at: "2026-07-08T00:00:00.000Z",
    name: "Private Fictional Course",
    public_syllabus: false,
    start_at: null,
    syllabus_body: null,
    time_zone: "Asia/Manila",
    updated_at: "2026-07-08T00:00:00.000Z",
    user_id: "user-1",
    workflow_state: "available",
    ...overrides,
  };
}

function assignment(
  overrides: Partial<CanvasGradeAssignment> = {},
): CanvasGradeAssignment {
  return {
    allowedAttempts: null,
    allowedAttemptsUnlimited: null,
    assignmentGroupId: "group-1",
    assignmentVisible: true,
    canvasAssignmentId: "assignment-1",
    discussionTopicId: null,
    dueAt: "2026-07-09T00:00:00.000Z",
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
    title: "Private Fictional Assignment",
    unlockAt: null,
    ...overrides,
  };
}

function submission(overrides: Partial<CanvasOwnSubmission> = {}): CanvasOwnSubmission {
  return {
    assignmentVisible: true,
    attempt: 1,
    canvasAssignmentId: "assignment-1",
    excused: null,
    grade: { state: "visible", value: "" },
    gradeMatchesCurrentSubmission: true,
    gradedAt: null,
    late: false,
    latePolicyStatus: null,
    missing: false,
    postedAt: null,
    score: { state: "visible", value: 0 },
    secondsLate: null,
    submittedAt: "2026-07-08T01:00:00.000Z",
    submissionType: "online_upload",
    workflowState: "submitted",
    ...overrides,
  };
}

function summary(
  overrides: Partial<CanvasCourseGradeSummary> = {},
): CanvasCourseGradeSummary {
  return {
    currentGrade: { state: "visible", value: "" },
    currentScore: { state: "visible", value: 0 },
    finalGrade: { state: "hidden", value: null },
    finalScore: { state: "hidden", value: null },
    ...overrides,
  };
}

function fixedClock(): () => Date {
  let tick = 0;
  return () => new Date(Date.parse("2026-07-08T12:00:00.000Z") + tick++ * 1000);
}
