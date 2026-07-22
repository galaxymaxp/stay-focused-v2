import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { createPdfOcrChunks, mapWithConcurrency } from "./pdf-chunking";

describe("createPdfOcrChunks", () => {
  it("creates stable five-page provider chunks from twelve source pages", async () => {
    const chunks = await createPdfOcrChunks({
      bytes: await createPdf(12),
      pageNumbers: Array.from({ length: 12 }, (_, index) => index + 1),
      pagesPerChunk: 5,
    });

    expect(chunks.map((chunk) => chunk.originalPageNumbers)).toEqual([
      [1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10],
      [11, 12],
    ]);
    expect(chunks.map((chunk) => chunk.requestedPages)).toEqual([
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
      [1, 2],
    ]);

    for (const [index, chunk] of chunks.entries()) {
      const parsed = await PDFDocument.load(chunk.bytes);
      expect(parsed.getPageCount()).toBe([5, 5, 2][index]);
    }
  });

  it("keeps noncontiguous mixed-document OCR pages in original order", async () => {
    const chunks = await createPdfOcrChunks({
      bytes: await createPdf(9),
      pageNumbers: [8, 2, 6, 4],
      pagesPerChunk: 3,
    });

    expect(chunks.map((chunk) => chunk.originalPageNumbers)).toEqual([
      [2, 4, 6],
      [8],
    ]);
  });
});

describe("mapWithConcurrency", () => {
  it("never starts more work than the configured bound", async () => {
    let active = 0;
    let maximumActive = 0;

    const results = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return value * 2;
    });

    expect(results).toEqual([2, 4, 6, 8, 10]);
    expect(maximumActive).toBe(2);
  });
});

async function createPdf(pageCount: number): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  for (let index = 0; index < pageCount; index += 1) {
    document.addPage();
  }
  return await document.save({ useObjectStreams: false });
}
