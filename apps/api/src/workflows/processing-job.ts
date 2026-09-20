import type {
Json,
ProcessingJobDatabaseRow,
ProcessingJobSourceRow,
} from "@stay-focused/db";
import {
type StructuredDocument
} from "@stay-focused/engine";
import {
normalizeDocumentTextWithEvidence,
verifyDocumentExtraction,
type DocumentExtractionDiagnostics,
type OcrPage,
type OcrWarning,
} from "@stay-focused/ocr";
import { FatalError,getWorkflowMetadata } from "workflow";

import { readDocumentParserConfig } from "@/lib/document-parsers/config";
import {
createDocumentSignalsFromInspections,
createStructuredExtractionPayload,
tryParseStructuredPdf,
} from "@/lib/document-parsers/structured-parser-service";
import { createServerOcrProvider } from "@/lib/ocr/create-server-ocr-provider";
import {
createInspectedPdfPages,
extractPreparedPdfOcrChunk,
extractWithOcrProvider,
validatePdfOcrBytes,
} from "@/lib/ocr/extraction-service";
import {
inspectPdfTextPages,
type PdfPageInspection,
} from "@/lib/ocr/pdf-native-text";
import {
getConfiguredDurableDocumentMaxOcrPages,
getConfiguredDurableDocumentMaxPdfPages,
OCR_PROVIDER_MAX_PDF_PAGES_PER_REQUEST,
} from "@/lib/ocr/upload-policy";
import {
OCR_PROVIDER_CALL_TIMEOUT_MS,
} from "@/lib/processing-jobs/constants";
import {
resolveExtractionProgressStage,
} from "@/lib/processing-jobs/extraction-progress";
import {
createProcessingJobServiceClient,
findProcessingJobSource,
type ProcessingJobServiceClient,
} from "@/lib/processing-jobs/repository";
import {
completeProcessingJob,
failProcessingJob,
heartbeatProcessingJob,
readProcessingJobState,
updateProcessingJobProgress,
} from "@/lib/processing-jobs/worker-repository";
import {
attachProcessingJobWorkflow,
claimProcessingJobForWorkflow,
listProcessingJobCheckpoints,
readProcessingJobCheckpoint,
WORKFLOW_JOB_LEASE_SECONDS,
writeProcessingJobCheckpoint,
} from "@/lib/processing-jobs/workflow-repository";

const EXTRACTION_PLAN_CHECKPOINT = "extraction.plan";
const EXTRACTION_STRUCTURED_CHECKPOINT = "extraction.structured";
const EXTRACTION_IMAGE_CHECKPOINT = "extraction.image";
const EXTRACTION_INSPECTION_PREFIX = "extraction.inspection.";
const EXTRACTION_CHUNK_PREFIX = "extraction.chunk.";
const WORKFLOW_STEP_HEARTBEAT_INTERVAL_MS = 60_000;
const WORKFLOW_OCR_CHUNK_CONCURRENCY = 2;

type WorkflowOutcome =
  | { readonly status: "succeeded"; readonly jobId: string }
  | { readonly status: "skipped"; readonly jobId: string }
  | { readonly status: "failed"; readonly jobId: string };

interface ClaimedWorkflowJob {
  readonly claimed: boolean;
  readonly jobType?: "document_extraction" | "reviewer_generation" | "activity_generation" | "quiz_generation";
}

interface ExtractionWorkflowPlan {
  readonly kind: "image" | "pdf" | "structured";
  readonly chunks: readonly {
    readonly index: number;
    readonly pageNumbers: readonly number[];
  }[];
}

interface StoredExtractionPlan {
  readonly kind: "pdf";
  readonly pageCount: number;
  readonly pages: readonly OcrPage[];
  readonly warnings: readonly OcrWarning[];
  readonly chunks: ExtractionWorkflowPlan["chunks"];
  readonly nativeTextPageCount: number;
  readonly ocrPageCount: number;
  readonly preparedAt: string;
}

export async function processingJobWorkflow(
  jobId: string,
): Promise<WorkflowOutcome> {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  const workerId = `vercel-workflow:${workflowRunId}`;

  try {
    const claimed = await claimWorkflowJobStep(
      jobId,
      workerId,
      workflowRunId,
    );
    if (!claimed.claimed || !claimed.jobType) {
      return { status: "skipped", jobId };
    }

    if (claimed.jobType === "quiz_generation") {
      await processQuizStep(jobId, workerId);
    } else if (claimed.jobType === "activity_generation") {
      await processActivityStep(jobId, workerId);
    } else if (claimed.jobType === "document_extraction") {
      const plan = await prepareExtractionStep(jobId, workerId);
      if (plan.kind === "image") {
        await extractImageStep(jobId, workerId);
      } else if (plan.kind === "pdf") {
        for (
          let offset = 0;
          offset < plan.chunks.length;
          offset += WORKFLOW_OCR_CHUNK_CONCURRENCY
        ) {
          await Promise.all(
            plan.chunks
              .slice(offset, offset + WORKFLOW_OCR_CHUNK_CONCURRENCY)
              .map((chunk) =>
                extractPdfChunkStep(jobId, workerId, chunk.index, chunk.pageNumbers)
              ),
          );
        }
      }
      await finalizeExtractionStep(jobId, workerId);
    } else {
      const deferredCanvasPageCount = await prepareCanvasReviewerExtractionStep(jobId, workerId);
      if (deferredCanvasPageCount !== null) {
        const pageNumbers = Array.from(
          { length: deferredCanvasPageCount },
          (_, index) => index + 1,
        );
        for (
          let offset = 0;
          offset < pageNumbers.length;
          offset += WORKFLOW_OCR_CHUNK_CONCURRENCY
        ) {
          await Promise.all(
            pageNumbers
              .slice(offset, offset + WORKFLOW_OCR_CHUNK_CONCURRENCY)
              .map((pageNumber) =>
                inspectPdfPageStep(jobId, workerId, pageNumber, deferredCanvasPageCount)
              ),
          );
        }
        const plan = await prepareExtractionStep(jobId, workerId, true);
        if (plan.kind !== "pdf") throw new FatalError("processing_job_source_invalid");
        for (
          let offset = 0;
          offset < plan.chunks.length;
          offset += WORKFLOW_OCR_CHUNK_CONCURRENCY
        ) {
          await Promise.all(
            plan.chunks
              .slice(offset, offset + WORKFLOW_OCR_CHUNK_CONCURRENCY)
              .map((chunk) =>
                extractPdfChunkStep(jobId, workerId, chunk.index, chunk.pageNumbers, true)
              ),
          );
        }
        await finalizeCanvasReviewerExtractionStep(jobId, workerId);
      }
      await processAIReviewerStep(jobId, workerId);
    }

    return { status: "succeeded", jobId };
  } catch {
    await finalizeWorkflowFailureStep(jobId, workerId);
    return { status: "failed", jobId };
  }
}

