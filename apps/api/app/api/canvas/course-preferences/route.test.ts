import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authResult: {
    ok: true,
    value: {
      client: { from: vi.fn(), rpc: vi.fn() },
      user: { id: "user-1" },
    },
  } as unknown,
  loadCanvasCourseInventory: vi.fn(),
  requireCanvasAuth: vi.fn(),
  saveCanvasCoursePreferences: vi.fn(),
}));

vi.mock("@/lib/canvas-routes", () => ({
  jsonResponse: (body: unknown, status: number) =>
    Response.json(body, { status }),
  optionsResponse: (_request: Request, methods: string) =>
    new Response(null, { headers: { allow: methods }, status: 204 }),
  requireCanvasAuth: mocks.requireCanvasAuth,
}));

vi.mock("@/lib/canvas-course-selection", () => ({
  loadCanvasCourseInventory: mocks.loadCanvasCourseInventory,
  saveCanvasCoursePreferences: mocks.saveCanvasCoursePreferences,
}));

const route = await import("./route");

describe("/api/canvas/course-preferences", () => {
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
    mocks.loadCanvasCourseInventory.mockResolvedValue({
      ok: true,
      value: {
        selectedCourseIds: ["00000000-0000-4000-8000-000000000001"],
      },
    });
    mocks.saveCanvasCoursePreferences.mockResolvedValue({
      ok: true,
      value: {
        deselectedCount: 0,
        selectedCount: 1,
        selectedCourseIds: ["00000000-0000-4000-8000-000000000001"],
      },
    });
  });

  it("requires Canvas API authentication", async () => {
    const authResponse = Response.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
    mocks.authResult = { ok: false, response: authResponse };

    const response = await route.GET(createRequest());

    expect(response.status).toBe(401);
    expect(mocks.loadCanvasCourseInventory).not.toHaveBeenCalled();
  });

  it("returns selected internal course IDs without exposing Canvas credentials", async () => {
    const response = await route.GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      selectedCourseIds: ["00000000-0000-4000-8000-000000000001"],
    });
    expect(mocks.loadCanvasCourseInventory).toHaveBeenCalledWith({
      client: currentAuthClient(),
      userId: "user-1",
    });
    expect(JSON.stringify(body)).not.toContain("token");
  });

  it.each([
    ["malformed JSON", "{nope", 400, "invalid_json"],
    ["missing selectedCourseIds", "{}", 400, "invalid_request"],
    [
      "blank selectedCourseIds entry",
      JSON.stringify({ selectedCourseIds: ["   "] }),
      400,
      "invalid_request",
    ],
  ] as const)("rejects %s", async (_name, rawBody, status, code) => {
    const response = await route.PUT(createRequest({ rawBody }));

    expect(response.status).toBe(status);
    await expectError(response, code);
    expect(mocks.saveCanvasCoursePreferences).not.toHaveBeenCalled();
  });

  it("rejects oversized preference payloads before parsing JSON", async () => {
    const response = await route.PUT(
      createRequest({
        contentLength: "16385",
        rawBody: JSON.stringify({ selectedCourseIds: [] }),
      }),
    );

    expect(response.status).toBe(413);
    await expectError(response, "payload_too_large");
    expect(mocks.saveCanvasCoursePreferences).not.toHaveBeenCalled();
  });

  it("saves trimmed internal course IDs through the authenticated user only", async () => {
    const selectedCourseId = "00000000-0000-4000-8000-000000000001";

    const response = await route.PUT(
      createRequest({
        body: {
          canvasConnectionId: "attacker-connection",
          selectedCourseIds: [` ${selectedCourseId} `],
          userId: "attacker-user",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      deselectedCount: 0,
      selectedCount: 1,
      selectedCourseIds: [selectedCourseId],
    });
    expect(mocks.saveCanvasCoursePreferences).toHaveBeenCalledWith({
      client: currentAuthClient(),
      selectedCourseIds: [selectedCourseId],
      userId: "user-1",
    });
  });

  it("propagates safe selection errors from the preference layer", async () => {
    mocks.saveCanvasCoursePreferences.mockResolvedValue({
      ok: false,
      status: 400,
      code: "invalid_request",
      message: "selectedCourseIds must not contain duplicates.",
    });

    const response = await route.PUT(
      createRequest({
        body: {
          selectedCourseIds: [
            "00000000-0000-4000-8000-000000000001",
            "00000000-0000-4000-8000-000000000001",
          ],
        },
      }),
    );

    expect(response.status).toBe(400);
    await expectError(response, "invalid_request");
  });

  it("allows CORS preflight for preference reads and writes", () => {
    const response = route.OPTIONS(createRequest());

    expect(response.status).toBe(204);
    expect(response.headers.get("allow")).toBe("GET, PUT, OPTIONS");
  });
});

function createRequest(
  options: {
    readonly body?: unknown;
    readonly contentLength?: string;
    readonly rawBody?: string;
  } = {},
): Request {
  const headers = new Headers({ authorization: "Bearer token" });
  if (options.contentLength) {
    headers.set("content-length", options.contentLength);
  }
  return new Request("http://localhost/api/canvas/course-preferences", {
    body: options.rawBody ?? JSON.stringify(options.body ?? {}),
    headers,
    method: "PUT",
  });
}

function currentAuthClient(): unknown {
  return (mocks.authResult as { readonly value: { readonly client: unknown } })
    .value.client;
}

async function expectError(response: Response, code: string): Promise<void> {
  const body = await response.json();
  expect(body).toMatchObject({
    ok: false,
    error: { code },
  });
  expect(JSON.stringify(body).toLowerCase()).not.toContain("stack");
}
