import { readFile } from "node:fs/promises";
import { join } from "node:path";

import basicFixtures from "./fixtures/stage2-basic.json" with { type: "json" };
import schemaFixtures from "./fixtures/stage2-schema-selection.json" with {
  type: "json",
};
import targetFixtures from "./fixtures/stage2-targets.json" with {
  type: "json",
};

import { normalizeSource } from "../src/stage0-normalize.js";
import { detectOutline } from "../src/stage1-outline.js";
import { buildGenerationPlan } from "../src/stage2-plan.js";
import type {
  GenerationPlanMetadata,
  SectionContentTag,
  SectionSchemaKind,
  SourceNormalizationInput,
  SourceOutline,
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

interface Stage2ExpectedOutput {
  readonly planTitle?: string;
  readonly planSourceId?: string;
  readonly planOutlineId?: string;
  readonly sectionCount?: number;
  readonly sectionTitles?: readonly string[];
  readonly sourceSectionIds?: readonly string[];
  readonly sectionOrders?: readonly number[];
  readonly schemaKinds?: readonly SectionSchemaKind[];
  readonly sourceBlockIds?: readonly (readonly string[])[];
  readonly targetRequiredSourceBlockIds?: readonly (readonly string[])[];
  readonly metadata?: GenerationPlanMetadata;
  readonly deterministicIds?: boolean;
}

interface Stage2BasicFixture {
  readonly name: string;
  readonly sourceInput: SourceNormalizationInput;
  readonly outline: SourceOutline;
  readonly expect?: Stage2ExpectedOutput;
  readonly expectError?: string;
}

interface Stage2SchemaFixture {
  readonly name: string;
  readonly tag?: SectionContentTag;
  readonly tags?: readonly SectionContentTag[];
  readonly expectSchemaKind: SectionSchemaKind;
}

interface Stage2TargetFixture {
  readonly name: string;
  readonly schemaTag: SectionContentTag;
  readonly sourceBlockCount?: number;
  readonly tokenWeight?: number;
  readonly expectSchemaKind?: SectionSchemaKind;
  readonly expectObjectiveContains?: readonly string[];
  readonly expectCoverageContains?: readonly string[];
  readonly expectItemCount?: number;
}

interface FixtureFile<TFixture> {
  readonly cases: readonly TFixture[];
}

const basicCases = (basicFixtures as unknown as FixtureFile<Stage2BasicFixture>)
  .cases;
const schemaCases = (schemaFixtures as FixtureFile<Stage2SchemaFixture>).cases;
const targetCases = (targetFixtures as FixtureFile<Stage2TargetFixture>).cases;

export const stage2PlanSuite: EvalSuite = {
  name: "Stage 2 generation planning",
  cases: [
    ...basicCases.map(createBasicCase),
    ...schemaCases.map(createSchemaCase),
    ...targetCases.map(createTargetCase),
    createItSecurityPlanCase(),
    ...createMissingInputCases(),
  ],
};

export async function runStage2PlanEvals(): Promise<boolean> {
  const result = await runEvalSuite(stage2PlanSuite);
  printEvalSuiteResult(result);
  setFailureExitCode([result]);
  return result.status === "passed";
}

if (isDirectExecution(import.meta.url)) {
  await runStage2PlanEvals();
}

function createBasicCase(fixture: Stage2BasicFixture): EvalCase {
  return {
    name: fixture.name,
    run: async () => {
      const source = await normalizeSource(fixture.sourceInput);

      if (fixture.expectError !== undefined) {
        try {
          buildGenerationPlan(fixture.outline, source);
          return [
            {
              message: "Expected generation planning to throw an error.",
              expected: fixture.expectError,
              actual: "No error was thrown",
            },
          ];
        } catch (error) {
          return assertEqual(
            errorMessage(error),
            fixture.expectError,
            "Generation planning error message did not match.",
          );
        }
      }

      const plan = buildGenerationPlan(fixture.outline, source);
      const expect = fixture.expect ?? {};
      const issues: EvalIssue[] = [];

      if (expect.planTitle !== undefined) {
        issues.push(
          ...assertEqual(plan.title, expect.planTitle, "Plan title did not match."),
        );
      }
      if (expect.planSourceId !== undefined) {
        issues.push(
          ...assertEqual(
            plan.sourceId,
            expect.planSourceId,
            "Plan source ID did not match.",
          ),
        );
      }
      if (expect.planOutlineId !== undefined) {
        issues.push(
          ...assertEqual(
            plan.outlineId,
            expect.planOutlineId,
            "Plan outline ID did not match.",
          ),
        );
      }
      if (expect.sectionCount !== undefined) {
        issues.push(
          ...assertEqual(
            plan.sections.length,
            expect.sectionCount,
            "Planned section count did not match.",
          ),
        );
      }
      if (expect.sectionTitles !== undefined) {
        issues.push(
          ...assertDeepEqual(
            plan.sections.map((section) => section.title),
            expect.sectionTitles,
            "Planned section titles did not match.",
          ),
        );
      }
      if (expect.sourceSectionIds !== undefined) {
        issues.push(
          ...assertDeepEqual(
            plan.sections.map((section) => section.sourceSectionId),
            expect.sourceSectionIds,
            "Planned source section IDs did not match.",
          ),
        );
      }
      if (expect.sectionOrders !== undefined) {
        issues.push(
          ...assertDeepEqual(
            plan.sections.map((section) => section.order),
            expect.sectionOrders,
            "Planned section order did not match.",
          ),
        );
      }
      if (expect.schemaKinds !== undefined) {
        issues.push(
          ...assertDeepEqual(
            plan.sections.map((section) => section.schemaKind),
            expect.schemaKinds,
            "Planned schema kinds did not match.",
          ),
        );
      }
      if (expect.sourceBlockIds !== undefined) {
        issues.push(
          ...assertDeepEqual(
            plan.sections.map((section) => section.sourceBlockIds),
            expect.sourceBlockIds,
            "Planned source block IDs did not match.",
          ),
        );
      }
      if (expect.targetRequiredSourceBlockIds !== undefined) {
        issues.push(
          ...assertDeepEqual(
            plan.sections.map(
              (section) => section.target.requiredSourceBlockIds,
            ),
            expect.targetRequiredSourceBlockIds,
            "Target required source block IDs did not match.",
          ),
        );
      }
      if (expect.metadata !== undefined) {
        issues.push(
          ...assertDeepEqual(
            plan.metadata,
            expect.metadata,
            "Plan metadata did not match.",
          ),
        );
      }
      if (expect.deterministicIds) {
        const repeatedPlan = buildGenerationPlan(fixture.outline, source);
        issues.push(
          ...assertEqual(
            repeatedPlan.id,
            plan.id,
            "Repeated planning changed the plan ID.",
          ),
          ...assertDeepEqual(
            repeatedPlan.sections.map((section) => section.id),
            plan.sections.map((section) => section.id),
            "Repeated planning changed planned section IDs.",
          ),
        );
      }

      return issues;
    },
  };
}

function createSchemaCase(fixture: Stage2SchemaFixture): EvalCase {
  return {
    name: fixture.name,
    run: async () => {
      const tags = fixture.tags ?? (fixture.tag ? [fixture.tag] : []);
      const { outline, source } = await createSingleSectionInput(tags, 1);
      const plan = buildGenerationPlan(outline, source);
      return assertEqual(
        plan.sections[0]?.schemaKind,
        fixture.expectSchemaKind,
        "Schema selection did not match tag priority.",
      );
    },
  };
}

function createTargetCase(fixture: Stage2TargetFixture): EvalCase {
  return {
    name: fixture.name,
    run: async () => {
      const { outline, source } = await createSingleSectionInput(
        [fixture.schemaTag],
        fixture.sourceBlockCount ?? 2,
        fixture.tokenWeight,
      );
      const plan = buildGenerationPlan(outline, source);
      const section = plan.sections[0];
      const issues: EvalIssue[] = [];

      if (!section) {
        return [{ message: "Generation plan did not contain a section." }];
      }
      if (fixture.expectSchemaKind !== undefined) {
        issues.push(
          ...assertEqual(
            section.schemaKind,
            fixture.expectSchemaKind,
            "Target schema kind did not match.",
          ),
        );
      }
      for (const text of fixture.expectObjectiveContains ?? []) {
        issues.push(
          ...assertIncludes(
            section.target.objective,
            text,
            "Target objective did not contain expected guidance.",
          ),
        );
      }
      const coverageText = section.target.coverageRules.join("\n");
      for (const text of fixture.expectCoverageContains ?? []) {
        issues.push(
          ...assertIncludes(
            coverageText,
            text,
            "Target coverage rules did not contain expected guidance.",
          ),
        );
      }
      if (fixture.expectItemCount !== undefined) {
        issues.push(
          ...assertEqual(
            section.target.itemCount,
            fixture.expectItemCount,
            "Target item count did not match.",
          ),
          ...assertEqual(
            section.targetItemCount,
            fixture.expectItemCount,
            "Planned section target item count did not match.",
          ),
        );
      }
      issues.push(
        ...assertDeepEqual(
          section.target.requiredSourceBlockIds,
          section.sourceBlockIds,
          "Target did not preserve required source block IDs.",
        ),
        ...assertDeepEqual(
          section.target.expectedTags,
          [fixture.schemaTag],
          "Target expected tags did not match the outline section.",
        ),
        ...assertEqual(
          section.target.focus,
          section.title,
          "Target focus did not match the section title.",
        ),
      );

      return issues;
    },
  };
}

async function createSingleSectionInput(
  tags: readonly SectionContentTag[],
  blockCount: number,
  tokenWeight?: number,
): Promise<{ readonly source: Awaited<ReturnType<typeof normalizeSource>>; readonly outline: SourceOutline }> {
  const blocks = Array.from({ length: blockCount }, (_value, index) => ({
    id: `target-block-${index}`,
    kind: "paragraph" as const,
    text: `Target source content ${index + 1}.`,
    order: index,
  }));
  const source = await normalizeSource({
    id: "target-source",
    title: "Target Section",
    blocks,
  });
  const blockIds = source.blocks.map((block) => block.id);
  const firstBlockId = blockIds[0] ?? "";
  const lastBlockId = blockIds.at(-1) ?? "";
  const effectiveTokenWeight =
    tokenWeight ??
    source.blocks.reduce(
      (total, block) => total + countTokens(block.text),
      0,
    );

  return {
    source,
    outline: {
      id: "target-outline",
      sourceId: source.id,
      title: source.title,
      sections: [
        {
          id: "target-section",
          title: "Target Section",
          order: 0,
          startOffset: 0,
          endOffset: source.blocks.reduce(
            (total, block) => total + block.text.length,
            0,
          ),
          tokenWeight: effectiveTokenWeight,
          sourceBlockIds: blockIds,
          blockIds,
          roughStartBlockId: firstBlockId,
          roughEndBlockId: lastBlockId,
          tags,
          confidence: 0.9,
        },
      ],
    },
  };
}

function createMissingInputCases(): readonly EvalCase[] {
  return [
    {
      name: "missing outline is rejected",
      run: async () => {
        const { source } = await createSingleSectionInput(["concept"], 1);
        try {
          buildGenerationPlan(undefined as unknown as SourceOutline, source);
          return [
            {
              message: "Expected generation planning to require an outline.",
              expected: "Generation planning requires an outline.",
              actual: "No error was thrown",
            },
          ];
        } catch (error) {
          return assertEqual(
            errorMessage(error),
            "Generation planning requires an outline.",
            "Missing-outline error message did not match.",
          );
        }
      },
    },
    {
      name: "missing normalized source is rejected",
      run: async () => {
        const { outline } = await createSingleSectionInput(["concept"], 1);
        try {
          buildGenerationPlan(
            outline,
            undefined as unknown as Awaited<ReturnType<typeof normalizeSource>>,
          );
          return [
            {
              message:
                "Expected generation planning to require a normalized source.",
              expected: "Generation planning requires a normalized source.",
              actual: "No error was thrown",
            },
          ];
        } catch (error) {
          return assertEqual(
            errorMessage(error),
            "Generation planning requires a normalized source.",
            "Missing-source error message did not match.",
          );
        }
      },
    },
  ];
}

function createItSecurityPlanCase(): EvalCase {
  return {
    name: "IT Security plan mirrors grouped source outline",
    run: async () => {
      const text = await readItSecurityFixture();
      const source = await normalizeSource({
        id: "it-security-plan-source",
        title: "Intro to IT Security Module 1",
        kind: "plain-text",
        language: "en",
        text,
        createdAt: "2026-01-01T00:00:00.000Z",
      });
      const outline = await detectOutline(source);
      const plan = buildGenerationPlan(outline, source);
      const issues: EvalIssue[] = [];

      issues.push(
        ...assertEqual(
          plan.sections.length,
          outline.sections.length,
          "Generation plan did not create one planned section per source outline section.",
        ),
        ...assertEqual(
          plan.sections.length > 6,
          true,
          "IT Security plan collapsed to six or fewer planned sections.",
        ),
        ...assertEqual(
          countTitle(plan.sections, "Types of Cybersecurity Threats"),
          1,
          "Plan duplicated Types of Cybersecurity Threats.",
        ),
        ...assertEqual(
          countTitle(plan.sections, "Methods to Deny Service"),
          1,
          "Plan duplicated Methods to Deny Service.",
        ),
      );

      return issues;
    },
  };
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

function countTitle(
  sections: readonly { readonly title: string }[],
  title: string,
): number {
  const key = normalizeTopicKey(title);
  return sections.filter((section) => normalizeTopicKey(section.title) === key)
    .length;
}

function normalizeTopicKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b(?:a|an|the)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function countTokens(text: string): number {
  return (text.match(/[\p{L}\p{N}]+/gu) ?? []).length;
}
