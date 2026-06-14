import basicFixtures from "./fixtures/stage6-basic.json" with { type: "json" };
import orderingFixtures from "./fixtures/stage6-ordering.json" with {
  type: "json",
};
import validationFixtures from "./fixtures/stage6-validation.json" with {
  type: "json",
};

import {
  assembleReviewer,
  type AssembleReviewerArgs,
} from "../src/stage6-assemble.js";
import { verifyCoverage } from "../src/stage4-verify.js";
import type {
  CoverageReport,
  GenerationPlan,
  NormalizedSource,
  PlannedSection,
  SectionOutput,
  SectionSchemaKind,
} from "../src/types.js";
import {
  assertDeepEqual,
  assertEqual,
  errorMessage,
  isDirectExecution,
  printEvalSuiteResult,
  runEvalSuite,
  setFailureExitCode,
} from "./assert.js";
import type { EvalCase, EvalIssue, EvalSuite } from "./types.js";

type BasicScenario = "metadata" | "source-blocks" | "weak-allowed";
type OrderingScenario =
  | "plan-order"
  | "reviewer-id"
  | "section-ids"
  | "output-title"
  | "immutable-inputs";
type ValidationScenario =
  | "missing-output"
  | "unplanned-output"
  | "wrong-kind"
  | "failed-coverage"
  | "weak-coverage"
  | "missing-coverage-result"
  | "plan-source-mismatch"
  | "coverage-plan-mismatch"
  | "missing-output-source-block"
  | "missing-plan-source-block"
  | "duplicate-output"
  | "duplicate-coverage"
  | "missing-outputs"
  | "missing-coverage"
  | "missing-plan"
  | "missing-source"
  | "empty-plan"
  | "empty-coverage";

interface BasicFixture {
  readonly name: string;
  readonly schemaKind?: SectionSchemaKind;
  readonly scenario?: BasicScenario;
}

interface ScenarioFixture<TScenario extends string> {
  readonly name: string;
  readonly scenario: TScenario;
}

interface ValidationFixture extends ScenarioFixture<ValidationScenario> {
  readonly expectError: string;
}

interface FixtureFile<TFixture> {
  readonly cases: readonly TFixture[];
}

interface Stage6Context {
  readonly source: NormalizedSource;
  readonly plan: GenerationPlan;
  readonly sections: readonly PlannedSection[];
}

const basicCases = (basicFixtures as FixtureFile<BasicFixture>).cases;
const orderingCases = (
  orderingFixtures as FixtureFile<ScenarioFixture<OrderingScenario>>
).cases;
const validationCases = (
  validationFixtures as FixtureFile<ValidationFixture>
).cases;

export const stage6AssembleSuite: EvalSuite = {
  name: "Stage 6 reviewer assembly",
  cases: [
    ...basicCases.map(createBasicCase),
    ...orderingCases.map(createOrderingCase),
    ...validationCases.map(createValidationCase),
  ],
};

export async function runStage6AssembleEvals(): Promise<boolean> {
  const result = await runEvalSuite(stage6AssembleSuite);
  printEvalSuiteResult(result);
  setFailureExitCode([result]);
  return result.status === "passed";
}

function createBasicCase(fixture: BasicFixture): EvalCase {
  return {
    name: fixture.name,
    run: async () => {
      if (fixture.schemaKind) {
        return runSchemaCase(fixture.schemaKind);
      }
      if (fixture.scenario) {
        return runBasicScenario(fixture.scenario);
      }
      return [{ message: "Stage 6 basic fixture is missing a scenario." }];
    },
  };
}

function createOrderingCase(
  fixture: ScenarioFixture<OrderingScenario>,
): EvalCase {
  return {
    name: fixture.name,
    run: async () => runOrderingScenario(fixture.scenario),
  };
}

function createValidationCase(fixture: ValidationFixture): EvalCase {
  return {
    name: fixture.name,
    run: async () => {
      try {
        runValidationScenario(fixture.scenario);
        return [
          {
            message: "Expected Stage 6 assembly validation to throw an error.",
            expected: fixture.expectError,
            actual: "No error was thrown",
          },
        ];
      } catch (error) {
        return assertEqual(
          errorMessage(error),
          fixture.expectError,
          "Stage 6 validation error message did not match.",
        );
      }
    },
  };
}

