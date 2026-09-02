import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

import {
  PipelineAssemblyError,
  runPipeline,
  type ReviewerPipelineProgress,
} from "../src/generate.js";
import { createOpenAIGenerationProvider } from "../src/providers/openai-provider.js";
import {
  createLegacyStructuredDocument,
  mapDoclingDocument,
  mapMinerUDocument,
  type LegacyDocumentPage,
} from "../src/structured-parser-adapters.js";
import {
  structuredDocumentText,
  type StructuredDocument,
} from "../src/structured-document.js";

type ParserInputName = "legacy" | "docling" | "mineru";

interface SourceDefinition {
  readonly slug: "python-generators" | "central-tendency";
  readonly title: string;
  readonly kind: "presentation" | "document";
  readonly legacyPath: readonly string[];
  readonly doclingPath: readonly string[];
  readonly mineruPath: readonly string[];
}

const SOURCES: readonly SourceDefinition[] = [
  {
    slug: "python-generators",
    title: "Generators in Python",
    kind: "presentation",
    legacyPath: ["comparison", "stay-focused", "python-generators", "current-extraction.json"],
    doclingPath: ["docling", "python-generators", "output.json"],
    mineruPath: ["mineru", "python-generators", "5.0 - Generators in Python", "auto", "5.0 - Generators in Python_content_list.json"],
  },
  {
    slug: "central-tendency",
    title: "Measures of Central Tendency",
    kind: "presentation",
    legacyPath: ["comparison", "stay-focused", "central-tendency", "current-extraction.json"],
    doclingPath: ["docling", "central-tendency", "output.json"],
    mineruPath: ["mineru", "central-tendency", "Measures of Central Tendency2-1-1-1-1", "auto", "Measures of Central Tendency2-1-1-1-1_content_list.json"],
  },
];

async function main(): Promise<void> {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const workspace = requiredArgument("--parser-workspace");
  const outputPath = resolve(repositoryRoot, requiredArgument("--output"));
  dotenv.config({ path: resolve(repositoryRoot, ".env.local") });
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error("OPENAI_API_KEY must be set in the environment.");
  }
  const provider = createOpenAIGenerationProvider();
  const sourceSelector = optionalArgument("--source");
  const parserSelector = optionalArgument("--parser") as ParserInputName | undefined;
  if (parserSelector && !["legacy", "docling", "mineru"].includes(parserSelector)) {
    throw new Error("--parser must be legacy, docling, or mineru.");
  }
  const selectedSources = sourceSelector
    ? SOURCES.filter((source) => source.slug === sourceSelector)
    : SOURCES;
  if (selectedSources.length === 0) throw new Error("--source is unknown.");
  const runs = [];
  for (const source of selectedSources) {
    const documents = await loadDocuments(resolve(workspace), source);
    const selectedParsers: readonly ParserInputName[] = parserSelector
      ? [parserSelector]
      : ["legacy", "docling", "mineru"];
    for (const parser of selectedParsers) {
      console.log(`b10.ab.start ${source.slug} ${parser}`);
      runs.push(await runComparison({
        document: documents[parser],
        kind: source.kind,
        parser,
        provider,
        slug: source.slug,
        title: source.title,
      }));
      console.log(`b10.ab.done ${source.slug} ${parser}`);
    }
  }
  const accounting = await inspectAccounting(resolve(workspace));
  const output = {
    generatedAt: new Date().toISOString(),
    contract: "structured-document-v1",
    commonStage0Input: "SourceNormalizationInput.structuredDocument",
    runs,
    accounting,
  };
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
}

async function loadDocuments(
  workspace: string,
  source: SourceDefinition,
): Promise<Record<ParserInputName, StructuredDocument>> {
  const [legacyNative, doclingNative, mineruNative] = await Promise.all([
    readJson(join(workspace, ...source.legacyPath)),
    readJson(join(workspace, ...source.doclingPath)),
    readJson(join(workspace, ...source.mineruPath)),
  ]);
  const legacyRecord = requireRecord(legacyNative, "legacy capture");
  const sourceBlocks = requireArray(
    legacyRecord.sourceBlocksAsSuppliedToReviewer,
    "legacy source blocks",
  );
  const pages: LegacyDocumentPage[] = sourceBlocks.map((value, index) => {
    const block = requireRecord(value, "legacy source block");
    return {
      pageNumber: readPositiveInteger(block.pageNumber) ?? index + 1,
      text: readString(block.text),
      method: "native_text",
    };
  });
  return {
    legacy: createLegacyStructuredDocument({ pages, sourceId: `${source.slug}-legacy`, title: source.title }),
    docling: mapDoclingDocument(doclingNative, { pageCount: pages.length, sourceId: `${source.slug}-docling`, title: source.title }),
    mineru: mapMinerUDocument(mineruNative, { pageCount: pages.length, sourceId: `${source.slug}-mineru`, title: source.title }),
  };
}

