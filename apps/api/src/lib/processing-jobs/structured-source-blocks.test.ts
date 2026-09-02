import { describe, expect, it } from "vitest";

import { readStructuredSourceBlocks } from "./structured-source-blocks";

describe("structured reviewer source blocks", () => {
  it("preserves typed block and table-cell provenance", () => {
    const table = {
      id: "table-1",
      type: "table" as const,
      pageNumber: 2,
      order: 0,
      rows: [{
        index: 0,
        cells: [{
          id: "cell-1",
          rowIndex: 0,
          columnIndex: 0,
          rowSpan: 1,
          columnSpan: 1,
          text: "67",
          provenance: {
            pageNumber: 2,
            blockId: "cell-1",
            parser: "mineru" as const,
            tableCell: { tableBlockId: "table-1", rowIndex: 0, columnIndex: 0 },
          },
        }],
      }],
      provenance: { pageNumber: 2, blockId: "table-1", parser: "mineru" as const },
    };
    const blocks = readStructuredSourceBlocks([{
      id: "table-1",
      kind: "table",
      order: 0,
      pageNumber: 2,
      text: "67",
      structuredBlock: table,
    }], { strict: true });
    expect(blocks?.[0]).toMatchObject({
      kind: "table",
      metadata: { typedStructure: true, textOrigin: "parser" },
      structuredBlock: table,
    });
  });

  it("rejects mismatched structured text in strict mode", () => {
    expect(readStructuredSourceBlocks([{
      text: "changed",
      structuredBlock: {
        id: "code-1",
        type: "code",
        pageNumber: 1,
        order: 0,
        text: "source",
        provenance: { pageNumber: 1, blockId: "code-1", parser: "docling" },
      },
    }], { strict: true })).toBeUndefined();
  });

  it("keeps legacy blocks trimmed and untyped", () => {
    expect(readStructuredSourceBlocks([{
      kind: "heading",
      text: "  Legacy page text  ",
    }], { strict: true })).toEqual([{
      kind: "unknown",
      order: 0,
      text: "Legacy page text",
    }]);
  });

  it("preserves code whitespace while stripping unknown provenance fields", () => {
    const blocks = readStructuredSourceBlocks([{
      text: "  value = 1\n",
      structuredBlock: {
        id: "code-2",
        type: "code",
        pageNumber: 1,
        order: 0,
        text: "  value = 1\n",
        provenance: {
          pageNumber: 1,
          blockId: "code-2",
          parser: "docling",
          privatePath: "C:\\private\\model",
        },
      },
    }], { strict: true });
    expect(blocks?.[0]?.text).toBe("  value = 1\n");
    expect(blocks?.[0]?.structuredBlock?.provenance).not.toHaveProperty("privatePath");
  });
});
