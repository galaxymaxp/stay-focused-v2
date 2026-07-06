import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authResult: {
    ok: true,
    value: {
      client: { from: vi.fn(), rpc: vi.fn() },
      user: { id: "user-1" },
    },
  } as unknown,
  loadSelectedSyncCourse: vi.fn(),
  requireCanvasAuth: vi.fn(),
  syncSelectedCanvasCourse: vi.fn(),
}));

vi.mock("@/lib/canvas-routes", () => ({
  jsonResponse: (body: unknown, status: number) =>
    Response.json(body, { status }),
  optionsResponse: (_request: Request, methods: string) =>
    new Response(null, { headers: { allow: methods }, status: 204 }),
  requireCanvasAuth: mocks.requireCanvasAuth,
}));

vi.mock("@/lib/canvas-course-selection", () => ({
  loadSelectedSyncCourse: mocks.loadSelectedSyncCourse,
}));

vi.mock("@/lib/canvas-sync", () => ({
  syncSelectedCanvasCourse: mocks.syncSelectedCanvasCourse,
}));

const route = await import("./route");

describe("POST /api/canvas/courses/[courseId]/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authResult = {
      ok: true,
      value: {
        client: { from: vi.fn(), rpc: vi.fn() },
        user: { id: "user-1" },
      },
    };
    mocks.requireCanvasAuth.mockImplementation(async () => mocks.authResult);
    mocks.loadSelectedSyncCourse.mockResolvedValue({
      ok: true,
      value: {
        connection: { id: "connection-1" },
        course: { id: "canvas-course-1", name: "Private Course Name" },
        courseRow: { id: "00000000-0000-4000-8000-000000000001" },
      },
    });
    mocks.syncSelectedCanvasCourse.mockResolvedValue({
      ok: true,
      summary: courseSummary("success"),
    });
  });

  it("requires Canvas API authentication", async () => {
    const authResponse = Response.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
    mocks.authResult = { ok: false, response: authResponse };

    const response = await route.POST(createRequest(), createContext("course-1"));

    expect(response.status).toBe(401);
    expect(mocks.loadSelectedSyncCourse).not.toHaveBeenCalled();
    expect(mocks.syncSelectedCanvasCourse).not.toHaveBeenCalled();
  });

  it("rejects blank route course IDs before reading Canvas state", async () => {
    const response = await route.POST(createRequest(), createContext("   "));

    expect(response.status).toBe(404);
    await expectError(response, "canvas_course_not_found");
    expect(mocks.loadSelectedSyncCourse).not.toHaveBeenCalled();
  });

  it("requires the selected course to belong to the authenticated user", async () => {
    mocks.loadSelectedSyncCourse.mockResolvedValue({
      ok: false,
      status: 400,
      code: "canvas_course_not_selected",
      message: "Select the Canvas course before synchronizing it.",
    });

    const response = await route.POST(
      createRequest({ body: { userId: "attacker-user" } }),
      createContext("00000000-0000-4000-8000-000000000001"),
    );

    expect(response.status).toBe(400);
    await expectError(response, "canvas_course_not_selected");
    expect(mocks.loadSelectedSyncCourse).toHaveBeenCalledWith({
      client: currentAuthClient(),
      courseId: "00000000-0000-4000-8000-000000000001",
      userId: "user-1",
    });
    expect(mocks.syncSelectedCanvasCourse).not.toHaveBeenCalled();
  });

  it("synchronizes one selected course and returns only safe aggregate counts", async () => {
    const response = await route.POST(
      createRequest(),
      createContext("00000000-0000-4000-8000-000000000001"),
    );
    const text = await response.text();
    const body = JSON.parse(text) as unknown;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      status: "success",
      courses: { discovered: 1, succeeded: 1, failed: 0 },
      plannerItems: { discovered: 0 },
    });
    expect(text).not.toContain("Private Course Name");
    expect(text).not.toContain("canvas-course-1");
    expect(mocks.syncSelectedCanvasCourse).toHaveBeenCalledWith({
      client: currentAuthClient(),
      connection: { id: "connection-1" },
      course: { id: "canvas-course-1", name: "Private Course Name" },
      courseRow: { id: "00000000-0000-4000-8000-000000000001" },
      userId: "user-1",
    });
  });

  it("propagates safe course-scoped sync failures with a summary", async () => {
    mocks.syncSelectedCanvasCourse.mockResolvedValue({
      ok: false,
      status: 502,
      code: "canvas_unavailable",
      message: "Canvas academic data could not be synchronized.",
      summary: courseSummary("failed"),
    });

    const response = await route.POST(
      createRequest(),
      createContext("00000000-0000-4000-8000-000000000001"),
    );
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toMatchObject({
      ok: false,
      error: { code: "canvas_unavailable" },
      sync: { status: "failed" },
    });
    expect(JSON.stringify(body).toLowerCase()).not.toContain("stack");
  });

  it("allows CORS preflight for per-course sync", () => {
    const response = route.OPTIONS(createRequest());

    expect(response.status).toBe(204);
    expect(response.headers.get("allow")).toBe("POST, OPTIONS");
  });
});

function createRequest(options: { readonly body?: unknown } = {}): Request {
  return new Request("http://localhost/api/canvas/courses/course-1/sync", {
    body: JSON.stringify(options.body ?? {}),
    headers: { authorization: "Bearer token" },
    method: "POST",
  });
}

function createContext(courseId: string): {
  readonly params: Promise<{ readonly courseId: string }>;
} {
  return { params: Promise.resolve({ courseId }) };
}

function currentAuthClient(): unknown {
  return (mocks.authResult as { readonly value: { readonly client: unknown } })
    .value.client;
}

function courseSummary(status: "success" | "failed") {
  return {
    mode: "course",
    status,
    startedAt: "2026-07-06T01:00:00.000Z",
    completedAt: "2026-07-06T01:00:05.000Z",
    courses: {
      discovered: 1,
      succeeded: status === "success" ? 1 : 0,
      changed: status === "success" ? 1 : 0,
      unchanged: 0,
      failed: status === "success" ? 0 : 1,
    },
    resources: {
      modules: status === "success" ? 1 : 0,
      moduleItems: 0,
      pages: 0,
      assignmentGroups: 0,
      assignments: 0,
      plannerItems: 0,
      announcements: 0,
      files: 0,
      fileReferences: 0,
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
      failed: 0,
      coursesSucceeded: status === "success" ? 1 : 0,
      coursesFailed: status === "success" ? 0 : 1,
    },
    files: {
      discovered: 0,
      inserted: 0,
      updated: 0,
      unchanged: 0,
      blocked: 0,
      metadataOnly: 0,
      references: 0,
      referencesDeleted: 0,
      failed: 0,
    },
    failures:
      status === "success"
        ? []
        : [{ code: "canvas_course_fetch_failed", count: 1 }],
    retryAttempts: 0,
    sanitizedFailures: [],
  };
}

async function expectError(response: Response, code: string): Promise<void> {
  const body = await response.json();
  expect(body).toMatchObject({
    ok: false,
    error: { code },
  });
  expect(JSON.stringify(body).toLowerCase()).not.toContain("stack");
}
