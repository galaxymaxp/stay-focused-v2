import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verify: vi.fn(), context: vi.fn(), decrypt: vi.fn(),
}));
vi.mock("google-auth-library", () => ({ OAuth2Client: class { verifyIdToken = mocks.verify; } }));
vi.mock("@/lib/canvas-db", () => ({ createCanvasServiceClient: () => ({}) }));
vi.mock("@/lib/canvas-routes", () => ({ decryptConnectionToken: mocks.decrypt }));
vi.mock("@/lib/canvas-sync-jobs/checkpoints", () => ({ loadCanvasSyncCheckpointContext: mocks.context }));

const { POST } = await import("./route");
const jobId = "11111111-1111-4111-8111-111111111111";
const dispatchId = "22222222-2222-4222-8222-222222222222";
const workerId = "google-canvas:33333333-3333-4333-8333-333333333333";

function request(body = { jobId, dispatchId, workerId }, authorization = "Bearer google-id-token") {
  return new Request("https://stay-focused-v2-prototype.vercel.app/api/internal/canvas/sync-token", {
    method: "POST", headers: { authorization }, body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("GOOGLE_CLOUD_PROJECT_ID", "project-one");
  mocks.verify.mockResolvedValue({ getPayload: () => ({
    email: "generation-worker@project-one.iam.gserviceaccount.com", email_verified: true,
  }) });
  mocks.context.mockResolvedValue({ job: {
    id: jobId, status: "running", google_dispatch_id: dispatchId, worker_id: workerId,
    google_worker_lease_expires_at: new Date(Date.now() + 90_000).toISOString(),
    deadline_at: new Date(Date.now() + 1_800_000).toISOString(),
  }, connection: { status: "active" } });
  mocks.decrypt.mockReturnValue("private-canvas-token");
});
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); });

describe("claimed Canvas token handoff", () => {
  it("denies callers without a Google worker ID token before reading storage", async () => {
    expect((await POST(request(undefined, ""))).status).toBe(401);
    expect(mocks.context).not.toHaveBeenCalled();
  });

  it("denies a different Google service account", async () => {
    mocks.verify.mockResolvedValue({ getPayload: () => ({ email: "other@project-one.iam.gserviceaccount.com", email_verified: true }) });
    expect((await POST(request())).status).toBe(403);
    expect(mocks.decrypt).not.toHaveBeenCalled();
  });

  it("releases only the token for a matching live claimed dispatch", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({ accessToken: "private-canvas-token" });
    expect(mocks.verify).toHaveBeenCalledWith(expect.objectContaining({
      audience: "https://stay-focused-v2-prototype.vercel.app/api/internal/canvas/sync-token",
    }));
  });

  it("rejects an old dispatch or expired lease without decrypting", async () => {
    expect((await POST(request({ jobId, dispatchId: "44444444-4444-4444-8444-444444444444", workerId }))).status).toBe(404);
    mocks.context.mockResolvedValue({ job: {
      id: jobId, status: "running", google_dispatch_id: dispatchId, worker_id: workerId,
      google_worker_lease_expires_at: new Date(Date.now() - 1_000).toISOString(),
      deadline_at: new Date(Date.now() + 1_800_000).toISOString(),
    }, connection: { status: "active" } });
    expect((await POST(request())).status).toBe(404);
    expect(mocks.decrypt).not.toHaveBeenCalled();
  });
});
