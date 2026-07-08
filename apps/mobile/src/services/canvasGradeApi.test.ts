import { describe, expect, it, vi } from "vitest";

import {
  getCanvasCourseGradeAssignment,
  getCanvasCourseGradeSummary,
  getCanvasCourseGradeSyncStatus,
  listCanvasCourseGrades,
  syncCanvasCourseGrades,
  type CanvasNormalizedAssignmentStatus,
} from "./canvasApi";

const API_BASE_URL = "http://localhost:3000";
const COURSE_ID = "11111111-1111-4111-8111-111111111111";
const ASSIGNMENT_ID = "22222222-2222-4222-8222-222222222222";
type FetchMock = ReturnType<typeof vi.fn> & typeof fetch;

const NORMALIZED_STATUSES: readonly CanvasNormalizedAssignmentStatus[] = [
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
];

describe("Canvas mobile grade API client", () => {
  it("loads grade list, detail, summary, sync status, and sync response", async () => {
    const listFetch = createFetch(listResponse());
    await expect(
      listCanvasCourseGrades({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        courseId: COURSE_ID,
        fetchImpl: listFetch,
        limit: 25,
        offset: 2,
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        items: [{ id: ASSIGNMENT_ID, normalizedStatus: "graded" }],
        page: { limit: 25, offset: 2 },
      },
    });
    expect(lastRequest(listFetch)).toMatchObject({
      url: `${API_BASE_URL}/api/canvas/courses/${COURSE_ID}/grades?limit=25&offset=2`,
      init: {
        method: "GET",
        headers: { Authorization: "Bearer session-token" },
      },
    });

    const detailFetch = createFetch(detailResponse());
    await expect(
      getCanvasCourseGradeAssignment({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        assignmentId: ASSIGNMENT_ID,
        courseId: COURSE_ID,
        fetchImpl: detailFetch,
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        assignment: {
          id: ASSIGNMENT_ID,
          postedAt: "2026-07-08T00:00:00.000Z",
          sync: { status: "succeeded" },
        },
      },
    });
    expect(lastRequest(detailFetch).url).toBe(
      `${API_BASE_URL}/api/canvas/courses/${COURSE_ID}/grades/${ASSIGNMENT_ID}`,
    );

    await expect(
      getCanvasCourseGradeSummary({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        courseId: COURSE_ID,
        fetchImpl: createFetch(summaryResponse()),
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        summary: {
          currentScore: { state: "visible", value: 95 },
          finalGrade: { state: "hidden", value: null },
        },
      },
    });

    await expect(
      getCanvasCourseGradeSyncStatus({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        courseId: COURSE_ID,
        fetchImpl: createFetch({ ok: true, sync: syncStatus() }),
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: { status: "succeeded", stale: false },
    });

    const syncFetch = createFetch(syncResponse("succeeded"));
    await expect(
      syncCanvasCourseGrades({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        courseId: COURSE_ID,
        fetchImpl: syncFetch,
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        status: "succeeded",
        assignmentSubmission: { statusCounts: { graded: 1 } },
      },
    });
    expect(lastRequest(syncFetch)).toMatchObject({
      url: `${API_BASE_URL}/api/canvas/courses/${COURSE_ID}/grades/sync`,
      init: {
        method: "POST",
        headers: { Authorization: "Bearer session-token" },
      },
    });
    expect(lastRequest(syncFetch).init.body).toBeUndefined();
  });

  it("accepts visible wrappers and hidden wrappers with null values", async () => {
    await expect(
      listCanvasCourseGrades({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        courseId: COURSE_ID,
        fetchImpl: createFetch(
          listResponse([
            assignment({
              grade: { state: "hidden", value: null },
              score: { state: "visible", value: 8.5 },
            }),
          ]),
        ),
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        items: [
          {
            grade: { state: "hidden", value: null },
            score: { state: "visible", value: 8.5 },
          },
        ],
      },
    });
  });

  it("accepts every normalized assignment status", async () => {
    const result = await listCanvasCourseGrades({
      accessToken: "session-token",
      apiBaseUrl: API_BASE_URL,
      courseId: COURSE_ID,
      fetchImpl: createFetch(
        listResponse(
          NORMALIZED_STATUSES.map((status, index) =>
            assignment({
              id: `22222222-2222-4222-8222-2222222222${String(index).padStart(2, "0")}`,
              normalizedStatus: status,
            }),
          ),
        ),
      ),
    });

    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.data.items.map((item) => item.normalizedStatus)).toEqual(
        NORMALIZED_STATUSES,
      );
    }
  });

  it.each([
    [
      "hidden wrapper contains a value",
      () =>
        listResponse([
          assignment({ grade: { state: "hidden", value: "private grade" } }),
        ]),
    ],
    [
      "invalid normalized status",
      () => listResponse([assignment({ normalizedStatus: "done" as never })]),
    ],
    [
      "invalid timestamp",
      () => listResponse([assignment({ dueAt: "not-a-date" })]),
    ],
    [
      "malformed pagination",
      () => ({ ...listResponse(), page: { limit: 0, offset: 0, nextOffset: 0, hasMore: true } }),
    ],
    [
      "missing required keys",
      () => {
        const response = listResponse();
        const { items: _items, ...rest } = response;
        return rest;
      },
    ],
    ["unknown response shape", () => ({ ok: true, assignment: assignment() })],
    [
      "negative attempt",
      () => listResponse([assignment({ attempt: -1 })]),
    ],
    [
      "negative points possible",
      () => listResponse([assignment({ pointsPossible: -1 })]),
    ],
  ])("rejects malformed grade list responses: %s", async (_name, createBody) => {
    await expect(
      listCanvasCourseGrades({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        courseId: COURSE_ID,
        fetchImpl: createFetch(createBody()),
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "invalid_response" },
    });
  });

  it("rejects malformed detail, summary, status, and sync responses", async () => {
    await expect(
      getCanvasCourseGradeAssignment({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        assignmentId: ASSIGNMENT_ID,
        courseId: COURSE_ID,
        fetchImpl: createFetch({
          ok: true,
          assignment: { ...detailResponse().assignment, secondsLate: -1 },
        }),
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "invalid_response" },
    });

    await expect(
      getCanvasCourseGradeSummary({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        courseId: COURSE_ID,
        fetchImpl: createFetch({
          ok: true,
          summary: {
            ...summaryResponse().summary,
            currentScore: { state: "unavailable", value: 99 },
          },
        }),
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "invalid_response" },
    });

    await expect(
      getCanvasCourseGradeSyncStatus({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        courseId: COURSE_ID,
        fetchImpl: createFetch({
          ok: true,
          sync: { ...syncStatus(), status: "complete" },
        }),
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "invalid_response" },
    });

    await expect(
      syncCanvasCourseGrades({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        courseId: COURSE_ID,
        fetchImpl: createFetch({
          ...syncResponse("succeeded"),
          lastCheckedAt: "not-a-date",
        }),
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "invalid_response" },
    });
  });

  it("maps grade API failures safely", async () => {
    await expect(
      listCanvasCourseGrades({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        courseId: COURSE_ID,
        fetchImpl: createFetch(
          {
            ok: false,
            error: {
              code: "unauthorized",
              message: "Error: Bearer secret-token stack",
            },
          },
          401,
        ),
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "unauthorized", status: 401 },
    });

    await expect(
      listCanvasCourseGrades({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        courseId: COURSE_ID,
        fetchImpl: createFetch(
          {
            ok: false,
            error: {
              code: "canvas_course_not_selected",
              message: "Select this course.",
            },
          },
          400,
        ),
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "course_not_selected", status: 400 },
    });

    await expect(
      getCanvasCourseGradeAssignment({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        assignmentId: ASSIGNMENT_ID,
        courseId: COURSE_ID,
        fetchImpl: createFetch(
          {
            ok: false,
            error: {
              code: "canvas_assignment_not_found",
              message: "Not found.",
            },
          },
          404,
        ),
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "assignment_not_found", status: 404 },
    });

    await expect(
      syncCanvasCourseGrades({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        courseId: COURSE_ID,
        fetchImpl: createFetch(
          {
            ok: false,
            error: {
              code: "payload_too_large",
              message: "Too large.",
            },
          },
          413,
        ),
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "payload_too_large", status: 413 },
    });
  });

  it("handles network failure, abort handling, and partial sync responses", async () => {
    await expect(
      listCanvasCourseGrades({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        courseId: COURSE_ID,
        fetchImpl: vi.fn(async () => {
          throw new Error("offline");
        }) as FetchMock,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "network_error" },
    });

    await expect(
      listCanvasCourseGrades({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        courseId: COURSE_ID,
        fetchImpl: vi.fn(async () => {
          throw new DOMException("Aborted", "AbortError");
        }) as FetchMock,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "request_aborted" },
    });

    await expect(
      syncCanvasCourseGrades({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        courseId: COURSE_ID,
        fetchImpl: createFetch(syncResponse("partial")),
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        status: "partial",
        assignmentSubmission: { status: "failed", failureCode: "canvas_timeout" },
      },
    });
  });

  it("rejects invalid client-side pagination before fetch", async () => {
    const fetchImpl = vi.fn();

    await expect(
      listCanvasCourseGrades({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        courseId: COURSE_ID,
        fetchImpl,
        limit: 101,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "invalid_request" },
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

function createFetch(body: unknown, status = 200): FetchMock {
  return vi.fn(
    async (_url: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
      new Response(JSON.stringify(body), {
        headers: { "content-type": "application/json" },
        status,
      }),
  ) as FetchMock;
}

function lastRequest(fetchImpl: FetchMock) {
  const call = fetchImpl.mock.calls.at(-1);
  if (!call) {
    throw new Error("fetch was not called");
  }
  return {
    url: String(call[0]),
    init: call[1] as RequestInit,
  };
}

function syncStatus() {
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

function assignment(
  overrides: Readonly<Record<string, unknown>> = {},
): ReturnType<typeof baseAssignment> {
  return { ...baseAssignment(), ...overrides };
}

function baseAssignment() {
  return {
    assignmentVisible: true,
    attempt: 1,
    dueAt: "2026-07-08T00:00:00.000Z",
    excused: false,
    grade: { state: "visible", value: "A" },
    gradedAt: "2026-07-08T00:00:00.000Z",
    gradingType: "points",
    id: ASSIGNMENT_ID,
    lastSyncedAt: "2026-07-08T00:00:00.000Z",
    late: false,
    lockAt: null,
    missing: false,
    normalizedStatus: "graded" as CanvasNormalizedAssignmentStatus,
    pointsPossible: 10,
    score: { state: "visible", value: 10 },
    submissionTypes: ["online_upload"],
    submittedAt: "2026-07-08T00:00:00.000Z",
    title: "Fictional Assignment",
    unlockAt: null,
    workflowState: "graded",
  };
}

function listResponse(items = [assignment()]) {
  return {
    ok: true,
    items,
    page: {
      hasMore: false,
      limit: 25,
      nextOffset: null,
      offset: 2,
    },
    sync: syncStatus(),
  };
}

function detailResponse() {
  return {
    ok: true,
    assignment: {
      ...assignment(),
      allowedAttempts: null,
      gradeMatchesCurrentSubmission: true,
      hideInGradebook: null,
      latePolicyStatus: "none",
      pointsPossibleAtSync: 10,
      postManually: null,
      postedAt: "2026-07-08T00:00:00.000Z",
      secondsLate: 0,
      submissionType: "online_upload",
      sync: syncStatus(),
    },
  };
}

function summaryResponse() {
  return {
    ok: true,
    summary: {
      currentGrade: { state: "visible", value: "A" },
      currentScore: { state: "visible", value: 95 },
      finalGrade: { state: "hidden", value: null },
      finalScore: { state: "not_applicable", value: null },
      lastSyncedAt: "2026-07-08T00:00:00.000Z",
      sync: syncStatus(),
    },
  };
}

function syncResponse(status: "succeeded" | "partial" | "failed") {
  return {
    ok: true,
    assignmentSubmission: {
      assignmentCount: 1,
      failureCode: status === "partial" ? "canvas_timeout" : undefined,
      persistedCount: status === "partial" ? 0 : 1,
      status: status === "partial" ? "failed" : "succeeded",
      statusCounts: Object.fromEntries(
        NORMALIZED_STATUSES.map((normalizedStatus) => [
          normalizedStatus,
          normalizedStatus === "graded" ? 1 : 0,
        ]),
      ),
      submissionEvidenceCount: 1,
    },
    courseGradeSummary: {
      status: status === "failed" ? "failed" : "succeeded",
      visibleFieldCount: status === "failed" ? 0 : 1,
      ...(status === "failed" ? { failureCode: "canvas_unavailable" } : {}),
    },
    lastCheckedAt: "2026-07-08T00:00:00.000Z",
    lastSuccessfulSyncAt:
      status === "failed" ? null : "2026-07-08T00:00:00.000Z",
    status,
  };
}
