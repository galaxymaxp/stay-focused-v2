import basicFixtures from "./fixtures/pipeline-basic.json" with { type: "json" };
import retryFixtures from "./fixtures/pipeline-retry.json" with { type: "json" };
import validationFixtures from "./fixtures/pipeline-validation.json" with {
  type: "json",
};

import {
  PipelineAssemblyError,
  runPipeline,
  type RunPipelineArgs,
} from "../src/generate.js";
import type {
  GenerationProvider,
  GenerationRequest,
} from "../src/provider.js";
import type {
  ReviewerOutput,
  SectionOutput,
  SectionSchemaKind,
  SourceNormalizationInput,
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

type BasicScenario =
  | "simple"
  | "multiple-headings"
  | "source-order"
  | "schema-kind"
  | "default-model"
  | "initial-request-count"
  | "deterministic-id"
  | "metadata"
  | "immutable-input";

type RetryScenario =
  | "weak-then-pass"
  | "weak-then-error"
  | "weak-rejected"
  | "weak-allowed"
  | "retry-bound";

type ValidationScenario =
  | "missing-provider"
  | "missing-input"
  | "empty-input"
  | "initial-provider-failure";

type ProviderBehavior =
  | "pass"
  | "weak-then-pass"
  | "weak-then-error"
  | "always-weak"
  | "initial-error"
  | "first-validation-error"
  | "validation-then-infra-error";

interface BasicFixture {
  readonly name: string;
  readonly scenario: BasicScenario;
  readonly input: SourceNormalizationInput;
  readonly expectKind?: SectionSchemaKind;
}

interface RetryFixture {
  readonly name: string;
  readonly scenario: RetryScenario;
  readonly input: SourceNormalizationInput;
  readonly expectErrorContains?: string;
}

interface ValidationFixture {
  readonly name: string;
  readonly scenario: ValidationScenario;
  readonly expectError?: string;
  readonly expectErrorContains?: string;
}

interface FixtureFile<TFixture> {
  readonly cases: readonly TFixture[];
}

const basicCases = (basicFixtures as FixtureFile<BasicFixture>).cases;
const retryCases = (retryFixtures as FixtureFile<RetryFixture>).cases;
const validationCases = (
  validationFixtures as FixtureFile<ValidationFixture>
).cases;

export const pipelineSuite: EvalSuite = {
  name: "Pipeline integration",
  cases: [
    ...basicCases.map(createBasicCase),
    ...retryCases.map(createRetryCase),
    ...validationCases.map(createValidationCase),
    createCollectAndContinueCase(),
    createInfraErrorBoundaryCase(),
  ],
};

function createCollectAndContinueCase(): EvalCase {
  return {
    name: "Stage 3 validation failure is recorded and the next section is processed",
    run: async () => {
      const provider = new FakeProvider("first-validation-error");
      try {
        await runPipeline({
          input: multiSectionValidationInput(),
          provider,
          retryPolicy: noRetriesPolicy(),
        });
        return [
          {
            message:
              "Expected collected Stage 3 validation failure to reject after the full pass.",
          },
        ];
      } catch (error) {
        if (!(error instanceof PipelineAssemblyError)) {
          return [
            {
              message:
                "Collected validation failure did not produce pipeline diagnostics.",
              actual: errorMessage(error),
            },
          ];
        }

        const firstSectionId = readMetadataString(
          provider.requests[0]?.metadata,
          "plannedSectionId",
        );
        const secondSectionId = readMetadataString(
          provider.requests[1]?.metadata,
          "plannedSectionId",
        );
        return [
          ...assertEqual(
            provider.requests.length,
            2,
            "Pipeline did not attempt the section after a validation failure.",
          ),
          ...assertDeepEqual(
            error.state.sectionValidationFailures,
            [
              {
                sectionTitle: "First Topic",
                sectionId: firstSectionId,
                stage: "stage3",
                reason: "output-validation",
                issues: [
                  `plannedSectionId must be "${firstSectionId}"`,
                ],
              },
            ],
            "Pipeline did not retain the structured Stage 3 failure.",
          ),
          ...assertEqual(
            error.state.outputs.some(
              (output) => output.plannedSectionId === secondSectionId,
            ),
            true,
            "Later section output was not evaluated after the earlier validation failure.",
          ),
        ];
      }
    },
  };
}

function createInfraErrorBoundaryCase(): EvalCase {
  return {
    name: "provider infrastructure error propagates outside collected validation failures",
    run: async () => {
      const provider = new FakeProvider("validation-then-infra-error");
      try {
        await runPipeline({
          input: multiSectionValidationInput(),
          provider,
          retryPolicy: noRetriesPolicy(),
        });
        return [{ message: "Expected provider infrastructure error to propagate." }];
      } catch (error) {
        return [
          ...assertEqual(
            error instanceof PipelineAssemblyError,
            false,
            "Infrastructure error was incorrectly bucketed as a collected pipeline validation failure.",
          ),
          ...assertIncludes(
            errorMessage(error),
            "Stage 3 provider generation failed for section",
            "Infrastructure error lost its Stage 3 provider context.",
          ),
          ...assertIncludes(
            errorMessage(error),
            "second section infrastructure failure",
            "Infrastructure error lost the provider failure detail.",
          ),
          ...assertEqual(
            provider.requests.length,
            2,
            "Infrastructure boundary fixture did not reach the second section.",
          ),
        ];
      }
    },
  };
}

export async function runPipelineEvals(): Promise<boolean> {
  const result = await runEvalSuite(pipelineSuite);
  printEvalSuiteResult(result);
  setFailureExitCode([result]);
  return result.status === "passed";
}

function createBasicCase(fixture: BasicFixture): EvalCase {
  return {
    name: fixture.name,
    run: () => runBasicScenario(fixture),
  };
}

function createRetryCase(fixture: RetryFixture): EvalCase {
  return {
    name: fixture.name,
    run: () => runRetryScenario(fixture),
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
            message: "Expected pipeline execution to throw an error.",
            expected: fixture.expectError ?? fixture.expectErrorContains,
            actual: "No error was thrown",
          },
        ];
      } catch (error) {
        const message = errorMessage(error);
        if (fixture.expectError !== undefined) {
          return assertEqual(
            message,
            fixture.expectError,
            "Pipeline validation error message did not match.",
          );
        }
        return assertIncludes(
          message,
          fixture.expectErrorContains ?? "",
          "Pipeline validation error did not contain expected context.",
        );
      }
    },
  };
}

