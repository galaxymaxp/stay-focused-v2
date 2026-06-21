import { validateLeakage } from "../src/leakage-guard.js";
import { extractStudentVisibleText } from "../src/student-visible-text.js";
import { validateGrounding } from "../src/stage5a-grounding.js";
import { assembleReviewer } from "../src/stage6-assemble.js";
import type {
  CoverageReport,
  GenerationPlan,
  NormalizedSource,
  PlannedSection,
  SectionOutput,
  SectionSchemaKind,
  SourceOutline,
} from "../src/types.js";
import {
  assertDeepEqual,
  assertEqual,
  isDirectExecution,
  printEvalSuiteResult,
  runEvalSuite,
  setFailureExitCode,
} from "./assert.js";
import type { EvalCase, EvalSuite } from "./types.js";

interface FaithfulnessContext {
  readonly source: NormalizedSource;
  readonly outline: SourceOutline;
  readonly plan: GenerationPlan;
  readonly section: PlannedSection;
  readonly sourceSentence: string;
}

export const studentVisibleFaithfulnessSuite: EvalSuite = {
  name: "Student-visible source faithfulness",
  cases: [
    createVisibleTextExtractionCase(),
    createUnsupportedMalwareEnrichmentCase(),
    createUnsupportedConsequenceEnrichmentCase(),
    createUnsupportedExampleEnrichmentCase(),
    createUnsupportedVisibleTitleCase(),
    createAssemblyExclusionCase(),
  ],
};

export async function runStudentVisibleFaithfulnessEvals(): Promise<boolean> {
  const result = await runEvalSuite(studentVisibleFaithfulnessSuite);
  printEvalSuiteResult(result);
  setFailureExitCode([result]);
  return result.status === "passed";
}

if (isDirectExecution(import.meta.url)) {
  await runStudentVisibleFaithfulnessEvals();
}

function createVisibleTextExtractionCase(): EvalCase {
  return {
    name: "visible-text extraction includes every default field and excludes enrichment",
    run: async () => {
      const context = createContext(
        "Types of Malware",
        "Types of Malware identifies Virus and Worm.",
      );
      const output = createOutput(context, {
        enrichment: {
          note: "Outside knowledge",
          points: ["A virus attaches itself to another program."],
        },
      });

      return assertDeepEqual(
        extractStudentVisibleText(output).map((entry) => entry.fieldPath),
        [
          "title",
          "sourceCore.explanation",
          "sourceCore.keyPoints[0]",
        ],
        "Default visible-text extraction did not match the assembly policy.",
      );
    },
  };
}

function createUnsupportedMalwareEnrichmentCase(): EvalCase {
  return createExcludedEnrichmentCase({
    name: "unsupported malware definitions are ignored when enrichment is excluded",
    title: "Types of Malware",
    sourceSentence: "Types of Malware identifies Virus and Worm.",
    enrichment: {
      note: "Supplemental malware definitions",
      points: [
        "A virus attaches itself to a host program and replicates when executed.",
      ],
    },
  });
}

function createUnsupportedConsequenceEnrichmentCase(): EvalCase {
  return createExcludedEnrichmentCase({
    name: "unsupported attack consequences are ignored when enrichment is excluded",
    title: "Security Attacks",
    sourceSentence: "Security Attacks include phishing and password attacks.",
    enrichment: {
      note: "Supplemental consequences",
      points: [
        "A successful attack can cause financial loss and reputational damage.",
      ],
    },
  });
}

function createUnsupportedExampleEnrichmentCase(): EvalCase {
  return createExcludedEnrichmentCase({
    name: "unsupported example scenarios are ignored when enrichment is excluded",
    title: "Blended Attacks",
    sourceSentence: "Blended Attacks combine multiple attack methods.",
    schemaKind: "example-card",
    enrichment: {
      note: "Supplemental scenario",
      points: [
        "A retailer receives phishing before attackers compromise its checkout server.",
      ],
    },
  });
}

function createUnsupportedVisibleTitleCase(): EvalCase {
  return {
    name: "unsupported default-visible title fails with a title diagnostic",
    run: async () => {
      const context = createContext(
        "Security Attacks",
        "Security Attacks include phishing and password attacks.",
      );
      const output = createOutput(context, {
        title: "Catastrophic Security Attacks",
      });
      const report = validateGrounding({
        outputs: [output],
        plan: context.plan,
        source: context.source,
        outline: context.outline,
      });
      const issue = report.sections[0]?.issues.find(
        (candidate) => candidate.fieldPath === "title",
      );

      return [
        ...assertEqual(
          report.status,
          "failed",
          "Unsupported visible title did not fail default grounding.",
        ),
        ...assertEqual(
          issue?.field,
          "title",
          "Unsupported visible title lacked a title-specific diagnostic.",
        ),
      ];
    },
  };
}

