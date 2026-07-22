import type { OcrProvider, OcrResult } from "@stay-focused/ocr";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";

import {
  extractPdfDocument,
  validatePdfOcrBytes,
} from "./extraction-service";

describe("extractPdfDocument", () => {
  it.each([1, 5, 6, 12])(
    "extracts a %i-page scanned PDF with provider-safe chunks",
    async (pageCount) => {
      const provider = sequentialProvider();
      const result = await runExtraction(await scannedPdf(pageCount), provider);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.extraction).toMatchObject({
        status: "complete",
        expectedPageCount: pageCount,
        processedPageCount: pageCount,
        extractionMode: "ocr",
        ocrChunkCount: Math.ceil(pageCount / 5),
      });
      expect(result.result.pages.map((page) => page.pageNumber)).toEqual(
        Array.from({ length: pageCount }, (_, index) => index + 1),
      );
      expect(result.result.text).toBe(
        Array.from({ length: pageCount }, (_, index) => `Source page ${index + 1}`).join(
          "\n\n",
        ),
      );
      for (const call of provider.extract.mock.calls) {
        const input = call[0];
        expect(input.kind).toBe("pdf");
        if (input.kind === "pdf") {
          expect(input.requestedPages.length).toBeLessThanOrEqual(5);
        }
      }
    },
  );

  it("uses native text for every readable page without creating an OCR provider", async () => {
    const bytes = await nativePdf([
      "Biology: Cell structure",
      "History: Primary sources",
      "Mathematics: f(x) = x + 1",
    ]);
    const getProvider = vi.fn(() => {
      throw new Error("provider should not be created");
    });
    const result = await extractPdfDocument({
      getProvider,
      input: pdfInput(bytes, 3),
      pageCount: 3,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(getProvider).not.toHaveBeenCalled();
    expect(result.extraction).toMatchObject({
      extractionMode: "native_text",
      nativeTextPageCount: 3,
      ocrPageCount: 0,
      ocrChunkCount: 0,
    });
    expect(result.result.pages.every((page) => page.method === "native_text")).toBe(true);
  });

  it("merges native, OCR, and confirmed blank pages in original order", async () => {
    const document = await PDFDocument.create();
    const font = await document.embedFont(StandardFonts.Helvetica);
    document.addPage().drawText("Introduction", { x: 40, y: 700, font, size: 14 });
    document.addPage().drawRectangle({ x: 40, y: 600, width: 100, height: 50 });
    document.addPage().drawText("Comparison", { x: 40, y: 700, font, size: 14 });
    document.addPage();
    const bytes = await document.save({ useObjectStreams: false });
    const provider = localPageProvider(["Core concept"]);

    const result = await runExtraction(bytes, provider);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.extraction).toMatchObject({
      extractionMode: "mixed",
      nativeTextPageCount: 2,
      ocrPageCount: 1,
      blankPageCount: 1,
      ocrChunks: [{ originalPageNumbers: [2] }],
    });
    expect(result.result.pages.map((page) => [page.pageNumber, page.method])).toEqual([
      [1, "native_text"],
      [2, "ocr"],
      [3, "native_text"],
      [4, "blank"],
    ]);
    expect(result.result.text).toContain("Introduction\n\nCore concept\n\nComparison");
  });

  it("marks every original page in a failed OCR chunk and rejects partial text", async () => {
    const provider = sequentialProvider({ rejectCall: 2 });
    const result = await runExtraction(await scannedPdf(12), provider);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.code).toBe("document_extraction_incomplete");
    expect(result.failure.extraction).toMatchObject({
      failedPageCount: 5,
      affectedPageNumbers: [6, 7, 8, 9, 10],
      ocrChunkCount: 3,
    });
  });

  it("detects an incomplete provider page response after remapping", async () => {
    const provider = localPageProvider(["Introduction", "Core concept"]);
    const result = await runExtraction(await scannedPdf(3), provider);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.extraction).toMatchObject({
      missingPageNumbers: [3],
      affectedPageNumbers: [3],
    });
  });

  it("keeps OCR concurrency at two and returns pages in source order", async () => {
    let active = 0;
    let maximumActive = 0;
    let callIndex = 0;
    const provider = mockedProvider(async (input) => {
      const chunkIndex = callIndex;
      callIndex += 1;
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
      return resultForLocalPages(input, chunkIndex * 5);
    });

    const result = await runExtraction(await scannedPdf(12), provider);

    expect(result.ok).toBe(true);
    expect(maximumActive).toBe(2);
    if (!result.ok) return;
    expect(result.result.pages.map((page) => page.pageNumber)).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 1),
    );
  });

  it("returns a retryable document timeout before the route runtime expires", async () => {
    const provider = mockedProvider(
      async () => await new Promise<OcrResult>(() => undefined),
    );
    const bytes = await scannedPdf(1);
    const result = await extractPdfDocument({
      getProvider: () => provider,
      input: pdfInput(bytes, 1),
      pageCount: 1,
      options: {
        documentTimeoutMs: 5,
        providerRequestTimeoutMs: 20,
      },
    });

    expect(result).toMatchObject({
      ok: false,
      failure: {
        code: "document_extraction_timeout",
        extraction: {
          status: "failed",
          affectedPageNumbers: [1],
          failureCategories: ["timeout"],
        },
      },
    });
  });
});