async function prepareCanvasReviewerExtractionStep(jobId: string, workerId: string): Promise<number | null> {
  "use step";
  safeStepLog("prepare_canvas_reviewer_extraction", "start", jobId);
  const client = createProcessingJobServiceClient();
  const job = await readProcessingJobState(client, jobId);
  const { isDeferredCanvasReviewerJob } = await import(
    "@/lib/processing-jobs/deferred-canvas-reviewer"
  );
  if (!await isDeferredCanvasReviewerJob({ client, job })) return null;
  const pageCount = await withWorkflowLease(client, jobId, workerId, async () => {
    await assertWorkflowJobMayContinue(client, jobId, workerId);
    const source = await findProcessingJobSource(client, job);
    if (source.source_kind !== "pdf") throw new FatalError("processing_job_source_invalid");
    if (source.page_count) return source.page_count;
    const bytes = await downloadSourceBytes(client, source);
    const validation = await validatePdfOcrBytes({
      bytes,
      documentMaxPages: getConfiguredDurableDocumentMaxPdfPages(),
      fileName: source.display_name,
      mimeType: source.mime_type,
    });
    if (!validation.ok) {
      await failKnownWorkflowJob(client, jobId, workerId, {
        code: validation.code,
        message: "The Canvas PDF could not be validated for complete extraction.",
        retryable: false,
      });
      throw new FatalError(validation.code);
    }
    const { error } = await client
      .from("processing_job_sources")
      .update({ page_count: validation.pageCount })
      .eq("id", source.id)
      .eq("user_id", job.user_id);
    if (error) throw new Error("processing_job_source_page_count_update_failed");
    return validation.pageCount;
  });
  safeStepLog("prepare_canvas_reviewer_extraction", "done", jobId);
  return pageCount;
}

async function inspectPdfPageStep(
  jobId: string,
  workerId: string,
  pageNumber: number,
  pageCount: number,
): Promise<void> {
  "use step";
  const checkpointKey = `${EXTRACTION_INSPECTION_PREFIX}${padIndex(pageNumber)}`;
  safeStepLog(`inspect_page_${pageNumber}`, "start", jobId);
  const client = createProcessingJobServiceClient();
  await withWorkflowLease(client, jobId, workerId, async () => {
    if (await readProcessingJobCheckpoint(client, jobId, checkpointKey)) return;
    await assertWorkflowJobMayContinue(client, jobId, workerId);
    const job = await readProcessingJobState(client, jobId);
    const source = await findProcessingJobSource(client, job);
    if (source.source_kind !== "pdf") throw new FatalError("processing_job_source_invalid");
    const bytes = await downloadSourceBytes(client, source);
    let inspection;
    try {
      inspection = (await inspectPdfTextPages(bytes, pageCount, [pageNumber]))[0];
    } catch (error) {
      console.warn("processing_workflow.page_inspection_unavailable", {
        jobId,
        pageNumber,
        errorName: error instanceof Error ? error.name : typeof error,
        errorCode: readSafeErrorCode(error),
      });
    }
    await writeProcessingJobCheckpoint(client, {
      jobId,
      checkpointKey,
      payload: toJson({
        inspection: inspection ?? { pageNumber, kind: "ocr", text: "" },
        completedAt: new Date().toISOString(),
      }),
    });
    logWorkflowMemory("inspect_page", jobId, { pageNumber });
  });
  safeStepLog(`inspect_page_${pageNumber}`, "done", jobId);
}

async function processQuizStep(jobId: string, workerId: string): Promise<void> {
  "use step";
  const { processQuizJob } = await import("@/lib/quiz/service");
  const client = createProcessingJobServiceClient();
  const existing = await readProcessingJobState(client, jobId);
  if (existing.status === "succeeded") return;
  await withWorkflowLease(client, jobId, workerId, async () => {
    await assertWorkflowJobMayContinue(client, jobId, workerId);
    const { ExperienceFailure } = await import("@/lib/experience/errors");
    const output = await processQuizJob(client, existing, workerId).catch(async (error: unknown) => {
      if (error instanceof ExperienceFailure && error.status < 500) {
        await failProcessingJob(client, { jobId, workerId, errorCode: error.code, safeErrorMessage: "Quiz questions could not pass source validation.", retryable: false, automaticRetryable: false });
        throw new FatalError(error.code);
      }
      throw error;
    });
    await assertWorkflowJobMayContinue(client, jobId, workerId);
    console.info("quiz_generation.persistence", { jobId, outcome: "start" });
    try {
      await completeProcessingJob(client, { jobId, workerId, resultType: "quiz_generation", payload: JSON.parse(JSON.stringify(output.payload)) as Json, metrics: {} });
      console.info("quiz_generation.persistence", { jobId, outcome: "succeeded" });
    } catch (error) {
      console.info("quiz_generation.persistence", { jobId, outcome: "failed", errorCode: readSafeErrorCode(error) ?? "quiz_persistence_failed" });
      throw error;
    }
  });
}

