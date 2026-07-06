import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authResult: {
    ok: true,
    value: {
      client: { from: vi.fn(), rpc: vi.fn() },
      user: { id: "user-1" },
    },
  } as unknown,
  prepareCanvasReviewerSources: vi.fn(),
  requireCanvasAuth: vi.fn(),
}));

vi.mock("@/lib/canvas-routes", () => ({
  jsonResponse: (body: unknown, status: number) =>
    Response.json(body, { status }),
  optionsResponse: (_request: Request, methods: string) =>
    new Response(null, { headers: { allow: methods }, status: 204 }),
  requireCanvasAuth: mocks.requireCanvasAuth,
}));

vi.mock("@/lib/canvas-reviewer-sources", () => ({
  prepareCanvasReviewerSources: mocks.prepareCanvasReviewerSources,
}));

const route = await import("./route");

describe("POST /api/canvas/courses/[courseId]/sources/prepare", () => {
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
    mocks.prepareCanvasReviewerSources.mockResolvedValue({
      ok: true,
      value: preparePayload(),
    });
  });

  it("requires Canvas API authentication before parsing preparation IDs", async () => {
    const authResponse = Response.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
    mocks.authResult = { ok: false, response: authResponse };

    const response = await route.POST(createRequest(), createContext("course-1"));

    expect(response.status).toBe(401);
    expect(mocks.prepareCanvasReviewerSources).not.toHaveBeenCalled();
  });

  it("rejects blank route course IDs before preparation", async () => {
    const response = await route.POST(createRequest(), createContext("   "));

    expect(response.status).toBe(404);
    await expectError(response, "canvas_course_not_found");
    expect(mocks.prepareCanvasReviewerSources).not.toHaveBeenCalled();
  });

  it("rejects invalid preparation JSON safely", async () => {
    const response = await route.POST(
      new Request("http://localhost/api/canvas/courses/course-1/sources/prepare", {
        body: "{",
        headers: {
          authorization: "Bearer token",
          "content-type": "application/json",
        },
        method: "POST",
      }),
      createContext("00000000-0000-4000-8000-000000000001"),
    );

    expect(response.status).toBe(400);
    await expectError(response, "invalid_json");
    expect(mocks.prepareCanvasReviewerSources).not.toHaveBeenCalled();
  });

  it.each([
    ["unsupported content type", "", { sourceIds: ["file:1"] }],
    ["missing sourceIds", "application/json", {}],
    ["too many sourceIds", "application/json", { sourceIds: ["file:1", "file:2", "file:3", "file:4"] }],
    ["unsupported fields", "application/json", { sourceIds: ["file:1"], storageObjectKey: "secret" }],
  ])("rejects bad preparation request bodies: %s", async (_name, contentType, body) => {
    const response = await route.POST(
      createRequest(body, contentType),
      createContext("00000000-0000-4000-8000-000000000001"),
    );

    expect(response.status).toBe(400);
    await expectError(response, "invalid_request");
    expect(mocks.prepareCanvasReviewerSources).not.toHaveBeenCalled();
  });

  it("submits source IDs to the preparation service and returns safe descriptors", async () => {
    const sourceIds = ["file:11111111-1111-4111-8111-111111111111"];

    const response = await route.POST(
      createRequest({ sourceIds }),
      createContext("00000000-0000-4000-8000-000000000001"),
    );
    const text = await response.text();
    const body = JSON.parse(text) as unknown;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      requested: 1,
      results: [{ id: sourceIds[0], status: "ready" }],
      sources: [{ id: sourceIds[0], file: { preparationStatus: "ready" } }],
    });
    expect(mocks.prepareCanvasReviewerSources).toHaveBeenCalledWith({
      client: currentAuthClient(),
      courseId: "00000000-0000-4000-8000-000000000001",
      sourceIds,
      userId: "user-1",
    });
    expect(text).not.toContain("storage_object_key");
    expect(text).not.toContain("current_sha256");
    expect(text).not.toContain("canvas_token");
  });

  it.each([
    ["duplicate IDs", "canvas_source_duplicate", 400],
    ["non-file IDs", "invalid_request", 400],
    ["cross-course file", "canvas_file_not_found", 404],
    ["unsupported file", "canvas_source_unsupported_file_type", 400],
    ["unselected course", "canvas_course_not_selected", 400],
  ])("propagates safe service errors for %s", async (_name, code, status) => {
    mocks.prepareCanvasReviewerSources.mockResolvedValue({
      ok: false,
      status,
      code,
      message: "Safe preparation error.",
    });

    const response = await route.POST(
      createRequest({
        sourceIds: ["file:11111111-1111-4111-8111-111111111111"],
      }),
      createContext("00000000-0000-4000-8000-000000000001"),
    );

    expect(response.status).toBe(status);
    await expectError(response, code);
  });

  it("allows CORS preflight for source preparation", () => {
    const response = route.OPTIONS(createRequest());

    expect(response.status).toBe(204);
    expect(response.headers.get("allow")).toBe("POST, OPTIONS");
  });
});

function createRequest(
  body: unknown = { sourceIds: [] },
  contentType = "application/json",
): Request {
  return new Request(
    "http://localhost/api/canvas/courses/course-1/sources/prepare",
    {
      body: JSON.stringify(body),
      headers: {
        authorization: "Bearer token",
        ...(contentType ? { "content-type": contentType } : {}),
      },
      method: "POST",
    },
  );
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

function preparePayload() {
  return {
    requested: 1,
    results: [
      {
        code: "stored",
        id: "file:11111111-1111-4111-8111-111111111111",
        retryable: false,
        status: "ready",
      },
    ],
    sources: [
      {
        availability: "available",
        estimatedCharacters: null,
        file: {
          canPrepare: false,
          kind: "pdf",
          preparationStatus: "ready",
        },
        id: "file:11111111-1111-4111-8111-111111111111",
        title: "Fictional File",
        type: "file",
        unavailableReason: null,
        updatedAt: "2026-07-07T00:00:00.000Z",
      },
    ],
  };
}

async function expectError(
  response: Response,
  code: string,
): Promise<void> {
  const body = await response.json();
  expect(body).toMatchObject({
    ok: false,
    error: { code },
  });
  expect(JSON.stringify(body).toLowerCase()).not.toContain("stack");
}