function runSchemaCase(
  schemaKind: SectionSchemaKind,
): readonly EvalIssue[] {
  const context = createContext([schemaKind]);
  const section = requireSection(context.sections[0]);
  const output = createValidOutput(section);
  const coverage = createCoverage(context, [output]);
  const reviewer = assembleReviewer({
    outputs: [output],
    coverage,
    plan: context.plan,
    source: context.source,
  });
  const reviewerSection = reviewer.sections[0];

  if (!reviewerSection) {
    return [{ message: "Reviewer output did not contain a section." }];
  }

  return [
    ...assertEqual(
      reviewerSection.kind,
      schemaKind,
      "Reviewer section kind did not match the planned schema.",
    ),
    ...assertEqual(
      reviewerSection.plannedSectionId,
      section.id,
      "Reviewer section did not preserve the planned section ID.",
    ),
    ...assertDeepEqual(
      reviewerSection.items,
      [output],
      "Reviewer section did not preserve the typed output content.",
    ),
    ...assertEqual(
      reviewerSection.coverageStatus,
      "passed",
      "Valid reviewer section did not preserve passing coverage.",
    ),
  ];
}

function runBasicScenario(scenario: BasicScenario): readonly EvalIssue[] {
  const context = createContext(["concept-card"]);
  const section = requireSection(context.sections[0]);
  const output = createValidOutput(section);

  switch (scenario) {
    case "metadata": {
      const coverage = createCoverage(context, [output]);
      const reviewer = assembleReviewer({
        outputs: [output],
        coverage,
        plan: context.plan,
        source: context.source,
      });
      return [
        ...assertEqual(
          reviewer.metadata.sourceId,
          context.source.id,
          "Reviewer metadata source ID did not match.",
        ),
        ...assertEqual(
          reviewer.metadata.planId,
          context.plan.id,
          "Reviewer metadata plan ID did not match.",
        ),
        ...assertEqual(
          reviewer.metadata.coverageReportId,
          coverage.id,
          "Reviewer metadata coverage report ID did not match.",
        ),
        ...assertEqual(
          reviewer.metadata.sectionCount,
          1,
          "Reviewer metadata section count did not match.",
        ),
        ...assertEqual(
          reviewer.metadata.generatedSectionCount,
          1,
          "Reviewer metadata generated section count did not match.",
        ),
      ];
    }
    case "source-blocks": {
      const coverage = createCoverage(context, [output]);
      const reviewer = assembleReviewer({
        outputs: [output],
        coverage,
        plan: context.plan,
        source: context.source,
      });
      return assertDeepEqual(
        reviewer.sections[0]?.sourceBlockIds,
        output.sourceBlockIds,
        "Reviewer section did not preserve source block IDs.",
      );
    }
    case "weak-allowed": {
      const weakOutput = createWeakOutput(section);
      const coverage = createCoverage(context, [weakOutput]);
      const reviewer = assembleReviewer({
        outputs: [weakOutput],
        coverage,
        plan: context.plan,
        source: context.source,
        allowWeakSections: true,
      });
      return [
        ...assertEqual(
          reviewer.sections[0]?.coverageStatus,
          "weak",
          "Weak coverage status was not preserved.",
        ),
        ...assertEqual(
          reviewer.metadata.coverageStatus,
          "weak",
          "Weak report status was not preserved in metadata.",
        ),
      ];
    }
  }
}

function runOrderingScenario(
  scenario: OrderingScenario,
): readonly EvalIssue[] {
  const context = createContext([
    "concept-card",
    "process-step",
    "example-card",
    "claim-card",
  ]);
  const outputs = context.sections.map((section, index) =>
    createValidOutput(section, `output-${index}`),
  );
  const shuffledOutputs = [
    requireOutput(outputs[3]),
    requireOutput(outputs[1]),
    requireOutput(outputs[0]),
    requireOutput(outputs[2]),
  ];
  const coverage = createCoverage(context, shuffledOutputs);
  const args: AssembleReviewerArgs = {
    outputs: shuffledOutputs,
    coverage,
    plan: context.plan,
    source: context.source,
  };

  switch (scenario) {
    case "plan-order": {
      const reviewer = assembleReviewer(args);
      return assertDeepEqual(
        reviewer.sections.map((section) => section.plannedSectionId),
        context.plan.sections.map((section) => section.id),
        "Reviewer sections did not follow generation plan order.",
      );
    }
    case "reviewer-id": {
      const first = assembleReviewer(args);
      const second = assembleReviewer(args);
      return assertEqual(
        first.id,
        second.id,
        "Repeated assembly changed the reviewer output ID.",
      );
    }
    case "section-ids": {
      const first = assembleReviewer(args);
      const second = assembleReviewer(args);
      return assertDeepEqual(
        first.sections.map((section) => section.id),
        second.sections.map((section) => section.id),
        "Repeated assembly changed reviewer section IDs.",
      );
    }
    case "output-title": {
      const firstSection = requireSection(context.sections[0]);
      const titledOutput = {
        ...createValidOutput(firstSection),
        title: "Generated Reviewer Title",
      } as SectionOutput;
      const singleContext = createContext(["concept-card"]);
      const singleSection = requireSection(singleContext.sections[0]);
      const matchingOutput = {
        ...titledOutput,
        plannedSectionId: singleSection.id,
        sourceBlockIds: [...singleSection.sourceBlockIds],
      } as SectionOutput;
      const singleCoverage = createCoverage(singleContext, [matchingOutput]);
      const reviewer = assembleReviewer({
        outputs: [matchingOutput],
        coverage: singleCoverage,
        plan: singleContext.plan,
        source: singleContext.source,
      });
      return assertEqual(
        reviewer.sections[0]?.title,
        "Generated Reviewer Title",
        "Reviewer section did not use the generated output title.",
      );
    }
    case "immutable-inputs": {
      const before = JSON.stringify(args);
      assembleReviewer(args);
      return assertEqual(
        JSON.stringify(args),
        before,
        "Reviewer assembly mutated its inputs.",
      );
    }
  }
}

