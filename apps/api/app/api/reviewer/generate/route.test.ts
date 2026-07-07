import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class PipelineAssemblyError extends Error {
    public readonly diagnostics = {
      causeMessage:
        'Stage 6 cannot assemble planned section "planned-1" because coverage status is weak and allowWeakSections is false.',
      failingSections: [
        {
          plannedSectionId: "planned-1",
          sourceSectionId: "source-section-1",
          title: "Weak Section",
          status: "weak",
          failureReasons: ["coverage-weak"],
          issues: ["Weak content field: sourceCore.explanation."],
          retryCount: 2,
          coverageScore: 0.84,
          groundingScore: 1,
          leakageIssueCount: 0,
        },
      ],
      sectionValidationFailures: [],
    };

    public constructor(message = "Pipeline assembly failed.") {
      super(message);
      this.name = "PipelineAssemblyError";
    }
  }

  return {
    createCanvasServiceClient: vi.fn(),
    createServerOpenAIProvider: vi.fn(),
    createOrReuseReviewerSourceSnapshot: vi.fn(),
    PipelineAssemblyError,
    runPipeline: vi.fn(),
    validateCanvasPreviewSessionForGeneration: vi.fn(),
    verifyBearerToken: vi.fn(),
  };
});

vi.mock("@stay-focused/engine", () => ({
  PipelineAssemblyError: mocks.PipelineAssemblyError,
  runPipeline: mocks.runPipeline,
}));

vi.mock("@/lib/auth", () => ({
  verifyBearerToken: mocks.verifyBearerToken,
}));

vi.mock("@/lib/canvas-db", () => ({
  createCanvasServiceClient: mocks.createCanvasServiceClient,
}));

vi.mock("@/lib/reviewer-source-provenance", () => ({
  createOrReuseReviewerSourceSnapshot:
    mocks.createOrReuseReviewerSourceSnapshot,
  validateCanvasPreviewSessionForGeneration:
    mocks.validateCanvasPreviewSessionForGeneration,
}));

vi.mock("@/providers", () => ({
  createServerOpenAIProvider: mocks.createServerOpenAIProvider,
}));

