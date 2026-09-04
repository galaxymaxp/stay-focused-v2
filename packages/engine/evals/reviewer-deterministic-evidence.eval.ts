import type { GenerationProvider, GenerationRequest } from "../src/provider.js";
import {
  assembleDeterministicSectionEvidence,
  renderRequiredEvidenceTarget,
  validateDeterministicSectionEvidence,
} from "../src/reviewer-evidence-assembly.js";
import { findMissingRequiredEvidenceTargets } from "../src/required-evidence.js";
import { diagnoseStudentVisibleUsefulness } from "../src/reviewer-usefulness.js";
import { generateSections } from "../src/stage3-generate.js";
import { verifyCoverage } from "../src/stage4-verify.js";
import { retryFailedSections } from "../src/stage5-retry.js";
import { validateGrounding } from "../src/stage5a-grounding.js";
import { validateLeakage } from "../src/leakage-guard.js";
import { runPipeline } from "../src/generate.js";
import type {
  GenerationPlan,
  NormalizedSource,
  PlannedSection,
  RequiredEvidenceTarget,
  ReviewerSectionDisposition,
  SectionOutput,
  SourceOutline,
} from "../src/types.js";
import {
  assertDeepEqual,
  assertEqual,
  assertIncludes,
  isDirectExecution,
  printEvalSuiteResult,
  runEvalSuite,
  setFailureExitCode,
} from "./assert.js";
import type { EvalCase, EvalIssue, EvalSuite } from "./types.js";

const mixedTargets = [
  ["fact", "concept", "The archive preserves exact source records."],
  ["list", "list-item", "Amber register"],
  ["formula", "formula", "r = total / count"],
  ["result", "result-value", "The recorded result is 42."],
  ["row", "table-row", "2026 | North | 42"],
  ["code", "code", "const total = values.length;"],
  ["relation", "relationship", "The north record depends on the amber register."],
] as const;

const omissionCases = [
  ["model omits required formula", "formula"],
  ["model omits required numeric result", "result"],
  ["model omits required table row", "row"],
  ["model omits required ledger row", "row"],
  ["model omits required list item", "list"],
  ["model omits required relationship", "relation"],
  ["model omits required code", "code"],
] as const;

export const reviewerDeterministicEvidenceSuite: EvalSuite = {
  name: "Reviewer deterministic evidence architecture",
  cases: [
    ...omissionCases.map(([name, targetId]) => omissionCase(name, targetId)),
    excellentExplanationCase(),
    unsupportedExplanationCase(),
    usefulnessFailureCase("instructional explanation", "Try calculating every record now.", "INSTRUCTIONAL_NOISE"),
    usefulnessFailureCase("code-only explanation", "const total = values.length;\nreturn total;", "CODE_AS_EXPLANATION"),
    usefulnessFailureCase("fragment explanation", "Using source records", "FRAGMENTARY_EXPLANATION"),
    similarRowIdentityCase(),
    formulaIdentityCase(),
    sourceAbsentCase(),
    zeroCallDispositionCase("structural node consumes zero provider calls", "structural"),
    zeroCallDispositionCase("typed-only node consumes zero provider calls", "typed-evidence"),
    zeroCallDispositionCase("unsupported heading-only leaf consumes zero provider calls", "unsupported"),
    conciseExplanationCase(),
    sourceDumpCase(),
    providerDropsAllFactualFieldsCase(),
    batchIsolationCase(),
    partialBatchFailureCase(),
    batchOrderingCase(),
    retryBoundCase(),
    permanentProviderFailureCase(),
  ],
};

