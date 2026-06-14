import basicFixtures from "./fixtures/stage3-basic.json" with { type: "json" };
import requestFixtures from "./fixtures/stage3-request.json" with {
  type: "json",
};
import validationFixtures from "./fixtures/stage3-validation.json" with {
  type: "json",
};

import type {
  GenerationProvider,
  GenerationRequest,
} from "../src/provider.js";
import {
  generateSection,
  type GenerateSectionArgs,
} from "../src/stage3-generate.js";
import type {
  GenerationPlan,
  NormalizedSource,
  PlannedSection,
  SectionContentTag,
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

interface Stage3BasicFixture {
  readonly name: string;
  readonly schemaKind: SectionSchemaKind;
  readonly output: Readonly<Record<string, unknown>>;
}

interface Stage3RequestFixture {
  readonly name: string;
  readonly schemaKind: SectionSchemaKind;
  readonly model?: string;
  readonly temperature?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly expectSchemaName?: string;
  readonly expectModel?: string;
  readonly expectTemperature?: number;
  readonly expectMetadata?: Readonly<Record<string, unknown>>;
  readonly expectPromptContains?: readonly string[];
  readonly expectPromptExcludes?: readonly string[];
  readonly expectPromptOrder?: readonly string[];
}

type ValidationScenario =
  | "wrong-kind"
  | "missing-field"
  | "missing-source-block"
  | "provider-failure"
  | "section-not-in-plan"
  | "wrong-output-source-blocks"
  | "wrong-planned-section-id"
  | "missing-section"
  | "missing-plan"
  | "missing-source"
  | "missing-provider";

interface Stage3ValidationFixture {
  readonly name: string;
  readonly scenario: ValidationScenario;
  readonly schemaKind: SectionSchemaKind;
  readonly field?: string;
  readonly providerError?: string;
  readonly expectError: string;
}

interface FixtureFile<TFixture> {
  readonly cases: readonly TFixture[];
}

interface Stage3Context {
  readonly section: PlannedSection;
  readonly plan: GenerationPlan;
  readonly source: NormalizedSource;
}

class FakeGenerationProvider implements GenerationProvider {
  public readonly requests: GenerationRequest<unknown>[] = [];

  public constructor(
    private readonly output: unknown,
    private readonly failureMessage?: string,
  ) {}

  public async generate<TOutput>(
    request: GenerationRequest<TOutput>,
  ): Promise<TOutput> {
    this.requests.push(request);
    if (this.failureMessage) {
      throw new Error(this.failureMessage);
    }
    return this.output as TOutput;
  }
}

const basicCases = (basicFixtures as FixtureFile<Stage3BasicFixture>).cases;
const requestCases = (requestFixtures as FixtureFile<Stage3RequestFixture>)
  .cases;
const validationCases = (
  validationFixtures as FixtureFile<Stage3ValidationFixture>
).cases;

export const stage3GenerateSuite: EvalSuite = {
  name: "Stage 3 generation request",
  cases: [
    ...basicCases.map(createBasicCase),
    ...requestCases.map(createRequestCase),
    ...validationCases.map(createValidationCase),
  ],
};

export async function runStage3GenerateEvals(): Promise<boolean> {
  const result = await runEvalSuite(stage3GenerateSuite);
  printEvalSuiteResult(result);
  setFailureExitCode([result]);
  return result.status === "passed";
}

if (isDirectExecution(import.meta.url)) {
  await runStage3GenerateEvals();
}

function createBasicCase(fixture: Stage3BasicFixture): EvalCase {
  return {
    name: fixture.name,
    run: async () => {
      const context = createContext(fixture.schemaKind);
      const provider = new FakeGenerationProvider(fixture.output);
      const output = await generateSection({ ...context, provider });
      return assertDeepEqual(
        output,
        fixture.output,
        "Validated section output did not match the provider output.",
      );
    },
  };
}

function createRequestCase(fixture: Stage3RequestFixture): EvalCase {
  return {
    name: fixture.name,
    run: async () => {
      const context = createContext(fixture.schemaKind);
      const provider = new FakeGenerationProvider(
        createValidOutput(fixture.schemaKind, context.section),
      );
      await generateSection({
        ...context,
        provider,
        ...(fixture.model ? { model: fixture.model } : {}),
        ...(fixture.temperature !== undefined
          ? { temperature: fixture.temperature }
          : {}),
        ...(fixture.metadata ? { metadata: fixture.metadata } : {}),
      });
      const request = provider.requests[0];
      const issues: EvalIssue[] = [];

      if (!request) {
        return [{ message: "Fake provider did not receive a request." }];
      }
      if (fixture.expectSchemaName !== undefined) {
        issues.push(
          ...assertEqual(
            request.schema.name,
            fixture.expectSchemaName,
            "Provider schema name did not match.",
          ),
          ...assertEqual(
            request.schema.schema.additionalProperties,
            false,
            "Provider schema must reject additional properties.",
          ),
        );
      }
      if (fixture.expectModel !== undefined) {
        issues.push(
          ...assertEqual(
            request.model,
            fixture.expectModel,
            "Provider model did not match.",
          ),
        );
      }
      if (fixture.expectTemperature !== undefined) {
        issues.push(
          ...assertEqual(
            request.temperature,
            fixture.expectTemperature,
            "Provider temperature did not match.",
          ),
        );
      }
      if (fixture.expectMetadata !== undefined) {
        issues.push(
          ...assertDeepEqual(
            request.metadata,
            fixture.expectMetadata,
            "Provider metadata did not match.",
          ),
        );
      }
      for (const text of fixture.expectPromptContains ?? []) {
        issues.push(
          ...assertIncludes(
            request.prompt,
            text,
            "Provider prompt did not contain expected text.",
          ),
        );
      }
      for (const text of fixture.expectPromptExcludes ?? []) {
        issues.push(
          ...assertEqual(
            request.prompt.includes(text),
            false,
            `Provider prompt unexpectedly included "${text}".`,
          ),
        );
      }
      if (fixture.expectPromptOrder !== undefined) {
        const indexes = fixture.expectPromptOrder.map((text) =>
          request.prompt.indexOf(text),
        );
        const inOrder = indexes.every(
          (index, position) =>
            index >= 0 && (position === 0 || index > (indexes[position - 1] ?? -1)),
        );
        issues.push(
          ...assertEqual(
            inOrder,
            true,
            "Provider prompt did not preserve source block order.",
          ),
        );
      }

      return issues;
    },
  };
}

function createValidationCase(fixture: Stage3ValidationFixture): EvalCase {
  return {
    name: fixture.name,
    run: async () => {
      try {
        await runValidationScenario(fixture);
        return [
          {
            message: "Expected Stage 3 generation to throw an error.",
            expected: fixture.expectError,
            actual: "No error was thrown",
          },
        ];
      } catch (error) {
        return assertEqual(
          errorMessage(error),
          fixture.expectError,
          "Stage 3 error message did not match.",
        );
      }
    },
  };
}

async function runValidationScenario(
  fixture: Stage3ValidationFixture,
): Promise<void> {
  const context = createContext(fixture.schemaKind);
  let section = context.section;
  let plan = context.plan;
  let source = context.source;
  let provider: GenerationProvider = new FakeGenerationProvider(
    createValidOutput(fixture.schemaKind, section),
  );

  switch (fixture.scenario) {
    case "wrong-kind":
      provider = new FakeGenerationProvider(
        createValidOutput("claim-card", section),
      );
      break;
    case "missing-field":
      provider = new FakeGenerationProvider(
        omitField(
          createValidOutput(fixture.schemaKind, section),
          fixture.field ?? "",
        ),
      );
      break;
    case "missing-source-block":
      section = {
        ...section,
        sourceBlockIds: ["missing-block"],
        target: {
          ...section.target,
          requiredSourceBlockIds: ["missing-block"],
        },
      };
      plan = { ...plan, sections: [section] };
      break;
    case "provider-failure":
      provider = new FakeGenerationProvider(
        createValidOutput(fixture.schemaKind, section),
        fixture.providerError,
      );
      break;
    case "section-not-in-plan":
      plan = { ...plan, sections: [] };
      break;
    case "wrong-output-source-blocks":
      provider = new FakeGenerationProvider({
        ...createValidOutput(fixture.schemaKind, section),
        sourceBlockIds: ["included-a"],
      });
      break;
    case "wrong-planned-section-id":
      provider = new FakeGenerationProvider({
        ...createValidOutput(fixture.schemaKind, section),
        plannedSectionId: "different-section",
      });
      break;
    case "missing-section":
      section = undefined as unknown as PlannedSection;
      break;
    case "missing-plan":
      plan = undefined as unknown as GenerationPlan;
      break;
    case "missing-source":
      source = undefined as unknown as NormalizedSource;
      break;
    case "missing-provider":
      provider = undefined as unknown as GenerationProvider;
      break;
  }

  const args: GenerateSectionArgs = { section, plan, source, provider };
  await generateSection(args);
}

function createContext(schemaKind: SectionSchemaKind): Stage3Context {
  const source: NormalizedSource = {
    id: "stage3-source",
    title: "Stage 3 Source",
    kind: "document",
    language: "en",
    metadata: {},
    blocks: [
      {
        id: "included-b",
        kind: "paragraph",
        text: "Included source beta.",
        order: 2,
      },
      {
        id: "unrelated",
        kind: "paragraph",
        text: "Excluded unrelated omega.",
        order: 1,
      },
      {
        id: "included-a",
        kind: "paragraph",
        text: "Included source alpha.",
        order: 0,
      },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  const section: PlannedSection = {
    id: `planned-${schemaKind}`,
    sourceSectionId: "outline-section",
    title: "Study Section",
    order: 0,
    schemaKind,
    target: {
      objective: `Generate a ${schemaKind} for Study Section.`,
      itemCount: 2,
      focus: "Study Section",
      requiredSourceBlockIds: ["included-a", "included-b"],
      expectedTags: [tagForSchemaKind(schemaKind)],
      coverageRules: ["Use both required source blocks."],
    },
    sourceBlockIds: ["included-a", "included-b"],
  };
  const plan: GenerationPlan = {
    id: "stage3-plan",
    sourceId: source.id,
    outlineId: "stage3-outline",
    title: source.title,
    sections: [section],
    metadata: { sectionCount: 1, sourceBlockCount: source.blocks.length },
  };

  return { section, plan, source };
}

function createValidOutput(
  schemaKind: SectionSchemaKind,
  section: PlannedSection,
): Readonly<Record<string, unknown>> {
  const base = {
    kind: schemaKind,
    id: `output-${schemaKind}`,
    plannedSectionId: section.id,
    title: section.title,
    sourceBlockIds: [...section.sourceBlockIds],
  };

  switch (schemaKind) {
    case "concept-card":
      return {
        ...base,
        explanation: "A source-grounded concept explanation.",
        keyPoints: ["First key point", "Second key point"],
      };
    case "process-step":
      return {
        ...base,
        steps: ["First source-grounded step", "Second source-grounded step"],
        summary: "A concise process summary.",
      };
    case "example-card":
      return {
        ...base,
        scenario: "A source-grounded scenario.",
        explanation: "The scenario explains the source content.",
        takeaway: "Use the scenario as a concrete application.",
      };
    case "claim-card":
      return {
        ...base,
        claim: "A source-grounded claim.",
        support: "Support from the required source blocks.",
        reasoning: "Reasoning that connects support to the claim.",
      };
  }
}

function tagForSchemaKind(schemaKind: SectionSchemaKind): SectionContentTag {
  switch (schemaKind) {
    case "concept-card":
      return "concept";
    case "process-step":
      return "process";
    case "example-card":
      return "example";
    case "claim-card":
      return "claim";
  }
}

function omitField(
  value: Readonly<Record<string, unknown>>,
  field: string,
): Readonly<Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== field),
  );
}
