import { describe, expect, it } from "vitest";

import { normalizeOcrResult, normalizeOcrText } from "./normalize";
import type { OcrBoundingBox } from "./types";

describe("normalizeOcrText", () => {
  it("normalizes Windows line endings and trims trailing whitespace", () => {
    expect(normalizeOcrText("Heading  \r\nBody line\t \rNext")).toBe(
      "Heading\nBody line\nNext",
    );
  });

  it("removes null characters without collapsing repeated spaces", () => {
    expect(normalizeOcrText("A\0  spaced   line")).toBe("A  spaced   line");
  });

  it("preserves intentional blank lines between paragraphs", () => {
    expect(normalizeOcrText("Title\n\n\nParagraph one.\n\nParagraph two.")).toBe(
      "Title\n\n\nParagraph one.\n\nParagraph two.",
    );
  });

  it("returns an empty string for empty OCR output", () => {
    expect(normalizeOcrText("\r\n \0 \n")).toBe("");
  });
});

describe("normalizeOcrResult", () => {
  it("preserves headings and paragraph boundaries as blocks", () => {
    const result = normalizeOcrResult({
      mimeType: "image/png",
      provider: "fake-ocr",
      pages: [
        {
          pageNumber: 1,
          blocks: [
            { kind: "paragraph", text: "STUDY HABITS" },
            {
              kind: "paragraph",
              text: "Set one clear goal before studying.\nReview notes later.",
            },
          ],
        },
      ],
    });

    expect(result.text).toBe(
      "STUDY HABITS\n\nSet one clear goal before studying.\nReview notes later.",
    );
    expect(result.pages[0]?.blocks).toHaveLength(2);
  });

  it("preserves bullet lists and repeated spaces inside lines", () => {
    const result = normalizeOcrResult({
      mimeType: "image/jpeg",
      provider: "fake-ocr",
      pages: [
        {
          blocks: [
            {
              text: "- Turn off  notifications.\n- Check   understanding.",
            },
          ],
        },
      ],
    });

    expect(result.text).toBe(
      "- Turn off  notifications.\n- Check   understanding.",
    );
    expect(result.pages[0]?.blocks[0]?.lines.map((line) => line.text)).toEqual([
      "- Turn off  notifications.",
      "- Check   understanding.",
    ]);
  });

  it("preserves page boundaries through ordered page objects", () => {
    const result = normalizeOcrResult({
      mimeType: "image/png",
      provider: "fake-ocr",
      pages: [
        { pageNumber: 2, text: "Second page" },
        { pageNumber: 1, text: "First page" },
      ],
    });

    expect(result.text).toBe("First page\n\nSecond page");
    expect(result.pages.map((page) => page.pageNumber)).toEqual([1, 2]);
  });

  it("normalizes a single-page PDF document", () => {
    const result = normalizeOcrResult({
      mimeType: "application/pdf",
      provider: "fake-ocr",
      pages: [{ pageNumber: 1, text: "PDF HEADING\nA line from a scan." }],
    });

    expect(result.mimeType).toBe("application/pdf");
    expect(result.pages).toHaveLength(1);
    expect(result.text).toBe("PDF HEADING\nA line from a scan.");
  });

  it("preserves multi-page PDF ordering and separation", () => {
    const result = normalizeOcrResult({
      mimeType: "application/pdf",
      provider: "fake-ocr",
      pages: [
        { pageNumber: 3, text: "Third page" },
        { pageNumber: 1, text: "First page" },
        { pageNumber: 2, text: "Second page" },
      ],
    });

    expect(result.pages.map((page) => page.pageNumber)).toEqual([1, 2, 3]);
    expect(result.text).toBe("First page\n\nSecond page\n\nThird page");
  });

  it("retains empty PDF pages without inventing content", () => {
    const result = normalizeOcrResult({
      mimeType: "application/pdf",
      provider: "fake-ocr",
      pages: [
        { pageNumber: 1, text: "First page" },
        { pageNumber: 2, text: "" },
      ],
    });

    expect(result.pages).toEqual([
      expect.objectContaining({ pageNumber: 1, text: "First page" }),
      expect.objectContaining({ pageNumber: 2, text: "" }),
    ]);
    expect(result.text).toBe("First page");
  });

  it("reports an entire PDF document with no text", () => {
    const result = normalizeOcrResult({
      mimeType: "application/pdf",
      provider: "fake-ocr",
      pages: [{ pageNumber: 1, text: "" }],
    });

    expect(result.pages).toHaveLength(1);
    expect(result.text).toBe("");
    expect(result.warnings).toContainEqual({
      code: "empty_text",
      message: "The OCR provider returned no extracted text.",
    });
  });

  it("handles empty provider pages safely", () => {
    const result = normalizeOcrResult({
      mimeType: "image/png",
      provider: "fake-ocr",
      pages: [],
    });

    expect(result.text).toBe("");
    expect(result.pages).toEqual([]);
    expect(result.warnings).toContainEqual({
      code: "empty_text",
      message: "The OCR provider returned no extracted text.",
    });
  });

  it("sorts provider blocks by coordinates when explicit order is absent", () => {
    const result = normalizeOcrResult({
      mimeType: "image/png",
      provider: "fake-ocr",
      pages: [
        {
          blocks: [
            { text: "Bottom", boundingBox: box(10, 200) },
            { text: "Top right", boundingBox: box(200, 20) },
            { text: "Top left", boundingBox: box(10, 20) },
          ],
        },
      ],
    });

    expect(result.pages[0]?.blocks.map((block) => block.text)).toEqual([
      "Top left",
      "Top right",
      "Bottom",
    ]);
    expect(result.text).toBe("Top left\n\nTop right\n\nBottom");
  });

  it("sorts lines by coordinates and preserves trailing-whitespace cleanup", () => {
    const result = normalizeOcrResult({
      mimeType: "image/png",
      provider: "fake-ocr",
      pages: [
        {
          blocks: [
            {
              lines: [
                { text: "Line 2   ", boundingBox: box(10, 40) },
                { text: "Line 1\t", boundingBox: box(10, 10) },
              ],
            },
          ],
        },
      ],
    });

    expect(result.pages[0]?.blocks[0]?.text).toBe("Line 1\nLine 2");
  });
});

function box(x: number, y: number): OcrBoundingBox {
  return {
    vertices: [
      { x, y },
      { x: x + 10, y },
      { x: x + 10, y: y + 10 },
      { x, y: y + 10 },
    ],
  };
}