function omissionCase(name: string, targetId: string): EvalCase {
  return { name, run: async () => {
    const context = createContext();
    const provider = new ScriptedProvider((request) => explanationsFor(
      request,
      "The archive preserves exact source records.",
    ));
    const before = assembleDeterministicSectionEvidence({
      section: context.sections[0]!,
      sourceBlocks: context.source.blocks,
    });
    const generated = await generateSections({ ...context, provider });
    const output = generated.outputs[0]!;
    const expected = targetById(context.sections[0]!, targetId);
    const coverage = verifyCoverage({ ...context, outputs: [output] });
    return [
      ...assertIncludes(output.sourceCore.keyPoints.join("\n"), expected.label, "Provider omission removed deterministic evidence."),
      ...assertDeepEqual(output.sourceCore.keyPoints, before.sourceCore.keyPoints, "Provider changed the deterministic evidence set."),
      ...assertEqual(coverage.status, "passed", "Provider omission lowered exact evidence coverage."),
      ...assertEqual(findMissingRequiredEvidenceTargets(context.sections[0]!, output).length, 0, "A required target was lost after generation."),
    ];
  } };
}

function excellentExplanationCase(): EvalCase {
  return { name: "excellent grounded explanation need not repeat every fact", run: async () => {
    const context = createContext();
    const provider = new ScriptedProvider((request) => explanationsFor(
      request,
      "The archive preserves exact source records.",
    ));
    const result = await generateSections({ ...context, provider });
    const output = result.outputs[0]!;
    return [
      ...assertEqual(output.sourceCore.explanation.includes("r = total / count"), false, "Explanation was forced to reproduce a formula."),
      ...assertEqual(validateGrounding({ ...context, outputs: [output] }).status, "passed", "Concise explanation failed grounding."),
      ...assertEqual(findMissingRequiredEvidenceTargets(context.sections[0]!, output).length, 0, "Concise explanation caused factual loss."),
    ];
  } };
}

function unsupportedExplanationCase(): EvalCase {
  return { name: "unsupported explanation fails grounding while evidence stays intact", run: async () => {
    const context = createContext();
    const result = await generateSections({
      ...context,
      provider: new ScriptedProvider((request) => explanationsFor(
        request,
        "Orbital telescopes predict tomorrow's fictional weather.",
      )),
    });
    const output = result.outputs[0]!;
    return [
      ...assertEqual(validateGrounding({ ...context, outputs: [output] }).status, "failed", "Unsupported explanation passed grounding."),
      ...assertEqual(validateDeterministicSectionEvidence(context.sections[0]!, output).valid, true, "Grounding failure damaged deterministic evidence."),
    ];
  } };
}

function usefulnessFailureCase(
  name: string,
  explanation: string,
  expectedType: string,
): EvalCase {
  return { name, run: async () => {
    const context = createContext();
    const result = await generateSections({
      ...context,
      provider: new ScriptedProvider((request) => explanationsFor(request, explanation)),
    });
    const output = result.outputs[0]!;
    const issues = diagnoseStudentVisibleUsefulness({
      section: context.sections[0]!, source: context.source, output,
    });
    return [
      ...assertEqual(issues.some((issue) => issue.type === expectedType), true, "Expected explanation usefulness failure was not detected."),
      ...assertEqual(validateDeterministicSectionEvidence(context.sections[0]!, output).valid, true, "Usefulness failure damaged deterministic evidence."),
    ];
  } };
}

function similarRowIdentityCase(): EvalCase {
  return { name: "exact similar-row identity remains provenance-sensitive", run: async () => {
    const context = createContext();
    const section = context.sections[0]!;
    const row = targetById(section, "row");
    const altered: SectionOutput = {
      ...assembleDeterministicSectionEvidence({ section, sourceBlocks: context.source.blocks }),
      sourceCore: {
        explanation: "The archive preserves exact source records.",
        keyPoints: section.requiredEvidence!.map((target) =>
          target.id === row.id ? "2026 | South | 42" : renderRequiredEvidenceTarget(target)
        ),
      },
    };
    return assertDeepEqual(
      findMissingRequiredEvidenceTargets(section, altered).map((target) => target.id),
      ["row"],
      "A similar row satisfied the exact source row.",
    );
  } };
}

