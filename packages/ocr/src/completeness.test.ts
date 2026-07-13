import { describe, expect, it } from "vitest";

import { verifyDocumentExtraction } from "./completeness";
import type { OcrPage } from "./types";

describe("verifyDocumentExtraction", () => {
  it("accounts for all five pages and assembles them in page-number order", () => {
    const verification = verifyDocumentExtraction({
      expectedPageCount: 5,
      pages: [textPage(5), textPage(2), textPage(1), textPage(4), textPage(3)],
    });

    expect(verification.status).toBe("complete");
    expect(verification.sourceEligible).toBe(true);
    expect(verification.pages.map((page) => page.pageNumber)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(verification.text).toBe(
      [1, 2, 3, 4, 5].map((pageNumber) => `Fictional text ${pageNumber}`).join("\n\n"),
    );
    expect(verification.diagnostics).toMatchObject({
      expectedPageCount: 5,
      processedPageCount: 5,
      successfulPageCount: 5,
      blankPageCount: 0,
      failedPageCount: 0,
      missingPageNumbers: [],
      duplicatePageNumbers: [],
      outOfRangePageNumbers: [],
      affectedPageNumbers: [],
    });
  });

  it("retains a confirmed blank middle page without shifting later pages", () => {
    const verification = verifyDocumentExtraction({
      expectedPageCount: 3,
      pages: [textPage(1), blankPage(2), textPage(3)],
    });

    expect(verification.status).toBe("complete");
    expect(verification.pages.map((page) => [page.pageNumber, page.status])).toEqual([
      [1, "text_extracted"],
      [2, "blank"],
      [3, "text_extracted"],
    ]);
    expect(verification.text).toBe("Fictional text 1\n\nFictional text 3");
    expect(verification.diagnostics.blankPageCount).toBe(1);
  });

  it("rejects a missing final page", () => {
    const verification = verifyDocumentExtraction({
      expectedPageCount: 3,
      pages: [textPage(1), textPage(2)],
    });

    expectIncomplete(verification, {
      affectedPageNumbers: [3],
      missingPageNumbers: [3],
    });
  });

  it("rejects duplicate page results", () => {
    const verification = verifyDocumentExtraction({
      expectedPageCount: 2,
      pages: [textPage(1), textPage(1), textPage(2)],
    });

    expectIncomplete(verification, {
      affectedPageNumbers: [1],
      duplicatePageNumbers: [1],
    });
  });

  it("rejects out-of-range page numbers", () => {
    const verification = verifyDocumentExtraction({
      expectedPageCount: 2,
      pages: [textPage(1), textPage(2), textPage(3)],
    });

    expectIncomplete(verification, {
      affectedPageNumbers: [3],
      outOfRangePageNumbers: [3],
    });
  });

  it("rejects a failed middle page without assembling partial text", () => {
    const verification = verifyDocumentExtraction({
      expectedPageCount: 3,
      pages: [
        textPage(1),
        {
          pageNumber: 2,
          status: "failed",
          method: "ocr",
          failureCategory: "provider_page_error",
          text: "",
          blocks: [],
        },
        textPage(3),
      ],
    });

    expectIncomplete(verification, {
      affectedPageNumbers: [2],
      failedPageCount: 1,
    });
  });

  it("rejects malformed terminal results", () => {
    const verification = verifyDocumentExtraction({
      expectedPageCount: 2,
      pages: [
        textPage(1),
        {
          status: "text_extracted",
          method: "ocr",
          text: "",
          blocks: [],
        },
      ],
    });

    expectIncomplete(verification, {
      affectedPageNumbers: [2],
      failureCategories: ["missing_page", "malformed_page_result"],
      invalidPageNumbers: [],
      missingPageNumbers: [2],
    });
  });

  it("fails safely when every accounted page is blank", () => {
    const verification = verifyDocumentExtraction({
      expectedPageCount: 2,
      pages: [blankPage(1), blankPage(2)],
    });

    expect(verification.status).toBe("failed");
    expect(verification.sourceEligible).toBe(false);
    expect(verification.text).toBe("");
    expect(verification.diagnostics.blankPageCount).toBe(2);
    expect(verification.diagnostics.failureCategories).toEqual(["empty_document"]);
  });

  it("fails safely when the trusted expected page count is invalid", () => {
    const verification = verifyDocumentExtraction({
      expectedPageCount: 0,
      pages: [],
    });

    expect(verification.status).toBe("failed");
    expect(verification.sourceEligible).toBe(false);
    expect(verification.diagnostics.failureCategories).toEqual([
      "invalid_expected_page_count",
    ]);
  });

  it("supports mixed native-text and OCR pages without adding page labels", () => {
    const verification = verifyDocumentExtraction({
      expectedPageCount: 2,
      pages: [
        { ...textPage(1), method: "native_text" },
        { ...textPage(2), method: "ocr" },
      ],
    });

    expect(verification.status).toBe("complete");
    expect(verification.text).toBe("Fictional text 1\n\nFictional text 2");
    expect(verification.text).not.toMatch(/Page\s+[12]:/);
  });

  it("keeps diagnostics aggregate-only", () => {
    const privateLookingFixture = "Fictional secret-looking source sentence";
    const verification = verifyDocumentExtraction({
      expectedPageCount: 1,
      pages: [{ ...textPage(1), text: privateLookingFixture }],
    });

    expect(JSON.stringify(verification.diagnostics)).not.toContain(
      privateLookingFixture,
    );
    expect(verification.diagnostics).not.toHaveProperty("providerResponse");
    expect(verification.diagnostics).not.toHaveProperty("requestId");
  });
});

function textPage(pageNumber: number): OcrPage {
  return {
    pageNumber,
    status: "text_extracted",
    method: "ocr",
    text: `Fictional text ${pageNumber}`,
    blocks: [],
  };
}

function blankPage(pageNumber: number): OcrPage {
  return {
    pageNumber,
    status: "blank",
    method: "blank",
    text: "",
    blocks: [],
  };
}

function expectIncomplete(
  verification: ReturnType<typeof verifyDocumentExtraction>,
  diagnostics: Record<string, unknown>,
): void {
  expect(verification.status).toBe("incomplete");
  expect(verification.sourceEligible).toBe(false);
  expect(verification.text).toBe("");
  expect(verification.diagnostics).toMatchObject(diagnostics);
}
