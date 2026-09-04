import { readFile, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PipelineAssemblyError,
  classifyDocument,
  runPipeline,
  type DocumentParserMode,
  type ReviewerPipelineProgress,
  type StructuredDocument,
} from "@stay-focused/engine";
import dotenv from "dotenv";
import { PDFDocument } from "pdf-lib";

import { createOpenAIGenerationProvider } from "../../../packages/engine/src/providers/openai-provider";
import { inspectPdfTextPages } from "../src/lib/ocr/pdf-native-text";
import {
  createDocumentSignalsFromInspections,
  tryParseStructuredPdf,
} from "../src/lib/document-parsers/structured-parser-service";

type SourceSlug = "python-generators" | "central-tendency" | "accounting-ledgering";

interface SourceDefinition {
  readonly slug: SourceSlug;
  readonly title: string;
  readonly kind: "presentation" | "document";
  readonly relativePath: readonly string[];
}

const SOURCES: readonly SourceDefinition[] = [
  {
    slug: "python-generators",
    title: "Generators in Python",
    kind: "presentation",
    relativePath: ["Files", "5.0 - Generators in Python.pdf"],
  },
  {
    slug: "central-tendency",
    title: "Measures of Central Tendency",
    kind: "presentation",
    relativePath: [
      "Modules",
      "6. Descriptive Statistics",
      "Measures of Central Tendency2-1-1-1-1.pdf",
    ],
  },
  {
    slug: "accounting-ledgering",
    title: "Recording Methods and Ledgering",
    kind: "presentation",
    relativePath: ["Files", "3-Recording Methods and Ledgering.pdf"],
  },
];

async function main(): Promise<void> {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  dotenv.config({ path: join(repositoryRoot, ".env.local") });
  const phase = optionalArgument("--phase") ?? "all";
  if (!["extract", "generate", "all"].includes(phase)) {
    throw new Error("--phase must be extract, generate, or all.");
  }
  const sourceRoot = resolve(requiredArgument("--source-root"));
  const outputDirectory = resolve(repositoryRoot, requiredArgument("--output-dir"));
  await mkdir(outputDirectory, { recursive: true });

  if (phase === "extract" || phase === "all") {
    await extractSources(sourceRoot, outputDirectory);
  }
  if (phase === "generate" || phase === "all") {
    if (!process.env.OPENAI_API_KEY?.trim()) {
      throw new Error("OPENAI_API_KEY must be configured.");
    }
    await generateReviewers(outputDirectory);
  }
}

async function extractSources(sourceRoot: string, outputDirectory: string): Promise<void> {
  const summaries: Record<string, unknown>[] = [];
  for (const source of SOURCES) {
    const inputPath = join(sourceRoot, ...source.relativePath);
    const summary = await extractOne(source, inputPath, "hybrid", outputDirectory);
    summaries.push(summary);
    if (source.slug === "central-tendency") {
      summaries.push(await extractOne(source, inputPath, "docling", outputDirectory));
    }
  }
  await writeJson(join(outputDirectory, "extraction-readiness.json"), {
    generatedAt: new Date().toISOString(),
    mode: "hybrid-with-statistics-docling-comparison",
    sources: summaries,
  });
}

async function extractOne(
  source: SourceDefinition,
  inputPath: string,
  mode: DocumentParserMode,
  outputDirectory: string,
): Promise<Record<string, unknown>> {
  const bytes = new Uint8Array(await readFile(inputPath));
  const pageCount = (await PDFDocument.load(bytes)).getPageCount();
  const inspections = await inspectPdfTextPages(bytes, pageCount);
  const signals = createDocumentSignalsFromInspections(inspections);
  const startedAt = Date.now();
  const result = await tryParseStructuredPdf(
    {
      bytes,
      mimeType: "application/pdf",
      pageCount,
      fileName: basename(inputPath),
      sourceId: `${source.slug}-${mode}`,
      title: source.title,
      signals,
    },
    {
      mode,
      timeoutMs: 30 * 60 * 1_000,
      docling: {
        pythonPath: resolve(requiredArgument("--docling-python")),
        bridgePath: resolve(requiredArgument("--docling-bridge")),
      },
      mineru: {
        pythonPath: resolve(requiredArgument("--mineru-python")),
        bridgePath: resolve(requiredArgument("--mineru-bridge")),
      },
    },
  );
  const key = `${source.slug}-${mode}`;
  if (!result.document || !result.selectedParser) {
    return {
      key,
      source: inputPath,
      sourceType: "application/pdf",
      requestedMode: mode,
      classification: classifyDocument(signals),
      selectedParser: null,
      pageCount,
      inspections: countInspections(inspections),
      signals,
      attempts: result.attempts,
      durationMs: Date.now() - startedAt,
      result: "failed",
    };
  }

  const documentPath = join(outputDirectory, "structured", `${key}.json`);
  await mkdir(dirname(documentPath), { recursive: true });
  await writeJson(documentPath, result.document);
  return {
    key,
    source: inputPath,
    sourceType: "application/pdf",
    requestedMode: mode,
    classification: classifyDocument(signals),
    selectedParser: result.selectedParser,
    pageCount,
    inspections: countInspections(inspections),
    signals,
    attempts: result.attempts,
    durationMs: Date.now() - startedAt,
    structured: summarizeDocument(result.document),
    result: "passed",
  };
}

