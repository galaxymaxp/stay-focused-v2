import { describe, expect, it } from "vitest";

import { readDocumentParserConfig } from "./config";
import { tryParseStructuredPdf } from "./structured-parser-service";

const input = {
  bytes: new Uint8Array([1]),
  mimeType: "application/pdf",
  pageCount: 1,
  signals: {
    pageCount: 1,
    nativeTextPageCount: 1,
    ocrRequiredPageCount: 0,
    nativeTextCharacterCount: 10,
  },
};

describe("structured parser configuration", () => {
  it("defaults safely to the legacy path", () => {
    expect(readDocumentParserConfig({})).toEqual({
      mode: "legacy",
      timeoutMs: 600_000,
    });
  });

  it("accepts only complete injectable bridge configurations", () => {
    expect(readDocumentParserConfig({
      DOCUMENT_PARSER_MODE: "hybrid",
      DOCUMENT_PARSER_TIMEOUT_MS: "5000",
      DOCLING_PYTHON_PATH: "python",
      DOCLING_PARSER_BRIDGE_PATH: "docling.py",
      MINERU_PYTHON_PATH: "python",
    })).toEqual({
      mode: "hybrid",
      timeoutMs: 5_000,
      docling: { pythonPath: "python", bridgePath: "docling.py" },
    });
  });

  it("does not invoke external infrastructure in legacy mode", async () => {
    const result = await tryParseStructuredPdf(input, {
      mode: "legacy",
      timeoutMs: 1_000,
      docling: { pythonPath: "missing", bridgePath: "missing" },
      mineru: { pythonPath: "missing", bridgePath: "missing" },
    });
    expect(result).toMatchObject({ document: null, selectedParser: null, attempts: [] });
  });

  it("falls back safely when configured parser bridges are unavailable", async () => {
    const result = await tryParseStructuredPdf(input, {
      mode: "hybrid",
      timeoutMs: 1_000,
    });
    expect(result.document).toBeNull();
    expect(result.attempts.map((attempt) => [attempt.parser, attempt.outcome])).toEqual([
      ["docling", "unavailable"],
      ["mineru", "unavailable"],
      ["legacy", "unavailable"],
    ]);
    expect(JSON.stringify(result.attempts)).not.toMatch(/stack|\\Users\\|model path/i);
  });
});
