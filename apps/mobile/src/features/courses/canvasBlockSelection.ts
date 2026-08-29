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

export function countSelectableCanvasBlocks(
  structure: CanvasSourceStructurePayload,
): number {
  return listCanvasBlocksInSourceOrder(structure).filter(
    ({ block }) => block.selectable,
  ).length;
}

export interface CanvasBlockSelectionSummary {
  readonly summary: string;
  readonly limitNotice: string | null;
  readonly exceedsLimit: boolean;
}

/**
 * Describes the selection against the material the student can actually choose.
 * The server-enforced maximum is a safeguard, so it only surfaces once the
 * selection reaches it.
 */
export function describeCanvasBlockSelection({
  maximumSelectedBlocks,
  selectableCount,
  selectedCount,
}: {
  readonly maximumSelectedBlocks: number;
  readonly selectableCount: number;
  readonly selectedCount: number;
}): CanvasBlockSelectionSummary {
  const summary = `${selectedCount.toLocaleString()} of ${selectableCount.toLocaleString()} ${
    selectableCount === 1 ? "block" : "blocks"
  } selected`;

  if (selectedCount > maximumSelectedBlocks) {
    const excess = selectedCount - maximumSelectedBlocks;
    return {
      exceedsLimit: true,
      limitNotice: `Select at most ${maximumSelectedBlocks.toLocaleString()} blocks. Deselect ${excess.toLocaleString()} ${
        excess === 1 ? "block" : "blocks"
      } to preview.`,
      summary,
    };
  }

  if (selectedCount >= maximumSelectedBlocks) {
    return {
      exceedsLimit: false,
      limitNotice: `This is the maximum of ${maximumSelectedBlocks.toLocaleString()} blocks. Deselect one before adding another.`,
      summary,
    };
  }

  return { exceedsLimit: false, limitNotice: null, summary };
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
