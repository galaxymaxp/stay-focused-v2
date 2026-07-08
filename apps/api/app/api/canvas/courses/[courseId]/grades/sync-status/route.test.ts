import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authResult: {
    ok: true,
    value: {
      client: { from: vi.fn(), rpc: vi.fn() },
      user: { id: "user-1" },
    },
  } as unknown,
  getCanvasGradeSyncStatus: vi.fn(),
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
  getCanvasGradeSyncStatus: mocks.getCanvasGradeSyncStatus,
}));

const route = await import("./route");

describe("GET /api/canvas/courses/[courseId]/grades/sync-status", () => {
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
    mocks.getCanvasGradeSyncStatus.mockResolvedValue({
      ok: true,
      value: syncStatus(),
    });
  });

  it("requires authentication before sync status reads", async () => {
    mocks.authResult = {
      ok: false,
      response: Response.json(
        { ok: false, error: { code: "unauthorized" } },
        { status: 401 },
      ),
    };

    const response = await route.GET(createRequest(), createContext());

    expect(response.status).toBe(401);
    expect(mocks.getCanvasGradeSyncStatus).not.toHaveBeenCalled();
  });

  it("returns synchronization freshness without grade values", async () => {
    const response = await route.GET(createRequest(), createContext());
    const text = await response.text();
    const body = JSON.parse(text) as unknown;

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      ok: true,
      sync: {
        assignmentSubmissionState: "succeeded",
        failureCode: "canvas_timeout",
        stale: true,
        status: "failed",
      },
    });
    expect(mocks.getCanvasGradeSyncStatus).toHaveBeenCalledWith({
      client: currentAuthClient(),
      courseId: COURSE_ID,
      userId: "user-1",
    });
    expect(text).not.toContain("grade");
    expect(text).not.toContain("score");
    expect(text).not.toContain("canvas_course_id");
    expect(text).not.toContain("token");
  });

  it("propagates sanitized storage failures", async () => {
    mocks.getCanvasGradeSyncStatus.mockResolvedValue({
      ok: false,
      status: 500,
      code: "canvas_storage_failed",
      message: "Canvas grade synchronization state could not be loaded.",
    });

    const response = await route.GET(createRequest(), createContext());

    expect(response.status).toBe(500);
    await expectError(response, "canvas_storage_failed");
  });

  it("allows CORS preflight for sync status reads", () => {
    const response = route.OPTIONS(createRequest());

    expect(response.status).toBe(204);
    expect(response.headers.get("allow")).toBe("GET, OPTIONS");
  });
});

const COURSE_ID = "22222222-2222-4222-8222-222222222222";

function createRequest(): Request {
  return new Request(`http://localhost/api/canvas/courses/${COURSE_ID}/grades/sync-status`, {
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

function syncStatus() {
  return {
    assignmentSubmissionState: "succeeded",
    authoritativeAssignmentSubmission: true,
    courseGradeSummaryState: "failed",
    failureCode: "canvas_timeout",
    lastCheckedAt: "2026-07-08T00:00:00.000Z",
    lastSuccessfulSyncAt: "2026-07-06T00:00:00.000Z",
    stale: true,
    status: "failed",
  };
}

async function expectError(response: Response, code: string): Promise<void> {
  const body = await response.json();
  expect(body).toMatchObject({ ok: false, error: { code } });
  expect(JSON.stringify(body).toLowerCase()).not.toContain("stack");
}