function runValidationScenario(scenario: ValidationScenario): void {
  const schemaKinds =
    scenario === "missing-coverage-result"
      ? (["concept-card", "process-step"] as const)
      : (["concept-card"] as const);
  const context = createContext(schemaKinds);
  const firstSection = requireSection(context.sections[0]);
  const outputs = context.sections.map((section) => createValidOutput(section));
  const firstOutput = requireOutput(outputs[0]);
  let coverage = createCoverage(context, outputs);
  let args: AssembleReviewerArgs = {
    outputs,
    coverage,
    plan: context.plan,
    source: context.source,
  };

  switch (scenario) {
    case "missing-output":
      args = { ...args, outputs: [] };
      break;
    case "unplanned-output":
      args = {
        ...args,
        outputs: [
          firstOutput,
          {
            ...firstOutput,
            id: "unplanned-output",
            plannedSectionId: "unplanned-section",
          },
        ],
      };
      break;
    case "wrong-kind":
      args = {
        ...args,
        outputs: [createWrongKindOutput(firstSection)],
      };
      break;
    case "failed-coverage":
      coverage = withCoverageStatus(coverage, firstSection.id, "failed", 0.5);
      args = { ...args, coverage };
      break;
    case "weak-coverage": {
      const weakOutput = createWeakOutput(firstSection);
      args = {
        ...args,
        outputs: [weakOutput],
        coverage: createCoverage(context, [weakOutput]),
      };
      break;
    }
    case "missing-coverage-result":
      args = {
        ...args,
        coverage: {
          ...coverage,
          sections: coverage.sections.slice(0, 1),
        },
      };
      break;
    case "plan-source-mismatch":
      args = {
        ...args,
        plan: { ...context.plan, sourceId: "different-source" },
      };
      break;
    case "coverage-plan-mismatch":
      args = {
        ...args,
        coverage: { ...coverage, planId: "different-plan" },
      };
      break;
    case "missing-output-source-block":
      args = {
        ...args,
        outputs: [
          { ...firstOutput, sourceBlockIds: ["missing-block"] } as SectionOutput,
        ],
      };
      break;
    case "missing-plan-source-block": {
      const brokenSection: PlannedSection = {
        ...firstSection,
        sourceBlockIds: ["missing-block"],
        target: {
          ...firstSection.target,
          requiredSourceBlockIds: ["missing-block"],
        },
      };
      args = {
        ...args,
        plan: { ...context.plan, sections: [brokenSection] },
      };
      break;
    }
    case "duplicate-output":
      args = { ...args, outputs: [firstOutput, firstOutput] };
      break;
    case "duplicate-coverage":
      args = {
        ...args,
        coverage: {
          ...coverage,
          sections: [coverage.sections[0], coverage.sections[0]].filter(
            (result): result is NonNullable<typeof result> => result !== undefined,
          ),
        },
      };
      break;
    case "missing-outputs":
      args = {
        ...args,
        outputs: undefined as unknown as readonly SectionOutput[],
      };
      break;
    case "missing-coverage":
      args = { ...args, coverage: undefined as unknown as CoverageReport };
      break;
    case "missing-plan":
      args = { ...args, plan: undefined as unknown as GenerationPlan };
      break;
    case "missing-source":
      args = { ...args, source: undefined as unknown as NormalizedSource };
      break;
    case "empty-plan":
      args = { ...args, plan: { ...context.plan, sections: [] } };
      break;
    case "empty-coverage":
      args = { ...args, coverage: { ...coverage, sections: [] } };
      break;
  }

  assembleReviewer(args);
}

function createCoverage(
  context: Stage6Context,
  outputs: readonly SectionOutput[],
): CoverageReport {
  return verifyCoverage({
    outputs,
    plan: context.plan,
    source: context.source,
  });
}

function withCoverageStatus(
  coverage: CoverageReport,
  sectionId: string,
  status: "passed" | "weak" | "failed",
  score: number,
): CoverageReport {
  return {
    ...coverage,
    status,
    score,
    sections: coverage.sections.map((result) =>
      result.plannedSectionId === sectionId
        ? { ...result, status, score, retryable: status !== "passed" }
        : result,
    ),
  };
}