async function processActivityStep(jobId: string, workerId: string): Promise<void> {
  "use step";
  const { processActivityJob } = await import("@/lib/activity-maker/service");
  const client = createProcessingJobServiceClient();
  const existing = await readProcessingJobState(client, jobId);
  if (existing.status === "succeeded") return;
  await withWorkflowLease(client, jobId, workerId, async () => {
    await assertWorkflowJobMayContinue(client, jobId, workerId);
    const { ExperienceFailure } = await import("@/lib/experience/errors");
    const output = await processActivityJob(client, existing, workerId).catch(async (error: unknown) => {
      if (error instanceof ExperienceFailure && error.status < 500) {
        await failProcessingJob(client, { jobId, workerId, errorCode: error.code, safeErrorMessage: "Activity generation could not be completed.", retryable: false, automaticRetryable: false });
        throw new FatalError(error.code);
      }
      throw error;
    });
    await assertWorkflowJobMayContinue(client, jobId, workerId);
    await completeProcessingJob(client, { jobId, workerId, resultType: "activity_generation", payload: JSON.parse(JSON.stringify(output.payload)) as Json, metrics: {} });
  });
}

async function claimWorkflowJobStep(
  jobId: string,
  workerId: string,
  workflowRunId: string,
): Promise<ClaimedWorkflowJob> {
  "use step";
  safeStepLog("claim", "start", jobId);
  const client = createProcessingJobServiceClient();
  await attachProcessingJobWorkflow(client, jobId, workflowRunId);
  const job = await claimProcessingJobForWorkflow(client, jobId, workerId);
  safeStepLog("claim", job ? "done" : "skipped", jobId);
  return job
    ? { claimed: true, jobType: job.job_type }
    : { claimed: false };
}

