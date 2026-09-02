import { validateLeakage } from "../src/leakage-guard.js";
import { normalizeSource } from "../src/stage0-normalize.js";
import { detectOutline } from "../src/stage1-outline.js";
import { buildGenerationPlan } from "../src/stage2-plan.js";
import { verifyCoverage } from "../src/stage4-verify.js";
import { validateGrounding } from "../src/stage5a-grounding.js";
import { assembleReviewer } from "../src/stage6-assemble.js";
import type {
  NormalizedSource,
  PlannedSection,
  SectionOutput,
  SourceOutline,
} from "../src/types.js";
import type {
  StructuredBlock,
  StructuredDocument,
} from "../src/structured-document.js";
import {
  assertDeepEqual,
  assertEqual,
  isDirectExecution,
  printEvalSuiteResult,
  runEvalSuite,
  setFailureExitCode,
} from "./assert.js";
import type { EvalCase, EvalIssue, EvalSuite } from "./types.js";

export const typedReviewerHardeningSuite: EvalSuite = {
  name: "Typed reviewer hierarchy and grounding",
  cases: [
    furnitureHeadingSuppressionCase(),
    repeatedHeadingConsolidationCase(),
    subordinateEvidencePreservationCase(),
    tableCellGroundingCase(),
    formulaGroundingCase(),
    relationshipGroupingCase(),
    missingEvidenceRefusalCase(),
    studentVisibleStructureGateCase(),
    typedEvidenceGroundingClassificationCase(),
  ],
};

function furnitureHeadingSuppressionCase(): EvalCase {
  return {
    name: "A. furniture-heading suppression",
    run: async () => {
      const { outline } = await createHierarchyFixture();
      return assertDeepEqual(
        outline.sections.map((section) => section.title),
        ["GENERATORS", "Generator Expressions"],
        "Typed presentation furniture became conceptual reviewer sections.",
      );
    },
  };
}

function repeatedHeadingConsolidationCase(): EvalCase {
  return {
    name: "B. repeated-heading consolidation",
    run: async () => {
      const { outline } = await createHierarchyFixture();
      const distinctParents = await createDistinctParentRepeatFixture();
      return [
        ...assertEqual(
          outline.sections.filter((section) => section.title === "Generator Expressions").length,
          1,
          "Equivalent typed headings in one conceptual region were not consolidated.",
        ),
        ...assertEqual(
          outline.sections.some((section) => /Generator Expressions \d+$/u.test(section.title)),
          false,
          "A numeric suffix was added to a repeated conceptual heading.",
        ),
        ...assertEqual(
          distinctParents.sections.filter((section) => section.title === "Shared Evidence").length,
          2,
          "Same-named concepts under distinct typed parents were incorrectly merged.",
        ),
        ...assertEqual(
          new Set(
            distinctParents.sections
              .filter((section) => section.title === "Shared Evidence")
              .map((section) => section.conceptualParentKey),
          ).size,
          2,
          "Distinct conceptual parent identity was not preserved into the outline.",
        ),
      ];
    },
  };
}

function subordinateEvidencePreservationCase(): EvalCase {
  return {
    name: "C. subordinate-evidence preservation",
    run: async () => {
      const { outline, source } = await createHierarchyFixture();
      const expressionSection = outline.sections.find(
        (section) => section.title === "Generator Expressions",
      );
      const retainedTexts = expressionSection?.sourceBlockIds.map(
        (id) => source.blocks.find((block) => block.id === id)?.text,
      ) ?? [];
      return [
        ...assertEqual(
          retainedTexts.includes("An example introduction."),
          true,
          "Suppressing an example heading discarded its child paragraph.",
        ),
        ...assertEqual(
          retainedTexts.includes("yield item"),
          true,
          "Suppressing an example heading discarded its code evidence.",
        ),
        ...assertEqual(
          retainedTexts.includes("Complete the classroom prompt."),
          true,
          "Suppressing an instructional heading discarded its child evidence.",
        ),
      ];
    },
  };
}

