import {
  verifySemanticCoverage,
  verifySemanticRelationships,
} from "../src/semantic-verification.js";
import { verifyCoverage } from "../src/stage4-verify.js";
import { validateGrounding } from "../src/stage5a-grounding.js";
import type {
  GenerationPlan,
  NormalizedSource,
  PlannedSection,
  PlannedSemanticUnit,
  SectionOutput,
  SourceOutline,
} from "../src/types.js";
import {
  assertEqual,
  assertIncludes,
  isDirectExecution,
  printEvalSuiteResult,
  runEvalSuite,
  setFailureExitCode,
} from "./assert.js";
import type { EvalCase, EvalIssue, EvalSuite } from "./types.js";

interface VerificationContext {
  readonly source: NormalizedSource;
  readonly outline: SourceOutline;
  readonly plan: GenerationPlan;
  readonly sections: readonly PlannedSection[];
}

const fixtures: readonly EvalCase[] = [
  fixtureA(), fixtureB(), fixtureC(), fixtureD(), fixtureE(), fixtureF(),
  fixtureG(), fixtureH(), fixtureI(), fixtureJ(), fixtureK(), fixtureL(),
  fixtureM(), fixtureN(), fixtureO(), fixtureP(),
  ...faultInjectionCases(),
];

export const semanticVerificationSuite: EvalSuite = {
  name: "Stage 4/5 semantic verification",
  cases: fixtures,
};

export async function runSemanticVerificationEvals(): Promise<boolean> {
  const result = await runEvalSuite(semanticVerificationSuite);
  printEvalSuiteResult(result);
  setFailureExitCode([result]);
  return result.status === "passed";
}

if (isDirectExecution(import.meta.url)) {
  await runSemanticVerificationEvals();
}

function fixtureA(): EvalCase {
  return {
    name: "A - valid conservative point paraphrase passes",
    run: async () => {
      const section = plannedSection("daily-review", "Daily Review", [
        point("Daily note review improves recall"),
      ]);
      const result = verifySemanticCoverage(
        section,
        output(section, ["Recall improves with daily review of notes"]),
      );
      return assertEqual(result.score, 1, "Conservative point paraphrase failed.");
    },
  };
}

function fixtureB(): EvalCase {
  return {
    name: "B - missing semantic point reduces coverage",
    run: async () => {
      const section = pointListSection();
      const result = verifySemanticCoverage(
        section,
        output(section, ["Amber marker"]),
      );
      return assertEqual(result.score, 0.5, "Missing point retained full coverage.");
    },
  };
}

function fixtureC(): EvalCase {
  return {
    name: "C - duplicate point cannot mask omission",
    run: async () => {
      const section = pointListSection();
      const result = verifySemanticCoverage(
        section,
        output(section, ["Amber marker", "Amber marker"]),
      );
      return assertEqual(result.score, 0.5, "Duplicate point masked an omission.");
    },
  };
}

function fixtureD(): EvalCase {
  return {
    name: "D - swapped definitions fail semantic grounding",
    run: async () => {
      const section = definitionSection();
      const bad = output(section, [
        "Alpha - Second stored meaning",
        "Beta - First stored meaning",
      ]);
      return expectRelationshipIssue(
        section,
        bad,
        [section],
        "grounding-wrong-definition-association",
      );
    },
  };
}

function fixtureE(): EvalCase {
  return {
    name: "E - correct definitions with conservative paraphrase pass",
    run: async () => {
      const section = definitionSection();
      const good = output(section, [
        "Alpha is the first stored meaning",
        "Beta is the second stored meaning",
      ]);
      return expectClean(section, good, [section]);
    },
  };
}

function fixtureF(): EvalCase {
  return {
    name: "F - wrong parent-child direction fails",
    run: async () => {
      const section = hierarchySection();
      return expectRelationshipIssue(
        section,
        output(section, ["Reed fiber: Natural materials; Clay tile"]),
        [section],
        "grounding-wrong-parent-child",
      );
    },
  };
}

function fixtureG(): EvalCase {
  return {
    name: "G - supported hierarchy preserved passes",
    run: async () => {
      const section = hierarchySection();
      return expectClean(
        section,
        output(section, ["Natural materials: Reed fiber; Clay tile"]),
        [section],
      );
    },
  };
}

function fixtureH(): EvalCase {
  return {
    name: "H - ambiguous hierarchy kept flat passes",
    run: async () => {
      const section = pointListSection();
      return expectClean(
        section,
        output(section, ["Amber marker", "Birch marker"]),
        [section],
      );
    },
  };
}