function formulaIdentityCase(): EvalCase {
  return { name: "similar formula cannot replace exact required formula", run: async () => {
    const context = createContext();
    const section = context.sections[0]!;
    const altered = legacyOutput(section, ["r = total + count"]);
    return assertEqual(
      findMissingRequiredEvidenceTargets(section, altered).some((target) => target.id === "formula"),
      true,
      "A mathematically different formula satisfied exact identity.",
    );
  } };
}

function sourceAbsentCase(): EvalCase {
  return { name: "source-absent target fails before provider reconstruction", run: async () => {
    const context = createContext();
    const section = context.sections[0]!;
    const absent = {
      ...section,
      requiredEvidence: section.requiredEvidence!.map((target) =>
        target.id === "formula"
          ? { ...target, label: "r = total + count", evidenceTexts: ["r = total + count"] }
          : target
      ),
    };
    const changed = withSections(context, [absent]);
    const provider = new ScriptedProvider((request) => explanationsFor(request, "Unused explanation."));
    const result = await generateSections({ ...changed, provider });
    return [
      ...assertEqual(provider.requests.length, 0, "Source-absent evidence reached the provider."),
      ...assertEqual(result.failedSectionIds.includes(absent.id), true, "Source-absent evidence did not fail safely."),
    ];
  } };
}

function zeroCallDispositionCase(name: string, disposition: ReviewerSectionDisposition): EvalCase {
  return { name, run: async () => {
    const context = createContext();
    const section = { ...context.sections[0]!, reviewerDisposition: disposition };
    const changed = withSections(context, [section]);
    const provider = new ScriptedProvider((request) => explanationsFor(request, "Unused explanation."));
    const result = await generateSections({ ...changed, provider });
    return [
      ...assertEqual(provider.requests.length, 0, "Non-standalone node consumed a provider call."),
      ...assertEqual(result.outputs[0]?.sourceCore.explanation, "", "Non-standalone node received invented prose."),
      ...assertEqual(validateDeterministicSectionEvidence(section, result.outputs[0]!).valid, true, "Non-standalone evidence was not assembled deterministically."),
    ];
  } };
}

function conciseExplanationCase(): EvalCase {
  return { name: "one concise grounded explanation sentence passes", run: async () => {
    const context = createContext();
    const result = await generateSections({
      ...context,
      provider: new ScriptedProvider((request) => explanationsFor(
        request,
        "The archive preserves exact source records.",
      )),
    });
    const output = result.outputs[0]!;
    return [
      ...assertEqual(validateGrounding({ ...context, outputs: [output] }).status, "passed", "Grounded sentence failed grounding."),
      ...assertEqual(diagnoseStudentVisibleUsefulness({ section: context.sections[0]!, source: context.source, output }).length, 0, "Concise sentence failed usefulness."),
    ];
  } };
}

function sourceDumpCase(): EvalCase {
  return { name: "source dump fails usefulness while evidence remains valid", run: async () => {
    const context = createContext();
    const dump = Array.from({ length: 12 }, () => "The archive preserves exact source records.").join(" ");
    const result = await generateSections({
      ...context,
      provider: new ScriptedProvider((request) => explanationsFor(request, dump)),
    });
    const output = result.outputs[0]!;
    return [
      ...assertEqual(diagnoseStudentVisibleUsefulness({ section: context.sections[0]!, source: context.source, output }).some((issue) => issue.type === "SOURCE_DUMP"), true, "Source dump passed usefulness."),
      ...assertEqual(validateDeterministicSectionEvidence(context.sections[0]!, output).valid, true, "Source dump damaged deterministic evidence."),
    ];
  } };
}

function providerDropsAllFactualFieldsCase(): EvalCase {
  return { name: "provider drops every factual field without target loss", run: async () => {
    const context = createContext();
    const provider = new ScriptedProvider((request) => explanationsFor(
      request,
      "The archive preserves exact source records.",
    ));
    const result = await generateSections({ ...context, provider });
    const output = result.outputs[0]!;
    return [
      ...assertEqual(context.sections[0]!.requiredEvidence!.length, 7, "Synthetic proof did not begin with seven mixed targets."),
      ...assertEqual(findMissingRequiredEvidenceTargets(context.sections[0]!, output).length, 0, "Explanation-only provider caused target loss."),
      ...assertEqual(output.sourceCore.keyPoints.length, 7, "Final candidate lost mixed deterministic evidence."),
    ];
  } };
}

