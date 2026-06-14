import type {
  NormalizedSource,
  NormalizedSourceBlock,
  OutlineSection,
  SectionContentTag,
  SourceOutline,
} from "./types";

interface SectionDraft {
  readonly title: string;
  readonly blocks: readonly NormalizedSourceBlock[];
  readonly headingBased: boolean;
}

const PROCESS_PATTERN =
  /\b(first|next|then|finally|procedure|process|steps?)\b/i;
const EXAMPLE_PATTERN = /\b(for example|example|instance|scenario|sample)\b/i;
const CLAIM_PATTERN =
  /\b(argues?|states?|proves?|suggests?|evidence|therefore|because)\b/i;
const DEFINITION_PATTERN =
  /\b(is defined as|refers to|means|definition)\b/i;

export async function detectOutline(
  source: NormalizedSource,
): Promise<SourceOutline> {
  if (source.blocks.length === 0) {
    throw new Error("Outline detection requires at least one source block.");
  }

  const orderedBlocks = source.blocks
    .map((block, inputIndex) => ({ block, inputIndex }))
    .sort(
      (left, right) =>
        left.block.order - right.block.order ||
        left.inputIndex - right.inputIndex,
    )
    .map(({ block }) => block);
  const drafts = groupSections(orderedBlocks, source.title);
  const sections = drafts.map((draft, order) =>
    createOutlineSection(source.id, draft, order),
  );

  return {
    id: stableId(
      "outline",
      [source.id, ...sections.map((section) => section.id)].join("\u001f"),
    ),
    sourceId: source.id,
    title: source.title,
    sections,
  };
}

function groupSections(
  blocks: readonly NormalizedSourceBlock[],
  sourceTitle: string,
): readonly SectionDraft[] {
  const hasHeadings = blocks.some((block) => block.kind === "heading");
  if (!hasHeadings) {
    return [{ title: sourceTitle, blocks, headingBased: false }];
  }

  const sections: SectionDraft[] = [];
  let currentTitle = "Introduction";
  let currentBlocks: NormalizedSourceBlock[] = [];
  let currentIsHeadingBased = false;

  const flushSection = (): void => {
    if (currentBlocks.length === 0) {
      return;
    }
    sections.push({
      title: currentTitle,
      blocks: currentBlocks,
      headingBased: currentIsHeadingBased,
    });
  };

  for (const block of blocks) {
    if (block.kind === "heading") {
      flushSection();
      currentTitle = block.text.trim() || "Untitled Section";
      currentBlocks = [block];
      currentIsHeadingBased = true;
      continue;
    }

    currentBlocks.push(block);
  }

  flushSection();
  return sections;
}

function createOutlineSection(
  sourceId: string,
  draft: SectionDraft,
  order: number,
): OutlineSection {
  const firstBlock = draft.blocks[0];
  const lastBlock = draft.blocks.at(-1);

  if (!firstBlock || !lastBlock) {
    throw new Error("Outline section requires at least one source block.");
  }

  const blockIds = draft.blocks.map((block) => block.id);
  return {
    id: stableId(
      `${sourceId}-section`,
      [order, draft.title, ...blockIds].join("\u001f"),
    ),
    title: draft.title,
    order,
    blockIds,
    roughStartBlockId: firstBlock.id,
    roughEndBlockId: lastBlock.id,
    tags: detectContentTags(draft.blocks),
    confidence: calculateConfidence(draft),
  };
}

function detectContentTags(
  blocks: readonly NormalizedSourceBlock[],
): readonly SectionContentTag[] {
  const contentBlocks = blocks.filter((block) => block.kind !== "heading");
  const text = contentBlocks.map((block) => block.text).join("\n").trim();

  if (!hasMeaningfulContent(text)) {
    return ["unknown"];
  }

  const signals: SectionContentTag[] = [];
  const hasNumberedList = contentBlocks.some(
    (block) => block.kind === "list" && /^\s*\d+[.)]\s+/m.test(block.text),
  );

  if (hasNumberedList || PROCESS_PATTERN.test(text)) {
    signals.push("process");
  }
  if (EXAMPLE_PATTERN.test(text)) {
    signals.push("example");
  }
  if (CLAIM_PATTERN.test(text)) {
    signals.push("claim");
  }
  if (DEFINITION_PATTERN.test(text)) {
    signals.push("definition");
  }

  if (signals.length > 1) {
    return ["mixed"];
  }
  if (signals.length === 1) {
    return signals;
  }
  if (contentBlocks.some((block) => block.kind === "paragraph")) {
    return ["concept"];
  }

  return ["unknown"];
}

function calculateConfidence(draft: SectionDraft): number {
  const contentText = draft.blocks
    .filter((block) => block.kind !== "heading")
    .map((block) => block.text)
    .join("\n");
  const hasUsableContent = hasMeaningfulContent(contentText);

  if (draft.headingBased && hasUsableContent) {
    return 0.9;
  }
  if (!draft.headingBased && hasUsableContent) {
    return 0.7;
  }
  return 0.5;
}

function hasMeaningfulContent(text: string): boolean {
  return (text.match(/[\p{L}\p{N}]/gu) ?? []).length >= 3;
}

function stableId(prefix: string, value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}
