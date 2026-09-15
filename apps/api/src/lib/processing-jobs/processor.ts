import type {
Json,
ProcessingJobDatabaseRow,
ProcessingJobSourceRow,
} from "@stay-focused/db";
import {
PipelineAssemblyError,
PipelineCancellationError
} from "@stay-focused/engine";
import {
normalizeDocumentTextWithEvidence,
OCR_PDF_MIME_TYPE,
} from "@stay-focused/ocr";
import { ExperienceFailure } from '../experience/errors';
import { processQuizJob } from '../quiz/service';
import { processAIReviewerJob } from './ai-reviewer';

import { readDocumentParserConfig } from "@/lib/document-parsers/config";
import {
createDocumentSignalsFromInspections,
createStructuredExtractionPayload,
tryParseStructuredPdf,
} from "@/lib/document-parsers/structured-parser-service";
import { createServerOcrProvider } from "@/lib/ocr/create-server-ocr-provider";
import {
DocumentExtractionCancellationError,
extractPdfDocument,
extractWithOcrProvider,
type OcrExtractionResult,
} from "@/lib/ocr/extraction-service";
import { inspectPdfTextPages } from "@/lib/ocr/pdf-native-text";
import { getConfiguredDurableDocumentMaxOcrPages } from "@/lib/ocr/upload-policy";

import {
EXTRACTION_JOB_DEADLINE_MS,
JOB_WORKER_HEARTBEAT_INTERVAL_MS,
OCR_PROVIDER_CALL_TIMEOUT_MS,
} from "./constants";
import {
findProcessingJobSource,
type ProcessingJobServiceClient,
} from "./repository";
import {
completeProcessingJob,
failProcessingJob,
heartbeatProcessingJob,
readProcessingJobState,
updateProcessingJobProgress,
WorkerRepositoryError,
} from "./worker-repository";

import { processActivityJob } from "../activity-maker/service";

export interface ProcessClaimedJobResult {
  readonly jobId: string;
  readonly status: "succeeded" | "failed" | "queued" | "cancelled";
  readonly errorCode?: string;
}

export async function processClaimedJob({
  client,
  job,
  workerId,
}: {
  readonly client: ProcessingJobServiceClient;
  readonly job: ProcessingJobDatabaseRow;
  readonly workerId: string;
}): Promise<ProcessClaimedJobResult> {
  const heartbeat = startHeartbeat(client, job.id, workerId);
  const startedAt = Date.now();

  try {
    const source = await findProcessingJobSource(client, job);
    await assertJobMayContinue(client, job.id, workerId, heartbeat);

    const output = job.job_type === "quiz_generation"
      ? await processQuizJob(client, job, workerId)
      : job.job_type === "activity_generation"
      ? await processActivityJob(client, job, workerId)
      : job.job_type === "document_extraction"
      ? await processExtractionJob({ client, heartbeat, job, source, workerId })
      : await processReviewerJob({ client, heartbeat, job, source, workerId });
    await assertJobMayContinue(client, job.id, workerId, heartbeat);

    const result = await completeProcessingJob(client, {
      jobId: job.id,
      workerId,
      resultType: job.job_type,
      payload: toJson(output.payload),
      metrics: toJson({
        ...output.metrics,
        queueWaitMs: Math.max(0, Date.parse(job.started_at ?? job.updated_at) - Date.parse(job.accepted_at)),
        workerExecutionMs: Date.now() - startedAt,
      }),
    });
    safeWorkerLog("processing_job.succeeded", {
      jobId: job.id,
      jobType: job.job_type,
      attemptCount: job.attempt_count,
      durationMs: Date.now() - startedAt,
    });
    return { jobId: job.id, status: result.status === "succeeded" ? "succeeded" : "failed" };
  } catch (caught) {
    const failure = mapWorkerFailure(caught);
    try {
      const result = await failProcessingJob(client, {
        jobId: job.id,
        workerId,
        errorCode: failure.code,
        safeErrorMessage: failure.safeMessage,
        retryable: failure.retryable,
        automaticRetryable: failure.automaticRetryable,
      });
      const status =
        result.status === "queued" ? "queued" :
          result.status === "cancelled" ? "cancelled" : "failed";
      safeWorkerLog("processing_job.stopped", {
        jobId: job.id,
        jobType: job.job_type,
        attemptCount: job.attempt_count,
        durationMs: Date.now() - startedAt,
        errorCode: failure.code,
        terminalStatus: status,
      });
      return { jobId: job.id, status, errorCode: failure.code };
    } catch (finalizationError) {
      safeWorkerLog("processing_job.finalization_failed", {
        jobId: job.id,
        jobType: job.job_type,
        attemptCount: job.attempt_count,
        errorCode:
          finalizationError instanceof WorkerRepositoryError
            ? finalizationError.code
            : "processing_job_finalization_failed",
      });
      return {
        jobId: job.id,
        status: "failed",
        errorCode: failure.code,
      };
    }
  } finally {
    heartbeat.stop();
  }
}

