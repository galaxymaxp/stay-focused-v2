import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authResult: {
    ok: true,
    value: {
      client: { from: vi.fn(), rpc: vi.fn() },
      user: { id: "user-1" },
    },
  } as unknown,
  authorizeSelectedCanvasGradeCourse: vi.fn(),
  createCanvasSyncJob: vi.fn(),
  dispatchAcceptedCanvasSyncJob: vi.fn(),
  requireCanvasAuth: vi.fn(),
  validateCanvasSyncIdempotencyKey: vi.fn(),
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
  authorizeSelectedCanvasGradeCourse: mocks.authorizeSelectedCanvasGradeCourse,
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

const route = await import("./route");

describe("POST /api/canvas/courses/[courseId]/grades/sync", () => {
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
    mocks.authorizeSelectedCanvasGradeCourse.mockResolvedValue({
      ok: true,
      value: null,
    });
    mocks.validateCanvasSyncIdempotencyKey.mockReturnValue("grade-sync-key-1");
    mocks.createCanvasSyncJob.mockResolvedValue({ id: "grade-job-1" });
    mocks.dispatchAcceptedCanvasSyncJob.mockResolvedValue(acceptedJob());
  });

  it("requires authentication before grade synchronization", async () => {
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

  it("rejects unknown or unselected course scope before job creation", async () => {
    mocks.authorizeSelectedCanvasGradeCourse.mockResolvedValue({
      ok: false,
      status: 400,
      code: "canvas_course_not_selected",
      message: "Select the Canvas course before reading synchronized grade data.",
    });

    const response = await route.POST(createRequest(), createContext(COURSE_ID));

    expect(response.status).toBe(400);
    await expectError(response, "canvas_course_not_selected");
    expect(mocks.createCanvasSyncJob).not.toHaveBeenCalled();
  });

  it("accepts no body and returns a durable grade-sync job", async () => {
    const response = await route.POST(
      createRequest({ omitBody: true }),
      createContext(COURSE_ID),
    );
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      ok: true,
      data: {
        id: "grade-job-1",
        jobType: "course_grades",
        status: "queued",
      },
    });
    expect(mocks.createCanvasSyncJob).toHaveBeenCalledWith(currentAuthClient(), {
      courseId: COURSE_ID,
      idempotencyKey: "grade-sync-key-1",
      jobType: "course_grades",
      userId: "user-1",
    });
  });

  it("accepts an empty JSON object without running Canvas inline", async () => {
    const response = await route.POST(
      createRequest({ rawBody: "{}" }),
      createContext(COURSE_ID),
    );

    expect(response.status).toBe(202);
    expect(mocks.dispatchAcceptedCanvasSyncJob).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["malformed JSON", "{nope", 400, "invalid_json"],
    ["unknown fields", JSON.stringify({ userId: "attacker" }), 400, "invalid_request"],
    ["array body", "[]", 400, "invalid_request"],
  ] as const)("rejects %s before job creation", async (_name, rawBody, status, code) => {
    const response = await route.POST(
      createRequest({ rawBody }),
      createContext(COURSE_ID),
    );

    expect(response.status).toBe(status);
    await expectError(response, code);
    expect(mocks.createCanvasSyncJob).not.toHaveBeenCalled();
  });

  it("rejects oversized request bodies before job creation", async () => {
    const response = await route.POST(
      createRequest({ contentLength: "1025", rawBody: "{}" }),
      createContext(COURSE_ID),
    );

    expect(response.status).toBe(413);
    await expectError(response, "payload_too_large");
    expect(mocks.createCanvasSyncJob).not.toHaveBeenCalled();
  });

  it("does not expose grade data, connection secrets, or fingerprints", async () => {
    const response = await route.POST(createRequest(), createContext(COURSE_ID));
    const text = await response.text();

    expect(text).not.toContain("Fictional Assignment");
    expect(text).not.toContain("canvasAssignmentId");
    expect(text).not.toContain("token");
    expect(text).not.toContain("fingerprint");
    expect(text).not.toContain("score");
  });

  it("allows CORS preflight for grade sync", () => {
    const response = route.OPTIONS(createRequest());

    expect(response.status).toBe(204);
    expect(response.headers.get("allow")).toBe("POST, OPTIONS");
  });
});

const COURSE_ID = "22222222-2222-4222-8222-222222222222";

function createRequest(
  options: {
    readonly contentLength?: string;
    readonly omitBody?: boolean;
    readonly rawBody?: string;
  } = {},
): Request {
  const headers = new Headers({
    authorization: "Bearer token",
    "idempotency-key": "grade-sync-key-1",
  });
  if (options.contentLength) {
    headers.set("content-length", options.contentLength);
  }
  return new Request(`http://localhost/api/canvas/courses/${COURSE_ID}/grades/sync`, {
    body: options.omitBody ? undefined : options.rawBody ?? "",
    headers,
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
    id: "grade-job-1",
    jobType: "course_grades",
    status: "queued",
  };
}

async function expectError(response: Response, code: string): Promise<void> {
  const body = await response.json();
  expect(body).toMatchObject({ ok: false, error: { code } });
  expect(JSON.stringify(body).toLowerCase()).not.toContain("stack");
}
