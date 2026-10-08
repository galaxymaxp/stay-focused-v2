import { describe, expect, it, vi } from "vitest";
import { executeGoogleCanvasJob, loadGoogleCanvasToken } from "./google-worker";

const jobId = "11111111-1111-4111-8111-111111111111";
const dispatchId = "22222222-2222-4222-8222-222222222222";
const reference = { jobId, dispatchId };

function client(initial: "queued" | "running" | "succeeded" = "queued") {
  let state: "queued" | "running" | "succeeded" | "failed" = initial;
  const rpc = vi.fn(async (name: string) => {
    if (name === "claim_canvas_sync_job_google_v1") {
      if (state !== "queued") return { data: [], error: null };
      state = "running";
      return { data: [{ id: jobId, status: "running", google_dispatch_id: dispatchId, worker_id: "worker-1" }], error: null };
    }
    if (name === "fail_canvas_sync_job_v2") {
      state = "failed";
      return { data: [{ status: state }], error: null };
    }
    return { data: [], error: null };
  });
  const maybeSingle = vi.fn(async () => ({ data: {
    id: jobId, status: state, google_dispatch_id: dispatchId, worker_id: state === "running" ? "worker-1" : null,
  }, error: null }));
  const fake = { rpc, from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) };
  return { fake, rpc, complete: () => { state = "succeeded"; }, status: () => state };
}

describe("Google Canvas worker delivery", () => {
  it("claims on the worker, then acknowledges a completed job", async () => {
    const storage = client();
    const run = vi.fn(async () => { storage.complete(); });
    expect(await executeGoogleCanvasJob(reference, {
      client: storage.fake as never, run: run as never, loadToken: async () => "test-token", workerId: "worker-1",
    })).toBe("ack");
    expect(run).toHaveBeenCalledOnce();
    expect(storage.rpc).toHaveBeenCalledWith("claim_canvas_sync_job_google_v1", {
      p_job_id: jobId, p_dispatch_id: dispatchId, p_worker_id: "worker-1",
    });
  });

  it("does not execute a duplicate delivery while another worker owns the job", async () => {
    const storage = client("running");
    const run = vi.fn();
    expect(await executeGoogleCanvasJob(reference, {
      client: storage.fake as never, run, workerId: "worker-2",
    })).toBe("retry");
    expect(run).not.toHaveBeenCalled();
  });

  it("records a sanitized terminal failure when execution throws", async () => {
    const storage = client();
    expect(await executeGoogleCanvasJob(reference, {
      client: storage.fake as never,
      loadToken: async () => "test-token",
      run: async () => { throw new Error("private Canvas response"); },
      workerId: "worker-1",
    })).toBe("ack");
    expect(storage.status()).toBe("failed");
    expect(storage.rpc).toHaveBeenCalledWith("fail_canvas_sync_job_v2", expect.objectContaining({
      p_error_code: "canvas_sync_interrupted", p_worker_id: "worker-1",
    }));
  });

  it("retries a transient token handoff before starting units", async () => {
    const request = vi.fn().mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce({ data: { accessToken: "valid-token" } });
    const delay = vi.fn(async () => undefined);
    expect(await loadGoogleCanvasToken(reference, "worker-1", { request, delay })).toBe("valid-token");
    expect(request).toHaveBeenCalledTimes(2);
    expect(delay).toHaveBeenCalledOnce();
  });

  it("does not retry a denied token handoff and records its own failure code", async () => {
    const request = vi.fn().mockRejectedValue({ response: { status: 403 } });
    await expect(loadGoogleCanvasToken(reference, "worker-1", { request })).rejects.toThrow("canvas_sync_token_unavailable");
    expect(request).toHaveBeenCalledOnce();
    const storage = client();
    expect(await executeGoogleCanvasJob(reference, {
      client: storage.fake as never,
      loadToken: async () => { throw new Error("private auth detail"); },
      workerId: "worker-1",
    })).toBe("ack");
    expect(storage.rpc).toHaveBeenCalledWith("fail_canvas_sync_job_v2", expect.objectContaining({
      p_error_code: "canvas_sync_token_unavailable",
    }));
  });

  it("acknowledges terminal replay without running Canvas again", async () => {
    const storage = client("succeeded");
    const run = vi.fn();
    expect(await executeGoogleCanvasJob(reference, {
      client: storage.fake as never, run, workerId: "worker-2",
    })).toBe("ack");
    expect(run).not.toHaveBeenCalled();
  });
});