function batchIsolationCase(): EvalCase {
  return { name: "batched explanations maintain section isolation", run: async () => {
    const context = createTwoSectionContext();
    const provider = new ScriptedProvider((request) => ({
      explanations: (request.metadata?.explanationBatchSectionIds as readonly string[]).map((sectionId) => ({
        sectionId,
        explanation: sectionId === "section-a"
          ? "The amber archive preserves northern records."
          : "The cobalt archive preserves southern records.",
      })),
    }));
    const result = await generateSections({ ...context, provider });
    return [
      ...assertEqual(provider.requests.length, 1, "Independent sections were not batched."),
      ...assertEqual(result.outputs[0]?.sourceCore.explanation.includes("cobalt"), false, "Section B evidence leaked into A."),
      ...assertEqual(result.outputs[1]?.sourceCore.explanation.includes("amber"), false, "Section A evidence leaked into B."),
      ...assertDeepEqual(result.outputs.map((output) => output.plannedSectionId), ["section-a", "section-b"], "Stable section IDs changed in a batch."),
    ];
  } };
}

function partialBatchFailureCase(): EvalCase {
  return { name: "partial batch failure retries only the failed explanation", run: async () => {
    const context = createTwoSectionContext();
    const initial = await generateSections({
      ...context,
      provider: new ScriptedProvider((request) => ({ explanations: [
        { sectionId: "section-a", explanation: "The amber archive preserves northern records." },
        { sectionId: "section-b", explanation: "Orbital telescopes invent unrelated claims." },
      ] })),
    });
    const outputs = initial.outputs;
    const retryProvider = new ScriptedProvider((request) => explanationsFor(
      request,
      "The cobalt archive preserves southern records.",
    ));
    const retried = await retryFailedSections({
      outputs,
      coverage: verifyCoverage({ ...context, outputs }),
      grounding: validateGrounding({ ...context, outputs }),
      leakage: validateLeakage({ ...context, outputs }),
      plan: context.plan,
      source: context.source,
      outline: context.outline,
      provider: retryProvider,
      retryPolicy: { maxRetries: 1, retryWeakSections: true, retryFailedSections: true },
    });
    return [
      ...assertDeepEqual(retryProvider.requests[0]?.metadata?.explanationBatchSectionIds, ["section-b"], "Valid batch member was regenerated."),
      ...assertEqual(retried[0]?.sourceCore.explanation, outputs[0]?.sourceCore.explanation, "Valid explanation changed during isolated retry."),
      ...assertEqual(findMissingRequiredEvidenceTargets(context.sections[1]!, retried[1]).length, 0, "Failed explanation repair affected evidence."),
    ];
  } };
}

function batchOrderingCase(): EvalCase {
  return { name: "provider response order cannot change reviewer order", run: async () => {
    const context = createTwoSectionContext();
    const result = await generateSections({
      ...context,
      provider: new ScriptedProvider(() => ({ explanations: [
        { sectionId: "section-b", explanation: "The cobalt archive preserves southern records." },
        { sectionId: "section-a", explanation: "The amber archive preserves northern records." },
      ] })),
    });
    return assertDeepEqual(
      result.outputs.map((output) => output.plannedSectionId),
      ["section-a", "section-b"],
      "Provider response order changed source order.",
    );
  } };
}