async function prepareExtractionStep(
  jobId: string,
  workerId: string,
  reviewerExtraction = false,
): Promise<ExtractionWorkflowPlan> {
  "use step";
  safeStepLog("prepare_extraction", "start", jobId);
  const client = createProcessingJobServiceClient();
  return await withWorkflowLease(client, jobId, workerId, async () => {
    await assertWorkflowJobMayContinue(client, jobId, workerId);
    const existing = await readProcessingJobCheckpoint(
      client,
      jobId,
      EXTRACTION_PLAN_CHECKPOINT,
    );
    if (existing) {
      const stored = readStoredExtractionPlan(existing.payload);
      safeStepLog("prepare_extraction", "checkpoint", jobId);
      return { kind: "pdf", chunks: stored.chunks };
    }
    if (await readProcessingJobCheckpoint(client, jobId, EXTRACTION_STRUCTURED_CHECKPOINT)) {
      safeStepLog("prepare_extraction", "checkpoint", jobId);
      return { kind: "structured", chunks: [] };
    }

    const job = await readProcessingJobState(client, jobId);
    const source = await findProcessingJobSource(client, job);
    if (source.source_kind === "image") {
      await updateProcessingJobProgress(client, {
        jobId,
        workerId,
        stage: resolveExtractionProgressStage("preparing_ocr_chunks", reviewerExtraction),
        statusMessage: "Preparing image",
        completedUnits: 0,
        totalUnits: 1,
        unitLabel: "pages",
      });
      safeStepLog("prepare_extraction", "done", jobId);
      return { kind: "image", chunks: [] };
    }
    if (source.source_kind !== "pdf" || !source.page_count) {
      throw new FatalError("processing_job_source_invalid");
    }

    await updateProcessingJobProgress(client, {
      jobId,
      workerId,
      stage: resolveExtractionProgressStage("inspecting_document", reviewerExtraction),
      statusMessage: "Inspecting document",
      completedUnits: 0,
      totalUnits: source.page_count,
      unitLabel: "pages",
    });
    let inspections;
    const warnings: OcrWarning[] = [];
    let bytes: Uint8Array | undefined;
    if (reviewerExtraction) {
      const inspectionRows = await listProcessingJobCheckpoints(
        client,
        jobId,
        EXTRACTION_INSPECTION_PREFIX,
      );
      inspections = inspectionRows
        .map((row) => readPdfPageInspection(requireRecord(row.payload, "PDF inspection").inspection))
        .sort((left, right) => left.pageNumber - right.pageNumber);
      if (
        inspections.length !== source.page_count ||
        inspections.some((page, index) => page.pageNumber !== index + 1)
      ) {
        await failKnownWorkflowJob(client, jobId, workerId, {
          code: "document_extraction_incomplete",
          message: extractionFailureMessage("document_extraction_incomplete"),
          retryable: true,
        });
        throw new FatalError("document_extraction_incomplete");
      }
    } else {
      bytes = await downloadSourceBytes(client, source);
      try {
        inspections = await inspectPdfTextPages(bytes, source.page_count);
      } catch (error) {
        console.warn("processing_workflow.native_text_inspection_unavailable", {
          jobId,
          errorName: error instanceof Error ? error.name : typeof error,
          errorCode: readSafeErrorCode(error),
        });
        inspections = Array.from({ length: source.page_count }, (_, index) => ({
          pageNumber: index + 1,
          kind: "ocr" as const,
          text: "" as const,
        }));
        warnings.push({
          code: "native_text_unavailable",
          message: "Embedded PDF text could not be inspected; affected pages used OCR.",
        });
      }
    }
    const pages = createInspectedPdfPages(inspections);
    const ocrPageNumbers = inspections
      .filter((page) => page.kind === "ocr")
      .map((page) => page.pageNumber);
    const parserConfig = readDocumentParserConfig();
    if (!reviewerExtraction && bytes && parserConfig.mode !== "legacy") {
      const structured = await tryParseStructuredPdf({
        bytes,
        mimeType: source.mime_type,
        pageCount: source.page_count,
        fileName: source.display_name,
        sourceId: jobId,
        title: source.display_name,
        signals: createDocumentSignalsFromInspections(inspections),
      }, parserConfig);
      if (structured.document) {
        await writeProcessingJobCheckpoint(client, {
          jobId,
          checkpointKey: EXTRACTION_STRUCTURED_CHECKPOINT,
          payload: toJson({
            document: structured.document,
            selectedParser: structured.selectedParser,
            attempts: structured.attempts,
            durationMs: structured.durationMs,
            completedAt: new Date().toISOString(),
          }),
        });
        safeStepLog("prepare_extraction", "done", jobId);
        return { kind: "structured", chunks: [] };
      }
      console.info("processing_workflow.structured_parser_fallback", {
        jobId,
        parserMode: parserConfig.mode,
        attempts: structured.attempts.map((attempt) => ({
          parser: attempt.parser,
          outcome: attempt.outcome,
          diagnosticCodes: attempt.diagnostics.map((diagnostic) => diagnostic.code),
        })),
        durationMs: structured.durationMs,
      });
    }
    const maxOcrPages = getConfiguredDurableDocumentMaxOcrPages();
    if (ocrPageNumbers.length > maxOcrPages) {
      await failKnownWorkflowJob(client, jobId, workerId, {
        code: "pdf_ocr_page_limit_exceeded",
        message:
          "This PDF has too many pages that require OCR. Use a text-enabled PDF or split the document.",
        retryable: false,
      });
      throw new FatalError("pdf_ocr_page_limit_exceeded");
    }
    const chunks = chunkPageNumbers(ocrPageNumbers).map((pageNumbers, index) => ({
      index,
      pageNumbers,
    }));
    const payload: StoredExtractionPlan = {
      kind: "pdf",
      pageCount: source.page_count,
      pages,
      warnings,
      chunks,
      nativeTextPageCount: inspections.filter(
        (page) => page.kind === "native_text",
      ).length,
      ocrPageCount: ocrPageNumbers.length,
      preparedAt: new Date().toISOString(),
    };
    await writeProcessingJobCheckpoint(client, {
      jobId,
      checkpointKey: EXTRACTION_PLAN_CHECKPOINT,
      payload: toJson(payload),
    });
    await updateProcessingJobProgress(client, {
      jobId,
      workerId,
      stage: resolveExtractionProgressStage(
        chunks.length > 0 ? "preparing_ocr_chunks" : "verifying_pages",
        reviewerExtraction,
      ),
      statusMessage: chunks.length > 0 ? "Preparing page groups" : "Checking extraction",
      completedUnits: pages.length,
      totalUnits: source.page_count,
      unitLabel: "pages",
      metrics: toJson({ ocrChunkCount: chunks.length }),
    });
    safeStepLog("prepare_extraction", "done", jobId);
    return { kind: "pdf", chunks };
  });
}

async function extractImageStep(jobId: string, workerId: string): Promise<void> {
  "use step";
  safeStepLog("extract_image", "start", jobId);
  const client = createProcessingJobServiceClient();
  await withWorkflowLease(client, jobId, workerId, async () => {
    if (
      await readProcessingJobCheckpoint(client, jobId, EXTRACTION_IMAGE_CHECKPOINT)
    ) {
      safeStepLog("extract_image", "checkpoint", jobId);
      return;
    }
    await assertWorkflowJobMayContinue(client, jobId, workerId);
    const job = await readProcessingJobState(client, jobId);
    const source = await findProcessingJobSource(client, job);
    const bytes = await downloadSourceBytes(client, source);
    await updateProcessingJobProgress(client, {
      jobId,
      workerId,
      stage: "extracting_ocr",
      statusMessage: "Reading image",
      completedUnits: 0,
      totalUnits: 1,
      unitLabel: "pages",
    });
    const extraction = await extractWithOcrProvider(createServerOcrProvider(), {
      bytes,
      kind: "image",
      mimeType: source.mime_type as "image/png" | "image/jpeg",
      fileName: source.display_name,
    });
    if (!extraction.ok) {
      await failKnownWorkflowJob(client, jobId, workerId, {
        code: extraction.failure.code,
        message: extractionFailureMessage(extraction.failure.code),
        retryable: isRetryableExtractionFailure(extraction.failure.code),
      });
      throw new FatalError(extraction.failure.code);
    }
    await writeProcessingJobCheckpoint(client, {
      jobId,
      checkpointKey: EXTRACTION_IMAGE_CHECKPOINT,
      payload: toJson({
        result: extraction.result,
        extraction: extraction.extraction,
        extractedAt: new Date().toISOString(),
      }),
    });
    await updateProcessingJobProgress(client, {
      jobId,
      workerId,
      stage: "verifying_pages",
      statusMessage: "Checking extraction",
      completedUnits: 1,
      totalUnits: 1,
      unitLabel: "pages",
    });
  });
  safeStepLog("extract_image", "done", jobId);
}

