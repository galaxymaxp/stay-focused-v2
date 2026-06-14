import type {
  GenerationPlan,
  NormalizedSource,
  OutlineSection,
  PlannedSection,
  PlannedSectionTarget,
  SectionSchemaKind,
  SourceOutline,
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
  const sections = outline.sections.map((section) => {
    validateSectionBlockIds(section, sourceBlockIds);
    return createPlannedSection(section);
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
  if (!Array.isArray(outline.sections) || outline.sections.length === 0) {
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
  section: OutlineSection,
  sourceBlockIds: ReadonlySet<string>,
): void {
  if (!Array.isArray(section.blockIds) || section.blockIds.length === 0) {
    throw new Error(
      `Outline section "${section.id}" must reference at least one source block.`,
    );
  }

  for (const blockId of section.blockIds) {
    if (!sourceBlockIds.has(blockId)) {
      throw new Error(
        `Outline section "${section.id}" references missing source block ID "${blockId}".`,
      );
    }
  }
}

function createPlannedSection(section: OutlineSection): PlannedSection {
  const schemaKind = selectSchemaKind(section);
  const sourceBlockIds = [...section.blockIds];

  return {
    id: stableId(
      `${section.id}-planned`,
      [section.order, schemaKind, ...sourceBlockIds].join("\u001f"),
    ),
    sourceSectionId: section.id,
    title: section.title,
    order: section.order,
    schemaKind,
    target: createTarget(section, schemaKind, sourceBlockIds),
    sourceBlockIds,
  };
}

function selectSchemaKind(section: OutlineSection): SectionSchemaKind {
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
  section: OutlineSection,
  schemaKind: SectionSchemaKind,
  sourceBlockIds: readonly string[],
): PlannedSectionTarget {
  return {
    objective: objectiveFor(schemaKind, section.title),
    itemCount: Math.min(5, Math.max(1, sourceBlockIds.length)),
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

function stableId(prefix: string, value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}
