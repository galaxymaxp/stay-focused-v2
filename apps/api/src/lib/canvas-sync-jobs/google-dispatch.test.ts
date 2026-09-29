import { afterEach, describe, expect, it, vi } from "vitest";
import type { CanvasSyncJobDatabaseRow } from "@stay-focused/db";
import {
  CanvasGoogleDispatchError, dispatchAcceptedCanvasSyncJob,
  enqueueGoogleCanvasJob, parseGoogleCanvasJobReference,
} from "./google-dispatch";

const jobId = "11111111-1111-4111-8111-111111111111";
const dispatchId = "22222222-2222-4222-8222-222222222222";
const reference = { jobId, dispatchId };
afterEach(() => vi.restoreAllMocks());

describe("Google Canvas dispatch", () => {
  it("accepts only a job and dispatch UUID, without owner, token, or source payload", () => {
    expect(parseGoogleCanvasJobReference(reference)).toEqual(reference);
    expect(parseGoogleCanvasJobReference({ ...reference, ownerId: jobId })).toBeNull();
    expect(parseGoogleCanvasJobReference({ jobId })).toBeNull();
  });

  it("uses the existing private Google queue and deterministic task name", async () => {
    vi.stubEnv("GOOGLE_CLOUD_PROJECT_ID", "project-one");
    vi.stubEnv("GOOGLE_GENERATION_REGION", "asia-northeast1");
    vi.stubEnv("GOOGLE_GENERATION_QUEUE", "generation");
    vi.stubEnv("GOOGLE_TASKS_INVOKER_EMAIL", "invoker@project-one.iam.gserviceaccount.com");
    vi.stubEnv("GOOGLE_GENERATION_WORKER_URL", "https://worker.run.app");
    const request = vi.fn().mockResolvedValue({ status: 200 });
    await enqueueGoogleCanvasJob(reference, { client: { request } as never });
    const sent = request.mock.calls[0]![0];
    expect(sent.data.task.name).toContain(`/queues/generation/tasks/canvas-${jobId}-${dispatchId}`);
    expect(sent.data.task.httpRequest.url).toBe("https://worker.run.app/tasks/canvas-sync");
    expect(sent.data.task.httpRequest.oidcToken.audience).toBe("https://worker.run.app");
    expect(JSON.parse(Buffer.from(sent.data.task.httpRequest.body, "base64").toString())).toEqual(reference);
    vi.unstubAllEnvs();
  });

  it("lets Cloud Tasks deduplicate simultaneous submissions of one dispatch", async () => {
    vi.stubEnv("GOOGLE_CLOUD_PROJECT_ID", "project-one");
    vi.stubEnv("GOOGLE_GENERATION_REGION", "asia-northeast1");
    vi.stubEnv("GOOGLE_GENERATION_QUEUE", "generation");
    vi.stubEnv("GOOGLE_TASKS_INVOKER_EMAIL", "invoker@project-one.iam.gserviceaccount.com");
    vi.stubEnv("GOOGLE_GENERATION_WORKER_URL", "https://worker.run.app");
    let accepted = 0;
    const request = vi.fn(async (_input: { data: { task: { name: string } } }) => {
      if (accepted++ === 0) return { status: 200 };
      throw { response: { status: 409 } };
    });
    await Promise.all([
      enqueueGoogleCanvasJob(reference, { client: { request } as never }),
      enqueueGoogleCanvasJob(reference, { client: { request } as never }),
    ]);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0]![0].data.task.name).toBe(request.mock.calls[1]![0].data.task.name);
    vi.unstubAllEnvs();
  });

  it("prepares before enqueue, records acceptance, and reuses the accepted job", async () => {
    const calls: string[] = [];
    const prepared = job();
    let dispatched = false;
    const client = { rpc: vi.fn(async (name: string) => {
      calls.push(name);
      if (name === "mark_canvas_sync_job_google_dispatched_v1") dispatched = true;
      return { data: [{ ...prepared, google_dispatched_at: dispatched ? "2026-09-29T00:00:00Z" : null }], error: null };
    }) };
    const enqueue = vi.fn(async () => { calls.push("enqueue"); });
    const accepted = await dispatchAcceptedCanvasSyncJob(prepared, { client: client as never, enqueue });
    expect(accepted.google_dispatched_at).toBeTruthy();
    expect(calls).toEqual([
      "prepare_canvas_sync_job_google_dispatch_v1", "enqueue", "mark_canvas_sync_job_google_dispatched_v1",
    ]);
    expect(enqueue).toHaveBeenCalledWith(reference);
    await dispatchAcceptedCanvasSyncJob(accepted, { client: client as never, enqueue });
    expect(enqueue).toHaveBeenCalledTimes(1);
  });

  it("marks immediate Google rejection failed instead of leaving a queued job", async () => {
    const prepared = job();
    const client = { rpc: vi.fn(async (name: string) => ({
      data: [name === "mark_canvas_sync_job_google_dispatch_failed_v1"
        ? { ...prepared, status: "failed" } : prepared], error: null,
    })) };
    await expect(dispatchAcceptedCanvasSyncJob(prepared, {
      client: client as never, enqueue: async () => { throw new Error("private provider details"); },
    })).rejects.toBeInstanceOf(CanvasGoogleDispatchError);
    expect(client.rpc).toHaveBeenCalledWith("mark_canvas_sync_job_google_dispatch_failed_v1", {
      p_job_id: jobId, p_dispatch_id: dispatchId,
    });
  });
});

function job(): CanvasSyncJobDatabaseRow {
  return {
    id: jobId, google_dispatch_id: dispatchId, google_dispatch_key: "key-12345678",
    google_dispatched_at: null, google_worker_lease_expires_at: null,
    status: "queued",
  } as CanvasSyncJobDatabaseRow;
}