function fixtureI(): EvalCase {
  return {
    name: "I - wrong procedure order fails",
    run: async () => {
      const section = procedureSection();
      return expectRelationshipIssue(
        section,
        output(section, [
          "Sample Procedure: 1. Collect sample 2. Place sample 3. Record code",
        ]),
        [section],
        "grounding-wrong-step-order",
      );
    },
  };
}

function fixtureJ(): EvalCase {
  return {
    name: "J - correct procedure order passes",
    run: async () => {
      const section = procedureSection();
      return expectClean(
        section,
        output(section, [
          "Sample Procedure: 1. Collect sample 2. Record code 3. Place sample",
        ]),
        [section],
      );
    },
  };
}

function fixtureK(): EvalCase {
  return {
    name: "K - enumeration is not treated as procedure",
    run: async () => {
      const section = pointListSection();
      const good = output(section, ["Birch marker", "Amber marker"]);
      const issues = verifySemanticRelationships({
        section,
        output: good,
        allSections: [section],
      });
      return [
        ...assertEqual(issues.length, 0, "Flat enumeration gained step rules."),
        ...assertEqual(
          verifySemanticCoverage(section, good).score,
          1,
          "Unordered conceptual list failed coverage.",
        ),
      ];
    },
  };
}

function fixtureL(): EvalCase {
  return {
    name: "L - examples attached to wrong concept fail",
    run: async () => {
      const section = exampleSection();
      return expectRelationshipIssue(
        section,
        output(section, [
          "Concept X",
          "Concept Y - Examples: Amber sample; Birch sample",
        ]),
        [section],
        "grounding-wrong-example-association",
      );
    },
  };
}

function fixtureM(): EvalCase {
  return {
    name: "M - cross-concept heading fusion fails",
    run: async () => {
      const first = plannedSection("copper", "Copper Ecology", [
        point("Copper route"),
      ]);
      const second = plannedSection("slate", "Slate Navigation", [
        point("Slate compass"),
      ]);
      return expectRelationshipIssue(
        first,
        output(first, ["Copper route Slate Navigation"]),
        [first, second],
        "grounding-cross-concept-fusion",
      );
    },
  };
}

function fixtureN(): EvalCase {
  return {
    name: "N - sibling fusion fails",
    run: async () => {
      const section = pointListSection();
      return expectRelationshipIssue(
        section,
        output(section, ["Amber marker Birch marker"]),
        [section],
        "grounding-sibling-fusion",
      );
    },
  };
}

function fixtureO(): EvalCase {
  return {
    name: "O - exact source words in wrong relationship fail",
    run: async () => {
      const section = definitionSection();
      const bad = output(section, [
        "Alpha - Second stored meaning",
        "Beta - First stored meaning",
      ]);
      const context = reportContext([section]);
      const coverage = verifyCoverage({
        ...context,
        outputs: [bad],
      });
      const grounding = validateGrounding({
        ...context,
        outputs: [bad],
      });
      return [
        ...assertEqual(
          coverage.semanticCoverageScore === 1,
          false,
          "Wrong exact relationship retained semantic coverage 1.00.",
        ),
        ...assertEqual(grounding.status, "failed", "Wrong exact relationship passed grounding."),
      ];
    },
  };
}

function fixtureP(): EvalCase {
  return {
    name: "P - conservative paraphrase with correct relationship passes",
    run: async () => {
      const section = definitionSection();
      const good = output(section, [
        "For Alpha, the stored meaning is first",
        "For Beta, the stored meaning is second",
      ]);
      const context = reportContext([section]);
      const coverage = verifyCoverage({ ...context, outputs: [good] });
      const grounding = validateGrounding({ ...context, outputs: [good] });
      return [
        ...assertEqual(coverage.semanticCoverageScore, 1, "Valid paraphrase lost coverage."),
        ...assertEqual(grounding.status, "passed", "Valid paraphrase failed grounding."),
      ];
    },
  };
}