async function runBasicScenario(
  fixture: BasicFixture,
): Promise<readonly EvalIssue[]> {
  if (fixture.scenario === "deterministic-id") {
    const first = await runWithProvider(fixture.input, new FakeProvider("pass"));
    const second = await runWithProvider(fixture.input, new FakeProvider("pass"));
    return assertEqual(
      first.id,
      second.id,
      "Repeated pipeline runs changed the reviewer output ID.",
    );
  }

  const provider = new FakeProvider("pass");
  const beforeInput = JSON.stringify(fixture.input);
  const reviewer = await runWithProvider(fixture.input, provider);

  switch (fixture.scenario) {
    case "simple":
      return [
        ...assertEqual(
          reviewer.sections.length,
          1,
          "Simple source did not produce one reviewer section.",
        ),
        ...assertEqual(
          reviewer.metadata.coverageStatus,
          "passed",
          "Simple source did not finish with passing coverage.",
        ),
      ];
    case "multiple-headings":
      return assertEqual(
        reviewer.sections.length,
        2,
        "Heading-based source did not produce two reviewer sections.",
      );
    case "source-order":
      return assertDeepEqual(
        reviewer.sections.map((section) => section.title),
        ["First Topic", "Second Topic", "Third Topic"],
        "Reviewer sections did not preserve source heading order.",
      );
    case "schema-kind":
      return assertEqual(
        reviewer.sections[0]?.kind,
        fixture.expectKind,
        "Pipeline schema kind did not match the Stage 1/2 heuristic.",
      );
    case "default-model":
      return assertDeepEqual(
        provider.requests.map((request) => request.model),
        ["gpt-4o"],
        "Pipeline did not use the default model.",
      );
    case "initial-request-count": {
      const initialRequests = provider.requests.filter(
        (request) => request.metadata?.retryAttempt === undefined,
      );
      return [
        ...assertEqual(
          initialRequests.length,
          reviewer.sections.length,
          "Provider did not receive one initial request per planned section.",
        ),
        ...assertEqual(
          provider.requests.length,
          reviewer.sections.length,
          "Passing sections unexpectedly triggered retry requests.",
        ),
      ];
    }
    case "metadata":
      return [
        ...assertEqual(
          reviewer.metadata.sourceId,
          fixture.input.id,
          "Reviewer metadata source ID did not match the normalized input.",
        ),
        ...assertEqual(
          reviewer.metadata.coverageReportId,
          reviewer.metadata.coverage.id,
          "Reviewer metadata coverage report ID did not match the report.",
        ),
        ...assertEqual(
          reviewer.metadata.coverageStatus,
          "passed",
          "Reviewer metadata coverage status did not match.",
        ),
        ...assertEqual(
          reviewer.metadata.planId.length > 0,
          true,
          "Reviewer metadata did not include a plan ID.",
        ),
      ];
    case "immutable-input":
      return assertEqual(
        JSON.stringify(fixture.input),
        beforeInput,
        "Pipeline execution mutated the normalization input.",
      );
  }
}