function createAssemblyExclusionCase(): EvalCase {
  return {
    name: "final reviewer assembly strips unsupported enrichment",
    run: async () => {
      const context = createContext(
        "Types of Malware",
        "Types of Malware identifies Virus and Worm.",
      );
      const output = createOutput(context, {
        enrichment: {
          note: "Supplemental malware definitions",
          points: ["A worm independently propagates across networks."],
        },
      });
      const grounding = validateGrounding({
        outputs: [output],
        plan: context.plan,
        source: context.source,
        outline: context.outline,
      });
      const reviewer = assembleReviewer({
        outputs: [output],
        plan: context.plan,
        source: context.source,
        coverage: createPassingCoverage(context),
        grounding,
        leakage: validateLeakage({
          outputs: [output],
          plan: context.plan,
        }),
      });

      return [
        ...assertEqual(
          grounding.status,
          "passed",
          "Excluded enrichment incorrectly failed default grounding.",
        ),
        ...assertEqual(
          reviewer.sections[0]?.items[0]?.enrichment,
          null,
          "Final assembled output retained unsupported enrichment.",
        ),
      ];
    },
  };
}

function createExcludedEnrichmentCase(args: {
  readonly name: string;
  readonly title: string;
  readonly sourceSentence: string;
  readonly schemaKind?: SectionSchemaKind;
  readonly enrichment: NonNullable<SectionOutput["enrichment"]>;
}): EvalCase {
  return {
    name: args.name,
    run: async () => {
      const context = createContext(
        args.title,
        args.sourceSentence,
        args.schemaKind,
      );
      const report = validateGrounding({
        outputs: [
          createOutput(context, {
            enrichment: args.enrichment,
          }),
        ],
        plan: context.plan,
        source: context.source,
        outline: context.outline,
      });

      return [
        ...assertEqual(
          report.status,
          "passed",
          "Source-external enrichment affected default visible grounding.",
        ),
        ...assertEqual(
          report.phase1FabricationFailures.some((failure) =>
            failure.fieldPath.startsWith("enrichment."),
          ),
          false,
          "Excluded enrichment was counted as grounded default content.",
        ),
      ];
    },
  };
}

function createContext(
  title: string,
  sourceSentence: string,
  schemaKind: SectionSchemaKind = "concept-card",
): FaithfulnessContext {
  const blockId = "faithfulness-source-block";
  const source: NormalizedSource = {
    id: "faithfulness-source",
    title,
    kind: "plain-text",
    language: "en",
    metadata: {},
    blocks: [
      {
        id: blockId,
        kind: "paragraph",
        text: sourceSentence,
        order: 0,
      },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  const outline: SourceOutline = {
    id: "faithfulness-outline",
    sourceId: source.id,
    title,
    sections: [
      {
        id: "faithfulness-source-section",
        title,
        order: 0,
        startOffset: 0,
        endOffset: sourceSentence.length,
        tokenWeight: sourceSentence.split(/\s+/).length,
        sourceBlockIds: [blockId],
        blockIds: [blockId],
        roughStartBlockId: blockId,
        roughEndBlockId: blockId,
        tags: [schemaKind === "example-card" ? "example" : "concept"],
        confidence: 1,
      },
    ],
  };
  const section: PlannedSection = {
    id: "faithfulness-planned-section",
    sourceSectionId: "faithfulness-source-section",
    title,
    order: 0,
    schemaKind,
    target: {
      objective: `Review ${title}.`,
      itemCount: 1,
      focus: title,
      requiredSourceBlockIds: [blockId],
      expectedTags: [schemaKind === "example-card" ? "example" : "concept"],
      coverageRules: ["Represent only the source section."],
    },
    sourceBlockIds: [blockId],
    tokenWeight: sourceSentence.split(/\s+/).length,
    targetItemCount: 1,
    sourceStartOffset: 0,
    sourceEndOffset: sourceSentence.length,
  };
  const plan: GenerationPlan = {
    id: "faithfulness-plan",
    sourceId: source.id,
    outlineId: outline.id,
    title,
    sections: [section],
    metadata: {
      sectionCount: 1,
      sourceBlockCount: 1,
    },
  };

  return { source, outline, plan, section, sourceSentence };
}

function createOutput(
  context: FaithfulnessContext,
  overrides: {
    readonly title?: string;
    readonly enrichment?: SectionOutput["enrichment"];
  } = {},
): SectionOutput {
  return {
    id: "faithfulness-output",
    kind: context.section.schemaKind,
    plannedSectionId: context.section.id,
    title: overrides.title ?? context.section.title,
    sourceBlockIds: [...context.section.sourceBlockIds],
    sourceCore: {
      explanation: context.sourceSentence,
      keyPoints: [context.sourceSentence],
    },
    enrichment: overrides.enrichment ?? null,
  } as SectionOutput;
}

function createPassingCoverage(
  context: FaithfulnessContext,
): CoverageReport {
  return {
    id: "faithfulness-coverage",
    planId: context.plan.id,
    sourceId: context.source.id,
    status: "passed",
    score: 1,
    coverageScore: 1,
    coverageBasis: "source-outline",
    sourceSectionsTotal: 1,
    sourceSectionsCovered: 1,
    sourceSections: [
      {
        sourceSectionId: context.section.sourceSectionId,
        title: context.section.title,
        status: "covered",
        plannedSectionIds: [context.section.id],
      },
    ],
    issues: [],
    sections: [
      {
        plannedSectionId: context.section.id,
        status: "passed",
        score: 1,
        issues: [],
        retryable: false,
      },
    ],
  };
}
