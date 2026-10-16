import { zipSync, strToU8 } from "fflate";
import type { ProcessingJobDatabaseRow, ProcessingJobSourceRow } from "@stay-focused/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ source: {} as ProcessingJobSourceRow, state: { status: "running", lease_owner: "worker" },
  progress: vi.fn(), complete: vi.fn(), fail: vi.fn(), run: vi.fn(), download: vi.fn(), read: vi.fn(),
  provider: vi.fn(), budget: vi.fn(), write: vi.fn(), prepare: vi.fn(), inspect: vi.fn(), image: vi.fn(), chunk: vi.fn(), finalize: vi.fn() }));
vi.mock("./repository", () => ({ findProcessingJobSource: async () => mocks.source }));
vi.mock("./worker-repository", () => ({ readProcessingJobState: async () => mocks.state,
  heartbeatProcessingJob: async () => {},
  updateProcessingJobProgress: mocks.progress, completeProcessingJob: mocks.complete, failProcessingJob: mocks.fail }));
vi.mock("./operations", () => ({ prepareExtractionStep: mocks.prepare, inspectPdfPageStep: mocks.inspect,
  extractImageStep: mocks.image, extractPdfChunkStep: mocks.chunk, finalizeExtractionStep: mocks.finalize }));
vi.mock("@stay-focused/engine", async original => ({ ...await original<typeof import("@stay-focused/engine")>(), runAIReviewer: mocks.run,
  reviewerProviderCallBudget: mocks.budget }));
vi.mock("./ai-generation", () => ({ durableGenerationProvider: mocks.provider }));
vi.mock("./workflow-repository", () => ({ readProcessingJobCheckpoint: mocks.read, writeProcessingJobCheckpoint: mocks.write }));
import { processAIReviewerJob } from "./ai-reviewer";
import { prepareManualReviewerSource } from "./manual-reviewer-source";
import { processClaimedJob } from "./processor";

