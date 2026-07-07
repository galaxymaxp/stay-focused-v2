import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authResult: {
    ok: true,
    value: {
      client: { from: vi.fn(), rpc: vi.fn() },
      user: { id: "user-1" },
    },
  } as unknown,
  previewSelectiveCanvasReviewerSources: vi.fn(),
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
  previewSelectiveCanvasReviewerSources:
    mocks.previewSelectiveCanvasReviewerSources,
}));

const route = await import("./route");

describe("POST /api/canvas/courses/[courseId]/sources/selective-preview", () => {
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
    mocks.previewSelectiveCanvasReviewerSources.mockResolvedValue({
      ok: true,
      value: preview(),
    });
  });

  it("requires Canvas API authentication before parsing selected block IDs", async () => {
    const authResponse = Response.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
    mocks.authResult = { ok: false, response: authResponse };

    const response = await route.POST(
      createRequest("{", "application/json"),
      createContext("course-1"),
    );

    expect(response.status).toBe(401);
    expect(mocks.previewSelectiveCanvasReviewerSources).not.toHaveBeenCalled();
  });

  it("rejects non-JSON and unsupported request fields safely", async () => {
    const nonJson = await route.POST(
      createRequest(
        JSON.stringify({
          selectedBlockIds: [],
          structureSessionId: "77777777-7777-4777-8777-777777777777",
        }),
        "text/plain",
      ),
      createContext("00000000-0000-4000-8000-000000000001"),
    );
    expect(nonJson.status).toBe(400);
    await expectError(nonJson, "invalid_request");

    const extraField = await route.POST(
      createRequest(
        JSON.stringify({
          selectedBlockIds: ["88888888-8888-4888-8888-888888888881"],
          sourceText: "client supplied text",
          structureSessionId: "77777777-7777-4777-8777-777777777777",
        }),
      ),
      createContext("00000000-0000-4000-8000-000000000001"),
    );
    expect(extraField.status).toBe(400);
    await expectError(extraField, "invalid_request");
    expect(mocks.previewSelectiveCanvasReviewerSources).not.toHaveBeenCalled();
  });

  it("submits structure session and selected block IDs to the preview service", async () => {
    const selectedBlockIds = [
      "88888888-8888-4888-8888-888888888881",
      "88888888-8888-4888-8888-888888888882",
    ];

    const response = await route.POST(
      createRequest(
        JSON.stringify({
          selectedBlockIds,
          structureSessionId: "77777777-7777-4777-8777-777777777777",
        }),
      ),
      createContext("00000000-0000-4000-8000-000000000001"),
    );
    const text = await response.text();
    const body = JSON.parse(text) as unknown;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      previewSessionId: "33333333-3333-4333-8333-333333333333",
      selectedBlockCount: 2,
      sourceCount: 1,
    });
    expect(mocks.previewSelectiveCanvasReviewerSources).toHaveBeenCalledWith({
      client: currentAuthClient(),
      courseId: "00000000-0000-4000-8000-000000000001",
      selectedBlockIds,
      structureSessionId: "77777777-7777-4777-8777-777777777777",
      userId: "user-1",
    });
    expect(text).not.toContain("block_sha256");
    expect(text).not.toContain("selected_block_manifest");
  });

  it("propagates block-selection validation details without source text", async () => {
    mocks.previewSelectiveCanvasReviewerSources.mockResolvedValue({
      ok: false,
      status: 413,
      code: "canvas_source_block_selection_limit_exceeded",
      message: "Select at most 250 Canvas blocks.",
      details: {
        allowedMaximum: 250,
        selectedSourceCount: 251,
      },
    });

    const response = await route.POST(
      createRequest(
        JSON.stringify({
          selectedBlockIds: ["88888888-8888-4888-8888-888888888881"],
          structureSessionId: "77777777-7777-4777-8777-777777777777",
        }),
      ),
      createContext("00000000-0000-4000-8000-000000000001"),
    );
    const text = await response.text();

    expect(response.status).toBe(413);
    expect(text).toContain("canvas_source_block_selection_limit_exceeded");
    expect(text).toContain("250");
    expect(text).not.toContain("Synthetic preview text");
  });

  it("allows CORS preflight for selective preview", () => {
    const response = route.OPTIONS(createRequest());

    expect(response.status).toBe(204);
    expect(response.headers.get("allow")).toBe("POST, OPTIONS");
  });
});

function createRequest(
  body = JSON.stringify({
    selectedBlockIds: [],
    structureSessionId: "77777777-7777-4777-8777-777777777777",
  }),
  contentType = "application/json",
): Request {
  return new Request(
    "http://localhost/api/canvas/courses/course-1/sources/selective-preview",
    {
      body,
      headers: {
        authorization: "Bearer token",
        "content-type": contentType,
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
    previewSessionId: "33333333-3333-4333-8333-333333333333",
    sourceText:
      "SOURCE 1 - PAGE - Fictional Page\n\n# Overview\n\nSynthetic preview text.",
    suggestedTitle: "Fictional Course - Canvas Reviewer",
    sourceCount: 1,
    characterCount: 80,
    selectedBlockCount: 2,
    sources: [
      {
        id: "page:11111111-1111-4111-8111-111111111111",
        type: "page",
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
      maximumStructuredBlocks: 400,
      maximumSelectedBlocks: 250,
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
