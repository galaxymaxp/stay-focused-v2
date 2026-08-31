import {
  analyzeSectionSemanticStructure,
  serializeSemanticUnits,
} from "../src/semantic-structure.js";
import type {
  NormalizedSourceBlock,
  PlannedSectionSemanticPlan,
  SectionContentTag,
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

interface SemanticFixture {
  readonly name: string;
  readonly title: string;
  readonly sourceText: string;
  readonly tags?: readonly SectionContentTag[];
  readonly metadata?: NormalizedSourceBlock["metadata"];
  readonly verify: (plan: PlannedSectionSemanticPlan) => ReturnType<EvalCase["run"]>;
}

const fixtures: readonly SemanticFixture[] = [
  {
    name: "A - numbered conceptual list is not a procedure",
    title: "Principles of Field Study",
    sourceText: "1. Observation\n2. Classification\n3. Comparison",
    tags: ["process"],
    verify: async (plan) => [
      ...assertEqual(plan.kind, "list", "Numbering invented procedure meaning."),
      ...assertDeepEqual(
        serializeSemanticUnits(plan.units),
        ["Observation", "Classification", "Comparison"],
        "Conceptual list items were lost or reordered.",
      ),
      ...assertEqual(
        plan.explanationUseful,
        true,
        "List-heavy academic content suppressed a potentially useful explanation.",
      ),
    ],
  },
  {
    name: "B - explicit procedure preserves ordered steps",
    title: "Specimen Preparation Procedure",
    sourceText:
      "1. Collect the sample.\n2. Record the sample code.\n3. Place the sample in the tray.",
    tags: ["process"],
    verify: async (plan) => [
      ...assertEqual(plan.kind, "procedure", "Explicit procedure was flattened."),
      ...assertIncludes(
        serializeSemanticUnits(plan.units).join(" | "),
        "1. Collect the sample. | 2. Record the sample code.",
        "Procedure order was not retained across distinct visible rows.",
      ),
    ],
  },
  {
    name: "C - term-definition pairs remain attached",
    title: "Definition of Field Terms",
    sourceText:
      "- Mote\n- A small stored observation used by the archive.\n- Drift\n- A gradual change recorded across repeated measurements.\n- Span\n- The complete interval covered by one observation set.",
    tags: ["definition"],
    verify: async (plan) => [
      ...assertEqual(
        plan.kind,
        "definition-set",
        "Definition pairs were not recognized.",
      ),
      ...assertDeepEqual(
        plan.units.map((unit) => [unit.label, ...unit.items]),
        [
          ["Mote", "A small stored observation used by the archive."],
          ["Drift", "A gradual change recorded across repeated measurements."],
          ["Span", "The complete interval covered by one observation set."],
        ],
        "A definition moved away from its term.",
      ),
    ],
  },
  {
    name: "D - supported category hierarchy preserves siblings",
    title: "Material Families",
    sourceText:
      "Natural materials\n  - Reed fiber\n  - Clay tile\nSynthetic materials\n  - Resin sheet\n  - Foam block",
    verify: async (plan) => [
      ...assertEqual(
        plan.kind,
        "category-hierarchy",
        "Indented category evidence was flattened.",
      ),
      ...assertDeepEqual(
        plan.units.map((unit) => [unit.label, ...unit.items]),
        [
          ["Natural materials", "Reed fiber", "Clay tile"],
          ["Synthetic materials", "Resin sheet", "Foam block"],
        ],
        "Parents or sibling relationships changed.",
      ),
    ],
  },
  {
    name: "E - ambiguous hierarchy stays flat",
    title: "Archive Labels",
    sourceText: "- Amber label\n- Birch label\n- Copper label\n- Delta label",
    verify: async (plan) => [
      ...assertEqual(
        plan.kind,
        "list",
        "Flat evidence invented a parent-child hierarchy.",
      ),
      ...assertEqual(
        plan.units.every((unit) => unit.kind === "point"),
        true,
        "Ambiguous siblings were grouped without evidence.",
      ),
    ],
  },
  {
    name: "F - explicit source examples remain attached",
    title: "Surface Patterns",
    sourceText:
      "- Repeating bands\n- Examples:\n- Ripple marks\n- Alternating stripes",
    tags: ["example"],
    verify: async (plan) => [
      ...assertEqual(
        plan.kind,
        "example-group",
        "Explicit examples were flattened.",
      ),
      ...assertDeepEqual(
        plan.units[0],
        {
          kind: "examples",
          label: "Repeating bands",
          items: ["Ripple marks", "Alternating stripes"],
        },
        "Examples were not attached to their source concept.",
      ),
    ],
  },
  {
    name: "G - repeated continuation wording is deduplicated",
    title: "Survey Signals",
    sourceText:
      "- Raised marker\n- Lowered marker\n- Raised marker\n- Lowered marker",
    verify: async (plan) => [
      ...assertDeepEqual(
        serializeSemanticUnits(plan.units),
        ["Raised marker", "Lowered marker"],
        "Repeated source items remained redundantly visible.",
      ),
    ],
  },
  {
    name: "H - sparse factual section does not force filler",
    title: "Submission Date",
    sourceText: "Submission date: September 18",
    verify: async (plan) => [
      ...assertEqual(
        plan.explanationUseful,
        false,
        "Sparse fact was marked for a manufactured explanation.",
      ),
    ],
  },
  {
    name: "I - long list retains all semantic units",
    title: "Catalog Fields",
    sourceText: Array.from(
      { length: 12 },
      (_value, index) => `- Field ${index + 1}`,
    ).join("\n"),
    verify: async (plan) => [
      ...assertEqual(plan.units.length, 12, "Long list lost important items."),
      ...assertEqual(
        plan.explanationUseful,
        true,
        "Long list suppressed explanation eligibility.",
      ),
      ...assertEqual(
        new Set(serializeSemanticUnits(plan.units)).size,
        12,
        "Long-list items fused into fewer semantic units.",
      ),
    ],
  },
  {
    name: "J - unusual source classification is preserved",
    title: "Fictional Color Taxonomy",
    sourceText:
      "Warm colors\n  - Blue square\n  - Silver circle\nCool colors\n  - Red triangle\n  - Gold star",
    verify: async (plan) => [
      ...assertDeepEqual(
        plan.units.map((unit) => [unit.label, ...unit.items]),
        [
          ["Warm colors", "Blue square", "Silver circle"],
          ["Cool colors", "Red triangle", "Gold star"],
        ],
        "Engine corrected an unusual but explicit source classification.",
      ),
    ],
  },
  {
    name: "K - numbered parents retain bullet and step children",
    title: "Collection Methods",
    sourceText:
      "1. Direct Survey\n• Door counts\n• Desk counts\n2. Sample Processing\na) Collect the sample\nb) Record the sample code\n3. Archive Review\n• Catalog search\n• Shelf search",
    tags: ["process"],
    verify: async (plan) => [
      ...assertEqual(
        plan.kind,
        "category-hierarchy",
        "Numbered parent groups were flattened.",
      ),
      ...assertDeepEqual(
        plan.units,
        [
          {
            kind: "group",
            label: "Direct Survey",
            items: ["Door counts", "Desk counts"],
          },
          {
            kind: "steps",
            label: "Sample Processing",
            items: ["Collect the sample", "Record the sample code"],
          },
          {
            kind: "group",
            label: "Archive Review",
            items: ["Catalog search", "Shelf search"],
          },
        ],
        "Numbered parents lost their supported children or step order.",
      ),
    ],
  },
  {
    name: "U - components cue preserves ownership in separate rows",
    title: "Parts of a Habitat",
    sourceText: "Made up of two parts:\n- Living zone\n- Nonliving zone",
    verify: async (plan) => [
      ...assertEqual(plan.kind, "category-hierarchy", "Components cue was flattened."),
      ...assertDeepEqual(
        serializeSemanticUnits(plan.units),
        ["Parts of a Habitat: Living zone", "Parts of a Habitat: Nonliving zone"],
        "Component children were fused or lost ownership.",
      ),
    ],
  },
  {
    name: "V - advantages and disadvantages remain separate groups",
    title: "Material Choice",
    sourceText: "Advantages:\n- Low mass\n- Easy shaping\nDisadvantages:\n- Low heat tolerance\n- Surface wear",
    verify: async (plan) => [
      ...assertDeepEqual(
        plan.units.map((unit) => [unit.label, ...unit.items]),
        [
          ["Advantages", "Low mass", "Easy shaping"],
          ["Disadvantages", "Low heat tolerance", "Surface wear"],
        ],
        "Contrast group ownership changed.",
      ),
    ],
  },
  {
    name: "W - implementation cue preserves children",
    title: "Common Implementations",
    sourceText: "Common Implementations:\n- Embedded module\n- Hosted service\n- Desktop utility",
    verify: async (plan) => [
      ...assertDeepEqual(
        plan.units[0],
        { kind: "group", label: "Common Implementations", items: ["Embedded module", "Hosted service", "Desktop utility"] },
        "Implementation cue was not normalized.",
      ),
    ],
  },
  {
    name: "X - inline abbreviated example stays attached",
    title: "Transfer Methods",
    sourceText: "- Network transfer\n- Ex. RiverLink protocol",
    tags: ["example"],
    verify: async (plan) => [
      ...assertDeepEqual(
        plan.units[0],
        { kind: "examples", label: "Network transfer", items: ["RiverLink protocol"] },
        "Inline example lost its concept association.",
      ),
    ],
  },
  {
    name: "Y - checklist numbering does not imply a procedure",
    title: "Best Practices",
    sourceText: "1. Review labels regularly.\n2. Use clear names.\n3. Automate the process when appropriate.",
    tags: ["process"],
    verify: async (plan) => [
      ...assertEqual(plan.kind, "checklist", "Checklist was mislabeled as a procedure."),
      ...assertEqual(plan.units.every((unit) => unit.kind === "point"), true, "Checklist invented step dependencies."),
    ],
  },
  {
    name: "Z - ambiguous short labels stay flat",
    title: "Archive Notes",
    sourceText: "- North\n- Birch\n- Quiet\n- Amber",
    verify: async (plan) => [
      ...assertEqual(plan.kind, "list", "Ambiguous labels invented a relationship."),
      ...assertEqual(plan.units.every((unit) => unit.kind === "point"), true, "Ambiguous labels were grouped."),
    ],
  },
  {
    name: "AA - imperative checklist remains unordered",
    title: "Field Guidelines",
    sourceText: "- Record each observation.\n- Review labels regularly.\n- Use consistent units.",
    tags: ["process"],
    verify: async (plan) => [
      ...assertEqual(plan.kind, "checklist", "Imperative guidelines became a procedure."),
      ...assertEqual(plan.units.every((unit) => unit.kind === "point"), true, "Imperative checklist invented order."),
    ],
  },
  {
    name: "AB - explicit sequence without Step wording remains ordered",
    title: "Sample Transfer",
    sourceText: "Complete in this sequence:\n1. Collect the sample.\n2. Record the code.\n3. Place it in storage.",
    tags: ["process"],
    verify: async (plan) => [
      ...assertEqual(plan.kind, "procedure", "Explicit sequence was flattened without a Step label."),
      ...assertEqual(plan.units[0]?.kind, "steps", "Explicit sequence lost ordered semantics."),
    ],
  },
  {
    name: "AC - OCR labels do not invent visual relationships",
    title: "Assembly Diagram",
    sourceText: "Components:\nRotor\nHousing",
    metadata: { layoutStatus: "ocr_supplemented" },
    verify: async (plan) => [
      ...assertEqual(plan.kind, "concept", "OCR-only labels invented a relationship."),
      ...assertEqual(plan.units.length, 0, "OCR-only layout evidence created semantic targets."),
    ],
  },
  {
    name: "AD - lettered dependency reference preserves a true sequence",
    title: "Material Inspection",
    sourceText: "1. Surface Analysis\na) Record the baseline.\nb) Determine the comparison from (a).\nc) Place the result in storage.\n2. Storage Notes\n- Shelf label\n- Archive code",
    tags: ["process"],
    verify: async (plan) => [
      ...assertEqual(plan.units[0]?.kind, "steps", "Explicit child dependency was flattened."),
      ...assertDeepEqual(
        plan.units[0]?.items,
        ["Record the baseline.", "Determine the comparison from (a).", "Place the result in storage."],
        "Dependency sequence lost its source order.",
      ),
    ],
  },
];

export const semanticStructureSuite: EvalSuite = {
  name: "Stage 2/3 semantic structure",
  cases: fixtures.map(createCase),
};

export async function runSemanticStructureEvals(): Promise<boolean> {
  const result = await runEvalSuite(semanticStructureSuite);
  printEvalSuiteResult(result);
  setFailureExitCode([result]);
  return result.status === "passed";
}

if (isDirectExecution(import.meta.url)) {
  await runSemanticStructureEvals();
}

function createCase(fixture: SemanticFixture): EvalCase {
  return {
    name: fixture.name,
    run: async () =>
      fixture.verify(
        analyzeSectionSemanticStructure({
          title: fixture.title,
          tags: fixture.tags ?? [],
          sourceBlocks: [sourceBlock(fixture.sourceText, fixture.metadata)],
        }),
      ),
  };
}

function sourceBlock(
  text: string,
  metadata?: NormalizedSourceBlock["metadata"],
): NormalizedSourceBlock {
  return {
    id: "semantic-fixture-block",
    kind: "list",
    text,
    order: 0,
    ...(metadata ? { metadata } : {}),
  };
}
