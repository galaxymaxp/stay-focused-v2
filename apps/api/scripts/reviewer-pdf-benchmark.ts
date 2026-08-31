import { readFile, writeFile } from "node:fs/promises";

import { loadEnvConfig } from "@next/env";
import {
  buildGenerationPlan,
  detectOutline,
  normalizeSource,
  PipelineAssemblyError,
  runPipeline,
  type GenerationProvider,
  type GenerationRequest,
  type ReviewerOutput,
} from "@stay-focused/engine";
import {
  normalizeDocumentTextWithEvidence,
  type DocumentExtractionDiagnostics,
  type OcrPage,
  type OcrWarning,
} from "@stay-focused/ocr";

import {
  extractPdfDocument,
  validatePdfOcrBytes,
} from "../src/lib/ocr/extraction-service";
import { createOpenAIGenerationProvider } from "../../../packages/engine/src/providers/openai-provider";

loadEnvConfig(process.cwd());

interface BenchmarkArguments {
  readonly pdfPath: string;
  readonly markdownPath: string;
  readonly jsonPath: string;
  readonly summaryPath: string;
  readonly title: string;
  readonly sourceId: string;
  readonly reuseSummaryPath?: string;
}

async function main(): Promise<void> {
  const args = parseArguments(process.argv.slice(2));
  const bytes = new Uint8Array(await readFile(args.pdfPath));
  const validation = await validatePdfOcrBytes({
    bytes,
    fileName: args.pdfPath.split(/[\\/]/).at(-1),
    mimeType: "application/pdf",
  });
  if (!validation.ok) throw new Error(`PDF validation failed: ${validation.code}`);

  const evidence = args.reuseSummaryPath
    ? await readCachedExtractionEvidence(args.reuseSummaryPath, validation.pageCount)
    : await extractFreshEvidence(validation.input, validation.pageCount);
  const normalized = normalizeDocumentTextWithEvidence(evidence.pages);
  const pageEvidenceByNumber = new Map(
    evidence.pages.map((page) => [page.pageNumber, page] as const),
  );
  const input = {
    id: args.sourceId,
    title: args.title,
    kind: "presentation" as const,
    language: "en",
    blocks: normalized.pages
      .filter((page) => page.text.length > 0)
      .map((page, order) => ({
        id: `page-${page.pageNumber}`,
        kind: "unknown" as const,
        order,
        pageNumber: page.pageNumber,
        text: page.text,
        metadata: {
          extractionMethod:
            pageEvidenceByNumber.get(page.pageNumber)?.method ?? "native_text",
          layoutStatus:
            pageEvidenceByNumber.get(page.pageNumber)?.layoutStatus ?? "native_complete",
        },
      })),
    metadata: {
      sourceName: args.pdfPath.split(/[\\/]/).at(-1),
      mimeType: "application/pdf",
      pageCount: validation.pageCount,
    },
  };
  const callMetadata: Array<Readonly<Record<string, unknown>> | undefined> = [];
  const provider = recordingProvider(createOpenAIGenerationProvider(), callMetadata);
  const generationStartedAt = Date.now();
  let reviewer: ReviewerOutput;
  try {
    reviewer = await runPipeline({ input, provider });
  } catch (error) {
    if (error instanceof PipelineAssemblyError) {
      await writeFile(args.summaryPath, `${JSON.stringify({
        pdfPath: args.pdfPath,
        extractionDurationMs: evidence.durationMs,
        extraction: evidence.diagnostics,
        extractionWarnings: evidence.warnings,
        pageEvidence: evidence.pages.map((page) => ({
          pageNumber: page.pageNumber,
          status: page.status,
          method: page.method,
          layoutStatus: page.layoutStatus,
          text: page.text,
        })),
        pipelineFailure: {
          message: error.message,
          plan: error.state.plan,
          outputs: error.state.outputs,
          coverage: error.state.coverage,
          grounding: error.state.grounding,
          leakage: error.state.leakage,
          validationFailures: error.state.sectionValidationFailures,
        },
      }, null, 2)}\n`, "utf8");
    }
    throw error;
  }
  const generationDurationMs = Date.now() - generationStartedAt;

  const source = await normalizeSource(input);
  const outline = await detectOutline(source);
  const plan = buildGenerationPlan(outline, source);
  const summary = {
    pdfPath: args.pdfPath,
    extractionDurationMs: evidence.durationMs,
    generationDurationMs,
    extraction: evidence.diagnostics,
    extractionProvider: evidence.provider,
    extractionWarnings: evidence.warnings,
    pageEvidence: evidence.pages.map((page) => ({
      pageNumber: page.pageNumber,
      status: page.status,
      method: page.method,
      layoutStatus: page.layoutStatus,
      text: page.text,
    })),
    normalization: normalized.diagnostics,
    sourceBlockCount: source.blocks.length,
    outlineSections: outline.sections.map((section) => ({
      title: section.title,
      sourceBlockIds: section.sourceBlockIds,
    })),
    semanticPlan: plan.sections.map((section) => ({
      title: section.title,
      schemaKind: section.schemaKind,
      semanticPlan: section.semanticPlan,
    })),
    generationCallCount: callMetadata.length,
    retryCallCount: callMetadata.filter((metadata) => metadata?.retryAttempt !== undefined).length,
    reviewerMetadata: reviewer.metadata,
  };

  await writeFile(args.markdownPath, renderMarkdown(reviewer), "utf8");
  await writeFile(args.jsonPath, `${JSON.stringify(reviewer, null, 2)}\n`, "utf8");
  await writeFile(args.summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    title: args.title,
    extractionDurationMs: evidence.durationMs,
    generationDurationMs,
    pageCount: validation.pageCount,
    nativeTextPageCount: evidence.diagnostics.nativeTextPageCount,
    ocrPageCount: evidence.diagnostics.ocrPageCount,
    sectionCount: reviewer.sections.length,
    coverageScore: reviewer.metadata.coverageScore,
    planIntegrityStatus: reviewer.metadata.coverage.planIntegrityStatus,
    planIntegrityScore: reviewer.metadata.coverage.planIntegrityScore,
    groundingScore: reviewer.metadata.groundingScore,
    generationCallCount: callMetadata.length,
  }, null, 2));
}

