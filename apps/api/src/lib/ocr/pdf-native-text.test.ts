import { StandardFonts, PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { inspectPdfTextPages, isUsableEmbeddedText } from "./pdf-native-text";

describe("inspectPdfTextPages", () => {
  it("classifies native text, scanned-looking content, and a blank page independently", async () => {
    const document = await PDFDocument.create();
    const font = await document.embedFont(StandardFonts.Helvetica);
    document.addPage().drawText("Introduction\nCore concept", {
      x: 40,
      y: 700,
      font,
      size: 14,
      lineHeight: 18,
    });
    document.addPage().drawRectangle({ x: 40, y: 600, width: 300, height: 100 });
    document.addPage();
    const bytes = await document.save({ useObjectStreams: false });

    const pages = await inspectPdfTextPages(bytes, 3);

    expect(pages).toEqual([
      expect.objectContaining({ pageNumber: 1, kind: "native_text" }),
      { pageNumber: 2, kind: "ocr", text: "" },
      { pageNumber: 3, kind: "blank", text: "" },
    ]);
    expect(pages[0]?.text).toContain("Introduction");
    expect(pages[0]?.text).toContain("Core concept");
    expect(pages[0]?.text).not.toContain("Introduction\n\nCore concept");
  });
});

describe("isUsableEmbeddedText", () => {
  it("is subject-neutral and accepts symbolic technical content", () => {
    expect(isUsableEmbeddedText("x² + y² = r²")).toBe(true);
    expect(isUsableEmbeddedText("DNA")).toBe(true);
    expect(isUsableEmbeddedText("\uFFFD\uFFFD")).toBe(false);
    expect(isUsableEmbeddedText("  ")).toBe(false);
  });
});
