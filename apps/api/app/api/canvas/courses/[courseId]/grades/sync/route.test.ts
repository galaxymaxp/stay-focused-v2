import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authResult: {
    ok: true,
    value: {
      client: { from: vi.fn(), rpc: vi.fn() },
      user: { id: "user-1" },
    },
  } as unknown,
  requireCanvasAuth: vi.fn(),
  syncCanvasCourseGrades: vi.fn(),
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

vi.mock("@/lib/canvas-grade-sync", () => ({
  syncCanvasCourseGrades: mocks.syncCanvasCourseGrades,
}));

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
    mocks.syncCanvasCourseGrades.mockResolvedValue(syncResult("succeeded"));
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
    expect(mocks.syncCanvasCourseGrades).not.toHaveBeenCalled();
  });

  it("rejects invalid internal course IDs before invoking the sync service", async () => {
    const response = await route.POST(createRequest(), createContext("canvas-123"));

    expect(response.status).toBe(404);
    await expectError(response, "canvas_course_not_found");
    expect(mocks.syncCanvasCourseGrades).not.toHaveBeenCalled();
  });

  it("accepts no body and delegates exactly once to Phase 5E.3 sync", async () => {
    const response = await route.POST(
      new Request(`http://localhost/api/canvas/courses/${COURSE_ID}/grades/sync`, {
        headers: { authorization: "Bearer token" },
        method: "POST",
      }),
      createContext(COURSE_ID),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      ok: true,
      status: "succeeded",
      assignmentSubmission: { persistedCount: 2 },
    });
    expect(mocks.syncCanvasCourseGrades).toHaveBeenCalledTimes(1);
    expect(mocks.syncCanvasCourseGrades).toHaveBeenCalledWith({
      client: currentAuthClient(),
      courseId: COURSE_ID,
      userId: "user-1",
    });
  });

  it("accepts an empty JSON object body", async () => {
    const response = await route.POST(
      createRequest({ rawBody: "{}" }),
      createContext(COURSE_ID),
    );

    expect(response.status).toBe(200);
    expect(mocks.syncCanvasCourseGrades).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["malformed JSON", "{nope", 400, "invalid_json"],
    ["unknown fields", JSON.stringify({ userId: "attacker" }), 400, "invalid_request"],
    ["array body", "[]", 400, "invalid_request"],
  ] as const)("rejects %s before synchronization", async (_name, rawBody, status, code) => {
    const response = await route.POST(
      createRequest({ rawBody }),
      createContext(COURSE_ID),
    );

    expect(response.status).toBe(status);
    await expectError(response, code);
    expect(mocks.syncCanvasCourseGrades).not.toHaveBeenCalled();
  });

  it("rejects oversized request bodies before synchronization", async () => {
    const response = await route.POST(
      createRequest({
        contentLength: "1025",
        rawBody: "{}",
      }),
      createContext(COURSE_ID),
    );

    expect(response.status).toBe(413);
    await expectError(response, "payload_too_large");
    expect(mocks.syncCanvasCourseGrades).not.toHaveBeenCalled();
  });

  it("returns partial and failed service results as safe aggregate responses", async () => {
    mocks.syncCanvasCourseGrades.mockResolvedValue(syncResult("partial"));

    const partial = await route.POST(createRequest(), createContext(COURSE_ID));
    expect(partial.status).toBe(200);
    expect(await partial.json()).toMatchObject({
      ok: true,
      status: "partial",
      courseGradeSummary: { failureCode: "canvas_timeout" },
    });

    mocks.syncCanvasCourseGrades.mockResolvedValue(syncResult("failed"));

    const failed = await route.POST(createRequest(), createContext(COURSE_ID));
    expect(failed.status).toBe(200);
    expect(await failed.json()).toMatchObject({
      ok: true,
      status: "failed",
      assignmentSubmission: { failureCode: "canvas_rate_limited" },
    });
  });

  it("does not expose private grade, course, connection, token, or fingerprint fields", async () => {
    const response = await route.POST(createRequest(), createContext(COURSE_ID));
    const text = await response.text();

    expect(text).not.toContain("Fictional Assignment");
    expect(text).not.toContain("Fictional Course");
    expect(text).not.toContain("canvasAssignmentId");
    expect(text).not.toContain("canvas_course_id");
    expect(text).not.toContain("connection");
    expect(text).not.toContain("token");
    expect(text).not.toContain("fingerprint");
    expect(text).not.toContain("score");
    expect(text).not.toContain("gradeValue");
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
    readonly rawBody?: string;
  } = {},
): Request {
  const headers = new Headers({ authorization: "Bearer token" });
  if (options.contentLength) {
    headers.set("content-length", options.contentLength);
  }
  return new Request(`http://localhost/api/canvas/courses/${COURSE_ID}/grades/sync`, {
    body: options.rawBody ?? "",
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

function syncResult(status: "succeeded" | "partial" | "failed") {
  return {
    assignmentSubmission: {
      assignmentCount: status === "failed" ? 0 : 2,
      failureCode: status === "failed" ? "canvas_rate_limited" : undefined,
      persistedCount: status === "failed" ? 0 : 2,
      status: status === "failed" ? "failed" : "succeeded",
      statusCounts: {
        available: 0,
        excused: 0,
        graded: status === "failed" ? 0 : 1,
        graded_hidden: 0,
        late_unsubmitted: 0,
        locked: 0,
        missing: 0,
        no_due_date: 0,
        submitted: status === "failed" ? 0 : 1,
        submitted_late: 0,
        unavailable: 0,
        unknown: 0,
        upcoming: 0,
      },
      submissionEvidenceCount: status === "failed" ? 0 : 2,
    },
    courseGradeSummary: {
      failureCode: status === "partial" ? "canvas_timeout" : undefined,
      status: status === "partial" ? "failed" : "succeeded",
      visibleFieldCount: status === "failed" ? 0 : 2,
    },
    lastCheckedAt: "2026-07-08T00:00:00.000Z",
    lastSuccessfulSyncAt: status === "failed" ? null : "2026-07-08T00:00:00.000Z",
    status,
  };
}

async function expectError(response: Response, code: string): Promise<void> {
  const body = await response.json();
  expect(body).toMatchObject({ ok: false, error: { code } });
  expect(JSON.stringify(body).toLowerCase()).not.toContain("stack");
}