async function runRetryScenario(
  fixture: RetryFixture,
): Promise<readonly EvalIssue[]> {
  switch (fixture.scenario) {
    case "weak-then-pass": {
      const provider = new FakeProvider("weak-then-pass");
      const reviewer = await runWithProvider(fixture.input, provider);
      return [
        ...assertEqual(
          provider.requests.length,
          2,
          "Weak section did not receive one initial request and one retry.",
        ),
        ...assertEqual(
          provider.requests[1]?.metadata?.retryAttempt,
          1,
          "Retry request did not include the retry attempt metadata.",
        ),
        ...assertEqual(
          reviewer.metadata.coverageStatus,
          "passed",
          "Passing retry did not produce passing final coverage.",
        ),
      ];
    }
    case "weak-then-error": {
      const provider = new FakeProvider("weak-then-error");
      try {
        await runWithProvider(fixture.input, provider);
        return [{ message: "Expected retry provider fault to propagate." }];
      } catch (error) {
        return [
          ...assertIncludes(
            errorMessage(error),
            fixture.expectErrorContains ?? "",
            "Retry provider fault did not propagate with Stage 3 context.",
          ),
          ...assertEqual(
            provider.requests.length,
            2,
            "Retry provider fault was swallowed instead of failing immediately.",
          ),
        ];
      }
    }
    case "weak-rejected": {
      const provider = new FakeProvider("always-weak");
      try {
        await runWithProvider(fixture.input, provider, {
          retryPolicy: noRetriesPolicy(),
        });
        return [{ message: "Expected weak final coverage to be rejected." }];
      } catch (error) {
        return assertIncludes(
          errorMessage(error),
          fixture.expectErrorContains ?? "",
          "Weak final coverage rejection did not match.",
        );
      }
    }
    case "weak-allowed": {
      const provider = new FakeProvider("always-weak");
      const reviewer = await runWithProvider(fixture.input, provider, {
        retryPolicy: noRetriesPolicy(),
        allowWeakSections: true,
      });
      return [
        ...assertEqual(
          reviewer.metadata.coverageStatus,
          "passed",
          "Source-outline coverage status was not preserved.",
        ),
        ...assertEqual(
          reviewer.sections[0]?.coverageStatus,
          "weak",
          "Weak reviewer section status was not preserved.",
        ),
      ];
    }
    case "retry-bound": {
      const provider = new FakeProvider("always-weak");
      const reviewer = await runWithProvider(fixture.input, provider, {
        retryPolicy: {
          maxRetries: 2,
          retryWeakSections: true,
          retryFailedSections: true,
        },
        allowWeakSections: true,
      });
      return [
        ...assertEqual(
          provider.requests.length,
          3,
          "Pipeline provider calls did not respect the retry bound.",
        ),
        ...assertEqual(
          reviewer.metadata.coverageStatus,
          "passed",
          "Bounded weak retries did not preserve source-outline coverage.",
        ),
      ];
    }
  }
}

