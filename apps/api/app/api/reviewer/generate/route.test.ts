import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerOpenAIProvider: vi.fn(),
  runPipeline: vi.fn(),
  verifyBearerToken: vi.fn(),
}));

vi.mock("@stay-focused/engine", () => ({
  runPipeline: mocks.runPipeline,
}));

vi.mock("@/lib/auth", () => ({
  verifyBearerToken: mocks.verifyBearerToken,
}));

vi.mock("@/providers", () => ({
  createServerOpenAIProvider: mocks.createServerOpenAIProvider,
}));

const { POST } = await import("./route");

const fakeProvider = { name: "fake-provider" };
const fakeReviewer = {
  id: "reviewer-1",
  title: "Mock Reviewer",
  sections: [],
  metadata: {
    sourceId: "source-1",
    planId: "plan-1",
    coverageReportId: "coverage-1",
    sourceTitle: "Mock Source",
    sourceKind: "plain-text",
    language: "en",
    sectionCount: 0,
    generatedSectionCount: 0,
    coverageStatus: "passed",
    coverageScore: 1,
    coverage: {},
    groundingStatus: "passed",
    groundingScore: 1,
    grounding: {},
    leakageStatus: "passed",
    leakage: {},
  },
};

describe("POST /api/reviewer/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyBearerToken.mockResolvedValue({ id: "user-1" });
    mocks.createServerOpenAIProvider.mockReturnValue(fakeProvider);
    mocks.runPipeline.mockResolvedValue(fakeReviewer);
  });

  it("returns 401 when the Authorization header is missing", async () => {
    const response = await POST(createRequest({ auth: null }));

    expect(response.status).toBe(401);
    await expectError(response, "unauthorized");
    expect(mocks.verifyBearerToken).not.toHaveBeenCalled();
    expect(mocks.runPipeline).not.toHaveBeenCalled();
  });

  it("returns 401 when the Authorization header is malformed", async () => {
    const malformedHeaders = [
      "",
      "token",
      "Basic token",
      "Bearer",
      "Bearer ",
      "Bearer token extra",
    ];

    for (const auth of malformedHeaders) {
      const response = await POST(createRequest({ auth }));

      expect(response.status).toBe(401);
      await expectError(response, "unauthorized");
    }

    expect(mocks.verifyBearerToken).not.toHaveBeenCalled();
    expect(mocks.runPipeline).not.toHaveBeenCalled();
  });

  it("returns 401 when the Supabase token is rejected", async () => {
    mocks.verifyBearerToken.mockResolvedValue(null);

    const response = await POST(createRequest());

    expect(response.status).toBe(401);
    await expectError(response, "unauthorized");
    expect(mocks.runPipeline).not.toHaveBeenCalled();
  });

  it("returns 400 when the JSON body is missing or malformed", async () => {
    const requests = [
      createRequest({ omitBody: true }),
      createRequest({ rawBody: "{not-json" }),
    ];

    for (const request of requests) {
      const response = await POST(request);

      expect(response.status).toBe(400);
      await expectError(response, "invalid_json");
    }

    expect(mocks.verifyBearerToken).not.toHaveBeenCalled();
    expect(mocks.runPipeline).not.toHaveBeenCalled();
  });

  it("returns 400 when sourceText is missing", async () => {
    const response = await POST(createRequest({ body: { sourceTitle: "Notes" } }));

    expect(response.status).toBe(400);
    await expectError(response, "invalid_request");
    expect(mocks.runPipeline).not.toHaveBeenCalled();
  });

  it("returns 400 when sourceText is empty or whitespace-only", async () => {
    for (const sourceText of ["", "   \n\t"]) {
      const response = await POST(createRequest({ body: { sourceText } }));

      expect(response.status).toBe(400);
      await expectError(response, "invalid_request");
    }

    expect(mocks.runPipeline).not.toHaveBeenCalled();
  });

  it("returns 400 when sourceText is not a string", async () => {
    const response = await POST(createRequest({ body: { sourceText: 123 } }));

    expect(response.status).toBe(400);
    await expectError(response, "invalid_request");
    expect(mocks.runPipeline).not.toHaveBeenCalled();
  });

  it("returns 400 when sourceTitle is not a string", async () => {
    const response = await POST(
      createRequest({ body: { sourceText: "Readable notes", sourceTitle: 123 } }),
    );

    expect(response.status).toBe(400);
    await expectError(response, "invalid_request");
    expect(mocks.runPipeline).not.toHaveBeenCalled();
  });

  it("returns 413 when Content-Length is oversized", async () => {
    const response = await POST(
      createRequest({
        headers: { "content-length": String(512 * 1024 + 1) },
      }),
    );

    expect(response.status).toBe(413);
    await expectError(response, "payload_too_large");
    expect(mocks.verifyBearerToken).not.toHaveBeenCalled();
    expect(mocks.runPipeline).not.toHaveBeenCalled();
  });

  it("returns a clear input-too-large error when sourceText is oversized", async () => {
    const response = await POST(
      createRequest({ body: { sourceText: "x".repeat(100_001) } }),
    );

    expect(response.status).toBe(413);
    await expectError(response, "source_text_too_large");
    expect(mocks.verifyBearerToken).not.toHaveBeenCalled();
    expect(mocks.runPipeline).not.toHaveBeenCalled();
  });

  it("returns a safe server error when OPENAI_API_KEY is missing", async () => {
    mocks.createServerOpenAIProvider.mockImplementation(() => {
      throw new Error("OPENAI_API_KEY is required: sk-secret-test-value");
    });

    const response = await POST(createRequest());
    const body = await expectError(response, "provider_configuration_error");

    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("sk-secret-test-value");
    expect(JSON.stringify(body)).not.toContain("OPENAI_API_KEY is required");
    expect(mocks.runPipeline).not.toHaveBeenCalled();
  });

  it("returns a safe server error when provider creation throws", async () => {
    mocks.createServerOpenAIProvider.mockImplementation(() => {
      throw new Error("provider stack trace with sensitive details");
    });

    const response = await POST(createRequest());
    const body = await expectError(response, "provider_configuration_error");

    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("sensitive details");
    expect(mocks.runPipeline).not.toHaveBeenCalled();
  });

  it("returns a safe server error when the engine throws", async () => {
    mocks.runPipeline.mockRejectedValue(new Error("engine stack trace"));

    const response = await POST(createRequest());
    const body = await expectError(response, "reviewer_generation_failed");

    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("engine stack trace");
  });

  it("returns 200 with a reviewer for a valid mocked request", async () => {
    const response = await POST(
      createRequest({
        body: {
          sourceText: "  Photosynthesis converts light into chemical energy.  ",
          sourceTitle: "  Biology Notes  ",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, reviewer: fakeReviewer });
    expect(mocks.runPipeline).toHaveBeenCalledWith({
      input: {
        text: "Photosynthesis converts light into chemical energy.",
        title: "Biology Notes",
      },
      provider: fakeProvider,
    });
  });
});

function createRequest(
  options: {
    readonly auth?: string | null;
    readonly body?: unknown;
    readonly rawBody?: string;
    readonly omitBody?: boolean;
    readonly headers?: Readonly<Record<string, string>>;
  } = {},
): Request {
  const headers = new Headers({
    "content-type": "application/json",
    ...options.headers,
  });
  if (options.auth !== null) {
    headers.set("authorization", options.auth ?? "Bearer valid-token");
  }

  const body = options.omitBody
    ? undefined
    : options.rawBody !== undefined
      ? options.rawBody
      : options.body !== undefined
        ? JSON.stringify(options.body)
        : JSON.stringify({ sourceText: "Readable notes" });

  return new Request("http://localhost/api/reviewer/generate", {
    method: "POST",
    headers,
    body,
  });
}

async function expectError(
  response: Response,
  code: string,
): Promise<unknown> {
  const body = await response.json();
  expect(body).toMatchObject({
    ok: false,
    error: { code },
  });
  expect(JSON.stringify(body)).not.toContain("Error:");
  expect(JSON.stringify(body).toLowerCase()).not.toContain("stack");
  expect(body).not.toHaveProperty("stack");
  return body;
}
