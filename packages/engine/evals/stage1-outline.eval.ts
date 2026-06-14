import basicFixtures from "./fixtures/stage1-basic.json" with { type: "json" };
import structureFixtures from "./fixtures/stage1-structure.json" with {
  type: "json",
};
import tagFixtures from "./fixtures/stage1-tags.json" with { type: "json" };

import { normalizeSource } from "../src/stage0-normalize.js";
import { detectOutline } from "../src/stage1-outline.js";
import type {
  NormalizedSource,
  SectionContentTag,
  SourceBlockKind,
  SourceNormalizationInput,
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

interface Stage1ExpectedOutput {
  readonly outlineTitle?: string;
  readonly sectionTitles?: readonly string[];
  readonly sectionBlockKinds?: readonly (readonly SourceBlockKind[])[];
  readonly sectionBlockIds?: readonly (readonly string[])[];
  readonly sectionBlockTexts?: readonly (readonly string[])[];
  readonly sectionBlockCounts?: readonly number[];
  readonly sectionOrders?: readonly number[];
  readonly roughStartBlockIds?: readonly string[];
  readonly roughEndBlockIds?: readonly string[];
  readonly tags?: readonly (readonly SectionContentTag[])[];
  readonly confidences?: readonly number[];
  readonly deterministicIds?: boolean;
}

interface Stage1Fixture {
  readonly name: string;
  readonly input: SourceNormalizationInput;
  readonly expect: Stage1ExpectedOutput;
}

interface Stage1FixtureFile {
  readonly cases: readonly Stage1Fixture[];
}

const fixtures = [
  ...(basicFixtures as Stage1FixtureFile).cases,
  ...(structureFixtures as Stage1FixtureFile).cases,
  ...(tagFixtures as Stage1FixtureFile).cases,
];

export const stage1OutlineSuite: EvalSuite = {
  name: "Stage 1 outline detection",
  cases: [...fixtures.map(createFixtureCase), createEmptySourceCase()],
};

export async function runStage1OutlineEvals(): Promise<boolean> {
  const result = await runEvalSuite(stage1OutlineSuite);
  printEvalSuiteResult(result);
  setFailureExitCode([result]);
  return result.status === "passed";
}

if (isDirectExecution(import.meta.url)) {
  await runStage1OutlineEvals();
}

function createFixtureCase(fixture: Stage1Fixture): EvalCase {
  return {
    name: fixture.name,
    run: async () => {
      const source = await normalizeSource(fixture.input);
      const outline = await detectOutline(source);
      const issues: EvalIssue[] = [];
      const blockById = new Map(
        source.blocks.map((block) => [block.id, block] as const),
      );

      issues.push(
        ...assertEqual(
          outline.sourceId,
          source.id,
          "Outline source ID did not match the normalized source.",
        ),
      );

      if (fixture.expect.outlineTitle !== undefined) {
        issues.push(
          ...assertEqual(
            outline.title,
            fixture.expect.outlineTitle,
            "Outline title did not match.",
          ),
        );
      }
      if (fixture.expect.sectionTitles !== undefined) {
        issues.push(
          ...assertDeepEqual(
            outline.sections.map((section) => section.title),
            fixture.expect.sectionTitles,
            "Outline section titles did not match.",
          ),
        );
      }
      if (fixture.expect.sectionBlockIds !== undefined) {
        issues.push(
          ...assertDeepEqual(
            outline.sections.map((section) => section.blockIds),
            fixture.expect.sectionBlockIds,
            "Outline section block IDs did not match.",
          ),
        );
      }
      if (fixture.expect.sectionBlockKinds !== undefined) {
        issues.push(
          ...assertDeepEqual(
            outline.sections.map((section) =>
              section.blockIds.map((blockId) => blockById.get(blockId)?.kind),
            ),
            fixture.expect.sectionBlockKinds,
            "Outline section block kinds did not match.",
          ),
        );
      }
      if (fixture.expect.sectionBlockTexts !== undefined) {
        issues.push(
          ...assertDeepEqual(
            outline.sections.map((section) =>
              section.blockIds.map((blockId) => blockById.get(blockId)?.text),
            ),
            fixture.expect.sectionBlockTexts,
            "Outline section block text did not preserve source order.",
          ),
        );
      }
      if (fixture.expect.sectionBlockCounts !== undefined) {
        issues.push(
          ...assertDeepEqual(
            outline.sections.map((section) => section.blockIds.length),
            fixture.expect.sectionBlockCounts,
            "Outline section block counts did not match.",
          ),
        );
      }
      if (fixture.expect.sectionOrders !== undefined) {
        issues.push(
          ...assertDeepEqual(
            outline.sections.map((section) => section.order),
            fixture.expect.sectionOrders,
            "Outline section order did not match.",
          ),
        );
      }
      if (fixture.expect.roughStartBlockIds !== undefined) {
        issues.push(
          ...assertDeepEqual(
            outline.sections.map((section) => section.roughStartBlockId),
            fixture.expect.roughStartBlockIds,
            "Outline rough start block IDs did not match.",
          ),
        );
      }
      if (fixture.expect.roughEndBlockIds !== undefined) {
        issues.push(
          ...assertDeepEqual(
            outline.sections.map((section) => section.roughEndBlockId),
            fixture.expect.roughEndBlockIds,
            "Outline rough end block IDs did not match.",
          ),
        );
      }
      if (fixture.expect.tags !== undefined) {
        issues.push(
          ...assertDeepEqual(
            outline.sections.map((section) => section.tags),
            fixture.expect.tags,
            "Outline section tags did not match.",
          ),
        );
      }
      if (fixture.expect.confidences !== undefined) {
        issues.push(
          ...assertDeepEqual(
            outline.sections.map((section) => section.confidence),
            fixture.expect.confidences,
            "Outline section confidence scores did not match.",
          ),
        );
      }
      if (fixture.expect.deterministicIds) {
        const repeatedOutline = await detectOutline(source);
        issues.push(
          ...assertEqual(
            repeatedOutline.id,
            outline.id,
            "Repeated outline detection changed the outline ID.",
          ),
          ...assertDeepEqual(
            repeatedOutline.sections.map((section) => section.id),
            outline.sections.map((section) => section.id),
            "Repeated outline detection changed section IDs.",
          ),
        );
      }

      return issues;
    },
  };
}

function createEmptySourceCase(): EvalCase {
  return {
    name: "empty normalized source is rejected",
    run: async () => {
      const emptySource: NormalizedSource = {
        id: "empty-source",
        title: "Empty Source",
        kind: "unknown",
        language: "und",
        metadata: {},
        blocks: [],
        createdAt: "2026-01-01T00:00:00.000Z",
      };

      try {
        await detectOutline(emptySource);
        return [
          {
            message: "Expected outline detection to reject an empty source.",
            expected: "Outline detection requires at least one source block.",
            actual: "No error was thrown",
          },
        ];
      } catch (error) {
        return assertEqual(
          errorMessage(error),
          "Outline detection requires at least one source block.",
          "Outline detection error message did not match.",
        );
      }
    },
  };
}
