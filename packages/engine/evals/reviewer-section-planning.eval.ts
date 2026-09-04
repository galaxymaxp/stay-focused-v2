import type { GenerationProvider, GenerationRequest } from "../src/provider.js";
import { diagnoseStudentVisibleUsefulness } from "../src/reviewer-usefulness.js";
import { normalizeSource } from "../src/stage0-normalize.js";
import { detectOutline } from "../src/stage1-outline.js";
import { buildGenerationPlan } from "../src/stage2-plan.js";
import { generateSection } from "../src/stage3-generate.js";
import { verifyCoverage } from "../src/stage4-verify.js";
import { validateGrounding } from "../src/stage5a-grounding.js";
import { validateLeakage } from "../src/leakage-guard.js";
import { assembleReviewer } from "../src/stage6-assemble.js";
import { runPipeline } from "../src/generate.js";
import type {
  GenerationPlan,
  NormalizedSource,
  PlannedSection,
  ReviewerSection,
  SectionOutput,
  SourceOutline,
  SourceOutlineSection,
} from "../src/types.js";
import {
  assertDeepEqual,
  assertEqual,
  isDirectExecution,
  printEvalSuiteResult,
  runEvalSuite,
  setFailureExitCode,
} from "./assert.js";
import type { EvalCase, EvalSuite } from "./types.js";

type Disposition = "standalone" | "structural" | "typed-evidence" | "unsupported";
type DisposedSection = PlannedSection & { readonly reviewerDisposition?: Disposition };
type RepresentedSection = ReviewerSection & { readonly representation?: Disposition };

class EchoProvider implements GenerationProvider {
  public readonly requests: GenerationRequest<unknown>[] = [];

  public async generate<TOutput>(request: GenerationRequest<TOutput>): Promise<TOutput> {
    this.requests.push(request as GenerationRequest<unknown>);
    const plannedSectionId = String(request.metadata?.plannedSectionId ?? "");
    const schemaKind = String(request.metadata?.schemaKind ?? "concept-card") as SectionOutput["kind"];
    const title = "Child A";
    const explanation = "Child A has explanatory source content.";
    return {
      id: `output-${plannedSectionId}`,
      kind: schemaKind,
      plannedSectionId,
      title,
      sourceBlockIds: ["child", "child-body"],
      sourceCore: { explanation, keyPoints: [explanation] },
      enrichment: null,
    } as TOutput;
  }
}

export const reviewerSectionPlanningSuite: EvalSuite = {
  name: "Reviewer evidence-supported section planning",
  cases: [
    headingOnlyParentCase(),
    headingOnlyLeafCase(),
    typedOnlyCase("code", "code-only source becomes typed evidence", "def values():\n    yield 1"),
    typedOnlyCase("formula", "formula-only source remains owned typed evidence", "mean = total / count"),
    typedOnlyCase("table", "table-only source remains owned typed evidence", "Account | Debit | Credit\nCash | 100 |"),
    conciseStandaloneCase(),
    requiredEvidenceOwnershipCase(),
    noSiblingBorrowingCase(),
    parentChildLocalityCase(),
    structuralAssemblyCase(),
    requiredParentCannotHideCase(),
    frozenUsefulnessCase(),
  ],
};

function headingOnlyParentCase(): EvalCase {
  return { name: "heading-only parent is structural while supported children remain standalone", run: async () => {
    const context = await contextFor([
      node("parent", "Parent Heading", "heading", "Parent Heading"),
      node("child-a", "Child A", "heading", "Child A", "parentheading"),
      bodyNode("child-a-body", "paragraph", "Child A has explanatory source content.", "child-a"),
      node("child-b", "Child B", "heading", "Child B", "parentheading"),
      bodyNode("child-b-body", "paragraph", "Child B has explanatory source content.", "child-b"),
    ]);
    return [
      ...assertEqual(disposition(context, "parent"), "structural", "Heading-only parent was still explanatory output."),
      ...assertEqual(disposition(context, "child-a"), "standalone", "Supported child A was not standalone."),
      ...assertEqual(disposition(context, "child-b"), "standalone", "Supported child B was not standalone."),
    ];
  } };
}

