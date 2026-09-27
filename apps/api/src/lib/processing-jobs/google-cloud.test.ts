import { describe, expect, it, vi, afterEach } from "vitest";
import type { ProcessingJobDatabaseRow } from "@stay-focused/db";
import { dispatchGoogleJob, executeGoogleJob, googleFederationConfig, googleTaskConfig, parseGoogleJobReference } from "./google-cloud";
import { getProcessingExecutionBackend } from "./workflow-dispatch";

const id = "11111111-1111-4111-8111-111111111111";
const dispatchId = "22222222-2222-4222-8222-222222222222";
const reference = { jobId: id, dispatchId };
afterEach(() => vi.restoreAllMocks());

describe("Google generation delivery", () => {
  it("preserves defaults and requires explicit Google selection", () => {
    expect(getProcessingExecutionBackend({ VERCEL: "1" })).toBe("vercel_workflow");
    expect(getProcessingExecutionBackend({ GENERATION_BACKEND: "google-cloud" })).toBe("google_cloud");
    expect(getProcessingExecutionBackend({ GENERATION_BACKEND: "vercel" })).toBe("vercel_workflow");
  });
  it("accepts only a small durable reference, rejecting owner/source substitution", () => {
    expect(parseGoogleJobReference(reference)).toEqual(reference);
    for (const payload of [{ ...reference, ownerId: id }, { ...reference, source: "private text" }, { jobId: id }, null, []]) {
      expect(parseGoogleJobReference(payload)).toBeNull();
    }
  });
  it("rejects a non-Cloud Run target and account from another project", () => {
    const config = { GOOGLE_CLOUD_PROJECT_ID: "project-one", GOOGLE_GENERATION_REGION: "asia-northeast1",
      GOOGLE_GENERATION_QUEUE: "generation", GOOGLE_TASKS_INVOKER_EMAIL: "invoker@project-one.iam.gserviceaccount.com",
      GOOGLE_GENERATION_WORKER_URL: "https://worker.run.app" };
    expect(googleTaskConfig(config).parent).toContain("projects/project-one/");
    expect(() => googleTaskConfig({ ...config, GOOGLE_GENERATION_WORKER_URL: "http://localhost" })).toThrow();
    expect(() => googleTaskConfig({ ...config, GOOGLE_TASKS_INVOKER_EMAIL: "invoker@other.iam.gserviceaccount.com" })).toThrow();
  });
  it("pins federation to the dedicated dispatcher identity and provider", () => {
    const config = { GOOGLE_CLOUD_PROJECT_ID: "project-one", GOOGLE_WIF_PROJECT_NUMBER: "123456789012",
      GOOGLE_WIF_POOL_ID: "vercel", GOOGLE_WIF_PROVIDER_ID: "production",
      GOOGLE_GENERATION_DISPATCHER_EMAIL: "generation-dispatcher@project-one.iam.gserviceaccount.com" };
    expect(googleFederationConfig(config)).toEqual({
      audience: "//iam.googleapis.com/projects/123456789012/locations/global/workloadIdentityPools/vercel/providers/production",
      email: config.GOOGLE_GENERATION_DISPATCHER_EMAIL,
    });
    expect(() => googleFederationConfig({ ...config, GOOGLE_GENERATION_DISPATCHER_EMAIL: "owner@project-one.iam.gserviceaccount.com" })).toThrow();
    expect(() => googleFederationConfig({ ...config, GOOGLE_WIF_POOL_ID: "../other" })).toThrow();
  });
  it.each(["succeeded", "cancelled", "failed", "expired"])("acknowledges %s without extraction or OpenAI", async (status) => {
    const run = vi.fn();
    const client = { rpc: vi.fn().mockResolvedValue({ data: [{ status }], error: null }) };
    expect(await executeGoogleJob(reference, { client: client as never, run })).toBe("ack");
    expect(run).not.toHaveBeenCalled();
  });
  it("cannot use a job with a mismatching dispatch reference", async () => {
    const run = vi.fn();
    const client = { rpc: vi.fn().mockResolvedValue({ data: [], error: null }) };
    expect(await executeGoogleJob(reference, { client: client as never, run })).toBe("ack");
    expect(run).not.toHaveBeenCalled();
  });
  it("retries a busy lease without executing generation", async () => {
    const run = vi.fn();
    const client = { rpc: vi.fn().mockResolvedValue({ data: [{ status: "running", lease_owner: "someone-else" }], error: null }) };
    expect(await executeGoogleJob(reference, { client: client as never, run })).toBe("retry");
    expect(run).not.toHaveBeenCalled();
  });
  it("returns 503 semantics when claim storage is unavailable", async () => {
    const client = { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "private" } }) };
    await expect(executeGoogleJob(reference, { client: client as never })).rejects.toThrow("google_generation_claim_failed");
  });
  it("prepares before enqueue and uses the same deterministic dispatch on replay", async () => {
    const prepared = { id, google_dispatch_id: dispatchId, status: "queued", execution_backend: "google_cloud" };
    const client = { rpc: vi.fn().mockResolvedValue({ data: [prepared], error: null }) };
    const enqueue = vi.fn();
    for (let i = 0; i < 2; i++) await dispatchGoogleJob(prepared as ProcessingJobDatabaseRow, { client: client as never, enqueue });
    expect(enqueue.mock.calls).toEqual([[reference], [reference]]);
  });
});