function tableCellGroundingCase(): EvalCase {
  return {
    name: "D. table cell grounding",
    run: async () => {
      const context = await createTypedEvidenceContext({
        tableRows: [
          ["Interval", "Frequency"],
          ["67–69", "4"],
        ],
      });
      const output = outputFor(context.section, {
        explanation: "The source table records the interval 67–69 with frequency 4.",
        keyPoints: ["Interval 67–69 | Frequency 4"],
      });
      const grounding = validateGrounding({
        plan: context.plan,
        outputs: [output],
        source: context.source,
        outline: context.outline,
      });
      const partialCellOutput = outputFor(context.section, {
        explanation: "The source table records interval 67 with frequency 4.",
        keyPoints: ["Interval 67 | Frequency 4"],
      });
      const partialCellGrounding = validateGrounding({
        plan: context.plan,
        outputs: [partialCellOutput],
        source: context.source,
        outline: context.outline,
      });
      return [
        ...assertEqual(
          grounding.issues.some((issue) =>
            issue.type === "grounding-fabrication" && issue.offendingText?.includes("67–69")
          ),
          false,
          "An exact structured cell value was rejected as unsupported.",
        ),
        ...assertEqual(
          context.source.blocks.some((block) =>
            block.structuredBlock?.type === "table" &&
            block.structuredBlock.rows[1]?.cells[0]?.provenance.tableCell?.rowIndex === 1
          ),
          true,
          "Table cell row/column provenance did not survive normalization.",
        ),
        ...assertEqual(
          partialCellGrounding.issues.some((issue) => issue.type === "grounding-fabrication"),
          true,
          "A substring of the structured 67–69 cell was incorrectly treated as exact cell evidence.",
        ),
      ];
    },
  };
}

function formulaGroundingCase(): EvalCase {
  return {
    name: "E. formula grounding",
    run: async () => {
      const context = await createTypedEvidenceContext({
        formulaRawText: "score = total / count",
        formulaLatex: "score=\\frac{total}{count}",
      });
      const output = outputFor(context.section, {
        explanation: "score = total / count",
        keyPoints: ["score = total / count"],
      });
      const grounding = validateGrounding({
        plan: context.plan,
        outputs: [output],
        source: context.source,
        outline: context.outline,
      });
      const transformed = outputFor(context.section, {
        explanation: "total = score * count",
        keyPoints: ["total = score * count"],
      });
      const transformedGrounding = validateGrounding({
        plan: context.plan,
        outputs: [transformed],
        source: context.source,
        outline: context.outline,
      });
      return [
        ...assertEqual(
          grounding.issues.some((issue) => issue.type === "grounding-fabrication"),
          false,
          "Formula raw text was lost when a parser LaTeX representation was present.",
        ),
        ...assertEqual(
          transformedGrounding.issues.some((issue) =>
            issue.type === "grounding-unsupported-relationship"
          ),
          true,
          "A model-derived algebraic transformation was automatically treated as source evidence.",
        ),
      ];
    },
  };
}

