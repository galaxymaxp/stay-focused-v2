import { describe, expect, it, vi } from "vitest";

import {
  connectCanvas,
  disconnectCanvas,
  getCanvasConnection,
  listCanvasCapabilities,
  listCanvasCourses,
  syncCanvasAcademicGraph,
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
        fetchImpl: createFetch({ ok: true, courses: [course()] }),
      }),
    ).resolves.toMatchObject({ ok: true, data: [{ id: "course-1" }] });

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
      courses: {
        discovered: 2,
        succeeded: 1,
        changed: 1,
        unchanged: 0,
        failed: 1,
      },
      resources: {
        modules: 3,
        moduleItems: 8,
        pages: 2,
        assignmentGroups: 1,
        assignments: 4,
      },
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
        resources: { moduleItems: 8, assignments: 4 },
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
      courses: {
        discovered: 2,
        succeeded: 2,
        changed: 0,
        unchanged: 2,
        failed: 0,
      },
      resources: {
        modules: 3,
        moduleItems: 8,
        pages: 2,
        assignmentGroups: 1,
        assignments: 4,
      },
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
