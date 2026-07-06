import { describe, expect, it, vi } from "vitest";

import {
  connectCanvas,
  disconnectCanvas,
  getCanvasCoursePreferences,
  getCanvasConnection,
  listCanvasCapabilities,
  listCanvasCourses,
  saveCanvasCoursePreferences,
  syncCanvasAcademicGraph,
  syncCanvasCourse,
  syncSelectedCanvasCourses,
} from "./canvasApi";

const API_BASE_URL = "http://localhost:3000";
type FetchMock = ReturnType<typeof vi.fn> & typeof fetch;

describe("Canvas mobile API client", () => {
  it("connects Canvas with bearer auth and clears token responsibility to caller", async () => {
    const fetchImpl = createFetch({
      ok: true,
      connection: connection(),
      courses: [course()],
      capabilities: [capability("courses", "available")],
    });

    const result = await connectCanvas({
      accessToken: "session-token",
      apiBaseUrl: API_BASE_URL,
      baseUrl: " https://canvas.test ",
      fetchImpl,
      personalAccessToken: " canvas-token ",
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        connection: { canvasUserName: "Ada Student" },
        courses: [{ name: "Biology 101" }],
      },
    });
    const request = lastRequest(fetchImpl);
    expect(request.url).toBe(`${API_BASE_URL}/api/canvas/connection`);
    expect(request.init.headers).toMatchObject({
      Authorization: "Bearer session-token",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(request.init.body))).toEqual({
      baseUrl: "https://canvas.test",
      personalAccessToken: "canvas-token",
    });
  });

  it("loads connection, courses, capabilities, and disconnects", async () => {
    await expect(
      getCanvasConnection({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        fetchImpl: createFetch({ ok: true, connection: connection() }),
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: { connection: { id: "connection-1" } },
    });

    await expect(
      listCanvasCourses({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        fetchImpl: createFetch({
          ok: true,
          courses: [inventoryCourse()],
          counts: {
            total: 1,
            likelyCurrent: 1,
            pastOrConcluded: 0,
            otherOrUncertain: 0,
            unavailable: 0,
          },
          selectedCourseIds: ["11111111-1111-4111-8111-111111111111"],
        }),
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        courses: [{ displayName: "Biology 101", classification: "likely_current" }],
        selectedCourseIds: ["11111111-1111-4111-8111-111111111111"],
      },
    });

    await expect(
      listCanvasCapabilities({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        fetchImpl: createFetch({
          ok: true,
          capabilities: [capability("modules", "permission_denied")],
        }),
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: [{ capability: "modules", status: "permission_denied" }],
    });

    await expect(
      disconnectCanvas({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        fetchImpl: createFetch({ ok: true }),
      }),
    ).resolves.toEqual({ ok: true, data: undefined });
  });

  it("runs academic graph sync with bearer auth and parses safe counts", async () => {
    const fetchImpl = createFetch({
      ok: true,
      status: "partial",
      mode: "full",
      syncWindow: {
        startDate: "2026-06-06T00:00:00.000Z",
        endDate: "2026-11-03T00:00:00.000Z",
      },
      courses: {
        discovered: 2,
        succeeded: 1,
        changed: 1,
        unchanged: 0,
        failed: 1,
      },
      plannerItems: {
        discovered: 2,
        inserted: 1,
        updated: 0,
        unchanged: 1,
        pruned: 0,
        failed: 0,
      },
      announcements: {
        discovered: 1,
        inserted: 1,
        updated: 0,
        unchanged: 0,
        pruned: 0,
        coursesSucceeded: 1,
        coursesFailed: 1,
      },
      files: {
        coursesSucceeded: 1,
        coursesFailed: 0,
        discovered: 3,
        inserted: 2,
        updated: 1,
        unchanged: 0,
        deactivated: 0,
        references: 4,
        referencesInserted: 4,
        referencesDeleted: 0,
        moduleFileReferences: 1,
        htmlFileReferences: 3,
        metadataOnly: 1,
        blocked: 1,
      },
      resources: {
        modules: 3,
        moduleItems: 8,
        pages: 2,
        assignmentGroups: 1,
        assignments: 4,
        plannerItems: 2,
        announcements: 1,
        files: 3,
        fileReferences: 4,
      },
      retryAttempts: 2,
      failures: [{ code: "canvas_unavailable", count: 1 }],
    });

    const result = await syncCanvasAcademicGraph({
      accessToken: "session-token",
      apiBaseUrl: API_BASE_URL,
      fetchImpl,
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        status: "partial",
        mode: "full",
        courses: {
          discovered: 2,
          succeeded: 1,
          changed: 1,
          unchanged: 0,
          failed: 1,
        },
        plannerItems: { discovered: 2, inserted: 1 },
        announcements: { discovered: 1, coursesFailed: 1 },
        files: { discovered: 3, references: 4, metadataOnly: 1 },
        resources: { moduleItems: 8, assignments: 4, files: 3 },
        retryAttempts: 2,
        failures: [{ code: "canvas_unavailable", count: 1 }],
      },
    });
    expect(lastRequest(fetchImpl)).toMatchObject({
      url: `${API_BASE_URL}/api/canvas/sync`,
      init: {
        method: "POST",
        headers: { Authorization: "Bearer session-token" },
      },
    });
  });

  it("runs incremental academic graph sync with a strict mode body", async () => {
    const fetchImpl = createFetch({
      ok: true,
      status: "succeeded",
      mode: "incremental",
      syncWindow: {
        startDate: "2026-06-06T00:00:00.000Z",
        endDate: "2026-11-03T00:00:00.000Z",
      },
      courses: {
        discovered: 2,
        succeeded: 2,
        changed: 0,
        unchanged: 2,
        failed: 0,
      },
      plannerItems: {
        discovered: 0,
        inserted: 0,
        updated: 0,
        unchanged: 0,
        pruned: 0,
        failed: 0,
      },
      announcements: {
        discovered: 0,
        inserted: 0,
        updated: 0,
        unchanged: 0,
        pruned: 0,
        coursesSucceeded: 2,
        coursesFailed: 0,
      },
      files: {
        coursesSucceeded: 2,
        coursesFailed: 0,
        discovered: 0,
        inserted: 0,
        updated: 0,
        unchanged: 0,
        deactivated: 0,
        references: 0,
        referencesInserted: 0,
        referencesDeleted: 0,
        moduleFileReferences: 0,
        htmlFileReferences: 0,
        metadataOnly: 0,
        blocked: 0,
      },
      resources: {
        modules: 3,
        moduleItems: 8,
        pages: 2,
        assignmentGroups: 1,
        assignments: 4,
        plannerItems: 0,
        announcements: 0,
        files: 0,
        fileReferences: 0,
      },
      retryAttempts: 0,
    });

    const result = await syncCanvasAcademicGraph({
      accessToken: "session-token",
      apiBaseUrl: API_BASE_URL,
      fetchImpl,
      mode: "incremental",
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        mode: "incremental",
        courses: { changed: 0, unchanged: 2 },
      },
    });
    expect(JSON.parse(String(lastRequest(fetchImpl).init.body))).toEqual({
      mode: "incremental",
    });
  });

  it("loads and saves selected course preferences with internal IDs", async () => {
    const selectedCourseIds = ["11111111-1111-4111-8111-111111111111"];

    await expect(
      getCanvasCoursePreferences({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        fetchImpl: createFetch({ ok: true, selectedCourseIds }),
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: { selectedCourseIds },
    });

    const fetchImpl = createFetch({
      ok: true,
      selectedCourseIds,
      selectedCount: 1,
      deselectedCount: 2,
    });
    await expect(
      saveCanvasCoursePreferences({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        fetchImpl,
        selectedCourseIds,
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: { selectedCount: 1, deselectedCount: 2 },
    });
    expect(lastRequest(fetchImpl)).toMatchObject({
      url: `${API_BASE_URL}/api/canvas/course-preferences`,
      init: {
        method: "PUT",
        headers: {
          Authorization: "Bearer session-token",
          "Content-Type": "application/json",
        },
      },
    });
    expect(JSON.parse(String(lastRequest(fetchImpl).init.body))).toEqual({
      selectedCourseIds,
    });
  });

  it("syncs one selected course through the course-scoped route", async () => {
    const fetchImpl = createFetch(courseSyncSummary({ status: "partial" }));

    const result = await syncCanvasCourse({
      accessToken: "session-token",
      apiBaseUrl: API_BASE_URL,
      courseId: "11111111-1111-4111-8111-111111111111",
      fetchImpl,
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        status: "partial",
        modules: 1,
        files: 3,
        sanitizedFailures: [{ code: "canvas_course_files_failed", count: 1 }],
      },
    });
    expect(lastRequest(fetchImpl)).toMatchObject({
      url: `${API_BASE_URL}/api/canvas/courses/11111111-1111-4111-8111-111111111111/sync`,
      init: {
        method: "POST",
        headers: { Authorization: "Bearer session-token" },
      },
    });
  });

  it("syncs selected courses with max concurrency two and preserves failures", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const fetchImpl = vi.fn(
      async (url: RequestInfo | URL): Promise<Response> => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await Promise.resolve();
        inFlight -= 1;
        const serialized = String(url);
        if (serialized.includes("22222222")) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: {
                code: "canvas_course_unavailable",
                message: "Unavailable.",
              },
            }),
            { status: 400, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify(courseSyncSummary({ status: "success" })),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    ) as FetchMock;

    const result = await syncSelectedCanvasCourses({
      accessToken: "session-token",
      apiBaseUrl: API_BASE_URL,
      fetchImpl,
      selectedCourseIds: [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
        "33333333-3333-4333-8333-333333333333",
      ],
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        attempted: 3,
        successful: 2,
        failed: 1,
      },
    });
    expect(maxInFlight).toBeLessThanOrEqual(2);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("blocks duplicate selected-course sync submissions before fetch", async () => {
    const fetchImpl = vi.fn();

    await expect(
      syncSelectedCanvasCourses({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        fetchImpl,
        selectedCourseIds: [
          "11111111-1111-4111-8111-111111111111",
          "11111111-1111-4111-8111-111111111111",
        ],
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "duplicate_course_submission" },
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    [
      "invalid status",
      {
        ok: true,
        status: "done",
        mode: "full",
        courses: {
          discovered: 1,
          succeeded: 1,
          changed: 1,
          unchanged: 0,
          failed: 0,
        },
        resources: {
          modules: 0,
          moduleItems: 0,
          pages: 0,
          assignmentGroups: 0,
          assignments: 0,
        },
      },
    ],
    [
      "negative count",
      {
        ok: true,
        status: "succeeded",
        mode: "full",
        courses: {
          discovered: -1,
          succeeded: 0,
          changed: 0,
          unchanged: 0,
          failed: 0,
        },
        resources: {
          modules: 0,
          moduleItems: 0,
          pages: 0,
          assignmentGroups: 0,
          assignments: 0,
        },
      },
    ],
    [
      "academic content",
      {
        ok: true,
        status: "succeeded",
        mode: "full",
        courses: {
          discovered: 1,
          succeeded: 1,
          changed: 1,
          unchanged: 0,
          failed: 0,
        },
        resources: {
          modules: 0,
          moduleItems: 0,
          pages: 0,
          assignmentGroups: 0,
          assignments: 0,
        },
        courseNames: ["Private Course"],
      },
    ],
    [
      "extra resource field",
      {
        ok: true,
        status: "succeeded",
        mode: "full",
        courses: {
          discovered: 1,
          succeeded: 1,
          changed: 1,
          unchanged: 0,
          failed: 0,
        },
        resources: {
          modules: 0,
          moduleItems: 0,
          pages: 0,
          assignmentGroups: 0,
          assignments: 0,
          pageTitles: ["Private Page"],
        },
      },
    ],
    [
      "invalid mode",
      {
        ok: true,
        status: "succeeded",
        mode: "delta",
        courses: {
          discovered: 1,
          succeeded: 1,
          changed: 1,
          unchanged: 0,
          failed: 0,
        },
        resources: {
          modules: 0,
          moduleItems: 0,
          pages: 0,
          assignmentGroups: 0,
          assignments: 0,
        },
      },
    ],
    [
      "succeeded mismatch",
      {
        ok: true,
        status: "succeeded",
        mode: "incremental",
        courses: {
          discovered: 1,
          succeeded: 1,
          changed: 0,
          unchanged: 0,
          failed: 0,
        },
        resources: {
          modules: 0,
          moduleItems: 0,
          pages: 0,
          assignmentGroups: 0,
          assignments: 0,
        },
      },
    ],
  ])("rejects malformed sync responses: %s", async (_name, body) => {
    const result = await syncCanvasAcademicGraph({
      accessToken: "session-token",
      apiBaseUrl: API_BASE_URL,
      fetchImpl: createFetch(body),
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "invalid_response" },
    });
  });

  it("maps sync-in-progress responses safely", async () => {
    const result = await syncCanvasAcademicGraph({
      accessToken: "session-token",
      apiBaseUrl: API_BASE_URL,
      fetchImpl: createFetch(
        {
          ok: false,
          error: {
            code: "canvas_sync_in_progress",
            message: "A Canvas synchronization is already running.",
          },
        },
        409,
      ),
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "sync_in_progress", status: 409 },
    });
  });

  it("rejects missing setup and credentials before fetch", async () => {
    const fetchImpl = vi.fn();

    await expect(
      getCanvasConnection({
        accessToken: "session-token",
        apiBaseUrl: "",
        fetchImpl,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "invalid_api_base_url" },
    });

    await expect(
      connectCanvas({
        accessToken: "",
        apiBaseUrl: API_BASE_URL,
        baseUrl: "https://canvas.test",
        fetchImpl,
        personalAccessToken: "canvas-token",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "missing_access_token" },
    });

    await expect(
      connectCanvas({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        baseUrl: " ",
        fetchImpl,
        personalAccessToken: "canvas-token",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "missing_canvas_url" },
    });

    await expect(
      connectCanvas({
        accessToken: "session-token",
        apiBaseUrl: API_BASE_URL,
        baseUrl: "https://canvas.test",
        fetchImpl,
        personalAccessToken: " ",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "missing_canvas_token" },
    });

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps API errors safely without echoing token-shaped detail", async () => {
    const result = await connectCanvas({
      accessToken: "session-token",
      apiBaseUrl: API_BASE_URL,
      baseUrl: "https://canvas.test",
      fetchImpl: createFetch(
        {
          ok: false,
          error: {
            code: "invalid_canvas_token",
            message: "Error: Bearer canvas-token stack",
          },
        },
        401,
      ),
      personalAccessToken: "canvas-token",
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "invalid_canvas_token" },
    });
    expect(JSON.stringify(result)).not.toContain("canvas-token");
    expect(JSON.stringify(result).toLowerCase()).not.toContain("stack");
  });
});

