import type {
  NormalizedSourceBlock,
  TypedEvidenceGroup,
  TypedEvidenceMember,
} from "./types.js";

export function buildTypedEvidenceGroups(args: {
  readonly sectionTitle: string;
  readonly sourceBlocks: readonly NormalizedSourceBlock[];
}): readonly TypedEvidenceGroup[] {
  const typedBlocks = args.sourceBlocks.filter(
    (block) => block.structuredBlock !== undefined,
  );
  if (
    typedBlocks.length === 0 ||
    !typedBlocks.some((block) =>
      block.kind === "code" ||
      block.kind === "formula" ||
      block.kind === "table" ||
      block.kind === "image"
    )
  ) {
    return [];
  }

  const members = typedBlocks.map(toEvidenceMember);
  const relationshipAnchorIndex = typedBlocks.findIndex(
    (block) => block.kind === "formula" || block.kind === "table",
  );
  const resultBlockIds = relationshipAnchorIndex < 0
    ? []
    : typedBlocks
        .slice(relationshipAnchorIndex + 1)
        .filter((block) => block.kind === "paragraph")
        .map((block) => block.id);
  const formulaBlockIds = typedBlocks
    .filter((block) => block.kind === "formula")
    .map((block) => block.id);
  const tableBlockIds = typedBlocks
    .filter((block) => block.kind === "table")
    .map((block) => block.id);
  const codeBlockIds = typedBlocks
    .filter((block) => block.kind === "code")
    .map((block) => block.id);

  return [{
    id: stableId(
      "evidence-group",
      [args.sectionTitle, ...typedBlocks.map((block) => block.id)].join("\u001f"),
    ),
    label: args.sectionTitle,
    sourceBlockIds: typedBlocks.map((block) => block.id),
    formulaBlockIds,
    tableBlockIds,
    codeBlockIds,
    resultBlockIds,
    members,
  }];
}

export function typedEvidenceTexts(
  groups: readonly TypedEvidenceGroup[] | undefined,
): readonly string[] {
  if (!groups) return [];
  return uniqueExact(
    groups.flatMap((group) =>
      group.members.flatMap((member) => [
        ...member.evidenceTexts,
        ...(member.tableCells?.map((cell) => cell.text) ?? []),
      ]),
    ),
  );
}

function toEvidenceMember(block: NormalizedSourceBlock): TypedEvidenceMember {
  const structured = block.structuredBlock;
  if (!structured) {
    throw new Error(`Typed evidence block "${block.id}" lost its structured contract.`);
  }
  const evidenceTexts = structured.type === "formula"
    ? uniqueExact([structured.rawText, structured.latex ?? ""])
    : [block.text];
  const tableCells = structured.type === "table"
    ? structured.rows.flatMap((row) =>
        row.cells.map((cell) => ({
          tableBlockId: structured.id,
          cellId: cell.id,
          rowIndex: cell.rowIndex,
          columnIndex: cell.columnIndex,
          rowSpan: cell.rowSpan,
          columnSpan: cell.columnSpan,
          text: cell.text,
          pageNumber: cell.provenance.pageNumber,
        })),
      )
    : undefined;
  return {
    blockId: block.id,
    kind: block.kind,
    ...(block.pageNumber !== undefined ? { pageNumber: block.pageNumber } : {}),
    ...(structured.parentId ? { parentId: structured.parentId } : {}),
    evidenceTexts,
    ...(tableCells ? { tableCells } : {}),
  };
}

function uniqueExact(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function stableId(prefix: string, value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}
