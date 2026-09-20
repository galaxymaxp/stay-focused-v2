import { describe, expect, it } from "vitest";

import { resolveExtractionProgressStage } from "./extraction-progress";

describe("resolveExtractionProgressStage", () => {
  it("preserves document-extraction stages", () => {
    expect(resolveExtractionProgressStage("extracting_ocr", false)).toBe("extracting_ocr");
  });

  it("keeps deferred reviewer OCR within the reviewer stage contract", () => {
    expect(resolveExtractionProgressStage("inspecting_document", true)).toBe("preparing_source");
    expect(resolveExtractionProgressStage("preparing_ocr_chunks", true)).toBe("preparing_source");
    expect(resolveExtractionProgressStage("extracting_ocr", true)).toBe("preparing_source");
    expect(resolveExtractionProgressStage("verifying_pages", true)).toBe("preparing_source");
  });
});