const job = { id: "job", user_id: "owner", job_type: "reviewer_generation" } as ProcessingJobDatabaseRow;
const rpc = vi.fn(async (_name: string, input: { p_source_text: string; p_source_blocks: unknown }) => {
  mocks.source = { ...mocks.source, source_kind: "text", source_text: input.p_source_text,
    metadata: { ...mocks.source.metadata as Record<string, never>, reviewerSourceBlocks: input.p_source_blocks as never } };
  return { data: [job], error: null };
});
const client = { rpc, storage: { from: () => ({ download: mocks.download }) } } as never;
function bytes(kind: "docx" | "pptx", empty = false) {
  return kind === "docx" ? zipSync({ "word/document.xml": strToU8(`<w:document><w:body><w:p><w:r><w:t>${empty ? "" : "Cells use energy to maintain their structures."}</w:t></w:r></w:p></w:body></w:document>`) }) :
    zipSync({ "ppt/presentation.xml": strToU8('<p:presentation><p:sldIdLst><p:sldId r:id="slide"/></p:sldIdLst></p:presentation>'),
      "ppt/_rels/presentation.xml.rels": strToU8('<Relationships><Relationship Id="slide" Target="slides/slide1.xml"/></Relationships>'),
      "ppt/slides/slide1.xml": strToU8(`<p:sld><p:sp><p:txBody><a:p><a:r><a:t>${empty ? "" : "Cells use energy to maintain their structures."}</a:t></a:r></a:p></p:txBody></p:sp></p:sld>`) });
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.state = { status: "running", lease_owner: "worker" };
  mocks.source = { id: "source", user_id: "owner", source_kind: "docx", storage_bucket: "private", storage_object_path: "private-path",
    display_name: "notes.docx", metadata: { manualReviewerVersion: "manual-reviewer-v1" },
    mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", source_text: null,
    byte_size: null, source_character_count: null, page_count: null, created_at: "2026-10-16",
    document_asset_id: null, source_version_id: null, content_sha256: null, parser_policy_version: null,
    ocr_policy_version: null, normalization_version: null };
  mocks.read.mockResolvedValue(null); mocks.budget.mockResolvedValue(2);
  mocks.run.mockResolvedValue({ title: "Cells", sections: [{ id: "section" }], metadata: {} });
  mocks.fail.mockResolvedValue({ status: "failed" });
  mocks.prepare.mockResolvedValue({ kind: "pdf", chunks: [{ index: 0, pageNumbers: [2] }] });
  mocks.finalize.mockImplementation(async () => { mocks.source = { ...mocks.source, source_kind: "text", source_text: "Exact extracted text." }; });
});
describe("manual extract-to-reviewer chain", () => {
  it.each(["docx", "pptx"] as const)("extracts %s with the shared parser, saves exact ordered blocks, and ends in one reviewer", async kind => {
    mocks.source.source_kind = kind;
    mocks.download.mockResolvedValue({ data: new Blob([Buffer.from(bytes(kind))]), error: null });
    const result = await processAIReviewerJob(client, job, "worker");
    expect(result.payload.reviewer.title).toBe("Cells");
    expect(rpc).toHaveBeenCalledWith("attach_manual_reviewer_source_v1", expect.objectContaining({ p_job_id: "job",
      p_source_text: expect.stringContaining("Cells use energy"), p_source_blocks: [expect.objectContaining({ text: expect.stringContaining("Cells use energy") })] }));
    expect(mocks.run).toHaveBeenCalledTimes(1);
    expect(mocks.run.mock.invocationCallOrder[0]).toBeGreaterThan(rpc.mock.invocationCallOrder[0]!);
    expect(mocks.write).toHaveBeenCalledWith(client, expect.objectContaining({ checkpointKey: "reviewer:ai-first:complete" }));
    expect(mocks.complete).not.toHaveBeenCalled(); // No intermediate extraction result/job publication.
  });
  it.each(["docx", "pptx"] as const)("empty %s fails before any generation call", async kind => {
    mocks.source.source_kind = kind;
    mocks.download.mockResolvedValue({ data: new Blob([Buffer.from(bytes(kind, true))]), error: null });
    await expect(processClaimedJob({ client, job, workerId: "worker" })).resolves.toMatchObject({ status: "failed", errorCode: "no_text_detected" });
    expect(mocks.fail).toHaveBeenCalledWith(client, expect.objectContaining({
      errorCode: "no_text_detected", safeErrorMessage: "We couldn't read text from this file", retryable: false, automaticRetryable: false,
    }));
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(mocks.run).not.toHaveBeenCalled(); expect(rpc).not.toHaveBeenCalled();
  });
  it("PDFs retain per-page inspection and chunk checkpoints before source attachment", async () => {
    mocks.source.source_kind = "pdf"; mocks.source.page_count = 2;
    await prepareManualReviewerSource(client, job, "worker");
    expect(mocks.inspect).toHaveBeenNthCalledWith(1, "job", "worker", 1, 2);
    expect(mocks.inspect).toHaveBeenNthCalledWith(2, "job", "worker", 2, 2);
    expect(mocks.prepare).toHaveBeenCalledWith("job", "worker", true);
    expect(mocks.chunk).toHaveBeenCalledWith("job", "worker", 0, [2], true);
    expect(mocks.finalize).toHaveBeenCalledWith("job", "worker");
  });
  it("photos reuse image checkpoint extraction and generate without editing", async () => {
    mocks.source.source_kind = "image"; mocks.prepare.mockResolvedValue({ kind: "image", chunks: [] });
    await processAIReviewerJob(client, job, "worker");
    expect(mocks.image).toHaveBeenCalledWith("job", "worker"); expect(mocks.run).toHaveBeenCalledOnce();
  });
  it("does not re-extract a persisted source or generate a cancelled source", async () => {
    mocks.source.source_kind = "text"; mocks.source.source_text = "Saved exact text.";
    await processAIReviewerJob(client, job, "worker"); expect(mocks.download).not.toHaveBeenCalled();
    mocks.run.mockClear(); mocks.source.source_kind = "docx"; mocks.state.status = "cancellation_requested";
    await expect(processAIReviewerJob(client, job, "worker")).rejects.toThrow(); expect(mocks.run).not.toHaveBeenCalled();
  });
});