async function generateReviewers(outputDirectory: string): Promise<void> {
  const readiness = requireRecord(
    JSON.parse(await readFile(join(outputDirectory, "extraction-readiness.json"), "utf8")),
    "extraction readiness",
  );
  const summaries = requireArray(readiness.sources, "extraction sources")
    .map((value) => requireRecord(value, "extraction source"));
  const selected = [
    selectSummary(summaries, "python-generators-hybrid"),
    selectSummary(summaries, "central-tendency-hybrid"),
    selectSummary(summaries, "central-tendency-docling"),
    selectSummary(summaries, "accounting-ledgering-hybrid"),
  ];
  const caseSelector = optionalArgument("--case");
  const selectedCases = caseSelector
    ? selected.filter((summary) => summary.key === caseSelector)
    : selected;
  if (selectedCases.length === 0) throw new Error("--case did not match an extracted case.");
  const provider = createOpenAIGenerationProvider();
  const runs: Record<string, unknown>[] = [];
  for (const summary of selectedCases) {
    const key = readString(summary.key, "source key");
    const source = SOURCES.find((candidate) => key.startsWith(candidate.slug));
    if (!source) throw new Error(`Unknown source for ${key}.`);
    const document = JSON.parse(
      await readFile(join(outputDirectory, "structured", `${key}.json`), "utf8"),
    ) as StructuredDocument;
    console.info(`b12.generate.start ${key}`);
    const run = await runComparison(document, source, provider, key);
    runs.push(run);
    const reviewerText = typeof run.reviewerText === "string"
      ? run.reviewerText
      : renderWithheld(run);
    await writeFile(join(outputDirectory, `${key}-reviewer.txt`), reviewerText, "utf8");
    console.info(`b12.generate.done ${key}`);
  }
  await writeJson(join(outputDirectory, "results.json"), {
    generatedAt: new Date().toISOString(),
    contract: "B8-full-corpus-hybrid-structured-v1",
    runs,
  });
}

