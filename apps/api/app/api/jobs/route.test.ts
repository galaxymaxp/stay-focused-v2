import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  calls: [] as string[],
  createCanvasServiceClient: vi.fn(),
  createExtractionProcessingJob: vi.fn(),
  createProcessingJobServiceClient: vi.fn(),
  createReviewerProcessingJob: vi.fn(),
  createOrReuseReviewerSourceSnapshot: vi.fn(),
  scheduleAcceptedProcessingJobDispatch: vi.fn(),
  validateCanvasReviewerGenerationGate: vi.fn(),
  validateCanvasPreviewSessionForGeneration: vi.fn(),
  verifyBearerToken: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ verifyBearerToken: mocks.verifyBearerToken }));
vi.mock("@/lib/canvas-db", () => ({
  createCanvasServiceClient: mocks.createCanvasServiceClient,
}));
vi.mock("@/lib/canvas-reviewer-generation-gate", () => ({
  validateCanvasReviewerGenerationGate: mocks.validateCanvasReviewerGenerationGate,
}));
vi.mock("@/lib/processing-jobs/background-dispatch", () => ({
  scheduleAcceptedProcessingJobDispatch: mocks.scheduleAcceptedProcessingJobDispatch,
}));
vi.mock("@/lib/processing-jobs/creation", () => ({
  createExtractionProcessingJob: mocks.createExtractionProcessingJob,
  createReviewerProcessingJob: mocks.createReviewerProcessingJob,
  ProcessingJobCreationError: class ProcessingJobCreationError extends Error {},
  validateIdempotencyKey: (value: string) => value,
}));
vi.mock("@/lib/processing-jobs/repository", () => ({
  createProcessingJobServiceClient: mocks.createProcessingJobServiceClient,
  listOwnedActiveProcessingJobs: vi.fn(),
  listOwnedProcessingJobs: vi.fn(),
  toProcessingJobStatusView: (job: unknown) => job,
}));
vi.mock("@/lib/processing-jobs/structured-source-blocks", () => ({
  readStructuredSourceBlocks: () => [],
}));
vi.mock("@/lib/processing-jobs/source-display-name", () => ({
  readUploadDisplayName: vi.fn(),
}));
vi.mock("@/lib/ocr/extraction-service", () => ({
  validateImageOcrBytes: vi.fn(),
  validatePdfOcrBytes: vi.fn(),
}));
vi.mock("@/lib/ocr/upload-policy", () => ({
  getConfiguredDurableDocumentMaxPdfPages: () => 100,
  OCR_MAX_IMAGE_BYTES: 10_000_000,
  OCR_MAX_PDF_BYTES: 50_000_000,
}));
vi.mock("@/lib/reviewer-source-provenance", () => ({
  createOrReuseReviewerSourceSnapshot: mocks.createOrReuseReviewerSourceSnapshot,
  validateCanvasPreviewSessionForGeneration:
    mocks.validateCanvasPreviewSessionForGeneration,
}));

const { POST } = await import("./route");

describe("POST /api/jobs reviewer admission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calls.length = 0;
    mocks.verifyBearerToken.mockResolvedValue({ id: "user-1" });
    mocks.createCanvasServiceClient.mockReturnValue({});
    mocks.createProcessingJobServiceClient.mockReturnValue({});
    mocks.validateCanvasPreviewSessionForGeneration.mockResolvedValue({
      ok: true,
      value: {
        row: {
          id: "11111111-1111-4111-8111-111111111111",
          original_preview_text: "Page 1\nDebit and credit.\n\nPage 2\nJournal entries.",
        },
      },
    });
    mocks.validateCanvasReviewerGenerationGate.mockResolvedValue({ ok: true });
    mocks.createOrReuseReviewerSourceSnapshot.mockImplementation(async () => {
      mocks.calls.push("snapshot");
      return {
        ok: true,
        value: { sourceSnapshotId: "22222222-2222-4222-8222-222222222222" },
      };
    });
    mocks.createReviewerProcessingJob.mockImplementation(async () => {
      mocks.calls.push("job");
      return job();
    });
    mocks.scheduleAcceptedProcessingJobDispatch.mockImplementation(() => {
      mocks.calls.push("dispatch");
    });
  });

  it("creates a durable job from the owned preview reference before dispatch", async () => {
    const requestBody = canvasRequestBody();
    const response = await POST(request(requestBody));
    const responseText = await response.text();

    expect(response.status).toBe(202);
    expect(responseText.length).toBeLessThan(2_000);
    expect(requestBody).not.toHaveProperty("sourceText");
    expect(mocks.createOrReuseReviewerSourceSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceText: "Page 1\nDebit and credit.\n\nPage 2\nJournal entries.",
        userId: "user-1",
      }),
    );
    expect(mocks.createReviewerProcessingJob).toHaveBeenCalledWith(
      expect.objectContaining({
        source: expect.objectContaining({
          sourceText: "Page 1\nDebit and credit.\n\nPage 2\nJournal entries.",
        }),
        userId: "user-1",
      }),
    );
    expect(mocks.calls).toEqual(["snapshot", "job", "dispatch"]);
  });

  it("creates no snapshot or job before authentication succeeds", async () => {
    mocks.verifyBearerToken.mockResolvedValue(null);

    const response = await POST(request(canvasRequestBody()));

    expect(response.status).toBe(401);
    expect(mocks.createOrReuseReviewerSourceSnapshot).not.toHaveBeenCalled();
    expect(mocks.createReviewerProcessingJob).not.toHaveBeenCalled();
    expect(mocks.scheduleAcceptedProcessingJobDispatch).not.toHaveBeenCalled();
  });

  it("creates no orphan job when ownership validation rejects the preview", async () => {
    mocks.validateCanvasPreviewSessionForGeneration.mockResolvedValue({
      ok: false,
      status: 404,
      code: "canvas_preview_session_not_found",
      message: "Canvas preview session was not found.",
    });

    const response = await POST(request(canvasRequestBody()));

    expect(response.status).toBe(404);
    expect(mocks.createOrReuseReviewerSourceSnapshot).not.toHaveBeenCalled();
    expect(mocks.createReviewerProcessingJob).not.toHaveBeenCalled();
  });
});

function canvasRequestBody(): Record<string, unknown> {
  return {
    jobType: "reviewer_generation",
    sourceTitle: "2-Journaling.pdf",
    canvasPreviewSessionId: "11111111-1111-4111-8111-111111111111",
    canvasCourseId: "33333333-3333-4333-8333-333333333333",
    canvasItemIds: ["file:44444444-4444-4444-8444-444444444444"],
    canvasResolutionFingerprint: "a".repeat(64),
    language: "auto",
    outputMode: "standard",
    reuseMode: "fresh",
  };
}

function request(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/jobs", {
    method: "POST",
    headers: {
      authorization: "Bearer test-token",
      "content-type": "application/json",
      "idempotency-key": "reviewer:canvas:b32-test",
    },
    body: JSON.stringify(body),
  });
}

function job(): Record<string, unknown> {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    job_type: "reviewer_generation",
    status: "queued",
    stage: "preparing_source",
    status_message: "Waiting to start",
    retryable: false,
    created_at: "2026-09-20T00:00:00.000Z",
    updated_at: "2026-09-20T00:00:00.000Z",
  };
}
