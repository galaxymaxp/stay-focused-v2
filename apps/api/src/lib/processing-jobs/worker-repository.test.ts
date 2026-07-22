import { describe, expect, it, vi } from "vitest";

import {
  claimProcessingJobs,
  completeProcessingJob,
  heartbeatProcessingJob,
  recoverStaleProcessingJobs,
  updateProcessingJobProgress,
} from "./worker-repository";

describe("processing job worker repository", () => {
  it("claims only the requested bounded capacity with worker ownership", async () => {
    const rpc = vi.fn(async () => ({ data: [], error: null }));
    await claimProcessingJobs({ rpc } as never, "worker-a", 2);

    expect(rpc).toHaveBeenCalledWith("claim_processing_jobs", {
      p_job_types: ["document_extraction", "reviewer_generation"],
      p_lease_seconds: 90,
      p_limit: 2,
      p_worker_id: "worker-a",
    });
  });

  it("rejects a heartbeat when the database no longer recognizes the lease", async () => {
    const client = {
      rpc: vi.fn(async () => ({ data: [], error: null })),
    } as never;

    await expect(
      heartbeatProcessingJob(client, "job-a", "worker-a"),
    ).rejects.toMatchObject({
      code: "processing_job_lease_lost",
    });
  });

  it("writes real progress units and safe stage metadata through the lease RPC", async () => {
    const rpc = vi.fn(async () => ({ data: [{ id: "job-a" }], error: null }));
    await updateProcessingJobProgress({ rpc } as never, {
      completedUnits: 4,
      jobId: "job-a",
      metrics: { providerCallCount: 4 },
      stage: "generating_sections",
      statusMessage: "Creating reviewer sections",
      totalUnits: 9,
      unitLabel: "sections",
      workerId: "worker-a",
    });

    expect(rpc).toHaveBeenCalledWith("update_processing_job_progress", {
      p_completed_units: 4,
      p_job_id: "job-a",
      p_metrics: { providerCallCount: 4 },
      p_stage: "generating_sections",
      p_status_message: "Creating reviewer sections",
      p_total_units: 9,
      p_unit_label: "sections",
      p_worker_id: "worker-a",
    });
  });

  it("publishes a result only through the transactional completion RPC", async () => {
    const completed = { id: "job-a", status: "succeeded" };
    const rpc = vi.fn(async () => ({ data: [completed], error: null }));
    await expect(
      completeProcessingJob({ rpc } as never, {
        jobId: "job-a",
        metrics: { finalReviewerSectionCount: 3 },
        payload: { reviewer: { id: "reviewer-a" } },
        resultType: "reviewer_generation",
        workerId: "worker-a",
      }),
    ).resolves.toBe(completed);
    expect(rpc).toHaveBeenCalledWith(
      "complete_processing_job",
      expect.objectContaining({ p_job_id: "job-a", p_worker_id: "worker-a" }),
    );
  });

  it("runs stale-lease recovery at the explicit database boundary", async () => {
    const rpc = vi.fn(async () => ({ data: 2, error: null }));
    await expect(recoverStaleProcessingJobs({ rpc } as never)).resolves.toBe(2);
    expect(rpc).toHaveBeenCalledWith("recover_stale_processing_jobs", {});
  });
});
