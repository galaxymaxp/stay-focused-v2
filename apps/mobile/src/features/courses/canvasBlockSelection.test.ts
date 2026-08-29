import { describe, expect, it } from "vitest";

import type { CanvasSourceStructurePayload } from "../../services/canvasApi";
import {
  canvasBlockPreview,
  createCanvasBlockSelectionKey,
  createDefaultCanvasBlockSelection,
  listCanvasBlocksInSourceOrder,
  orderCanvasBlockSelection,
  toggleCanvasBlockSelection,
} from "./canvasBlockSelection";

describe("Canvas block selection", () => {
  it("renders blocks and selected IDs in the server-provided source order", () => {
    const structure = fixture();

    expect(
      listCanvasBlocksInSourceOrder(structure).map(({ block }) => block.id),
    ).toEqual(["heading-a", "paragraph-a", "heading-b", "paragraph-b"]);
    expect(
      orderCanvasBlockSelection(structure, ["paragraph-b", "paragraph-a"]),
    ).toEqual(["paragraph-a", "paragraph-b"]);
  });

  it("uses the server default selection and excludes unselectable context", () => {
    expect(createDefaultCanvasBlockSelection(fixture())).toEqual([
      "heading-a",
      "paragraph-a",
      "paragraph-b",
    ]);
  });

  it("selects, deselects, and preserves order across multiple blocks", () => {
    const structure = fixture();
    const deselected = toggleCanvasBlockSelection({
      blockId: "paragraph-a",
      selectedBlockIds: createDefaultCanvasBlockSelection(structure),
      structure,
    });
    const selectedAgain = toggleCanvasBlockSelection({
      blockId: "paragraph-a",
      selectedBlockIds: deselected,
      structure,
    });

    expect(deselected).toEqual(["heading-a", "paragraph-b"]);
    expect(selectedAgain).toEqual(["heading-a", "paragraph-a", "paragraph-b"]);
  });

  it("represents an explicit zero selection and binds preview state to exact blocks", () => {
    expect(orderCanvasBlockSelection(fixture(), [])).toEqual([]);
    expect(createCanvasBlockSelectionKey("session-a", ["a", "b"])).toBe(
      "session-a:a,b",
    );
    expect(createCanvasBlockSelectionKey("session-a", ["a"])).not.toBe(
      createCanvasBlockSelectionKey("session-a", ["a", "b"]),
    );
  });

  it("creates a concise readable preview without changing short text", () => {
    expect(canvasBlockPreview("  Short\n text  ")).toBe("Short text");
    expect(canvasBlockPreview("1234567890", 7)).toBe("123456…");
  });
});

function fixture(): CanvasSourceStructurePayload {
  return {
    structureSessionId: "session-a",
    sources: [
      {
        ordinal: 1,
        type: "page",
        title: "First source",
        duplicateSummary: {
          duplicateKind: "none",
          repeatedReferenceCount: 0,
          repeatedReferenceKinds: [],
        },
        blocks: [
          {
            id: "heading-a",
            kind: "heading",
            text: "First heading",
            sourceOrdinal: 1,
            blockOrdinal: 1,
            headingLevel: 1,
            selectable: true,
            selectedByDefault: true,
          },
          {
            id: "paragraph-a",
            kind: "paragraph",
            text: "First paragraph",
            sourceOrdinal: 1,
            blockOrdinal: 2,
            selectable: true,
            selectedByDefault: true,
          },
        ],
      },
      {
        ordinal: 2,
        type: "assignment",
        title: "Second source",
        duplicateSummary: {
          duplicateKind: "none",
          repeatedReferenceCount: 0,
          repeatedReferenceKinds: [],
        },
        blocks: [
          {
            id: "heading-b",
            kind: "heading",
            text: "Context only",
            sourceOrdinal: 2,
            blockOrdinal: 1,
            headingLevel: 2,
            selectable: false,
            selectedByDefault: true,
          },
          {
            id: "paragraph-b",
            kind: "paragraph",
            text: "Second paragraph",
            sourceOrdinal: 2,
            blockOrdinal: 2,
            selectable: true,
            selectedByDefault: true,
          },
        ],
      },
    ],
    totalBlockCount: 4,
    selectedByDefaultCount: 4,
    limits: { maximumBlocks: 400, maximumSelectedBlocks: 250 },
  };
}