describe("validatePdfOcrBytes", () => {
  it("rejects an encrypted PDF without attempting provider extraction", async () => {
    const result = await validatePdfOcrBytes({
      bytes: new TextEncoder().encode("%PDF-1.7\n1 0 obj << /Encrypt 2 0 R >>\n"),
      mimeType: "application/pdf",
    });

    expect(result).toEqual({ ok: false, code: "pdf_encrypted" });
  });

  it("rejects an invalid PDF with a misleading file signature", async () => {
    const result = await validatePdfOcrBytes({
      bytes: new TextEncoder().encode("%PDF-this-is-not-a-document"),
      mimeType: "application/pdf",
    });

    expect(result).toEqual({ ok: false, code: "invalid_pdf" });
  });

  it("enforces the configured document limit independently of the provider limit", async () => {
    const result = await validatePdfOcrBytes({
      bytes: await scannedPdf(7),
      documentMaxPages: 6,
      mimeType: "application/pdf",
    });

    expect(result).toEqual({
      ok: false,
      code: "pdf_page_limit_exceeded",
      documentPageLimit: 6,
    });
  });
});

async function runExtraction(
  bytes: Uint8Array,
  provider: OcrProvider,
) {
  const document = await PDFDocument.load(bytes);
  const pageCount = document.getPageCount();
  return await extractPdfDocument({
    getProvider: () => provider,
    input: pdfInput(bytes, pageCount),
    pageCount,
  });
}

function pdfInput(bytes: Uint8Array, pageCount: number) {
  return {
    kind: "pdf" as const,
    mimeType: "application/pdf" as const,
    bytes,
    requestedPages: Array.from({ length: pageCount }, (_, index) => index + 1),
    fileName: "neutral-fixture.pdf",
  };
}

function sequentialProvider(options: { readonly rejectCall?: number } = {}) {
  let callIndex = 0;
  return mockedProvider(async (input) => {
    const currentCall = callIndex;
    callIndex += 1;
    if (options.rejectCall === currentCall + 1) {
      throw new Error("private provider detail");
    }
    return resultForLocalPages(input, currentCall * 5);
  });
}

function localPageProvider(texts: readonly string[]) {
  return mockedProvider(async (input) => ({
    text: texts.join("\n\n"),
    pages: texts.map((text, index) => textPage(index + 1, text)),
    mimeType: input.mimeType,
    provider: "fake-provider",
    warnings: [],
  }));
}

function mockedProvider(
  implementation: (input: Parameters<OcrProvider["extract"]>[0]) => Promise<OcrResult>,
) {
  return {
    id: "fake-provider",
    extract: vi.fn(implementation),
  };
}

function resultForLocalPages(
  input: Parameters<OcrProvider["extract"]>[0],
  originalOffset: number,
): OcrResult {
  if (input.kind !== "pdf") {
    throw new Error("Expected a PDF input.");
  }
  const pages = input.requestedPages.map((pageNumber) =>
    textPage(pageNumber, `Source page ${originalOffset + pageNumber}`),
  );
  return {
    text: pages.map((page) => page.text).join("\n\n"),
    pages,
    mimeType: input.mimeType,
    provider: "fake-provider",
    warnings: [],
  };
}

function textPage(pageNumber: number, text: string): OcrResult["pages"][number] {
  return {
    pageNumber,
    status: "text_extracted",
    method: "ocr",
    text,
    blocks: [],
  };
}

async function scannedPdf(pageCount: number): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  for (let index = 0; index < pageCount; index += 1) {
    document.addPage().drawRectangle({
      x: 30 + index,
      y: 600,
      width: 200,
      height: 80,
    });
  }
  return await document.save({ useObjectStreams: false });
}

async function nativePdf(pageTexts: readonly string[]): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  for (const text of pageTexts) {
    document.addPage().drawText(text, { x: 40, y: 700, font, size: 14 });
  }
  return await document.save({ useObjectStreams: false });
}