function headingOnlyLeafCase(): EvalCase {
  return { name: "heading-only leaf is explicitly unsupported", run: async () => {
    const context = await contextFor([node("leaf", "Empty Heading", "heading", "Empty Heading")]);
    return assertEqual(disposition(context, "leaf"), "unsupported", "Empty leaf was planned as explanatory content.");
  } };
}

function typedOnlyCase(kind: "code" | "formula" | "table", name: string, evidence: string): EvalCase {
  return { name, run: async () => {
    const context = await contextFor([
      node("typed", "Stored Evidence", "heading", "Stored Evidence"),
      bodyNode("typed-body", kind, evidence, "typed"),
    ]);
    const section = sectionFor(context, "typed");
    const provider = new EchoProvider();
    const output = await generateSection({ section, plan: context.plan, source: context.source, provider });
    const reports = {
      coverage: verifyCoverage({ ...context, outputs: [output] }),
      grounding: validateGrounding({ ...context, outputs: [output] }),
      leakage: validateLeakage({ plan: context.plan, outputs: [output] }),
    };
    const reviewer = assembleReviewer({ ...context, outputs: [output], ...reports });
    return [
      ...assertEqual(disposition(context, "typed"), "typed-evidence", `${kind} evidence was not typed-only.`),
      ...assertEqual(provider.requests.length, 0, `${kind} evidence unnecessarily called the provider.`),
      ...assertEqual(output.sourceCore.explanation, "", `${kind} evidence masqueraded as an explanation.`),
      ...assertEqual(output.sourceCore.keyPoints.includes(evidence), true, `${kind} evidence was lost.`),
      ...assertEqual(reports.coverage.status, "passed", `${kind} evidence failed coverage.`),
      ...assertEqual(reports.grounding.status, "passed", `${kind} evidence failed grounding.`),
      ...assertEqual(reviewer.sections[0]?.representation, "typed-evidence", `${kind} evidence did not assemble as typed evidence.`),
    ];
  } };
}

function conciseStandaloneCase(): EvalCase {
  return { name: "concise explanatory source remains a standalone section", run: async () => {
    const context = await contextFor([
      node("supported", "Mean", "heading", "Mean"),
      bodyNode("mean-body", "paragraph", "The mean is the sum of the values divided by the number of values.", "supported"),
    ]);
    return assertEqual(disposition(context, "supported"), "standalone", "Concise explanation was demoted.");
  } };
}

function requiredEvidenceOwnershipCase(): EvalCase {
  return { name: "required evidence survives structural parent classification with one owner", run: async () => {
    const formula = "mean = total / count";
    const context = await contextFor([
      node("parent", "Measures", "heading", "Measures"),
      node("child", "Mean Formula", "heading", "Mean Formula", "measures"),
      bodyNode("formula", "formula", formula, "child"),
    ]);
    const targets = context.plan.sections.flatMap((section) =>
      (section.requiredEvidence ?? []).map((target) => ({ owner: section.sourceSectionId, label: target.label })),
    );
    return [
      ...assertEqual(disposition(context, "parent"), "structural", "Parent was not structural."),
      ...assertEqual(targets.length > 0, true, "Required formula target disappeared."),
      ...assertEqual(targets.every((target) => target.owner === "child"), true, "Required target changed source owner."),
    ];
  } };
}

function noSiblingBorrowingCase(): EvalCase {
  return { name: "sibling prose cannot support a heading-only section", run: async () => {
    const context = await contextFor([
      node("a", "Heading A", "heading", "Heading A"),
      node("b", "Heading B", "heading", "Heading B"),
      bodyNode("b-body", "paragraph", "Heading B has its own explanatory paragraph.", "b"),
    ]);
    return [
      ...assertEqual(disposition(context, "a"), "unsupported", "A borrowed B's prose."),
      ...assertEqual(disposition(context, "b"), "standalone", "B lost its local prose."),
    ];
  } };
}