async function extractPdfChunkStep(
  jobId: string,
  workerId: string,
  chunkIndex: number,
  pageNumbers: readonly number[],
  reviewerExtraction = false,
): Promise<void> {
  "use step";
  const checkpointKey = `${EXTRACTION_CHUNK_PREFIX}${padIndex(chunkIndex)}`;
  safeStepLog(`extract_chunk_${chunkIndex}`, "start", jobId);
  const client = createProcessingJobServiceClient();
  await withWorkflowLease(client, jobId, workerId, async () => {
    if (await readProcessingJobCheckpoint(client, jobId, checkpointKey)) {
      safeStepLog(`extract_chunk_${chunkIndex}`, "checkpoint", jobId);
      return;
    }
    await assertWorkflowJobMayContinue(client, jobId, workerId);
    const job = await readProcessingJobState(client, jobId);
    const source = await findProcessingJobSource(client, job);
    const bytes = await downloadSourceBytes(client, source);
    const result = await extractPreparedPdfOcrChunk({
      bytes,
      fileName: source.display_name,
      getProvider: createServerOcrProvider,
      originalPageNumbers: pageNumbers,
      timeoutMs: OCR_PROVIDER_CALL_TIMEOUT_MS,
    });
    await assertWorkflowJobMayContinue(client, jobId, workerId);
    await writeProcessingJobCheckpoint(client, {
      jobId,
      checkpointKey,
      payload: toJson({
        chunkIndex,
        pageNumbers,
        pages: result.pages,
        warnings: result.warnings,
        providerId: result.providerId,
        completedAt: new Date().toISOString(),
      }),
    });
    logWorkflowMemory("extract_chunk", jobId, {
      chunkIndex,
      pageCount: pageNumbers.length,
    });
    const [planRow, chunks] = await Promise.all([
      readProcessingJobCheckpoint(client, jobId, EXTRACTION_PLAN_CHECKPOINT),
      listProcessingJobCheckpoints(client, jobId, EXTRACTION_CHUNK_PREFIX),
    ]);
    const plan = readStoredExtractionPlan(planRow?.payload);
    const completedOcrPages = chunks.reduce(
      (total, checkpoint) =>
        total + readArray(checkpoint.payload, "pageNumbers").length,
      0,
    );
    await updateProcessingJobProgress(client, {
      jobId,
      workerId,
      stage: resolveExtractionProgressStage("extracting_ocr", reviewerExtraction),
      statusMessage: "Reading pages",
      completedUnits: Math.min(
        plan.pages.length + completedOcrPages,
        plan.pageCount,
      ),
      totalUnits: plan.pageCount,
      unitLabel: "pages",
      metrics: toJson({ ocrChunkCount: plan.chunks.length }),
    });
  });
  safeStepLog(`extract_chunk_${chunkIndex}`, "done", jobId);
}

