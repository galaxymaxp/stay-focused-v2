import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authResult: {
    ok: true,
    value: {
      client: { from: vi.fn(), rpc: vi.fn() },
      user: { id: "user-1" },
    },
  } as unknown,
  getCanvasGradeAssignmentDetail: vi.fn(),
  requireCanvasAuth: vi.fn(),
}));

vi.mock("@/lib/canvas-routes", () => ({
  jsonResponse: (body: unknown, status: number) =>
    Response.json(body, {
      headers: { "Cache-Control": "no-store" },
      status,
    }),
  optionsResponse: (_request: Request, methods: string) =>
    new Response(null, { headers: { allow: methods }, status: 204 }),
  requireCanvasAuth: mocks.requireCanvasAuth,
}));

vi.mock("@/lib/canvas-grade-read-model", () => ({
  getCanvasGradeAssignmentDetail: mocks.getCanvasGradeAssignmentDetail,
}));

const route = await import("./route");

describe("GET /api/canvas/courses/[courseId]/grades/[assignmentId]", () => {
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
    mocks.getCanvasGradeAssignmentDetail.mockResolvedValue({
      ok: true,
      value: assignmentDetail(),
    });
  });

  it("requires authentication before assignment grade reads", async () => {
    mocks.authResult = {
      ok: false,
      response: Response.json(
        { ok: false, error: { code: "unauthorized" } },
        { status: 401 },
      ),
    };

    const response = await route.GET(createRequest(), createContext());

    expect(response.status).toBe(401);
    expect(mocks.getCanvasGradeAssignmentDetail).not.toHaveBeenCalled();
  });

  it("returns one safe assignment detail DTO", async () => {
    const response = await route.GET(createRequest(), createContext());
    const text = await response.text();
    const body = JSON.parse(text) as unknown;

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      ok: true,
      assignment: {
        id: ASSIGNMENT_ID,
        normalizedStatus: "submitted_late",
        score: { state: "visible", value: 0 },
      },
    });
    expect(mocks.getCanvasGradeAssignmentDetail).toHaveBeenCalledWith({
      assignmentId: ASSIGNMENT_ID,
      client: currentAuthClient(),
      courseId: COURSE_ID,
      userId: "user-1",
    });
    expect(text).not.toContain("canvas_assignment_id");
    expect(text).not.toContain("submission_id");
    expect(text).not.toContain("rubric");
    expect(text).not.toContain("preview_url");
  });

  it("uses safe not-found for nonexistent, cross-user, or cross-course assignments", async () => {
    mocks.getCanvasGradeAssignmentDetail.mockResolvedValue({
      ok: false,
      status: 404,
      code: "canvas_assignment_not_found",
      message: "Canvas assignment grade data was not found.",
    });

    const response = await route.GET(createRequest(), createContext());

    expect(response.status).toBe(404);
    await expectError(response, "canvas_assignment_not_found");
  });

  it("allows CORS preflight for assignment detail", () => {
    const response = route.OPTIONS(createRequest());

    expect(response.status).toBe(204);
    expect(response.headers.get("allow")).toBe("GET, OPTIONS");
  });
});

const COURSE_ID = "22222222-2222-4222-8222-222222222222";
const ASSIGNMENT_ID = "33333333-3333-4333-8333-333333333333";

function createRequest(): Request {
  return new Request(
    `http://localhost/api/canvas/courses/${COURSE_ID}/grades/${ASSIGNMENT_ID}`,
    {
      headers: { authorization: "Bearer token" },
      method: "GET",
    },
  );
}

function createContext(): {
  readonly params: Promise<{
    readonly assignmentId: string;
    readonly courseId: string;
  }>;
} {
  return {
    params: Promise.resolve({
      assignmentId: ASSIGNMENT_ID,
      courseId: COURSE_ID,
    }),
  };
}

function currentAuthClient(): unknown {
  return (mocks.authResult as { readonly value: { readonly client: unknown } })
    .value.client;
}

function assignmentDetail() {
  return {
    allowedAttempts: null,
    assignmentVisible: true,
    attempt: 1,
    dueAt: "2026-07-08T00:00:00.000Z",
    excused: false,
    grade: { state: "hidden", value: null },
    gradeMatchesCurrentSubmission: true,
    gradedAt: null,
    gradingType: "points",
    hideInGradebook: null,
    id: ASSIGNMENT_ID,
    lastSyncedAt: "2026-07-08T00:00:00.000Z",
    late: true,
    latePolicyStatus: "late",
    lockAt: null,
    missing: false,
    normalizedStatus: "submitted_late",
    pointsPossible: 10,
    pointsPossibleAtSync: 10,
    postManually: null,
    postedAt: null,
    score: { state: "visible", value: 0 },
    secondsLate: 60,
    submissionType: "online_upload",
    submissionTypes: ["online_upload"],
    submittedAt: "2026-07-08T00:00:00.000Z",
    sync: {
      assignmentSubmissionState: "succeeded",
      authoritativeAssignmentSubmission: true,
      courseGradeSummaryState: "succeeded",
      failureCode: null,
      lastCheckedAt: "2026-07-08T00:00:00.000Z",
      lastSuccessfulSyncAt: "2026-07-08T00:00:00.000Z",
      stale: false,
      status: "succeeded",
    },
    title: "Fictional Assignment",
    unlockAt: null,
    workflowState: "submitted",
  };
}

async function expectError(response: Response, code: string): Promise<void> {
  const body = await response.json();
  expect(body).toMatchObject({ ok: false, error: { code } });
  expect(JSON.stringify(body).toLowerCase()).not.toContain("stack");
}
