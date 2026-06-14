import type { GenerationProvider } from "./provider";
import { getSchemaForSectionKind } from "./schemas.js";
import type {
  GenerationPlan,
  NormalizedSource,
  NormalizedSourceBlock,
  PlannedSection,
  SectionOutput,
  SectionSchemaKind,
} from "./types";

export interface GenerateSectionArgs {
  readonly section: PlannedSection;
  readonly plan: GenerationPlan;
  readonly source: NormalizedSource;
  readonly provider: GenerationProvider;
  readonly model?: string;
  readonly temperature?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export async function generateSection(
  args: GenerateSectionArgs,
): Promise<SectionOutput> {
  validateArgs(args);

  const { section, plan, source, provider } = args;
  const sourceBlocks = collectSectionSourceBlocks(section, source);
  const schema = getSchemaForSectionKind(section.schemaKind);
  const request = {
    prompt: buildSectionPrompt(section, sourceBlocks),
    schema,
    model: args.model ?? "gpt-4o",
    temperature: args.temperature,
    metadata: {
      ...args.metadata,
      plannedSectionId: section.id,
      planId: plan.id,
      schemaKind: section.schemaKind,
      sourceId: source.id,
    },
  };

  let providerOutput: unknown;
  try {
    providerOutput = await provider.generate<unknown>(request);
  } catch (error) {
    throw new Error(
      `Stage 3 provider generation failed for section "${section.id}": ${errorMessage(error)}`,
    );
  }

  return validateSectionOutput(providerOutput, section);
}

export function buildSectionPrompt(
  section: PlannedSection,
  sourceBlocks: readonly NormalizedSourceBlock[],
): string {
  const sourceExcerpt = sourceBlocks
    .map(
      (block) =>
        `[Source block ${block.id} | ${block.kind}]\n${block.text}`,
    )
    .join("\n\n");

  return [
    "You are generating one structured study-review section for the Stay Focused V2 engine.",
    `Section title: ${section.title}`,
    `Schema kind: ${section.schemaKind}`,
    "Target:",
    `- Objective: ${section.target.objective}`,
    `- Focus: ${section.target.focus}`,
    `- Expected tags: ${section.target.expectedTags.join(", ")}`,
    `- Requested item count: ${section.target.itemCount}`,
    "- Coverage rules:",
    ...section.target.coverageRules.map((rule) => `  - ${rule}`),
    "Source excerpt:",
    sourceExcerpt,
    "Instructions:",
    "- Use only the provided source content.",
    "- Do not invent missing information.",
    "- Return structured output matching the provided schema exactly.",
    `- Set plannedSectionId to "${section.id}".`,
    `- Set sourceBlockIds to: ${section.sourceBlockIds.join(", ")}.`,
  ].join("\n");
}

export function collectSectionSourceBlocks(
  section: PlannedSection,
  source: NormalizedSource,
): readonly NormalizedSourceBlock[] {
  const requiredIds = new Set(section.sourceBlockIds);
  const sourceBlocksById = new Map(
    source.blocks.map((block) => [block.id, block] as const),
  );

  for (const blockId of section.sourceBlockIds) {
    if (!sourceBlocksById.has(blockId)) {
      throw new Error(
        `Stage 3 source block ID "${blockId}" was not found for section "${section.id}".`,
      );
    }
  }

  return source.blocks
    .map((block, inputIndex) => ({ block, inputIndex }))
    .filter(({ block }) => requiredIds.has(block.id))
    .sort(
      (left, right) =>
        left.block.order - right.block.order ||
        left.inputIndex - right.inputIndex,
    )
    .map(({ block }) => block);
}

export function validateSectionOutput(
  output: unknown,
  section: PlannedSection,
): SectionOutput {
  if (!isRecord(output)) {
    throw outputValidationError(section.id, "provider output must be an object");
  }

  const kind = readRequiredString(output, "kind", section.id);
  if (kind !== section.schemaKind) {
    throw outputValidationError(
      section.id,
      `expected kind "${section.schemaKind}" but received "${kind}"`,
    );
  }

  readRequiredString(output, "id", section.id);
  const plannedSectionId = readRequiredString(
    output,
    "plannedSectionId",
    section.id,
  );
  if (plannedSectionId !== section.id) {
    throw outputValidationError(
      section.id,
      `plannedSectionId must be "${section.id}"`,
    );
  }
  readRequiredString(output, "title", section.id);
  const sourceBlockIds = readRequiredStringArray(
    output,
    "sourceBlockIds",
    section.id,
  );
  if (!arraysEqual(sourceBlockIds, section.sourceBlockIds)) {
    throw outputValidationError(
      section.id,
      "sourceBlockIds must match the planned section source block IDs",
    );
  }

  validateKindSpecificFields(output, section.schemaKind, section.id);
  return output as unknown as SectionOutput;
}

function validateArgs(args: GenerateSectionArgs): void {
  if (!args?.section || typeof args.section !== "object") {
    throw new Error("Stage 3 generation requires a planned section.");
  }
  if (!args.plan || typeof args.plan !== "object") {
    throw new Error("Stage 3 generation requires a generation plan.");
  }
  if (!args.source || typeof args.source !== "object") {
    throw new Error("Stage 3 generation requires a normalized source.");
  }
  if (!args.provider || typeof args.provider.generate !== "function") {
    throw new Error("Stage 3 generation requires a generation provider.");
  }
  if (!args.plan.sections.some((section) => section.id === args.section.id)) {
    throw new Error(
      `Planned section "${args.section.id}" is not part of generation plan "${args.plan.id}".`,
    );
  }
}

function validateKindSpecificFields(
  output: Readonly<Record<string, unknown>>,
  schemaKind: SectionSchemaKind,
  sectionId: string,
): void {
  switch (schemaKind) {
    case "concept-card":
      readRequiredString(output, "explanation", sectionId);
      readRequiredStringArray(output, "keyPoints", sectionId);
      return;
    case "process-step":
      readRequiredStringArray(output, "steps", sectionId);
      readRequiredString(output, "summary", sectionId);
      return;
    case "example-card":
      readRequiredString(output, "scenario", sectionId);
      readRequiredString(output, "explanation", sectionId);
      readRequiredString(output, "takeaway", sectionId);
      return;
    case "claim-card":
      readRequiredString(output, "claim", sectionId);
      readRequiredString(output, "support", sectionId);
      readRequiredString(output, "reasoning", sectionId);
      return;
  }
}

function readRequiredString(
  value: Readonly<Record<string, unknown>>,
  field: string,
  sectionId: string,
): string {
  const fieldValue = value[field];
  if (typeof fieldValue !== "string" || fieldValue.trim().length === 0) {
    throw outputValidationError(
      sectionId,
      `missing required field "${field}"`,
    );
  }
  return fieldValue;
}

function readRequiredStringArray(
  value: Readonly<Record<string, unknown>>,
  field: string,
  sectionId: string,
): readonly string[] {
  const fieldValue = value[field];
  if (
    !Array.isArray(fieldValue) ||
    fieldValue.length === 0 ||
    !fieldValue.every(
      (entry) => typeof entry === "string" && entry.trim().length > 0,
    )
  ) {
    throw outputValidationError(
      sectionId,
      `missing required field "${field}"`,
    );
  }
  return fieldValue;
}

function outputValidationError(sectionId: string, detail: string): Error {
  return new Error(
    `Stage 3 output validation failed for section "${sectionId}": ${detail}.`,
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function arraysEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
