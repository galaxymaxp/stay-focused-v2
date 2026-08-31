import { describe, expect, it } from "vitest";

import {
  DOCUMENT_MAX_PDF_PAGES,
  DURABLE_DOCUMENT_MAX_OCR_PAGES,
  DURABLE_DOCUMENT_MAX_PDF_PAGES,
  getConfiguredDocumentMaxPdfPages,
  getConfiguredDurableDocumentMaxOcrPages,
  getConfiguredDurableDocumentMaxPdfPages,
  selectPdfDocumentProcessingPath,
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

  it("routes supported PDFs without weakening either page limit", () => {
    expect(selectPdfDocumentProcessingPath(1, {})).toBe("synchronous");
    expect(selectPdfDocumentProcessingPath(40, {})).toBe("synchronous");
    expect(selectPdfDocumentProcessingPath(41, {})).toBe("durable");
    expect(selectPdfDocumentProcessingPath(100, {})).toBe("durable");
    expect(selectPdfDocumentProcessingPath(101, {})).toBe("unsupported");
  });

  it("honors lower deployment limits when selecting the durable path", () => {
    const environment = {
      DOCUMENT_MAX_PDF_PAGES: "20",
      DURABLE_DOCUMENT_MAX_PDF_PAGES: "75",
    };

    expect(selectPdfDocumentProcessingPath(20, environment)).toBe("synchronous");
    expect(selectPdfDocumentProcessingPath(21, environment)).toBe("durable");
    expect(selectPdfDocumentProcessingPath(75, environment)).toBe("durable");
    expect(selectPdfDocumentProcessingPath(76, environment)).toBe("unsupported");
  });
});
