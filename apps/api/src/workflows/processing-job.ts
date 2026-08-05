import type {
  Json,
  ProcessingJobDatabaseRow,
  ProcessingJobSourceRow,
} from "@stay-focused/db";
import {
  assembleReviewer,
  buildGenerationPlan,
  detectOutline,
  generateSection,
  normalizeSource,
  retryFailedSections,
  SectionProviderError,
  SectionValidationError,
  validateGrounding,
  validateLeakage,
  verifyCoverage,
  type CoverageReport,
  type GenerationPlan,
  type GroundingReport,
  type LeakageReport,
  type NormalizedSource,
  type ReviewerSectionQualityStatus,
  type SectionOutput,
  type SourceOutline,
} from "@stay-focused/engine";
import {
  normalizeDocumentTextWithEvidence,
  verifyDocumentExtraction,
  type DocumentExtractionDiagnostics,
  type OcrPage,
  type OcrWarning,
} from "@stay-focused/ocr";
import { FatalError, getWorkflowMetadata } from "workflow";

import { createServerOcrProvider } from "@/lib/ocr/create-server-ocr-provider";
import {
  createInspectedPdfPages,
  extractPreparedPdfOcrChunk,
  extractWithOcrProvider,
} from "@/lib/ocr/extraction-service";
import { getConfiguredDurableDocumentMaxOcrPages } from "@/lib/ocr/upload-policy";
import { inspectPdfTextPages } from "@/lib/ocr/pdf-native-text";
import {
  OCR_PROVIDER_MAX_PDF_PAGES_PER_REQUEST,
} from "@/lib/ocr/upload-policy";
import {
  OCR_PROVIDER_CALL_TIMEOUT_MS,
} from "@/lib/processing-jobs/constants";
import {
  createProcessingJobServiceClient,
  findProcessingJobSource,
  type ProcessingJobServiceClient,
} from "@/lib/processing-jobs/repository";
import {
  claimProcessingJobForWorkflow,
  attachProcessingJobWorkflow,
  listProcessingJobCheckpoints,
  readProcessingJobCheckpoint,
  WORKFLOW_JOB_LEASE_SECONDS,
  writeProcessingJobCheckpoint,
} from "@/lib/processing-jobs/workflow-repository";
import {
  completeProcessingJob,
  failProcessingJob,
  heartbeatProcessingJob,
  readProcessingJobState,
  updateProcessingJobProgress,
} from "@/lib/processing-jobs/worker-repository";
import { createServerOpenAIProvider } from "@/providers";

const EXTRACTION_PLAN_CHECKPOINT = "extraction.plan";
const EXTRACTION_IMAGE_CHECKPOINT = "extraction.image";
const EXTRACTION_CHUNK_PREFIX = "extraction.chunk.";
const REVIEWER_PREPARED_CHECKPOINT = "reviewer.prepared";
const REVIEWER_INITIAL_PREFIX = "reviewer.initial.";
const REVIEWER_VERIFICATION_CHECKPOINT = "reviewer.verification.initial";
const REVIEWER_RETRY_PREFIX = "reviewer.retry.";
const WORKFLOW_STEP_HEARTBEAT_INTERVAL_MS = 60_000;
const WORKFLOW_OCR_CHUNK_CONCURRENCY = 2;
const WORKFLOW_REVIEWER_SECTION_CONCURRENCY = 2;

type WorkflowOutcome =
  | { readonly status: "succeeded"; readonly jobId: string }
  | { readonly status: "skipped"; readonly jobId: string }
  | { readonly status: "failed"; readonly jobId: string };

interface ClaimedWorkflowJob {
  readonly claimed: boolean;
  readonly jobType?: "document_extraction" | "reviewer_generation";
}

