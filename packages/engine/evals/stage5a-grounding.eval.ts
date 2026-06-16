import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { normalizeSource } from "../src/stage0-normalize.js";
import { detectOutline, flattenSourceBlocks } from "../src/stage1-outline.js";
import { validateGrounding } from "../src/stage5a-grounding.js";
import type {
  GenerationPlan,
  NormalizedSource,
  PlannedSection,
  SectionOutput,
  SourceOutline,
  SourceOutlineSection,
} from "../src/types.js";
import {
  assertEqual,
  isDirectExecution,
  printEvalSuiteResult,
  runEvalSuite,
  setFailureExitCode,
} from "./assert.js";
import type { EvalCase, EvalIssue, EvalSuite } from "./types.js";

export const stage5aGroundingSuite: EvalSuite = {
  name: "Stage 5a grounding validation",
  cases: [
    createSymptomsRegressionCase(),
    createBlendedAttackRegressionCase(),
    createDenyServiceRegressionCase(),
    createFaithfulSectionsCase(),
  ],
};

export async function runStage5aGroundingEvals(): Promise<boolean> {
  const result = await runEvalSuite(stage5aGroundingSuite);
  printEvalSuiteResult(result);
  setFailureExitCode([result]);
  return result.status === "passed";
}

if (isDirectExecution(import.meta.url)) {
  await runStage5aGroundingEvals();
}

function createSymptomsRegressionCase(): EvalCase {
  return {
    name: "IT Security Symptoms of Malware flags omission and fabrication",
    run: async () => {
      const context = await createItSecurityContext("Symptoms of Malware");
      const output = createOutput(
        context.section,
        "Malware symptoms include browser hijackers, network telemetry changes, high CPU usage, and deleted files.",
        [
          "Browser hijackers can appear during malware infections.",
          "Network telemetry changes can reveal malware.",
        ],
      );
      const report = validateGrounding({
        plan: context.plan,
        outputs: [output],
        source: context.source,
        outline: context.outline,
      });
      const result = report.sections[0];
      const issueTypes = result?.issues.map((issue) => issue.type) ?? [];

      return [
        ...assertEqual(
          issueTypes.includes("grounding-omission"),
          true,
          "Symptoms of Malware did not raise grounding-omission.",
        ),
        ...assertEqual(
          issueTypes.includes("grounding-fabrication"),
          true,
          "Symptoms of Malware did not raise grounding-fabrication.",
        ),
      ];
    },
  };
}

function createBlendedAttackRegressionCase(): EvalCase {
  return {
    name: "IT Security Blended Attacks flags retail SQL scenario fabrication",
    run: async () => {
      const context = await createItSecurityContext("Blended Attacks");
      const output = createOutput(
        context.section,
        "A retail company receives phishing emails and then suffers SQL injection through its checkout system.",
        ["The retail SQL-injection scenario shows how blended attacks escalate."],
      );
      const report = validateGrounding({
        plan: context.plan,
        outputs: [output],
        source: context.source,
        outline: context.outline,
      });
      const result = report.sections[0];

      return assertEqual(
        result?.issues.some(
          (issue) =>
            issue.type === "grounding-fabrication" &&
            /sql|retail|injection/i.test(issue.offendingText ?? ""),
        ),
        true,
        "Blended Attacks retail SQL scenario did not raise fabrication.",
      );
    },
  };
}

function createDenyServiceRegressionCase(): EvalCase {
  return {
    name: "IT Security Methods to Deny Service flags unsupported flood specifics",
    run: async () => {
      const context = await createItSecurityContext("Methods to Deny Service");
      const output = createOutput(
        context.section,
        "Denial methods include ICMP flood, SYN flood, UDP flood, HTTP flood, and Slowloris.",
        ["ICMP, SYN, UDP, HTTP, and Slowloris are specific service-denial methods."],
      );
      const report = validateGrounding({
        plan: context.plan,
        outputs: [output],
        source: context.source,
        outline: context.outline,
      });
      const result = report.sections[0];

      return assertEqual(
        result?.issues.some(
          (issue) =>
            issue.type === "grounding-fabrication" &&
            /icmp|syn|udp|slowloris|http/i.test(issue.offendingText ?? ""),
        ),
        true,
        "Methods to Deny Service unsupported flood specifics did not raise fabrication.",
      );
    },
  };
}