function relationshipGroupingCase(): EvalCase {
  return {
    name: "F. relationship grouping",
    run: async () => {
      const context = await createTypedEvidenceContext({
        formulaRawText: "index = total / count",
        formulaLatex: "index=\\frac{total}{count}",
        tableRows: [
          ["Total", "Count"],
          ["12", "3"],
        ],
        resultText: "The recorded result is 4.",
      });
      const evidenceGroups = (
        context.section as unknown as {
          readonly evidenceGroups?: readonly {
            readonly formulaBlockIds: readonly string[];
            readonly tableBlockIds: readonly string[];
            readonly resultBlockIds: readonly string[];
          }[];
        }
      ).evidenceGroups ?? [];
      const relationshipSection: PlannedSection = {
        ...context.section,
        semanticPlan: {
          kind: "category-hierarchy",
          units: [{ kind: "group", label: "Measured Index", items: ["12 | 3"] }],
          explanationUseful: true,
        },
      };
      const relationshipPlan = {
        ...context.plan,
        sections: [relationshipSection],
      };
      const relationshipOutput = outputFor(relationshipSection, {
        explanation: "The measured index uses recorded evidence.",
        keyPoints: ["Measured Index: 12 | 3"],
      });
      const grounding = validateGrounding({
        plan: relationshipPlan,
        outputs: [relationshipOutput],
        source: context.source,
        outline: context.outline,
      });
      const unsupportedRelationshipSection: PlannedSection = {
        ...context.section,
        semanticPlan: {
          kind: "list",
          units: [
            { kind: "point", label: "12", items: [] },
            { kind: "point", label: "3", items: [] },
          ],
          explanationUseful: true,
        },
      };
      const unsupportedRelationshipPlan = {
        ...context.plan,
        sections: [unsupportedRelationshipSection],
      };
      const unsupportedRelationshipOutput = outputFor(unsupportedRelationshipSection, {
        explanation: "The source records 12 and 3.",
        keyPoints: ["12 → 3"],
      });
      const unsupportedRelationshipGrounding = validateGrounding({
        plan: unsupportedRelationshipPlan,
        outputs: [unsupportedRelationshipOutput],
        source: context.source,
        outline: context.outline,
      });
      const explicitRelationshipContext = await createTypedEvidenceContext({
        tableRows: [
          ["Origin", "Destination"],
          ["12", "3"],
        ],
        resultText: "12 → 3",
      });
      const explicitRelationshipSection: PlannedSection = {
        ...explicitRelationshipContext.section,
        semanticPlan: unsupportedRelationshipSection.semanticPlan,
      };
      const explicitRelationshipGrounding = validateGrounding({
        plan: {
          ...explicitRelationshipContext.plan,
          sections: [explicitRelationshipSection],
        },
        outputs: [outputFor(explicitRelationshipSection, {
          explanation: "12 → 3",
          keyPoints: ["12 → 3"],
        })],
        source: explicitRelationshipContext.source,
        outline: explicitRelationshipContext.outline,
      });
      const conceptFamilies = await createConceptFamilyFixture();
      return [
        ...assertEqual(evidenceGroups.length > 0, true, "No typed evidence group reached the generation plan."),
        ...assertEqual(evidenceGroups[0]?.formulaBlockIds.length, 1, "The formula was not associated with its concept."),
        ...assertEqual(evidenceGroups[0]?.tableBlockIds.length, 1, "The table was not associated with its concept."),
        ...assertEqual(evidenceGroups[0]?.resultBlockIds.length, 1, "The result statement was not associated with its typed evidence."),
        ...assertEqual(
          grounding.issues.some((issue) => issue.type === "grounding-fabrication"),
          false,
          "A deterministic source-supported group plus exact table row was rejected as fabricated.",
        ),
        ...assertEqual(
          unsupportedRelationshipGrounding.issues.some((issue) =>
            issue.type === "grounding-unsupported-relationship"
          ),
          true,
          "Typed values in one evidence group authorized a relationship that the source never stated.",
        ),
        ...assertEqual(
          explicitRelationshipGrounding.issues.some((issue) =>
            issue.type === "grounding-unsupported-relationship"
          ),
          false,
          "An exact source-stated typed relationship was rejected.",
        ),
        ...assertDeepEqual(
          conceptFamilies.plan.sections.map((section) => section.title),
          ["Mean", "Median", "Mode"],
          "Typed Mean/Median/Mode concept boundaries were not preserved.",
        ),
        ...assertEqual(
          conceptFamilies.plan.sections.every((section) =>
            (section.evidenceGroups?.[0]?.formulaBlockIds.length ?? 0) === 1 &&
            (section.evidenceGroups?.[0]?.tableBlockIds.length ?? 0) === 1
          ),
          true,
          "A typed Mean/Median/Mode formula-table association was lost.",
        ),
      ];
    },
  };
}

function missingEvidenceRefusalCase(): EvalCase {
  return {
    name: "G. missing-evidence refusal",
    run: async () => {
      const context = await createTypedEvidenceContext({
        formulaRawText: "index = total / count",
        tableRows: [
          ["Interval", "Frequency"],
          ["70–72", "3"],
        ],
      });
      const output = outputFor(context.section, {
        explanation: "The missing interval 67–69 has frequency 4.",
        keyPoints: ["67–69 | 4"],
      });
      const grounding = validateGrounding({
        plan: context.plan,
        outputs: [output],
        source: context.source,
        outline: context.outline,
      });
      const formulaMissingContext = await createTypedEvidenceContext({
        tableRows: [["Label", "Recorded value"], ["Index", "4"]],
      });
      const inventedFormula = outputFor(formulaMissingContext.section, {
        explanation: "index = total / count",
        keyPoints: ["index = total / count"],
      });
      const formulaMissingGrounding = validateGrounding({
        plan: formulaMissingContext.plan,
        outputs: [inventedFormula],
        source: formulaMissingContext.source,
        outline: formulaMissingContext.outline,
      });
      return [
        ...assertEqual(grounding.status, "failed", "A missing table row was treated as source evidence."),
        ...assertEqual(
          grounding.issues.some((issue) => issue.type === "grounding-fabrication"),
          true,
          "A generated value absent from formula/table evidence was not rejected.",
        ),
        ...assertEqual(
          formulaMissingGrounding.issues.some((issue) => issue.type === "grounding-fabrication"),
          true,
          "A formula absent from the typed source evidence was not rejected.",
        ),
      ];
    },
  };
}

