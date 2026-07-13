import type { GenerationProvider } from "./provider";
import {
  DEFAULT_FORBIDDEN_INSTRUCTION_PATTERNS,
  detectInstructionLeakage,
} from "./leakage-guard.js";
import { getSchemaForSectionKind } from "./schemas.js";
import { removeConsecutiveDuplicateSourceBlocks } from "./source-blocks.js";
import {
  extractCleanSourceItems,
  type SourceItem,
} from "./source-items.js";
import { toDefaultStudentVisibleSectionOutput } from "./student-visible-text.js";
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
  readonly retryGuidance?: readonly string[];
}

export type SectionValidationFailureReason =
  | "output-validation"
  | "instruction-leakage";

export class SectionValidationError extends Error {
  public readonly sectionId: string;
  public readonly stage = "stage3" as const;
  public readonly reason: SectionValidationFailureReason;
  public readonly issues: readonly string[];

  public constructor(args: {
    readonly sectionId: string;
    readonly detail: string;
    readonly reason?: SectionValidationFailureReason;
    readonly issues?: readonly string[];
  }) {
    super(
      `Stage 3 output validation failed for section "${args.sectionId}": ${args.detail}.`,
    );
    this.name = "SectionValidationError";
    this.sectionId = args.sectionId;
    this.reason = args.reason ?? "output-validation";
    this.issues = args.issues ?? [args.detail];
  }
}

const SPARSE_SOURCE_WORD_LIMIT = 8;

export class SectionProviderError extends Error {
  public readonly sectionId: string;
  public override readonly cause: unknown;

  public constructor(sectionId: string, cause: unknown) {
    super(`Stage 3 provider generation failed for section "${sectionId}".`);
    this.name = "SectionProviderError";
    this.sectionId = sectionId;
    this.cause = cause;
  }
}

const TERM_PATTERN = /[A-Za-z0-9]+(?:[-/][A-Za-z0-9]+)*/g;
const LIST_MARKER_PATTERN =
  /(?:^|\s)(?:[-*]\s+|(?:â€¢|Ã¢â‚¬Â¢)\s+|\d{1,2}[.)]\s+|[a-z]\)\s+)/i;
export async function generateSection(
  args: GenerateSectionArgs,
): Promise<SectionOutput> {
  validateArgs(args);

  const { section, plan, source, provider } = args;
  const sourceBlocks = collectSectionSourceBlocks(section, source);
  const detectedItems = extractCleanSourceItems({
    sourceSpanText: sourceBlocksToLineText(sourceBlocks),
    sectionTitle: section.title,
  });
  const schema = getSchemaForSectionKind(section.schemaKind);
  const request = {
    prompt: buildSectionPrompt(
      section,
      sourceBlocks,
      detectedItems,
      args.retryGuidance,
    ),
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
    throw new SectionProviderError(section.id, error);
  }

  const structurallyValidOutput = validateSectionOutputShape(
    providerOutput,
    section,
  );
  const guardedOutput =
    detectedItems.length >= 2
      ? applyDetectedListCoreGuard(structurallyValidOutput, detectedItems)
      : applySparseSourceCoreGuard(structurallyValidOutput, sourceBlocks);
  const normalizedOutput = toDefaultStudentVisibleSectionOutput({
    ...guardedOutput,
    title: section.title,
  } as SectionOutput);
  validateSectionInstructionLeakage(normalizedOutput, section);
  return normalizedOutput;
}

