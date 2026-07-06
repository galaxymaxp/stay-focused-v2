import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authResult: {
    ok: true,
    value: {
      client: { from: vi.fn(), rpc: vi.fn() },
      user: { id: "user-1" },
    },
  } as unknown,
  previewCanvasReviewerSources: vi.fn(),
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
  previewCanvasReviewerSources: mocks.previewCanvasReviewerSources,
}));

const route = await import("./route");

describe("POST /api/canvas/courses/[courseId]/sources/preview", () => {
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
    mocks.previewCanvasReviewerSources.mockResolvedValue({
      ok: true,
      value: preview(),
    });
  });

  it("requires Canvas API authentication before parsing source IDs", async () => {
    const authResponse = Response.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
    mocks.authResult = { ok: false, response: authResponse };

    const response = await route.POST(createRequest(), createContext("course-1"));

    expect(response.status).toBe(401);
    expect(mocks.previewCanvasReviewerSources).not.toHaveBeenCalled();
  });

  it("rejects invalid preview JSON safely", async () => {
    const response = await route.POST(
      new Request("http://localhost/api/canvas/courses/course-1/sources/preview", {
        body: "{",
        headers: { authorization: "Bearer token" },
        method: "POST",
      }),
      createContext("00000000-0000-4000-8000-000000000001"),
    );

    expect(response.status).toBe(400);
    await expectError(response, "invalid_json");
    expect(mocks.previewCanvasReviewerSources).not.toHaveBeenCalled();
  });

  it("submits ordered source IDs to the preview service", async () => {
    const sourceIds = [
      "page:11111111-1111-4111-8111-111111111111",
      "assignment:22222222-2222-4222-8222-222222222222",
    ];

    const response = await route.POST(
      createRequest({ sourceIds }),
      createContext("00000000-0000-4000-8000-000000000001"),
    );
    const text = await response.text();
    const body = JSON.parse(text) as unknown;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      sourceCount: 2,
      characterCount: 100,
      sources: [
        { id: sourceIds[0], type: "page" },
        { id: sourceIds[1], type: "assignment" },
      ],
    });
    expect(mocks.previewCanvasReviewerSources).toHaveBeenCalledWith({
      client: currentAuthClient(),
      courseId: "00000000-0000-4000-8000-000000000001",
      sourceIds,
      userId: "user-1",
    });
    expect(text).not.toContain("canvas_course_id");
    expect(text).not.toContain("storage_object_key");
    expect(text).not.toContain("Bearer raw-token");
  });

  it("propagates size-limit validation details without source text", async () => {
    mocks.previewCanvasReviewerSources.mockResolvedValue({
      ok: false,
      status: 413,
      code: "canvas_source_preview_too_large",
      message: "Selected Canvas sources are too large together.",
      details: {
        selectedSourceCount: 3,
        combinedCharacterCount: 100001,
        allowedMaximum: 90000,
      },
    });

    const response = await route.POST(
      createRequest({
        sourceIds: ["page:11111111-1111-4111-8111-111111111111"],
      }),
      createContext("00000000-0000-4000-8000-000000000001"),
    );
    const text = await response.text();

    expect(response.status).toBe(413);
    expect(text).toContain("canvas_source_preview_too_large");
    expect(text).toContain("100001");
    expect(text).not.toContain("Synthetic preview text");
  });

  it("allows CORS preflight for source preview", () => {
    const response = route.OPTIONS(createRequest());

    expect(response.status).toBe(204);
    expect(response.headers.get("allow")).toBe("POST, OPTIONS");
  });
});

function createRequest(body: unknown = { sourceIds: [] }): Request {
  return new Request(
    "http://localhost/api/canvas/courses/course-1/sources/preview",
    {
      body: JSON.stringify(body),
      headers: {
        authorization: "Bearer token",
        "content-type": "application/json",
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

function preview() {
  return {
    sourceText:
      "SOURCE 1 - PAGE - Fictional Page\n\nSynthetic preview text for owner.",
    suggestedTitle: "Fictional Course - Canvas Reviewer",
    sourceCount: 2,
    characterCount: 100,
    sources: [
      {
        id: "page:11111111-1111-4111-8111-111111111111",
        type: "page",
        updatedAt: "2026-07-07T00:00:00.000Z",
      },
      {
        id: "assignment:22222222-2222-4222-8222-222222222222",
        type: "assignment",
        updatedAt: "2026-07-07T00:00:00.000Z",
      },
    ],
    courseSync: {
      status: "success",
      completedAt: "2026-07-07T00:00:00.000Z",
    },
    limits: {
      maximumSources: 8,
      maximumCharactersPerSource: 20000,
      maximumCombinedPreviewCharacters: 90000,
      maximumOcrFilesPerPreview: 1,
      existingReviewerRequestLimit: 100000,
      suggestedTitleLimit: 120,
    },
  };
}

async function expectError(response: Response, code: string): Promise<void> {
  const body = await response.json();
  expect(body).toMatchObject({
    ok: false,
    error: { code },
  });
  expect(JSON.stringify(body).toLowerCase()).not.toContain("stack");
}
