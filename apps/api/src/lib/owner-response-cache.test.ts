import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), job: vi.fn(), result: vi.fn(), cancel: vi.fn(), retry: vi.fn(),
  source: vi.fn(), revision: vi.fn(), upload: vi.fn(), intent: vi.fn(),
  register: vi.fn(), disable: vi.fn(), notification: vi.fn(), list: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ verifyBearerToken: mocks.auth }));
vi.mock("@/lib/processing-jobs/repository", () => ({
  createProcessingJobServiceClient: () => ({}),
  findOwnedProcessingJob: mocks.job, findOwnedProcessingJobResult: mocks.result,
  requestProcessingJobCancellation: mocks.cancel, findLiveProcessingJobRetry: mocks.retry,
  retryProcessingJob: vi.fn(), toProcessingJobStatusView: (job: unknown) => job,
  listOwnedActiveProcessingJobs: mocks.list, listOwnedProcessingJobs: mocks.list,
  ProcessingJobRepositoryError: class extends Error {},
}));
vi.mock("@/lib/processing-assets/repository", () => ({
  findOwnedSourceVersion: mocks.source, createOwnedSourceRevision: mocks.revision,
  toSourceVersionSummary: () => ({ id: "source-id" }),
  ProcessingAssetRepositoryError: class extends Error {},
}));
vi.mock("@/lib/processing-jobs/upload-intents", () => ({
  createProcessingUploadIntent: mocks.upload, findOwnedProcessingUploadIntent: mocks.intent,
  markProcessingUploadAccepted: vi.fn(), PROCESSING_TUS_CHUNK_BYTES: 1024,
  ProcessingUploadIntentError: class extends Error {},
}));
vi.mock("@/lib/processing-jobs/creation", () => ({
  validateIdempotencyKey: () => "test-idempotency-key", createExtractionProcessingJob: vi.fn(),
  createReviewerProcessingJob: vi.fn(), ProcessingJobCreationError: class extends Error {},
}));
vi.mock("@/lib/processing-jobs/workflow-dispatch", () => ({
  dispatchAcceptedProcessingJob: vi.fn(), ProcessingWorkflowDispatchError: class extends Error {},
}));
vi.mock("@/lib/processing-jobs/background-dispatch", () => ({ scheduleAcceptedProcessingJobDispatch: vi.fn() }));
vi.mock("@/lib/notifications/repository", () => ({
  registerNotificationDevice: mocks.register, disableNotificationDevice: mocks.disable,
  queueTestNotification: mocks.notification, NotificationRepositoryError: class extends Error {},
}));

import { GET as source } from "@/../app/api/sources/[sourceVersionId]/route";
import { POST as revision } from "@/../app/api/sources/[sourceVersionId]/revisions/route";
import { GET as job } from "@/../app/api/jobs/[jobId]/route";
import { GET as result } from "@/../app/api/jobs/[jobId]/result/route";
import { GET as jobs } from "@/../app/api/jobs/route";
import { POST as cancel } from "@/../app/api/jobs/[jobId]/cancel/route";
import { POST as retry } from "@/../app/api/jobs/[jobId]/retry/route";
import { POST as upload } from "@/../app/api/job-uploads/route";
import { POST as accept } from "@/../app/api/job-uploads/[uploadId]/accept/route";
import { PUT as register } from "@/../app/api/notification-devices/route";
import { DELETE as disable } from "@/../app/api/notification-devices/[installationId]/route";
import { POST as notification } from "@/../app/api/notifications/test/route";

const id = "00000000-0000-4000-8000-000000000001";
const jobContext = { params: Promise.resolve({ jobId: id }) };
const sourceContext = { params: Promise.resolve({ sourceVersionId: id }) };
function request(body?: unknown): Request {
  return new Request("https://example.test", { method: body ? "POST" : "GET",
    headers: { "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
const routes = [
  ["source detail", () => source(request(), sourceContext), 200],
  ["source revision", () => revision(request({ sourceText: "Edited lesson", expectedParentSha256: "a".repeat(64) }), sourceContext), 201],
  ["job detail", () => job(request(), jobContext), 200],
  ["job result", () => result(request(), jobContext), 200],
  ["job list", () => jobs(request()), 200],
  ["job cancellation", () => cancel(request(), jobContext), 200],
  ["job retry", () => retry(request(), jobContext), 202],
  ["upload intent", () => upload(request({ mimeType: "application/pdf", byteSize: 12 })), 201],
  ["upload acceptance", () => accept(request(), { params: Promise.resolve({ uploadId: id }) }), 202],
  ["device registration", () => register(request({ installationId: id, expoPushToken: "synthetic", platform: "android", projectId: "synthetic", permissionStatus: "granted" })), 200],
  ["device disabling", () => disable(request(), { params: Promise.resolve({ installationId: id }) }), 200],
  ["notification queue", () => notification(request({ installationId: id })), 202],
] as const;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ id: "owner" });
  const completed = { id, status: "succeeded", result_id: id, source_version_id: null };
  mocks.job.mockResolvedValue(completed); mocks.cancel.mockResolvedValue(completed);
  mocks.retry.mockResolvedValue(completed); mocks.list.mockResolvedValue([completed]);
  mocks.result.mockResolvedValue({ job_id: id, result_type: "reviewer", payload: { lesson: "Synthetic lesson" }, metrics: {} });
  mocks.source.mockResolvedValue({ source_text: "Synthetic lesson", metadata: null });
  mocks.revision.mockResolvedValue({ id: "revision-id" });
  mocks.upload.mockResolvedValue({ intent: { id, storage_bucket: "synthetic", storage_object_path: "synthetic" }, tusEndpoint: "https://example.test/upload" });
  mocks.intent.mockResolvedValue({ status: "accepted", job_id: id });
  mocks.register.mockResolvedValue({ installation_id: id, enabled: true, permission_status: "granted" });
  mocks.disable.mockResolvedValue(true); mocks.notification.mockResolvedValue({ id, status: "queued" });
});

describe.each(routes)("owner cache policy: %s", (_name, handler, successStatus) => {
  it("marks owner success private, no-store", async () => {
    const response = await handler();
    expect(response.status).toBe(successStatus);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect((await response.json()).ok).toBe(true);
  });
  it("marks unauthenticated denial private, no-store", async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await handler();
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect((await response.json()).error.code).toBe("unauthorized");
    expect(mocks.job).not.toHaveBeenCalled(); expect(mocks.source).not.toHaveBeenCalled();
  });
});

it.each([
  ["source", () => { mocks.source.mockResolvedValue(null); }, () => source(request(), sourceContext), "source_version_not_found"],
  ["job", () => { mocks.job.mockResolvedValue(null); }, () => job(request(), jobContext), "processing_job_not_found"],
  ["result", () => { mocks.job.mockResolvedValue(null); }, () => result(request(), jobContext), "processing_job_not_found"],
] as const)("keeps safe missing/foreign-owner %s denial private", async (_name, setup, handler, code) => {
  setup();
  const response = await handler();
  expect(response.status).toBe(404);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect((await response.json()).error.code).toBe(code);
});
