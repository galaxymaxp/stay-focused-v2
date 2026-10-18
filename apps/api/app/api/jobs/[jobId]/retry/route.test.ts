import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ verify: vi.fn(), live: vi.fn(), retry: vi.fn(), dispatch: vi.fn(), capacity: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifyBearerToken: mocks.verify }));
vi.mock("@/lib/quiz/service", () => ({ quizRetryCapacity: mocks.capacity }));
vi.mock("@/lib/processing-jobs/repository", async (original) => ({
  ...(await original<typeof import("@/lib/processing-jobs/repository")>()),
  createProcessingJobServiceClient: () => ({}),
  findLiveProcessingJobRetry: mocks.live,
  retryProcessingJob: mocks.retry,
  toProcessingJobStatusView: (job: { id: string; status: string }) => ({ id: job.id, status: job.status }),
}));
vi.mock("@/lib/processing-jobs/workflow-dispatch", async (original) => ({
  ...(await original<typeof import("@/lib/processing-jobs/workflow-dispatch")>()),
  dispatchAcceptedProcessingJob: mocks.dispatch,
}));

import { POST } from "./route";
import { ProcessingJobRepositoryError } from "@/lib/processing-jobs/repository";

const failed = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const post = (key: string) => POST(new Request(`https://api.test/api/jobs/${failed}/retry`, { method: "POST", headers: { authorization: "Bearer token", "idempotency-key": key } }), { params: Promise.resolve({ jobId: failed }) });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.verify.mockResolvedValue({ id: "owner" });
  mocks.capacity.mockResolvedValue(null);
  mocks.dispatch.mockImplementation(async (job: unknown) => job);
});

describe("POST /api/jobs/:jobId/retry", () => {
  it("creates and dispatches one retry of the original request", async () => {
    mocks.live.mockResolvedValue(null);
    mocks.retry.mockResolvedValue({ id: "retry-1", status: "queued" });
    const response = await post("retry-key-000000000001");
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ data: { id: "retry-1" } });
    expect(mocks.retry).toHaveBeenCalledWith({}, "owner", failed, "retry-key-000000000001");
    expect(mocks.dispatch).toHaveBeenCalledTimes(1);
  });
  it.each(["queued", "running", "succeeded"])("returns the %s retry instead of creating a duplicate", async (status) => {
    mocks.live.mockResolvedValue({ id: "retry-1", status, idempotency_key: "accepted-retry-key" });
    mocks.retry.mockResolvedValue({ id: "retry-1", status });
    const response = await post("retry-key-000000000002");
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ data: { id: "retry-1", status } });
    expect(mocks.retry).toHaveBeenCalledWith({}, "owner", failed, "accepted-retry-key");
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it("rejects an older oversized Quiz before creating a retry", async () => {
    mocks.live.mockResolvedValue(null);
    mocks.capacity.mockResolvedValue(43);
    const response = await post("retry-key-000000000003");
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: { code: "quiz_source_capacity_exceeded", supportedMaximum: 43 } });
    expect(mocks.retry).not.toHaveBeenCalled();
  });
  it.each(['processing_job_not_retryable', 'processing_job_idempotency_conflict'])("keeps %s a safe 409", async code => {
    mocks.retry.mockRejectedValue(new ProcessingJobRepositoryError(code));
    const response = await post('retry-key-000000000004');
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code, retryable: false } });
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it('denies a live retry after its source was deleted', async () => {
    mocks.live.mockResolvedValue({ id: 'retry-1', status: 'running', idempotency_key: 'accepted-retry-key' });
    mocks.retry.mockRejectedValue(new ProcessingJobRepositoryError('processing_job_not_retryable'));
    expect((await post('retry-key-000000000005')).status).toBe(409);
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
});
