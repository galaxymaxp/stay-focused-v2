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
        serializeSemanticUnits(plan.units)[0] ?? "",
        "1. Collect the sample. 2. Record the sample code. 3. Place the sample in the tray.",
        "Procedure order was not retained inside one semantic unit.",
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
        plan.units[1],
        {
          kind: "examples",
          label: "Examples:",
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
          sourceBlocks: [sourceBlock(fixture.sourceText)],
        }),
      ),
  };
}

function sourceBlock(text: string): NormalizedSourceBlock {
  return {
    id: "semantic-fixture-block",
    kind: "list",
    text,
    order: 0,
  };
}
