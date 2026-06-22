import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type {
  GenerationProvider,
  GenerationRequest,
} from "../src/provider.js";
import { assembleReviewer } from "../src/stage6-assemble.js";
import { extractCleanSourceItems } from "../src/source-items.js";
import { normalizeSource } from "../src/stage0-normalize.js";
import { detectOutline } from "../src/stage1-outline.js";
import { buildGenerationPlan } from "../src/stage2-plan.js";
import {
  collectSectionSourceBlocks,
  generateSection,
} from "../src/stage3-generate.js";
import { verifyCoverage } from "../src/stage4-verify.js";
import {
  extractGroundingSourceSectionText,
  validateGrounding,
} from "../src/stage5a-grounding.js";
import { validateLeakage } from "../src/leakage-guard.js";
import type {
  GenerationPlan,
  NormalizedSource,
  PlannedSection,
  SectionOutput,
  SourceOutline,
  SourceOutlineSection,
} from "../src/types.js";
import {
  assertDeepEqual,
  assertEqual,
  assertIncludes,
  isDirectExecution,
  printEvalSuiteResult,
  runEvalSuite,
  setFailureExitCode,
} from "./assert.js";
import type { EvalCase, EvalIssue, EvalSuite } from "./types.js";

interface FidelityFixture {
  readonly name: string;
  readonly title: string;
  readonly items: readonly string[];
}

interface CorruptionFixture {
  readonly source: string;
  readonly visible: string;
}

interface CorruptionGroup {
  readonly name: string;
  readonly cases: readonly CorruptionFixture[];
}

const PRESERVATION_FIXTURES: readonly FidelityFixture[] = [
  {
    name: "electronics and measurements",
    title: "Electronics Measurements",
    items: [
      "3.3V on 3.3 board",
      "5.0V output pin",
      "1.5A current limit",
      "10.2kΩ resistor",
      "9.81 m/s²",
      "37.5°C",
      "pH 7.4",
    ],
  },
  {
    name: "math expressions",
    title: "Math Expressions",
    items: [
      "x^2 + 2x + 1",
      "f(x) = x/2",
      "1/2 and 3/4",
      "a ≤ b and b ≥ c",
      "√x",
      "sin θ",
    ],
  },
  {
    name: "science and chemistry",
    title: "Science Chemistry",
    items: [
      "H2O is water",
      "CO2 and CO₂",
      "O₂",
      "Na+ and Cl-",
      "10^-3 mol/L",
      "β-blocker",
      "α particle",
    ],
  },
  {
    name: "history law and dates",
    title: "History Law Dates",
    items: [
      "1898",
      "9/11",
      "12/11/2009",
      "December 11, 2009",
      "R.A. 9850",
      "World War II",
      "Article III, Section 1",
      "Sec. 3.2",
      "Fig. 2.1",
    ],
  },
  {
    name: "computing and networking",
    title: "Computing Networking",
    items: [
      "IPv4 and IPv6",
      "192.168.1.1",
      "10.0.0.0/8",
      "SHA-256",
      "AES-128",
      "GPT-4o",
      "TypeScript 5.8.3",
      "Node.js 22.1.0",
      "stage3-generate.ts",
      ".env.local",
      "https://example.com/api/v1",
      "C:\\Users\\Fely\\Projects",
    ],
  },
  {
    name: "code and commands",
    title: "Code Commands",
    items: [
      "digitalWrite(13, HIGH)",
      "pinMode(LED_BUILTIN, OUTPUT)",
      "npm run build",
      "git log --oneline -5",
      "const x = arr[i]",
    ],
  },
  {
    name: "ranges ratios scores and dimensions",
    title: "Ranges Ratios Scores Dimensions",
    items: [
      "3–5 days",
      "10-15 minutes",
      "1:2 ratio",
      "3:2 score",
      "4x100 relay",
      "1920×1080 resolution",
      "±5%",
      "≥ 90%",
      "≤ 10",
    ],
  },
  {
    name: "abbreviations and dotted terms",
    title: "Abbreviations Dotted Terms",
    items: [
      "e.g.",
      "i.e.",
      "Dr. Jose Rizal",
      "U.S.",
      "Ph.D.",
      "No. 1",
      "Fig. 2.1",
      "Sec. 3.2",
    ],
  },
  {
    name: "tables and row-like data",
    title: "Voltage Safety Table",
    items: [
      "Voltage | Board | Result",
      "3.3V | 3.3 board | safe",
      "5V | 3.3 board | unsafe",
    ],
  },
  {
    name: "headings and numbered sections",
    title: "Numbered Headings",
    items: [
      "Chapter 1. Introduction",
      "A. Historical Concept:",
      "I. Background",
      "1.1 Scope",
      "3 MAIN GROUPS:",
    ],
  },
  {
    name: "OCR and noisy source preservation",
    title: "OCR Preservation",
    items: [
      "H20 should not be silently fixed to H2O",
      "0 and O ambiguity stays unchanged",
      "l and 1 ambiguity stays unchanged",
    ],
  },
];