function studentVisibleStructureGateCase(): EvalCase {
  return {
    name: "H. student-visible structure gate",
    run: async () => {
      const source: NormalizedSource = {
        id: "structure-gate-source",
        title: "Neutral Lecture",
        kind: "presentation",
        language: "en",
        metadata: {},
        createdAt: "2026-01-01T00:00:00.000Z",
        blocks: [
          { id: "review-heading", kind: "heading", text: "REVIEW", order: 0 },
          { id: "review-body", kind: "paragraph", text: "Review the preceding material.", order: 1 },
        ],
      };
      const outline: SourceOutline = {
        id: "structure-gate-outline",
        sourceId: source.id,
        title: source.title,
        sections: [{
          id: "review-section",
          title: "REVIEW",
          order: 0,
          startOffset: 0,
          endOffset: 37,
          tokenWeight: 5,
          sourceBlockIds: ["review-heading", "review-body"],
          blockIds: ["review-heading", "review-body"],
          roughStartBlockId: "review-heading",
          roughEndBlockId: "review-body",
          tags: ["concept"],
          confidence: 0.9,
        }],
      };
      const plan = buildGenerationPlan(outline, source);
      const section = requireSection(plan.sections[0]);
      const output = outputFor(section, {
        explanation: "Review the preceding material.",
        keyPoints: ["Review the preceding material."],
      });
      const diagnostics = {
        furniture: assemblyDiagnostic({ plan, outputs: [output], source, outline }),
        bodyFragment: assemblyDiagnostic({
          plan,
          outputs: [{ ...output, title: "Examples:" }],
          source,
          outline,
        }),
        codeTitle: assemblyDiagnostic({
          plan,
          outputs: [{ ...output, title: "yield(value);" }],
          source,
          outline,
        }),
        empty: assemblyDiagnostic({
          plan,
          outputs: [{
            ...output,
            title: "Measured Concept",
            sourceCore: { explanation: "", keyPoints: [] },
          }],
          source,
          outline,
        }),
        noise: assemblyDiagnostic({
          plan,
          outputs: [{
            ...output,
            title: "Measured Concept",
            sourceCore: {
              explanation: "Review the preceding material.",
              keyPoints: [
                "Review the preceding material.",
                "Review the preceding material.",
                "Review the preceding material.",
              ],
            },
          }],
          source,
          outline,
        }),
      };
      const duplicateSection: PlannedSection = {
        ...section,
        id: `${section.id}-duplicate`,
        order: 1,
      };
      const duplicatePlan = {
        ...plan,
        sections: [section, duplicateSection],
        metadata: { ...plan.metadata, sectionCount: 2 },
      };
      const duplicateOutput = {
        ...output,
        id: `${output.id}-duplicate`,
        plannedSectionId: duplicateSection.id,
        title: "Measured Concept",
      };
      const duplicateDiagnostic = assemblyDiagnostic({
        plan: duplicatePlan,
        outputs: [{ ...output, title: "Measured Concept" }, duplicateOutput],
        source,
        outline,
      });
      const oversizedDiagnostic = createOversizedStructureDiagnostic();

      return [
        ...assertEqual(diagnostics.furniture.includes("PRESENTATION_FURNITURE_HEADING"), true, "Assembly accepted an objective presentation-furniture section."),
        ...assertEqual(diagnostics.bodyFragment.includes("TITLE_BODY_FRAGMENT"), true, "Assembly accepted a body-fragment title."),
        ...assertEqual(diagnostics.codeTitle.includes("CODE_TITLE"), true, "Assembly accepted a code fragment as a title."),
        ...assertEqual(diagnostics.empty.includes("EMPTY_EXPLANATION"), true, "Assembly accepted an empty student-visible section."),
        ...assertEqual(diagnostics.noise.includes("STRUCTURAL_NOISE"), true, "Assembly accepted repeated structural noise."),
        ...assertEqual(duplicateDiagnostic.includes("DUPLICATE_SECTION"), true, "Assembly accepted duplicate conceptual sections."),
        ...assertEqual(oversizedDiagnostic.includes("OVERSIZED_SECTION"), true, "Assembly accepted a section containing multiple hidden concept transitions."),
      ];
    },
  };
}

