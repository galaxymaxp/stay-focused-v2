import { analyzeRecoveryEvidence, extractExplicitSequence } from "../src/recovery-evidence.js";
import { analyzeSectionSemanticStructure, serializeSemanticUnits } from "../src/semantic-structure.js";
import { normalizeSource } from "../src/stage0-normalize.js";
import { detectOutline } from "../src/stage1-outline.js";
import { buildGenerationPlan } from "../src/stage2-plan.js";
import { createExtractiveSectionFallback } from "../src/stage5-retry.js";
import { validateGrounding } from "../src/stage5a-grounding.js";
import { extractCleanSourceItems } from "../src/source-items.js";
import type { NormalizedSourceBlock, SectionOutput } from "../src/types.js";
import {
  assertDeepEqual,
  assertEqual,
  assertIncludes,
  isDirectExecution,
  printEvalSuiteResult,
  runEvalSuite,
  setFailureExitCode,
} from "./assert.js";
import type { EvalCase, EvalSuite } from "./types.js";

const noiseText = [
  "Generic Methods",
  "A method uses the same setting for both operations.",
  "23",
  "Course Name | Department Footer",
  "Orphan",
  "trailing",
].join("\n");
const mappingText = [
  "Storage Properties",
  "Property | Value",
  "Access | Restricted",
  "Storage | Local",
  "Backup | Weekly",
  "Backup | Weekly",
].join("\n");
const arrowText = "Signal Flow\nInput\n\u2193\nTransform\n\u2193\nOutput";
const ambiguousText = "Signal Labels\nInput\nOutput";

