import { describe, expect, it, vi } from "vitest";

import {
  cancelCanvasSyncJob,
  getCanvasCourseSyncHealth,
  getCanvasSyncJob,
  startCanvasCourseSyncJob,
} from "./canvasApi";

describe("Canvas durable sync API", () => {
  it("starts content sync with an idempotency key and accepts a job", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("Idempotency-Key")).toBe(
        "canvas-content-key-1",
      );
      return Response.json({ ok: true, data: job() }, { status: 202 });
    }) as typeof fetch;

    const result = await startCanvasCourseSyncJob({
      accessToken: "token",
      apiBaseUrl: "https://v2.example.test",
      courseId: "course-1",
      fetchImpl,
      idempotencyKey: "canvas-content-key-1",
    });

    expect(result).toMatchObject({
      ok: true,
      data: { id: "job-1", status: "queued" },
    });
  });

  it("polling network loss is operational and never calls console.error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await getCanvasSyncJob({
      accessToken: "token",
      apiBaseUrl: "https://v2.example.test",
      fetchImpl: vi.fn(async () => {
        throw new TypeError("offline");
      }) as typeof fetch,
      jobId: "job-1",
    });

    expect(result).toMatchObject({ ok: false, error: { code: "network_error" } });
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("explicit cancellation observes the server status without publishing a result", async () => {
    const cancelled = {
      ...job(),
      completedAt: "2026-07-28T00:01:00.000Z",
      progress: { ...job().progress, message: "Cancelled" },
      stage: "complete",
      status: "cancelled",
    };
    const result = await cancelCanvasSyncJob({
      accessToken: "token",
      apiBaseUrl: "https://v2.example.test",
      fetchImpl: vi.fn(async () =>
        Response.json({ ok: true, data: cancelled }),
      ) as typeof fetch,
      jobId: "job-1",
    });

    expect(result).toMatchObject({
      ok: true,
      data: { resultAvailable: false, resultSummary: null, status: "cancelled" },
    });
  });

  it("parses expanding totals, partial outcomes, and safe scope health", async () => {
    const partialJob = {
      ...job(),
      outcome: "partial",
      progress: {
        ...job().progress,
        completedUnits: 6,
        isTotalKnown: false,
        totalUnits: null,
      },
      scopeSummary: {
        healthy: 2,
        needsAttention: 1,
        notSynced: 1,
        stale: 0,
        syncing: 0,
      },
      status: "succeeded",
    };
    await expect(
      getCanvasSyncJob({
        accessToken: "token",
        apiBaseUrl: "https://v2.example.test",
        fetchImpl: vi.fn(async () =>
          Response.json({ data: partialJob, ok: true }),
        ) as typeof fetch,
        jobId: "job-1",
      }),
    ).resolves.toMatchObject({
      data: {
        outcome: "partial",
        progress: { isTotalKnown: false, totalUnits: null },
        scopeSummary: { needsAttention: 1 },
      },
      ok: true,
    });

    await expect(
      getCanvasCourseSyncHealth({
        accessToken: "token",
        apiBaseUrl: "https://v2.example.test",
        courseId: "course-1",
        fetchImpl: vi.fn(async () =>
          Response.json({ data: health(), ok: true }),
        ) as typeof fetch,
      }),
    ).resolves.toMatchObject({
      data: {
        attentionScopeCount: 1,
        overallHealth: "needs_attention",
        scopes: {
          announcements: { health: "needs_attention" },
          content: { health: "healthy" },
        },
      },
      ok: true,
    });
  });
});

function job() {
  return {
    acceptedAt: "2026-07-28T00:00:00.000Z",
    attemptCount: 0,
    cancellationRequestedAt: null,
    completedAt: null,
    course: {
      courseCode: null,
      displayName: "Neutral course",
      id: "course-1",
    },
    createdAt: "2026-07-28T00:00:00.000Z",
    errorCode: null,
    failedAt: null,
    id: "job-1",
    jobType: "course_content",
    progress: {
      completedUnits: 0,
      message: "Waiting to start",
      totalUnits: 1,
      unitLabel: "operations",
    },
    resultAvailable: false,
    resultSummary: null,
    retryable: false,
    safeErrorMessage: null,
    stage: "waiting_to_start",
    startedAt: null,
    status: "queued",
    updatedAt: "2026-07-28T00:00:00.000Z",
  };
}

function health() {
  const scope = (
    name: "content" | "announcements" | "files" | "grades",
    state:
      | "not_synced"
      | "syncing"
      | "healthy"
      | "needs_attention"
      | "stale",
  ) => ({
    counts: {
      deleted: 0,
      metadataOnly: 0,
      stale: state === "stale" ? 1 : 0,
      synced: state === "healthy" ? 4 : 0,
      temporarilyFailed: state === "needs_attention" ? 1 : 0,
    },
    health: state,
    lastCheckedAt: "2026-07-28T00:02:00.000Z",
    lastSuccessfulAt: state === "healthy"
      ? "2026-07-28T00:02:00.000Z"
      : null,
    retryable: state === "needs_attention",
    safeErrorCode: state === "needs_attention" ? "canvas_unavailable" : null,
    safeMessage: state === "needs_attention" ? "Try again." : null,
    scope: name,
  });
  return {
    activeJob: null,
    attentionScopeCount: 1,
    courseId: "course-1",
    lastCheckedAt: "2026-07-28T00:02:00.000Z",
    lastSuccessfulAt: "2026-07-28T00:02:00.000Z",
    overallHealth: "needs_attention",
    retryGuidance: "Sync again when Canvas is available.",
    scopes: {
      announcements: scope("announcements", "needs_attention"),
      content: scope("content", "healthy"),
      files: scope("files", "not_synced"),
      grades: scope("grades", "not_synced"),
    },
    staleScopeCount: 0,
  };
}
