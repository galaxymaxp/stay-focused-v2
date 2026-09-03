import { validateLeakage } from "../src/leakage-guard.js";
import type { GenerationProvider, GenerationRequest } from "../src/provider.js";
import { findMissingRequiredEvidenceTargets } from "../src/required-evidence.js";
import { isInstructionalNoiseText } from "../src/review-content.js";
import { diagnoseStudentVisibleUsefulness } from "../src/reviewer-usefulness.js";
import { generateSection } from "../src/stage3-generate.js";
import { verifyCoverage } from "../src/stage4-verify.js";
import { retryFailedSections } from "../src/stage5-retry.js";
import { validateGrounding } from "../src/stage5a-grounding.js";
import type {
  GenerationPlan,
  NormalizedSource,
  PlannedSection,
  RequiredEvidenceTarget,
  SectionOutput,
  SourceOutline,
} from "../src/types.js";
import {
  assertEqual,
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

export const reviewerExplanatoryRepairSuite: EvalSuite = {
  name: "Reviewer explanatory repair hardening",
  cases: [
    imperativeExplanationCase(),
    conceptualVerbCase(),
    codeAsExplanationCase(),
    codeBackedExplanationCase(),
    fragmentaryExplanationCase(),
    disguisedSourceDumpCase(),
    descriptiveSourceDumpCase(),
    protectedTypedEvidenceCase(),
    targetedRepairPreservesExplanationCase(),
    missingSectionRecoveryCase(),
    learnerCommandKeyPointCase(),
    conciseExplanationCase(),
  ],
};

function imperativeExplanationCase(): EvalCase {
  return { name: "learner-directed imperative explanations fail generically", run: async () => {
    const commands = [
      "Calculate the measure using the following values.",
      "Try the example below.",
      "Observe how the stored process works.",
      "Run the following code.",
      "Create a record using these entries.",
    ];
    return commands.flatMap((command) => {
      const concept = "A recorded method preserves source values.";
      const context = contextFor("Recorded method", [concept, command], [target("concept", "concept", concept)]);
      return assertEqual(
        diagnoseStudentVisibleUsefulness({
          ...context,
          output: outputFor(context.section, command, [concept], "imperative"),
        }).some((issue) => issue.type === "INSTRUCTIONAL_NOISE" && issue.fieldPath === "sourceCore.explanation"),
        true,
        `Imperative explanation was not classified: ${command}`,
      );
    });
  } };
}

function conceptualVerbCase(): EvalCase {
  return { name: "a conceptual sentence containing a verb remains valid", run: async () =>
    assertEqual(
      isInstructionalNoiseText("A stored process produces one value at a time."),
      false,
      "Declarative concept sentence was classified as a learner command.",
    ) };
}

function codeAsExplanationCase(): EvalCase {
  return { name: "code cannot substitute for an explanation", run: async () => {
    const code = "def stored_process():\n    yield 1";
    const inlineCode = "Using a stored process values = [1, 2] result = (value for value in values if value == 1) print(result)";
    const context = contextFor("Stored process", ["A stored process yields values on request.", code, inlineCode], [
      target("code", "code", code),
    ]);
    return [code, inlineCode].flatMap((explanation) => {
      const issues = diagnoseStudentVisibleUsefulness({
        ...context,
        output: outputFor(context.section, explanation, [code], "code-only"),
      });
      return assertEqual(
        issues.some((issue) => issue.fieldPath === "sourceCore.explanation"),
        true,
        `Code-only explanation passed usefulness: ${JSON.stringify(issues)}.`,
      );
    });
  } };
}

function codeBackedExplanationCase(): EvalCase {
  return { name: "source-supported prose may explain protected code", run: async () => {
    const explanation = "A stored process yields values on request.";
    const code = "def stored_process():\n    yield 1";
    const context = contextFor("Stored process", [explanation, code], [target("code", "code", code)]);
    const issues = diagnoseStudentVisibleUsefulness({
      ...context,
      output: outputFor(context.section, explanation, [code], "code-backed"),
    });
    return assertEqual(issues.length, 0, "Useful prose plus protected code was rejected.");
  } };
}

function fragmentaryExplanationCase(): EvalCase {
  return { name: "fragmentary explanations fail without requiring verbose prose", run: async () => {
    const context = contextFor("Stored calculation", ["A stored calculation combines recorded values."]);
    const fragments = ["Using calculations.", "For calculating values.", "The stored calculation.", "Shown below."];
    return fragments.flatMap((explanation) => assertEqual(
      diagnoseStudentVisibleUsefulness({
        ...context,
        output: outputFor(context.section, explanation, ["A stored calculation combines recorded values."], "fragment"),
      }).some((issue) => issue.fieldPath === "sourceCore.explanation"),
      true,
      `Fragmentary explanation passed: ${explanation}; issues=${JSON.stringify(diagnoseStudentVisibleUsefulness({
        ...context,
        output: outputFor(context.section, explanation, ["A stored calculation combines recorded values."], "fragment"),
      }))}`,
    ));
  } };
}

function disguisedSourceDumpCase(): EvalCase {
  return { name: "a grounded grammatical instructional dump fails usefulness", run: async () => {
    const dump = "Read every supplied value carefully, calculate each intermediate quantity using the displayed procedure, write every answer in the worksheet, compare the completed entries with the worked example, observe the output, and then discuss the result with your group before submitting the final response.";
    const concept = "Recorded values determine the stored result.";
    const context = contextFor("Stored result", [concept, dump], [target("concept", "concept", concept)]);
    const issues = diagnoseStudentVisibleUsefulness({
      ...context,
      output: outputFor(context.section, dump, [concept], "dump"),
    });
    return assertEqual(
      issues.some((issue) => issue.type === "SOURCE_DUMP" || issue.type === "INSTRUCTIONAL_NOISE"),
      true,
      "Grounded instructional dump passed usefulness.",
    );
  } };
}

function descriptiveSourceDumpCase(): EvalCase {
  return { name: "a grounded descriptive passage is still too large for an explanation", run: async () => {
    const dump = Array.from({ length: 72 }, (_, index) => `recorded-detail-${index + 1}`).join(" ") + ".";
    const concept = "Recorded details preserve source values.";
    const context = contextFor("Recorded details", [concept, dump], [target("concept", "concept", concept)]);
    const issues = diagnoseStudentVisibleUsefulness({
      ...context,
      output: outputFor(context.section, dump, [concept], "descriptive-dump"),
    });
    return assertEqual(
      issues.some((issue) => issue.type === "SOURCE_DUMP" && issue.fieldPath === "sourceCore.explanation"),
      true,
      "Oversized grounded explanation passed usefulness.",
    );
  } };
}

function protectedTypedEvidenceCase(): EvalCase {
  return { name: "typed evidence remains valid beside a useful explanation", run: async () => {
    const explanation = "Recorded rows preserve each source value and label.";
    const values: readonly [RequiredEvidenceTarget["kind"], string][] = [
      ["formula", "r = total / count"],
      ["result-value", "The stored result is 42."],
      ["table-row", "1.1.24 | Stored account | 42"],
      ["code", "function* stored() { yield 42; }"],
      ["list-item", "Stored label"],
    ];
    const context = contextFor("Stored evidence", [explanation, ...values.map(([, value]) => value)],
      values.map(([kind, value], index) => target(`typed-${index}`, kind, value)));
    const issues = diagnoseStudentVisibleUsefulness({
      ...context,
      output: outputFor(context.section, explanation, values.map(([, value]) => value), "typed"),
    });
    return assertEqual(issues.length, 0, "Required typed evidence was rejected.");
  } };
}

function targetedRepairPreservesExplanationCase(): EvalCase {
  return { name: "targeted completion preserves good prose without dumping the bundle", run: async () => {
    const explanation = "Stored categories retain their source-supported distinctions.";
    const items = ["Alpha is retained.", "Beta is retained.", "Gamma is retained."];
    const context = contextFor("Stored categories", [explanation, ...items],
      items.map((item, index) => target(`item-${index}`, "list-item", item)));
    const initial = outputFor(context.section, explanation, items.slice(0, 2), "initial");
    const provider = new FakeProvider([outputFor(context.section, "Replacement prose must not win.", [items[2]!], "repair")]);
    const outputs = await retry(context, [initial], provider);
    return [
      ...assertEqual(outputs[0]?.sourceCore.explanation, explanation, "Good explanation was replaced."),
      ...assertEqual(outputs[0]?.sourceCore.keyPoints.length, 3, "Repair dumped or lost evidence."),
      ...assertEqual(findMissingRequiredEvidenceTargets(context.section, outputs[0]).length, 0, "Targeted repair stayed incomplete."),
    ];
  } };
}

function missingSectionRecoveryCase(): EvalCase {
  return { name: "a source-supported missing section can be recovered", run: async () => {
    const explanation = "A stored calculation combines recorded values.";
    const context = contextFor("Stored calculation", [explanation], [target("concept", "concept", explanation)]);
    const provider = new FakeProvider([outputFor(context.section, explanation, [explanation], "recovered")]);
    const outputs = await retry(context, [], provider);
    return [
      ...assertEqual(outputs.length, 1, "Source-supported planned section silently remained absent."),
      ...assertEqual(outputs[0]?.sourceCore.explanation, explanation, "Recovered section lost its explanation."),
      ...assertEqual(findMissingRequiredEvidenceTargets(context.section, outputs[0]).length, 0, "Recovered section lacks required evidence."),
    ];
  } };
}

function learnerCommandKeyPointCase(): EvalCase {
  return { name: "individual learner-command key points are removed", run: async () => {
    const concept = "A stored iterator yields one value at a time.";
    const command = "Observe how the stored iterator yields each value.";
    const context = contextFor("Stored iterator", [concept, command], [target("concept", "concept", concept)]);
    const provider = new FakeProvider([outputFor(context.section, concept, [concept, command], "provider")]);
    const generated = await generateSection({ ...context, provider });
    const visible = [generated.sourceCore.explanation, ...generated.sourceCore.keyPoints].join("\n");
    return [
      ...assertEqual(generated.sourceCore.keyPoints.includes(command), false, "Learner command leaked into key points."),
      ...assertEqual(visible.includes(concept), true, "Adjacent concept was removed with command."),
    ];
  } };
}

function conciseExplanationCase(): EvalCase {
  return { name: "a concise source-supported explanation remains valid", run: async () => {
    const explanation = "The result is the total divided by the value count.";
    const context = contextFor("Stored result", [explanation], [target("concept", "concept", explanation)]);
    return assertEqual(diagnoseStudentVisibleUsefulness({
      ...context,
      output: outputFor(context.section, explanation, [explanation], "concise"),
    }).length, 0, "Concise explanation was rejected merely for length.");
  } };
}

async function retry(context: ReturnType<typeof contextFor>, outputs: readonly SectionOutput[], provider: FakeProvider) {
  return retryFailedSections({
    ...context,
    outputs,
    provider,
    coverage: verifyCoverage({ ...context, outputs }),
    grounding: validateGrounding({ ...context, outputs }),
    leakage: validateLeakage({ ...context, outputs }),
    retryPolicy: { maxRetries: 1, retryWeakSections: true, retryFailedSections: true },
  });
}

function contextFor(
  title: string,
  labels: readonly string[],
  targets: readonly RequiredEvidenceTarget[] = [],
) {
  const text = labels.join("\n");
  const source: NormalizedSource = {
    id: "b14-source", title, kind: "document", language: "en", metadata: {},
    blocks: [{ id: "source-block", kind: "paragraph", text, order: 0 }],
    createdAt: "2026-09-04T00:00:00.000Z",
  };
  const section: PlannedSection = {
    id: "planned-section", sourceSectionId: "outline-section", title, order: 0,
    schemaKind: "concept-card",
    target: { objective: `Explain ${title}.`, itemCount: targets.length, focus: title,
      requiredSourceBlockIds: ["source-block"], expectedTags: ["concept"], coverageRules: ["Represent source evidence."] },
    sourceBlockIds: ["source-block"], tokenWeight: 20, targetItemCount: targets.length,
    sourceStartOffset: 0, sourceEndOffset: text.length,
    semanticPlan: { kind: "concept", units: [], explanationUseful: true },
    requiredEvidence: targets, supportingSourceBlockIds: [],
  };
  const outline: SourceOutline = {
    id: "b14-outline", sourceId: source.id, title,
    sections: [{ id: section.sourceSectionId, title, order: 0, startOffset: 0, endOffset: text.length,
      tokenWeight: 20, sourceBlockIds: ["source-block"], blockIds: ["source-block"],
      roughStartBlockId: "source-block", roughEndBlockId: "source-block", tags: ["concept"], confidence: 1 }],
  };
  const plan: GenerationPlan = {
    id: "b14-plan", sourceId: source.id, outlineId: outline.id, title,
    sections: [section], metadata: { sectionCount: 1, sourceBlockCount: 1 }, sourceOutline: outline,
  };
  return { source, section, outline, plan };
}

function target(id: string, kind: RequiredEvidenceTarget["kind"], label: string): RequiredEvidenceTarget {
  return { id, kind, label, evidenceTexts: [label], sourceBlockIds: ["source-block"],
    provenance: [{ sourceBlockId: "source-block", sourceOrder: 0 }] };
}

function outputFor(section: PlannedSection, explanation: string, keyPoints: readonly string[], id: string): SectionOutput {
  return { id, kind: "concept-card", plannedSectionId: section.id, title: section.title,
    sourceBlockIds: [...section.sourceBlockIds], sourceCore: { explanation, keyPoints }, enrichment: null };
}

export async function runReviewerExplanatoryRepairEvals(): Promise<boolean> {
  const result = await runEvalSuite(reviewerExplanatoryRepairSuite);
  printEvalSuiteResult(result);
  setFailureExitCode([result]);
  return result.status === "passed";
}

if (isDirectExecution(import.meta.url)) await runReviewerExplanatoryRepairEvals();
