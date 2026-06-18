import type { GenerationProvider } from "./provider";
import { detectInstructionLeakage } from "./leakage-guard.js";
import { getSchemaForSectionKind } from "./schemas.js";
import { flattenSourceBlocks } from "./stage1-outline.js";
import type {
  GenerationPlan,
  NormalizedSource,
  NormalizedSourceBlock,
  PlannedSection,
  SectionOutput,
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
    "You are generating one structured study-review section.",
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
    "- Populate sourceCore.explanation and sourceCore.keyPoints using ONLY the provided source excerpt for this section.",
    "- HARD LIST RULE: when the source section is primarily an enumerated list of items or names, sourceCore.keyPoints MUST be exactly the source list items: one keyPoint per source item, in source order, using the source's own wording verbatim.",
    "- For a list section, DO NOT summarize the list, replace it with prose, merge items, omit items, or add items.",
    "- DO NOT elaborate on any list item inside sourceCore. Copy a short or sparse list AS-IS; thinness is never a reason to elaborate.",
    "- If per-item explanation is genuinely useful, put it in enrichment ONLY, with one enrichment point per item that begins with the exact item wording so it is keyed to that item. Enrichment is separate from sourceCore.",
    "- ANTI-META EXPLANATION RULE: sourceCore.explanation must contain factual content drawn from the source span, be a single minimal source-derived factual sentence, or be empty when the output schema permits it for a sparse/list-only section.",
    "- sourceCore.explanation MUST NEVER describe the section itself, describe its purpose, or restate the task or instructions.",
    "- Forbidden meta-commentary includes: \"This section lists...\", \"The following are...\", \"These are the steps to...\", \"This section explains...\", and similar framing. Such text is not study content and can trigger instruction-leakage rejection.",
    "- For a list-only section, the items carry the content through sourceCore.keyPoints. Use an empty explanation when permitted; otherwise use only one minimal factual sentence copied or directly drawn from the source.",
    "- For a heading-only or very short source, keep sourceCore minimal and use the text as-is with no filler.",
    "- SOURCE: \"Impact Reduction: Communicate the Issue; Be sincere and accountable; Provide details; Understand the cause; Take steps to avoid another breach; Ensure all systems are clean; Educate employees, partners, and customers\"",
    "- CORRECT sourceCore.explanation: \"\" // or one factual source sentence; NOT a description",
    "- CORRECT sourceCore.keyPoints: [\"Communicate the Issue\",\"Be sincere and accountable\",\"Provide details\",\"Understand the cause\",\"Take steps to avoid another breach\",\"Ensure all systems are clean\",\"Educate employees, partners, and customers\"]",
    "- WRONG explanation: \"Impact Reduction focuses on decreasing the extent of adverse effects.\" // invented framing + meta",
    "- WRONG keyPoints: [\"Mitigation involves several steps\"] // replacement prose, list abandoned",
    "- SOURCE: \"Methods to Deny Service: Overwhelm quantity of traffic; Maliciously formatted packets; Zombie - Infected Host; Botnet ...(12 items)\"",
    "- CORRECT keyPoints: [all 12 source items verbatim]",
    "- WRONG keyPoints: [\"DDoS attacks flood targets with traffic\"] // invented, drops 12 items",
    "- Never invent examples, scenarios, entities, technologies, impacts, or methods inside sourceCore.",
    "- Never introduce concepts in sourceCore that are absent from this source excerpt.",
    "- Never borrow content from other source sections.",
    "- Put optional examples, outside knowledge, and clarifying context only in enrichment.",
    "- Keep enrichment structurally separate from sourceCore; never blend enrichment into sourceCore.",
    "- Do not include project, repository, internal architecture, pipeline, engine, or Stay Focused references in any output field.",
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
  const flattenedBlocksById = new Map(
    flattenSourceBlocks(source.blocks).map((entry) => [entry.block.id, entry] as const),
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
    .map(({ block, inputIndex }) => ({
      block: sliceBlockForSection(block, section, flattenedBlocksById),
      inputIndex,
    }))
    .filter((entry): entry is { readonly block: NormalizedSourceBlock; readonly inputIndex: number } =>
      entry.block !== undefined,
    )
    .sort(
      (left, right) =>
        left.block.order - right.block.order ||
        left.inputIndex - right.inputIndex,
    )
    .map(({ block }) => block);
}

function sliceBlockForSection(
  block: NormalizedSourceBlock,
  section: PlannedSection,
  flattenedBlocksById: ReadonlyMap<
    string,
    { readonly startOffset: number; readonly endOffset: number }
  >,
): NormalizedSourceBlock | undefined {
  if (section.sourceEndOffset <= section.sourceStartOffset) {
    return block;
  }

  const flattenedBlock = flattenedBlocksById.get(block.id);
  if (!flattenedBlock) {
    return block;
  }

  const startOffset = Math.max(
    flattenedBlock.startOffset,
    section.sourceStartOffset,
  );
  const endOffset = Math.min(flattenedBlock.endOffset, section.sourceEndOffset);
  if (startOffset >= endOffset) {
    return undefined;
  }

  const localStartOffset = startOffset - flattenedBlock.startOffset;
  const localEndOffset = endOffset - flattenedBlock.startOffset;
  const text = block.text.slice(localStartOffset, localEndOffset).trim();

  if (!text) {
    return undefined;
  }

  return {
    ...block,
    text,
  };
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

  validateKindSpecificFields(output, section.id);
  const sectionOutput = output as unknown as SectionOutput;
  const leakageResult = detectInstructionLeakage(sectionOutput);
  if (!leakageResult.ok) {
    throw outputValidationError(
      section.id,
      `user-facing fields contain leaked instruction wording: ${leakageResult.fields.join(", ")}`,
    );
  }

  return sectionOutput;
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
  sectionId: string,
): void {
  const sourceCore = readRequiredObject(output, "sourceCore", sectionId);
  readRequiredString(sourceCore, "explanation", sectionId);
  readRequiredStringArray(sourceCore, "keyPoints", sectionId);

  if (Object.prototype.hasOwnProperty.call(output, "enrichment")) {
    const enrichment = readRequiredObject(output, "enrichment", sectionId);
    const note = enrichment["note"];
    if (note !== undefined && (typeof note !== "string" || note.trim().length === 0)) {
      throw outputValidationError(
        sectionId,
        'missing required field "enrichment.note"',
      );
    }

    const points = enrichment["points"];
    if (
      points !== undefined &&
      (!Array.isArray(points) ||
        points.length === 0 ||
        !points.every(
          (entry) => typeof entry === "string" && entry.trim().length > 0,
        ))
    ) {
      throw outputValidationError(
        sectionId,
        'missing required field "enrichment.points"',
      );
    }
  }
}

function readRequiredObject(
  value: Readonly<Record<string, unknown>>,
  field: string,
  sectionId: string,
): Readonly<Record<string, unknown>> {
  const fieldValue = value[field];
  if (!isRecord(fieldValue)) {
    throw outputValidationError(
      sectionId,
      `missing required field "${field}"`,
    );
  }
  return fieldValue;
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
