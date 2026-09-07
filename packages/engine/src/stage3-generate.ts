import type { GenerationProvider } from "./provider";
import {
  DEFAULT_FORBIDDEN_INSTRUCTION_PATTERNS,
  detectInstructionLeakage,
} from "./leakage-guard.js";
import { createExplanationBatchSchema, getSchemaForSectionKind } from "./schemas.js";
import { serializeSemanticUnits } from "./semantic-structure.js";
import { removeConsecutiveDuplicateSourceBlocks } from "./source-blocks.js";
import {
  extractCleanSourceItems,
  type SourceItem,
} from "./source-items.js";
import { toDefaultStudentVisibleSectionOutput } from "./student-visible-text.js";
import { flattenSourceBlocks } from "./stage1-outline.js";
import { serializeRecoveryEvidence } from "./recovery-evidence.js";
import {
  requiredEvidenceSourceIsAvailable,
  serializeRequiredEvidenceTarget,
} from "./required-evidence.js";
import {
  filterReviewableText,
  isInstructionalNoiseText,
  reviewableSourceBlocks,
} from "./review-content.js";
import { explanationHasUsefulForm } from "./reviewer-usefulness.js";
import {
  isLocallyExplanatoryText,
  reviewerDispositionFor,
} from "./reviewer-section-support.js";
import {
  assembleDeterministicSectionEvidence,
  attachGeneratedExplanation,
} from "./reviewer-evidence-assembly.js";
import { explanationEvidenceFor } from "./reviewer-explanation-evidence.js";
import type {
  GenerationPlan,
  NormalizedSource,
  NormalizedSourceBlock,
  PlannedSection,
  SectionOutput,
  RequiredEvidenceTarget,
} from "./types";

export interface SectionRepairContext {
  readonly previousCandidate?: SectionOutput;
  readonly missingRequiredEvidence: readonly RequiredEvidenceTarget[];
  readonly acceptedContent: readonly string[];
  readonly usefulnessDiagnostics?: readonly string[];
}

export interface GenerateSectionArgs {
  readonly section: PlannedSection;
  readonly plan: GenerationPlan;
  readonly source: NormalizedSource;
  readonly provider: GenerationProvider;
  readonly model?: string;
  readonly temperature?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly retryGuidance?: readonly string[];
  readonly repairContext?: SectionRepairContext;
  /** Compatibility path for pre-deterministic evaluation fixtures only. */
  readonly legacyFullSectionGeneration?: boolean;
}

export type SectionValidationFailureReason =
  | "output-validation"
  | "instruction-leakage"
  | "explanation-validation"
  | "required-evidence-unavailable";

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
const MAX_EXPLANATION_BATCH_SECTIONS = 6;
const MAX_EXPLANATION_BATCH_CHARACTERS = 36_000;
const MAX_SECTION_EXPLANATION_SUPPORT_CHARACTERS = 10_000;

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
  if (args.section.requiredEvidence === undefined || args.legacyFullSectionGeneration) {
    return generateLegacySection(args);
  }
  const result = await generateSections({
    sections: [args.section],
    plan: args.plan,
    source: args.source,
    provider: args.provider,
    model: args.model,
    temperature: args.temperature,
    metadata: args.metadata,
  });
  const output = result.outputs[0];
  if (output && !result.failedSectionIds.includes(args.section.id)) return output;
  const failure = result.validationFailures.find(
    (candidate) => candidate.sectionId === args.section.id,
  );
  if (failure) throw failure;
  throw new SectionProviderError(args.section.id, result.providerErrors[0]);
}

