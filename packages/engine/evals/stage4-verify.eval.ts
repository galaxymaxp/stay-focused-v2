import basicFixtures from "./fixtures/stage4-basic.json" with { type: "json" };
import statusFixtures from "./fixtures/stage4-status.json" with { type: "json" };
import validationFixtures from "./fixtures/stage4-validation.json" with {
  type: "json",
};

import {
  verifyCoverage,
  type VerifyCoverageArgs,
} from "../src/stage4-verify.js";
import type {
  CoverageStatus,
  GenerationPlan,
  NormalizedSource,
  PlannedSection,
  SectionOutput,
  SectionSchemaKind,
} from "../src/types.js";
import {
  assertDeepEqual,
  assertEqual,
  assertIncludes,
  errorMessage,
  isDirectExecution,
  printEvalSuiteResult,
  runEvalSuite,
  setFailureExitCode,
} from "./assert.js";
import type { EvalCase, EvalIssue, EvalSuite } from "./types.js";

interface Stage4BasicFixture {
  readonly name: string;
  readonly schemaKind: SectionSchemaKind;
  readonly expectStatus: CoverageStatus;
  readonly expectScore: number;
}

type StatusScenario =
  | "missing-output"
  | "wrong-kind"
  | "missing-field"
  | "empty-field"
  | "weak-content"
  | "partial-coverage"
  | "unknown-source-block"
  | "unplanned-output"
  | "multiple-passed"
  | "multiple-weak"
  | "multiple-failed";

interface Stage4StatusFixture {
  readonly name: string;
  readonly scenario: StatusScenario;
  readonly expectReportStatus: CoverageStatus;
  readonly expectReportScore?: number;
  readonly expectSectionStatuses: readonly CoverageStatus[];
  readonly expectSectionScores?: readonly number[];
  readonly expectRetryable?: readonly boolean[];
  readonly expectSectionOrder?: readonly string[];
  readonly expectIssuesContain?: readonly string[];
}

type ValidationScenario =
  | "source-mismatch"
  | "missing-plan-source-block"
  | "missing-outputs"
  | "missing-plan"
  | "missing-source"
  | "empty-plan";

interface Stage4ValidationFixture {
  readonly name: string;
  readonly scenario: ValidationScenario;
  readonly expectError: string;
}

interface FixtureFile<TFixture> {
  readonly cases: readonly TFixture[];
}

interface Stage4Context {
  readonly source: NormalizedSource;
  readonly plan: GenerationPlan;
  readonly sections: readonly PlannedSection[];
}

const basicCases = (basicFixtures as FixtureFile<Stage4BasicFixture>).cases;
const statusCases = (statusFixtures as FixtureFile<Stage4StatusFixture>).cases;
const validationCases = (
  validationFixtures as FixtureFile<Stage4ValidationFixture>
).cases;

export const stage4VerifySuite: EvalSuite = {
  name: "Stage 4 coverage verification",
  cases: [
    ...basicCases.map(createBasicCase),
    ...statusCases.map(createStatusCase),
    ...validationCases.map(createValidationCase),
  ],
};

export async function runStage4VerifyEvals(): Promise<boolean> {
  const result = await runEvalSuite(stage4VerifySuite);
  printEvalSuiteResult(result);
  setFailureExitCode([result]);
  return result.status === "passed";
}

if (isDirectExecution(import.meta.url)) {
  await runStage4VerifyEvals();
}

function createBasicCase(fixture: Stage4BasicFixture): EvalCase {
  return {
    name: fixture.name,
    run: async () => {
      const context = createContext([fixture.schemaKind]);
      const output = createValidOutput(fixture.schemaKind, context.sections[0]);
      const report = verifyCoverage({
        plan: context.plan,
        outputs: [output],
        source: context.source,
      });
      const repeatedReport = verifyCoverage({
        plan: context.plan,
        outputs: [output],
        source: context.source,
      });
      const result = report.sections[0];
      const issues: EvalIssue[] = [];

      if (!result) {
        return [{ message: "Coverage report did not contain a section result." }];
      }
      issues.push(
        ...assertEqual(
          result.status,
          fixture.expectStatus,
          "Section coverage status did not match.",
        ),
        ...assertEqual(
          result.score,
          fixture.expectScore,
          "Section coverage score did not match.",
        ),
        ...assertEqual(
          result.retryable,
          false,
          "Passing coverage result should not be retryable.",
        ),
        ...assertEqual(
          report.status,
          "passed",
          "Valid output should produce a passing report.",
        ),
        ...assertEqual(
          report.planId,
          context.plan.id,
          "Coverage report plan ID did not match.",
        ),
        ...assertEqual(
          report.sourceId,
          context.source.id,
          "Coverage report source ID did not match.",
        ),
        ...assertEqual(
          repeatedReport.id,
          report.id,
          "Repeated verification changed the coverage report ID.",
        ),
      );

      return issues;
    },
  };
}