function retryBoundCase(): EvalCase {
  return { name: "failed explanation obeys the retry bound", run: async () => {
    const context = createContext();
    const initialProvider = new ScriptedProvider((request) => explanationsFor(request, "Using records"));
    const initial = await generateSections({ ...context, provider: initialProvider });
    const outputs = initial.outputs;
    const retryProvider = new ScriptedProvider((request) => explanationsFor(request, "Using records"));
    const final = await retryFailedSections({
      outputs,
      coverage: verifyCoverage({ ...context, outputs }),
      grounding: validateGrounding({ ...context, outputs }),
      leakage: validateLeakage({ ...context, outputs }),
      plan: context.plan,
      source: context.source,
      outline: context.outline,
      provider: retryProvider,
      retryPolicy: { maxRetries: 2, retryWeakSections: true, retryFailedSections: true },
    });
    return [
      ...assertEqual(retryProvider.requests.length, 2, "Explanation retry exceeded or skipped the bound."),
      ...assertEqual(validateDeterministicSectionEvidence(context.sections[0]!, final[0]!).valid, true, "Bounded retries changed deterministic evidence."),
    ];
  } };
}

function permanentProviderFailureCase(): EvalCase {
  return { name: "permanent provider quota failure is not retried", run: async () => {
    let requests = 0;
    const reviewer = await runPipeline({
      input: {
        kind: "plain-text",
        title: "Quota-safe fallback",
        text: "The archive preserves exact source records.",
      },
      provider: {
        generate: async () => {
          requests += 1;
          throw new Error("429 You have no credits remaining.");
        },
      },
    });
    return [
      ...assertEqual(requests, 1, "Permanent quota failure triggered provider retries."),
      ...assertEqual(reviewer.metadata.generationMetrics?.providerRetryCount, 0, "Permanent failure was recorded as a retry loop."),
      ...assertEqual(reviewer.metadata.generationMetrics?.factualCompletionRetryCount, 0, "Permanent failure triggered factual completion."),
    ];
  } };
}

class ScriptedProvider implements GenerationProvider {
  public readonly requests: GenerationRequest<unknown>[] = [];
  public constructor(
    private readonly response: (request: GenerationRequest<unknown>) => unknown,
  ) {}
  public async generate<TOutput>(request: GenerationRequest<TOutput>): Promise<TOutput> {
    this.requests.push(request as GenerationRequest<unknown>);
    return this.response(request as GenerationRequest<unknown>) as TOutput;
  }
}

function explanationsFor(
  request: GenerationRequest<unknown>,
  explanation: string,
): unknown {
  const ids = request.metadata?.explanationBatchSectionIds;
  return {
    explanations: Array.isArray(ids)
      ? ids.map((sectionId) => ({ sectionId, explanation }))
      : [],
  };
}

function createContext() {
  const blocks = mixedTargets.map(([id, kind, label], order) => ({
    id: `block-${id}`,
    kind: kind === "formula" || kind === "code" ? kind : "paragraph" as const,
    text: label,
    order,
  }));
  const source: NormalizedSource = {
    id: "deterministic-source",
    title: "Archive Records",
    kind: "document",
    language: "en",
    metadata: {},
    blocks,
    createdAt: "2026-09-05T00:00:00.000Z",
  };
  const targets: RequiredEvidenceTarget[] = mixedTargets.map(([id, kind, label], order) => ({
    id,
    kind,
    label,
    evidenceTexts: [label],
    sourceBlockIds: [`block-${id}`],
    provenance: [{ sourceBlockId: `block-${id}`, sourceOrder: order }],
    ...(kind === "relationship" ? { relationshipLabel: "depends on" } : {}),
  }));
  const section = createSection("section-mixed", "Mixed evidence", source.blocks.map((block) => block.id), targets);
  return contextFrom(source, [section]);
}

function createTwoSectionContext() {
  const source: NormalizedSource = {
    id: "batch-source",
    title: "Two archives",
    kind: "document",
    language: "en",
    metadata: {},
    blocks: [
      { id: "block-a", kind: "paragraph", text: "The amber archive preserves northern records.", order: 0 },
      { id: "block-b", kind: "paragraph", text: "The cobalt archive preserves southern records.", order: 1 },
    ],
    createdAt: "2026-09-05T00:00:00.000Z",
  };
  const sections = [
    createSection("section-a", "Amber archive", ["block-a"], [target("target-a", "concept", source.blocks[0]!.text, "block-a", 0)], 0),
    createSection("section-b", "Cobalt archive", ["block-b"], [target("target-b", "concept", source.blocks[1]!.text, "block-b", 1)], 1),
  ];
  return contextFrom(source, sections);
}