function createContext(schemaKinds: readonly SectionSchemaKind[]): Stage6Context {
  const blocks = schemaKinds.flatMap((_schemaKind, sectionIndex) => [
    {
      id: `source-${sectionIndex}-a`,
      kind: "paragraph" as const,
      text: `Complete source content A for section ${sectionIndex + 1}.`,
      order: sectionIndex * 2,
    },
    {
      id: `source-${sectionIndex}-b`,
      kind: "paragraph" as const,
      text: `Complete source content B for section ${sectionIndex + 1}.`,
      order: sectionIndex * 2 + 1,
    },
  ]);
  const source: NormalizedSource = {
    id: "stage6-source",
    title: "Stage 6 Source",
    kind: "document",
    language: "en",
    metadata: {},
    blocks,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  const sections = schemaKinds.map((schemaKind, index) => {
    const sourceBlockIds = [`source-${index}-a`, `source-${index}-b`];
    return createPlannedSection(schemaKind, index, sourceBlockIds);
  });
  const plan: GenerationPlan = {
    id: "stage6-plan",
    sourceId: source.id,
    outlineId: "stage6-outline",
    title: "Stage 6 Reviewer",
    sections,
    metadata: {
      sectionCount: sections.length,
      sourceBlockCount: source.blocks.length,
    },
  };

  return { source, plan, sections };
}

function createPlannedSection(
  schemaKind: SectionSchemaKind,
  order: number,
  sourceBlockIds: readonly string[],
): PlannedSection {
  return {
    id: `planned-${schemaKind}-${order}`,
    sourceSectionId: `outline-section-${order}`,
    title: `Planned Section ${order + 1}`,
    order,
    schemaKind,
    target: {
      objective: `Generate ${schemaKind}.`,
      itemCount: 2,
      focus: `Section ${order + 1}`,
      requiredSourceBlockIds: [...sourceBlockIds],
      expectedTags: [tagForSchemaKind(schemaKind)],
      coverageRules: ["Cover every required source block."],
    },
    sourceBlockIds: [...sourceBlockIds],
  };
}

function createValidOutput(
  section: PlannedSection,
  id = `output-${section.schemaKind}-${section.order}`,
): SectionOutput {
  const base = {
    id,
    plannedSectionId: section.id,
    title: `Generated ${section.title}`,
    sourceBlockIds: [...section.sourceBlockIds],
  };

  switch (section.schemaKind) {
    case "concept-card":
      return {
        ...base,
        kind: "concept-card",
        explanation: "A complete explanation grounded in the required source.",
        keyPoints: ["A complete key point grounded in the required source."],
      };
    case "process-step":
      return {
        ...base,
        kind: "process-step",
        steps: ["Complete the first source-grounded step."],
        summary: "A complete summary of the ordered process.",
      };
    case "example-card":
      return {
        ...base,
        kind: "example-card",
        scenario: "A complete scenario grounded in the required source.",
        explanation: "A complete explanation of the source-grounded scenario.",
        takeaway: "A complete practical takeaway from the scenario.",
      };
    case "claim-card":
      return {
        ...base,
        kind: "claim-card",
        claim: "A complete claim grounded in the required source.",
        support: "Complete supporting evidence from the required source.",
        reasoning: "Complete reasoning connecting the support to the claim.",
      };
  }
}

function createWeakOutput(section: PlannedSection): SectionOutput {
  const output = createValidOutput(section, "weak-output");
  if (output.kind !== "concept-card") {
    throw new Error("Weak-output eval setup requires a concept-card section.");
  }
  return { ...output, explanation: "Brief." };
}

function createWrongKindOutput(section: PlannedSection): SectionOutput {
  return {
    id: "wrong-kind-output",
    kind: "claim-card",
    plannedSectionId: section.id,
    title: section.title,
    claim: "A complete but incorrectly routed claim.",
    support: "Complete support for the incorrectly routed claim.",
    reasoning: "Complete reasoning for the incorrectly routed claim.",
    sourceBlockIds: [...section.sourceBlockIds],
  };
}

function tagForSchemaKind(schemaKind: SectionSchemaKind) {
  switch (schemaKind) {
    case "concept-card":
      return "concept" as const;
    case "process-step":
      return "process" as const;
    case "example-card":
      return "example" as const;
    case "claim-card":
      return "claim" as const;
  }
}

function requireSection(section: PlannedSection | undefined): PlannedSection {
  if (!section) {
    throw new Error("Eval setup requires a planned section.");
  }
  return section;
}

function requireOutput(output: SectionOutput | undefined): SectionOutput {
  if (!output) {
    throw new Error("Eval setup requires a section output.");
  }
  return output;
}

if (isDirectExecution(import.meta.url)) {
  await runStage6AssembleEvals();
}
