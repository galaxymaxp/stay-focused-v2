import type { ProcessingJobDatabaseRow } from "@stay-focused/db";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("workflow/api", () => ({ start: vi.fn() }));
vi.mock("@/workflows/processing-job", () => ({
  processingJobWorkflow: vi.fn(),
}));

import {
  dispatchAcceptedProcessingJob,
  getProcessingExecutionBackend,
  ProcessingWorkflowDispatchError,
} from "./workflow-dispatch";

describe("processing workflow dispatch", () => {
  afterEach(() => {
    delete process.env.PROCESSING_EXECUTION_BACKEND;
    delete process.env.VERCEL;
  });

  it("keeps the database worker as the explicit local default", () => {
    expect(getProcessingExecutionBackend({})).toBe("database_worker");
    expect(getProcessingExecutionBackend({ VERCEL: "1" })).toBe(
      "vercel_workflow",
    );
    expect(
      getProcessingExecutionBackend({
        PROCESSING_EXECUTION_BACKEND: "database_worker",
        VERCEL: "1",
      }),
    ).toBe("database_worker");
  });

  it("starts only after preparing the persisted job and records the run ID", async () => {
    process.env.PROCESSING_EXECUTION_BACKEND = "vercel_workflow";
    const calls: string[] = [];
    const prepared = job({ execution_backend: "vercel_workflow" });
    const attached = job({
      execution_backend: "vercel_workflow",
      workflow_dispatched_at: "2026-07-27T00:00:01.000Z",
      workflow_run_id: "wfr_123456789",
    });
    const rpc = vi.fn(async (name: string) => {
      calls.push(name);
      return name === "prepare_processing_job_workflow_dispatch_v1"
        ? { data: [prepared], error: null }
        : { data: [attached], error: null };
    });
    const startWorkflow = vi.fn(async () => {
      calls.push("start");
      return { runId: "wfr_123456789" };
    });

    await expect(
      dispatchAcceptedProcessingJob(job(), {
        client: { rpc } as never,
        startWorkflow,
      }),
    ).resolves.toBe(attached);
    expect(calls).toEqual([
      "prepare_processing_job_workflow_dispatch_v1",
      "start",
      "attach_processing_job_workflow_v1",
    ]);
  });

  it("records a safe retryable failure when Vercel never accepts the run", async () => {
    process.env.PROCESSING_EXECUTION_BACKEND = "vercel_workflow";
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: [job({ execution_backend: "vercel_workflow" })],
        error: null,
      })
      .mockResolvedValueOnce({ data: [job({ status: "failed" })], error: null });

    await expect(
      dispatchAcceptedProcessingJob(job(), {
        client: { rpc } as never,
        startWorkflow: vi.fn(async () => {
          throw new Error("private provider detail");
        }),
      }),
    ).rejects.toBeInstanceOf(ProcessingWorkflowDispatchError);
    expect(rpc).toHaveBeenLastCalledWith(
      "mark_processing_job_dispatch_failed_v1",
      { p_job_id: "job-1" },
    );
  });

  it("does not falsely fail work after Vercel has durably accepted it", async () => {
    process.env.PROCESSING_EXECUTION_BACKEND = "vercel_workflow";
    const prepared = job({ execution_backend: "vercel_workflow" });
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: [prepared], error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { code: "temporary_attach_failure" },
      });

    await expect(
      dispatchAcceptedProcessingJob(job(), {
        client: { rpc } as never,
        startWorkflow: vi.fn(async () => ({ runId: "wfr_123456789" })),
      }),
    ).resolves.toBe(prepared);
    expect(rpc).not.toHaveBeenCalledWith(
      "mark_processing_job_dispatch_failed_v1",
      expect.anything(),
    );
  });

  it("replays the same idempotent job after a workflow-start outage", async () => {
    process.env.PROCESSING_EXECUTION_BACKEND = "vercel_workflow";
    const failed = job({
      execution_backend: "vercel_workflow",
      error_code: "processing_workflow_dispatch_failed",
      retryable: true,
      status: "failed",
    });
    const prepared = job({ execution_backend: "vercel_workflow" });
    const attached = job({
      execution_backend: "vercel_workflow",
      workflow_dispatched_at: "2026-07-27T00:00:01.000Z",
      workflow_run_id: "wfr_recovered_123",
    });
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: [prepared], error: null })
      .mockResolvedValueOnce({ data: [attached], error: null });

    await expect(
      dispatchAcceptedProcessingJob(failed, {
        client: { rpc } as never,
        startWorkflow: vi.fn(async () => ({ runId: "wfr_recovered_123" })),
      }),
    ).resolves.toBe(attached);
    expect(rpc).toHaveBeenNthCalledWith(
      1,
      "prepare_processing_job_workflow_dispatch_v1",
      { p_job_id: "job-1" },
    );
  });
});

function job(
  overrides: Partial<ProcessingJobDatabaseRow> = {},
): ProcessingJobDatabaseRow {
  return {
    id: "job-1",
    status: "queued",
    execution_backend: "database_worker",
    workflow_run_id: null,
    workflow_dispatched_at: null,
    ...overrides,
  } as ProcessingJobDatabaseRow;
}
