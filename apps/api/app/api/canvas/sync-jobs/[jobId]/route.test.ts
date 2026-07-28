import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findOwnedCanvasSyncJob: vi.fn(),
  requireCanvasAuth: vi.fn(),
}));

vi.mock("@/lib/canvas-routes", () => ({
  jsonResponse: (body: unknown, status: number) =>
    Response.json(body, { status }),
  optionsResponse: (_request: Request, methods: string) =>
    new Response(null, { headers: { allow: methods }, status: 204 }),
  requireCanvasAuth: mocks.requireCanvasAuth,
}));

vi.mock("@/lib/canvas-sync-jobs/contracts", () => ({
  toCanvasSyncJobStatusView: (job: unknown) => job,
}));

vi.mock("@/lib/canvas-sync-jobs/repository", () => {
  class CanvasSyncJobRepositoryError extends Error {}
  return {
    CanvasSyncJobRepositoryError,
    findOwnedCanvasSyncJob: mocks.findOwnedCanvasSyncJob,
  };
});

const route = await import("./route");

describe("GET /api/canvas/sync-jobs/[jobId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCanvasAuth.mockResolvedValue({
      ok: true,
      value: { client: {}, user: { id: "user-1" } },
    });
  });

  it("returns only the authenticated owner's job", async () => {
    mocks.findOwnedCanvasSyncJob.mockResolvedValue({
      id: JOB_ID,
      status: "running",
    });

    const response = await route.GET(request(), context());

    expect(response.status).toBe(200);
    expect(mocks.findOwnedCanvasSyncJob).toHaveBeenCalledWith(
      {},
      "user-1",
      JOB_ID,
    );
  });

  it("returns the same 404 for another user's or unknown job", async () => {
    mocks.findOwnedCanvasSyncJob.mockResolvedValue(null);

    const response = await route.GET(request(), context());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toMatchObject({
      ok: false,
      error: { code: "canvas_sync_job_not_found" },
    });
  });
});

const JOB_ID = "33333333-3333-4333-8333-333333333333";

function request(): Request {
  return new Request(`https://example.test/api/canvas/sync-jobs/${JOB_ID}`, {
    headers: { authorization: "Bearer token" },
  });
}

function context(): {
  readonly params: Promise<{ readonly jobId: string }>;
} {
  return { params: Promise.resolve({ jobId: JOB_ID }) };
}
