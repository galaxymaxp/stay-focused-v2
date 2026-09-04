import { validateLeakage } from "../src/leakage-guard.js";
import type { GenerationProvider, GenerationRequest } from "../src/provider.js";
import { buildRequiredEvidenceManifest, findMissingRequiredEvidenceTargets } from "../src/required-evidence.js";
import { diagnoseStudentVisibleUsefulness } from "../src/reviewer-usefulness.js";
import { generateSection, generateSections, SectionValidationError } from "../src/stage3-generate.js";
import { assembleDeterministicSectionEvidence } from "../src/reviewer-evidence-assembly.js";
import { verifyCoverage } from "../src/stage4-verify.js";
import { retryFailedSections } from "../src/stage5-retry.js";
import { validateGrounding } from "../src/stage5a-grounding.js";
import { serializeSemanticUnits } from "../src/semantic-structure.js";
import { assembleReviewer } from "../src/stage6-assemble.js";
import type {
  GenerationPlan,
  NormalizedSource,
  PlannedSection,
  RequiredEvidenceTarget,
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
import type { EvalCase, EvalSuite } from "./types.js";

class FakeProvider implements GenerationProvider {
  public readonly requests: GenerationRequest<unknown>[] = [];
  public constructor(private readonly outputs: readonly unknown[]) {}
  public async generate<TOutput>(request: GenerationRequest<TOutput>): Promise<TOutput> {
    this.requests.push(request as GenerationRequest<unknown>);
    const output = this.outputs[this.requests.length - 1];
    if (output === undefined) throw new Error("Missing scripted provider output.");
    return output as TOutput;
  }
}

export const reviewerCompletionUsefulnessSuite: EvalSuite = {
  name: "Reviewer completion and usefulness hardening",
  cases: [
    retryCompletionCase("required list item is assembled before explanation retry", "list"),
    retryCompletionCase("required table row is assembled before explanation retry", "table"),
    formulaCompletionCase(),
    usefulnessFailureCase(
      "title repetition is non-explanatory",
      "Generator Expressions",
      "Generator expressions are generator expressions.",
      "NON_EXPLANATORY_SECTION",
    ),
    usefulnessPassCase(),
    activityLeakageCase(),
    sourceDumpCase(),
    typedEvidenceExceptionCase(),
    missingEvidenceRefusalCase(),
    ...(["list-item", "table-row", "result-value", "formula", "relationship"] as const).map(sourceAbsentKindCase),
    terminalUsefulnessGateCase(),
    emptyGroupEvidenceCase(),
    similarRowIdentityCase(),
    typedProsePaddingCase(),
    typedManifestWithoutListCase(),
  ],
};

function retryCompletionCase(name: string, kind: "list" | "table"): EvalCase {
  return {
    name,
    run: async () => {
      const labels = kind === "list"
        ? ["Alpha keeps its source meaning.", "Beta keeps its source meaning.", "Gamma keeps its source meaning."]
        : ["1.1.24 | Cash | 100", "2.1.24 | Revenue | 200", "3.1.24 | Capital | 300"];
      const targets = labels.map((label, index) => target(
        `${kind}-target-${index + 1}`,
        kind === "list" ? "list-item" : "table-row",
        label,
        "source-block",
        index,
      ));
      const context = contextFor({ title: kind === "list" ? "Stored items" : "Source rows", labels, targets });
      const initial = outputFor(context.section, labels.slice(0, 2), "initial");
      const repaired = outputFor(context.section, labels, "repaired");
      const provider = new FakeProvider([repaired]);
      const outputs = await retryFailedSections({
        outputs: [initial],
        coverage: verifyCoverage({ ...context, outputs: [initial] }),
        grounding: validateGrounding({ ...context, outputs: [initial] }),
        leakage: validateLeakage({ plan: context.plan, source: context.source, outputs: [initial] }),
        plan: context.plan,
        source: context.source,
        outline: context.outline,
        provider,
        retryPolicy: { maxRetries: 1, retryWeakSections: true, retryFailedSections: true },
      });
      const prompt = provider.requests[0]?.prompt ?? "";
      const finalMissing = findMissingRequiredEvidenceTargets(context.section, outputs[0]);
      return [
        ...assertDeepEqual(
          findMissingRequiredEvidenceTargets(context.section, initial).map((entry) => entry.id),
          [`${kind}-target-3`],
          "Preflight did not isolate the exact missing target.",
        ),
        ...assertEqual(prompt.includes(`${kind}-target-3`), false, "Explanation retry retained factual-repair instructions."),
        ...assertIncludes(prompt, labels[2] ?? "", "Retry prompt omitted the missing target source evidence."),
        ...assertEqual(finalMissing.length, 0, "Deterministic pre-provider assembly did not complete required evidence."),
      ];
    },
  };
}

function formulaCompletionCase(): EvalCase {
  return {
    name: "required formula completion rejects an unsupported replacement",
    run: async () => {
      const formula = "m = total / count";
      const context = contextFor({
        title: "Stored calculation",
        labels: [formula],
        targets: [target("formula-target", "formula", formula, "source-block", 0)],
      });
      const unsupported = outputFor(context.section, ["m = total + count"], "unsupported");
      const deterministic = assembleDeterministicSectionEvidence({
        section: context.section,
        sourceBlocks: context.source.blocks,
      });
      const grounding = validateGrounding({ ...context, outputs: [unsupported] });
      const provider = new FakeProvider([outputFor(
        context.section,
        ["m = total + count"],
        "malicious-provider-shape",
      )]);
      const generated = await generateSections({
        sections: [context.section],
        plan: context.plan,
        source: context.source,
        provider,
      });
      const final = generated.outputs[0];
      return [
        ...assertDeepEqual(
          findMissingRequiredEvidenceTargets(context.section, unsupported).map((entry) => entry.id),
          ["formula-target"],
          "Unsupported replacement formula satisfied the required formula target.",
        ),
        ...assertEqual(grounding.status, "failed", "Unsupported replacement formula passed grounding."),
        ...assertEqual(findMissingRequiredEvidenceTargets(context.section, deterministic).length, 0, "Deterministic formula assembly was incomplete."),
        ...assertEqual(provider.requests[0]?.schema.name, "ReviewerExplanationBatch", "Provider retained ownership of the full factual section schema."),
        ...assertDeepEqual(final?.sourceCore.keyPoints, [formula], "Provider rewrote the authoritative formula value."),
        ...assertEqual(findMissingRequiredEvidenceTargets(context.section, final).length, 0, "Provider response removed the exact deterministic formula."),
      ];
    },
  };
}

function sourceAbsentKindCase(kind: RequiredEvidenceTarget["kind"]): EvalCase {
  return { name: `source-absent ${kind} cannot be synthesized by retry or fallback`, run: async () => {
    const available = kind === "formula" ? "m = total / count"
      : kind === "relationship" ? "Northern records exist. Southern records exist."
      : kind === "result-value" ? "The source result is 100."
      : kind === "list-item" ? "Alpha retains its source label."
      : "2024 | North | 100";
    const absent = kind === "formula" ? "m = total + count"
      : kind === "relationship" ? "Northern records depend on southern records."
      : kind === "result-value" ? "The source result is 300."
      : kind === "list-item" ? "Beta retains its source label."
      : "2025 | South | 300";
    const context = contextFor({ title: "Stored evidence", labels: [available], targets: [target("absent", kind, absent, "source-block", 0)] });
    const initial = outputFor(context.section, [available], "initial");
    const provider = new FakeProvider([]);
    const repaired = await retryFailedSections({
      ...context, outputs: [initial], provider,
      coverage: verifyCoverage({ ...context, outputs: [initial] }),
      grounding: validateGrounding({ ...context, outputs: [initial] }),
      retryPolicy: { maxRetries: 1, retryWeakSections: true, retryFailedSections: true },
    });
    return [
      ...assertEqual(provider.requests.length, 0, "Provider received source-absent evidence."),
      ...assertEqual(findMissingRequiredEvidenceTargets(context.section, repaired[0]).length, 1, "Fallback synthesized absent evidence."),
    ];
  } };
}

function terminalUsefulnessGateCase(): EvalCase {
  return { name: "Stage 6 withholds a grounded title-only explanation", run: async () => {
    const evidence = "Stored values retain their source labels.";
    const context = contextFor({ title: "Stored values", labels: [evidence], targets: [target("concept", "concept", evidence, "source-block", 0)] });
    const output = outputFor(context.section, [evidence], "candidate", "Stored values are stored values.");
    let withheld = false;
    try {
      assembleReviewer({ ...context, outputs: [output],
        coverage: verifyCoverage({ ...context, outputs: [output] }),
        grounding: validateGrounding({ ...context, outputs: [output] }),
        leakage: validateLeakage({ ...context, outputs: [output] }),
      });
    } catch (error) { withheld = error instanceof Error && error.message.includes("NON_EXPLANATORY_SECTION"); }
    return assertEqual(withheld, true, "Grounded title repetition was assembled.");
  } };
}

function emptyGroupEvidenceCase(): EvalCase {
  return { name: "a required group label with no children remains source evidence", run: async () =>
    assertDeepEqual(serializeSemanticUnits([{ kind: "group", label: "2024 | Capital | 300", items: [] }]),
      ["2024 | Capital | 300"], "Empty-child group silently dropped the actual source row.") };
}

function similarRowIdentityCase(): EvalCase {
  return { name: "similar table rows cannot satisfy one another", run: async () => {
    const labels = ["2024 | North regional warehouse current balance | 100", "2024 | South regional warehouse current balance | 100"];
    const context = contextFor({ title: "Regional balances", labels,
      targets: labels.map((label, i) => target(`row-${i}`, "table-row", label, "source-block", i)) });
    return assertDeepEqual(findMissingRequiredEvidenceTargets(context.section, outputFor(context.section, [labels[0]!], "candidate")).map(t => t.id),
      ["row-1"], "A similar row satisfied the wrong provenance target.");
  } };
}

function typedProsePaddingCase(): EvalCase {
  return { name: "a short formula does not exempt a padded prose dump", run: async () => {
    const formula = "m = total / count";
    const context = contextFor({ title: "Stored formula", labels: [formula], targets: [target("formula", "formula", formula, "source-block", 0)] });
    const dump = `${formula} ${Array.from({length: 100}, () => "irrelevant prose").join(" ")}`;
    const issues = diagnoseStudentVisibleUsefulness({ ...context, output: outputFor(context.section, [dump], "candidate") });
    return assertEqual(issues.some(i => i.type === "SOURCE_DUMP"), true, "Typed evidence exempted unrelated prose.");
  } };
}

function typedManifestWithoutListCase(): EvalCase {
  return { name: "typed formula remains required without a semantic list", run: async () => {
    const formula = "m = total / count";
    const targets = buildRequiredEvidenceManifest({
      sectionId: "calculation", sectionTitle: "Stored calculation",
      semanticPlan: { kind: "concept", units: [], explanationUseful: true },
      sourceBlocks: [{ id: "formula-block", kind: "formula", text: formula, order: 0,
        structuredBlock: { id: "formula-block", type: "formula", rawText: formula, order: 0, pageNumber: 1,
          provenance: { blockId: "formula-block", pageNumber: 1, parser: "docling" } },
      }],
    });
    return [
      ...assertEqual(targets.some(t => t.kind === "formula" && t.evidenceTexts.includes(formula)), true, "Typed formula was demoted to supporting evidence."),
      ...assertEqual(targets.every(t => t.provenance.some(p => p.sourceBlockId === "formula-block")), true, "Required formula lost provenance."),
    ];
  } };
}

function usefulnessFailureCase(
  name: string,
  title: string,
  explanation: string,
  expectedType: string,
): EvalCase {
  return {
    name,
    run: async () => {
      const context = contextFor({
        title,
        labels: ["Generator expressions create values from an iterable."],
        targets: [target("concept-target", "concept", "Generator expressions create values from an iterable.", "source-block", 0)],
      });
      const output = outputFor(context.section, ["Generator expressions create values from an iterable."], "candidate", explanation);
      const types = diagnoseStudentVisibleUsefulness({ ...context, output }).map((entry) => entry.type);
      return assertEqual(types.includes(expectedType as never), true, "Expected usefulness diagnostic was absent.");
    },
  };
}

function usefulnessPassCase(): EvalCase {
  return {
    name: "legitimate concise explanation adds source-supported meaning",
    run: async () => {
      const evidence = "A generator yields values lazily when they are requested.";
      const context = contextFor({
        title: "Generators",
        labels: [evidence],
        targets: [target("concept-target", "concept", evidence, "source-block", 0)],
      });
      const output = outputFor(context.section, [evidence], "candidate", evidence);
      return assertEqual(
        diagnoseStudentVisibleUsefulness({ ...context, output }).length,
        0,
        "Concise informative explanation was rejected.",
      );
    },
  };
}

function activityLeakageCase(): EvalCase {
  return {
    name: "activity command is omitted while conceptual evidence remains",
    run: async () => {
      const concept = "A stored iterator yields one value at a time.";
      const command = "Write a program that prints every stored value.";
      const context = contextFor({
        title: "Stored iterator",
        labels: [concept, "Activity", command],
        targets: [target("concept-target", "concept", concept, "source-block", 0)],
      });
      const providerOutput = outputFor(context.section, [concept, command], "provider", concept);
      const provider = new FakeProvider([providerOutput]);
      const generated = await generateSection({ ...context, provider });
      const visible = [generated.sourceCore.explanation, ...generated.sourceCore.keyPoints].join("\n");
      return [
        ...assertEqual(visible.includes(concept), true, "Concept evidence was lost with activity filtering."),
        ...assertEqual(visible.includes(command), false, "Activity command leaked through Stage 3."),
        ...assertEqual(findMissingRequiredEvidenceTargets(context.section, generated).length, 0, "Concept evidence was lost with activity filtering."),
      ];
    },
  };
}

function sourceDumpCase(): EvalCase {
  return {
    name: "long prose source dump fails usefulness",
    run: async () => {
      const concept = "Stored records retain source values.";
      const dump = Array.from({ length: 90 }, (_, index) => `detail${index + 1}`).join(" ");
      const context = contextFor({
        title: "Stored records",
        labels: [concept, dump],
        targets: [target("concept-target", "concept", concept, "source-block", 0)],
      });
      const output = outputFor(context.section, [concept, dump], "candidate", concept);
      const types = diagnoseStudentVisibleUsefulness({ ...context, output }).map((entry) => entry.type);
      return assertEqual(types.includes("SOURCE_DUMP"), true, "Long prose dump passed usefulness.");
    },
  };
}

function typedEvidenceExceptionCase(): EvalCase {
  return {
    name: "long required typed evidence is not rejected merely for length",
    run: async () => {
      const code = Array.from({ length: 85 }, (_, index) => `value_${index + 1} = ${index + 1}`).join("; ");
      const context = contextFor({
        title: "Stored code",
        labels: [code],
        targets: [target("code-target", "code", code, "source-block", 0)],
      });
      const output = outputFor(context.section, [code], "candidate", "");
      const types = diagnoseStudentVisibleUsefulness({ ...context, output }).map((entry) => entry.type);
      return assertEqual(types.includes("SOURCE_DUMP"), false, "Required typed evidence was rejected for length alone.");
    },
  };
}

function missingEvidenceRefusalCase(): EvalCase {
  return {
    name: "source-absent retry evidence is refused before provider generation",
    run: async () => {
      const context = contextFor({
        title: "Unavailable evidence",
        labels: ["Available source fact."],
        targets: [target("missing-target", "concept", "Absent source fact.", "missing-block", 0)],
      });
      const provider = new FakeProvider([outputFor(context.section, ["Absent source fact."], "fabricated")]);
      let refused = false;
      try {
        await generateSection({ ...context, provider });
      } catch (error) {
        refused = error instanceof SectionValidationError && error.reason === "required-evidence-unavailable";
      }
      return [
        ...assertEqual(refused, true, "Missing evidence was not refused deterministically."),
        ...assertEqual(provider.requests.length, 0, "Provider was called with source-absent required evidence."),
      ];
    },
  };
}

function contextFor(args: {
  readonly title: string;
  readonly labels: readonly string[];
  readonly targets: readonly RequiredEvidenceTarget[];
}) {
  const source: NormalizedSource = {
    id: "completion-source",
    title: args.title,
    kind: "document",
    language: "en",
    metadata: {},
    blocks: [{ id: "source-block", kind: "paragraph", text: args.labels.join("\n"), order: 0 }],
    createdAt: "2026-09-03T00:00:00.000Z",
  };
  const section: PlannedSection = {
    id: "planned-section",
    sourceSectionId: "outline-section",
    title: args.title,
    order: 0,
    schemaKind: "concept-card",
    target: {
      objective: `Explain ${args.title}.`,
      itemCount: args.targets.length,
      focus: args.title,
      requiredSourceBlockIds: ["source-block"],
      expectedTags: ["concept"],
      coverageRules: ["Represent required evidence."],
    },
    sourceBlockIds: ["source-block"],
    tokenWeight: 20,
    targetItemCount: args.targets.length,
    sourceStartOffset: 0,
    sourceEndOffset: source.blocks[0]?.text.length ?? 0,
    semanticPlan: { kind: "concept", units: [], explanationUseful: true },
    requiredEvidence: args.targets,
    supportingSourceBlockIds: [],
  };
  const outline: SourceOutline = {
    id: "completion-outline",
    sourceId: source.id,
    title: args.title,
    sections: [{
      id: section.sourceSectionId,
      title: section.title,
      order: 0,
      startOffset: 0,
      endOffset: section.sourceEndOffset,
      tokenWeight: 20,
      sourceBlockIds: ["source-block"],
      blockIds: ["source-block"],
      roughStartBlockId: "source-block",
      roughEndBlockId: "source-block",
      tags: ["concept"],
      confidence: 1,
    }],
  };
  const plan: GenerationPlan = {
    id: "completion-plan",
    sourceId: source.id,
    outlineId: outline.id,
    title: args.title,
    sections: [section],
    metadata: { sectionCount: 1, sourceBlockCount: 1 },
    sourceOutline: outline,
  };
  return { source, outline, plan, section };
}

function target(
  id: string,
  kind: RequiredEvidenceTarget["kind"],
  label: string,
  sourceBlockId: string,
  sourceOrder: number,
): RequiredEvidenceTarget {
  return {
    id,
    kind,
    label,
    evidenceTexts: [label],
    sourceBlockIds: [sourceBlockId],
    provenance: [{ sourceBlockId, sourceOrder }],
  };
}

function outputFor(
  section: PlannedSection,
  points: readonly string[],
  id: string,
  explanation = "Stored source evidence remains available for review.",
): SectionOutput {
  return {
    id,
    kind: "concept-card",
    plannedSectionId: section.id,
    title: section.title,
    sourceBlockIds: [...section.sourceBlockIds],
    sourceCore: { explanation, keyPoints: points },
    enrichment: null,
  };
}

export async function runReviewerCompletionUsefulnessEvals(): Promise<boolean> {
  const result = await runEvalSuite(reviewerCompletionUsefulnessSuite);
  printEvalSuiteResult(result);
  setFailureExitCode([result]);
  return result.status === "passed";
}

if (isDirectExecution(import.meta.url)) {
  await runReviewerCompletionUsefulnessEvals();
}