const CORRUPTION_GROUPS: readonly CorruptionGroup[] = [
  {
    name: "electronics and measurements reject changed numeric identity",
    cases: [
      { source: "3.3V on 3.3 board", visible: "3V on" },
      { source: "3.3V on 3.3 board", visible: "3 board" },
      { source: "5.0V output pin", visible: "50V output pin" },
      { source: "1.5A current limit", visible: "15A current limit" },
      { source: "10.2kΩ resistor", visible: "102kΩ resistor" },
    ],
  },
  {
    name: "math rejects stripped operators",
    cases: [
      { source: "x^2 + 2x + 1", visible: "x2 + 2x + 1" },
      { source: "f(x) = x^2", visible: "fx = x2" },
    ],
  },
  {
    name: "science and chemistry reject changed formulas",
    cases: [
      { source: "H2O is water", visible: "H20 is water" },
      { source: "CO2 is carbon dioxide", visible: "CO 2 is carbon dioxide" },
    ],
  },
  {
    name: "history law and dates reject punctuation loss",
    cases: [
      { source: "R.A. 9850", visible: "RA 9850" },
      {
        source: "Article III, Section 1",
        visible: "Article III Section",
      },
      { source: "December 11, 2009", visible: "December 112009" },
    ],
  },
  {
    name: "computing and networking reject token collapse",
    cases: [
      { source: "192.168.1.1", visible: "19216811" },
      { source: "10.0.0.0/8", visible: "100008" },
      { source: "SHA-256", visible: "SHA256" },
      { source: "TypeScript 5.8.3", visible: "TypeScript 583" },
      { source: "Node.js 22.1.0", visible: "Nodejs 2210" },
      { source: "stage3-generate.ts", visible: "stage3 generate ts" },
      { source: ".env.local", visible: "env local" },
    ],
  },
  {
    name: "code and commands reject stripped syntax",
    cases: [
      {
        source: "digitalWrite(13, HIGH)",
        visible: "digitalWrite13 HIGH",
      },
      {
        source: "pinMode(LED_BUILTIN, OUTPUT)",
        visible: "pinMode LED_BUILTIN OUTPUT",
      },
    ],
  },
  {
    name: "ranges ratios scores and dimensions reject separator loss",
    cases: [
      { source: "3–5 days", visible: "3 5 days" },
      { source: "1:2 ratio", visible: "1 2 ratio" },
      { source: "1920×1080 resolution", visible: "19201080 resolution" },
    ],
  },
  {
    name: "abbreviations and dotted terms reject dot loss",
    cases: [
      { source: "Dr. Jose Rizal", visible: "Dr Jose Rizal" },
      { source: "U.S.", visible: "US" },
      { source: "Ph.D.", visible: "PhD" },
      { source: "Fig. 2.1", visible: "Fig 21" },
      { source: "Sec. 3.2", visible: "Sec 32" },
    ],
  },
  {
    name: "table rows reject relationship loss",
    cases: [
      {
        source: "3.3V | 3.3 board | safe",
        visible: "3.3V safe",
      },
    ],
  },
  {
    name: "numbered headings reject structural dot loss",
    cases: [
      {
        source: "Chapter 1. Introduction",
        visible: "Chapter 1 Introduction",
      },
      { source: "1.1 Scope", visible: "11 Scope" },
    ],
  },
  {
    name: "OCR-looking source is not silently corrected",
    cases: [
      {
        source: "H20 should not be silently fixed",
        visible: "H2O should not be silently fixed",
      },
    ],
  },
];