function faultInjectionCases(): readonly EvalCase[] {
  return [
    faultCase("swapped term definitions", () => {
      const section = definitionSection();
      return mutationResult(
        section,
        output(section, ["Alpha - First stored meaning", "Beta - Second stored meaning"]),
        ["Alpha - Second stored meaning", "Beta - First stored meaning"],
        "grounding-wrong-definition-association",
      );
    }),
    faultCase("reordered procedure steps", () => {
      const section = procedureSection();
      return mutationResult(
        section,
        output(section, ["Sample Procedure: 1. Collect sample 2. Record code 3. Place sample"]),
        ["Sample Procedure: 1. Collect sample 2. Place sample 3. Record code"],
        "grounding-wrong-step-order",
      );
    }),
    faultCase("cross-concept fused key point", () => {
      const first = plannedSection("harbor", "Harbor Signals", [point("Harbor lamp")]);
      const second = plannedSection("lantern", "Lantern Policy", [point("Lantern rule")]);
      return mutationResult(
        first,
        output(first, ["Harbor lamp"]),
        ["Harbor lamp Lantern Policy"],
        "grounding-cross-concept-fusion",
        [first, second],
      );
    }),
    faultCase("sibling fusion", () => {
      const section = pointListSection();
      return mutationResult(
        section,
        output(section, ["Amber marker", "Birch marker"]),
        ["Amber marker Birch marker"],
        "grounding-sibling-fusion",
      );
    }),
    faultCase("wrong example association", () => {
      const section = exampleSection();
      return mutationResult(
        section,
        output(section, ["Concept X", "Concept X - Examples: Amber sample; Birch sample"]),
        ["Concept X", "Concept Y - Examples: Amber sample; Birch sample"],
        "grounding-wrong-example-association",
      );
    }),
    faultCase("missing semantic unit", () => {
      const section = pointListSection();
      const valid = output(section, ["Amber marker", "Birch marker"]);
      const mutated = { ...valid, sourceCore: { explanation: "", keyPoints: ["Amber marker"] } };
      return assertEqual(
        verifySemanticCoverage(section, mutated).score,
        0.5,
        "Missing-unit mutation was not detected.",
      );
    }),
    faultCase("duplicated unit replacing another", () => {
      const section = pointListSection();
      const valid = output(section, ["Amber marker", "Birch marker"]);
      const mutated = {
        ...valid,
        sourceCore: { explanation: "", keyPoints: ["Amber marker", "Amber marker"] },
      };
      return assertEqual(
        verifySemanticCoverage(section, mutated).score,
        0.5,
        "Duplicate-replacement mutation was not detected.",
      );
    }),
  ];
}

function faultCase(
  defect: string,
  run: () => readonly EvalIssue[],
): EvalCase {
  return { name: `Fault injection - ${defect}`, run: async () => run() };
}

function mutationResult(
  section: PlannedSection,
  valid: SectionOutput,
  mutatedKeyPoints: readonly string[],
  expectedType: string,
  allSections: readonly PlannedSection[] = [section],
): readonly EvalIssue[] {
  const cleanIssues = verifySemanticRelationships({
    section,
    output: valid,
    allSections,
  });
  const mutated = {
    ...valid,
    sourceCore: { explanation: "", keyPoints: mutatedKeyPoints },
  } as SectionOutput;
  const mutationIssues = verifySemanticRelationships({
    section,
    output: mutated,
    allSections,
  });
  return [
    ...assertEqual(cleanIssues.length, 0, "Valid baseline failed before mutation."),
    ...assertIncludes(
      mutationIssues.map((issue) => issue.type).join(" "),
      expectedType,
      "Injected mutation was not classified.",
    ),
  ];
}

function expectClean(
  section: PlannedSection,
  candidate: SectionOutput,
  allSections: readonly PlannedSection[],
): readonly EvalIssue[] {
  return [
    ...assertEqual(
      verifySemanticCoverage(section, candidate).score,
      1,
      "Valid semantic output lost coverage.",
    ),
    ...assertEqual(
      verifySemanticRelationships({ section, output: candidate, allSections }).length,
      0,
      "Valid semantic output gained a relationship issue.",
    ),
  ];
}

function expectRelationshipIssue(
  section: PlannedSection,
  candidate: SectionOutput,
  allSections: readonly PlannedSection[],
  expectedType: string,
): readonly EvalIssue[] {
  const issues = verifySemanticRelationships({
    section,
    output: candidate,
    allSections,
  });
  return assertIncludes(
    issues.map((issue) => issue.type).join(" "),
    expectedType,
    "Semantic relationship issue type was not emitted.",
  );
}

function pointListSection(): PlannedSection {
  return plannedSection("markers", "Archive Markers", [
    point("Amber marker"),
    point("Birch marker"),
  ]);
}

