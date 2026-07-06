import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authResult: {
    ok: true,
    value: {
      client: { from: vi.fn(), rpc: vi.fn() },
      user: { id: "user-1" },
    },
  } as unknown,
  listCanvasReviewerSources: vi.fn(),
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
  listCanvasReviewerSources: mocks.listCanvasReviewerSources,
}));

const route = await import("./route");

describe("GET /api/canvas/courses/[courseId]/sources", () => {
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
    mocks.listCanvasReviewerSources.mockResolvedValue({
      ok: true,
      value: sourceList(),
    });
  });

  it("requires Canvas API authentication", async () => {
    const authResponse = Response.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
    mocks.authResult = { ok: false, response: authResponse };

    const response = await route.GET(createRequest(), createContext("course-1"));

    expect(response.status).toBe(401);
    expect(mocks.listCanvasReviewerSources).not.toHaveBeenCalled();
  });

  it("rejects blank route course IDs before reading sources", async () => {
    const response = await route.GET(createRequest(), createContext("   "));

    expect(response.status).toBe(404);
    await expectError(response, "canvas_course_not_found");
    expect(mocks.listCanvasReviewerSources).not.toHaveBeenCalled();
  });

  it("returns source descriptors without source bodies or raw Canvas fields", async () => {
    const response = await route.GET(
      createRequest("?limit=25&offset=2"),
      createContext("00000000-0000-4000-8000-000000000001"),
    );
    const text = await response.text();
    const body = JSON.parse(text) as unknown;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      availableSourceCount: 1,
      sources: [
        {
          id: "page:11111111-1111-4111-8111-111111111111",
          availability: "available",
        },
        {
          id: "file:22222222-2222-4222-8222-222222222222",
          availability: "unavailable",
        },
      ],
    });
    expect(mocks.listCanvasReviewerSources).toHaveBeenCalledWith({
      client: currentAuthClient(),
      courseId: "00000000-0000-4000-8000-000000000001",
      limit: 25,
      offset: 2,
      userId: "user-1",
    });
    expect(text).not.toContain("body_html");
    expect(text).not.toContain("description_html");
    expect(text).not.toContain("message_html");
    expect(text).not.toContain("canvas_page_id");
    expect(text).not.toContain("storage_object_key");
    expect(text).not.toContain("Synthetic body text");
  });

  it("propagates selected-course authorization failures safely", async () => {
    mocks.listCanvasReviewerSources.mockResolvedValue({
      ok: false,
      status: 400,
      code: "canvas_course_not_selected",
      message: "Select this Canvas course before selecting sources.",
    });

    const response = await route.GET(
      createRequest(),
      createContext("00000000-0000-4000-8000-000000000001"),
    );

    expect(response.status).toBe(400);
    await expectError(response, "canvas_course_not_selected");
  });

  it("allows CORS preflight for source listing", () => {
    const response = route.OPTIONS(createRequest());

    expect(response.status).toBe(204);
    expect(response.headers.get("allow")).toBe("GET, OPTIONS");
  });
});

function createRequest(search = ""): Request {
  return new Request(`http://localhost/api/canvas/courses/course-1/sources${search}`, {
    headers: { authorization: "Bearer token" },
    method: "GET",
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

function sourceList() {
  return {
    courseId: "00000000-0000-4000-8000-000000000001",
    courseSync: {
      status: "partial",
      completedAt: "2026-07-07T00:00:00.000Z",
      lastSuccessfulSyncAt: "2026-07-07T00:00:00.000Z",
      latestResultWasPartial: true,
      synchronizedSourcesAvailable: true,
      failureCategories: ["canvas_course_files_failed"],
    },
    availableSourceCount: 1,
    unavailableSourceCount: 1,
    sources: [
      {
        id: "page:11111111-1111-4111-8111-111111111111",
        type: "page",
        title: "Fictional Page",
        availability: "available",
        unavailableReason: null,
        updatedAt: "2026-07-07T00:00:00.000Z",
        estimatedCharacters: 120,
      },
      {
        id: "file:22222222-2222-4222-8222-222222222222",
        type: "file",
        title: "Fictional File",
        availability: "unavailable",
        unavailableReason: "Text extraction for this file type is not available yet.",
        updatedAt: "2026-07-07T00:00:00.000Z",
        estimatedCharacters: null,
      },
    ],
    pagination: {
      limit: 25,
      offset: 2,
      returned: 2,
      hasMore: false,
      totalKnown: 2,
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