function parentChildLocalityCase(): EvalCase {
  return { name: "child evidence is not duplicated into a structural parent", run: async () => {
    const context = await contextFor([
      node("parent", "Parent", "heading", "Parent"),
      node("child", "Child", "heading", "Child", "parent"),
      bodyNode("child-body", "paragraph", "Child has locally explanatory evidence.", "child"),
    ]);
    const parent = sectionFor(context, "parent");
    const child = sectionFor(context, "child");
    return [
      ...assertEqual(parent.sourceBlockIds.includes("child-body"), false, "Parent duplicated child evidence."),
      ...assertEqual(child.sourceBlockIds.includes("child-body"), true, "Child lost local evidence."),
    ];
  } };
}

function structuralAssemblyCase(): EvalCase {
  return { name: "assembly accepts structural nodes without provider retries", run: async () => {
    const provider = new EchoProvider();
    const reviewer = await runPipeline({
      input: {
        id: "assembly-source",
        title: "Parent Heading",
        kind: "document",
        blocks: [
          { id: "parent", kind: "heading", text: "Parent Heading", order: 0, structuredBlock: structuredHeading("parent", "Parent Heading") },
          { id: "child", kind: "heading", text: "Child A", order: 1, structuredBlock: structuredHeading("child", "Child A", "parentheading") },
          { id: "child-body", kind: "paragraph", text: "Child A has explanatory source content.", order: 2 },
        ],
      },
      provider,
    });
    const structural = reviewer.sections.find((section) => section.title === "Parent Heading") as RepresentedSection | undefined;
    return [
      ...assertEqual(structural?.representation, "structural", "Structural heading was not assembled explicitly."),
      ...assertEqual(structural?.items.length, 0, "Structural heading received fabricated content."),
      ...assertEqual(provider.requests.length, 1, "Structural heading consumed a provider call or retry."),
    ];
  } };
}

function requiredParentCannotHideCase(): EvalCase {
  return { name: "source-supported parent remains standalone even when it has children", run: async () => {
    const context = await contextFor([
      node("parent", "Parent", "heading", "Parent"),
      bodyNode("parent-body", "paragraph", "The parent defines the locally supported concept.", "parent"),
      node("child", "Child", "heading", "Child", "parent"),
      bodyNode("child-body", "paragraph", "The child defines its own supported concept.", "child"),
    ]);
    return assertEqual(disposition(context, "parent"), "standalone", "Required parent content was hidden by structural classification.");
  } };
}

function frozenUsefulnessCase(): EvalCase {
  return { name: "B14 usefulness gates remain unchanged for normal sections", run: async () => {
    const context = await contextFor([
      node("supported", "Stored process", "heading", "Stored process"),
      bodyNode("body", "paragraph", "A stored process produces one value at a time.", "supported"),
    ]);
    const section = sectionFor(context, "supported");
    const issuesFor = (explanation: string, keyPoints: readonly string[] = ["A stored process produces one value at a time."]) =>
      diagnoseStudentVisibleUsefulness({ section, source: context.source, output: outputFor(section, explanation, keyPoints) });
    const longDump = Array.from({ length: 72 }, (_, index) => `detail-${index + 1}`).join(" ") + ".";
    return [
      ...assertEqual(issuesFor("Run the following code.").length > 0, true, "Imperative explanation passed."),
      ...assertEqual(issuesFor("def stored():\n    yield 1").length > 0, true, "Code explanation passed."),
      ...assertEqual(issuesFor("Using calculations.").length > 0, true, "Fragment passed."),
      ...assertEqual(issuesFor(longDump).length > 0, true, "Source dump passed."),
      ...assertEqual(issuesFor("A stored process produces one value at a time.").length, 0, "Concise explanation failed."),
    ];
  } };
}

interface SourceNodeSpec {
  readonly id: string;
  readonly title: string;
  readonly kind: "heading" | "paragraph" | "code" | "formula" | "table";
  readonly text: string;
  readonly ownerId: string;
  readonly parentKey?: string;
}

function node(id: string, title: string, kind: SourceNodeSpec["kind"], text: string, parentKey?: string): SourceNodeSpec {
  return { id, title, kind, text, ownerId: id, ...(parentKey ? { parentKey } : {}) };
}

function bodyNode(id: string, kind: SourceNodeSpec["kind"], text: string, ownerId: string): SourceNodeSpec {
  return { id, title: "", kind, text, ownerId };
}

