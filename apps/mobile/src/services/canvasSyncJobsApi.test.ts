import { describe, expect, it, vi } from "vitest";

import {
  cancelCanvasSyncJob,
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
