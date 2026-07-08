import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authResult: {
    ok: true,
    value: {
      client: { from: vi.fn(), rpc: vi.fn() },
      user: { id: "user-1" },
    },
  } as unknown,
  listCanvasGradeAssignments: vi.fn(),
  requireCanvasAuth: vi.fn(),
}));

vi.mock("@/lib/canvas-routes", () => ({
  jsonResponse: (body: unknown, status: number) =>
    Response.json(body, {
      headers: { "Cache-Control": "no-store" },
      status,
    }),
  optionsResponse: (_request: Request, methods: string) =>
    new Response(null, {
      headers: { allow: methods, "Cache-Control": "no-store" },
      status: 204,
    }),
  requireCanvasAuth: mocks.requireCanvasAuth,
}));

vi.mock("@/lib/canvas-grade-read-model", async () => {
  const actual = await vi.importActual<typeof import("@/lib/canvas-grade-read-model")>(
    "@/lib/canvas-grade-read-model",
  );
  return {
    ...actual,
    listCanvasGradeAssignments: mocks.listCanvasGradeAssignments,
  };
});

const route = await import("./route");

describe("GET /api/canvas/courses/[courseId]/grades", () => {
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
    mocks.listCanvasGradeAssignments.mockResolvedValue({
      ok: true,
      value: gradeList(),
    });
  });

  it("requires Canvas bearer authentication before reading grade data", async () => {
    const authResponse = Response.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
    mocks.authResult = { ok: false, response: authResponse };

    const response = await route.GET(createRequest(), createContext(COURSE_ID));

    expect(response.status).toBe(401);
    expect(mocks.listCanvasGradeAssignments).not.toHaveBeenCalled();
  });

  it("rejects malformed or unknown pagination parameters", async () => {
    const response = await route.GET(
      createRequest("?limit=-1&canvasCourseId=123"),
      createContext(COURSE_ID),
    );

    expect(response.status).toBe(400);
    await expectError(response, "invalid_request");
    expect(mocks.listCanvasGradeAssignments).not.toHaveBeenCalled();
  });

  it("returns safe paginated assignment DTOs with no-store caching", async () => {
    const response = await route.GET(
      createRequest("?limit=25&offset=2"),
      createContext(COURSE_ID),
    );
    const text = await response.text();
    const body = JSON.parse(text) as unknown;

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      ok: true,
      items: [{ id: ASSIGNMENT_ID, normalizedStatus: "graded" }],
      page: { limit: 25, offset: 2 },
    });
    expect(mocks.listCanvasGradeAssignments).toHaveBeenCalledWith({
      client: currentAuthClient(),
      courseId: COURSE_ID,
      limit: 25,
      offset: 2,
      userId: "user-1",
    });
    expect(text).not.toContain("canvasAssignmentId");
    expect(text).not.toContain("canvas_connection_id");
    expect(text).not.toContain("token");
    expect(text).not.toContain("source_fingerprint");
  });

  it("propagates safe read-model authorization failures", async () => {
    mocks.listCanvasGradeAssignments.mockResolvedValue({
      ok: false,
      status: 400,
      code: "canvas_course_not_selected",
      message: "Select the Canvas course before reading synchronized grade data.",
    });

    const response = await route.GET(createRequest(), createContext(COURSE_ID));

    expect(response.status).toBe(400);
    await expectError(response, "canvas_course_not_selected");
  });

  it("allows CORS preflight for grade listing", () => {
    const response = route.OPTIONS(createRequest());

    expect(response.status).toBe(204);
    expect(response.headers.get("allow")).toBe("GET, OPTIONS");
  });
});

const COURSE_ID = "22222222-2222-4222-8222-222222222222";
const ASSIGNMENT_ID = "33333333-3333-4333-8333-333333333333";

function createRequest(search = ""): Request {
  return new Request(`http://localhost/api/canvas/courses/${COURSE_ID}/grades${search}`, {
    headers: { authorization: "Bearer token" },
    method: "GET",
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

function gradeList() {
  return {
    items: [
      {
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
        normalizedStatus: "graded",
        pointsPossible: 10,
        score: { state: "visible", value: 10 },
        submissionTypes: ["online_upload"],
        submittedAt: "2026-07-08T00:00:00.000Z",
        title: "Fictional Assignment",
        unlockAt: null,
        workflowState: "graded",
      },
    ],
    page: {
      hasMore: false,
      limit: 25,
      nextOffset: null,
      offset: 2,
    },
    sync: syncStatus(),
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

async function expectError(response: Response, code: string): Promise<void> {
  const body = await response.json();
  expect(body).toMatchObject({ ok: false, error: { code } });
  expect(JSON.stringify(body).toLowerCase()).not.toContain("stack");
}