function createFaithfulSectionsCase(): EvalCase {
  return {
    name: "IT Security faithful sections pass grounding cleanly",
    run: async () => {
      const definition = await createItSecurityContext("Definition of Terms");
      const impact = await createItSecurityContext("Impact of a Security Breach");
      const definitionText = extractSourceSectionText(
        definition.source,
        definition.sourceSection,
      );
      const impactText = extractSourceSectionText(impact.source, impact.sourceSection);
      const definitionOutput = createOutput(
        definition.section,
        definitionText,
        [definitionText],
      );
      const impactOutput = createOutput(impact.section, impactText, [impactText]);
      const plan: GenerationPlan = {
        ...definition.plan,
        sections: [definition.section, { ...impact.section, order: 1 }],
        metadata: {
          ...definition.plan.metadata,
          sectionCount: 2,
        },
      };
      const report = validateGrounding({
        plan,
        outputs: [definitionOutput, impactOutput],
        source: definition.source,
        outline: definition.outline,
      });
      const issues: EvalIssue[] = [];

      for (const result of report.sections) {
        issues.push(
          ...assertEqual(
            result.status,
            "passed",
            `Faithful section ${result.plannedSectionId} did not pass grounding.`,
          ),
          ...assertEqual(
            result.issues.length,
            0,
            `Faithful section ${result.plannedSectionId} emitted grounding issues.`,
          ),
        );
      }

      return issues;
    },
  };
}

async function createItSecurityContext(title: string): Promise<{
  readonly source: NormalizedSource;
  readonly outline: SourceOutline;
  readonly sourceSection: SourceOutlineSection;
  readonly section: PlannedSection;
  readonly plan: GenerationPlan;
}> {
  const text = await readItSecurityFixture();
  const source = await normalizeSource({
    id: "it-security-grounding-source",
    title: "Intro to IT Security Module 1",
    kind: "plain-text",
    language: "en",
    text,
    createdAt: "2026-01-01T00:00:00.000Z",
  });
  const outline = await detectOutline(source);
  const sourceSection = requireSourceSection(outline, title);
  const section = createPlannedSection(sourceSection, 0);
  const plan: GenerationPlan = {
    id: `grounding-plan-${normalizeTopicKey(title)}`,
    sourceId: source.id,
    outlineId: outline.id,
    title: source.title,
    sections: [section],
    metadata: {
      sectionCount: 1,
      sourceBlockCount: source.blocks.length,
    },
  };

  return { source, outline, sourceSection, section, plan };
}

function createPlannedSection(
  sourceSection: SourceOutlineSection,
  order: number,
): PlannedSection {
  return {
    id: `planned-${normalizeTopicKey(sourceSection.title)}-${order}`,
    sourceSectionId: sourceSection.id,
    title: sourceSection.title,
    order,
    schemaKind: "concept-card",
    target: {
      objective: `Explain ${sourceSection.title}.`,
      itemCount: 1,
      focus: sourceSection.title,
      requiredSourceBlockIds: [...sourceSection.sourceBlockIds],
      expectedTags: ["concept"],
      coverageRules: ["Represent only the source section."],
    },
    sourceBlockIds: [...sourceSection.sourceBlockIds],
    tokenWeight: sourceSection.tokenWeight,
    targetItemCount: 1,
    sourceStartOffset: sourceSection.startOffset,
    sourceEndOffset: sourceSection.endOffset,
  };
}

function createOutput(
  section: PlannedSection,
  explanation: string,
  keyPoints: readonly string[],
): SectionOutput {
  return {
    id: `output-${section.id}`,
    kind: "concept-card",
    plannedSectionId: section.id,
    title: section.title,
    sourceBlockIds: [...section.sourceBlockIds],
    sourceCore: {
      explanation,
      keyPoints,
    },
  };
}

function extractSourceSectionText(
  source: NormalizedSource,
  sourceSection: SourceOutlineSection,
): string {
  const sourceBlockIds = new Set([
    ...sourceSection.sourceBlockIds,
    ...sourceSection.blockIds,
  ]);
  const orderedBlocks = source.blocks
    .map((block, inputIndex) => ({ block, inputIndex }))
    .sort(
      (left, right) =>
        left.block.order - right.block.order ||
        left.inputIndex - right.inputIndex,
    )
    .map(({ block }) => block);
  const fragments = flattenSourceBlocks(removeConsecutiveDuplicateBlocks(orderedBlocks))
    .filter(({ block }) => sourceBlockIds.has(block.id))
    .map(({ block, startOffset, endOffset }) => {
      const start = Math.max(startOffset, sourceSection.startOffset);
      const end = Math.min(endOffset, sourceSection.endOffset);
      return start < end
        ? block.text.slice(start - startOffset, end - startOffset).trim()
        : "";
    })
    .filter((text) => text.length > 0);

  return fragments.join("\n").trim();
}

function removeConsecutiveDuplicateBlocks(
  blocks: readonly NormalizedSource["blocks"][number][],
): readonly NormalizedSource["blocks"][number][] {
  const uniqueBlocks: NormalizedSource["blocks"][number][] = [];
  let previousText: string | undefined;

  for (const block of blocks) {
    if (block.text === previousText) {
      continue;
    }
    uniqueBlocks.push(block);
    previousText = block.text;
  }

  return uniqueBlocks;
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

function normalizeTopicKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b(?:a|an|the)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}
