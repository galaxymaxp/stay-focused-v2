import type { NormalizedSourceBlock } from "./types.js";

export function removeConsecutiveDuplicateSourceBlocks(
  blocks: readonly NormalizedSourceBlock[],
): readonly NormalizedSourceBlock[] {
  const uniqueBlocks: NormalizedSourceBlock[] = [];

  for (const block of blocks) {
    const previous = uniqueBlocks.at(-1);
    if (
      previous &&
      previous.kind === block.kind &&
      normalizeSpaces(previous.text) === normalizeSpaces(block.text)
    ) {
      continue;
    }
    uniqueBlocks.push(block);
  }

  return uniqueBlocks;
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