async function finalizeExtractionStep(
  jobId: string,
  workerId: string,
): Promise<void> {
  "use step";
  safeStepLog("finalize_extraction", "start", jobId);
  const client = createProcessingJobServiceClient();
  await withWorkflowLease(client, jobId, workerId, async () => {
    await assertWorkflowJobMayContinue(client, jobId, workerId);
    const job = await readProcessingJobState(client, jobId);
    const source = await findProcessingJobSource(client, job);
    const startedAt = Date.parse(job.started_at ?? job.updated_at);
    let pages: readonly OcrPage[];
    let warnings: readonly OcrWarning[];
    let provider: string;
    let diagnostics: DocumentExtractionDiagnostics;

    const structuredCheckpoint = source.source_kind === "pdf"
      ? await readProcessingJobCheckpoint(client, jobId, EXTRACTION_STRUCTURED_CHECKPOINT)
      : null;
    if (structuredCheckpoint) {
      const stored = requireRecord(structuredCheckpoint.payload, "structured extraction checkpoint");
      const document = requireRecord(stored.document, "structured document") as unknown as StructuredDocument;
      const payload = createStructuredExtractionPayload(document, source.mime_type);
      const durationMs = typeof stored.durationMs === "number" ? stored.durationMs : 0;
      const metrics = {
        pageCount: document.pageCount,
        processedPageCount: document.pages.length,
        blankPageCount: document.pages.filter((page) => page.blocks.length === 0).length,
        failedPageCount: 0,
        ocrChunkCount: 0,
        rawSourceCharacters: String(payload.rawText ?? "").length,
        normalizedSourceCharacters: String(payload.text ?? "").length,
        removedBoilerplateLines: 0,
        parser: document.parser.name,
        parserDurationMs: durationMs,
        extractionDurationMs: Math.max(0, Date.now() - startedAt),
        queueWaitMs: queueWaitMs(job),
        workerExecutionMs: Math.max(0, Date.now() - startedAt),
      };
      await completeProcessingJob(client, {
        jobId,
        workerId,
        resultType: "document_extraction",
        payload: toJson(payload),
        metrics: toJson(metrics),
      });
      return;
    }

    if (source.source_kind === "image") {
      const checkpoint = await readProcessingJobCheckpoint(
        client,
        jobId,
        EXTRACTION_IMAGE_CHECKPOINT,
      );
      const payload = requireRecord(checkpoint?.payload, "image extraction checkpoint");
      const result = requireRecord(payload.result, "image extraction result");
      pages = readOcrPages(result.pages);
      warnings = readOcrWarnings(result.warnings);
      provider = readString(result, "provider");
      diagnostics = payload.extraction as unknown as DocumentExtractionDiagnostics;
    } else {
      const [planRow, chunkRows] = await Promise.all([
        readProcessingJobCheckpoint(client, jobId, EXTRACTION_PLAN_CHECKPOINT),
        listProcessingJobCheckpoints(client, jobId, EXTRACTION_CHUNK_PREFIX),
      ]);
      const plan = readStoredExtractionPlan(planRow?.payload);
      const chunkPages = chunkRows.flatMap((row) =>
        readOcrPages(requireRecord(row.payload, "OCR chunk").pages)
      );
      const chunkWarnings = chunkRows.flatMap((row) =>
        readOcrWarnings(requireRecord(row.payload, "OCR chunk").warnings)
      );
      pages = [...plan.pages, ...chunkPages];
      warnings = [...plan.warnings, ...chunkWarnings];
      const verification = verifyDocumentExtraction({
        expectedPageCount: plan.pageCount,
        pages,
      });
      diagnostics = {
        ...verification.diagnostics,
        extractionMode:
          plan.nativeTextPageCount > 0 && plan.ocrPageCount > 0
            ? "mixed"
            : plan.nativeTextPageCount > 0
              ? "native_text"
              : "ocr",
        nativeTextPageCount: plan.nativeTextPageCount,
        ocrPageCount: plan.ocrPageCount,
        ocrChunkCount: plan.chunks.length,
        ocrChunks: plan.chunks.map((chunk) => ({
          originalPageNumbers: chunk.pageNumbers,
        })),
      };
      provider = readChunkProvider(chunkRows) ??
        (plan.nativeTextPageCount > 0 ? "pdfjs-native-text" : "unknown");
      if (plan.nativeTextPageCount > 0 && plan.ocrPageCount > 0) {
        provider = `pdfjs-native-text+${provider}`;
      }
      if (!verification.sourceEligible) {
        const code = verification.status === "incomplete"
          ? "document_extraction_incomplete"
          : "document_unreadable";
        await failKnownWorkflowJob(client, jobId, workerId, {
          code,
          message: extractionFailureMessage(code),
          retryable: code === "document_extraction_incomplete",
        });
        throw new FatalError(code);
      }
      pages = verification.pages;
    }

    await updateProcessingJobProgress(client, {
      jobId,
      workerId,
      stage: "assembling_text",
      statusMessage: "Finishing extracted text",
      completedUnits: diagnostics.processedPageCount,
      totalUnits: diagnostics.expectedPageCount,
      unitLabel: "pages",
    });
    const normalized = normalizeDocumentTextWithEvidence(pages);
    if (!normalized.text.trim()) {
      await failKnownWorkflowJob(client, jobId, workerId, {
        code: "no_text_detected",
        message: "No readable text was detected in the source.",
        retryable: false,
      });
      throw new FatalError("no_text_detected");
    }
    await updateProcessingJobProgress(client, {
      jobId,
      workerId,
      stage: "storing_result",
      statusMessage: "Storing extracted text",
      completedUnits: diagnostics.expectedPageCount,
      totalUnits: diagnostics.expectedPageCount,
      unitLabel: "pages",
    });
    const metrics = {
      pageCount: diagnostics.expectedPageCount,
      processedPageCount: diagnostics.processedPageCount,
      blankPageCount: diagnostics.blankPageCount,
      failedPageCount: diagnostics.failedPageCount,
      ocrChunkCount: diagnostics.ocrChunkCount ?? 0,
      rawSourceCharacters: normalized.diagnostics.rawCharacterCount,
      normalizedSourceCharacters: normalized.diagnostics.normalizedCharacterCount,
      removedBoilerplateLines: normalized.diagnostics.removedLineCount,
      extractionDurationMs: Math.max(0, Date.now() - startedAt),
      queueWaitMs: queueWaitMs(job),
      workerExecutionMs: Math.max(0, Date.now() - startedAt),
    };
    await completeProcessingJob(client, {
      jobId,
      workerId,
      resultType: "document_extraction",
      payload: toJson({
        text: normalized.text,
        rawText: pages.map((page) => page.text).join("\n\n"),
        rawPages: pages,
        mimeType: source.mime_type,
        pageCount: diagnostics.expectedPageCount,
        processedPageCount: diagnostics.processedPageCount,
        extraction: diagnostics,
        provider,
        warnings,
        normalization: normalized.diagnostics,
      }),
      metrics: toJson(metrics),
    });
  }, { heartbeatAfterOperation: false });
  safeStepLog("finalize_extraction", "done", jobId);
}

