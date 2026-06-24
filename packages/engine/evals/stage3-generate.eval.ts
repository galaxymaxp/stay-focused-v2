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
  DEFAULT_FORBIDDEN_INSTRUCTION_PATTERNS,
  detectInstructionLeakage,
} from "../src/leakage-guard.js";
import {
  claimCardSchema,
  conceptCardSchema,
  exampleCardSchema,
  processStepSchema,
  type StructuredOutputSchema,
} from "../src/schemas.js";
import {
  generateSection,
  type GenerateSectionArgs,
  validateSectionOutput,
} from "../src/stage3-generate.js";
import type {
  GenerationPlan,
  NormalizedSource,
  PlannedSection,
  SectionContentTag,
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

interface SingleBlockContextArgs {
  readonly blockId: string;
  readonly blockKind: NormalizedSource["blocks"][number]["kind"];
  readonly sourceId: string;
  readonly sourceTitle: string;
  readonly sectionId: string;
  readonly sectionTitle: string;
  readonly sourceText: string;
  readonly targetObjective: string;
  readonly targetFocus: string;
  readonly targetItemCount: number;
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
const structuredOutputSchemas = [
  conceptCardSchema,
  processStepSchema,
  exampleCardSchema,
  claimCardSchema,
] as const;

export const stage3GenerateSuite: EvalSuite = {
  name: "Stage 3 generation request",
  cases: [
    ...structuredOutputSchemas.map(createSchemaCompatibilityCase),
    ...basicCases.map(createBasicCase),
    ...requestCases.map(createRequestCase),
    createSparseSourceGuardCase(),
    createDeterministicListCoreCase(),
    createLinePreservedBulletCoreCase(),
    createLinePreservedTableCoreCase(),
    createPromptDenylistCase(),
    createPromptFixtureNeutralityCase(),
    createMetaExplanationLeakageCase(),
    createEmptyListExplanationCase(),
    ...validationCases.map(createValidationCase),
  ],
};

function createMetaExplanationLeakageCase(): EvalCase {
  return {
    name: "meta explanation echoing source-excerpt instructions is rejected",
    run: async () => {
      const context = createContext("concept-card");
      const output = {
        ...(createValidOutput(
          "concept-card",
          context.section,
        ) as unknown as SectionOutput),
        sourceCore: {
          explanation:
            "This section lists the steps from the source excerpt.",
          keyPoints: ["Included source alpha.", "Included source beta."],
        },
      } satisfies SectionOutput;
      const result = detectInstructionLeakage(output);

      return [
        ...assertEqual(
          result.ok,
          false,
          "Meta explanation echoing instruction wording was not detected.",
        ),
        ...assertDeepEqual(
          result.ok ? [] : result.fields,
          ["sourceCore.explanation"],
          "Meta explanation leakage was reported against the wrong field.",
        ),
      ];
    },
  };
}

function createEmptyListExplanationCase(): EvalCase {
  return {
    name: "empty list-only explanation is not instruction leakage",
    run: async () => {
      const context = createContext("concept-card");
      const output = {
        ...(createValidOutput(
          "concept-card",
          context.section,
        ) as unknown as SectionOutput),
        sourceCore: {
          explanation: "",
          keyPoints: ["Included source alpha.", "Included source beta."],
        },
      } satisfies SectionOutput;

      return [
        ...assertDeepEqual(
          detectInstructionLeakage(output),
          { ok: true },
          "Empty list-only explanation was incorrectly flagged as leakage.",
        ),
        ...assertDeepEqual(
          validateSectionOutput(output, context.section),
          output,
          "Stage 3 output validation rejected an empty required explanation.",
        ),
      ];
    },
  };
}

export async function runStage3GenerateEvals(): Promise<boolean> {
  const result = await runEvalSuite(stage3GenerateSuite);
  printEvalSuiteResult(result);
  setFailureExitCode([result]);
  return result.status === "passed";
}

if (isDirectExecution(import.meta.url)) {
  await runStage3GenerateEvals();
}

function createSchemaCompatibilityCase(
  schema: StructuredOutputSchema,
): EvalCase {
  return {
    name: `${schema.name} schema is OpenAI strict-compatible`,
    run: async () => assertOpenAISchemaCompatibility(schema),
  };
}

function assertOpenAISchemaCompatibility(
  schema: StructuredOutputSchema,
): readonly EvalIssue[] {
  const issues: EvalIssue[] = [];

  for (const property of ["sourceCore", "enrichment"]) {
    issues.push(
      ...assertEqual(
        Object.prototype.hasOwnProperty.call(schema.schema.properties, property),
        true,
        `${schema.name} schema must include ${property}.`,
      ),
    );
  }

  walkStrictSchemaObjects(schema.schema, schema.name, issues);
  const sourceCore = schema.schema.properties["sourceCore"];
  const explanation =
    isRecord(sourceCore) && isRecord(sourceCore["properties"])
      ? sourceCore["properties"]["explanation"]
      : undefined;
  issues.push(
    ...assertEqual(
      isRecord(explanation) &&
        Object.prototype.hasOwnProperty.call(explanation, "minLength"),
      false,
      `${schema.name} explanation must remain required while permitting an empty string.`,
    ),
  );
  return issues;
}

function walkStrictSchemaObjects(
  node: unknown,
  path: string,
  issues: EvalIssue[],
): void {
  if (!isRecord(node)) {
    return;
  }

  const properties = node["properties"];
  if (properties !== undefined) {
    if (!isRecord(properties)) {
      issues.push({
        message: `${path} properties must be an object.`,
        actual: properties,
      });
    } else {
      issues.push(
        ...assertEqual(
          node["additionalProperties"],
          false,
          `${path} must reject additional properties.`,
        ),
      );

      const propertyKeys = Object.keys(properties);
      const required = node["required"];
      if (!Array.isArray(required)) {
        issues.push({
          message: `${path} required must be an array including every property.`,
          actual: required,
        });
      } else {
        const requiredKeys = required.filter(
          (entry): entry is string => typeof entry === "string",
        );
        issues.push(
          ...assertDeepEqual(
            [...requiredKeys].sort(),
            [...propertyKeys].sort(),
            `${path} required fields must exactly match properties.`,
          ),
        );
      }

      for (const [key, value] of Object.entries(properties)) {
        walkStrictSchemaObjects(value, `${path}.properties.${key}`, issues);
      }
    }
  }

  const items = node["items"];
  if (items !== undefined) {
    walkStrictSchemaObjects(items, `${path}.items`, issues);
  }

  for (const unionKey of ["anyOf", "oneOf", "allOf"]) {
    const unionValue = node[unionKey];
    if (Array.isArray(unionValue)) {
      unionValue.forEach((entry, index) =>
        walkStrictSchemaObjects(entry, `${path}.${unionKey}[${index}]`, issues),
      );
    }
  }
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

function createDeterministicListCoreCase(): EvalCase {
  return {
    name: "detected passage items deterministically replace list-heavy sourceCore",
    run: async () => {
      const blockId = "fruit-list-block";
      const preamble = "Repeated preamble";
      const sourceText = "Example Fruit List • Apple • Banana • Cherry";
      const sourceStartOffset = preamble.length + 2;
      const source: NormalizedSource = {
        id: "fruit-list-source",
        title: "Example Fruit List",
        kind: "plain-text",
        language: "en",
        metadata: {},
        blocks: [
          {
            id: "fruit-preamble-a",
            kind: "paragraph",
            text: preamble,
            order: 0,
          },
          {
            id: "fruit-preamble-b",
            kind: "paragraph",
            text: preamble,
            order: 1,
          },
          {
            id: blockId,
            kind: "paragraph",
            text: sourceText,
            order: 2,
          },
        ],
        createdAt: "2026-01-01T00:00:00.000Z",
      };
      const section: PlannedSection = {
        id: "fruit-list-section",
        sourceSectionId: "fruit-list-outline-section",
        title: "Example Fruit List",
        order: 0,
        schemaKind: "concept-card",
        target: {
          objective: "Retain the listed fruit names.",
          itemCount: 3,
          focus: "Fruit names",
          requiredSourceBlockIds: [blockId],
          expectedTags: ["concept"],
          coverageRules: ["Preserve every listed entry."],
        },
        sourceBlockIds: [blockId],
        tokenWeight: 8,
        targetItemCount: 3,
        sourceStartOffset,
        sourceEndOffset: sourceStartOffset + sourceText.length,
      };
      const plan: GenerationPlan = {
        id: "fruit-list-plan",
        sourceId: source.id,
        outlineId: "fruit-list-outline",
        title: source.title,
        sections: [section],
        metadata: { sectionCount: 1, sourceBlockCount: 3 },
      };
      const provider = new FakeGenerationProvider({
        kind: "concept-card",
        id: "fruit-list-output",
        plannedSectionId: section.id,
        title: section.title,
        sourceBlockIds: [blockId],
        sourceCore: {
          explanation: "This card summarizes several kinds of fruit.",
          keyPoints: ["Several fruits are listed."],
        },
        enrichment: {
          note: "Optional note",
          points: ["Target: Additional context"],
        },
      });

      const output = await generateSection({ section, plan, source, provider });
      const request = provider.requests[0];
      const issues: EvalIssue[] = [
        ...assertDeepEqual(
          output.sourceCore,
          {
            explanation: "",
            keyPoints: ["Apple", "Banana", "Cherry"],
          },
          "Detected list items did not replace provider-authored sourceCore.",
        ),
        ...assertDeepEqual(
          output.enrichment,
          null,
          "Default Stage 3 output retained source-external enrichment.",
        ),
      ];

      if (!request) {
        return [{ message: "Fake provider did not receive a list request." }];
      }

      issues.push(
        ...assertIncludes(
          request.prompt,
          "DETECTED PASSAGE ITEMS:",
          "List request omitted the detected-items block.",
        ),
        ...assertIncludes(
          request.prompt,
          "1. Apple\n2. Banana\n3. Cherry",
          "List request did not preserve detected item order.",
        ),
      );
      return issues;
    },
  };
}

function createLinePreservedBulletCoreCase(): EvalCase {
  return {
    name: "line-start bullets survive Stage 3 detected-item extraction",
    run: async () => {
      const blockId = "protection-methods-block";
      const bulletItems = [
        "Strong passwords help prevent unauthorized access.",
        "Updates fix known software weaknesses.",
        "Backups help recover data after loss or damage.",
      ];
      const sourceText = [
        "Basic Protection Methods",
        ...bulletItems.map((item) => `- ${item}`),
      ].join("\n");
      const context = createSingleBlockContext({
        blockId,
        blockKind: "list",
        sourceId: "protection-methods-source",
        sourceTitle: "Protection Methods",
        sectionId: "protection-methods-section",
        sectionTitle: "Basic Protection Methods",
        sourceText,
        targetObjective: "Retain the protection methods.",
        targetFocus: "Basic Protection Methods",
        targetItemCount: bulletItems.length,
      });
      const provider = new FakeGenerationProvider({
        kind: "concept-card",
        id: "protection-methods-output",
        plannedSectionId: context.section.id,
        title: context.section.title,
        sourceBlockIds: [blockId],
        sourceCore: {
          explanation: "This card summarizes protection methods.",
          keyPoints: ["Several protection methods are listed."],
        },
        enrichment: {
          note: "Optional note",
          points: ["Extra protection context."],
        },
      });

      const output = await generateSection({ ...context, provider });
      const request = provider.requests[0];
      const issues: EvalIssue[] = [
        ...assertDeepEqual(
          output.sourceCore,
          {
            explanation: "",
            keyPoints: bulletItems,
          },
          "Line-start bullet items did not replace provider-authored sourceCore.",
        ),
        ...assertDeepEqual(
          output.enrichment,
          null,
          "Default Stage 3 bullet output retained source-external enrichment.",
        ),
      ];

      if (!request) {
        return [{ message: "Fake provider did not receive a bullet request." }];
      }

      issues.push(
        ...assertIncludes(
          request.prompt,
          `[Passage block ${blockId} | list]\n${sourceText}`,
          "Bullet request changed the existing passage block format.",
        ),
        ...assertIncludes(
          request.prompt,
          "1. Strong passwords help prevent unauthorized access.\n2. Updates fix known software weaknesses.\n3. Backups help recover data after loss or damage.",
          "Bullet request did not preserve detected item order.",
        ),
        ...assertEqual(
          request.prompt.includes("For flattened table rows"),
          false,
          "Stage 3 prompt unexpectedly included flattened-table instruction text.",
        ),
      );
      return issues;
    },
  };
}

function createLinePreservedTableCoreCase(): EvalCase {
  return {
    name: "table rows survive Stage 3 detected-item extraction without prompt changes",
    run: async () => {
      const blockId = "security-goals-table-block";
      const tableItems = [
        "Confidentiality | Only authorized users can access information",
        "Integrity | Information stays accurate and unchanged",
        "Availability | Systems and data are accessible when needed",
      ];
      const sourceText = [
        "| Term | Meaning |",
        "| Confidentiality | Only authorized users can access information |",
        "| Integrity | Information stays accurate and unchanged |",
        "| Availability | Systems and data are accessible when needed |",
      ].join("\n");
      const context = createSingleBlockContext({
        blockId,
        blockKind: "table",
        sourceId: "security-goals-table-source",
        sourceTitle: "Security Goals Table",
        sectionId: "security-goals-table-section",
        sectionTitle: "Security Goals",
        sourceText,
        targetObjective: "Retain the security goal definitions.",
        targetFocus: "Security Goals",
        targetItemCount: tableItems.length,
      });
      const provider = new FakeGenerationProvider({
        kind: "concept-card",
        id: "security-goals-table-output",
        plannedSectionId: context.section.id,
        title: context.section.title,
        sourceBlockIds: [blockId],
        sourceCore: {
          explanation: "This card summarizes the table.",
          keyPoints: ["Security goals are defined in the table."],
        },
        enrichment: {
          note: "Optional note",
          points: ["Extra table context."],
        },
      });

      const output = await generateSection({ ...context, provider });
      const request = provider.requests[0];
      const issues: EvalIssue[] = [
        ...assertDeepEqual(
          output.sourceCore,
          {
            explanation: "",
            keyPoints: tableItems,
          },
          "Line-preserved table rows did not replace provider-authored sourceCore.",
        ),
        ...assertDeepEqual(
          output.enrichment,
          null,
          "Default Stage 3 table output retained source-external enrichment.",
        ),
      ];

      if (!request) {
        return [{ message: "Fake provider did not receive a table request." }];
      }

      issues.push(
        ...assertIncludes(
          request.prompt,
          `[Passage block ${blockId} | table]\n${sourceText}`,
          "Table request changed the existing passage block format.",
        ),
        ...assertIncludes(
          request.prompt,
          "1. Confidentiality | Only authorized users can access information\n2. Integrity | Information stays accurate and unchanged\n3. Availability | Systems and data are accessible when needed",
          "Table request did not preserve detected row order.",
        ),
        ...assertEqual(
          request.prompt.includes("For flattened table rows"),
          false,
          "Stage 3 prompt unexpectedly included flattened-table instruction text.",
        ),
      );
      return issues;
    },
  };
}

function createPromptDenylistCase(): EvalCase {
  return {
    name: "Stage 3 prompt avoids instruction-leakage denylist phrases",
    run: async () => {
      const context = createContext("concept-card");
      const provider = new FakeGenerationProvider(
        createValidOutput("concept-card", context.section),
      );
      await generateSection({
        ...context,
        provider,
        retryGuidance: DEFAULT_FORBIDDEN_INSTRUCTION_PATTERNS,
      });
      const prompt = provider.requests[0]?.prompt;
      if (!prompt) {
        return [{ message: "Fake provider did not receive a prompt." }];
      }

      const normalizedPrompt = normalizePromptText(prompt);
      return DEFAULT_FORBIDDEN_INSTRUCTION_PATTERNS.flatMap((pattern) =>
        assertEqual(
          normalizedPrompt.includes(normalizePromptText(pattern)),
          false,
          `Stage 3 prompt contains denylisted phrase "${pattern}".`,
        ),
      );
    },
  };
}

function createPromptFixtureNeutralityCase(): EvalCase {
  return {
    name: "Stage 3 static prompt contains no real IT fixture terms",
    run: async () => {
      const context = createContext("concept-card");
      const provider = new FakeGenerationProvider(
        createValidOutput("concept-card", context.section),
      );
      await generateSection({ ...context, provider });
      const prompt = provider.requests[0]?.prompt;
      if (!prompt) {
        return [{ message: "Fake provider did not receive a prompt." }];
      }

      const fixtureTerms = [
        "Methods to Deny Service",
        "Blended Attacks",
        "Impact Reduction",
        "Types of Malware",
        "Domains of IT Security",
        "Endpoint Security",
        "DDoS",
        "Malware",
      ];
      return fixtureTerms.flatMap((term) =>
        assertEqual(
          prompt.toLowerCase().includes(term.toLowerCase()),
          false,
          `Stage 3 static prompt contains real fixture term "${term}".`,
        ),
      );
    },
  };
}

function createSparseSourceGuardCase(): EvalCase {
  return {
    name: "sparse IT Security Introduction sourceCore stays literal",
    run: async () => {
      const sourceText = "Intro to IT Security Module 1";
      const blockId = "live-it-security-block-16nqjjw";
      const sectionId = "live-it-security-section-hicgc7-planned-1jv6nax";
      const source: NormalizedSource = {
        id: "live-it-security",
        title: "IT Security",
        kind: "plain-text",
        language: "en",
        metadata: {},
        blocks: [
          {
            id: blockId,
            kind: "paragraph",
            text: `${sourceText} What is IT Security`,
            order: 0,
          },
        ],
        createdAt: "2026-01-01T00:00:00.000Z",
      };
      const section: PlannedSection = {
        id: sectionId,
        sourceSectionId: "live-it-security-section-hicgc7",
        title: "Introduction",
        order: 0,
        schemaKind: "concept-card",
        target: {
          objective: 'Explain "Introduction" concisely with its key points.',
          itemCount: 1,
          focus: "Introduction",
          requiredSourceBlockIds: [blockId],
          expectedTags: ["concept"],
          coverageRules: ["Represent only the source section."],
        },
        sourceBlockIds: [blockId],
        tokenWeight: 6,
        targetItemCount: 1,
        sourceStartOffset: 0,
        sourceEndOffset: sourceText.length,
      };
      const plan: GenerationPlan = {
        id: "plan-it-security-sparse-introduction",
        sourceId: source.id,
        outlineId: "outline-it-security",
        title: source.title,
        sections: [section],
        metadata: { sectionCount: 1, sourceBlockCount: 1 },
      };
      const provider = new FakeGenerationProvider({
        kind: "concept-card",
        id: "generic-introduction",
        plannedSectionId: section.id,
        title: section.title,
        sourceBlockIds: [blockId],
        sourceCore: {
          explanation:
            "The Introduction to IT Security explains how organizations protect data and systems from threats.",
          keyPoints: [
            "IT Security Overview: safeguards systems from unauthorized access.",
            "Risk Assessment: identifies potential risks to IT systems.",
          ],
        },
        enrichment: {
          note: "Extra context",
          points: ["Generic IT security context."],
        },
      });
      const output = await generateSection({ section, plan, source, provider });
      const request = provider.requests[0];
      const issues: EvalIssue[] = [
        ...assertDeepEqual(
          output.sourceCore,
          {
            explanation: sourceText,
            keyPoints: [sourceText],
          },
          "Sparse sourceCore was not clamped to the exact source span.",
        ),
        ...assertEqual(
          output.enrichment,
          null,
          "Sparse source output should not retain generic enrichment.",
        ),
      ];

      if (!request) {
        return [{ message: "Fake provider did not receive a sparse request." }];
      }

      issues.push(
        ...assertIncludes(
          request.prompt,
          "Sparse passage:",
          "Sparse request did not include sparse-source prompt guidance.",
        ),
        ...assertIncludes(
          request.prompt,
          `- Exact text: ${sourceText}`,
          "Sparse request did not include the exact source text.",
        ),
      );

      return issues;
    },
  };
}

function normalizePromptText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
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
    tokenWeight: 6,
    targetItemCount: 1,
    sourceStartOffset: 0,
    sourceEndOffset: 80,
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

function createSingleBlockContext(args: SingleBlockContextArgs): Stage3Context {
  const source: NormalizedSource = {
    id: args.sourceId,
    title: args.sourceTitle,
    kind: "plain-text",
    language: "en",
    metadata: {},
    blocks: [
      {
        id: args.blockId,
        kind: args.blockKind,
        text: args.sourceText,
        order: 0,
      },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  const section: PlannedSection = {
    id: args.sectionId,
    sourceSectionId: `${args.sectionId}-outline`,
    title: args.sectionTitle,
    order: 0,
    schemaKind: "concept-card",
    target: {
      objective: args.targetObjective,
      itemCount: args.targetItemCount,
      focus: args.targetFocus,
      requiredSourceBlockIds: [args.blockId],
      expectedTags: ["concept"],
      coverageRules: ["Preserve every detected source item."],
    },
    sourceBlockIds: [args.blockId],
    tokenWeight: 12,
    targetItemCount: args.targetItemCount,
    sourceStartOffset: 0,
    sourceEndOffset: args.sourceText.length,
  };
  const plan: GenerationPlan = {
    id: `${args.sectionId}-plan`,
    sourceId: source.id,
    outlineId: `${args.sectionId}-outline`,
    title: source.title,
    sections: [section],
    metadata: { sectionCount: 1, sourceBlockCount: 1 },
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
    enrichment: null,
  };

  switch (schemaKind) {
    case "concept-card":
      return {
        ...base,
        sourceCore: {
          explanation: "Included source alpha and included source beta.",
          keyPoints: ["Included source alpha.", "Included source beta."],
        },
      };
    case "process-step":
      return {
        ...base,
        sourceCore: {
          explanation: "Included source alpha and included source beta.",
          keyPoints: ["Included source alpha.", "Included source beta."],
        },
      };
    case "example-card":
      return {
        ...base,
        sourceCore: {
          explanation: "Included source alpha and included source beta.",
          keyPoints: ["Included source alpha.", "Included source beta."],
        },
      };
    case "claim-card":
      return {
        ...base,
        sourceCore: {
          explanation: "Included source alpha and included source beta.",
          keyPoints: ["Included source alpha.", "Included source beta."],
        },
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

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
