import type {
  GenerationPlan,
  NormalizedSource,
  PlannedSection,
  PlannedSectionTarget,
  SectionSchemaKind,
  SourceOutline,
  SourceOutlineSection,
} from "./types";

const COVERAGE_RULES: Readonly<
  Record<SectionSchemaKind, readonly string[]>
> = {
  "concept-card": [
    "Explain the central concept concisely.",
    "Include the key points supported by the required source blocks.",
  ],
  "process-step": [
    "Preserve the logical order of the process.",
    "Explain each required step using the source material.",
  ],
  "example-card": [
    "Provide a concrete example or scenario.",
    "Explain how the example connects to the source material.",
  ],
  "claim-card": [
    "State the central claim clearly.",
    "Support the claim with evidence or reasoning from the source material.",
  ],
};

export function buildGenerationPlan(
  outline: SourceOutline,
  source: NormalizedSource,
): GenerationPlan {
  validateInputs(outline, source);

  const sourceBlockIds = new Set(source.blocks.map((block) => block.id));
  const sourceBlockById = new Map(
    source.blocks.map((block) => [block.id, block] as const),
  );
  const sections = outline.sections.map((section) => {
    validateSectionBlockIds(section, sourceBlockIds);
    return createPlannedSection(section, sourceBlockById);
  });

  return {
    id: stableId(
      "plan",
      [outline.id, source.id, ...sections.map((section) => section.id)].join(
        "\u001f",
      ),
    ),
    sourceId: source.id,
    outlineId: outline.id,
    title: outline.title,
    sections,
    metadata: {
      sectionCount: sections.length,
      sourceBlockCount: source.blocks.length,
    },
    sourceOutline: outline,
  };
}

function validateInputs(
  outline: SourceOutline,
  source: NormalizedSource,
): void {
  if (!outline || typeof outline !== "object" || Array.isArray(outline)) {
    throw new Error("Generation planning requires an outline.");
  }
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error("Generation planning requires a normalized source.");
  }
  if (!Array.isArray(outline.sections)) {
    throw new Error("Generation planning requires outline sections.");
  }
  if (source.blocks.length > 0 && outline.sections.length === 0) {
    throw new Error(
      "Generation planning requires at least one outline section.",
    );
  }
  if (outline.sourceId !== source.id) {
    throw new Error(
      `Generation planning source mismatch: outline source ID "${outline.sourceId}" does not match source ID "${source.id}".`,
    );
  }
}

function validateSectionBlockIds(
  section: SourceOutlineSection,
  sourceBlockIds: ReadonlySet<string>,
): void {
  const sectionBlockIds = blockIdsForSection(section);
  if (sectionBlockIds.length === 0) {
    throw new Error(
      `Outline section "${section.id}" must reference at least one source block.`,
    );
  }

  for (const blockId of sectionBlockIds) {
    if (!sourceBlockIds.has(blockId)) {
      throw new Error(
        `Outline section "${section.id}" references missing source block ID "${blockId}".`,
      );
    }
  }
}

function createPlannedSection(
  section: SourceOutlineSection,
  sourceBlockById: ReadonlyMap<string, NormalizedSource["blocks"][number]>,
): PlannedSection {
  const schemaKind = selectSchemaKind(section);
  const sourceBlockIds = blockIdsForSection(section);
  const tokenWeight = tokenWeightForSection(section, sourceBlockIds, sourceBlockById);
  const targetItemCount = targetItemCountFor(tokenWeight);

  return {
    id: stableId(
      `${section.id}-planned`,
      [section.order, schemaKind, ...sourceBlockIds].join("\u001f"),
    ),
    sourceSectionId: section.id,
    title: section.title,
    order: section.order,
    schemaKind,
    target: createTarget(section, schemaKind, sourceBlockIds, targetItemCount),
    sourceBlockIds,
    tokenWeight,
    targetItemCount,
    sourceStartOffset: finiteNumberOr(section.startOffset, 0),
    sourceEndOffset: finiteNumberOr(section.endOffset, 0),
  };
}

function selectSchemaKind(section: SourceOutlineSection): SectionSchemaKind {
  if (section.tags.includes("process")) {
    return "process-step";
  }
  if (section.tags.includes("example")) {
    return "example-card";
  }
  if (section.tags.includes("claim")) {
    return "claim-card";
  }
  return "concept-card";
}

function createTarget(
  section: SourceOutlineSection,
  schemaKind: SectionSchemaKind,
  sourceBlockIds: readonly string[],
  targetItemCount: number,
): PlannedSectionTarget {
  return {
    objective: objectiveFor(schemaKind, section.title),
    itemCount: targetItemCount,
    focus: section.title,
    requiredSourceBlockIds: [...sourceBlockIds],
    expectedTags: [...section.tags],
    coverageRules: COVERAGE_RULES[schemaKind],
  };
}

function objectiveFor(schemaKind: SectionSchemaKind, title: string): string {
  switch (schemaKind) {
    case "process-step":
      return `Present "${title}" as ordered steps with clear explanations.`;
    case "example-card":
      return `Provide a concrete example or scenario for "${title}" and explain it.`;
    case "claim-card":
      return `State the central claim for "${title}" and support it with evidence or reasoning.`;
    case "concept-card":
      return `Explain "${title}" concisely with its key points.`;
  }
}

function blockIdsForSection(section: SourceOutlineSection): readonly string[] {
  const sourceBlockIds = Array.isArray(section.sourceBlockIds)
    ? section.sourceBlockIds
    : [];
  const blockIds = Array.isArray(section.blockIds) ? section.blockIds : [];
  return [...(sourceBlockIds.length > 0 ? sourceBlockIds : blockIds)];
}

function tokenWeightForSection(
  section: SourceOutlineSection,
  sourceBlockIds: readonly string[],
  sourceBlockById: ReadonlyMap<string, NormalizedSource["blocks"][number]>,
): number {
  if (Number.isFinite(section.tokenWeight) && section.tokenWeight > 0) {
    return section.tokenWeight;
  }

  const text = sourceBlockIds
    .map((blockId) => sourceBlockById.get(blockId)?.text ?? "")
    .join("\n");
  return countTokens(text);
}

function targetItemCountFor(tokenWeight: number): number {
  if (tokenWeight <= 80) {
    return 1;
  }
  if (tokenWeight <= 180) {
    return 2;
  }
  if (tokenWeight <= 320) {
    return 3;
  }
  if (tokenWeight <= 520) {
    return 4;
  }
  return 5;
}

function finiteNumberOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function countTokens(text: string): number {
  return (text.match(/[\p{L}\p{N}]+/gu) ?? []).length;
}

function stableId(prefix: string, value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}