async function generateLegacySection(args: GenerateSectionArgs): Promise<SectionOutput> {
  const { section, plan, source, provider } = args;
  const sourceBlocks = collectSectionSourceBlocks(section, source);
  const detectedItems = extractCleanSourceItems({
    sourceSpanText: sourceBlocksToLineText(sourceBlocks),
    sectionTitle: section.title,
  });
  const request = {
    prompt: buildSectionPrompt(
      section,
      sourceBlocks,
      detectedItems,
      args.retryGuidance,
      args.repairContext,
    ),
    schema: getSchemaForSectionKind(section.schemaKind),
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
  const structurallyValidOutput = validateSectionOutputShape(providerOutput, section);
  const guardedOutput = applySemanticCoreGuard(
    structurallyValidOutput,
    section,
    sourceBlocks,
    detectedItems,
  );
  const normalizedOutput = toDefaultStudentVisibleSectionOutput({
    ...guardedOutput,
    title: section.title,
  } as SectionOutput);
  validateSectionInstructionLeakage(normalizedOutput, section);
  return normalizedOutput;
}

export interface GenerateSectionsArgs {
  readonly sections: readonly PlannedSection[];
  readonly plan: GenerationPlan;
  readonly source: NormalizedSource;
  readonly provider: GenerationProvider;
  readonly model?: string;
  readonly temperature?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface GenerateSectionsResult {
  readonly outputs: readonly SectionOutput[];
  readonly failedSectionIds: readonly string[];
  readonly validationFailures: readonly SectionValidationError[];
  readonly providerErrors: readonly unknown[];
  readonly batchSectionIds: readonly (readonly string[])[];
  readonly deterministicAssemblyDurationMs: number;
}

export async function generateSections(
  args: GenerateSectionsArgs,
): Promise<GenerateSectionsResult> {
  if (!Array.isArray(args.sections) || args.sections.length === 0) {
    return {
      outputs: [],
      failedSectionIds: [],
      validationFailures: [],
      providerErrors: [],
      batchSectionIds: [],
      deterministicAssemblyDurationMs: 0,
    };
  }

  const deterministicStartedAt = Date.now();
  const deterministic = new Map<string, SectionOutput>();
  const validationFailures: SectionValidationError[] = [];
  for (const section of args.sections) {
    const sourceBlocks = collectSectionSourceBlocks(section, args.source);
    try {
      deterministic.set(
        section.id,
        assembleDeterministicSectionEvidence({ section, sourceBlocks }),
      );
    } catch (error) {
      validationFailures.push(new SectionValidationError({
        sectionId: section.id,
        reason: "required-evidence-unavailable",
        detail: error instanceof Error ? error.message : "required evidence is unavailable",
      }));
    }
  }
  const deterministicAssemblyDurationMs = Date.now() - deterministicStartedAt;

  const standalone = args.sections.filter(
    (section) => reviewerDispositionFor(section) === "standalone" && deterministic.has(section.id),
  );
  const supportBySectionId = new Map(
    standalone.map((section) => [
      section.id,
      explanationSupportFor(section, collectSectionSourceBlocks(section, args.source)),
    ] as const),
  );
  const batches = createExplanationBatches(standalone, supportBySectionId);
  const explanations = new Map<string, string>();
  const failedSectionIds = new Set(validationFailures.map((failure) => failure.sectionId));
  const providerErrors: unknown[] = [];

  for (const batch of batches) {
    const sectionIds = batch.map((section) => section.id);
    let providerOutput: unknown;
    try {
      providerOutput = await args.provider.generate<unknown>({
        prompt: buildExplanationBatchPrompt(batch, supportBySectionId, args.metadata?.retryAttempt),
        schema: createExplanationBatchSchema(sectionIds),
        model: args.model ?? "gpt-4o",
        temperature: args.temperature,
        metadata: {
          ...args.metadata,
          planId: args.plan.id,
          sourceId: args.source.id,
          explanationBatchSectionIds: sectionIds,
          sectionCount: sectionIds.length,
          providerResponsibility: "explanation-only",
          ...(sectionIds.length === 1
            ? {
                plannedSectionId: sectionIds[0],
                schemaKind: batch[0]?.schemaKind,
              }
            : {}),
        },
      });
    } catch (error) {
      providerErrors.push(error);
      sectionIds.forEach((sectionId) => failedSectionIds.add(sectionId));
      continue;
    }

    const parsed = parseExplanationBatch(providerOutput, batch);
    for (const section of batch) {
      const explanation = parsed.get(section.id);
      if (explanation === undefined) {
        failedSectionIds.add(section.id);
        validationFailures.push(new SectionValidationError({
          sectionId: section.id,
          reason: "explanation-validation",
          detail: "provider response omitted the required explanation entry",
        }));
        continue;
      }
      explanations.set(section.id, explanation);
    }
  }

  const outputs = args.sections.flatMap((section) => {
    const base = deterministic.get(section.id);
    if (!base) return [];
    const explanation = explanations.get(section.id);
    return [explanation === undefined ? base : attachGeneratedExplanation(base, explanation)];
  });

  return {
    outputs,
    failedSectionIds: [...failedSectionIds],
    validationFailures,
    providerErrors,
    batchSectionIds: batches.map((batch) => batch.map((section) => section.id)),
    deterministicAssemblyDurationMs,
  };
}

function createExplanationBatches(
  sections: readonly PlannedSection[],
  supportBySectionId: ReadonlyMap<string, string>,
): readonly (readonly PlannedSection[])[] {
  const batches: PlannedSection[][] = [];
  let current: PlannedSection[] = [];
  let currentCharacters = 0;
  for (const section of sections) {
    const sectionCharacters = (supportBySectionId.get(section.id)?.length ?? 0) +
      section.title.length + 200;
    if (
      current.length > 0 &&
      (current.length >= MAX_EXPLANATION_BATCH_SECTIONS ||
        currentCharacters + sectionCharacters > MAX_EXPLANATION_BATCH_CHARACTERS)
    ) {
      batches.push(current);
      current = [];
      currentCharacters = 0;
    }
    current.push(section);
    currentCharacters += sectionCharacters;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

function explanationSupportFor(
  section: PlannedSection,
  sourceBlocks: readonly NormalizedSourceBlock[],
): string {
  const shaped = sourceBlocks.some(block => block.structuredBlock)
    ? explanationEvidenceFor(section, sourceBlocks) : [];
  const selected = shaped.length > 0 ? shaped : reviewableSourceBlocks(sourceBlocks)
    .filter(block => !["heading", "image", "code", "table", "formula"].includes(block.kind))
    .map(block => ({blockId: block.id, text: filterReviewableText(block.text, {block})}));
  const rows: string[] = [];
  let characterCount = 0;
  for (const block of selected) {
    const text = block.text;
    if (!text) continue;
    if (rows.length > 0 && characterCount + text.length > MAX_SECTION_EXPLANATION_SUPPORT_CHARACTERS) {
      break;
    }
    rows.push(`[source ${block.blockId}] ${text}`);
    characterCount += text.length;
  }
  if (rows.length === 0) {
    throw new SectionValidationError({
      sectionId: section.id,
      reason: "required-evidence-unavailable",
      detail: "standalone section has no approved local explanation support",
    });
  }
  return rows.join("\n");
}

function buildExplanationBatchPrompt(
  sections: readonly PlannedSection[],
  supportBySectionId: ReadonlyMap<string, string>,
  retryAttempt: unknown,
): string {
  return [
    "Write one concise study explanation for each isolated section below.",
    "Return only the requested section IDs and explanation strings.",
    "The engine has already assembled every required fact and typed item deterministically.",
    "Return explanatory prose only; the engine retains the complete required evidence separately.",
    "Use only the approved local evidence inside that section's boundary.",
    "Grounding requires local source vocabulary: do not introduce synonyms, new terminology, or unstated relationships even when they seem equivalent.",
    "Reuse ONE short explanatory sentence from that section's evidence. Preserve source wording, including source errors; do not paraphrase, combine separate source points, substitute words, or add transitions.",
    "If the source is a predicate fragment (is..., may..., reports...), use the local section title as its subject. This is the only permitted subject completion; do not add a new claim or correct the source.",
    "If the source sentence already has a subject, do not prepend the title. Do not repeat a subject or add a second title inside the sentence.",
    "Choose sentences that explain the concept, not presentation instructions, metadata, code, or a list of examples. Do not copy the full evidence passage.",
    "Do not borrow evidence between sections or add outside knowledge.",
    "Do not invent examples, issue learner instructions, reproduce large passages, use code as the explanation, or merely repeat the title.",
    "Each explanation must be one short, complete, source-grounded sentence. Do not use remember that, take note, students should, or you should. Required code, formulas, results and tables are displayed separately; do not recite them in prose.",
    ...(typeof retryAttempt === "number"
      ? ["This is a bounded explanation-only repair. Correct only the explanation quality or grounding defect."]
      : []),
    "SECTIONS:",
    ...sections.flatMap((section) => [
      `BEGIN SECTION ${JSON.stringify(section.id)}`,
      `TITLE: ${section.title}`,
      "APPROVED LOCAL EXPLANATION EVIDENCE:",
      supportBySectionId.get(section.id) ?? "",
      `END SECTION ${JSON.stringify(section.id)}`,
    ]),
  ].join("\n");
}

function parseExplanationBatch(
  value: unknown,
  sections: readonly PlannedSection[],
): ReadonlyMap<string, string> {
  const expected = new Set(sections.map((section) => section.id));
  const parsed = new Map<string, string>();
  if (isRecord(value) && Array.isArray(value["explanations"])) {
    for (const entry of value["explanations"]) {
      if (!isRecord(entry)) continue;
      const sectionId = entry["sectionId"];
      const explanation = entry["explanation"];
      if (
        typeof sectionId !== "string" || !expected.has(sectionId) ||
        typeof explanation !== "string" || !explanation.trim() ||
        parsed.has(sectionId)
      ) continue;
      parsed.set(sectionId, explanation.trim());
    }
    return parsed;
  }

  // Compatibility for single-section provider doubles. Production OpenAI
  // receives the minimal ExplanationBatch schema above; factual fields from a
  // legacy-shaped double are ignored even when present.
  const only = sections[0];
  if (sections.length === 1 && only && isRecord(value)) {
    const direct = value["explanation"];
    const core = isRecord(value["sourceCore"]) ? value["sourceCore"] : undefined;
    const legacy = core?.["explanation"];
    const explanation = typeof direct === "string" ? direct : legacy;
    if (typeof explanation === "string" && explanation.trim()) {
      parsed.set(only.id, explanation.trim());
    }
  }
  return parsed;
}

export function createSourceRepresentedSectionOutput(args: {
  readonly section: PlannedSection;
  readonly sourceBlocks: readonly NormalizedSourceBlock[];
}): SectionOutput | undefined {
  const disposition = reviewerDispositionFor(args.section);
  if (disposition === "standalone") return undefined;
  return assembleDeterministicSectionEvidence(args);
}

function semanticSourceRepresentationTexts(section: PlannedSection): readonly string[] {
  const semanticRows = (section.semanticPlan?.units ?? []).map((unit) => {
    if (unit.items.length === 0) return unit.label;
    return unit.kind === "mapping"
      ? [unit.label, ...unit.items].join(" | ")
      : `${unit.label}: ${unit.items.join("; ")}`;
  });
  return uniqueExactText(
    semanticRows.length > 0
      ? semanticRows
      : (section.requiredEvidence ?? []).flatMap((target) => target.evidenceTexts),
  );
}

function typedSourceRepresentationTexts(
  sourceBlocks: readonly NormalizedSourceBlock[],
): readonly string[] {
  return uniqueExactText(sourceBlocks.flatMap((block) => {
    const structured = block.structuredBlock;
    if (structured?.type === "table") {
      return [
        block.text,
        ...structured.rows.map((row) => row.cells.map((cell) => cell.text).join(" | ")),
      ];
    }
    if (structured?.type === "formula") return [block.text, structured.rawText];
    if (structured?.type === "code") return [block.text, structured.text];
    return block.kind === "code" || block.kind === "formula" || block.kind === "table"
      ? [block.text]
      : [];
  }));
}

function uniqueExactText(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function stableSectionRepresentationId(
  sectionId: string,
  disposition: string,
  keyPoints: readonly string[],
): string {
  const value = [sectionId, disposition, ...keyPoints].join("\u001f");
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `source-representation-${(hash >>> 0).toString(36)}`;
}

export function buildSectionPrompt(
  section: PlannedSection,
  sourceBlocks: readonly NormalizedSourceBlock[],
  detectedItems: readonly SourceItem[] = [],
  retryGuidance: readonly string[] = [],
  repairContext?: SectionRepairContext,
): string {
  const sourceText = sourceBlocksToText(sourceBlocks);
  const targetedEvidenceRepair = (repairContext?.missingRequiredEvidence.length ?? 0) > 0;
  const activeRequiredEvidence = targetedEvidenceRepair
    ? repairContext?.missingRequiredEvidence ?? []
    : section.requiredEvidence;
  const repairEvidenceByBlockId = new Map<string, string[]>();
  for (const target of activeRequiredEvidence ?? []) {
    for (const blockId of target.sourceBlockIds) {
      repairEvidenceByBlockId.set(blockId, [
        ...(repairEvidenceByBlockId.get(blockId) ?? []),
        ...target.evidenceTexts,
      ]);
    }
  }
  const passage = sourceBlocks
    .map(
      (block) => {
        const text = targetedEvidenceRepair
          ? [...new Set(repairEvidenceByBlockId.get(block.id) ?? [])].join("\n")
          : block.text;
        return `[Passage block ${block.id} | ${block.kind}${block.pageNumber !== undefined ? ` | page ${block.pageNumber}` : ""}]\n${text}`;
      },
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
    ...(section.requiredEvidence !== undefined
      ? [targetedEvidenceRepair
          ? `- Missing required evidence targets in this bounded repair — ${activeRequiredEvidence?.length ?? 0}.`
          : `- Required evidence targets — ${section.requiredEvidence.length}; every target is mandatory, with no smaller point-count quota.`]
      : [`- Desired point total — ${section.target.itemCount}`]),
    "- Content checks:",
    ...section.target.coverageRules.map((rule) => `  - ${rule}`),
    ...(targetedEvidenceRepair ? [] : semanticPlanPromptLines(section)),
    ...requiredEvidencePromptLines(section, activeRequiredEvidence),
    ...structuredEvidencePromptLines(section, targetedEvidenceRepair ? [] : sourceBlocks),
    "PASSAGE:",
    passage,
    ...(targetedEvidenceRepair ? [] : detectedItemsPromptLines(detectedItems)),
    "Requirements:",
    `- Copy the complete section identity, not only cited/required evidence IDs: ${JSON.stringify({ plannedSectionId: section.id, sourceBlockIds: section.sourceBlockIds })}.`,
    "- Populate sourceCore.explanation and sourceCore.keyPoints from this card's passage alone.",
    ...(section.requiredEvidence !== undefined
      ? [
          targetedEvidenceRepair
            ? "- Represent every REQUIRED EVIDENCE target in this repair slice. Already accepted targets are preserved by deterministic merge."
            : "- Represent every REQUIRED EVIDENCE target. Required targets may be concise, but they must not be silently dropped.",
          "- Supporting evidence is optional. Do not copy it merely to fill key points.",
          "- Preserve supported relationships instead of flattening related items into peers.",
        ]
      : [
          "- Preserve every detected passage item, but preserve supported relationships instead of flattening related items into peers.",
        ]),
    "- Keep one coherent source idea per key point. Never fuse adjacent siblings or a heading with the next item.",
    "- For definitions, categories, examples, and procedures, keep related content attached using the supplied semantic plan.",
    "- sourceCore.explanation must be concise, complete prose that adds source-supported meaning beyond the title.",
    "- Code, a formula, a table row, a heading fragment, or a learner command cannot substitute for the explanation. Keep required typed evidence in keyPoints.",
    "- sourceCore.explanation MUST NEVER describe the card itself, describe its purpose, or restate the task.",
    "- Forbidden meta-commentary includes: \"This section lists...\", \"The following are...\", \"These are the steps to...\", \"This section explains...\", and similar framing. Such text is not study content and can trigger instruction-leakage rejection.",
    "- List-heavy content may still have a useful explanation. Do not suppress it merely because key points are present.",
    "- Keep key points concise and atomic. Summarize repeated prose; do not paste whole paragraphs, slide transcripts, classroom commands, or every optional example.",
    "- Omit directions addressed to the learner, activity prompts, presentation navigation, and classroom instructions. Preserve any separate declarative concept evidence from those blocks.",
    "- Formula, code, and compact table evidence may be longer than prose when it is a REQUIRED EVIDENCE target.",
    "- For a heading-only or very short passage, keep sourceCore minimal and use the wording as-is with no filler.",
    "- FAKE FORMAT EXAMPLE: \"Fruit List • Apple • Banana • Cherry\" maps to explanation \"\" and keyPoints [\"Apple\",\"Banana\",\"Cherry\"].",
    "- FAKE FORMAT EXAMPLE: \"Desk Supplies • Pen • Notebook\" maps to explanation \"\" and keyPoints [\"Pen\",\"Notebook\"].",
    "- Never invent examples, scenarios, entities, technologies, impacts, consequences, definitions, or methods in any student-visible field.",
    "- Never introduce concepts in the title or sourceCore that are absent from this passage.",
    "- If the passage is only a heading, title, module label, or very short phrase, do not expand it into a general lesson.",
    "- For a heading-only or very short passage, sourceCore must be a minimal restatement of the exact passage with one key point and enrichment must be null.",
    "- For list-only passages, include only the listed items and explanations explicitly present there.",
    "- Numbering alone does not make a conceptual enumeration into a procedure.",
    "- Never borrow content from other passages.",
    "- Use the exact topic heading as title.",
    "- Set enrichment to null. Outside knowledge and source-external clarifications are not part of the default reviewer.",
    "- Do not include project, repository, internal architecture, pipeline, engine, or Stay Focused references in any output field.",
    "- Return JSON conforming to the supplied object format.",
    `- plannedSectionId value — "${section.id}".`,
    `- sourceBlockIds value — ${section.sourceBlockIds.join(", ")}.`,
    ...sparseSourcePromptLines(sourceText),
    ...repairContextPromptLines(repairContext),
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
  // Page-aware Stage 1 boundaries already identify whole presentation blocks.
  // Character offsets are only needed when several inline sections share one
  // non-paged block; applying them again to a later page truncates continuation
  // material because the outline's offsets are relative to its filtered view.
  if (block.pageNumber !== undefined) {
    return block;
  }
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
  section: PlannedSection,
): SectionOutput {
  const sourceText = sourceBlocksToText(sourceBlocks);
  if (!isSparseSourceText(sourceText)) {
    return output;
  }

  if (section.requiredEvidence === undefined) {
    return {
      ...output,
      sourceCore: { explanation: sourceText, keyPoints: [sourceText] },
      enrichment: null,
    } as SectionOutput;
  }
  const headingOnly = sourceBlocks.every((block) => block.kind === "heading");

  return {
    ...output,
    sourceCore: {
      explanation: "",
      keyPoints: headingOnly ? [] : [sourceText],
    },
    enrichment: null,
  } as SectionOutput;
}

function structuredEvidencePromptLines(
  section: PlannedSection,
  sourceBlocks: readonly NormalizedSourceBlock[],
): readonly string[] {
  const typedGroups = section.evidenceGroups ?? [];
  const requiredBlockIds = new Set(
    (section.requiredEvidence ?? []).flatMap((target) => target.sourceBlockIds),
  );
  const typedLines = typedGroups.flatMap((group) => [
    `[evidence-group ${group.id} | concept ${group.label}]`,
    ...group.members.flatMap((member) => {
      if (member.kind === "formula") {
        return member.evidenceTexts.map((text, index) =>
          `[${requiredBlockIds.has(member.blockId) ? "required" : "supporting"} formula ${member.blockId} | ${index === 0 ? "source" : "parser-representation"}] ${text}`
        );
      }
      if (member.kind === "table") {
        return member.tableCells?.map((cell) =>
          `[${requiredBlockIds.has(member.blockId) ? "required" : "supporting"} table-cell ${cell.tableBlockId} | row ${cell.rowIndex} | column ${cell.columnIndex} | cell ${cell.cellId}] ${cell.text}`
        ) ?? [];
      }
      return member.evidenceTexts.map((text) =>
        `[${requiredBlockIds.has(member.blockId) ? "required" : "supporting"} related-${member.kind} ${member.blockId}] ${text}`
      );
    }),
  ]);
  const serialized = serializeRecoveryEvidence({
    sourceText: sourceBlocksToLineText(sourceBlocks),
    sectionTitle: section.title,
  });
  return serialized.length > 0 || typedLines.length > 0
    ? [
        "STRUCTURED SOURCE EVIDENCE:",
        "The markers below serialize only typed/provenance and row/order cues explicitly present in the passage.",
        "Evidence inside one group is structurally associated, but no unstated calculation or algebraic transformation is authorized.",
        ...typedLines,
        ...serialized,
      ]
    : [];
}

function requiredEvidencePromptLines(
  section: PlannedSection,
  activeTargets: readonly RequiredEvidenceTarget[] | undefined = section.requiredEvidence,
): readonly string[] {
  const targets = activeTargets ?? [];
  return [
    "REQUIRED EVIDENCE MANIFEST:",
    ...(targets.length > 0
      ? targets.map(serializeRequiredEvidenceTarget)
      : ["[none] The source span contains no evidence beyond its heading; do not invent an explanation."]),
    "SUPPORTING / OPTIONAL SOURCE BLOCKS:",
    (section.supportingSourceBlockIds ?? []).length > 0
      ? (section.supportingSourceBlockIds ?? []).join(", ")
      : "[none]",
  ];
}

function repairContextPromptLines(
  context: SectionRepairContext | undefined,
): readonly string[] {
  if (!context) return [];
  const previous = context.previousCandidate
    ? JSON.stringify({
        explanation: context.previousCandidate.sourceCore.explanation,
        keyPoints: context.previousCandidate.sourceCore.keyPoints,
      }).slice(0, 8_000)
    : "[no previous candidate]";
  return [
    "REPAIR TASK:",
    `- Previous candidate: ${previous}`,
    `- Accepted grounded content to preserve: ${context.acceptedContent.length > 0 ? context.acceptedContent.join(" | ").slice(0, 6_000) : "[none]"}`,
    "- Missing required targets (use only the exact source evidence shown):",
    ...(context.missingRequiredEvidence.length > 0
      ? context.missingRequiredEvidence.map((target) => `  ${serializeRequiredEvidenceTarget(target)}`)
      : ["  [none] Repair only the listed usefulness defect."]),
    ...(context.usefulnessDiagnostics?.map((diagnostic) =>
      `- Usefulness defect: ${diagnostic}`
    ) ?? []),
    "- Return a complete schema-valid section. Preserve accepted grounded content, add or rewrite only what is necessary, and do not introduce unsupported relationships.",
  ];
}

function applyReviewContentGuard(output: SectionOutput): SectionOutput {
  const explanation = filterReviewableText(output.sourceCore.explanation);
  const keyPoints = uniqueSemanticText(
    output.sourceCore.keyPoints
      .map((point) => filterReviewableText(point))
      .filter((point) => point.length > 0 && !isInstructionalNoiseText(point)),
  );
  return {
    ...output,
    sourceCore: { explanation, keyPoints },
    enrichment: null,
  } as SectionOutput;
}

function uniqueSemanticText(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalizeSemanticText(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function applySemanticCoreGuard(
  output: SectionOutput,
  section: PlannedSection,
  sourceBlocks: readonly NormalizedSourceBlock[],
  detectedItems: readonly SourceItem[],
): SectionOutput {
  const semanticPlan = section.semanticPlan;
  if (!semanticPlan) {
    if (section.requiredEvidence === undefined) {
      return detectedItems.length >= 2
        ? applyDetectedListCoreGuard(output, detectedItems)
        : applySparseSourceCoreGuard(output, sourceBlocks, section);
    }
    return applyReviewContentGuard(
      detectedItems.length >= 2 ? output : applySparseSourceCoreGuard(output, sourceBlocks, section),
    );
  }

  const sourceText = sourceBlocksToText(sourceBlocks);
  if (isSparseSourceText(sourceText)) {
    return applySparseSourceCoreGuard(output, sourceBlocks, section);
  }

  // A literal short source list already is atomic review material. Preserve
  // exact tokens (measurements, commands, symbols) without expanding prose.
  const atomicList = (semanticPlan.kind === "list" || semanticPlan.kind === "mapping") &&
    semanticPlan.units.length >= 2 &&
    semanticPlan.units.every((unit) =>
      (unit.kind === "point" || (unit.kind === "mapping" && unit.sourceLayout === "pipe-row")) &&
      ([unit.label, ...unit.items].join(" ").match(/\S+/g)?.length ?? 0) <= 48 &&
      !isInstructionalNoiseText(unit.label)
    );

  if (section.requiredEvidence === undefined || atomicList) {
    const plannedKeyPoints = serializeSemanticUnits(semanticPlan.units);
    const generatedExplanation = output.sourceCore.explanation.trim();
    const explanation = semanticPlan.explanationUseful
      ? semanticPlan.units.length > 0
        ? selectGroundedExplanation(generatedExplanation, sourceText, section)
        : generatedExplanation
      : "";
    const visibleKeyPoints = plannedKeyPoints.filter(
      (point) => normalizeSemanticText(point) !== normalizeSemanticText(explanation),
    );
    return {
      ...output,
      sourceCore: {
        explanation,
        keyPoints: visibleKeyPoints.length > 0 ? visibleKeyPoints : output.sourceCore.keyPoints,
      },
      enrichment: null,
    } as SectionOutput;
  }

  const generatedExplanation = output.sourceCore.explanation.trim();
  const explanation = semanticPlan.explanationUseful
    ? semanticPlan.units.length > 0
      ? selectGroundedExplanation(
          generatedExplanation,
          sourceText,
          section,
        )
      : generatedExplanation
    : "";
  const visibleKeyPoints = output.sourceCore.keyPoints
    .map((point) => filterReviewableText(point))
    .filter((point) => point.length > 0 && !isInstructionalNoiseText(point))
    .filter((point) => normalizeSemanticText(point) !== normalizeSemanticText(explanation));
  return {
    ...output,
    sourceCore: {
      explanation,
      keyPoints: uniqueSemanticText(visibleKeyPoints),
    },
    enrichment: null,
  } as SectionOutput;
}

function selectGroundedExplanation(
  explanation: string,
  sourceText: string,
  section: PlannedSection,
): string {
  if (
    explanation &&
    isFullySourceGrounded(explanation, sourceText) &&
    isUsefulDirectSourceExplanation(explanation, section.title) &&
    explanationHasUsefulForm(section.title, explanation)
  ) {
    return explanation;
  }

  const semanticPlan = section.semanticPlan;
  if (!semanticPlan) return "";
  const titleTerms = new Set(extractCanonicalContentTerms(section.title));
  const candidate = semanticPlan.units
    .filter((unit) => unit.kind === "point")
    .map((unit) => unit.label)
    .find((point) => {
      const pointTerms = extractCanonicalContentTerms(point);
      const titleRelated = pointTerms.some((term) => titleTerms.has(term));
      return (
        pointTerms.length >= 7 &&
        (semanticPlan.kind === "example-group" || titleRelated) &&
        explanationHasUsefulForm(section.title, point)
      );
    });
  if (!candidate) return "";
  return /[.!?]$/.test(candidate) ? candidate : `${candidate}.`;
}

const GROUNDING_STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "as",
  "it",
  "is",
  "are",
  "was",
  "were",
  "for",
  "to",
  "of",
  "in",
  "on",
  "by",
  "with",
  "that",
  "this",
  "these",
  "those",
  "can",
  "be",
  "its",
  "also",
  "such",
  "which",
  "from",
  "into",
  "their",
  "they",
  "them",
]);

function isFullySourceGrounded(explanation: string, sourceText: string): boolean {
  const sourceTerms = new Set(extractCanonicalContentTerms(sourceText));
  const explanationTerms = extractCanonicalContentTerms(explanation);
  return (
    explanationTerms.length > 0 &&
    explanationTerms.every((term) => sourceTerms.has(term))
  );
}

function isUsefulDirectSourceExplanation(
  explanation: string,
  title: string,
): boolean {
  const explanationWords = explanation.match(/[A-Za-z0-9]+(?:[-/][A-Za-z0-9]+)*/g) ?? [];
  if (explanationWords.length < 5) return false;

  const explanationTerms = new Set(extractCanonicalContentTerms(explanation));
  const titleTerms = new Set(extractCanonicalContentTerms(title));
  const informationGain = [...explanationTerms].filter((term) => !titleTerms.has(term)).length;
  return informationGain >= 2;
}

function extractCanonicalContentTerms(value: string): readonly string[] {
  return (value.match(/[A-Za-z][A-Za-z0-9]*(?:[-/][A-Za-z0-9]+)*/g) ?? [])
    .filter((term) => !GROUNDING_STOPWORDS.has(term.toLocaleLowerCase()))
    .map(canonicalContentTerm)
    .filter(Boolean);
}

function canonicalContentTerm(value: string): string {
  const normalized = value
    .toLocaleLowerCase()
    .replace(/[â€™']/g, "")
    .replace(/[^a-z0-9/-]+/g, "")
    .trim();
  if (normalized.endsWith("ies") && normalized.length > 4) {
    return `${normalized.slice(0, -3)}y`;
  }
  if (normalized.endsWith("ing") && normalized.length > 6) {
    return normalized.slice(0, -3);
  }
  if (normalized.endsWith("ed") && normalized.length > 5) {
    return normalized.slice(0, -2);
  }
  if (
    normalized.endsWith("s") &&
    !normalized.endsWith("ss") &&
    normalized.length > 4
  ) {
    return normalized.slice(0, -1);
  }
  return normalized;
}

function normalizeSemanticText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function detectedItemsPromptLines(
  detectedItems: readonly SourceItem[],
): readonly string[] {
  if (detectedItems.length < 2) {
    return [];
  }

  return [
    "DETECTED PASSAGE ITEMS:",
    "These entries were mechanically extracted as optional supporting cues. Use only those needed after satisfying REQUIRED EVIDENCE; combine entries only when the semantic plan explicitly relates them.",
    ...detectedItems.map((item, index) => `${index + 1}. ${item.text}`),
  ];
}

function applyDetectedListCoreGuard(
  output: SectionOutput,
  detectedItems: readonly SourceItem[],
): SectionOutput {
  return {
    ...output,
    sourceCore: {
      explanation: "",
      keyPoints: detectedItems.map((item) => item.text),
    },
  } as SectionOutput;
}

function semanticPlanPromptLines(section: PlannedSection): readonly string[] {
  const semanticPlan = section.semanticPlan;
  if (!semanticPlan) return [];

  return [
    "SEMANTIC PLAN:",
    `- Section meaning: ${semanticPlan.kind}`,
    ...(semanticPlan.taxonomyContext
      ? [`- Source taxonomy context: ${semanticPlan.taxonomyContext}`]
      : []),
    `- Useful explanation: ${semanticPlan.explanationUseful ? "yes" : "no"}`,
    ...semanticPlan.units.map(
      (unit, index) =>
        `- Unit ${index + 1}: ${unit.kind} | ${unit.label}${
          unit.items.length > 0 ? ` -> ${unit.items.join(" | ")}` : ""
        }`,
    ),
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
