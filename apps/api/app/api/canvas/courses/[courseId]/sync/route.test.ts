import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authResult: {
    ok: true,
    value: {
      client: { from: vi.fn(), rpc: vi.fn() },
      user: { id: "user-1" },
    },
  } as unknown,
  createCanvasSyncJob: vi.fn(),
  dispatchAcceptedCanvasSyncJob: vi.fn(),
  requireCanvasAuth: vi.fn(),
  validateCanvasSyncIdempotencyKey: vi.fn(),
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
  class CanvasSyncJobRepositoryError extends Error {
    public constructor(
      public readonly code: string,
      public readonly safeMessage: string,
      public readonly retryable: boolean,
    ) {
      super(code);
    }
  }
  return {
    CanvasSyncJobRepositoryError,
    createCanvasSyncJob: mocks.createCanvasSyncJob,
    validateCanvasSyncIdempotencyKey: mocks.validateCanvasSyncIdempotencyKey,
  };
});

vi.mock("@/lib/canvas-sync-jobs/workflow-dispatch", () => {
  class CanvasSyncWorkflowDispatchError extends Error {}
  return {
    CanvasSyncWorkflowDispatchError,
    dispatchAcceptedCanvasSyncJob: mocks.dispatchAcceptedCanvasSyncJob,
  };
});

const repository = await import("@/lib/canvas-sync-jobs/repository");
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
    mocks.validateCanvasSyncIdempotencyKey.mockReturnValue("content-sync-key-1");
    mocks.createCanvasSyncJob.mockResolvedValue({ id: "job-1" });
    mocks.dispatchAcceptedCanvasSyncJob.mockResolvedValue(acceptedJob());
  });

  it("requires Canvas API authentication", async () => {
    mocks.authResult = {
      ok: false,
      response: Response.json(
        { ok: false, error: { code: "unauthorized" } },
        { status: 401 },
      ),
    };

    const response = await route.POST(createRequest(), createContext(COURSE_ID));

    expect(response.status).toBe(401);
    expect(mocks.createCanvasSyncJob).not.toHaveBeenCalled();
  });

  it("rejects invalid internal course IDs before creating a job", async () => {
    const response = await route.POST(createRequest(), createContext("course-1"));

    expect(response.status).toBe(404);
    await expectError(response, "canvas_course_not_found");
    expect(mocks.createCanvasSyncJob).not.toHaveBeenCalled();
  });

  it("durably accepts one subject-neutral content-sync job", async () => {
    const response = await route.POST(createRequest(), createContext(COURSE_ID));
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toMatchObject({
      ok: true,
      data: {
        id: "job-1",
        jobType: "course_content",
        status: "queued",
      },
    });
    expect(mocks.validateCanvasSyncIdempotencyKey).toHaveBeenCalledWith(
      "content-sync-key-1",
    );
    expect(mocks.createCanvasSyncJob).toHaveBeenCalledWith(currentAuthClient(), {
      courseId: COURSE_ID,
      idempotencyKey: "content-sync-key-1",
      jobType: "course_content",
      userId: "user-1",
    });
    expect(mocks.dispatchAcceptedCanvasSyncJob).toHaveBeenCalledWith(
      { id: "job-1" },
      { client: currentAuthClient() },
    );
  });

  it("returns the same accepted job when an idempotent replay is dispatched", async () => {
    const first = await route.POST(createRequest(), createContext(COURSE_ID));
    const second = await route.POST(createRequest(), createContext(COURSE_ID));

    expect(first.status).toBe(202);
    expect(second.status).toBe(202);
    expect(await first.json()).toEqual(await second.json());
  });

  it("maps ownership and selection failures without exposing internals", async () => {
    mocks.createCanvasSyncJob.mockRejectedValue(
      new repository.CanvasSyncJobRepositoryError(
        "canvas_course_not_selected",
        "Select the Canvas course before synchronizing it.",
        false,
      ),
    );

    const response = await route.POST(createRequest(), createContext(COURSE_ID));

    expect(response.status).toBe(400);
    await expectError(response, "canvas_course_not_selected");
  });

  it("allows CORS preflight for per-course sync", () => {
    const response = route.OPTIONS(createRequest());

    expect(response.status).toBe(204);
    expect(response.headers.get("allow")).toBe("POST, OPTIONS");
  });
});

const COURSE_ID = "00000000-0000-4000-8000-000000000001";

function createRequest(): Request {
  return new Request(`http://localhost/api/canvas/courses/${COURSE_ID}/sync`, {
    headers: {
      authorization: "Bearer token",
      "idempotency-key": "content-sync-key-1",
    },
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

function acceptedJob() {
  return {
    acceptedAt: "2026-07-28T00:00:00.000Z",
    id: "job-1",
    jobType: "course_content",
    status: "queued",
  };
}

async function expectError(response: Response, code: string): Promise<void> {
  const body = await response.json();
  expect(body).toMatchObject({ ok: false, error: { code } });
  expect(JSON.stringify(body).toLowerCase()).not.toContain("stack");
}
