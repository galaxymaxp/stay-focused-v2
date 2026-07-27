import { describe, expect, it, vi } from "vitest";

import {
  attachProcessingJobWorkflow,
  claimProcessingJobForWorkflow,
  prepareProcessingJobWorkflowDispatch,
  WORKFLOW_JOB_LEASE_SECONDS,
} from "./workflow-repository";

describe("processing workflow repository", () => {
  it("prepares and attaches the durable run through service-only RPCs", async () => {
    const prepared = { id: "job-1", status: "queued" };
    const attached = {
      ...prepared,
      workflow_run_id: "wfr_123456789",
    };
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: [prepared], error: null })
      .mockResolvedValueOnce({ data: [attached], error: null });
    const client = { rpc } as never;

    await expect(
      prepareProcessingJobWorkflowDispatch(client, "job-1"),
    ).resolves.toBe(prepared);
    await expect(
      attachProcessingJobWorkflow(client, "job-1", "wfr_123456789"),
    ).resolves.toBe(attached);

    expect(rpc).toHaveBeenNthCalledWith(
      1,
      "prepare_processing_job_workflow_dispatch_v1",
      { p_job_id: "job-1" },
    );
    expect(rpc).toHaveBeenNthCalledWith(
      2,
      "attach_processing_job_workflow_v1",
      {
        p_job_id: "job-1",
        p_workflow_run_id: "wfr_123456789",
      },
    );
  });

  it("uses the atomic by-ID lease claim and never a read-then-write claim", async () => {
    const claimed = { id: "job-1", lease_owner: "vercel-workflow:wfr_1" };
    const rpc = vi.fn(async () => ({ data: [claimed], error: null }));

    await expect(
      claimProcessingJobForWorkflow(
        { rpc } as never,
        "job-1",
        "vercel-workflow:wfr_1",
      ),
    ).resolves.toBe(claimed);
    expect(rpc).toHaveBeenCalledWith("claim_processing_job_by_id_v1", {
      p_job_id: "job-1",
      p_lease_seconds: WORKFLOW_JOB_LEASE_SECONDS,
      p_worker_id: "vercel-workflow:wfr_1",
    });
  });

  it("treats a second active claim as a safe no-op", async () => {
    const rpc = vi.fn(async () => ({ data: [], error: null }));
    await expect(
      claimProcessingJobForWorkflow(
        { rpc } as never,
        "job-1",
        "vercel-workflow:wfr_second",
      ),
    ).resolves.toBeNull();
  });
});
