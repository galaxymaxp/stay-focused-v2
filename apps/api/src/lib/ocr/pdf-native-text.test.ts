import { StandardFonts, PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { inspectPdfTextPages, isLikelyLayoutIncompletePage, isUsableEmbeddedText } from "./pdf-native-text";

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
      expect.objectContaining({ pageNumber: 2, kind: "ocr", text: "" }),
      { pageNumber: 3, kind: "blank", text: "" },
    ]);
    expect(pages[0]?.text).toContain("Introduction");
    expect(pages[0]?.text).toContain("Core concept");
    expect(pages[0]?.text).not.toContain("Introduction\n\nCore concept");
  });

  it("routes a sparse text page with multiple painted images to OCR", async () => {
    const document = await PDFDocument.create();
    const font = await document.embedFont(StandardFonts.Helvetica);
    const image = await document.embedPng(Buffer.from(ONE_PIXEL_PNG, "base64"));
    const page = document.addPage();
    page.drawText("Concept Map", { x: 40, y: 700, font, size: 14 });
    page.drawImage(image, { x: 40, y: 500, width: 80, height: 80 });
    page.drawImage(image, { x: 160, y: 500, width: 80, height: 80 });
    const bytes = await document.save({ useObjectStreams: false });

    expect(await inspectPdfTextPages(bytes, 1)).toEqual([
      expect.objectContaining({ pageNumber: 1, kind: "ocr", reason: "layout_incomplete", nativeText: "Concept Map" }),
    ]);
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

describe("isLikelyLayoutIncompletePage", () => {
  it("keeps legitimate sparse text-only pages native and flags visually rich sparse pages", () => {
    expect(isLikelyLayoutIncompletePage("A short observed fact.", { imagePaintCount: 1, pathConstructionCount: 2 })).toBe(false);
    expect(isLikelyLayoutIncompletePage("Concept Map", { imagePaintCount: 2, pathConstructionCount: 2 })).toBe(true);
    expect(isLikelyLayoutIncompletePage("A complete paragraph with enough words to explain the diagram directly in native text.", { imagePaintCount: 3, pathConstructionCount: 12 })).toBe(false);
  });
});

const ONE_PIXEL_PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