export const structuredEvidenceRecoverySuite: EvalSuite = {
  name: "Structured evidence recovery",
  cases: [
    evidenceCase("isolated slide number is rejected", noiseText, (analysis) =>
      assertEqual(analysis.candidates.find((item) => item.text === "23")?.kind, "noise", "Isolated number was treated as useful evidence.")),
    evidenceCase("footer text is rejected", noiseText, (analysis) =>
      assertEqual(analysis.candidates.find((item) => item.text.includes("Footer"))?.kind, "noise", "Footer text was treated as useful evidence.")),
    evidenceCase("dangling one-word fragment is strongly deprioritized", noiseText, (analysis) =>
      assertEqual((analysis.candidates.find((item) => item.text === "trailing")?.score ?? 0) < 0, true, "Dangling word was not deprioritized.")),
    evidenceCase("isolated capitalized fragment is not mistaken for a diagram label set", noiseText, (analysis) =>
      assertEqual((analysis.candidates.find((item) => item.text === "Orphan")?.score ?? 0) < 0, true, "An isolated capitalized fragment was retained as a label.")),
    fallbackCase("meaningful nearby sentence is selected", noiseText, async (output) => [
      ...assertEqual(output.sourceCore.explanation, "A method uses the same setting for both operations.", "Fallback selected noise instead of the complete statement."),
      ...assertEqual(visible(output).includes("23"), false, "Fallback exposed an isolated slide number."),
      ...assertEqual(visible(output).includes("Footer"), false, "Fallback exposed footer noise."),
    ]),
    semanticCase("two-column mappings remain separate", mappingText, "Storage Properties", async (plan) =>
      assertDeepEqual(serializeSemanticUnits(plan.units), ["Access | Restricted", "Storage | Local", "Backup | Weekly"], "Mappings were flattened or duplicated.")),
    fallbackCase("mapping row order survives fallback", mappingText, async (output) =>
      assertDeepEqual(output.sourceCore.keyPoints, ["Access | Restricted", "Storage | Local", "Backup | Weekly"], "Mapping rows lost order or boundaries.")),
    fallbackCase("mapping-only fallback does not force noisy prose", mappingText, async (output) =>
      assertEqual(output.sourceCore.explanation, "", "Mapping-only evidence was forced into an explanation.")),
    semanticCase(
      "flattened three-column table preserves row associations",
      [
        "Access Objectives",
        "Security Goal Objective Formula",
        "Confidentiality",
        "To limit reading to the intended recipient.",
        "Public Setting (Apply) + Private Setting (Remove)",
        "Authentication",
        "To verify the sender of a message.",
        "Private Setting (Apply) + Public Setting (Remove)",
      ].join("\n"),
      "Access Objectives",
      async (plan) => assertDeepEqual(
        serializeSemanticUnits(plan.units),
        [
          "Confidentiality: Objective: To limit reading to the intended recipient. Formula: Public Setting (Apply) + Private Setting (Remove)",
          "Authentication: Objective: To verify the sender of a message. Formula: Private Setting (Apply) + Public Setting (Remove)",
        ],
        "Flattened vertical table rows lost their labels or column associations.",
      ),
    ),
    semanticCase("numbered procedure remains ordered", "Sample Procedure\n1. Collect the sample.\n2. Record the code.\n3. Store the sample.", "Sample Procedure", async (plan) =>
      assertDeepEqual(serializeSemanticUnits(plan.units), ["1. Collect the sample.", "2. Record the code.", "3. Store the sample."], "Numbered sequence order changed.")),
    semanticCase("arrow-supported sequence is preserved", arrowText, "Signal Flow", async (plan) => [
      ...assertEqual(plan.units[0]?.kind, "sequence", "Explicit arrows did not create sequence evidence."),
      ...assertDeepEqual(serializeSemanticUnits(plan.units), ["Input \u2192 Transform \u2192 Output"], "Arrow sequence was flattened."),
    ]),
    simpleCase("missing relationship is not invented", () =>
      assertDeepEqual(extractExplicitSequence(ambiguousText, "Signal Labels"), [], "A sequence was invented without an arrow.")),
    fallbackCase("sparse diagram labels with explicit relation survive", arrowText, async (output) =>
      assertIncludes(output.sourceCore.keyPoints.join(" | "), "Input \u2192 Transform \u2192 Output", "Explicit diagram sequence was lost.")),
    simpleCase("plain sparse labels remain unrelated", () => {
      const plan = semanticPlan(ambiguousText, "Signal Labels");
      return assertEqual(plan.units.some((unit) => unit.kind === "sequence"), false, "Sparse labels gained an unsupported relation.");
    }),
    simpleCase("repeated page title truncates a fused continuation", () =>
      assertDeepEqual(
        extractCleanSourceItems({
          sourceSpanText: "Stored Values\n\u2022 The first supported value remains visible.\n\u2022 The final supported value remains visible.\nStored Values\nDiagram Label\nDepartment Footer",
          sectionTitle: "Stored Values",
        }).map((item) => item.text),
        [
          "The first supported value remains visible.",
          "The final supported value remains visible.",
        ],
        "A repeated page title left diagram/footer text fused to the final item.",
      )),
    semanticCase(
      "inconsistent navigation pipes are not semantic mappings",
      "Overview\nArea | Topic | History | Terms\nDetails | Examples",
      "Overview",
      async (plan) => assertEqual(
        plan.units.some((unit) => unit.kind === "mapping"),
        false,
        "Inconsistent navigation rows were misclassified as a mapping table.",
      ),
    ),
    {
      name: "cross-section navigation fallback stays sparse",
      run: async () => {
        const context = await createContext(
          "Overview\nArea | Topic | History | Terms\nDefinition of Terms | Plain Text",
          "Overview",
        );
        const section = context.plan.sections[0];
        if (!section) return [{ message: "Navigation fixture did not create a section." }];
        const output = createExtractiveSectionFallback({
          section,
          source: context.source,
          otherSectionTitles: ["Plain Text"],
        });
        return assertEqual(
          output,
          undefined,
          "Cross-section navigation was emitted as student study content instead of remaining weak.",
        );
      },
    },
    {
      name: "unsupported inferred arrow fails grounding",
      run: async () => {
        const context = await createContext(ambiguousText, "Signal Labels");
        const section = context.plan.sections[0];
        if (!section) return [{ message: "Fixture did not create a planned section." }];
        const output: SectionOutput = {
          id: "unsupported-arrow",
          kind: section.schemaKind,
          plannedSectionId: section.id,
          title: section.title,
          sourceBlockIds: [...section.sourceBlockIds],
          sourceCore: { explanation: "", keyPoints: ["Input \u2192 Output"] },
          enrichment: null,
        } as SectionOutput;
        const grounding = validateGrounding({ ...context, outputs: [output] });
        return [
          ...assertEqual(grounding.status, "failed", "Unsupported arrow passed grounding."),
          ...assertEqual(grounding.issues.some((issue) => issue.type === "grounding-unsupported-relationship"), true, "Unsupported relation issue was not emitted."),
        ];
      },
    },
    {
      name: "source-supported phrase matching another heading is not cross-concept fusion",
      run: async () => {
        const source = await normalizeSource({
          id: "supported-heading-phrase-source",
          title: "Fixture Presentation",
          kind: "presentation",
          createdAt: "2026-09-01T00:00:00.000Z",
          blocks: [
            {
              id: "records-page",
              kind: "unknown",
              pageNumber: 1,
              text: "Archive Records\nArchive records provide keys for review operations.",
            },
            {
              id: "review-page",
              kind: "unknown",
              pageNumber: 2,
              text: "Review Operations\nReview operations verify a stored record.",
            },
          ],
        });
        const outline = await detectOutline(source);
        const plan = buildGenerationPlan(outline, source);
        const section = plan.sections.find((candidate) => candidate.title === "Archive Records");
        if (!section) return [{ message: "Supported heading phrase fixture did not create its section." }];
        const output: SectionOutput = {
          id: "supported-heading-phrase-output",
          kind: section.schemaKind,
          plannedSectionId: section.id,
          title: section.title,
          sourceBlockIds: [...section.sourceBlockIds],
          sourceCore: {
            explanation: "Archive records provide keys for review operations.",
            keyPoints: [],
          },
          enrichment: null,
        } as SectionOutput;
        const grounding = validateGrounding({ source, outline, plan, outputs: [output] });
        return assertEqual(
          grounding.sections.find((candidate) => candidate.plannedSectionId === section.id)?.status,
          "passed",
          "An exact phrase in the current source was mistaken for a neighboring-section fusion.",
        );
      },
    },
    {
      name: "OCR supplement noise is not a required omission when native items exist",
      run: async () => {
        const source = await normalizeSource({
          id: "ocr-boundary-source",
          title: "Fixture Presentation",
          kind: "presentation",
          createdAt: "2026-09-01T00:00:00.000Z",
          blocks: [
            {
              id: "native-page",
              kind: "unknown",
              pageNumber: 1,
              text: "Stored Values\n\u2022 Alpha value.\n\u2022 Beta value.",
              metadata: { layoutStatus: "native_complete" },
            },
            {
              id: "ocr-page",
              kind: "unknown",
              pageNumber: 2,
              text: "Stored Values\n\u2022 Diagram Label 10010 Footer Noise",
              metadata: { layoutStatus: "ocr_supplemented" },
            },
          ],
        });
        const outline = await detectOutline(source);
        const plan = buildGenerationPlan(outline, source);
        const section = plan.sections[0];
        if (!section) return [{ message: "OCR boundary fixture did not create a section." }];
        const output: SectionOutput = {
          id: "ocr-boundary-output",
          kind: section.schemaKind,
          plannedSectionId: section.id,
          title: section.title,
          sourceBlockIds: [...section.sourceBlockIds],
          sourceCore: { explanation: "", keyPoints: ["Alpha value.", "Beta value."] },
          enrichment: null,
        } as SectionOutput;
        const grounding = validateGrounding({ source, outline, plan, outputs: [output] });
        return assertEqual(
          grounding.status,
          "passed",
          "OCR-only presentation noise became a required omission despite complete native items.",
        );
      },
    },
    {
      name: "OCR visual fallback keeps compact labels and rejects repeated footer fragments",
      run: async () => {
        const source = await normalizeSource({
          id: "ocr-visual-source",
          title: "Fixture Presentation",
          kind: "presentation",
          createdAt: "2026-09-01T00:00:00.000Z",
          blocks: [
            {
              id: "visual-page",
              kind: "unknown",
              pageNumber: 1,
              text: "Visual Summary\nInput\nDigest\nA complete supported statement.\nCollege of\nTechnology Department\nCENTER OF EXCELLENCE",
              metadata: { layoutStatus: "ocr_supplemented" },
            },
            {
              id: "appendix-page",
              kind: "unknown",
              pageNumber: 2,
              text: "Appendix\nCollege of\nTechnology Department\nCENTER OF EXCELLENCE",
              metadata: { layoutStatus: "ocr_supplemented" },
            },
          ],
        });
        const outline = await detectOutline(source);
        const plan = buildGenerationPlan(outline, source);
        const section = plan.sections.find((candidate) => candidate.title === "Visual Summary");
        if (!section) return [{ message: "OCR visual fixture did not create its section." }];
        const output = createExtractiveSectionFallback({
          section,
          source,
          otherSectionTitles: plan.sections.filter((candidate) => candidate.id !== section.id).map((candidate) => candidate.title),
          mode: "lines",
        });
        if (!output) return [{ message: "OCR visual fallback was not created." }];
        return [
          ...assertIncludes(visible(output), "Input", "A compact diagram label was lost."),
          ...assertIncludes(visible(output), "Digest", "A second compact diagram label was lost."),
          ...assertIncludes(visible(output), "A complete supported statement.", "The complete statement was lost."),
          ...assertEqual(visible(output).includes("College of"), false, "Repeated footer text survived recovery."),
          ...assertEqual(visible(output).includes("CENTER OF EXCELLENCE"), false, "Repeated institutional footer survived recovery."),
        ];
      },
    },
  ],
};