class StaticProvider implements GenerationProvider {
  public async generate<TOutput>(
    request: GenerationRequest<TOutput>,
  ): Promise<TOutput> {
    const plannedSectionId = String(
      request.metadata?.["plannedSectionId"] ?? "missing-section",
    );
    const sourceBlockIds = readSourceBlockIds(request.prompt);

    return {
      kind: schemaKindForName(request.schema.name),
      id: `output-${plannedSectionId}`,
      plannedSectionId,
      title: "Provider title is normalized by Stage 3",
      sourceBlockIds,
      sourceCore: {
        explanation: "Provider content must be replaced for detected lists.",
        keyPoints: ["Provider-authored summary."],
      },
      enrichment: null,
    } as TOutput;
  }
}

export const sourceTokenFidelitySuite: EvalSuite = {
  name: "Source-token fidelity",
  cases: [
    ...PRESERVATION_FIXTURES.map(createPreservationCase),
    ...CORRUPTION_GROUPS.map(createCorruptionRejectionCase),
    createDigitalComponentsRegressionCase(),
  ],
};

export async function runSourceTokenFidelityEvals(): Promise<boolean> {
  const result = await runEvalSuite(sourceTokenFidelitySuite);
  printEvalSuiteResult(result);
  setFailureExitCode([result]);
  return result.status === "passed";
}

if (isDirectExecution(import.meta.url)) {
  await runSourceTokenFidelityEvals();
}

function createPreservationCase(fixture: FidelityFixture): EvalCase {
  return {
    name: `${fixture.name} survive normalization through assembly`,
    run: async () => {
      const text = sourceListText(fixture.title, fixture.items);
      const source = await normalizeSource({
        id: `fidelity-${slug(fixture.name)}`,
        title: fixture.title,
        kind: "plain-text",
        language: "en",
        text,
        createdAt: "2026-06-23T00:00:00.000Z",
      });
      const outline = await detectOutline(source);
      const plan = buildGenerationPlan(outline, source);
      const section = plan.sections[0];
      const sourceSection = outline.sections[0];

      if (!section || !sourceSection) {
        return [{ message: "Fidelity pipeline did not create one section." }];
      }

      const normalizedText = source.blocks.map((block) => block.text).join("\n");
      const outlineText = extractGroundingSourceSectionText(
        source,
        sourceSection,
      );
      const plannedBlocks = collectSectionSourceBlocks(section, source);
      const plannedText = plannedBlocks.map((block) => block.text).join("\n");
      const plannedItems = extractCleanSourceItems({
        sourceSpanText: plannedText,
        sectionTitle: section.title,
      }).map((item) => item.text);
      const output = await generateSection({
        section,
        plan,
        source,
        provider: new StaticProvider(),
      });
      const grounding = validateGrounding({
        plan,
        outputs: [output],
        source,
        outline,
      });
      const coverage = verifyCoverage({
        plan,
        outputs: [output],
        source,
        outline,
      });
      const leakage = validateLeakage({
        plan,
        outputs: [output],
      });
      const reviewer = assembleReviewer({
        source,
        plan,
        outputs: [output],
        coverage,
        grounding,
        leakage,
      });
      const visibleKeyPoints =
        reviewer.sections[0]?.items[0]?.sourceCore.keyPoints ?? [];
      const issues: EvalIssue[] = [
        ...assertDeepEqual(
          plannedItems,
          fixture.items,
          `${fixture.name} source items changed before generation.`,
        ),
        ...assertDeepEqual(
          output.sourceCore.keyPoints,
          fixture.items,
          `${fixture.name} source items changed during Stage 3 overwrite.`,
        ),
        ...assertEqual(
          grounding.status,
          "passed",
          `${fixture.name} faithful output did not pass grounding.`,
        ),
        ...assertDeepEqual(
          visibleKeyPoints,
          fixture.items,
          `${fixture.name} source items changed during Stage 6 assembly.`,
        ),
      ];

      for (const item of fixture.items) {
        issues.push(
          ...assertIncludes(
            normalizedText,
            item,
            `${fixture.name} token changed during normalization.`,
          ),
          ...assertIncludes(
            outlineText,
            item,
            `${fixture.name} token changed in the outline source span.`,
          ),
          ...assertIncludes(
            plannedText,
            item,
            `${fixture.name} token changed in the planned source span.`,
          ),
        );
      }

      return issues;
    },
  };
}