function createStatusCase(fixture: Stage4StatusFixture): EvalCase {
  return {
    name: fixture.name,
    run: async () => {
      const { context, outputs } = createStatusScenario(fixture.scenario);
      const report = verifyCoverage({
        plan: context.plan,
        outputs,
        source: context.source,
      });
      const issues: EvalIssue[] = [];

      issues.push(
        ...assertEqual(
          report.status,
          fixture.expectReportStatus,
          "Overall coverage status did not match.",
        ),
        ...assertDeepEqual(
          report.sections.map((section) => section.status),
          fixture.expectSectionStatuses,
          "Section coverage statuses did not match.",
        ),
      );
      if (fixture.expectReportScore !== undefined) {
        issues.push(
          ...assertEqual(
            report.score,
            fixture.expectReportScore,
            "Overall coverage score did not match.",
          ),
        );
      }
      if (fixture.expectSectionScores !== undefined) {
        issues.push(
          ...assertDeepEqual(
            report.sections.map((section) => section.score),
            fixture.expectSectionScores,
            "Section coverage scores did not match.",
          ),
        );
      }
      if (fixture.expectRetryable !== undefined) {
        issues.push(
          ...assertDeepEqual(
            report.sections.map((section) => section.retryable),
            fixture.expectRetryable,
            "Section retryability did not match.",
          ),
        );
      }
      if (fixture.expectSectionOrder !== undefined) {
        issues.push(
          ...assertDeepEqual(
            report.sections.map((section) => section.plannedSectionId),
            fixture.expectSectionOrder,
            "Coverage report section order did not match.",
          ),
        );
      }
      const issueText = report.sections
        .flatMap((section) => section.issues)
        .join("\n");
      for (const expectedIssue of fixture.expectIssuesContain ?? []) {
        issues.push(
          ...assertIncludes(
            issueText,
            expectedIssue,
            "Coverage issues did not contain expected text.",
          ),
        );
      }

      return issues;
    },
  };
}

function createValidationCase(fixture: Stage4ValidationFixture): EvalCase {
  return {
    name: fixture.name,
    run: async () => {
      try {
        runValidationScenario(fixture.scenario);
        return [
          {
            message: "Expected coverage verification to throw an error.",
            expected: fixture.expectError,
            actual: "No error was thrown",
          },
        ];
      } catch (error) {
        return assertEqual(
          errorMessage(error),
          fixture.expectError,
          "Coverage validation error message did not match.",
        );
      }
    },
  };
}

function createStatusScenario(
  scenario: StatusScenario,
): { readonly context: Stage4Context; readonly outputs: readonly SectionOutput[] } {
  const multiple = scenario.startsWith("multiple-");
  const context = createContext(
    multiple ? ["concept-card", "process-step"] : ["concept-card"],
  );
  const firstSection = requireSection(context.sections[0]);
  const secondSection = context.sections[1];
  const firstOutput = createValidOutput(firstSection.schemaKind, firstSection);
  const secondOutput = secondSection
    ? createValidOutput(secondSection.schemaKind, secondSection)
    : undefined;

  switch (scenario) {
    case "missing-output":
      return { context, outputs: [] };
    case "wrong-kind":
      return {
        context,
        outputs: [
          {
            ...createValidOutput("claim-card", firstSection),
            plannedSectionId: firstSection.id,
          },
        ],
      };
    case "missing-field":
      return {
        context,
        outputs: [omitField(firstOutput, "explanation")],
      };
    case "empty-field":
      return {
        context,
        outputs: [{ ...firstOutput, explanation: "" } as SectionOutput],
      };
    case "weak-content":
      return {
        context,
        outputs: [{ ...firstOutput, explanation: "Brief." } as SectionOutput],
      };
    case "partial-coverage":
      return {
        context,
        outputs: [
          { ...firstOutput, sourceBlockIds: ["source-a"] } as SectionOutput,
        ],
      };
    case "unknown-source-block":
      return {
        context,
        outputs: [
          {
            ...firstOutput,
            sourceBlockIds: ["source-a", "source-b", "unknown-block"],
          } as SectionOutput,
        ],
      };
    case "unplanned-output":
      return {
        context,
        outputs: [
          firstOutput,
          {
            ...firstOutput,
            id: "unplanned-output",
            plannedSectionId: "unplanned-section",
          },
        ],
      };
    case "multiple-passed":
      return { context, outputs: [firstOutput, requireOutput(secondOutput)] };
    case "multiple-weak":
      return {
        context,
        outputs: [
          firstOutput,
          {
            ...requireOutput(secondOutput),
            sourceBlockIds: ["source-c"],
          } as SectionOutput,
        ],
      };
    case "multiple-failed":
      return { context, outputs: [firstOutput] };
  }
}