interface ExtractionWorkflowPlan {
  readonly kind: "image" | "pdf";
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

interface StoredReviewerPreparation {
  readonly source: NormalizedSource;
  readonly outline: SourceOutline;
  readonly plan: GenerationPlan;
  readonly sourceCharacterCount: number;
  readonly sourceTitle?: string;
  readonly reviewerSourceSnapshotId?: string;
  readonly preparedAt: string;
}

interface StoredInitialSection {
  readonly sectionId: string;
  readonly output: SectionOutput | null;
  readonly validationFailure: boolean;
  readonly providerFailure: boolean;
}

interface StoredReviewerVerification {
  readonly coverage: CoverageReport;
  readonly grounding: GroundingReport;
  readonly leakage: LeakageReport;
}

interface StoredRetriedSection {
  readonly sectionId: string;
  readonly output: SectionOutput | null;
  readonly qualityStatus: ReviewerSectionQualityStatus | null;
  readonly retryCount: number;
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

    if (claimed.jobType === "document_extraction") {
      const plan = await prepareExtractionStep(jobId, workerId);
      if (plan.kind === "image") {
        await extractImageStep(jobId, workerId);
      } else {
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
      const sectionIds = await prepareReviewerStep(jobId, workerId);
      for (
        let offset = 0;
        offset < sectionIds.length;
        offset += WORKFLOW_REVIEWER_SECTION_CONCURRENCY
      ) {
        await Promise.all(
          sectionIds
            .slice(offset, offset + WORKFLOW_REVIEWER_SECTION_CONCURRENCY)
            .map((sectionId) =>
              generateReviewerSectionStep(jobId, workerId, sectionId)
            ),
        );
      }
      const retrySectionIds = await verifyReviewerStep(jobId, workerId);
      for (
        let offset = 0;
        offset < retrySectionIds.length;
        offset += WORKFLOW_REVIEWER_SECTION_CONCURRENCY
      ) {
        await Promise.all(
          retrySectionIds
            .slice(offset, offset + WORKFLOW_REVIEWER_SECTION_CONCURRENCY)
            .map((sectionId) =>
              retryReviewerSectionStep(jobId, workerId, sectionId)
            ),
        );
      }
      await finalizeReviewerStep(jobId, workerId);
    }

    return { status: "succeeded", jobId };
  } catch {
    await finalizeWorkflowFailureStep(jobId, workerId);
    return { status: "failed", jobId };
  }
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

