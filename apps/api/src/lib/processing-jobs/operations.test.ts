import { PDFDocument } from "pdf-lib";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  source: { id: "source", source_kind: "pdf", page_count: null as number | null,
    storage_bucket: "private", storage_object_path: "fixture", display_name: "lecture.pdf", mime_type: "application/pdf" },
  download: vi.fn(), update: vi.fn(), fail: vi.fn(), inspect: vi.fn(), provider: vi.fn(),
}));
vi.mock("./repository", () => ({
  createProcessingJobServiceClient: () => ({
    storage: { from: () => ({ download: mocks.download }) },
    from: () => ({ update: mocks.update }),
  }),
  findProcessingJobSource: async () => mocks.source,
}));
vi.mock("./worker-repository", () => ({
  readProcessingJobState: async () => ({ id: "job", user_id: "owner", status: "running", lease_owner: "worker" }),
  heartbeatProcessingJob: async () => {}, failProcessingJob: mocks.fail,
}));
vi.mock("./deferred-canvas-reviewer", () => ({ isDeferredCanvasReviewerJob: async () => true }));
vi.mock("@/lib/ocr/pdf-native-text", () => ({ inspectPdfTextPages: mocks.inspect }));
vi.mock("@/lib/ocr/create-server-ocr-provider", () => ({ createServerOcrProvider: mocks.provider }));

import { prepareCanvasReviewerExtractionStep } from "./operations";
import { validatePdfOcrBytes } from "@/lib/ocr/extraction-service";
import { getConfiguredDurableDocumentMaxOcrPages, getConfiguredDurableDocumentMaxPdfPages } from "@/lib/ocr/upload-policy";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.source.page_count = null;
  const query = { eq: vi.fn(), then: undefined };
  query.eq.mockReturnValueOnce(query).mockResolvedValueOnce({ error: null });
  mocks.update.mockReturnValue(query);
  mocks.fail.mockResolvedValue(undefined);
});

async function pdfBytes(pages: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (let page = 0; page < pages; page++) pdf.addPage();
  return pdf.save();
}

describe("Canvas deferred extraction total-page admission", () => {
  it("accepts fresh 40-page Canvas bytes before inspection", async () => {
    const bytes = await pdfBytes(40);
    mocks.download.mockResolvedValue({ data: new Blob([Buffer.from(bytes)]), error: null });
    expect(await prepareCanvasReviewerExtractionStep("job", "worker")).toBe(40);
    expect(mocks.update).toHaveBeenCalledWith({ page_count: 40 });
    expect(mocks.fail).not.toHaveBeenCalled();
    expect(mocks.inspect).not.toHaveBeenCalled();
    expect(mocks.provider).not.toHaveBeenCalled();
  });

  it("rejects fresh 41-page Canvas bytes before inspection/OCR/provider calls", async () => {
    const bytes = await pdfBytes(41);
    mocks.download.mockResolvedValue({ data: new Blob([Buffer.from(bytes)]), error: null });
    await expect(prepareCanvasReviewerExtractionStep("job", "worker")).rejects.toThrow("pdf_page_limit_exceeded");
    expect(mocks.fail).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      errorCode: "pdf_page_limit_exceeded", retryable: false, automaticRetryable: false,
    }));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.inspect).not.toHaveBeenCalled();
    expect(mocks.provider).not.toHaveBeenCalled();
  });

  it("rejects reused page count 41 through the same known failure path without a download", async () => {
    mocks.source.page_count = 41;
    await expect(prepareCanvasReviewerExtractionStep("job", "worker")).rejects.toThrow("pdf_page_limit_exceeded");
    expect(mocks.fail).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      errorCode: "pdf_page_limit_exceeded", retryable: false, automaticRetryable: false,
    }));
    expect(mocks.download).not.toHaveBeenCalled();
    expect(mocks.inspect).not.toHaveBeenCalled();
    expect(mocks.provider).not.toHaveBeenCalled();
  });

  it("accepts a reused 40-page count", async () => {
    mocks.source.page_count = 40;
    expect(await prepareCanvasReviewerExtractionStep("job", "worker")).toBe(40);
    expect(mocks.download).not.toHaveBeenCalled();
  });

  it.each([100, 101])("preserves local durable admission for %i total pages and 40 OCR-required pages", async (pages) => {
    const result = await validatePdfOcrBytes({ bytes: await pdfBytes(pages), fileName: "lecture.pdf",
      mimeType: "application/pdf", documentMaxPages: getConfiguredDurableDocumentMaxPdfPages({}) });
    expect(result.ok).toBe(pages === 100);
    if (!result.ok) expect(result.code).toBe("pdf_page_limit_exceeded");
    expect(getConfiguredDurableDocumentMaxOcrPages({})).toBe(40);
  });
});
