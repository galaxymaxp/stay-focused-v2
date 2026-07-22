import { describe, expect, it } from "vitest";

import { normalizeDocumentTextWithEvidence } from "./document-normalization";
import type { OcrPage } from "./types";

describe("normalizeDocumentTextWithEvidence", () => {
  it("removes only exact text repeated in a stable page region", () => {
    const pages = Array.from({ length: 5 }, (_, index) =>
      page(
        index + 1,
        [
          "BIOLOGY 101 — COURSE HANDOUT",
          `Section ${index + 1}`,
          "Cells use membranes to regulate transport.",
          "This repeated concept is legitimate body content.",
          `Example for page ${index + 1}.`,
          "Department learning materials",
        ].join("\n"),
      ),
    );

    const result = normalizeDocumentTextWithEvidence(pages);

    expect(result.text).not.toContain("BIOLOGY 101 — COURSE HANDOUT");
    expect(result.text).not.toContain("Department learning materials");
    expect(result.text.match(/legitimate body content/g)).toHaveLength(5);
    expect(result.diagnostics.removedLineCount).toBe(10);
    expect(result.diagnostics.removedCandidates).toHaveLength(2);
  });

  it("preserves repeated content when it is not at a stable page edge", () => {
    const pages = Array.from({ length: 3 }, (_, index) =>
      page(
        index + 1,
        [
          `Chapter ${index + 1}`,
          "Shared definition",
          "A neutral repeated concept belongs in the reading.",
          "Supporting detail.",
          `Closing note ${index + 1}`,
        ].join("\n"),
      ),
    );

    const result = normalizeDocumentTextWithEvidence(pages);

    expect(result.text.match(/Shared definition/g)).toHaveLength(3);
    expect(result.diagnostics.removedLineCount).toBe(0);
  });
});

function page(pageNumber: number, text: string): OcrPage {
  return {
    pageNumber,
    status: "text_extracted",
    method: "ocr",
    text,
    blocks: [],
  };
}
