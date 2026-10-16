import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ kind: "docx" as "docx" | "pdf" | "image" | null, calls: [] as string[], cancelled: false }));
vi.mock("workflow", () => ({ getWorkflowMetadata: () => ({ workflowRunId: "run" }), FatalError: class extends Error {} }));
vi.mock("./repository", () => ({ createProcessingJobServiceClient: () => ({}) }));
vi.mock("./workflow-repository", () => ({ attachProcessingJobWorkflow: async () => {}, claimProcessingJobForWorkflow: async () => ({ job_type: "reviewer_generation" }) }));
vi.mock("./operations", () => ({
  readManualReviewerExtractionStep: async () => mocks.kind ? { kind: mocks.kind, pageCount: 2 } : null,
  prepareManualOfficeReviewerStep: async () => { mocks.calls.push("office"); if (mocks.cancelled) throw new Error("cancelled"); },
  prepareCanvasReviewerExtractionStep: async () => null,
  inspectPdfPageStep: async (_id: string, _worker: string, page: number) => { mocks.calls.push(`page-${page}`); },
  prepareExtractionStep: async () => ({ kind: mocks.kind === "image" ? "image" : "pdf", chunks: mocks.kind === "pdf" ? [{ index: 0, pageNumbers: [2] }] : [] }),
  extractPdfChunkStep: async () => { mocks.calls.push("chunk"); },
  extractImageStep: async () => { mocks.calls.push("photo"); },
  finalizeExtractionStep: async () => { mocks.calls.push("attach"); },
  processAIReviewerStep: async () => { mocks.calls.push("reviewer"); },
  finalizeWorkflowFailureStep: async () => { mocks.calls.push("fail"); },
}));
import { processingJobWorkflow } from "../../workflows/processing-job";
beforeEach(() => { mocks.calls = []; mocks.cancelled = false; mocks.kind = "docx"; });
it("keeps Office extraction before generation under one job identity", async () => {
  expect(await processingJobWorkflow("job")).toEqual({ status: "succeeded", jobId: "job" });
  expect(mocks.calls).toEqual(["office", "reviewer"]);
});
it("keeps PDF page/chunk step boundaries before source attachment and generation", async () => {
  mocks.kind = "pdf"; await processingJobWorkflow("job");
  expect(mocks.calls).toEqual(["page-1", "page-2", "chunk", "attach", "reviewer"]);
});
it("chains photos without an intermediate completion", async () => {
  mocks.kind = "image"; await processingJobWorkflow("job");
  expect(mocks.calls).toEqual(["photo", "attach", "reviewer"]);
});
it("never reaches generation if extraction stops", async () => {
  mocks.cancelled = true;
  expect(await processingJobWorkflow("job")).toEqual({ status: "failed", jobId: "job" });
  expect(mocks.calls).toEqual(["office", "fail"]);
});
it("retains paste generation without extraction", async () => {
  mocks.kind = null; await processingJobWorkflow("job");
  expect(mocks.calls).toEqual(["reviewer"]);
});