function typedEvidenceGroundingClassificationCase(): EvalCase {
  return {
    name: "I. typed-evidence grounding classification",
    run: async () => {
      const context = await createTypedEvidenceContext({
        formulaRawText: "ratio = left / right",
        formulaLatex: "ratio=\\frac{left}{right}",
        tableRows: [
          ["Interval", "Frequency"],
          ["67–69", "4"],
        ],
        resultText: "The recorded result is 4.",
      });
      const supported = validateGrounding({
        plan: context.plan,
        outputs: [outputFor(context.section, {
          explanation: "ratio = left / right",
          keyPoints: ["67–69", "The recorded result is 4."],
        })],
        source: context.source,
        outline: context.outline,
      });
      const unsupportedTransformation = validateGrounding({
        plan: context.plan,
        outputs: [outputFor(context.section, {
          explanation: "left = ratio * right",
          keyPoints: ["left = ratio * right"],
        })],
        source: context.source,
        outline: context.outline,
      });
      const absentValue = validateGrounding({
        plan: context.plan,
        outputs: [outputFor(context.section, {
          explanation: "The missing frequency is 5.",
          keyPoints: ["Frequency 5"],
        })],
        source: context.source,
        outline: context.outline,
      });
      return [
        ...assertEqual(
          supported.issues.some((issue) => issue.type === "grounding-fabrication"),
          false,
          "Correct typed formula, cell, and result evidence was classified as absent.",
        ),
        ...assertEqual(
          unsupportedTransformation.issues.some((issue) =>
            issue.type === "grounding-unsupported-relationship"
          ),
          true,
          "An unsupported model transformation was not classified as such.",
        ),
        ...assertEqual(
          absentValue.issues.some((issue) => issue.type === "grounding-fabrication"),
          true,
          "A source-absent numeric value was not classified as fabrication.",
        ),
      ];
    },
  };
}