async function processExtractionJob({
  client,
  heartbeat,
  job,
  source,
  workerId,
}: ProcessorContext): Promise<{ readonly payload: unknown; readonly metrics: Record<string, unknown> }> {
  if (!source.storage_bucket || !source.storage_object_path) {
    throw new WorkerJobError(
      "processing_job_source_missing",
      "The staged source is unavailable.",
      false,
    );
  }

  const download = await client.storage
    .from(source.storage_bucket)
    .download(source.storage_object_path);
  if (download.error || !download.data) {
    throw new WorkerJobError(
      "processing_job_source_download_failed",
      "The staged source could not be read.",
      true,
    );
  }
  const bytes = new Uint8Array(await download.data.arrayBuffer());
  const extractionStartedAt = Date.now();
  let extraction: OcrExtractionResult;

  if (source.source_kind === "pdf") {
    const pageCount = source.page_count ?? 0;
    if (pageCount < 1) {
      throw new WorkerJobError("invalid_pdf", "The staged PDF is invalid.", false);
    }
    const parserConfig = readDocumentParserConfig();
    if (parserConfig.mode !== "legacy") {
      await updateProcessingJobProgress(client, {
        jobId: job.id,
        workerId,
        stage: "inspecting_document",
        statusMessage: "Inspecting document",
        completedUnits: 0,
        totalUnits: pageCount,
        unitLabel: "pages",
      });
      let inspections;
      try {
        inspections = await inspectPdfTextPages(bytes, pageCount);
      } catch {
        inspections = Array.from({ length: pageCount }, (_, index) => ({
          pageNumber: index + 1,
          kind: "ocr" as const,
          text: "" as const,
        }));
      }
      const structured = await tryParseStructuredPdf({
        bytes,
        mimeType: OCR_PDF_MIME_TYPE,
        pageCount,
        fileName: source.display_name,
        sourceId: job.id,
        title: source.display_name,
        signals: createDocumentSignalsFromInspections(inspections),
      }, parserConfig);
      if (structured.document) {
        const payload = createStructuredExtractionPayload(structured.document, source.mime_type);
        return {
          payload,
          metrics: {
            pageCount,
            processedPageCount: structured.document.pages.length,
            blankPageCount: structured.document.pages.filter((page) => page.blocks.length === 0).length,
            failedPageCount: 0,
            ocrChunkCount: 0,
            rawSourceCharacters: String(payload.rawText ?? "").length,
            normalizedSourceCharacters: String(payload.text ?? "").length,
            removedBoilerplateLines: 0,
            parser: structured.selectedParser,
            parserDurationMs: structured.durationMs,
            extractionDurationMs: Date.now() - extractionStartedAt,
          },
        };
      }
      safeWorkerLog("processing_job.structured_parser_fallback", {
        jobId: job.id,
        parserMode: parserConfig.mode,
        attempts: structured.attempts
          .map((attempt) => `${attempt.parser}:${attempt.outcome}`)
          .join(","),
        durationMs: structured.durationMs,
      });
    }
    extraction = await extractPdfDocument({
      getProvider: createServerOcrProvider,
      input: {
        kind: "pdf",
        mimeType: OCR_PDF_MIME_TYPE,
        bytes,
        requestedPages: Array.from({ length: pageCount }, (_, index) => index + 1),
        fileName: source.display_name,
      },
      pageCount,
      options: {
        documentTimeoutMs: EXTRACTION_JOB_DEADLINE_MS - 60_000,
        maxOcrPages: getConfiguredDurableDocumentMaxOcrPages(),
        providerRequestTimeoutMs: OCR_PROVIDER_CALL_TIMEOUT_MS,
        shouldCancel: async () =>
          !(await jobMayContinue(client, job.id, workerId, heartbeat)),
        onProgress: async (progress) => {
          await updateProcessingJobProgress(client, {
            jobId: job.id,
            workerId,
            stage: progress.stage,
            statusMessage: extractionStatusMessage(progress.stage),
            ...(progress.completedPages !== undefined
              ? { completedUnits: progress.completedPages }
              : {}),
            ...(progress.totalPages !== undefined
              ? { totalUnits: progress.totalPages }
              : {}),
            ...(progress.totalPages !== undefined ? { unitLabel: "pages" } : {}),
            metrics: toJson({
              ...(progress.ocrChunkCount !== undefined
                ? { ocrChunkCount: progress.ocrChunkCount }
                : {}),
            }),
          });
        },
      },
    });
  } else if (source.source_kind === "image") {
    await updateProcessingJobProgress(client, {
      jobId: job.id,
      workerId,
      stage: "extracting_ocr",
      statusMessage: "Reading image",
      completedUnits: 0,
      totalUnits: 1,
      unitLabel: "pages",
    });
    extraction = await withTimeout(
      extractWithOcrProvider(createServerOcrProvider(), {
        kind: "image",
        mimeType: source.mime_type as "image/png" | "image/jpeg",
        bytes,
        fileName: source.display_name,
      }),
      OCR_PROVIDER_CALL_TIMEOUT_MS,
      "ocr_provider_timeout",
    );
    await assertJobMayContinue(client, job.id, workerId, heartbeat);
  } else {
    throw new WorkerJobError(
      "processing_job_source_invalid",
      "The staged source type is invalid.",
      false,
    );
  }

  if (!extraction.ok) {
    throw mapExtractionFailure(extraction.failure.code);
  }

  await updateProcessingJobProgress(client, {
    jobId: job.id,
    workerId,
    stage: "assembling_text",
    statusMessage: "Finishing extracted text",
    completedUnits: extraction.extraction.processedPageCount,
    totalUnits: extraction.extraction.expectedPageCount,
    unitLabel: "pages",
  });
  const normalized = normalizeDocumentTextWithEvidence(extraction.result.pages);
  if (!normalized.text.trim()) {
    throw new WorkerJobError(
      "no_text_detected",
      "No readable text was detected in the source.",
      false,
    );
  }

  await updateProcessingJobProgress(client, {
    jobId: job.id,
    workerId,
    stage: "storing_result",
    statusMessage: "Storing extracted text",
    completedUnits: extraction.extraction.expectedPageCount,
    totalUnits: extraction.extraction.expectedPageCount,
    unitLabel: "pages",
  });

  const metrics = {
    pageCount: extraction.extraction.expectedPageCount,
    processedPageCount: extraction.extraction.processedPageCount,
    blankPageCount: extraction.extraction.blankPageCount,
    failedPageCount: extraction.extraction.failedPageCount,
    ocrChunkCount: extraction.extraction.ocrChunkCount ?? 0,
    rawSourceCharacters: normalized.diagnostics.rawCharacterCount,
    normalizedSourceCharacters: normalized.diagnostics.normalizedCharacterCount,
    removedBoilerplateLines: normalized.diagnostics.removedLineCount,
    extractionDurationMs: Date.now() - extractionStartedAt,
  };
  const pageEvidenceByNumber = new Map(
    extraction.result.pages.map((page) => [page.pageNumber, page] as const),
  );
  return {
    payload: {
      text: normalized.text,
      sourceBlocks: normalized.pages
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
      rawText: extraction.result.pages
        .map((page) => page.text)
        .join("\n\n"),
      rawPages: extraction.result.pages,
      mimeType: extraction.result.mimeType,
      pageCount: extraction.extraction.expectedPageCount,
      processedPageCount: extraction.extraction.processedPageCount,
      extraction: extraction.extraction,
      provider: extraction.result.provider,
      warnings: extraction.result.warnings,
      normalization: normalized.diagnostics,
    },
    metrics,
  };
}