async function finalizeCanvasReviewerExtractionStep(
  jobId: string,
  workerId: string,
): Promise<void> {
  "use step";
  safeStepLog("finalize_canvas_reviewer_extraction", "start", jobId);
  const client = createProcessingJobServiceClient();
  const job = await readProcessingJobState(client, jobId);
  await withWorkflowLease(client, jobId, workerId, async () => {
    await assertWorkflowJobMayContinue(client, jobId, workerId);
    const [planRow, chunkRows] = await Promise.all([
      readProcessingJobCheckpoint(client, jobId, EXTRACTION_PLAN_CHECKPOINT),
      listProcessingJobCheckpoints(client, jobId, EXTRACTION_CHUNK_PREFIX),
    ]);
    const plan = readStoredExtractionPlan(planRow?.payload);
    const chunkPages = chunkRows.flatMap((row) =>
      readOcrPages(requireRecord(row.payload, "OCR chunk").pages)
    );
    const verification = verifyDocumentExtraction({
      expectedPageCount: plan.pageCount,
      pages: [...plan.pages, ...chunkPages],
    });
    console.info("deferred_canvas_reviewer.page_accounting", {
      jobId,
      expectedPageCount: plan.pageCount,
      accountedPageNumbers: verification.pages.map((page) => page.pageNumber),
      ordered: verification.pages.every((page, index) => page.pageNumber === index + 1),
      sourceEligible: verification.sourceEligible,
    });
    if (!verification.sourceEligible) {
      const code = verification.status === "incomplete"
        ? "document_extraction_incomplete"
        : "document_unreadable";
      await failKnownWorkflowJob(client, jobId, workerId, {
        code,
        message: extractionFailureMessage(code),
        retryable: code === "document_extraction_incomplete",
      });
      throw new FatalError(code);
    }
    const normalized = normalizeDocumentTextWithEvidence(verification.pages);
    if (!normalized.text.trim()) {
      await failKnownWorkflowJob(client, jobId, workerId, {
        code: "no_text_detected",
        message: "No readable text was detected in the source.",
        retryable: false,
      });
      throw new FatalError("no_text_detected");
    }
    const { prepareDeferredCanvasReviewerSource } = await import(
      "@/lib/processing-jobs/deferred-canvas-reviewer"
    );
    try {
      await prepareDeferredCanvasReviewerSource({
        client,
        job,
        normalizedText: normalized.text,
        pages: verification.pages,
        workerId,
      });
    } catch (error) {
      const { ExperienceFailure } = await import("@/lib/experience/errors");
      if (error instanceof ExperienceFailure && error.status < 500) {
        await failProcessingJob(client, {
          jobId,
          workerId,
          errorCode: error.code,
          safeErrorMessage: "The Canvas source could not be prepared completely.",
          retryable: false,
          automaticRetryable: false,
        });
        throw new FatalError(error.code);
      }
      throw error;
    }
  });
  safeStepLog("finalize_canvas_reviewer_extraction", "done", jobId);
}

async function processAIReviewerStep(jobId: string, workerId: string): Promise<void> {
  "use step";
  const { processAIReviewerJob } = await import("@/lib/processing-jobs/ai-reviewer");
  const { ExperienceFailure } = await import("@/lib/experience/errors");
  const client = createProcessingJobServiceClient();
  const job = await readProcessingJobState(client, jobId);
  if (job.status === "succeeded") return;
  await withWorkflowLease(client, jobId, workerId, async () => {
    await assertWorkflowJobMayContinue(client, jobId, workerId);
    const output = await processAIReviewerJob(client, job, workerId).catch(async (error: unknown) => {
      if (error instanceof ExperienceFailure && error.status < 500) {
        await failProcessingJob(client, { jobId, workerId, errorCode: error.code, safeErrorMessage: "Reviewer generation could not be completed.", retryable: false, automaticRetryable: false });
        throw new FatalError(error.code);
      }
      throw error;
    });
    await assertWorkflowJobMayContinue(client, jobId, workerId);
    await completeProcessingJob(client, { jobId, workerId, resultType: "reviewer_generation", payload: toJson(output.payload), metrics: toJson(output.metrics) });
  }, { heartbeatAfterOperation: false });
}

async function finalizeWorkflowFailureStep(
  jobId: string,
  workerId: string,
): Promise<void> {
  "use step";
  safeStepLog("finalize_failure", "start", jobId);
  const client = createProcessingJobServiceClient();
  let state: ProcessingJobDatabaseRow;
  try {
    state = await readProcessingJobState(client, jobId);
  } catch {
    return;
  }
  if (
    state.status === "succeeded" ||
    state.status === "failed" ||
    state.status === "cancelled" ||
    state.status === "expired"
  ) {
    return;
  }
  if (state.lease_owner !== workerId) return;
  await failProcessingJob(client, {
    jobId,
    workerId,
    errorCode:
      state.status === "cancellation_requested"
        ? "processing_job_cancelled"
        : "processing_workflow_failed",
    safeErrorMessage:
      state.status === "cancellation_requested"
        ? "Processing was cancelled."
        : "Processing was interrupted. Try again.",
    retryable: state.status !== "cancellation_requested",
    automaticRetryable: false,
  }).catch(() => undefined);
  safeStepLog("finalize_failure", "done", jobId);
}

async function withWorkflowLease<T>(
  client: ProcessingJobServiceClient,
  jobId: string,
  workerId: string,
  operation: () => Promise<T>,
  options: {
    readonly heartbeatAfterOperation?: boolean;
  } = {},
): Promise<T> {
  await heartbeatProcessingJob(
    client,
    jobId,
    workerId,
    WORKFLOW_JOB_LEASE_SECONDS,
  );
  let heartbeatError: unknown;
  const timer = setInterval(() => {
    void heartbeatProcessingJob(
      client,
      jobId,
      workerId,
      WORKFLOW_JOB_LEASE_SECONDS,
    ).catch((error) => {
      heartbeatError = error;
    });
  }, WORKFLOW_STEP_HEARTBEAT_INTERVAL_MS);
  timer.unref?.();
  try {
    const result = await operation();
    if (heartbeatError) throw heartbeatError;
    if (options.heartbeatAfterOperation !== false) {
      await heartbeatProcessingJob(
        client,
        jobId,
        workerId,
        WORKFLOW_JOB_LEASE_SECONDS,
      );
    }
    return result;
  } finally {
    clearInterval(timer);
  }
}

async function assertWorkflowJobMayContinue(
  client: ProcessingJobServiceClient,
  jobId: string,
  workerId: string,
): Promise<void> {
  const state = await readProcessingJobState(client, jobId);
  if (state.status === "cancellation_requested" || state.status === "cancelled") {
    throw new FatalError("processing_job_cancelled");
  }
  if (state.status !== "running" || state.lease_owner !== workerId) {
    throw new FatalError("processing_job_lease_lost");
  }
}