function contextFrom(source: NormalizedSource, sections: readonly PlannedSection[]) {
  const outline: SourceOutline = {
    id: `${source.id}-outline`,
    sourceId: source.id,
    title: source.title,
    sections: sections.map((section) => ({
      id: section.sourceSectionId,
      title: section.title,
      order: section.order,
      startOffset: 0,
      endOffset: section.sourceEndOffset,
      tokenWeight: section.tokenWeight,
      sourceBlockIds: section.sourceBlockIds,
      blockIds: section.sourceBlockIds,
      roughStartBlockId: section.sourceBlockIds[0]!,
      roughEndBlockId: section.sourceBlockIds.at(-1)!,
      tags: ["concept"],
      confidence: 1,
    })),
  };
  const plan: GenerationPlan = {
    id: `${source.id}-plan`,
    sourceId: source.id,
    outlineId: outline.id,
    title: source.title,
    sections,
    metadata: { sectionCount: sections.length, sourceBlockCount: source.blocks.length },
    sourceOutline: outline,
  };
  return { source, outline, plan, sections };
}

function withSections(
  context: ReturnType<typeof createContext>,
  sections: readonly PlannedSection[],
) {
  return contextFrom(context.source, sections);
}

function createSection(
  id: string,
  title: string,
  blockIds: readonly string[],
  targets: readonly RequiredEvidenceTarget[],
  order = 0,
): PlannedSection {
  return {
    id,
    sourceSectionId: `${id}-source`,
    title,
    order,
    schemaKind: "concept-card",
    target: {
      objective: `Explain ${title}.`,
      itemCount: targets.length,
      focus: title,
      requiredSourceBlockIds: blockIds,
      expectedTags: ["concept"],
      coverageRules: ["Represent exact required evidence."],
    },
    sourceBlockIds: blockIds,
    tokenWeight: 40,
    targetItemCount: targets.length,
    sourceStartOffset: 0,
    sourceEndOffset: 10_000,
    semanticPlan: { kind: "concept", units: [], explanationUseful: true },
    requiredEvidence: targets,
    supportingSourceBlockIds: [],
    reviewerDisposition: "standalone",
  };
}

function target(
  id: string,
  kind: RequiredEvidenceTarget["kind"],
  label: string,
  blockId: string,
  sourceOrder: number,
): RequiredEvidenceTarget {
  return {
    id,
    kind,
    label,
    evidenceTexts: [label],
    sourceBlockIds: [blockId],
    provenance: [{ sourceBlockId: blockId, sourceOrder }],
  };
}

function targetById(section: PlannedSection, id: string): RequiredEvidenceTarget {
  const found = section.requiredEvidence?.find((target) => target.id === id);
  if (!found) throw new Error(`Missing test target ${id}.`);
  return found;
}

function legacyOutput(section: PlannedSection, keyPoints: readonly string[]): SectionOutput {
  return {
    id: "legacy-output",
    kind: section.schemaKind,
    plannedSectionId: section.id,
    title: section.title,
    sourceBlockIds: [...section.sourceBlockIds],
    sourceCore: {
      explanation: "The archive preserves exact source records.",
      keyPoints,
    },
    enrichment: null,
  } as SectionOutput;
}

export async function runReviewerDeterministicEvidenceEvals(): Promise<boolean> {
  const result = await runEvalSuite(reviewerDeterministicEvidenceSuite);
  printEvalSuiteResult(result);
  setFailureExitCode([result]);
  return result.status === "passed";
}

if (isDirectExecution(import.meta.url)) {
  await runReviewerDeterministicEvidenceEvals();
}