export function buildSectionPrompt(
  section: PlannedSection,
  sourceBlocks: readonly NormalizedSourceBlock[],
  detectedItems: readonly SourceItem[] = [],
  retryGuidance: readonly string[] = [],
): string {
  const sourceText = sourceBlocksToText(sourceBlocks);
  const passage = sourceBlocks
    .map(
      (block) =>
        `[Passage block ${block.id} | ${block.kind}]\n${block.text}`,
    )
    .join("\n\n");

  return [
    "Create one structured study-review card.",
    `Topic heading — ${section.title}`,
    `Card shape — ${section.schemaKind}`,
    "Learning goal:",
    `- Objective — ${section.target.objective}`,
    `- Focus — ${section.target.focus}`,
    `- Expected tags — ${section.target.expectedTags.join(", ")}`,
    `- Desired point total — ${section.target.itemCount}`,
    "- Content checks:",
    ...section.target.coverageRules.map((rule) => `  - ${rule}`),
    "PASSAGE:",
    passage,
    ...detectedItemsPromptLines(detectedItems),
    "Requirements:",
    "- Populate sourceCore.explanation and sourceCore.keyPoints from this card's passage alone.",
    "- HARD LIST RULE: when the passage is primarily an enumerated list of items or names, sourceCore.keyPoints MUST be exactly the detected passage items: one keyPoint per item, in passage order, using the passage wording verbatim.",
    "- For a list section, DO NOT summarize the list, replace it with prose, merge items, omit items, or add items.",
    "- DO NOT elaborate on any list item inside sourceCore. Copy a short or sparse list AS-IS; thinness is never a reason to elaborate.",
    "- ANTI-META EXPLANATION RULE: sourceCore.explanation must contain passage-derived factual content, be one minimal passage-derived factual sentence, or be empty for a sparse/list-only card.",
    "- sourceCore.explanation MUST NEVER describe the card itself, describe its purpose, or restate the task.",
    "- Forbidden meta-commentary includes: \"This section lists...\", \"The following are...\", \"These are the steps to...\", \"This section explains...\", and similar framing. Such text is not study content and can trigger instruction-leakage rejection.",
    "- For a list-only card, the items carry the content through sourceCore.keyPoints. Use an empty explanation.",
    "- For a heading-only or very short passage, keep sourceCore minimal and use the wording as-is with no filler.",
    "- FAKE FORMAT EXAMPLE: \"Fruit List • Apple • Banana • Cherry\" maps to explanation \"\" and keyPoints [\"Apple\",\"Banana\",\"Cherry\"].",
    "- FAKE FORMAT EXAMPLE: \"Desk Supplies • Pen • Notebook\" maps to explanation \"\" and keyPoints [\"Pen\",\"Notebook\"].",
    "- Never invent examples, scenarios, entities, technologies, impacts, consequences, definitions, or methods in any student-visible field.",
    "- Never introduce concepts in the title or sourceCore that are absent from this passage.",
    "- If the passage is only a heading, title, module label, or very short phrase, do not expand it into a general lesson.",
    "- For a heading-only or very short passage, sourceCore must be a minimal restatement of the exact passage with one key point and enrichment must be null.",
    "- For list-only passages, include only the listed items and explanations explicitly present there.",
    "- Never borrow content from other passages.",
    "- Use the exact topic heading as title.",
    "- Set enrichment to null. Outside knowledge and source-external clarifications are not part of the default reviewer.",
    "- Do not include project, repository, internal architecture, pipeline, engine, or Stay Focused references in any output field.",
    "- Return JSON conforming to the supplied object format.",
    `- plannedSectionId value — "${section.id}".`,
    `- sourceBlockIds value — ${section.sourceBlockIds.join(", ")}.`,
    ...sparseSourcePromptLines(sourceText),
    ...retryGuidancePromptLines(retryGuidance),
  ].join("\n");
}

