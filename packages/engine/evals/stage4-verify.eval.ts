import { readFile } from "node:fs/promises";
import { join } from "node:path";

import basicFixtures from "./fixtures/stage4-basic.json" with { type: "json" };
import statusFixtures from "./fixtures/stage4-status.json" with { type: "json" };
import validationFixtures from "./fixtures/stage4-validation.json" with {
  type: "json",
};

import {
  verifyCoverage,
  type VerifyCoverageArgs,
} from "../src/stage4-verify.js";
import { normalizeSource } from "../src/stage0-normalize.js";
import { detectOutline } from "../src/stage1-outline.js";
import type {
  CoverageStatus,
  GenerationPlan,
  NormalizedSource,
  PlannedSection,
  SectionOutput,
  SectionSchemaKind,
  SourceOutline,
  SourceOutlineSection,
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
  | "missing-outline";

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
  readonly outline: SourceOutline;
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
    createItSecurityFalsePositiveRegressionCase(),
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
        outline: context.outline,
      });
      const repeatedReport = verifyCoverage({
        plan: context.plan,
        outputs: [output],
        source: context.source,
        outline: context.outline,
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
          report.coverageBasis,
          "source-outline",
          "Coverage report did not use source-outline basis.",
        ),
        ...assertEqual(
          report.coverageScore,
          1,
          "Valid output did not cover the detected source section.",
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
        outline: context.outline,
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

function createItSecurityFalsePositiveRegressionCase(): EvalCase {
  return {
    name: "IT Security legacy six-section output fails source-outline coverage",
    run: async () => {
      const text = await readItSecurityFixture();
      const source = await normalizeSource({
        id: "it-security-coverage-source",
        title: "Intro to IT Security Module 1",
        kind: "plain-text",
        language: "en",
        text,
        createdAt: "2026-01-01T00:00:00.000Z",
      });
      const outline = await detectOutline(source);
      const introduction = requireSourceSection(outline, "Introduction");
      const threats = requireSourceSection(
        outline,
        "Types of Cybersecurity Threats",
      );
      const denyService = requireSourceSection(
        outline,
        "Methods to Deny Service",
      );
      const legacySections = [
        createLegacyPlannedSection(introduction, 0, "Introduction"),
        createLegacyPlannedSection(threats, 1, "Types of Cybersecurity Threats"),
        createLegacyPlannedSection(threats, 2, "Types of Cybersecurity Threats"),
        createLegacyPlannedSection(threats, 3, "Types of Cybersecurity Threats"),
        createLegacyPlannedSection(denyService, 4, "Methods to Deny Service"),
        createLegacyPlannedSection(denyService, 5, "Methods to Deny Service"),
      ];
      const plan: GenerationPlan = {
        id: "it-security-legacy-bad-plan",
        sourceId: source.id,
        outlineId: outline.id,
        title: source.title,
        sections: legacySections,
        metadata: {
          sectionCount: legacySections.length,
          sourceBlockCount: source.blocks.length,
        },
      };
      const outputs = legacySections.map((section) =>
        createValidOutput(section.schemaKind, section),
      );
      const report = verifyCoverage({ plan, outputs, source, outline });
      const missingIssueTitles = report.issues
        .filter((issue) => issue.type === "missing-source-section")
        .map((issue) => normalizeTopicKey(issue.title ?? ""));
      const requiredMissingTitles = [
        "Types of Attackers",
        "Types of Malware",
        "Symptoms of Malware",
        "Methods of Infiltration",
        "Challenges of Cybersecurity",
        "Impact of Security Breach",
        "Impact Reduction",
        "Definition of Terms",
      ];
      const issues: EvalIssue[] = [];

      issues.push(
        ...assertEqual(
          report.status,
          "failed",
          "Legacy bad output should fail source-outline coverage.",
        ),
        ...assertEqual(
          report.coverageBasis,
          "source-outline",
          "Coverage report did not identify source-outline basis.",
        ),
        ...assertEqual(
          report.coverageScore === 1,
          false,
          "Legacy bad output reproduced the old false-positive score of 1.",
        ),
        ...assertEqual(
          report.coverageScore >= 0.15 && report.coverageScore <= 0.25,
          true,
          "Legacy bad output did not produce the expected low source-outline score.",
        ),
        ...assertEqual(
          report.issues.some(
            (issue) => issue.type === "duplicate-section",
          ),
          true,
          "Legacy duplicate planned sections did not emit a duplicate-section issue.",
        ),
      );

      for (const title of requiredMissingTitles) {
        issues.push(
          ...assertEqual(
            missingIssueTitles.includes(normalizeTopicKey(title)),
            true,
            `Missing source-section issue was not emitted for "${title}".`,
          ),
        );
      }

      return issues;
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
        outputs: [omitSourceCoreExplanation(firstOutput)],
      };
    case "empty-field":
      return {
        context,
        outputs: [withSourceCoreExplanation(firstOutput, "")],
      };
    case "weak-content":
      return {
        context,
        outputs: [withSourceCoreExplanation(firstOutput, "Brief.")],
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
    outline: context.outline,
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
    case "missing-outline":
      args = { ...args, outline: undefined as unknown as SourceOutline };
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
  const outline: SourceOutline = {
    id: "stage4-outline",
    sourceId: source.id,
    title: source.title,
    sections: sections.map((section) => ({
      id: section.sourceSectionId,
      title: section.title,
      order: section.order,
      startOffset: section.sourceStartOffset,
      endOffset: section.sourceEndOffset,
      tokenWeight: section.tokenWeight,
      sourceBlockIds: [...section.sourceBlockIds],
      blockIds: [...section.sourceBlockIds],
      roughStartBlockId: section.sourceBlockIds[0] ?? "",
      roughEndBlockId: section.sourceBlockIds.at(-1) ?? "",
      tags: [tagForSchemaKind(section.schemaKind)],
      confidence: 0.9,
    })),
  };

  return { source, outline, plan, sections };
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
    tokenWeight: sourceBlockIds.length * 8,
    targetItemCount: 1,
    sourceStartOffset: order * 100,
    sourceEndOffset: order * 100 + 80,
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
    enrichment: null,
  };

  switch (schemaKind) {
    case "concept-card":
      return {
        ...base,
        kind: "concept-card",
        sourceCore: {
          explanation: "Source alpha content and source beta content.",
          keyPoints: ["Source alpha content.", "Source beta content."],
        },
      };
    case "process-step":
      return {
        ...base,
        kind: "process-step",
        sourceCore: {
          explanation: "Source gamma content and source delta content.",
          keyPoints: ["Source gamma content.", "Source delta content."],
        },
      };
    case "example-card":
      return {
        ...base,
        kind: "example-card",
        sourceCore: {
          explanation: "Source alpha content and source beta content.",
          keyPoints: ["Source alpha content.", "Source beta content."],
        },
      };
    case "claim-card":
      return {
        ...base,
        kind: "claim-card",
        sourceCore: {
          explanation: "Source alpha content and source beta content.",
          keyPoints: ["Source alpha content.", "Source beta content."],
        },
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

function omitSourceCoreExplanation(output: SectionOutput): SectionOutput {
  return ({
    ...output,
    sourceCore: {
      keyPoints: [...output.sourceCore.keyPoints],
    },
  } as unknown) as SectionOutput;
}

function withSourceCoreExplanation(
  output: SectionOutput,
  explanation: string,
): SectionOutput {
  return {
    ...output,
    sourceCore: {
      ...output.sourceCore,
      explanation,
    },
  };
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

async function readItSecurityFixture(): Promise<string> {
  const candidates = [
    join(process.cwd(), "scripts", "fixtures", "it-security.txt"),
    join(
      process.cwd(),
      "packages",
      "engine",
      "scripts",
      "fixtures",
      "it-security.txt",
    ),
  ];

  for (const candidate of candidates) {
    try {
      return await readFile(candidate, "utf8");
    } catch {
      continue;
    }
  }

  throw new Error("Unable to read IT Security fixture.");
}

function requireSourceSection(
  outline: SourceOutline,
  title: string,
): SourceOutlineSection {
  const key = normalizeTopicKey(title);
  const section = outline.sections.find(
    (candidate) => normalizeTopicKey(candidate.title) === key,
  );
  if (!section) {
    throw new Error(`Eval setup could not find source section "${title}".`);
  }
  return section;
}

function createLegacyPlannedSection(
  section: SourceOutlineSection,
  order: number,
  title: string,
): PlannedSection {
  return {
    id: `legacy-planned-${order}`,
    sourceSectionId: section.id,
    title,
    order,
    schemaKind: "concept-card",
    target: {
      objective: `Explain ${title}.`,
      itemCount: 1,
      focus: title,
      requiredSourceBlockIds: [...section.sourceBlockIds],
      expectedTags: ["concept"],
      coverageRules: ["Represent the source section."],
    },
    sourceBlockIds: [...section.sourceBlockIds],
    tokenWeight: section.tokenWeight,
    targetItemCount: 1,
    sourceStartOffset: section.startOffset,
    sourceEndOffset: section.endOffset,
  };
}

function normalizeTopicKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b(?:a|an|the)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}