    const job = await readProcessingJobState(client, jobId);
    const source = await findProcessingJobSource(client, job);
    if (source.source_kind === "image") {
      await updateProcessingJobProgress(client, {
        jobId,
        workerId,
        stage: "preparing_ocr_chunks",
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
      stage: "inspecting_document",
      statusMessage: "Inspecting document",
      completedUnits: 0,
      totalUnits: source.page_count,
      unitLabel: "pages",
    });
    const bytes = await downloadSourceBytes(client, source);
    let inspections;
    const warnings: OcrWarning[] = [];
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
    const pages = createInspectedPdfPages(inspections);
    const ocrPageNumbers = inspections
      .filter((page) => page.kind === "ocr")
      .map((page) => page.pageNumber);
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
      stage: chunks.length > 0 ? "preparing_ocr_chunks" : "verifying_pages",
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
      stage: "extracting_ocr",
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

async function prepareReviewerStep(
  jobId: string,
  workerId: string,
): Promise<readonly string[]> {
  "use step";
  safeStepLog("prepare_reviewer", "start", jobId);
  const client = createProcessingJobServiceClient();
  return await withWorkflowLease(client, jobId, workerId, async () => {
    const existing = await readProcessingJobCheckpoint(
      client,
      jobId,
      REVIEWER_PREPARED_CHECKPOINT,
    );
    if (existing) {
      const prepared = readStoredReviewerPreparation(existing.payload);
      safeStepLog("prepare_reviewer", "checkpoint", jobId);
      return prepared.plan.sections.map((section) => section.id);
    }
    await assertWorkflowJobMayContinue(client, jobId, workerId);
    const job = await readProcessingJobState(client, jobId);
    const sourceRow = await findProcessingJobSource(client, job);
    if (sourceRow.source_kind !== "text" || !sourceRow.source_text?.trim()) {
      throw new FatalError("processing_job_source_missing");
    }
    const privateMetadata = isRecord(sourceRow.metadata)
      ? sourceRow.metadata
      : {};
    const sourceTitle = typeof privateMetadata.sourceTitle === "string"
      ? privateMetadata.sourceTitle
      : undefined;
    const reviewerSourceSnapshotId =
      typeof privateMetadata.reviewerSourceSnapshotId === "string"
        ? privateMetadata.reviewerSourceSnapshotId
        : undefined;

    await updateProcessingJobProgress(client, {
      jobId,
      workerId,
      stage: "normalizing_source",
      statusMessage: "Preparing source",
    });
    const source = await normalizeSource({
      text: sourceRow.source_text,
      ...(sourceTitle ? { title: sourceTitle } : {}),
    });
    await updateProcessingJobProgress(client, {
      jobId,
      workerId,
      stage: "detecting_outline",
      statusMessage: "Organizing topics",
      metrics: toJson({
        sourceCharacterCount: sourceRow.source_text.length,
        normalizedCharacterCount: normalizedSourceCharacterCount(source),
      }),
    });
    const outline = await detectOutline(source);
    await updateProcessingJobProgress(client, {
      jobId,
      workerId,
      stage: "planning_sections",
      statusMessage: "Planning reviewer sections",
      metrics: toJson({
        sourceCharacterCount: sourceRow.source_text.length,
        normalizedCharacterCount: normalizedSourceCharacterCount(source),
        outlineItemCount: outline.sections.length,
      }),
    });
    const plan = buildGenerationPlan(outline, source);
    const prepared: StoredReviewerPreparation = {
      source,
      outline,
      plan,
      sourceCharacterCount: sourceRow.source_text.length,
      ...(sourceTitle ? { sourceTitle } : {}),
      ...(reviewerSourceSnapshotId ? { reviewerSourceSnapshotId } : {}),
      preparedAt: new Date().toISOString(),
    };
    await writeProcessingJobCheckpoint(client, {
      jobId,
      checkpointKey: REVIEWER_PREPARED_CHECKPOINT,
      payload: toJson(prepared),
    });
    await updateProcessingJobProgress(client, {
      jobId,
      workerId,
      stage: "generating_sections",
      statusMessage: "Creating reviewer sections",
      completedUnits: 0,
      totalUnits: plan.sections.length,
      unitLabel: "sections",
      metrics: reviewerMetrics(prepared, 0, 0),
    });
    safeStepLog("prepare_reviewer", "done", jobId);
    return plan.sections.map((section) => section.id);
  });
}

async function generateReviewerSectionStep(
  jobId: string,
  workerId: string,
  sectionId: string,
): Promise<void> {
  "use step";
  const checkpointKey = `${REVIEWER_INITIAL_PREFIX}${sectionId}`;
  safeStepLog("generate_section", "start", jobId, sectionId);
  const client = createProcessingJobServiceClient();
  await withWorkflowLease(client, jobId, workerId, async () => {
    if (await readProcessingJobCheckpoint(client, jobId, checkpointKey)) {
      safeStepLog("generate_section", "checkpoint", jobId, sectionId);
      return;
    }
    await assertWorkflowJobMayContinue(client, jobId, workerId);
    const prepared = await requireReviewerPreparation(client, jobId);
    const section = prepared.plan.sections.find(
      (candidate) => candidate.id === sectionId,
    );
    if (!section) throw new FatalError("reviewer_section_missing");

    let stored: StoredInitialSection;
    try {
      const output = await generateSection({
        section,
        plan: prepared.plan,
        source: prepared.source,
        provider: createServerOpenAIProvider(),
      });
      stored = {
        sectionId,
        output,
        validationFailure: false,
        providerFailure: false,
      };
    } catch (error) {
      if (
        !(error instanceof SectionProviderError) &&
        !(error instanceof SectionValidationError)
      ) {
        throw error;
      }
      stored = {
        sectionId,
        output: null,
        validationFailure: error instanceof SectionValidationError,
        providerFailure: error instanceof SectionProviderError,
      };
    }
    await assertWorkflowJobMayContinue(client, jobId, workerId);
    await writeProcessingJobCheckpoint(client, {
      jobId,
      checkpointKey,
      payload: toJson(stored),
    });
    const completed = (
      await listProcessingJobCheckpoints(client, jobId, REVIEWER_INITIAL_PREFIX)
    ).length;
    await updateProcessingJobProgress(client, {
      jobId,
      workerId,
      stage: "generating_sections",
      statusMessage: "Creating reviewer sections",
      completedUnits: Math.min(completed, prepared.plan.sections.length),
      totalUnits: prepared.plan.sections.length,
      unitLabel: "sections",
      metrics: reviewerMetrics(prepared, completed, 0),
    });
  });
  safeStepLog("generate_section", "done", jobId, sectionId);
}

async function verifyReviewerStep(
  jobId: string,
  workerId: string,
): Promise<readonly string[]> {
  "use step";
  safeStepLog("verify_reviewer", "start", jobId);
  const client = createProcessingJobServiceClient();
  return await withWorkflowLease(client, jobId, workerId, async () => {
    const existing = await readProcessingJobCheckpoint(
      client,
      jobId,
      REVIEWER_VERIFICATION_CHECKPOINT,
    );
    if (existing) {
      const verification = readStoredReviewerVerification(existing.payload);
      return retryableSectionIds(verification);
    }
    await assertWorkflowJobMayContinue(client, jobId, workerId);
    const prepared = await requireReviewerPreparation(client, jobId);
    const initial = await readInitialReviewerSections(client, jobId);
    const outputs = initial.flatMap((section) =>
      section.output ? [section.output] : []
    );
    await updateProcessingJobProgress(client, {
      jobId,
      workerId,
      stage: "verifying_coverage",
      statusMessage: "Checking coverage",
      completedUnits: outputs.length,
      totalUnits: prepared.plan.sections.length,
      unitLabel: "sections",
      metrics: reviewerMetrics(prepared, initial.length, 0),
    });
    const verification: StoredReviewerVerification = {
      coverage: verifyCoverage({
        outputs,
        plan: prepared.plan,
        source: prepared.source,
        outline: prepared.outline,
      }),
      grounding: validateGrounding({
        outputs,
        plan: prepared.plan,
        source: prepared.source,
        outline: prepared.outline,
      }),
      leakage: validateLeakage({
        outputs,
        plan: prepared.plan,
        source: prepared.source,
      }),
    };
    await writeProcessingJobCheckpoint(client, {
      jobId,
      checkpointKey: REVIEWER_VERIFICATION_CHECKPOINT,
      payload: toJson(verification),
    });
    const retryIds = retryableSectionIds(verification);
    await updateProcessingJobProgress(client, {
      jobId,
      workerId,
      stage: retryIds.length > 0 ? "retrying_sections" : "assembling_reviewer",
      statusMessage: retryIds.length > 0
        ? "Improving reviewer sections"
        : "Finishing reviewer",
      completedUnits: outputs.length,
      totalUnits: prepared.plan.sections.length,
      unitLabel: "sections",
      metrics: reviewerMetrics(prepared, initial.length, 0),
    });
    safeStepLog("verify_reviewer", "done", jobId);
    return retryIds;
  });
}

async function retryReviewerSectionStep(
  jobId: string,
  workerId: string,
  sectionId: string,
): Promise<void> {
  "use step";
  const checkpointKey = `${REVIEWER_RETRY_PREFIX}${sectionId}`;
  safeStepLog("retry_section", "start", jobId, sectionId);
  const client = createProcessingJobServiceClient();
  await withWorkflowLease(client, jobId, workerId, async () => {
    if (await readProcessingJobCheckpoint(client, jobId, checkpointKey)) {
      safeStepLog("retry_section", "checkpoint", jobId, sectionId);
      return;
    }
    await assertWorkflowJobMayContinue(client, jobId, workerId);
    const prepared = await requireReviewerPreparation(client, jobId);
    const verificationRow = await readProcessingJobCheckpoint(
      client,
      jobId,
      REVIEWER_VERIFICATION_CHECKPOINT,
    );
    const verification = readStoredReviewerVerification(verificationRow?.payload);
    const initial = await readInitialReviewerSections(client, jobId);
    const outputs = initial.flatMap((section) =>
      section.output ? [section.output] : []
    );
    let qualityStatus: ReviewerSectionQualityStatus | null = null;
    let retryCount = 0;
    const finalOutputs = await retryFailedSections({
      outputs,
      coverage: maskCoverageForSection(verification.coverage, sectionId),
      grounding: maskGroundingForSection(verification.grounding, sectionId),
      leakage: maskLeakageForSection(verification.leakage, sectionId),
      plan: prepared.plan,
      source: prepared.source,
      outline: prepared.outline,
      provider: createServerOpenAIProvider(),
      retryPolicy: {
        maxRetries: 2,
        retryWeakSections: true,
        retryFailedSections: true,
      },
      onRetryAttempt: (section, attempt) => {
        if (section.id === sectionId) retryCount = Math.max(retryCount, attempt);
      },
      onSectionRecovered: (section, status) => {
        if (section.id === sectionId) qualityStatus = status;
      },
    });
    const output =
      finalOutputs.find((candidate) => candidate.plannedSectionId === sectionId) ??
      null;
    const stored: StoredRetriedSection = {
      sectionId,
      output,
      qualityStatus,
      retryCount,
    };
    await assertWorkflowJobMayContinue(client, jobId, workerId);
    await writeProcessingJobCheckpoint(client, {
      jobId,
      checkpointKey,
      payload: toJson(stored),
    });
    const retryRows = await listProcessingJobCheckpoints(
      client,
      jobId,
      REVIEWER_RETRY_PREFIX,
    );
    const totalRetryCount = retryRows.reduce(
      (total, row) => total + readNumber(row.payload, "retryCount"),
      0,
    );
    await updateProcessingJobProgress(client, {
      jobId,
      workerId,
      stage: "retrying_sections",
      statusMessage: "Improving reviewer sections",
      completedUnits: Math.min(
        initial.filter((section) => section.output).length + retryRows.length,
        prepared.plan.sections.length,
      ),
      totalUnits: prepared.plan.sections.length,
      unitLabel: "sections",
      metrics: reviewerMetrics(
        prepared,
        initial.length + totalRetryCount,
        totalRetryCount,
      ),
    });
  });
  safeStepLog("retry_section", "done", jobId, sectionId);
}

async function finalizeReviewerStep(
  jobId: string,
  workerId: string,
): Promise<void> {
  "use step";
  safeStepLog("finalize_reviewer", "start", jobId);
  const client = createProcessingJobServiceClient();
  await withWorkflowLease(client, jobId, workerId, async () => {
    await assertWorkflowJobMayContinue(client, jobId, workerId);
    const job = await readProcessingJobState(client, jobId);
    const prepared = await requireReviewerPreparation(client, jobId);
    const [initial, retryRows] = await Promise.all([
      readInitialReviewerSections(client, jobId),
      listProcessingJobCheckpoints(client, jobId, REVIEWER_RETRY_PREFIX),
    ]);
    const retried = retryRows.map((row) => readStoredRetriedSection(row.payload));
    const retryBySection = new Map(
      retried.map((section) => [section.sectionId, section] as const),
    );
    const initialBySection = new Map(
      initial.map((section) => [section.sectionId, section] as const),
    );
    const outputs: SectionOutput[] = [];
    const sectionQualityById: Record<string, ReviewerSectionQualityStatus> = {};
    let retryCount = 0;
    for (const section of prepared.plan.sections) {
      const retry = retryBySection.get(section.id);
      const output = retry?.output ?? initialBySection.get(section.id)?.output ?? null;
      if (output) outputs.push(output);
      sectionQualityById[section.id] =
        retry?.qualityStatus ?? "generated";
      retryCount += retry?.retryCount ?? 0;
    }
    const coverage = verifyCoverage({
      outputs,
      plan: prepared.plan,
      source: prepared.source,
      outline: prepared.outline,
    });
    const grounding = validateGrounding({
      outputs,
      plan: prepared.plan,
      source: prepared.source,
      outline: prepared.outline,
    });
    const leakage = validateLeakage({
      outputs,
      plan: prepared.plan,
      source: prepared.source,
    });
    await updateProcessingJobProgress(client, {
      jobId,
      workerId,
      stage: "assembling_reviewer",
      statusMessage: "Finishing reviewer",
      completedUnits: outputs.length,
      totalUnits: prepared.plan.sections.length,
      unitLabel: "sections",
      metrics: reviewerMetrics(
        prepared,
        initial.length + retryCount,
        retryCount,
      ),
    });
    const fallbackPlanUsed =
      initial.every((section) => section.output === null) &&
      prepared.plan.sections.every(
        (section) =>
          sectionQualityById[section.id] === "extractive_fallback",
      );
    const reviewer = assembleReviewer({
      outputs,
      coverage,
      grounding,
      leakage,
      plan: prepared.plan,
      source: prepared.source,
      sectionQualityById,
      fallbackPlanUsed,
    });
    await updateProcessingJobProgress(client, {
      jobId,
      workerId,
      stage: "storing_reviewer",
      statusMessage: "Storing reviewer",
      completedUnits: reviewer.sections.length,
      totalUnits: reviewer.sections.length,
      unitLabel: "sections",
    });
    const startedAt = Date.parse(job.started_at ?? job.updated_at);
    const metrics = {
      sourceCharacterCount: prepared.sourceCharacterCount,
      normalizedCharacterCount: normalizedSourceCharacterCount(prepared.source),
      outlineItemCount: prepared.outline.sections.length,
      plannedSectionCount: prepared.plan.sections.length,
      providerCallCount: initial.length + retryCount,
      retryCount,
      finalReviewerSectionCount: reviewer.sections.length,
      coverageStatus: reviewer.metadata.coverageStatus,
      coverageScore: reviewer.metadata.coverageScore,
      groundingStatus: reviewer.metadata.groundingStatus,
      groundingScore: reviewer.metadata.groundingScore,
      leakageStatus: reviewer.metadata.leakageStatus,
      generationDurationMs: Math.max(0, Date.now() - startedAt),
      queueWaitMs: queueWaitMs(job),
      workerExecutionMs: Math.max(0, Date.now() - startedAt),
    };
    await completeProcessingJob(client, {
      jobId,
      workerId,
      resultType: "reviewer_generation",
      payload: toJson({
        reviewer,
        ...(prepared.reviewerSourceSnapshotId
          ? { sourceSnapshotId: prepared.reviewerSourceSnapshotId }
          : {}),
      }),
      metrics: toJson(metrics),
    });
  }, { heartbeatAfterOperation: false });
  safeStepLog("finalize_reviewer", "done", jobId);
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

async function requireReviewerPreparation(
  client: ProcessingJobServiceClient,
  jobId: string,
): Promise<StoredReviewerPreparation> {
  const checkpoint = await readProcessingJobCheckpoint(
    client,
    jobId,
    REVIEWER_PREPARED_CHECKPOINT,
  );
  return readStoredReviewerPreparation(checkpoint?.payload);
}

async function readInitialReviewerSections(
  client: ProcessingJobServiceClient,
  jobId: string,
): Promise<readonly StoredInitialSection[]> {
  const rows = await listProcessingJobCheckpoints(
    client,
    jobId,
    REVIEWER_INITIAL_PREFIX,
  );
  return rows.map((row) => readStoredInitialSection(row.payload));
}

function retryableSectionIds(
  verification: StoredReviewerVerification,
): readonly string[] {
  const ids = new Set<string>();
  for (const section of verification.coverage.sections) {
    if (section.retryable && section.status !== "passed") {
      ids.add(section.plannedSectionId);
    }
  }
  for (const section of verification.grounding.sections) {
    if (section.retryable && section.status === "failed") {
      ids.add(section.plannedSectionId);
    }
  }
  for (const section of verification.leakage.sections) {
    if (section.retryable && section.status === "failed") {
      ids.add(section.plannedSectionId);
    }
  }
  return [...ids];
}

function maskCoverageForSection(
  report: CoverageReport,
  sectionId: string,
): CoverageReport {
  return {
    ...report,
    sections: report.sections.map((section) =>
      section.plannedSectionId === sectionId
        ? section
        : {
            ...section,
            status: "passed" as const,
            score: 1,
            issues: [],
            retryable: false,
          }
    ),
  };
}

function maskGroundingForSection(
  report: GroundingReport,
  sectionId: string,
): GroundingReport {
  return {
    ...report,
    sections: report.sections.map((section) =>
      section.plannedSectionId === sectionId
        ? section
        : {
            ...section,
            status: "passed" as const,
            score: 1,
            issues: [],
            retryable: false,
          }
    ),
  };
}

function maskLeakageForSection(
  report: LeakageReport,
  sectionId: string,
): LeakageReport {
  return {
    ...report,
    sections: report.sections.map((section) =>
      section.plannedSectionId === sectionId
        ? section
        : {
            ...section,
            status: "passed" as const,
            issues: [],
            retryable: false,
          }
    ),
  };
}

function reviewerMetrics(
  prepared: StoredReviewerPreparation,
  providerCallCount: number,
  retryCount: number,
): Json {
  return toJson({
    sourceCharacterCount: prepared.sourceCharacterCount,
    normalizedCharacterCount: normalizedSourceCharacterCount(prepared.source),
    outlineItemCount: prepared.outline.sections.length,
    plannedSectionCount: prepared.plan.sections.length,
    providerCallCount,
    retryCount,
  });
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

function readStoredReviewerPreparation(
  value: unknown,
): StoredReviewerPreparation {
  const record = requireRecord(value, "reviewer preparation");
  if (
    !isRecord(record.source) ||
    !isRecord(record.outline) ||
    !isRecord(record.plan) ||
    typeof record.sourceCharacterCount !== "number" ||
    typeof record.preparedAt !== "string"
  ) {
    throw new FatalError("processing_checkpoint_invalid");
  }
  return record as unknown as StoredReviewerPreparation;
}

function readStoredInitialSection(value: unknown): StoredInitialSection {
  const record = requireRecord(value, "initial reviewer section");
  if (
    typeof record.sectionId !== "string" ||
    (record.output !== null && !isRecord(record.output)) ||
    typeof record.validationFailure !== "boolean" ||
    typeof record.providerFailure !== "boolean"
  ) {
    throw new FatalError("processing_checkpoint_invalid");
  }
  return record as unknown as StoredInitialSection;
}

function readStoredReviewerVerification(
  value: unknown,
): StoredReviewerVerification {
  const record = requireRecord(value, "reviewer verification");
  if (
    !isRecord(record.coverage) ||
    !isRecord(record.grounding) ||
    !isRecord(record.leakage)
  ) {
    throw new FatalError("processing_checkpoint_invalid");
  }
  return record as unknown as StoredReviewerVerification;
}

function readStoredRetriedSection(value: unknown): StoredRetriedSection {
  const record = requireRecord(value, "retried reviewer section");
  if (
    typeof record.sectionId !== "string" ||
    (record.output !== null && !isRecord(record.output)) ||
    (
      record.qualityStatus !== null &&
      record.qualityStatus !== "generated" &&
      record.qualityStatus !== "repaired" &&
      record.qualityStatus !== "extractive_fallback"
    ) ||
    typeof record.retryCount !== "number"
  ) {
    throw new FatalError("processing_checkpoint_invalid");
  }
  return record as unknown as StoredRetriedSection;
}

function readOcrPages(value: unknown): readonly OcrPage[] {
  if (!Array.isArray(value)) {
    throw new FatalError("processing_checkpoint_invalid");
  }
  return value as unknown as readonly OcrPage[];
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

function normalizedSourceCharacterCount(source: NormalizedSource): number {
  return source.blocks.reduce((total, block) => total + block.text.length, 0);
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

function readNumber(record: Json, key: string): number {
  return isRecord(record) && typeof record[key] === "number"
    ? record[key]
    : 0;
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