async function failKnownWorkflowJob(
  client: ProcessingJobServiceClient,
  jobId: string,
  workerId: string,
  failure: {
    readonly code: string;
    readonly message: string;
    readonly retryable: boolean;
  },
): Promise<void> {
  await failProcessingJob(client, {
    jobId,
    workerId,
    errorCode: failure.code,
    safeErrorMessage: failure.message,
    retryable: failure.retryable,
    automaticRetryable: false,
  });
}

async function downloadSourceBytes(
  client: ProcessingJobServiceClient,
  source: ProcessingJobSourceRow,
): Promise<Uint8Array> {
  if (!source.storage_bucket || !source.storage_object_path) {
    throw new FatalError("processing_job_source_missing");
  }
  const download = await client.storage
    .from(source.storage_bucket)
    .download(source.storage_object_path);
  if (download.error || !download.data) {
    throw new Error("processing_job_source_download_failed");
  }
  return new Uint8Array(await download.data.arrayBuffer());
}

function readStoredExtractionPlan(value: unknown): StoredExtractionPlan {
  const record = requireRecord(value, "extraction plan");
  if (
    record.kind !== "pdf" ||
    typeof record.pageCount !== "number" ||
    !Array.isArray(record.pages) ||
    !Array.isArray(record.warnings) ||
    !Array.isArray(record.chunks) ||
    typeof record.nativeTextPageCount !== "number" ||
    typeof record.ocrPageCount !== "number" ||
    typeof record.preparedAt !== "string"
  ) {
    throw new FatalError("processing_checkpoint_invalid");
  }
  return record as unknown as StoredExtractionPlan;
}

function readOcrPages(value: unknown): readonly OcrPage[] {
  if (!Array.isArray(value)) {
    throw new FatalError("processing_checkpoint_invalid");
  }
  return value as unknown as readonly OcrPage[];
}

function readPdfPageInspection(value: unknown): PdfPageInspection {
  const record = requireRecord(value, "PDF inspection");
  if (
    typeof record.pageNumber !== "number" ||
    !Number.isInteger(record.pageNumber) ||
    record.pageNumber < 1 ||
    typeof record.text !== "string" ||
    !["native_text", "blank", "ocr"].includes(String(record.kind))
  ) {
    throw new FatalError("processing_checkpoint_invalid");
  }
  return record as unknown as PdfPageInspection;
}

function readOcrWarnings(value: unknown): readonly OcrWarning[] {
  return Array.isArray(value)
    ? value as unknown as readonly OcrWarning[]
    : [];
}

function readChunkProvider(
  rows: readonly { readonly payload: Json }[],
): string | null {
  for (const row of rows) {
    const record = isRecord(row.payload) ? row.payload : {};
    if (typeof record.providerId === "string" && record.providerId.trim()) {
      return record.providerId;
    }
  }
  return null;
}

function chunkPageNumbers(
  pageNumbers: readonly number[],
): readonly (readonly number[])[] {
  const chunks: number[][] = [];
  for (
    let offset = 0;
    offset < pageNumbers.length;
    offset += OCR_PROVIDER_MAX_PDF_PAGES_PER_REQUEST
  ) {
    chunks.push(
      pageNumbers.slice(
        offset,
        offset + OCR_PROVIDER_MAX_PDF_PAGES_PER_REQUEST,
      ),
    );
  }
  return chunks;
}

function queueWaitMs(job: ProcessingJobDatabaseRow): number {
  return Math.max(
    0,
    Date.parse(job.started_at ?? job.updated_at) - Date.parse(job.accepted_at),
  );
}

function extractionFailureMessage(code: string): string {
  switch (code) {
    case "ocr_not_configured":
      return "Text extraction is not configured.";
    case "document_extraction_incomplete":
      return "Some document pages could not be read completely.";
    case "document_unreadable":
    case "ocr_empty_result":
      return "No readable text was detected in the source.";
    case "document_extraction_timeout":
      return "Document extraction took too long.";
    default:
      return "Text extraction could not be completed.";
  }
}

function isRetryableExtractionFailure(code: string): boolean {
  return (
    code === "ocr_provider_failed" ||
    code === "document_extraction_incomplete" ||
    code === "document_extraction_timeout" ||
    code === "internal_error"
  );
}

function readArray(record: Json, key: string): readonly Json[] {
  return isRecord(record) && Array.isArray(record[key])
    ? record[key] as readonly Json[]
    : [];
}

function readString(record: Readonly<Record<string, unknown>>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new FatalError("processing_checkpoint_invalid");
  }
  return value;
}

function requireRecord(
  value: unknown,
  _label: string,
): Readonly<Record<string, unknown>> {
  if (!isRecord(value)) {
    throw new FatalError("processing_checkpoint_invalid");
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function padIndex(value: number): string {
  return value.toString().padStart(4, "0");
}

function safeStepLog(
  step: string,
  outcome: "start" | "done" | "skipped" | "checkpoint",
  jobId: string,
  unitId?: string,
): void {
  console.info("processing_workflow.step", {
    jobId,
    outcome,
    step,
    ...(unitId ? { unitId } : {}),
  });
}

function logWorkflowMemory(
  stage: string,
  jobId: string,
  fields: Readonly<Record<string, number>>,
): void {
  const memory = process.memoryUsage();
  console.info("processing_workflow.memory", {
    stage,
    jobId,
    rssBytes: memory.rss,
    heapUsedBytes: memory.heapUsed,
    externalBytes: memory.external,
    arrayBufferBytes: memory.arrayBuffers,
    ...fields,
  });
}

function readSafeErrorCode(error: unknown): string | null {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    typeof error.code !== "string"
  ) {
    return null;
  }
  return /^[a-z0-9_.-]{1,80}$/i.test(error.code) ? error.code : null;
}

function toJson(value: unknown): Json {
  return value as Json;
}