function createCorruptionRejectionCase(group: CorruptionGroup): EvalCase {
  return {
    name: group.name,
    run: async () => {
      const issues: EvalIssue[] = [];

      for (const [index, fixture] of group.cases.entries()) {
        const context = createGroundingContext(
          `corruption-${slug(group.name)}-${index}`,
          fixture.source,
        );
        const output = createOutput(
          context.section,
          fixture.source,
          fixture.visible,
        );
        const report = validateGrounding({
          plan: context.plan,
          outputs: [output],
          source: context.source,
          outline: context.outline,
        });
        const result = report.sections[0];
        const fieldIssue = result?.issues.find(
          (issue) => issue.fieldPath === "sourceCore.keyPoints[0]",
        );

        issues.push(
          ...assertEqual(
            result?.status,
            "failed",
            `Grounding accepted corrupted visible text "${fixture.visible}" for source "${fixture.source}".`,
          ),
          ...assertEqual(
            fieldIssue !== undefined,
            true,
            `Grounding did not report the corrupted key point field for "${fixture.visible}".`,
          ),
        );
      }

      return issues;
    },
  };
}

function createDigitalComponentsRegressionCase(): EvalCase {
  return {
    name: "Digital Components keeps 3.3V on 3.3 board as one source item",
    run: async () => {
      const source = await normalizeSource({
        id: "digital-components-fidelity",
        title: "Digital Components",
        kind: "plain-text",
        language: "en",
        text: await readDigitalComponentsFixture(),
        createdAt: "2026-06-23T00:00:00.000Z",
      });
      const outline = await detectOutline(source);
      const plan = buildGenerationPlan(outline, source);
      const sectionIndex = outline.sections.findIndex((section) =>
        section.title.toLowerCase().startsWith("digitalwrite () 1"),
      );
      const section = plan.sections[sectionIndex];

      if (!section) {
        return [
          {
            message:
              "Digital Components fidelity setup could not find digitalWrite () 1.",
          },
        ];
      }

      const plannedText = collectSectionSourceBlocks(section, source)
        .map((block) => block.text)
        .join("\n");
      const sourceItems = extractCleanSourceItems({
        sourceSpanText: plannedText,
        sectionTitle: section.title,
      }).map((item) => item.text);
      const output = await generateSection({
        section,
        plan,
        source,
        provider: new StaticProvider(),
      });
      const keyPoints = output.sourceCore.keyPoints;
      const fullItem =
        "Write a HIGH(5V or 3.3V on 3.3 board) or a LOW(0V) value to a digital pin.";

      return [
        ...assertEqual(
          sourceItems.includes(fullItem),
          true,
          "Digital Components source-item extraction lost the full voltage/board item.",
        ),
        ...assertEqual(
          keyPoints.includes(fullItem),
          true,
          "Stage 3 did not preserve the full Digital Components source item.",
        ),
        ...assertEqual(
          keyPoints.some((item) => item === "3V on"),
          false,
          'Stage 3 emitted the corrupted standalone item "3V on".',
        ),
        ...assertEqual(
          keyPoints.some((item) => item === "3 board)"),
          false,
          'Stage 3 emitted the corrupted standalone item "3 board)".',
        ),
        ...assertEqual(
          keyPoints.some((item) => /(?:^|[^.\d])3V on/.test(item)),
          false,
          "Stage 3 stripped 3.3V to 3V.",
        ),
        ...assertEqual(
          keyPoints.some((item) => /(?:^|[^.\d])3 board\b/.test(item)),
          false,
          "Stage 3 stripped 3.3 board to 3 board.",
        ),
      ];
    },
  };
}

