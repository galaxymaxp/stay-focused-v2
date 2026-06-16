import { readFile } from "node:fs/promises";
import { join } from "node:path";

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

const IT_SECURITY_REQUIRED_SECTIONS = [
  "What is IT Security",
  "Goal of IT Security",
  "Domains of IT Security",
  "What is Cybersecurity",
  "Importance of Cybersecurity",
  "Challenges of Cybersecurity",
  "Impact of Security Breach",
  "Types of Attackers",
  "Definition of Terms",
  "Types of Cybersecurity Threats",
  "Types of Malware",
  "Symptoms of Malware",
  "Methods of Infiltration",
  "Methods to Deny Service",
  "Blended Attacks",
  "Impact Reduction",
] as const;

export const stage1OutlineSuite: EvalSuite = {
  name: "Stage 1 outline detection",
  cases: [
    ...fixtures.map(createFixtureCase),
    createItSecurityOutlineCase(),
    createEmptySourceCase(),
  ],
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
    name: "empty normalized source returns an empty outline",
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
      const outline = await detectOutline(emptySource);

      return assertDeepEqual(
        outline.sections,
        [],
        "Empty source should produce an empty outline safely.",
      );
    },
  };
}

function createItSecurityOutlineCase(): EvalCase {
  return {
    name: "IT Security source detects major sections and groups repeats",
    run: async () => {
      const text = await readItSecurityFixture();
      const source = await normalizeSource({
        id: "it-security-outline-source",
        title: "Intro to IT Security Module 1",
        kind: "plain-text",
        language: "en",
        text,
        createdAt: "2026-01-01T00:00:00.000Z",
      });
      const outline = await detectOutline(source);
      const titleKeys = outline.sections.map((section) =>
        normalizeTopicKey(section.title),
      );
      const issues: EvalIssue[] = [];

      for (const requiredSection of IT_SECURITY_REQUIRED_SECTIONS) {
        issues.push(
          ...assertEqual(
            titleKeys.includes(normalizeTopicKey(requiredSection)),
            true,
            `IT Security outline did not include required section "${requiredSection}".`,
          ),
        );
      }

      issues.push(
        ...assertEqual(
          countTitle(outline.sections, "Types of Cybersecurity Threats"),
          1,
          "Repeated Types of Cybersecurity Threats headings were not grouped.",
        ),
        ...assertEqual(
          countTitle(outline.sections, "Methods to Deny Service"),
          1,
          "Repeated Methods to Deny Service headings were not grouped.",
        ),
        ...assertEqual(
          outline.sections.length > 6,
          true,
          "IT Security source collapsed to six or fewer detected sections.",
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
