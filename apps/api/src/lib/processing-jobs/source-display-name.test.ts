import { describe, expect, it } from "vitest";

import {
  readUploadDisplayName,
  sanitizeSourceDisplayName,
} from "./source-display-name";

describe("processing source display names", () => {
  it("prefers explicit multipart metadata without decoding literal plus signs", () => {
    expect(
      readUploadDisplayName(
        "Neutral Notes + Appendix.pdf",
        "Neutral%2BNotes.pdf",
      ),
    ).toBe("Neutral Notes + Appendix.pdf");
  });

  it("falls back safely for older clients and normalizes control whitespace", () => {
    expect(readUploadDisplayName(null, "  Neutral\u0000  Notes.pdf  ")).toBe(
      "Neutral Notes.pdf",
    );
    expect(sanitizeSourceDisplayName("")).toBe("Source");
  });
});