async function processReviewerJob({
  client,
  job,
  workerId,
}: ProcessorContext): Promise<{ readonly payload: unknown; readonly metrics: Record<string, unknown> }> {
  return processAIReviewerJob(client, job, workerId);
}

interface ProcessorContext {
  readonly client: ProcessingJobServiceClient;
  readonly heartbeat: HeartbeatHandle;
  readonly job: ProcessingJobDatabaseRow;
  readonly source: ProcessingJobSourceRow;
  readonly workerId: string;
}

interface HeartbeatHandle {
  readonly leaseLost: () => boolean;
  readonly stop: () => void;
}

function startHeartbeat(
  client: ProcessingJobServiceClient,
  jobId: string,
  workerId: string,
): HeartbeatHandle {
  let leaseLost = false;
  let inFlight = false;
  const timer = setInterval(() => {
    if (inFlight || leaseLost) return;
    inFlight = true;
    void heartbeatProcessingJob(client, jobId, workerId)
      .catch(() => {
        leaseLost = true;
      })
      .finally(() => {
        inFlight = false;
      });
  }, JOB_WORKER_HEARTBEAT_INTERVAL_MS);
  timer.unref?.();
  return {
    leaseLost: () => leaseLost,
    stop: () => clearInterval(timer),
  };
}

