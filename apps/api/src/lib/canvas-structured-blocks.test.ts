import type { OcrResult } from "@stay-focused/ocr";
import { describe, expect, it } from "vitest";

import {
  CANVAS_HTML_STRUCTURED_BLOCKS_VERSION,
  CANVAS_OCR_STRUCTURED_BLOCKS_VERSION,
  finalizeStructuredBlockDrafts,
  normalizeCanvasHtmlToStructuredBlockDrafts,
  normalizeOcrResultToStructuredBlockDrafts,
  toPublicStructuredBlock,
} from "./canvas-structured-blocks";

describe("Canvas structured block normalization", () => {
  it("preserves HTML headings, list depth, tables, quotes, and code safely", () => {
    const drafts = normalizeCanvasHtmlToStructuredBlockDrafts(`
      <h2>Module overview</h2>
      <p>Read the chapter and compare ideas.</p>
      <ul>
        <li>First note<ol><li>Nested step</li></ol></li>
      </ul>
      <table>
        <tr><th>Term</th><th>Meaning</th></tr>
        <tr><td>Focus</td><td>Attention</td></tr>
      </table>
      <blockquote>Important quote</blockquote>
      <pre>const safe = true;</pre>
      <script>secretScript()</script>
      <p style="display: none">Hidden text</p>
    `);

    expect(drafts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          headingLevel: 2,
          kind: "heading",
          text: "Module overview",
        }),
        expect.objectContaining({
          kind: "list_item",
          listDepth: 0,
          listStyle: "unordered",
          text: "First note",
        }),
        expect.objectContaining({
          kind: "list_item",
          listDepth: 1,
          listStyle: "ordered",
          text: "Nested step",
        }),
        expect.objectContaining({
          kind: "table",
          tableStructure: {
            rows: [
              {
                cells: [
                  { header: true, text: "Term" },
                  { header: true, text: "Meaning" },
                ],
              },
              {
                cells: [
                  { header: false, text: "Focus" },
                  { header: false, text: "Attention" },
                ],
              },
            ],
          },
          text: "Term | Meaning\nFocus | Attention",
        }),
        expect.objectContaining({ kind: "quote", text: "Important quote" }),
        expect.objectContaining({ kind: "code", text: "const safe = true;" }),
      ]),
    );
    expect(JSON.stringify(drafts)).not.toContain("secretScript");
    expect(JSON.stringify(drafts)).not.toContain("Hidden text");
  });

  it("converts OCR pages into ordered page-aware blocks without inventing headings", () => {
    const drafts = normalizeOcrResultToStructuredBlockDrafts({
      mimeType: "application/pdf",
      pages: [
        {
          blocks: [
            {
              id: "block-2",
              kind: "line-group",
              lines: [
                { id: "line-2", order: 2, text: "- Second" },
                { id: "line-1", order: 1, text: "- First" },
              ],
              order: 1,
              text: "- First\n- Second",
            },
          ],
          pageNumber: 2,
          text: "- First\n- Second",
        },
      ],
      provider: "fake",
      text: "- First\n- Second",
      warnings: [],
    } satisfies OcrResult);

    expect(drafts).toEqual([
      expect.objectContaining({
        kind: "list_item",
        listStyle: "unordered",
        pageNumber: 2,
        text: "First",
      }),
      expect.objectContaining({
        kind: "list_item",
        listStyle: "unordered",
        pageNumber: 2,
        text: "Second",
      }),
    ]);
    expect(drafts).not.toContainEqual(expect.objectContaining({ kind: "heading" }));
  });

  it("finalizes private blocks with hashes and exposes only public block metadata", () => {
    const blocks = finalizeStructuredBlockDrafts({
      drafts: [
        {
          headingLevel: 1,
          kind: "heading",
          text: "Overview",
        },
      ],
      parserVersion: CANVAS_HTML_STRUCTURED_BLOCKS_VERSION,
      sourceOrdinal: 1,
    });
    const block = blocks[0];

    expect(block).toMatchObject({
      block_kind: "heading",
      block_ordinal: 1,
      heading_level: 1,
      parser_version: CANVAS_HTML_STRUCTURED_BLOCKS_VERSION,
      source_ordinal: 1,
    });
    expect(block?.block_sha256).toMatch(/^[a-f0-9]{64}$/);
    if (!block) {
      return;
    }

    const publicBlock = toPublicStructuredBlock({
      ...block,
      ocr_version: CANVAS_OCR_STRUCTURED_BLOCKS_VERSION,
    });
    expect(publicBlock).toMatchObject({
      blockOrdinal: 1,
      headingLevel: 1,
      kind: "heading",
      sourceOrdinal: 1,
      text: "Overview",
    });
    expect(JSON.stringify(publicBlock)).not.toContain("sha256");
    expect(JSON.stringify(publicBlock)).not.toContain("parser_version");
  });
});