async function contextFor(specs: readonly SourceNodeSpec[]) {
  const headings = specs.filter((spec) => spec.kind === "heading");
  const blocks = specs.map((spec, order) => ({
    id: spec.id,
    kind: spec.kind,
    text: spec.text,
    order,
    pageNumber: 1,
    ...(spec.kind === "heading"
      ? { structuredBlock: structuredHeading(spec.id, spec.text, spec.parentKey, order) }
      : spec.kind === "code" || spec.kind === "formula" || spec.kind === "table"
      ? { structuredBlock: structuredEvidence(spec.id, spec.kind, spec.text, order) }
      : {}),
  }));
  const source = await normalizeSource({ id: "b15-source", title: "B15 source", kind: "document", blocks });
  const outlineSections: SourceOutlineSection[] = headings.map((heading, order) => {
    const owned = specs.filter((spec) => spec.ownerId === heading.id).map((spec) => spec.id);
    return {
      id: heading.id,
      title: heading.title,
      order,
      startOffset: 0,
      endOffset: owned.map((id) => source.blocks.find((block) => block.id === id)?.text ?? "").join("\n").length,
      tokenWeight: 20,
      sourceBlockIds: owned,
      blockIds: owned,
      roughStartBlockId: owned[0] ?? heading.id,
      roughEndBlockId: owned.at(-1) ?? heading.id,
      tags: ["concept"],
      confidence: 1,
      ...(heading.parentKey ? { conceptualParentKey: heading.parentKey } : {}),
    };
  });
  const outline: SourceOutline = { id: "b15-outline", sourceId: source.id, title: source.title, sections: outlineSections };
  const plan = buildGenerationPlan(outline, source);
  return { source, outline, plan };
}

function structuredHeading(id: string, text: string, parentKey?: string, order = 0) {
  return {
    id,
    type: "heading" as const,
    text,
    level: parentKey ? 2 : 1,
    pageNumber: 1,
    order,
    provenance: { pageNumber: 1, blockId: id, parser: "docling" as const },
    ...(parentKey ? { parentId: parentKey } : {}),
  };
}

function structuredEvidence(id: string, kind: "code" | "formula" | "table", text: string, order: number) {
  const base = {
    id,
    pageNumber: 1,
    order,
    provenance: { pageNumber: 1, blockId: id, parser: "docling" as const },
  };
  if (kind === "code") return { ...base, type: "code" as const, text };
  if (kind === "formula") return { ...base, type: "formula" as const, rawText: text };
  return {
    ...base,
    type: "table" as const,
    rows: text.split("\n").map((line, rowIndex) => ({
      index: rowIndex,
      cells: line.split("|").map((cell, columnIndex) => ({
        id: `${id}-cell-${rowIndex}-${columnIndex}`,
        rowIndex,
        columnIndex,
        rowSpan: 1,
        columnSpan: 1,
        text: cell.trim(),
        provenance: { pageNumber: 1, blockId: `${id}-cell-${rowIndex}-${columnIndex}`, parser: "docling" as const },
      })),
    })),
  };
}

function sectionFor(context: { readonly plan: GenerationPlan }, sourceSectionId: string): PlannedSection {
  const section = context.plan.sections.find((candidate) => candidate.sourceSectionId === sourceSectionId);
  if (!section) throw new Error(`Missing planned section for ${sourceSectionId}.`);
  return section;
}

function disposition(context: { readonly plan: GenerationPlan }, sourceSectionId: string): Disposition | undefined {
  return (sectionFor(context, sourceSectionId) as DisposedSection).reviewerDisposition;
}

function outputFor(section: PlannedSection, explanation: string, keyPoints: readonly string[]): SectionOutput {
  return {
    id: `output-${section.id}`,
    kind: section.schemaKind,
    plannedSectionId: section.id,
    title: section.title,
    sourceBlockIds: [...section.sourceBlockIds],
    sourceCore: { explanation, keyPoints },
    enrichment: null,
  } as SectionOutput;
}

export async function runReviewerSectionPlanningEvals(): Promise<boolean> {
  const result = await runEvalSuite(reviewerSectionPlanningSuite);
  printEvalSuiteResult(result);
  setFailureExitCode([result]);
  return result.status === "passed";
}

if (isDirectExecution(import.meta.url)) await runReviewerSectionPlanningEvals();
