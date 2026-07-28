import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadCanvasCourseSyncHealth: vi.fn(),
  requireCanvasAuth: vi.fn(),
}));

vi.mock("@/lib/canvas-routes", () => ({
  jsonResponse: (body: unknown, status: number) =>
    Response.json(body, { status }),
  optionsResponse: (_request: Request, methods: string) =>
    new Response(null, { headers: { allow: methods }, status: 204 }),
  requireCanvasAuth: mocks.requireCanvasAuth,
}));

vi.mock("@/lib/canvas-sync-health", () => ({
  loadCanvasCourseSyncHealth: mocks.loadCanvasCourseSyncHealth,
}));

const route = await import("./route");

describe("GET /api/canvas/courses/[courseId]/sync-health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCanvasAuth.mockResolvedValue({
      ok: true,
      value: { client: {}, user: { id: "owner-1" } },
    });
  });

  it("loads aggregate health only for the authenticated owner", async () => {
    mocks.loadCanvasCourseSyncHealth.mockResolvedValue({
      activeJob: null,
      attentionScopeCount: 0,
      courseId: COURSE_ID,
      lastCheckedAt: null,
      lastSuccessfulAt: null,
      overallHealth: "not_synced",
      retryGuidance: null,
      scopes: {},
      staleScopeCount: 0,
    });

    const response = await route.GET(request(), context());
    expect(response.status).toBe(200);
    expect(mocks.loadCanvasCourseSyncHealth).toHaveBeenCalledWith({
      courseId: COURSE_ID,
      userId: "owner-1",
    });
  });

  it("returns the same 404 when another owner cannot resolve the course", async () => {
    mocks.loadCanvasCourseSyncHealth.mockResolvedValue(null);
    const response = await route.GET(request(), context());
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "canvas_course_not_found" },
      ok: false,
    });
  });
});

const COURSE_ID = "22222222-2222-4222-8222-222222222222";

function request(): Request {
  return new Request(
    `https://example.test/api/canvas/courses/${COURSE_ID}/sync-health`,
    { headers: { authorization: "Bearer token" } },
  );
}

function context(): {
  readonly params: Promise<{ readonly courseId: string }>;
} {
  return { params: Promise.resolve({ courseId: COURSE_ID }) };
}
