import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authResult: {
    ok: true,
    value: {
      client: { from: vi.fn(), rpc: vi.fn() },
      user: { id: "user-1" },
    },
  } as unknown,
  getCanvasCourseGradeSummary: vi.fn(),
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
  getCanvasCourseGradeSummary: mocks.getCanvasCourseGradeSummary,
}));

const route = await import("./route");

describe("GET /api/canvas/courses/[courseId]/grades/summary", () => {
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
    mocks.getCanvasCourseGradeSummary.mockResolvedValue({
      ok: true,
      value: summaryDto(),
    });
  });

  it("requires authentication before summary reads", async () => {
    mocks.authResult = {
      ok: false,
      response: Response.json(
        { ok: false, error: { code: "unauthorized" } },
        { status: 401 },
      ),
    };

    const response = await route.GET(createRequest(), createContext());

    expect(response.status).toBe(401);
    expect(mocks.getCanvasCourseGradeSummary).not.toHaveBeenCalled();
  });

  it("returns only Canvas-provided visible summary wrappers", async () => {
    const response = await route.GET(createRequest(), createContext());
    const text = await response.text();
    const body = JSON.parse(text) as unknown;

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      ok: true,
      summary: {
        currentGrade: { state: "visible", value: "" },
        currentScore: { state: "visible", value: 0 },
        finalGrade: { state: "hidden", value: null },
        finalScore: { state: "hidden", value: null },
      },
    });
    expect(mocks.getCanvasCourseGradeSummary).toHaveBeenCalledWith({
      client: currentAuthClient(),
      courseId: COURSE_ID,
      userId: "user-1",
    });
    expect(text).not.toContain("unposted");
    expect(text).not.toContain("canvas_course_id");
    expect(text).not.toContain("source_fingerprint");
  });

  it("propagates safe selected-course failures", async () => {
    mocks.getCanvasCourseGradeSummary.mockResolvedValue({
      ok: false,
      status: 404,
      code: "canvas_course_not_found",
      message: "Canvas course was not found for this connection.",
    });

    const response = await route.GET(createRequest(), createContext());

    expect(response.status).toBe(404);
    await expectError(response, "canvas_course_not_found");
  });

  it("allows CORS preflight for summary reads", () => {
    const response = route.OPTIONS(createRequest());

    expect(response.status).toBe(204);
    expect(response.headers.get("allow")).toBe("GET, OPTIONS");
  });
});

const COURSE_ID = "22222222-2222-4222-8222-222222222222";

function createRequest(): Request {
  return new Request(`http://localhost/api/canvas/courses/${COURSE_ID}/grades/summary`, {
    headers: { authorization: "Bearer token" },
    method: "GET",
  });
}

function createContext(): {
  readonly params: Promise<{ readonly courseId: string }>;
} {
  return { params: Promise.resolve({ courseId: COURSE_ID }) };
}

function currentAuthClient(): unknown {
  return (mocks.authResult as { readonly value: { readonly client: unknown } })
    .value.client;
}

function summaryDto() {
  return {
    currentGrade: { state: "visible", value: "" },
    currentScore: { state: "visible", value: 0 },
    finalGrade: { state: "hidden", value: null },
    finalScore: { state: "hidden", value: null },
    lastSyncedAt: "2026-07-08T00:00:00.000Z",
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
  };
}

async function expectError(response: Response, code: string): Promise<void> {
  const body = await response.json();
  expect(body).toMatchObject({ ok: false, error: { code } });
  expect(JSON.stringify(body).toLowerCase()).not.toContain("stack");
}