function createGroundingContext(
  id: string,
  sourceText: string,
): {
  readonly source: NormalizedSource;
  readonly outline: SourceOutline;
  readonly section: PlannedSection;
  readonly plan: GenerationPlan;
} {
  const blockId = `${id}-block`;
  const sourceSection: SourceOutlineSection = {
    id: `${id}-source-section`,
    title: "Fidelity",
    order: 0,
    startOffset: 0,
    endOffset: sourceText.length,
    tokenWeight: Math.max(1, sourceText.split(/\s+/).length),
    sourceBlockIds: [blockId],
    blockIds: [blockId],
    roughStartBlockId: blockId,
    roughEndBlockId: blockId,
    tags: ["concept"],
    confidence: 1,
  };
  const source: NormalizedSource = {
    id: `${id}-source`,
    title: "Fidelity",
    kind: "plain-text",
    language: "en",
    metadata: {},
    blocks: [
      {
        id: blockId,
        kind: "paragraph",
        text: sourceText,
        order: 0,
      },
    ],
    createdAt: "2026-06-23T00:00:00.000Z",
  };
  const outline: SourceOutline = {
    id: `${id}-outline`,
    sourceId: source.id,
    title: source.title,
    sections: [sourceSection],
  };
  const section: PlannedSection = {
    id: `${id}-planned`,
    sourceSectionId: sourceSection.id,
    title: sourceSection.title,
    order: 0,
    schemaKind: "concept-card",
    target: {
      objective: "Preserve the source token.",
      itemCount: 1,
      focus: sourceSection.title,
      requiredSourceBlockIds: [blockId],
      expectedTags: ["concept"],
      coverageRules: ["Use only the source text."],
    },
    sourceBlockIds: [blockId],
    tokenWeight: sourceSection.tokenWeight,
    targetItemCount: 1,
    sourceStartOffset: 0,
    sourceEndOffset: sourceText.length,
  };
  const plan: GenerationPlan = {
    id: `${id}-plan`,
    sourceId: source.id,
    outlineId: outline.id,
    title: source.title,
    sections: [section],
    metadata: {
      sectionCount: 1,
      sourceBlockCount: 1,
    },
  };

  return { source, outline, section, plan };
}

function createOutput(
  section: PlannedSection,
  explanation: string,
  keyPoint: string,
): SectionOutput {
  return {
    id: `output-${section.id}`,
    kind: section.schemaKind,
    plannedSectionId: section.id,
    title: section.title,
    sourceBlockIds: [...section.sourceBlockIds],
    sourceCore: {
      explanation,
      keyPoints: [keyPoint],
    },
    enrichment: null,
  } as SectionOutput;
}

function sourceListText(title: string, items: readonly string[]): string {
  return [`# ${title}`, ...items.map((item) => `- ${item}`)].join("\n");
}

function readSourceBlockIds(prompt: string): readonly string[] {
  return [
    ...new Set(
      [...prompt.matchAll(/\[Passage block ([^ |]+) \|/g)]
        .map((match) => match[1])
        .filter((entry): entry is string => entry !== undefined),
    ),
  ];
}

function schemaKindForName(
  schemaName: string,
): SectionOutput["kind"] {
  switch (schemaName) {
    case "ProcessStep":
      return "process-step";
    case "ExampleCard":
      return "example-card";
    case "ClaimCard":
      return "claim-card";
    default:
      return "concept-card";
  }
}

async function readDigitalComponentsFixture(): Promise<string> {
  const candidates = [
    join(process.cwd(), "scripts", "fixtures", "digital-components.txt"),
    join(
      process.cwd(),
      "packages",
      "engine",
      "scripts",
      "fixtures",
      "digital-components.txt",
    ),
  ];

  for (const candidate of candidates) {
    try {
      return await readFile(candidate, "utf8");
    } catch {
      continue;
    }
  }

  throw new Error("Unable to read Digital Components fixture.");
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