function createOversizedStructureDiagnostic(): string {
  const pointTexts = [
    "Alpha Cluster",
    "Beta Cluster",
    "Gamma Cluster",
    ...Array.from({ length: 9 }, (_value, index) =>
      `Recorded evidence statement ${index + 1}.`
    ),
  ];
  const blocks: NormalizedSource["blocks"] = [
    { id: "oversized-title", kind: "heading", text: "Measured Concept", order: 0 },
    ...pointTexts.map((text, index) => ({
      id: `oversized-${index}`,
      kind: index < 3 ? "heading" as const : "paragraph" as const,
      text,
      order: index + 1,
    })),
  ];
  const source: NormalizedSource = {
    id: "oversized-source",
    title: "Measured Concept",
    kind: "document",
    language: "en",
    metadata: {},
    blocks,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  const sourceBlockIds = blocks.map((block) => block.id);
  const outline: SourceOutline = {
    id: "oversized-outline",
    sourceId: source.id,
    title: source.title,
    sections: [{
      id: "oversized-section",
      title: "Measured Concept",
      order: 0,
      startOffset: 0,
      endOffset: 500,
      tokenWeight: 80,
      sourceBlockIds,
      blockIds: sourceBlockIds,
      roughStartBlockId: sourceBlockIds[0] ?? "",
      roughEndBlockId: sourceBlockIds.at(-1) ?? "",
      tags: ["concept"],
      confidence: 0.9,
    }],
  };
  const plan = buildGenerationPlan(outline, source);
  const section = requireSection(plan.sections[0]);
  const output = outputFor(section, {
    explanation: "Recorded evidence statement 1.",
    keyPoints: pointTexts,
  });
  return assemblyDiagnostic({ plan, outputs: [output], source, outline });
}

function assemblyDiagnostic(args: {
  readonly plan: ReturnType<typeof buildGenerationPlan>;
  readonly outputs: readonly SectionOutput[];
  readonly source: NormalizedSource;
  readonly outline: SourceOutline;
}): string {
  const coverage = verifyCoverage(args);
  const grounding = validateGrounding(args);
  const leakage = validateLeakage({ plan: args.plan, outputs: args.outputs });
  try {
    assembleReviewer({
      plan: args.plan,
      outputs: args.outputs,
      source: args.source,
      coverage,
      grounding,
      leakage,
    });
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

async function createHierarchyFixture(): Promise<{
  readonly source: NormalizedSource;
  readonly outline: SourceOutline;
}> {
  const blocks: StructuredBlock[] = [
    heading("h-generators", "GENERATORS", 1, 0),
    paragraph("p-generators", "Generators produce values lazily.", 1),
    heading("h-review", "REVIEW", 2, 2),
    paragraph("p-review", "Review the preceding material.", 3),
    heading("h-expression-1", "Generator Expressions", 2, 4),
    paragraph("p-expression-1", "A generator expression creates an iterator.", 5),
    heading("h-examples", "Examples:", 3, 6),
    paragraph("p-example", "An example introduction.", 7),
    code("code-example", "yield item", 8),
    heading("h-expression-2", "Generator Expressions", 2, 9),
    paragraph("p-expression-2", "Additional explanation remains attached.", 10),
    heading("h-activity", "ACTIVITY", 2, 11),
    paragraph("p-activity", "Complete the classroom prompt.", 12),
  ];
  const source = await normalizeSource({
    structuredDocument: documentFrom(blocks, "typed-hierarchy-source"),
    kind: "presentation",
  });
  return { source, outline: await detectOutline(source) };
}

async function createDistinctParentRepeatFixture(): Promise<SourceOutline> {
  const source = await normalizeSource({
    structuredDocument: documentFrom([
      heading("parent-alpha", "Parent Alpha", 1, 0),
      paragraph("parent-alpha-body", "Parent Alpha introduces a supported conceptual region.", 1),
      heading("shared-alpha", "Shared Evidence", 2, 2),
      paragraph("shared-alpha-body", "The first parent has its own explanatory evidence.", 3),
      heading("parent-beta", "Parent Beta", 1, 4),
      paragraph("parent-beta-body", "Parent Beta introduces a different conceptual region.", 5),
      heading("shared-beta", "Shared Evidence", 2, 6),
      paragraph("shared-beta-body", "The second parent has different explanatory evidence.", 7),
    ], "distinct-parent-repeat-source"),
    kind: "document",
  });
  return detectOutline(source);
}

async function createTypedEvidenceContext(args: {
  readonly formulaRawText?: string;
  readonly formulaLatex?: string;
  readonly tableRows?: readonly (readonly string[])[];
  readonly resultText?: string;
}): Promise<{
  readonly source: NormalizedSource;
  readonly outline: SourceOutline;
  readonly plan: ReturnType<typeof buildGenerationPlan>;
  readonly section: PlannedSection;
}> {
  const blocks: StructuredBlock[] = [
    heading("concept-heading", "Measured Index", 1, 0),
    paragraph("concept-definition", "The measured index uses recorded evidence.", 1),
  ];
  let order = blocks.length;
  if (args.formulaRawText) {
    blocks.push({
      id: "concept-formula",
      type: "formula",
      pageNumber: 1,
      order: order++,
      rawText: args.formulaRawText,
      ...(args.formulaLatex ? { latex: args.formulaLatex } : {}),
      provenance: provenance("concept-formula"),
      parentId: "concept-heading",
    });
  }
  if (args.tableRows) {
    blocks.push({
      id: "concept-table",
      type: "table",
      pageNumber: 1,
      order: order++,
      rows: args.tableRows.map((row, rowIndex) => ({
        index: rowIndex,
        cells: row.map((text, columnIndex) => ({
          id: `cell-${rowIndex}-${columnIndex}`,
          rowIndex,
          columnIndex,
          rowSpan: 1,
          columnSpan: 1,
          text,
          ...(rowIndex === 0 ? { isHeader: true } : {}),
          provenance: {
            ...provenance(`cell-${rowIndex}-${columnIndex}`),
            tableCell: { tableBlockId: "concept-table", rowIndex, columnIndex },
          },
        })),
      })),
      provenance: provenance("concept-table"),
      parentId: "concept-heading",
    });
  }
  if (args.resultText) blocks.push(paragraph("concept-result", args.resultText, order++));

  const source = await normalizeSource({
    structuredDocument: documentFrom(blocks, "typed-evidence-source"),
    kind: "document",
  });
  const outline = await detectOutline(source);
  const plan = buildGenerationPlan(outline, source);
  return { source, outline, plan, section: requireSection(plan.sections[0]) };
}

async function createConceptFamilyFixture(): Promise<{
  readonly plan: ReturnType<typeof buildGenerationPlan>;
}> {
  const conceptNames = ["Mean", "Median", "Mode"] as const;
  const blocks: StructuredBlock[] = [];
  for (const [index, conceptName] of conceptNames.entries()) {
    const headingId = `family-heading-${index}`;
    blocks.push(heading(headingId, conceptName, 1, blocks.length));
    blocks.push(paragraph(
      `family-definition-${index}`,
      `${conceptName} uses its recorded source evidence.`,
      blocks.length,
    ));
    blocks.push({
      id: `family-formula-${index}`,
      type: "formula",
      pageNumber: 1,
      order: blocks.length,
      rawText: `${conceptName.toLowerCase()} = recorded value`,
      provenance: provenance(`family-formula-${index}`),
      parentId: headingId,
    });
    blocks.push({
      id: `family-table-${index}`,
      type: "table",
      pageNumber: 1,
      order: blocks.length,
      rows: [{
        index: 0,
        cells: [{
          id: `family-cell-${index}`,
          rowIndex: 0,
          columnIndex: 0,
          rowSpan: 1,
          columnSpan: 1,
          text: `${conceptName} evidence`,
          provenance: {
            ...provenance(`family-cell-${index}`),
            tableCell: {
              tableBlockId: `family-table-${index}`,
              rowIndex: 0,
              columnIndex: 0,
            },
          },
        }],
      }],
      provenance: provenance(`family-table-${index}`),
      parentId: headingId,
    });
  }
  const source = await normalizeSource({
    structuredDocument: documentFrom(blocks, "typed-concept-family-source"),
    kind: "document",
  });
  const outline = await detectOutline(source);
  return { plan: buildGenerationPlan(outline, source) };
}

function outputFor(
  section: PlannedSection,
  core: { readonly explanation: string; readonly keyPoints: readonly string[] },
): SectionOutput {
  return {
    id: `output-${section.id}`,
    kind: "concept-card",
    plannedSectionId: section.id,
    title: section.title,
    sourceBlockIds: [...section.sourceBlockIds],
    sourceCore: { explanation: core.explanation, keyPoints: [...core.keyPoints] },
    enrichment: null,
  };
}

function documentFrom(blocks: readonly StructuredBlock[], sourceId: string): StructuredDocument {
  return {
    schemaVersion: "structured-document-v1",
    sourceId,
    title: "Neutral Typed Source",
    pageCount: 1,
    pages: [{ pageNumber: 1, blocks }],
    parser: { name: "docling", version: "fixture" },
    diagnostics: [],
  };
}

function heading(id: string, text: string, level: number, order: number): StructuredBlock {
  return {
    id,
    type: "heading",
    text,
    level,
    pageNumber: 1,
    order,
    provenance: provenance(id),
  };
}

function paragraph(id: string, text: string, order: number): StructuredBlock {
  return {
    id,
    type: "paragraph",
    text,
    pageNumber: 1,
    order,
    provenance: provenance(id),
  };
}

function code(id: string, text: string, order: number): StructuredBlock {
  return {
    id,
    type: "code",
    text,
    pageNumber: 1,
    order,
    provenance: provenance(id),
  };
}

function provenance(blockId: string) {
  return { pageNumber: 1, blockId, parser: "docling" as const };
}

function requireSection(section: PlannedSection | undefined): PlannedSection {
  if (!section) throw new Error("Typed reviewer eval requires a planned section.");
  return section;
}

export async function runTypedReviewerHardeningEvals(): Promise<boolean> {
  const result = await runEvalSuite(typedReviewerHardeningSuite);
  printEvalSuiteResult(result);
  setFailureExitCode([result]);
  return result.status === "passed";
}

if (isDirectExecution(import.meta.url)) {
  await runTypedReviewerHardeningEvals();
}