const { OPTIONS, POST } = await import("./route");

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
    mocks.createCanvasServiceClient.mockReturnValue({ from: vi.fn(), rpc: vi.fn() });
    mocks.validateCanvasPreviewSessionForGeneration.mockResolvedValue({
      ok: true,
      value: { row: previewSessionRow() },
    });
    mocks.createOrReuseReviewerSourceSnapshot.mockResolvedValue({
      ok: true,
      value: { sourceSnapshotId: "77777777-7777-4777-8777-777777777777" },
    });
    mocks.createServerOpenAIProvider.mockReturnValue(fakeProvider);
    mocks.runPipeline.mockResolvedValue(fakeReviewer);
  });

  it.each([
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://[::1]:8081",
  ])("returns local web CORS headers for reviewer preflight from %s", (origin) => {
    const response = OPTIONS(
      new Request("http://localhost/api/reviewer/generate", {
        method: "OPTIONS",
        headers: {
          "access-control-request-headers": "authorization, content-type",
          "access-control-request-method": "POST",
          origin,
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(origin);
    expect(response.headers.get("access-control-allow-origin")).not.toBe("*");
    expect(response.headers.get("access-control-allow-methods")).toBe(
      "POST, OPTIONS",
    );
    expect(response.headers.get("access-control-allow-headers")).toBe(
      "authorization, content-type",
    );
  });

  it("omits CORS allow-origin for non-local preflight origins", () => {
    const response = OPTIONS(
      new Request("http://localhost/api/reviewer/generate", {
        method: "OPTIONS",
        headers: {
          "access-control-request-method": "POST",
          origin: "https://example.com",
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("access-control-allow-origin")).not.toBe("*");
    expect(response.headers.get("access-control-allow-methods")).toBeNull();
    expect(response.headers.get("access-control-allow-headers")).toBeNull();
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

  it("returns 422 when reviewer validation fails after retries", async () => {
    mocks.runPipeline.mockRejectedValue(
      new mocks.PipelineAssemblyError(
        'Stage 6 cannot assemble planned section "planned-1" because coverage status is weak and allowWeakSections is false.',
      ),
    );

    const response = await POST(createRequest());
    const body = await expectError(response, "reviewer_validation_failed");

    expect(response.status).toBe(422);
    expect(body).toMatchObject({
      error: {
        diagnostic: {
          failingStage: "stage4-coverage",
          failingSectionTitle: "Weak Section",
          validationReason: "coverage-weak",
          retryCount: 2,
        },
      },
    });
    expect(JSON.stringify(body)).not.toContain("planned-1");
    expect(JSON.stringify(body)).not.toContain("Weak content field");
  });

  it("rejects an invalid Canvas preview session before provider creation", async () => {
    mocks.validateCanvasPreviewSessionForGeneration.mockResolvedValue({
      ok: false,
      status: 400,
      code: "canvas_preview_session_invalid",
      message: "Canvas preview session is invalid.",
    });

    const response = await POST(
      createRequest({
        body: {
          sourceText: "Readable notes",
          canvasPreviewSessionId: "not-a-uuid",
        },
      }),
    );

    expect(response.status).toBe(400);
    await expectError(response, "canvas_preview_session_invalid");
    expect(mocks.createServerOpenAIProvider).not.toHaveBeenCalled();
    expect(mocks.runPipeline).not.toHaveBeenCalled();
  });

  it("rejects an expired Canvas preview session before provider creation", async () => {
    mocks.validateCanvasPreviewSessionForGeneration.mockResolvedValue({
      ok: false,
      status: 409,
      code: "canvas_preview_session_expired",
      message: "Canvas preview session has expired. Preview the sources again.",
    });

    const response = await POST(
      createRequest({
        body: {
          sourceText: "Readable notes",
          canvasPreviewSessionId: "66666666-6666-4666-8666-666666666666",
        },
      }),
    );

    expect(response.status).toBe(409);
    await expectError(response, "canvas_preview_session_expired");
    expect(mocks.createServerOpenAIProvider).not.toHaveBeenCalled();
    expect(mocks.runPipeline).not.toHaveBeenCalled();
  });

  it("creates no source snapshot when reviewer generation fails", async () => {
    mocks.runPipeline.mockRejectedValue(new Error("engine stack trace"));

    const response = await POST(
      createRequest({
        body: {
          sourceText: "Readable notes",
          canvasPreviewSessionId: "66666666-6666-4666-8666-666666666666",
        },
      }),
    );

    expect(response.status).toBe(500);
    await expectError(response, "reviewer_generation_failed");
    expect(mocks.createOrReuseReviewerSourceSnapshot).not.toHaveBeenCalled();
  });

  it("returns an opaque source snapshot id after Canvas generation succeeds", async () => {
    const response = await POST(
      createRequest({
        body: {
          sourceText: "Edited Canvas preview text.",
          sourceTitle: "Canvas Notes",
          canvasPreviewSessionId: "66666666-6666-4666-8666-666666666666",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      reviewer: fakeReviewer,
      sourceSnapshotId: "77777777-7777-4777-8777-777777777777",
    });
    expect(mocks.createOrReuseReviewerSourceSnapshot).toHaveBeenCalledWith({
      client: expect.anything(),
      previewSession: { row: previewSessionRow() },
      sourceText: "Edited Canvas preview text.",
      sourceTitle: "Canvas Notes",
      userId: "user-1",
    });
    expect(JSON.stringify(body)).not.toContain("sha256");
    expect(JSON.stringify(body)).not.toContain("exact_source_text");
    expect(JSON.stringify(body)).not.toContain("canvas_connection_id");
  });

  it("does not send Canvas provenance fields to the reviewer provider boundary", async () => {
    await POST(
      createRequest({
        body: {
          sourceText: "Edited Canvas preview text.",
          sourceTitle: "Canvas Notes",
          canvasPreviewSessionId: "66666666-6666-4666-8666-666666666666",
        },
      }),
    );

    const providerInput = mocks.runPipeline.mock.calls[0]?.[0];
    expect(providerInput).toEqual({
      input: {
        text: "Edited Canvas preview text.",
        title: "Canvas Notes",
      },
      provider: fakeProvider,
    });
    const serialized = JSON.stringify(providerInput);
    expect(serialized).not.toContain("66666666-6666-4666-8666-666666666666");
    expect(serialized).not.toContain("77777777-7777-4777-8777-777777777777");
    expect(serialized).not.toContain("canvas_connection_id");
    expect(serialized).not.toContain("canvas_course_id");
    expect(serialized).not.toContain("source_row_id");
    expect(serialized).not.toContain("file_id");
    expect(serialized).not.toContain("sha256");
    expect(serialized).not.toContain("parser_version");
    expect(serialized).not.toContain("ocr_version");
    expect(serialized).not.toContain("storage_object_key");
  });

  it("returns 200 with a reviewer for a valid mocked request", async () => {
    const response = await POST(
      createRequest({
        headers: { origin: "http://localhost:8081" },
        body: {
          sourceText: "  Photosynthesis converts light into chemical energy.  ",
          sourceTitle: "  Biology Notes  ",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:8081",
    );
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

function previewSessionRow() {
  return {
    id: "66666666-6666-4666-8666-666666666666",
    user_id: "user-1",
    canvas_connection_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    course_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    original_preview_text: "Original Canvas preview text.",
    original_preview_sha256:
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    suggested_title: "Canvas Notes",
    source_count: 2,
    source_manifest: [],
    selected_block_manifest: [],
    normalization_version: "canvas-source-preview-v1",
    created_at: "2026-07-07T00:00:00.000Z",
    expires_at: "2026-07-08T00:00:00.000Z",
  };
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