function createFetch(body: unknown, status = 200): FetchMock {
  return vi.fn(
    async (_url: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
    },
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

function connection() {
  return {
    id: "connection-1",
    baseUrl: "https://canvas.test",
    canvasUserId: "canvas-user-1",
    canvasUserName: "Ada Student",
    canvasUserEmail: "ada@test.edu",
    status: "active",
    lastVerifiedAt: "2026-07-05T01:00:00.000Z",
    lastErrorCode: null,
    createdAt: "2026-07-05T01:00:00.000Z",
    updatedAt: "2026-07-05T01:00:00.000Z",
  };
}

function course() {
  return {
    id: "course-1",
    name: "Biology 101",
    courseCode: "BIO101",
    workflowState: "available",
    enrollmentTermId: null,
    accountId: null,
    startAt: null,
    endAt: null,
    timeZone: null,
    publicSyllabus: null,
    syllabusBody: null,
    updatedAt: null,
  };
}

function inventoryCourse() {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    displayName: "Biology 101",
    courseCode: "BIO101",
    workflowState: "available",
    startAt: null,
    endAt: null,
    term: {
      id: "term-1",
      name: "First Term",
      startAt: null,
      endAt: null,
    },
    classification: "likely_current",
    selectable: true,
    unavailableReason: null,
    selected: true,
    lastSync: {
      status: "success",
      startedAt: null,
      completedAt: "2026-07-06T01:00:00.000Z",
      lastCheckedAt: "2026-07-06T01:00:00.000Z",
      lastSuccessfulSyncAt: "2026-07-06T01:00:00.000Z",
      failureCode: null,
    },
  };
}

function courseSyncSummary({
  status,
}: {
  readonly status: "success" | "partial" | "failed";
}) {
  return {
    ok: true,
    status,
    startedAt: "2026-07-06T01:00:00.000Z",
    completedAt: "2026-07-06T01:00:03.000Z",
    durationMs: 3000,
    resources: {
      modules: 1,
      moduleItems: 2,
      pages: 1,
      assignmentGroups: 1,
      assignments: 2,
      plannerItems: 0,
      announcements: 1,
      files: 3,
      fileReferences: 4,
    },
    modules: 1,
    moduleItems: 2,
    pages: 1,
    assignmentGroups: 1,
    assignments: 2,
    announcements: 1,
    files: 3,
    fileReferences: 4,
    inserted: 5,
    updated: 0,
    unchanged: 1,
    pruned: 0,
    retryAttempts: 1,
    ...(status === "partial"
      ? { sanitizedFailures: [{ code: "canvas_course_files_failed", count: 1 }] }
      : {}),
  };
}

function capability(capabilityName: string, status: string) {
  return {
    capability: capabilityName,
    status,
    testedAt: "2026-07-05T01:00:00.000Z",
    safeErrorCode: null,
    courseId: null,
    integrationVersion: "phase5a",
  };
}
