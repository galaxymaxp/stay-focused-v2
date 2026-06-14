import basicFixtures from "./fixtures/stage0-basic.json" with { type: "json" };
import errorFixtures from "./fixtures/stage0-errors.json" with { type: "json" };
import structureFixtures from "./fixtures/stage0-structure.json" with {
  type: "json",
};

import { normalizeSource } from "../src/stage0-normalize.js";
import type {
  MetadataValue,
  NormalizedSourceKind,
  SourceBlockKind,
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

interface Stage0ExpectedMetadata {
  readonly author?: string;
  readonly attributes?: Readonly<Record<string, MetadataValue>>;
  readonly absentAttributeKeys?: readonly string[];
}

interface Stage0ExpectedOutput {
  readonly title?: string;
  readonly kind?: NormalizedSourceKind;
  readonly language?: string;
  readonly blockKinds?: readonly SourceBlockKind[];
  readonly blockCount?: number;
  readonly containsText?: readonly string[];
  readonly blockTexts?: readonly string[];
  readonly blockOrders?: readonly number[];
  readonly deterministicIds?: boolean;
  readonly createdAt?: string;
  readonly metadata?: Stage0ExpectedMetadata;
}

interface Stage0SuccessFixture {
  readonly name: string;
  readonly input: SourceNormalizationInput;
  readonly expect: Stage0ExpectedOutput;
}

interface Stage0ErrorFixture {
  readonly name: string;
  readonly input: SourceNormalizationInput;
  readonly expectError: string;
}

interface SuccessFixtureFile {
  readonly cases: readonly Stage0SuccessFixture[];
}

interface ErrorFixtureFile {
  readonly cases: readonly Stage0ErrorFixture[];
}

const successFixtures = [
  ...(basicFixtures as SuccessFixtureFile).cases,
  ...(structureFixtures as SuccessFixtureFile).cases,
];
const expectedErrorFixtures = (errorFixtures as ErrorFixtureFile).cases;

export const stage0NormalizationSuite: EvalSuite = {
  name: "Stage 0 normalization",
  cases: [
    ...successFixtures.map(createSuccessCase),
    ...expectedErrorFixtures.map(createErrorCase),
  ],
};

export async function runStage0NormalizationEvals(): Promise<boolean> {
  const result = await runEvalSuite(stage0NormalizationSuite);
  printEvalSuiteResult(result);
  setFailureExitCode([result]);
  return result.status === "passed";
}

if (isDirectExecution(import.meta.url)) {
  await runStage0NormalizationEvals();
}

function createSuccessCase(fixture: Stage0SuccessFixture): EvalCase {
  return {
    name: fixture.name,
    run: async () => {
      const output = await normalizeSource(fixture.input);
      const issues: EvalIssue[] = [];

      if (fixture.expect.title !== undefined) {
        issues.push(
          ...assertEqual(
            output.title,
            fixture.expect.title,
            "Normalized title did not match.",
          ),
        );
      }
      if (fixture.expect.kind !== undefined) {
        issues.push(
          ...assertEqual(
            output.kind,
            fixture.expect.kind,
            "Normalized source kind did not match.",
          ),
        );
      }
      if (fixture.expect.language !== undefined) {
        issues.push(
          ...assertEqual(
            output.language,
            fixture.expect.language,
            "Normalized language did not match.",
          ),
        );
      }
      if (fixture.expect.blockKinds !== undefined) {
        issues.push(
          ...assertDeepEqual(
            output.blocks.map((block) => block.kind),
            fixture.expect.blockKinds,
            "Normalized block kinds did not match.",
          ),
        );
      }
      if (fixture.expect.blockCount !== undefined) {
        issues.push(
          ...assertEqual(
            output.blocks.length,
            fixture.expect.blockCount,
            "Normalized block count did not match.",
          ),
        );
      }
      if (fixture.expect.blockTexts !== undefined) {
        issues.push(
          ...assertDeepEqual(
            output.blocks.map((block) => block.text),
            fixture.expect.blockTexts,
            "Normalized block text did not match.",
          ),
        );
      }
      if (fixture.expect.blockOrders !== undefined) {
        issues.push(
          ...assertDeepEqual(
            output.blocks.map((block) => block.order),
            fixture.expect.blockOrders,
            "Normalized block order did not match.",
          ),
        );
      }
      for (const expectedText of fixture.expect.containsText ?? []) {
        issues.push(
          ...assertIncludes(
            output.blocks.map((block) => block.text).join("\n"),
            expectedText,
            "Normalized blocks did not contain expected text.",
          ),
        );
      }
      if (fixture.expect.createdAt !== undefined) {
        issues.push(
          ...assertEqual(
            output.createdAt,
            fixture.expect.createdAt,
            "Normalized creation timestamp did not match.",
          ),
        );
      }
      if (fixture.expect.metadata?.author !== undefined) {
        issues.push(
          ...assertEqual(
            output.metadata.author,
            fixture.expect.metadata.author,
            "Sanitized metadata author did not match.",
          ),
        );
      }
      if (fixture.expect.metadata?.attributes !== undefined) {
        for (const [key, expectedValue] of Object.entries(
          fixture.expect.metadata.attributes,
        )) {
          issues.push(
            ...assertEqual(
              output.metadata.attributes?.[key],
              expectedValue,
              `Sanitized metadata attribute "${key}" did not match.`,
            ),
          );
        }
      }
      for (const key of fixture.expect.metadata?.absentAttributeKeys ?? []) {
        issues.push(
          ...assertEqual(
            key in (output.metadata.attributes ?? {}),
            false,
            `Unsafe metadata attribute "${key}" was retained.`,
          ),
        );
      }
      if (fixture.expect.deterministicIds) {
        const repeatedOutput = await normalizeSource(fixture.input);
        issues.push(
          ...assertEqual(
            repeatedOutput.id,
            output.id,
            "Repeated normalization changed the source ID.",
          ),
          ...assertDeepEqual(
            repeatedOutput.blocks.map((block) => block.id),
            output.blocks.map((block) => block.id),
            "Repeated normalization changed block IDs.",
          ),
        );
      }

      return issues;
    },
  };
}

function createErrorCase(fixture: Stage0ErrorFixture): EvalCase {
  return {
    name: fixture.name,
    run: async () => {
      try {
        await normalizeSource(fixture.input);
        return [
          {
            message: "Expected normalization to throw an error.",
            expected: fixture.expectError,
            actual: "No error was thrown",
          },
        ];
      } catch (error) {
        return assertEqual(
          errorMessage(error),
          fixture.expectError,
          "Normalization error message did not match.",
        );
      }
    },
  };
}