async function assertJobMayContinue(
  client: ProcessingJobServiceClient,
  jobId: string,
  workerId: string,
  heartbeat: HeartbeatHandle,
): Promise<void> {
  if (!(await jobMayContinue(client, jobId, workerId, heartbeat))) {
    const state = await readProcessingJobState(client, jobId);
    if (state.status === "cancellation_requested" || state.status === "cancelled") {
      throw new PipelineCancellationError();
    }
    throw new WorkerJobError(
      "processing_job_lease_lost",
      "Processing was interrupted and will be recovered.",
      true,
    );
  }
}

async function jobMayContinue(
  client: ProcessingJobServiceClient,
  jobId: string,
  workerId: string,
  heartbeat: HeartbeatHandle,
): Promise<boolean> {
  if (heartbeat.leaseLost()) return false;
  const state = await readProcessingJobState(client, jobId);
  return state.status === "running" && state.lease_owner === workerId;
}

function extractionStatusMessage(stage: string): string {
  switch (stage) {
    case "inspecting_document": return "Inspecting document";
    case "extracting_native_text": return "Reading embedded text";
    case "preparing_ocr_chunks": return "Preparing pages";
    case "extracting_ocr": return "Reading pages";
    case "verifying_pages": return "Checking extraction";
    default: return "Finishing extracted text";
  }
}

function mapExtractionFailure(code: string): WorkerJobError {
  const retryable =
    code === "ocr_provider_failed" ||
    code === "document_extraction_timeout" ||
    code === "internal_error" ||
    code === "document_extraction_incomplete";
  const safeMessage = code === "document_extraction_incomplete"
    ? "Not every page could be read. Retry the extraction."
    : code === "pdf_ocr_page_limit_exceeded"
      ? "This PDF has too many pages that require OCR. Use a text-enabled PDF or split the document."
    : code === "document_extraction_timeout"
      ? "Document extraction exceeded its worker deadline."
      : "Document extraction could not be completed.";
  return new WorkerJobError(code, safeMessage, retryable);
}

export function mapWorkerFailure(error: unknown): WorkerJobError {
  if (
    error instanceof PipelineCancellationError ||
    error instanceof DocumentExtractionCancellationError
  ) {
    return new WorkerJobError(
      "processing_job_cancelled",
      "Processing was cancelled.",
      false,
    );
  }
  if (error instanceof WorkerJobError) return error;
  if (error instanceof ExperienceFailure) {
    return new WorkerJobError(error.code, 'Generation could not be completed.', error.status >= 500);
  }
  if (error instanceof PipelineAssemblyError) {
    return new WorkerJobError(
      "reviewer_validation_failed",
      "Reviewer generation could not pass source validation.",
      false,
    );
  }
  if (error instanceof WorkerRepositoryError) {
    if (isDatabaseContractError(error.databaseCode)) {
      return new WorkerJobError(
        "processing_result_storage_configuration_error",
        "Processing could not store its result. Retry after the service is updated.",
        true,
        false,
      );
    }
    return new WorkerJobError(
      error.code,
      "Processing was interrupted and will be recovered.",
      true,
    );
  }
  if (isProviderRateLimitError(error)) {
    return new WorkerJobError(
      "provider_rate_limited",
      "The processing provider is temporarily rate limited.",
      true,
    );
  }
  return new WorkerJobError(
    "processing_provider_failed",
    "A processing provider was temporarily unavailable.",
    true,
  );
}

function isProviderRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\b(?:429|rate[ -]?limit|too many requests)\b/i.test(message);
}

function isDatabaseContractError(code: string | undefined): boolean {
  return (
    code === "42883" ||
    code === "42P01" ||
    code === "42703" ||
    code === "3F000" ||
    code === "PGRST202"
  );
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorCode: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new WorkerJobError(errorCode, "The OCR provider timed out.", true)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function safeWorkerLog(
  event: string,
  fields: Readonly<Record<string, string | number>>,
): void {
  console.info(event, fields);
}

export class WorkerJobError extends Error {
  public readonly code: string;
  public readonly safeMessage: string;
  public readonly retryable: boolean;
  public readonly automaticRetryable: boolean;

  public constructor(
    code: string,
    safeMessage: string,
    retryable: boolean,
    automaticRetryable = retryable,
  ) {
    super(code);
    this.name = "WorkerJobError";
    this.code = code;
    this.safeMessage = safeMessage;
    this.retryable = retryable;
    this.automaticRetryable = automaticRetryable;
  }
}
