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
  structureCanvasReviewerSources: vi.fn(),
}));

vi.mock("@/lib/canvas-routes", () => ({
  jsonResponse: (body: unknown, status: number) =>
    Response.json(body, { status }),
  optionsResponse: (_request: Request, methods: string) =>
    new Response(null, { headers: { allow: methods }, status: 204 }),
  requireCanvasAuth: mocks.requireCanvasAuth,
}));

vi.mock("@/lib/canvas-reviewer-sources", () => ({
  structureCanvasReviewerSources: mocks.structureCanvasReviewerSources,
}));

const route = await import("./route");

describe("POST /api/canvas/courses/[courseId]/sources/structure", () => {
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
    mocks.structureCanvasReviewerSources.mockResolvedValue({
      ok: true,
      value: structure(),
    });
  });

  it("requires Canvas API authentication before parsing JSON", async () => {
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
    expect(mocks.structureCanvasReviewerSources).not.toHaveBeenCalled();
  });

  it("rejects non-JSON and unsupported request fields safely", async () => {
    const nonJson = await route.POST(
      createRequest(JSON.stringify({ sourceIds: [] }), "text/plain"),
      createContext("00000000-0000-4000-8000-000000000001"),
    );
    expect(nonJson.status).toBe(400);
    await expectError(nonJson, "invalid_request");

    const extraField = await route.POST(
      createRequest(
        JSON.stringify({
          sourceIds: ["page:11111111-1111-4111-8111-111111111111"],
          sourceText: "client supplied text",
        }),
      ),
      createContext("00000000-0000-4000-8000-000000000001"),
    );
    expect(extraField.status).toBe(400);
    await expectError(extraField, "invalid_request");
    expect(mocks.structureCanvasReviewerSources).not.toHaveBeenCalled();
  });

  it("submits ordered source IDs to the structure service", async () => {
    const sourceIds = [
      "page:11111111-1111-4111-8111-111111111111",
      "assignment:22222222-2222-4222-8222-222222222222",
    ];

    const response = await route.POST(
      createRequest(JSON.stringify({ sourceIds })),
      createContext("00000000-0000-4000-8000-000000000001"),
    );
    const text = await response.text();
    const body = JSON.parse(text) as unknown;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      structureSessionId: "77777777-7777-4777-8777-777777777777",
      totalBlockCount: 2,
      selectedByDefaultCount: 2,
    });
    expect(mocks.structureCanvasReviewerSources).toHaveBeenCalledWith({
      client: currentAuthClient(),
      courseId: "00000000-0000-4000-8000-000000000001",
      sourceIds,
      userId: "user-1",
    });
    expect(text).not.toContain("block_sha256");
    expect(text).not.toContain("source_manifest");
    expect(text).not.toContain("Bearer raw-token");
  });

  it("allows CORS preflight for source structure", () => {
    const response = route.OPTIONS(createRequest());

    expect(response.status).toBe(204);
    expect(response.headers.get("allow")).toBe("POST, OPTIONS");
  });
});

function createRequest(
  body = JSON.stringify({ sourceIds: [] }),
  contentType = "application/json",
): Request {
  return new Request(
    "http://localhost/api/canvas/courses/course-1/sources/structure",
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

function structure() {
  return {
    structureSessionId: "77777777-7777-4777-8777-777777777777",
    sources: [
      {
        ordinal: 1,
        type: "page",
        title: "Fictional Page",
        duplicateSummary: {
          duplicateKind: "none",
          repeatedReferenceCount: 0,
          repeatedReferenceKinds: [],
        },
        blocks: [
          {
            id: "88888888-8888-4888-8888-888888888881",
            kind: "heading",
            text: "Overview",
            sourceOrdinal: 1,
            blockOrdinal: 1,
            headingLevel: 1,
            selectable: true,
            selectedByDefault: true,
          },
          {
            id: "88888888-8888-4888-8888-888888888882",
            kind: "paragraph",
            text: "Readable page text.",
            sourceOrdinal: 1,
            blockOrdinal: 2,
            selectable: true,
            selectedByDefault: true,
          },
        ],
      },
    ],
    totalBlockCount: 2,
    selectedByDefaultCount: 2,
    limits: {
      maximumBlocks: 400,
      maximumSelectedBlocks: 250,
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