export function collectSectionSourceBlocks(
  section: PlannedSection,
  source: NormalizedSource,
): readonly NormalizedSourceBlock[] {
  const requiredIds = new Set(section.sourceBlockIds);
  const uniqueSourceBlocks = removeConsecutiveDuplicateSourceBlocks(
    source.blocks,
  );
  const sourceBlocksById = new Map(
    uniqueSourceBlocks.map((block) => [block.id, block] as const),
  );
  const flattenedBlocksById = new Map(
    flattenSourceBlocks(uniqueSourceBlocks).map(
      (entry) => [entry.block.id, entry] as const,
    ),
  );

  for (const blockId of section.sourceBlockIds) {
    if (!sourceBlocksById.has(blockId)) {
      throw new Error(
        `Stage 3 source block ID "${blockId}" was not found for section "${section.id}".`,
      );
    }
  }

  return uniqueSourceBlocks
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

function applySparseSourceCoreGuard(
  output: SectionOutput,
  sourceBlocks: readonly NormalizedSourceBlock[],
): SectionOutput {
  const sourceText = sourceBlocksToText(sourceBlocks);
  if (!isSparseSourceText(sourceText)) {
    return output;
  }

  return {
    ...output,
    sourceCore: {
      explanation: sourceText,
      keyPoints: [sourceText],
    },
    enrichment: null,
  } as SectionOutput;
}

function applyDetectedListCoreGuard(
  output: SectionOutput,
  detectedItems: readonly SourceItem[],
): SectionOutput {
  if (detectedItems.length < 2) {
    return output;
  }

  return {
    ...output,
    sourceCore: {
      explanation: "",
      keyPoints: detectedItems.map((item) => item.text),
    },
  } as SectionOutput;
}

function detectedItemsPromptLines(
  detectedItems: readonly SourceItem[],
): readonly string[] {
  if (detectedItems.length < 2) {
    return [];
  }

  return [
    "DETECTED PASSAGE ITEMS:",
    "These entries were mechanically extracted from this card's passage. Preserve this order and wording in sourceCore.keyPoints.",
    ...detectedItems.map((item, index) => `${index + 1}. ${item.text}`),
  ];
}

function sparseSourcePromptLines(sourceText: string): readonly string[] {
  if (!isSparseSourceText(sourceText)) {
    return [];
  }

  return [
    "Sparse passage:",
    `- Exact text: ${sourceText}`,
    "- Use that exact text as the complete factual basis for sourceCore.",
    "- Do not add definitions, goals, domains, benefits, examples, risks, technologies, or methods that are not written in that exact text.",
  ];
}

function retryGuidancePromptLines(
  retryGuidance: readonly string[],
): readonly string[] {
  if (retryGuidance.length === 0) {
    return [];
  }

  return [
    "Retry guidance:",
    ...retryGuidance.map(
      (guidance) => `- ${sanitizeRetryGuidance(guidance)}`,
    ),
  ];
}

function sanitizeRetryGuidance(guidance: string): string {
  return DEFAULT_FORBIDDEN_INSTRUCTION_PATTERNS.reduce(
    (sanitized, pattern) =>
      sanitized.replace(
        new RegExp(
          pattern
            .trim()
            .split(/\s+/)
            .map(escapeRegExp)
            .join("\\s+"),
          "gi",
        ),
        "[removed forbidden wording]",
      ),
    guidance,
  );
}

function sourceBlocksToText(
  sourceBlocks: readonly NormalizedSourceBlock[],
): string {
  return sourceBlocks
    .map((block) => block.text)
    .join("\n")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceBlocksToLineText(
  sourceBlocks: readonly NormalizedSourceBlock[],
): string {
  return sourceBlocks
    .map((block) => block.text)
    .join("\n")
    .trim();
}

function isSparseSourceText(sourceText: string): boolean {
  if (
    sourceText.length === 0 ||
    hasListMarkers(sourceText) ||
    hasSentencePunctuation(sourceText)
  ) {
    return false;
  }

  return countTerms(sourceText) <= SPARSE_SOURCE_WORD_LIMIT;
}

function hasListMarkers(sourceText: string): boolean {
  return LIST_MARKER_PATTERN.test(sourceText);
}

function hasSentencePunctuation(sourceText: string): boolean {
  return /[.!?]/.test(sourceText);
}

function countTerms(sourceText: string): number {
  return [...sourceText.matchAll(TERM_PATTERN)].length;
}

export function validateSectionOutput(
  output: unknown,
  section: PlannedSection,
): SectionOutput {
  const sectionOutput = validateSectionOutputShape(output, section);
  validateSectionInstructionLeakage(sectionOutput, section);
  return sectionOutput;
}

function validateSectionOutputShape(
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
  return output as unknown as SectionOutput;
}

function validateSectionInstructionLeakage(
  sectionOutput: SectionOutput,
  section: PlannedSection,
): void {
  const leakageResult = detectInstructionLeakage(sectionOutput);
  if (!leakageResult.ok) {
    throw outputValidationError(
      section.id,
      `user-facing fields contain leaked instruction wording: ${leakageResult.fields.join(", ")}`,
      "instruction-leakage",
      leakageResult.findings.map(
        (finding) =>
          `${finding.fieldPath} matched forbidden pattern "${finding.forbiddenPattern}"`,
      ),
    );
  }
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
  readRequiredStringAllowEmpty(sourceCore, "explanation", sectionId);
  readRequiredStringArray(sourceCore, "keyPoints", sectionId);

  if (!Object.prototype.hasOwnProperty.call(output, "enrichment")) {
    throw outputValidationError(
      sectionId,
      'missing required field "enrichment"',
    );
  }

  const enrichmentValue = output["enrichment"];
  if (enrichmentValue !== null) {
    if (!isRecord(enrichmentValue)) {
      throw outputValidationError(
        sectionId,
        'missing required field "enrichment"',
      );
    }
    readRequiredString(enrichmentValue, "note", sectionId);
    readRequiredStringArray(enrichmentValue, "points", sectionId);
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

function readRequiredStringAllowEmpty(
  value: Readonly<Record<string, unknown>>,
  field: string,
  sectionId: string,
): string {
  const fieldValue = value[field];
  if (typeof fieldValue !== "string") {
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

function outputValidationError(
  sectionId: string,
  detail: string,
  reason: SectionValidationFailureReason = "output-validation",
  issues: readonly string[] = [detail],
): SectionValidationError {
  return new SectionValidationError({
    sectionId,
    detail,
    reason,
    issues,
  });
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