function runValidationScenario(scenario: ValidationScenario): void {
  const context = createContext(["concept-card"]);
  const section = requireSection(context.sections[0]);
  const output = createValidOutput(section.schemaKind, section);
  let args: VerifyCoverageArgs = {
    plan: context.plan,
    outputs: [output],
    source: context.source,
  };

  switch (scenario) {
    case "source-mismatch":
      args = {
        ...args,
        plan: { ...context.plan, sourceId: "different-source" },
      };
      break;
    case "missing-plan-source-block": {
      const brokenSection: PlannedSection = {
        ...section,
        sourceBlockIds: ["missing-block"],
        target: {
          ...section.target,
          requiredSourceBlockIds: ["missing-block"],
        },
      };
      args = {
        ...args,
        plan: { ...context.plan, sections: [brokenSection] },
      };
      break;
    }
    case "missing-outputs":
      args = { ...args, outputs: undefined as unknown as readonly SectionOutput[] };
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
  }

  verifyCoverage(args);
}

function createContext(schemaKinds: readonly SectionSchemaKind[]): Stage4Context {
  const source: NormalizedSource = {
    id: "stage4-source",
    title: "Stage 4 Source",
    kind: "document",
    language: "en",
    metadata: {},
    blocks: [
      { id: "source-a", kind: "paragraph", text: "Source alpha content.", order: 0 },
      { id: "source-b", kind: "paragraph", text: "Source beta content.", order: 1 },
      { id: "source-c", kind: "paragraph", text: "Source gamma content.", order: 2 },
      { id: "source-d", kind: "paragraph", text: "Source delta content.", order: 3 }
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  const sections = schemaKinds.map((schemaKind, index) => {
    const sourceBlockIds = index === 0
      ? ["source-a", "source-b"]
      : ["source-c", "source-d"];
    return createPlannedSection(schemaKind, index, sourceBlockIds);
  });
  const plan: GenerationPlan = {
    id: "stage4-plan",
    sourceId: source.id,
    outlineId: "stage4-outline",
    title: source.title,
    sections,
    metadata: { sectionCount: sections.length, sourceBlockCount: source.blocks.length },
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
    title: `Section ${order + 1}`,
    order,
    schemaKind,
    target: {
      objective: `Verify ${schemaKind}.`,
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
  schemaKind: SectionSchemaKind,
  section: PlannedSection | undefined,
): SectionOutput {
  const plannedSection = requireSection(section);
  const base = {
    id: `output-${schemaKind}-${plannedSection.order}`,
    plannedSectionId: plannedSection.id,
    title: plannedSection.title,
    sourceBlockIds: [...plannedSection.sourceBlockIds],
  };

  switch (schemaKind) {
    case "concept-card":
      return {
        ...base,
        kind: "concept-card",
        explanation: "A complete explanation grounded in the required source.",
        keyPoints: ["A complete key point grounded in the source."],
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

function tagForSchemaKind(schemaKind: SectionSchemaKind) {
  switch (schemaKind) {
    case "concept-card": return "concept" as const;
    case "process-step": return "process" as const;
    case "example-card": return "example" as const;
    case "claim-card": return "claim" as const;
  }
}

function omitField(output: SectionOutput, field: string): SectionOutput {
  return Object.fromEntries(
    Object.entries(output).filter(([key]) => key !== field),
  ) as unknown as SectionOutput;
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
