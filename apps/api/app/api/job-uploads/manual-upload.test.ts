import { zipSync, strToU8 } from "fflate";
import { OFFICE_MIME, LEGACY_OFFICE_MESSAGE } from "@stay-focused/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: { id: "owner" } as { id: string } | null, create: vi.fn(), intent: vi.fn(), find: vi.fn(),
  download: vi.fn(), manual: vi.fn(), extraction: vi.fn(), dispatch: vi.fn(), mark: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifyBearerToken: async () => mocks.user }));
vi.mock("@/lib/processing-jobs/upload-intents", () => ({ createProcessingUploadIntent: mocks.create, findOwnedProcessingUploadIntent: mocks.intent,
  markProcessingUploadAccepted: mocks.mark, PROCESSING_TUS_CHUNK_BYTES: 6291456, ProcessingUploadIntentError: class extends Error {} }));
vi.mock("@/lib/processing-jobs/repository", () => ({ createProcessingJobServiceClient: () => ({ storage: { from: () => ({ download: mocks.download }) } }),
  findOwnedProcessingJob: mocks.find, toProcessingJobStatusView: (job: unknown) => job }));
vi.mock("@/lib/processing-jobs/creation", () => ({ createManualReviewerProcessingJob: mocks.manual, createExtractionProcessingJob: mocks.extraction,
  validateIdempotencyKey: (key: string) => key, ProcessingJobCreationError: class extends Error {} }));
vi.mock("@/lib/processing-jobs/workflow-dispatch", () => ({ dispatchAcceptedProcessingJob: mocks.dispatch, ProcessingWorkflowDispatchError: class extends Error {} }));
import { POST as prepare } from "./route";
import { POST as accept } from "./[uploadId]/accept/route";
const uploadId = "11111111-1111-4111-8111-111111111111";
const context = { params: Promise.resolve({ uploadId }) };
const request = (body: unknown) => new Request("http://localhost/api/job-uploads", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "one-pick-key" }, body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks(); mocks.user = { id: "owner" };
  mocks.create.mockResolvedValue({ intent: { id: uploadId }, tusEndpoint: "https://unused.invalid" });
  mocks.manual.mockResolvedValue({ id: "job", jobType: "reviewer_generation" }); mocks.dispatch.mockImplementation(async job => job);
});
describe("manual upload routes", () => {
  it.each(["docx", "pptx"] as const)("admits %s and accepts exactly one chained reviewer job", async kind => {
    const response = await prepare(request({ mimeType: OFFICE_MIME[kind], displayName: `notes.${kind}`, byteSize: 100 }));
    expect(response.status).toBe(201);
    const bytes = kind === "docx" ? zipSync({ "word/document.xml": strToU8("<d/>") }) : zipSync({
      "ppt/presentation.xml": strToU8("<p/>"), "ppt/_rels/presentation.xml.rels": strToU8("<r/>"), "ppt/slides/slide1.xml": strToU8("<s/>") });
    mocks.intent.mockResolvedValue({ id: uploadId, status: "pending", expires_at: "2099-01-01", mime_type: OFFICE_MIME[kind], source_kind: kind,
      display_name: `notes.${kind}`, expected_byte_size: bytes.length, storage_bucket: "private", storage_object_path: "private-path" });
    mocks.download.mockResolvedValue({ data: new Blob([Buffer.from(bytes)]), error: null });
    const result = await accept(request({ jobType: "reviewer_generation" }), context);
    expect(result.status).toBe(202); expect(mocks.manual).toHaveBeenCalledOnce();
    expect(mocks.manual).toHaveBeenCalledWith(expect.objectContaining({ userId: "owner", uploadId, idempotencyKey: "one-pick-key" }));
    expect(mocks.extraction).not.toHaveBeenCalled();
    expect(JSON.stringify(await result.json())).not.toContain("private-path");
  });
  it("rejects a renamed non-Office file before job creation", async () => {
    mocks.intent.mockResolvedValue({ status: "pending", expires_at: "2099-01-01", mime_type: OFFICE_MIME.docx,
      display_name: "renamed.docx", expected_byte_size: 5 });
    mocks.download.mockResolvedValue({ data: new Blob(["%PDF-"]), error: null });
    expect((await accept(request({ jobType: "reviewer_generation" }), context)).status).toBe(422);
    expect(mocks.manual).not.toHaveBeenCalled();
  });
  it.each(["doc", "ppt"])("rejects legacy %s with conversion copy", async kind => {
    const response = await prepare(request({ displayName: `notes.${kind}`, mimeType: OFFICE_MIME.docx, byteSize: 10 }));
    expect(response.status).toBe(415); expect((await response.json()).error.message).toContain(LEGACY_OFFICE_MESSAGE);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("denies unauthenticated and foreign uploads before reading bytes", async () => {
    mocks.user = null; expect((await accept(request({}), context)).status).toBe(401);
    mocks.user = { id: "other" }; mocks.intent.mockResolvedValue(null);
    expect((await accept(request({}), context)).status).toBe(404);
    expect(mocks.intent).toHaveBeenCalledWith(expect.anything(), "other", uploadId);
    expect(mocks.download).not.toHaveBeenCalled();
  });
  it("reconnects an already accepted upload and recovers dispatch without another job", async () => {
    mocks.intent.mockResolvedValue({ status: "accepted", job_id: "job" }); mocks.find.mockResolvedValue({ id: "job" });
    expect((await accept(request({}), context)).status).toBe(202);
    expect(mocks.dispatch).toHaveBeenCalledOnce(); expect(mocks.manual).not.toHaveBeenCalled(); expect(mocks.download).not.toHaveBeenCalled();
  });
});