function evidenceCase(
  name: string,
  sourceText: string,
  verify: (analysis: ReturnType<typeof analyzeRecoveryEvidence>) => Awaited<ReturnType<EvalCase["run"]>>,
): EvalCase {
  return { name, run: async () => verify(analyzeRecoveryEvidence({ sourceText, sectionTitle: sourceText.split("\n")[0] ?? "" })) };
}

function simpleCase(name: string, run: () => Awaited<ReturnType<EvalCase["run"]>>): EvalCase {
  return { name, run: async () => run() };
}

function semanticCase(
  name: string,
  sourceText: string,
  title: string,
  verify: (plan: ReturnType<typeof semanticPlan>) => Awaited<ReturnType<EvalCase["run"]>> | ReturnType<EvalCase["run"]>,
): EvalCase {
  return { name, run: async () => verify(semanticPlan(sourceText, title)) };
}

function fallbackCase(
  name: string,
  sourceText: string,
  verify: (output: SectionOutput) => ReturnType<EvalCase["run"]>,
): EvalCase {
  return {
    name,
    run: async () => {
      const context = await createContext(sourceText, sourceText.split("\n")[0] ?? "Fixture");
      const section = context.plan.sections[0];
      if (!section) return [{ message: "Fixture did not create a planned section." }];
      const output = createExtractiveSectionFallback({ section, source: context.source });
      return output ? verify(output) : [{ message: "Fallback was not created." }];
    },
  };
}

function semanticPlan(sourceText: string, title: string) {
  const block: NormalizedSourceBlock = {
    id: "fixture-block",
    kind: sourceText.includes("|") ? "table" : "paragraph",
    text: sourceText,
    order: 0,
  };
  return analyzeSectionSemanticStructure({ title, tags: ["process"], sourceBlocks: [block] });
}

async function createContext(text: string, title: string) {
  const source = await normalizeSource({ title, kind: "plain-text", text, createdAt: "2026-09-01T00:00:00.000Z" });
  const outline = await detectOutline(source);
  const plan = buildGenerationPlan(outline, source);
  return { source, outline, plan };
}

function visible(output: SectionOutput): string {
  return [output.sourceCore.explanation, ...output.sourceCore.keyPoints].join(" ");
}

if (isDirectExecution(import.meta.url)) {
  const result = await runEvalSuite(structuredEvidenceRecoverySuite);
  printEvalSuiteResult(result);
  setFailureExitCode([result]);
}
