import basicFixtures from "./fixtures/stage5-basic.json" with { type: "json" };
import policyFixtures from "./fixtures/stage5-policy.json" with { type: "json" };
import validationFixtures from "./fixtures/stage5-validation.json" with {
  type: "json",
};

import type {
  GenerationProvider,
  GenerationRequest,
} from "../src/provider.js";
import {
  retryFailedSections,
  type RetryFailedSectionsArgs,
} from "../src/stage5-retry.js";
import { verifyCoverage } from "../src/stage4-verify.js";
import type {
  CoverageReport,
  GenerationPlan,
  NormalizedSource,
  PlannedSection,
  RetryPolicy,
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

type BasicScenario =
  | "passed-preserved"
  | "weak-retried"
  | "failed-retried"
  | "retryable-false"
  | "successful-replaces"
  | "failed-retry-keeps"
  | "missing-generated"
  | "provider-failure-no-output"
  | "plan-order"
  | "unplanned-excluded";

type PolicyScenario =
  | "weak-disabled"
  | "failed-disabled"
  | "zero-retries"
  | "bounded-calls"
  | "default-two-retries"
  | "failure-then-success";

type ValidationScenario =
  | "negative-retries"
  | "fractional-retries"
  | "excessive-retries"
  | "coverage-plan-mismatch"
  | "plan-source-mismatch"
  | "unknown-coverage-section"
  | "missing-source-block"
  | "missing-outputs"
  | "missing-coverage"
  | "missing-plan"
  | "missing-source"
  | "missing-provider";

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

interface Stage5Context {
  readonly source: NormalizedSource;
  readonly plan: GenerationPlan;
  readonly sections: readonly PlannedSection[];
}

type ProviderResponse =
  | { readonly type: "output"; readonly output: SectionOutput }
  | { readonly type: "error"; readonly message: string };

const basicCases = (
  basicFixtures as FixtureFile<ScenarioFixture<BasicScenario>>
).cases;
const policyCases = (
  policyFixtures as FixtureFile<ScenarioFixture<PolicyScenario>>
).cases;
const validationCases = (
  validationFixtures as FixtureFile<ValidationFixture>
).cases;

export const stage5RetrySuite: EvalSuite = {
  name: "Stage 5 bounded retries",
  cases: [
    ...basicCases.map(createBasicCase),
    ...policyCases.map(createPolicyCase),
    ...validationCases.map(createValidationCase),
  ],
};

export async function runStage5RetryEvals(): Promise<boolean> {
  const result = await runEvalSuite(stage5RetrySuite);
  printEvalSuiteResult(result);
  setFailureExitCode([result]);
  return result.status === "passed";
}

function createBasicCase(fixture: ScenarioFixture<BasicScenario>): EvalCase {
  return {
    name: fixture.name,
    run: () => runBasicScenario(fixture.scenario),
  };
}

function createPolicyCase(fixture: ScenarioFixture<PolicyScenario>): EvalCase {
  return {
    name: fixture.name,
    run: () => runPolicyScenario(fixture.scenario),
  };
}

function createValidationCase(fixture: ValidationFixture): EvalCase {
  return {
    name: fixture.name,
    run: async () => {
      try {
        await runValidationScenario(fixture.scenario);
        return [
          {
            message: "Expected Stage 5 retry validation to throw an error.",
            expected: fixture.expectError,
            actual: "No error was thrown",
          },
        ];
      } catch (error) {
        return assertEqual(
          errorMessage(error),
          fixture.expectError,
          "Stage 5 validation error message did not match.",
        );
      }
    },
  };
}

async function runBasicScenario(
  scenario: BasicScenario,
): Promise<readonly EvalIssue[]> {
  if (scenario === "plan-order") {
    return runPlanOrderCase();
  }

  const context = createContext(["concept-card"]);
  const section = requireSection(context.sections[0]);
  const passedOutput = createValidOutput(section, "passed-output");
  const weakOutput = createWeakOutput(section, "weak-output");
  const failedOutput = createWrongKindOutput(section, "failed-output");
  const retryOutput = createValidOutput(section, "retry-output");

  switch (scenario) {
    case "passed-preserved": {
      const provider = new FakeProvider([outputResponse(retryOutput)]);
      const outputs = await retryFailedSections({
        ...baseArgs(context, [passedOutput], provider),
        coverage: createCoverage(context, [passedOutput]),
      });
      return [
        ...assertEqual(
          outputs[0],
          passedOutput,
          "Passed output object was not preserved.",
        ),
        ...assertEqual(
          provider.requests.length,
          0,
          "Passed section unexpectedly called the provider.",
        ),
      ];
    }
    case "weak-retried": {
      const provider = new FakeProvider([outputResponse(retryOutput)]);
      const outputs = await retryFailedSections({
        ...baseArgs(context, [weakOutput], provider),
        coverage: createCoverage(context, [weakOutput]),
      });
      return [
        ...assertEqual(
          provider.requests.length,
          1,
          "Weak retryable section did not call the provider once.",
        ),
        ...assertEqual(
          outputs[0]?.id,
          retryOutput.id,
          "Weak section was not replaced by the retry output.",
        ),
      ];
    }
    case "failed-retried": {
      const provider = new FakeProvider([outputResponse(retryOutput)]);
      const outputs = await retryFailedSections({
        ...baseArgs(context, [failedOutput], provider),
        coverage: createCoverage(context, [failedOutput]),
      });
      return [
        ...assertEqual(
          provider.requests.length,
          1,
          "Failed retryable section did not call the provider once.",
        ),
        ...assertEqual(
          outputs[0]?.id,
          retryOutput.id,
          "Failed section was not replaced by the retry output.",
        ),
      ];
    }
    case "retryable-false": {
      const provider = new FakeProvider([outputResponse(retryOutput)]);
      const coverage = withRetryable(
        createCoverage(context, [weakOutput]),
        section.id,
        false,
      );
      const outputs = await retryFailedSections({
        ...baseArgs(context, [weakOutput], provider),
        coverage,
      });
      return [
        ...assertEqual(
          provider.requests.length,
          0,
          "Non-retryable section unexpectedly called the provider.",
        ),
        ...assertEqual(
          outputs[0],
          weakOutput,
          "Non-retryable output was not preserved.",
        ),
      ];
    }
    case "successful-replaces": {
      const provider = new FakeProvider([outputResponse(retryOutput)]);
      const outputs = await retryFailedSections({
        ...baseArgs(context, [weakOutput], provider),
        coverage: createCoverage(context, [weakOutput]),
      });
      const finalCoverage = createCoverage(context, outputs);
      return [
        ...assertEqual(
          outputs[0]?.id,
          retryOutput.id,
          "Successful retry did not replace the weak output.",
        ),
        ...assertEqual(
          finalCoverage.sections[0]?.status,
          "passed",
          "Successful retry did not pass renewed coverage verification.",
        ),
      ];
    }
    case "failed-retry-keeps": {
      const provider = new FakeProvider([errorResponse("provider unavailable")]);
      const outputs = await retryFailedSections({
        ...baseArgs(context, [weakOutput], provider),
        coverage: createCoverage(context, [weakOutput]),
      });
      return [
        ...assertEqual(
          provider.requests.length,
          2,
          "Provider failures did not use the default retry bound.",
        ),
        ...assertEqual(
          outputs[0],
          weakOutput,
          "Provider failure should keep the previous output.",
        ),
      ];
    }
    case "missing-generated": {
      const provider = new FakeProvider([outputResponse(retryOutput)]);
      const outputs = await retryFailedSections({
        ...baseArgs(context, [], provider),
        coverage: createCoverage(context, []),
      });
      return [
        ...assertEqual(
          provider.requests.length,
          1,
          "Missing retryable output was not generated.",
        ),
        ...assertEqual(
          outputs[0]?.id,
          retryOutput.id,
          "Generated output was not added to the final result.",
        ),
      ];
    }
    case "provider-failure-no-output": {
      const provider = new FakeProvider([errorResponse("provider unavailable")]);
      const outputs = await retryFailedSections({
        ...baseArgs(context, [], provider),
        coverage: createCoverage(context, []),
      });
      return [
        ...assertEqual(
          provider.requests.length,
          2,
          "Missing output did not honor the default retry bound.",
        ),
        ...assertEqual(
          outputs.length,
          0,
          "All failed retries should leave a missing output omitted.",
        ),
      ];
    }
    case "unplanned-excluded": {
      const unplannedOutput: SectionOutput = {
        ...passedOutput,
        id: "unplanned-output",
        plannedSectionId: "unplanned-section",
      };
      const provider = new FakeProvider([outputResponse(retryOutput)]);
      const outputs = await retryFailedSections({
        ...baseArgs(context, [unplannedOutput, passedOutput], provider),
        coverage: createCoverage(context, [passedOutput]),
      });
      return [
        ...assertDeepEqual(
          outputs.map((output) => output.id),
          [passedOutput.id],
          "Unplanned outputs were not excluded deterministically.",
        ),
        ...assertEqual(
          provider.requests.length,
          0,
          "Passed planned output unexpectedly triggered a retry.",
        ),
      ];
    }
  }
}

async function runPlanOrderCase(): Promise<readonly EvalIssue[]> {
  const context = createContext([
    "concept-card",
    "process-step",
    "example-card",
  ]);
  const outputs = context.sections.map((section, index) =>
    createValidOutput(section, `ordered-output-${index}`),
  );
  const shuffled = [requireOutput(outputs[2]), outputs[0], outputs[1]].filter(
    (output): output is SectionOutput => output !== undefined,
  );
  const provider = new FakeProvider([
    outputResponse(createValidOutput(requireSection(context.sections[0]))),
  ]);
  const result = await retryFailedSections({
    ...baseArgs(context, shuffled, provider),
    coverage: createCoverage(context, shuffled),
  });

  return assertDeepEqual(
    result.map((output) => output.plannedSectionId),
    context.plan.sections.map((section) => section.id),
    "Final outputs did not follow generation plan order.",
  );
}

async function runPolicyScenario(
  scenario: PolicyScenario,
): Promise<readonly EvalIssue[]> {
  const context = createContext(["concept-card"]);
  const section = requireSection(context.sections[0]);
  const weakOutput = createWeakOutput(section, "weak-output");
  const failedOutput = createWrongKindOutput(section, "failed-output");
  const passedRetry = createValidOutput(section, "passed-retry");

  switch (scenario) {
    case "weak-disabled": {
      const provider = new FakeProvider([outputResponse(passedRetry)]);
      const outputs = await retryFailedSections({
        ...baseArgs(context, [weakOutput], provider),
        coverage: createCoverage(context, [weakOutput]),
        retryPolicy: policy({ retryWeakSections: false }),
      });
      return [
        ...assertEqual(provider.requests.length, 0, "Weak retry policy was ignored."),
        ...assertEqual(outputs[0], weakOutput, "Skipped weak output was not preserved."),
      ];
    }
    case "failed-disabled": {
      const provider = new FakeProvider([outputResponse(passedRetry)]);
      const outputs = await retryFailedSections({
        ...baseArgs(context, [failedOutput], provider),
        coverage: createCoverage(context, [failedOutput]),
        retryPolicy: policy({ retryFailedSections: false }),
      });
      return [
        ...assertEqual(provider.requests.length, 0, "Failed retry policy was ignored."),
        ...assertEqual(outputs[0], failedOutput, "Skipped failed output was not preserved."),
      ];
    }
    case "zero-retries": {
      const provider = new FakeProvider([outputResponse(passedRetry)]);
      const outputs = await retryFailedSections({
        ...baseArgs(context, [weakOutput], provider),
        coverage: createCoverage(context, [weakOutput]),
        retryPolicy: policy({ maxRetries: 0 }),
      });
      return [
        ...assertEqual(provider.requests.length, 0, "maxRetries zero called the provider."),
        ...assertEqual(outputs[0], weakOutput, "maxRetries zero changed the output."),
      ];
    }
    case "bounded-calls": {
      const weakRetry = createWeakOutput(section, "weak-retry");
      const provider = new FakeProvider([outputResponse(weakRetry)]);
      const outputs = await retryFailedSections({
        ...baseArgs(context, [weakOutput], provider),
        coverage: createCoverage(context, [weakOutput]),
        retryPolicy: policy({ maxRetries: 3 }),
      });
      return [
        ...assertEqual(provider.requests.length, 3, "Provider calls exceeded or missed maxRetries."),
        ...assertEqual(outputs[0]?.id, weakRetry.id, "Latest attempted output was not retained."),
      ];
    }
    case "default-two-retries": {
      const provider = new FakeProvider([
        outputResponse(createWeakOutput(section, "default-weak-retry")),
      ]);
      await retryFailedSections({
        ...baseArgs(context, [weakOutput], provider),
        coverage: createCoverage(context, [weakOutput]),
      });
      return assertEqual(
        provider.requests.length,
        2,
        "Default retry policy did not permit exactly two attempts.",
      );
    }
    case "failure-then-success": {
      const provider = new FakeProvider([
        errorResponse("temporary failure"),
        outputResponse(passedRetry),
      ]);
      const outputs = await retryFailedSections({
        ...baseArgs(context, [weakOutput], provider),
        coverage: createCoverage(context, [weakOutput]),
        retryPolicy: policy({ maxRetries: 3 }),
      });
      return [
        ...assertEqual(provider.requests.length, 2, "Retry did not stop after a passing output."),
        ...assertEqual(outputs[0]?.id, passedRetry.id, "Later successful retry was not retained."),
      ];
    }
  }
}

async function runValidationScenario(scenario: ValidationScenario): Promise<void> {
  const context = createContext(["concept-card"]);
  const section = requireSection(context.sections[0]);
  const output = createWeakOutput(section, "weak-output");
  const provider = new FakeProvider([outputResponse(createValidOutput(section))]);
  let args: RetryFailedSectionsArgs = {
    ...baseArgs(context, [output], provider),
    coverage: createCoverage(context, [output]),
  };

  switch (scenario) {
    case "negative-retries":
      args = { ...args, retryPolicy: policy({ maxRetries: -1 }) };
      break;
    case "fractional-retries":
      args = { ...args, retryPolicy: policy({ maxRetries: 1.5 }) };
      break;
    case "excessive-retries":
      args = { ...args, retryPolicy: policy({ maxRetries: 6 }) };
      break;
    case "coverage-plan-mismatch":
      args = { ...args, coverage: { ...args.coverage, planId: "different-plan" } };
      break;
    case "plan-source-mismatch":
      args = { ...args, plan: { ...args.plan, sourceId: "different-source" } };
      break;
    case "unknown-coverage-section":
      args = {
        ...args,
        coverage: {
          ...args.coverage,
          sections: [
            ...args.coverage.sections,
            {
              plannedSectionId: "unknown-section",
              status: "failed",
              score: 0,
              issues: ["Unknown section."],
              retryable: false,
            },
          ],
        },
      };
      break;
    case "missing-source-block": {
      const brokenSection: PlannedSection = {
        ...section,
        sourceBlockIds: ["missing-block"],
        target: {
          ...section.target,
          requiredSourceBlockIds: ["missing-block"],
        },
      };
      args = { ...args, plan: { ...args.plan, sections: [brokenSection] } };
      break;
    }
    case "missing-outputs":
      args = { ...args, outputs: undefined as unknown as readonly SectionOutput[] };
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
    case "missing-provider":
      args = { ...args, provider: undefined as unknown as GenerationProvider };
      break;
  }

  await retryFailedSections(args);
}

function baseArgs(
  context: Stage5Context,
  outputs: readonly SectionOutput[],
  provider: GenerationProvider,
): Omit<RetryFailedSectionsArgs, "coverage"> {
  return {
    outputs,
    plan: context.plan,
    source: context.source,
    provider,
  };
}

function createCoverage(
  context: Stage5Context,
  outputs: readonly SectionOutput[],
): CoverageReport {
  return verifyCoverage({
    outputs,
    plan: context.plan,
    source: context.source,
  });
}

function withRetryable(
  coverage: CoverageReport,
  sectionId: string,
  retryable: boolean,
): CoverageReport {
  return {
    ...coverage,
    sections: coverage.sections.map((result) =>
      result.plannedSectionId === sectionId ? { ...result, retryable } : result,
    ),
  };
}

function policy(overrides: Partial<RetryPolicy>): RetryPolicy {
  return {
    maxRetries: 2,
    retryWeakSections: true,
    retryFailedSections: true,
    ...overrides,
  };
}

function createContext(schemaKinds: readonly SectionSchemaKind[]): Stage5Context {
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
    id: "stage5-source",
    title: "Stage 5 Source",
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
    id: "stage5-plan",
    sourceId: source.id,
    outlineId: "stage5-outline",
    title: source.title,
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
    title: `Section ${order + 1}`,
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
    title: section.title,
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

function createWeakOutput(section: PlannedSection, id: string): SectionOutput {
  const output = createValidOutput(section, id);
  if (output.kind !== "concept-card") {
    throw new Error("Weak-output eval setup requires a concept-card section.");
  }
  return { ...output, explanation: "Brief." };
}

function createWrongKindOutput(
  section: PlannedSection,
  id: string,
): SectionOutput {
  return {
    id,
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

function outputResponse(output: SectionOutput): ProviderResponse {
  return { type: "output", output };
}

function errorResponse(message: string): ProviderResponse {
  return { type: "error", message };
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

class FakeProvider implements GenerationProvider {
  public readonly requests: GenerationRequest<unknown>[] = [];
  private responseIndex = 0;

  public constructor(private readonly responses: readonly ProviderResponse[]) {
    if (responses.length === 0) {
      throw new Error("Fake provider requires at least one response.");
    }
  }

  public async generate<TOutput>(
    request: GenerationRequest<TOutput>,
  ): Promise<TOutput> {
    this.requests.push(request);
    const index = Math.min(this.responseIndex, this.responses.length - 1);
    this.responseIndex += 1;
    const response = this.responses[index];
    if (!response) {
      throw new Error("Fake provider response was not configured.");
    }
    if (response.type === "error") {
      throw new Error(response.message);
    }
    return response.output as unknown as TOutput;
  }
}

if (isDirectExecution(import.meta.url)) {
  await runStage5RetryEvals();
}