function definitionSection(): PlannedSection {
  return plannedSection("definitions", "Stored Definitions", [
    { kind: "definition", label: "Alpha", items: ["First stored meaning"] },
    { kind: "definition", label: "Beta", items: ["Second stored meaning"] },
  ], "definition-set");
}

function hierarchySection(): PlannedSection {
  return plannedSection("materials", "Material Families", [
    { kind: "group", label: "Natural materials", items: ["Reed fiber", "Clay tile"] },
  ], "category-hierarchy");
}

function procedureSection(): PlannedSection {
  return plannedSection("procedure", "Sample Procedure", [
    {
      kind: "steps",
      label: "Sample Procedure",
      items: ["Collect sample", "Record code", "Place sample"],
    },
  ], "procedure");
}

function exampleSection(): PlannedSection {
  return plannedSection("examples", "Pattern Examples", [
    point("Concept X"),
    point("Concept Y"),
    {
      kind: "examples",
      label: "Concept X",
      items: ["Amber sample", "Birch sample"],
    },
  ], "example-group");
}

function point(label: string): PlannedSemanticUnit {
  return { kind: "point", label, items: [] };
}

function plannedSection(
  id: string,
  title: string,
  units: readonly PlannedSemanticUnit[],
  kind: PlannedSection["semanticPlan"] extends infer _Plan
    ? "list" | "definition-set" | "category-hierarchy" | "procedure" | "example-group"
    : never = "list",
): PlannedSection {
  const blockId = `${id}-block`;
  return {
    id: `${id}-planned`,
    sourceSectionId: `${id}-outline`,
    title,
    order: 0,
    schemaKind: kind === "procedure" ? "process-step" : "concept-card",
    target: {
      objective: `Review ${title}.`,
      itemCount: units.length,
      focus: title,
      requiredSourceBlockIds: [blockId],
      expectedTags: kind === "procedure" ? ["process"] : ["concept"],
      coverageRules: ["Preserve semantic targets."],
    },
    sourceBlockIds: [blockId],
    tokenWeight: 30,
    targetItemCount: units.length,
    sourceStartOffset: 0,
    sourceEndOffset: 500,
    semanticPlan: { kind, units, explanationUseful: units.length > 1 },
  };
}

function output(
  section: PlannedSection,
  keyPoints: readonly string[],
): SectionOutput {
  return {
    id: `${section.id}-output`,
    kind: section.schemaKind,
    plannedSectionId: section.id,
    title: section.title,
    sourceBlockIds: [...section.sourceBlockIds],
    sourceCore: { explanation: "", keyPoints },
    enrichment: null,
  } as SectionOutput;
}

function reportContext(sections: readonly PlannedSection[]): VerificationContext {
  const orderedSections = sections.map((section, index) => ({ ...section, order: index }));
  const blocks = orderedSections.map((section, index) => ({
    id: section.sourceBlockIds[0] ?? `${section.id}-block`,
    kind: "list" as const,
    text: sourceText(section),
    order: index,
  }));
  const source: NormalizedSource = {
    id: "semantic-verification-source",
    title: "Semantic Verification",
    kind: "document",
    language: "en",
    metadata: {},
    blocks,
    createdAt: "2026-08-30T00:00:00.000Z",
  };
  const outline: SourceOutline = {
    id: "semantic-verification-outline",
    sourceId: source.id,
    title: source.title,
    sections: orderedSections.map((section, index) => ({
      id: section.sourceSectionId,
      title: section.title,
      order: index,
      startOffset: 0,
      endOffset: sourceText(section).length,
      tokenWeight: section.tokenWeight,
      sourceBlockIds: [...section.sourceBlockIds],
      blockIds: [...section.sourceBlockIds],
      roughStartBlockId: section.sourceBlockIds[0] ?? "",
      roughEndBlockId: section.sourceBlockIds.at(-1) ?? "",
      tags: ["concept"],
      confidence: 1,
    })),
  };
  const plan: GenerationPlan = {
    id: "semantic-verification-plan",
    sourceId: source.id,
    outlineId: outline.id,
    title: source.title,
    sections: orderedSections,
    metadata: { sectionCount: sections.length, sourceBlockCount: blocks.length },
  };
  return { source, outline, plan, sections: orderedSections };
}

function sourceText(section: PlannedSection): string {
  return [
    section.title,
    ...(section.semanticPlan?.units ?? []).flatMap((unit) => [
      `- ${unit.label}`,
      ...unit.items.map((item) => `- ${item}`),
    ]),
  ].join("\n");
}