async function extractFreshEvidence(
  input: Parameters<typeof extractPdfDocument>[0]["input"],
  pageCount: number,
): Promise<BenchmarkExtractionEvidence> {
  const { createServerOcrProvider } = await import(
    "../src/lib/ocr/create-server-ocr-provider"
  );
  const startedAt = Date.now();
  const extraction = await extractPdfDocument({
    getProvider: createServerOcrProvider,
    input,
    pageCount,
  });
  const durationMs = Date.now() - startedAt;
  if (!extraction.ok) throw new Error(`PDF extraction failed: ${extraction.failure.code}`);
  return {
    durationMs,
    diagnostics: extraction.extraction,
    provider: extraction.result.provider,
    warnings: extraction.result.warnings,
    pages: extraction.result.pages,
  };
}

interface BenchmarkExtractionEvidence {
  readonly durationMs: number;
  readonly diagnostics: DocumentExtractionDiagnostics;
  readonly provider: string;
  readonly warnings: readonly OcrWarning[];
  readonly pages: readonly OcrPage[];
}

async function readCachedExtractionEvidence(
  summaryPath: string,
  expectedPageCount: number,
): Promise<BenchmarkExtractionEvidence> {
  const value = JSON.parse(await readFile(summaryPath, "utf8")) as {
    readonly extractionDurationMs: number;
    readonly extraction: DocumentExtractionDiagnostics;
    readonly extractionProvider: string;
    readonly extractionWarnings: readonly OcrWarning[];
    readonly pageEvidence: readonly Pick<
      OcrPage,
      "pageNumber" | "status" | "method" | "layoutStatus" | "text"
    >[];
  };
  if (value.extraction.expectedPageCount !== expectedPageCount) {
    throw new Error("Cached extraction evidence does not match the PDF page count.");
  }
  return {
    durationMs: value.extractionDurationMs,
    diagnostics: value.extraction,
    provider: value.extractionProvider,
    warnings: value.extractionWarnings,
    pages: value.pageEvidence.map((page) => ({
      ...page,
      blocks: page.text
        ? [{
            id: `page-${page.pageNumber}-cached`,
            order: 0,
            kind: "block" as const,
            text: page.text,
            lines: page.text.split("\n").map((text, order) => ({
              id: `page-${page.pageNumber}-cached-line-${order + 1}`,
              order,
              text,
            })),
          }]
        : [],
    })),
  };
}

function recordingProvider(
  delegate: GenerationProvider,
  calls: Array<Readonly<Record<string, unknown>> | undefined>,
): GenerationProvider {
  return {
    async generate<TOutput>(request: GenerationRequest<TOutput>): Promise<TOutput> {
      calls.push(request.metadata);
      return await delegate.generate(request);
    },
  };
}

function renderMarkdown(reviewer: ReviewerOutput): string {
  const lines = [`# ${reviewer.title}`, ""];
  for (const section of reviewer.sections) {
    lines.push(`## ${section.title}`, "");
    const item = section.items[0];
    if (!item) continue;
    if (item.sourceCore.explanation.trim()) {
      lines.push(item.sourceCore.explanation.trim(), "");
    }
    for (const point of item.sourceCore.keyPoints) lines.push(`- ${point}`);
    lines.push("");
  }
  return `${lines.join("\n").trim()}\n`;
}

function parseArguments(values: readonly string[]): BenchmarkArguments {
  if (![6, 7].includes(values.length) || values.some((value) => !value.trim())) {
    throw new Error("Usage: reviewer-pdf-benchmark <pdf> <markdown> <json> <summary> <title> <source-id> [reuse-summary]");
  }
  const [pdfPath, markdownPath, jsonPath, summaryPath, title, sourceId, reuseSummaryPath] = values;
  if (!pdfPath || !markdownPath || !jsonPath || !summaryPath || !title || !sourceId) {
    throw new Error("All benchmark arguments are required.");
  }
  return {
    pdfPath,
    markdownPath,
    jsonPath,
    summaryPath,
    title,
    sourceId,
    ...(reuseSummaryPath ? { reuseSummaryPath } : {}),
  };
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Benchmark failed.");
  process.exitCode = 1;
});
