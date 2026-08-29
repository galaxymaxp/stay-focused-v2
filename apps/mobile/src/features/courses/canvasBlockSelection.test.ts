import { describe, expect, it } from "vitest";

import type { CanvasSourceStructurePayload } from "../../services/canvasApi";
import {
  canvasBlockPreview,
  countSelectableCanvasBlocks,
  createCanvasBlockSelectionKey,
  createDefaultCanvasBlockSelection,
  describeCanvasBlockSelection,
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

describe("Canvas block selection summary", () => {
  it("counts only the blocks the student can actually select", () => {
    expect(countSelectableCanvasBlocks(fixture())).toBe(3);
  });

  it("reports the selection against the selectable source, not the safeguard", () => {
    expect(
      describeCanvasBlockSelection({
        maximumSelectedBlocks: 250,
        selectableCount: 9,
        selectedCount: 3,
      }),
    ).toEqual({
      exceedsLimit: false,
      limitNotice: null,
      summary: "3 of 9 blocks selected",
    });
  });

  it("uses the singular block unit for a single selectable block", () => {
    expect(
      describeCanvasBlockSelection({
        maximumSelectedBlocks: 250,
        selectableCount: 1,
        selectedCount: 1,
      }).summary,
    ).toBe("1 of 1 block selected");
  });

  it("surfaces the limit only once the selection reaches it", () => {
    const atLimit = describeCanvasBlockSelection({
      maximumSelectedBlocks: 250,
      selectableCount: 400,
      selectedCount: 250,
    });

    expect(atLimit.exceedsLimit).toBe(false);
    expect(atLimit.limitNotice).toBe(
      "This is the maximum of 250 blocks. Deselect one before adding another.",
    );
  });

  it("says how many blocks to deselect when the selection exceeds the limit", () => {
    const overLimit = describeCanvasBlockSelection({
      maximumSelectedBlocks: 250,
      selectableCount: 400,
      selectedCount: 251,
    });

    expect(overLimit.exceedsLimit).toBe(true);
    expect(overLimit.limitNotice).toBe(
      "Select at most 250 blocks. Deselect 1 block to preview.",
    );
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
