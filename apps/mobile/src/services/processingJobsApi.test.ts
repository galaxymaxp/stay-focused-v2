import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("tus-js-client", () => ({
  Upload: class TestUpload {},
}));

vi.mock("../auth/supabaseClient", () => ({
  getSupabaseMobileConfig: () => ({
    ok: true,
    data: {
      supabaseAnonKey: "test-anon-key",
      supabaseUrl: "https://example.supabase.co",
    },
  }),
}));

import {
  cancelProcessingJob,
  createExtractionJob,
  createReviewerJob,
  getExtractionJobResult,
  getProcessingJobStatus,
  listProcessingJobsPage,
} from "./processingJobsApi";

const BASE_INPUT = {
  accessToken: "test-access-token",
  apiBaseUrl: "http://127.0.0.1:3000",
} as const;

describe("processing jobs mobile API", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reuses the caller idempotency key so duplicate taps resolve to one server job", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (_url, init) => {
      expect(new Headers(init?.headers).get("Idempotency-Key")).toBe(
        "reviewer:mobile:duplicate-1",
      );
      return jsonResponse({ ok: true, data: jobView() }, 202);
    });
    const input = {
      ...BASE_INPUT,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      idempotencyKey: "reviewer:mobile:duplicate-1",
      sourceText: "Neutral source text.",
    };

    const [first, replay] = await Promise.all([
      createReviewerJob(input),
      createReviewerJob(input),
    ]);
    expect(first).toEqual(replay);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("hands a selective Canvas preview identity to the durable reviewer job", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (_url, init) => {
      expect(JSON.parse(String(init?.body))).toMatchObject({
        jobType: "reviewer_generation",
        sourceText: "Server-resolved selected block text.",
        canvasPreviewSessionId: "preview-session-1",
        canvasCourseId: "course-1",
        canvasItemIds: ["page:item-1"],
        canvasResolutionFingerprint: "resolution-fingerprint-1",
      });
      return jsonResponse({ ok: true, data: jobView() }, 202);
    });

    await expect(
      createReviewerJob({
        ...BASE_INPUT,
        canvasCourseId: "course-1",
        canvasItemIds: ["page:item-1"],
        canvasPreviewSessionId: "preview-session-1",
        canvasResolutionFingerprint: "resolution-fingerprint-1",
        fetchImpl: fetchImpl as unknown as typeof fetch,
        idempotencyKey: "reviewer:canvas:selective-1",
        sourceText: "Server-resolved selected block text.",
      }),
    ).resolves.toMatchObject({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("preserves page-aware extraction blocks for reviewer submission", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        ok: true,
        data: {
          jobType: "document_extraction",
          result: {
            text: "Topic\nBody",
            pageCount: 1,
            processedPageCount: 1,
            sourceBlocks: [
              { id: "page-1", kind: "unknown", order: 0, pageNumber: 1, text: "Topic\nBody" },
            ],
          },
        },
      }),
    );

    await expect(getExtractionJobResult({
      ...BASE_INPUT,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      jobId: "extraction-job-1",
    })).resolves.toMatchObject({
      ok: true,
      data: {
        sourceBlocks: [{ id: "page-1", order: 0, pageNumber: 1, text: "Topic\nBody" }],
      },
    });
  });

  it("stages bytes directly before accepting a durable extraction job", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (url, init) => {
      const path = String(url);
      if (path.endsWith("/api/job-uploads")) {
        expect(JSON.parse(String(init?.body))).toEqual({
          displayName: "Neutral Notes + Appendix.pdf",
          mimeType: "application/pdf",
          byteSize: 4,
        });
        return jsonResponse({
          ok: true,
          data: {
            uploadId: "upload-1",
            bucket: "processing-job-sources",
            objectPath: "user/uploads/upload-1.pdf",
            tusEndpoint: "https://project.storage.supabase.co/storage/v1/upload/resumable",
            chunkSize: 6291456,
            expiresAt: "2026-07-27T08:00:00.000Z",
          },
        }, 201);
      }
      expect(path).toContain("/api/job-uploads/upload-1/accept");
      expect(new Headers(init?.headers).get("Idempotency-Key")).toBe(
        "extraction:display-name:1",
      );
      return jsonResponse({
        ok: true,
        data: jobView({
          jobType: "document_extraction",
          source: {
            displayName: "Neutral Notes + Appendix.pdf",
            mimeType: "application/pdf",
            sourceKind: "pdf",
          },
        }),
      }, 202);
    });
    const tusUploadImpl = vi.fn(async () => undefined);

    const result = await createExtractionJob({
      ...BASE_INPUT,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      idempotencyKey: "extraction:display-name:1",
      platformOS: "web",
      tusUploadImpl,
      source: {
        kind: "pdf",
        value: {
          fileName: "Neutral Notes + Appendix.pdf",
          fileSize: 4,
          mimeType: "application/pdf",
          uri: "blob:neutral-pdf",
          webFile: new Blob(["%PDF"], { type: "application/pdf" }),
        },
      },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        source: { displayName: "Neutral Notes + Appendix.pdf" },
      },
    });
    expect(tusUploadImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: "Neutral Notes + Appendix.pdf",
        mimeType: "application/pdf",
      }),
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("treats temporary network loss as operational and never calls console.error", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = await getProcessingJobStatus({
      ...BASE_INPUT,
      fetchImpl: vi.fn(async () => {
        throw new TypeError("network unavailable");
      }) as unknown as typeof fetch,
      jobId: "job-1",
    });

    expect(result).toMatchObject({ ok: false, error: { code: "network_error" } });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("treats a polling AbortError as handled without opening LogBox", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const result = await getProcessingJobStatus({
      ...BASE_INPUT,
      fetchImpl: vi.fn(async () => {
        throw new DOMException("Aborted", "AbortError");
      }) as unknown as typeof fetch,
      jobId: "job-1",
    });

    expect(result).toMatchObject({ ok: false, error: { code: "request_timeout" } });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("polling and disconnection do not send cancellation requests", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({ ok: true, data: jobView({ status: "running" }) }),
    );
    await getProcessingJobStatus({
      ...BASE_INPUT,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      jobId: "job-1",
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toMatch(/\/api\/jobs\/job-1$/);
    expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe("GET");
  });

  it("uses an explicit POST only when the user requests cancellation", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({ ok: true, data: jobView({ status: "cancellation_requested" }) }),
    );
    const result = await cancelProcessingJob({
      ...BASE_INPUT,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      jobId: "job-1",
    });

    expect(result).toMatchObject({
      ok: true,
      data: { status: "cancellation_requested" },
    });
    expect(String(fetchImpl.mock.calls[0]?.[0])).toMatch(
      /\/api\/jobs\/job-1\/cancel$/,
    );
    expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe("POST");
  });

  it("requests bounded processing history with an opaque cursor", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (url) => {
      expect(String(url)).toContain("scope=all");
      expect(String(url)).toContain("limit=20");
      expect(String(url)).toContain("cursor=opaque-next");
      return jsonResponse({
        ok: true,
        data: { jobs: [jobView()], nextCursor: null },
      });
    });
    const result = await listProcessingJobsPage({
      ...BASE_INPUT,
      cursor: "opaque-next",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      limit: 20,
    });
    expect(result).toMatchObject({
      ok: true,
      data: { jobs: [{ id: "job-1" }], nextCursor: null },
    });
  });
});

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

function jobView(overrides: Record<string, unknown> = {}) {
  return {
    acceptedAt: "2026-07-23T00:00:00.000Z",
    attemptCount: 0,
    cancellationRequestedAt: null,
    completedAt: null,
    createdAt: "2026-07-23T00:00:00.000Z",
    errorCode: null,
    failedAt: null,
    id: "job-1",
    jobType: "reviewer_generation",
    progress: {
      completedUnits: null,
      message: "Waiting to start",
      totalUnits: null,
      unitLabel: null,
    },
    resultAvailable: false,
    retryable: false,
    retryOfJobId: null,
    safeErrorMessage: null,
    source: {
      characterCount: 20,
      displayName: "Neutral source",
      mimeType: "text/plain",
      sourceKind: "text",
    },
    stage: "preparing_source",
    startedAt: null,
    status: "queued",
    updatedAt: "2026-07-23T00:00:00.000Z",
    ...overrides,
  };
}
