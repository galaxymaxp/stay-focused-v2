import type {
  CanvasSourceStructurePayload,
  CanvasStructuredBlock,
} from "../../services/canvasApi";

export interface CanvasBlockSelectionView {
  readonly block: CanvasStructuredBlock;
  readonly sourceTitle: string;
  readonly sourceType: CanvasSourceStructurePayload["sources"][number]["type"];
}

export function listCanvasBlocksInSourceOrder(
  structure: CanvasSourceStructurePayload,
): readonly CanvasBlockSelectionView[] {
  return structure.sources.flatMap((source) =>
    source.blocks.map((block) => ({
      block,
      sourceTitle: source.title,
      sourceType: source.type,
    })),
  );
}

export function createDefaultCanvasBlockSelection(
  structure: CanvasSourceStructurePayload,
): readonly string[] {
  return listCanvasBlocksInSourceOrder(structure)
    .filter(({ block }) => block.selectable && block.selectedByDefault)
    .map(({ block }) => block.id);
}

export function orderCanvasBlockSelection(
  structure: CanvasSourceStructurePayload,
  selectedBlockIds: ReadonlySet<string> | readonly string[],
): readonly string[] {
  const selected = new Set(selectedBlockIds);
  return listCanvasBlocksInSourceOrder(structure)
    .filter(({ block }) => block.selectable && selected.has(block.id))
    .map(({ block }) => block.id);
}

export function toggleCanvasBlockSelection({
  blockId,
  selectedBlockIds,
  structure,
}: {
  readonly blockId: string;
  readonly selectedBlockIds: readonly string[];
  readonly structure: CanvasSourceStructurePayload;
}): readonly string[] {
  const nextSelection = new Set(selectedBlockIds);
  if (nextSelection.has(blockId)) {
    nextSelection.delete(blockId);
  } else {
    nextSelection.add(blockId);
  }
  return orderCanvasBlockSelection(structure, nextSelection);
}

export function createCanvasBlockSelectionKey(
  structureSessionId: string,
  selectedBlockIds: readonly string[],
): string {
  return `${structureSessionId.trim()}:${selectedBlockIds.join(",")}`;
}

export function canvasBlockPreview(text: string, maximumCharacters = 240): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maximumCharacters) return normalized;
  return `${normalized.slice(0, Math.max(0, maximumCharacters - 1)).trimEnd()}…`;
}