async function runComparison({
  document,
  kind,
  parser,
  provider,
  slug,
  title,
}: {
  readonly document: StructuredDocument;
  readonly kind: "presentation" | "document";
  readonly parser: ParserInputName;
  readonly provider: ReturnType<typeof createOpenAIGenerationProvider>;
  readonly slug: string;
  readonly title: string;
}): Promise<Record<string, unknown>> {
  let progress: ReviewerPipelineProgress | undefined;
  const startedAt = Date.now();
  const sourceText = structuredDocumentText(document);
  try {
    const reviewer = await runPipeline({
      input: { structuredDocument: document, kind, title },
      provider,
      onProgress: (next) => { progress = next; },
    });
    const serialized = JSON.stringify(reviewer);
    return {
      source: slug,
      parser,
      parserBlockCounts: countBlockTypes(document),
      plannedSections: progress?.plannedSectionCount ?? reviewer.metadata.sectionCount,
      finalSections: reviewer.sections.length,
      coverage: reviewer.metadata.coverageScore,
      coverageStatus: reviewer.metadata.coverageStatus,
      grounding: reviewer.metadata.groundingScore,
      groundingStatus: reviewer.metadata.groundingStatus,
      groundingIssues: reviewer.metadata.grounding.issues.length,
      groundingIssueTypes: countValues(reviewer.metadata.grounding.issues.map((issue) => issue.type)),
      groundingIssueDiagnostics: reviewer.metadata.grounding.issues.map(compactGroundingIssue),
      relationshipDiagnostics: countValues(
        reviewer.metadata.grounding.issues
          .filter((issue) => issue.type !== "grounding-fabrication" && issue.type !== "grounding-omission")
          .map((issue) => issue.type),
      ),
      phase1FabricationFails: reviewer.metadata.grounding.phase1FabricationFails,
      leakageStatus: reviewer.metadata.leakageStatus,
      leakageIssues: reviewer.metadata.leakage.issues.length,
      retries: progress?.retryCount ?? 0,
      providerCalls: progress?.providerCallCount ?? 0,
      assembly: "passed",
      studentVisibleResult: "assembled",
      finalTitles: reviewer.sections.map((section) => section.title),
      structureDiagnostics: [],
      unsupported67: /\b67\b/u.test(serialized) && !/\b67\b/u.test(sourceText),
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    if (!(error instanceof PipelineAssemblyError)) throw error;
    const state = error.state;
    const serialized = JSON.stringify(state.outputs);
    return {
      source: slug,
      parser,
      parserBlockCounts: countBlockTypes(document),
      plannedSections: state.plan.sections.length,
      finalSections: 0,
      generatedCandidates: state.outputs.length,
      coverage: state.coverage.score,
      coverageStatus: state.coverage.status,
      grounding: state.grounding.score,
      groundingStatus: state.grounding.status,
      groundingIssues: state.grounding.issues.length,
      groundingIssueTypes: countValues(state.grounding.issues.map((issue) => issue.type)),
      groundingIssueDiagnostics: state.grounding.issues.map(compactGroundingIssue),
      relationshipDiagnostics: countValues(
        state.grounding.issues
          .filter((issue) => issue.type !== "grounding-fabrication" && issue.type !== "grounding-omission")
          .map((issue) => issue.type),
      ),
      phase1FabricationFails: state.grounding.phase1FabricationFails,
      leakageStatus: state.leakage.status,
      leakageIssues: state.leakage.issues.length,
      retries: Object.values(state.retryAttemptsBySectionId).reduce((total, value) => total + value, 0),
      providerCalls: progress?.providerCallCount ?? 0,
      assembly: "failed",
      studentVisibleResult: "withheld",
      finalTitles: [],
      rejectedCandidateTitles: state.outputs.map((output) => output.title),
      plannedTitles: state.plan.sections.map((section) => section.title),
      evidenceGroups: state.plan.sections.map((section) => ({
        title: section.title,
        groups: (section.evidenceGroups ?? []).map((group) => ({
          formulaBlocks: group.formulaBlockIds.length,
          tableBlocks: group.tableBlockIds.length,
          resultBlocks: group.resultBlockIds.length,
          tableCells: group.members.reduce(
            (count, member) => count + (member.tableCells?.length ?? 0),
            0,
          ),
        })),
      })),
      assemblyError: error.message,
      structureDiagnostics: [...error.message.matchAll(/\[([A-Z_]+)\]/gu)].map((match) => match[1]),
      unsupported67: /\b67\b/u.test(serialized) && !/\b67\b/u.test(sourceText),
      durationMs: Date.now() - startedAt,
    };
  }
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

async function inspectAccounting(workspace: string): Promise<Record<string, unknown>> {
  const [doclingNative, mineruNative] = await Promise.all([
    readJson(join(workspace, "docling", "accounting-ledgering", "output.json")),
    readJson(join(workspace, "mineru", "accounting-ledgering", "3-Recording Methods and Ledgering", "auto", "3-Recording Methods and Ledgering_content_list.json")),
  ]);
  const documents = {
    docling: mapDoclingDocument(doclingNative, { pageCount: 11, sourceId: "accounting-docling", title: "Recording Methods and Ledgering" }),
    mineru: mapMinerUDocument(mineruNative, { pageCount: 11, sourceId: "accounting-mineru", title: "Recording Methods and Ledgering" }),
  };
  return Object.fromEntries(Object.entries(documents).map(([parser, document]) => {
    const tables = document.pages.flatMap((page) => page.blocks).filter((block) => block.type === "table");
    const cells = tables.flatMap((table) => table.rows.flatMap((row) => row.cells));
    return [parser, {
      structuredDocumentCreated: true,
      pageCount: document.pageCount,
      blockCounts: countBlockTypes(document),
      tableCount: tables.length,
      cellCount: cells.length,
      numericCellCount: cells.filter((cell) => /\d/u.test(cell.text)).length,
      numericCellsWithTableProvenance: cells.filter((cell) => /\d/u.test(cell.text) && cell.provenance.tableCell).length,
      ocrUsed: document.parser.ocrUsed ?? null,
      diagnostics: document.diagnostics,
    }];
  }));
}

function countBlockTypes(document: StructuredDocument): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const block of document.pages.flatMap((page) => page.blocks)) {
    counts[block.type] = (counts[block.type] ?? 0) + 1;
  }
  return counts;
}

function countValues(values: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
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

function readString(value: unknown): string {
  if (typeof value !== "string") throw new Error("Expected string value.");
  return value;
}

function readPositiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

await main();
