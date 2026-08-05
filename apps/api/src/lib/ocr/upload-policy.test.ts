import { describe, expect, it } from "vitest";

import {
  DOCUMENT_MAX_PDF_PAGES,
  DURABLE_DOCUMENT_MAX_OCR_PAGES,
  DURABLE_DOCUMENT_MAX_PDF_PAGES,
  getConfiguredDocumentMaxPdfPages,
  getConfiguredDurableDocumentMaxOcrPages,
  getConfiguredDurableDocumentMaxPdfPages,
} from "./upload-policy";

describe("PDF upload policy", () => {
  it("keeps synchronous and Canvas extraction at 40 pages", () => {
    expect(DOCUMENT_MAX_PDF_PAGES).toBe(40);
    expect(getConfiguredDocumentMaxPdfPages({})).toBe(40);
  });

  it("allows 100 total pages but only 40 OCR-required pages for durable jobs", () => {
    expect(DURABLE_DOCUMENT_MAX_PDF_PAGES).toBe(100);
    expect(DURABLE_DOCUMENT_MAX_OCR_PAGES).toBe(40);
    expect(getConfiguredDurableDocumentMaxPdfPages({})).toBe(100);
    expect(getConfiguredDurableDocumentMaxOcrPages({})).toBe(40);
  });

  it("allows deployments to lower, but not raise, durable limits", () => {
    expect(
      getConfiguredDurableDocumentMaxPdfPages({
        DURABLE_DOCUMENT_MAX_PDF_PAGES: "75",
      }),
    ).toBe(75);
    expect(
      getConfiguredDurableDocumentMaxPdfPages({
        DURABLE_DOCUMENT_MAX_PDF_PAGES: "500",
      }),
    ).toBe(100);
    expect(
      getConfiguredDurableDocumentMaxOcrPages({
        DURABLE_DOCUMENT_MAX_OCR_PAGES: "20",
      }),
    ).toBe(20);
    expect(
      getConfiguredDurableDocumentMaxOcrPages({
        DURABLE_DOCUMENT_MAX_OCR_PAGES: "80",
      }),
    ).toBe(40);
  });
});