async function runComparison(
  document: StructuredDocument,
  source: SourceDefinition,
  provider: ReturnType<typeof createOpenAIGenerationProvider>,
  key: string,
): Promise<Record<string, unknown>> {
  let progress: ReviewerPipelineProgress | undefined;
  const startedAt = Date.now();
  try {
    const reviewer = await runPipeline({
      input: { structuredDocument: document, kind: source.kind, title: source.title },
      provider,
      onProgress: (next) => { progress = next; },
    });
    return {
      key,
      source: source.slug,
      parser: document.parser.name,
      plannedSections: progress?.plannedSectionCount ?? reviewer.sections.length,
      generatedSections: reviewer.sections.length,
      finalSections: reviewer.sections.length,
      coverage: reviewer.metadata.coverageScore,
      coverageStatus: reviewer.metadata.coverageStatus,
      grounding: reviewer.metadata.groundingScore,
      groundingStatus: reviewer.metadata.groundingStatus,
      groundingIssues: reviewer.metadata.grounding.issues.length,
      groundingIssueTypes: countValues(reviewer.metadata.grounding.issues.map((issue) => issue.type)),
      groundingIssueDiagnostics: reviewer.metadata.grounding.issues.map(compactGroundingIssue),
      fabricationCount: reviewer.metadata.grounding.phase1FabricationFails,
      omissionCount: reviewer.metadata.grounding.issues.filter((issue) => issue.type === "grounding-omission").length,
      manifestTotal: reviewer.metadata.coverage.sections.reduce((total, section) => total + (section.requiredEvidenceTargetCount ?? 0), 0),
      representedDeterministicTargets: reviewer.metadata.coverage.sections.reduce((total, section) => total + (section.representedRequiredEvidenceTargetCount ?? 0), 0),
      providerOwnedRequiredTargets: 0,
      providerCausedTargetLosses: 0,
      relationshipFailures: reviewer.metadata.grounding.issues.filter((issue) => !["grounding-fabrication", "grounding-omission"].includes(issue.type)).length,
      leakageStatus: reviewer.metadata.leakageStatus,
      retries: progress?.retryCount ?? 0,
      providerCalls: progress?.providerCallCount ?? 0,
      generationMetrics: reviewer.metadata.generationMetrics ?? null,
      assembly: "passed",
      structureDiagnostics: [],
      finalTitles: reviewer.sections.map((section) => section.title),
      reviewerText: renderReviewer(reviewer),
      reviewer,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    if (!(error instanceof PipelineAssemblyError)) throw error;
    const state = error.state;
    return {
      key,
      source: source.slug,
      parser: document.parser.name,
      plannedSections: state.plan.sections.length,
      generatedSections: state.outputs.length,
      finalSections: 0,
      coverage: state.coverage.score,
      coverageStatus: state.coverage.status,
      grounding: state.grounding.score,
      groundingStatus: state.grounding.status,
      groundingIssues: state.grounding.issues.length,
      groundingIssueTypes: countValues(state.grounding.issues.map((issue) => issue.type)),
      groundingIssueDiagnostics: state.grounding.issues.map(compactGroundingIssue),
      fabricationCount: state.grounding.phase1FabricationFails,
      omissionCount: state.grounding.issues.filter((issue) => issue.type === "grounding-omission").length,
      manifestTotal: state.plan.sections.reduce((total, section) => total + (section.requiredEvidence?.length ?? 0), 0),
      representedDeterministicTargets: state.coverage.sections.reduce((total, section) => total + (section.representedRequiredEvidenceTargetCount ?? 0), 0),
      providerOwnedRequiredTargets: 0,
      providerCausedTargetLosses: state.coverage.sections.reduce((total, section) => total + (section.missingRequiredEvidenceTargetIds?.length ?? 0), 0),
      relationshipFailures: state.grounding.issues.filter((issue) => !["grounding-fabrication", "grounding-omission"].includes(issue.type)).length,
      leakageStatus: state.leakage.status,
      retries: Object.values(state.retryAttemptsBySectionId).reduce((total, value) => total + value, 0),
      providerCalls: progress?.providerCallCount ?? 0,
      generationMetrics: state.generationMetrics ?? null,
      assembly: "failed",
      assemblyError: error.message,
      assemblyDiagnostics: error.diagnostics,
      structureDiagnostics: [...error.message.matchAll(/\[([A-Z_]+)\]/gu)].map((match) => match[1]),
      coverageSections: state.coverage.sections,
      groundingSections: state.grounding.sections,
      sectionValidationFailures: state.sectionValidationFailures,
      plannedTitles: state.plan.sections.map((section) => section.title),
      generatedTitles: state.outputs.map((section) => section.title),
      evidenceGroups: state.plan.sections.map((section) => ({
        title: section.title,
        groups: (section.evidenceGroups ?? []).map((group) => ({
          formulaBlocks: group.formulaBlockIds.length,
          tableBlocks: group.tableBlockIds.length,
          resultBlocks: group.resultBlockIds.length,
          tableCells: group.members.reduce((count, member) => count + (member.tableCells?.length ?? 0), 0),
        })),
      })),
      rejectedOutputs: state.outputs,
      durationMs: Date.now() - startedAt,
    };
  }
}

function summarizeDocument(document: StructuredDocument): Record<string, unknown> {
  const blocks = document.pages.flatMap((page) => page.blocks);
  const tables = blocks.filter((block) => block.type === "table");
  const cells = tables.flatMap((table) => table.rows.flatMap((row) => row.cells));
  return {
    parser: document.parser,
    pageCount: document.pageCount,
    blockCounts: countValues(blocks.map((block) => block.type)),
    tableCount: tables.length,
    tableCellCount: cells.length,
    blocksWithCoordinates: blocks.filter((block) => block.provenance.boundingBox).length,
    blocksWithParent: blocks.filter((block) => block.parentId).length,
    headingLevels: countValues(blocks.filter((block) => block.type === "heading").map((block) => String(block.level))),
    diagnostics: document.diagnostics,
  };
}

function countInspections(inspections: readonly { readonly kind: string }[]): Record<string, number> {
  return countValues(inspections.map((inspection) => inspection.kind));
}

function compactGroundingIssue(issue: {
  readonly type: string;
  readonly fieldPath?: string;
  readonly offendingText?: readonly string[];
  readonly message: string;
}): Record<string, unknown> {
  return {
    type: issue.type,
    fieldPath: issue.fieldPath ?? null,
    offendingText: issue.offendingText ?? [],
    message: issue.message,
  };
}

function countValues(values: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}

function renderReviewer(reviewer: { readonly sections: readonly { readonly title: string; readonly items: readonly { readonly title: string; readonly sourceCore: { readonly explanation: string; readonly keyPoints: readonly string[] } }[] }[] }): string {
  return `${reviewer.sections.flatMap((group) => group.items.map((section) => [
    section.title,
    section.sourceCore.explanation,
    ...section.sourceCore.keyPoints.map((point) => `- ${point}`),
  ].filter(Boolean).join("\n"))).join("\n\n")}\n`;
}

function renderWithheld(run: Record<string, unknown>): string {
  return `Reviewer withheld.\n\n${JSON.stringify({
    assemblyError: run.assemblyError,
    plannedTitles: run.plannedTitles,
    generatedTitles: run.generatedTitles,
    groundingIssueDiagnostics: run.groundingIssueDiagnostics,
    structureDiagnostics: run.structureDiagnostics,
  }, null, 2)}\n`;
}

function selectSummary(summaries: readonly Readonly<Record<string, unknown>>[], key: string): Readonly<Record<string, unknown>> {
  const result = summaries.find((summary) => summary.key === key && summary.result === "passed");
  if (!result) throw new Error(`Structured extraction ${key} did not pass.`);
  return result;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function requiredArgument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`Missing required argument ${name}.`);
  return value;
}

function optionalArgument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requireRecord(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} is invalid.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function requireArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} is invalid.`);
  return value;
}

function readString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is invalid.`);
  return value;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "B12 acceptance failed.");
  process.exitCode = 1;
});