async function runValidationScenario(
  scenario: ValidationScenario,
): Promise<void> {
  const validInput: SourceNormalizationInput = {
    id: "pipeline-validation-source",
    title: "Pipeline Validation",
    kind: "plain-text",
    language: "en",
    text: "A complete concept explanation for validation.",
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  switch (scenario) {
    case "missing-provider":
      await runPipeline({
        input: validInput,
        provider: undefined as unknown as GenerationProvider,
      });
      return;
    case "missing-input":
      await runPipeline({
        input: undefined as unknown as SourceNormalizationInput,
        provider: new FakeProvider("pass"),
      });
      return;
    case "empty-input":
      await runPipeline({
        input: { kind: "plain-text", text: "   " },
        provider: new FakeProvider("pass"),
      });
      return;
    case "initial-provider-failure":
      await runPipeline({
        input: validInput,
        provider: new FakeProvider("initial-error"),
      });
  }
}

async function runWithProvider(
  input: SourceNormalizationInput,
  provider: GenerationProvider,
  options: Omit<RunPipelineArgs, "input" | "provider"> = {},
): Promise<ReviewerOutput> {
  return runPipeline({ input, provider, ...options });
}

function noRetriesPolicy() {
  return {
    maxRetries: 0,
    retryWeakSections: true,
    retryFailedSections: true,
  } as const;
}

class FakeProvider implements GenerationProvider {
  public readonly requests: GenerationRequest<unknown>[] = [];

  public constructor(private readonly behavior: ProviderBehavior) {}

  public async generate<TOutput>(
    request: GenerationRequest<TOutput>,
  ): Promise<TOutput> {
    this.requests.push(request);
    const retryAttempt = readRetryAttempt(request);
    const initialRequestCount = this.requests.filter(
      (candidate) => readRetryAttempt(candidate) === undefined,
    ).length;

    if (this.behavior === "initial-error" && retryAttempt === undefined) {
      throw new Error("initial provider failure");
    }
    if (
      this.behavior === "validation-then-infra-error" &&
      retryAttempt === undefined &&
      initialRequestCount === 2
    ) {
      throw new Error("second section infrastructure failure");
    }
    if (this.behavior === "weak-then-error" && retryAttempt !== undefined) {
      throw new Error("retry provider failure");
    }

    const weak =
      this.behavior === "always-weak" ||
      ((this.behavior === "weak-then-pass" ||
        this.behavior === "weak-then-error") &&
        retryAttempt === undefined);
    const output = createProviderOutput(request, weak);
    if (
      (this.behavior === "first-validation-error" ||
        this.behavior === "validation-then-infra-error") &&
      retryAttempt === undefined &&
      initialRequestCount === 1
    ) {
      return {
        ...output,
        plannedSectionId: "wrong-planned-section-id",
      } as unknown as TOutput;
    }
    return output as unknown as TOutput;
  }
}

function multiSectionValidationInput(): SourceNormalizationInput {
  return {
    id: "pipeline-collect-and-continue-source",
    kind: "document",
    language: "en",
    text: "# First Topic\n\nThe first topic has factual content.\n\n# Second Topic\n\nThe second topic has factual content.",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function createProviderOutput(
  request: GenerationRequest<unknown>,
  weak: boolean,
): SectionOutput {
  const plannedSectionId = readMetadataString(
    request.metadata,
    "plannedSectionId",
  );
  const schemaKind = readSchemaKind(request.metadata?.schemaKind);
  const title = readPromptValue(request.prompt, "Topic heading — ");
  const sourceBlockIds = readSourceBlockIds(request.prompt);
  const sourceCoreText = readSourceCoreText(request.prompt);
  const sourceCoreKeyPoints = extractSourceCoreKeyPoints(sourceCoreText);
  const base = {
    id: `fake-output-${plannedSectionId}-${weak ? "weak" : "passed"}`,
    plannedSectionId,
    title,
    sourceBlockIds,
    enrichment: null,
  };

  switch (schemaKind) {
    case "concept-card":
      return {
        ...base,
        kind: "concept-card",
        sourceCore: {
          explanation: weak ? "The." : sourceCoreText,
          keyPoints: sourceCoreKeyPoints,
        },
      };
    case "process-step":
      return {
        ...base,
        kind: "process-step",
        sourceCore: {
          explanation: weak ? "The." : sourceCoreText,
          keyPoints: sourceCoreKeyPoints,
        },
      };
    case "example-card":
      return {
        ...base,
        kind: "example-card",
        sourceCore: {
          explanation: weak ? "The." : sourceCoreText,
          keyPoints: sourceCoreKeyPoints,
        },
      };
    case "claim-card":
      return {
        ...base,
        kind: "claim-card",
        sourceCore: {
          explanation: weak ? "The." : sourceCoreText,
          keyPoints: sourceCoreKeyPoints,
        },
      };
  }
}

function readRetryAttempt(
  request: GenerationRequest<unknown>,
): number | undefined {
  const value = request.metadata?.retryAttempt;
  return typeof value === "number" ? value : undefined;
}

function readMetadataString(
  metadata: Readonly<Record<string, unknown>> | undefined,
  key: string,
): string {
  const value = metadata?.[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Fake provider request metadata is missing ${key}.`);
  }
  return value;
}

function readSchemaKind(value: unknown): SectionSchemaKind {
  if (
    value === "concept-card" ||
    value === "process-step" ||
    value === "example-card" ||
    value === "claim-card"
  ) {
    return value;
  }
  throw new Error("Fake provider request metadata has an invalid schema kind.");
}

function readPromptValue(prompt: string, prefix: string): string {
  const line = prompt
    .split("\n")
    .find((candidate) => candidate.startsWith(prefix));
  const value = line?.slice(prefix.length).trim();
  if (!value) {
    throw new Error(`Fake provider prompt is missing ${prefix.trim()}.`);
  }
  return value;
}

function readSourceBlockIds(prompt: string): readonly string[] {
  const value = readPromptValue(prompt, "- sourceBlockIds value — ");
  const withoutPeriod = value.endsWith(".") ? value.slice(0, -1) : value;
  const ids = withoutPeriod.split(", ").filter((entry) => entry.length > 0);
  if (ids.length === 0) {
    throw new Error("Fake provider prompt is missing source block IDs.");
  }
  return ids;
}

function readSourceCoreText(prompt: string): string {
  const [, afterPassage] = prompt.split("PASSAGE:\n");
  const [beforeRequirements] = (afterPassage ?? "").split("\nRequirements:");
  const [passage] = beforeRequirements.split("\nDETECTED PASSAGE ITEMS:");
  const text = passage
    .split("\n")
    .filter((line) => !line.trim().startsWith("[Passage block "))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length === 0) {
    throw new Error("Fake provider prompt is missing passage text.");
  }

  return text;
}

function extractSourceCoreKeyPoints(sourceText: string): readonly string[] {
  const markerPattern =
    /(?:^|\s)(?:[-*]\s+|\u2022\s+|\d{1,2}[.)]\s*|[a-z]\)\s*)/gi;
  const markerMatches = [...sourceText.matchAll(markerPattern)];
  if (markerMatches.length < 2) {
    return [sourceText];
  }

  return markerMatches.flatMap((match, index) => {
    if (match.index === undefined) {
      return [];
    }
    const nextMatch = markerMatches[index + 1];
    const start = match.index + match[0].length;
    const end = nextMatch?.index ?? sourceText.length;
    const item = sourceText
      .slice(start, end)
      .replace(/\s+/g, " ")
      .replace(/^[.:;,\s]+/, "")
      .trim();
    return item.length > 0 ? [item] : [];
  });
}

if (isDirectExecution(import.meta.url)) {
  await runPipelineEvals();
}
