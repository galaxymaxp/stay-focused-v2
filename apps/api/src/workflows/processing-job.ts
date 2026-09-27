import { FatalError, getWorkflowMetadata } from "workflow";
import { createProcessingJobServiceClient } from "@/lib/processing-jobs/repository";
import { attachProcessingJobWorkflow, claimProcessingJobForWorkflow } from "@/lib/processing-jobs/workflow-repository";

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

async function claimWorkflowJobStep(
  jobId: string,
  workerId: string,
  workflowRunId: string,
): Promise<ClaimedWorkflowJob> {
  "use step";
  const client = createProcessingJobServiceClient();
  await attachProcessingJobWorkflow(client, jobId, workflowRunId);
  const job = await claimProcessingJobForWorkflow(client, jobId, workerId);
  return job
    ? { claimed: true, jobType: job.job_type }
    : { claimed: false };
}

async function prepareCanvasReviewerExtractionStep(jobId: string, workerId: string): Promise<number | null> {
  "use step";
  const operations = await import("@/lib/processing-jobs/operations");
  try {
    return await operations.prepareCanvasReviewerExtractionStep(jobId, workerId);
  } catch (error) {
    if (error instanceof Error && error.name === "ProcessingOperationError") {
      throw new FatalError(error.message);
    }
    throw error;
  }
}

async function inspectPdfPageStep(
  jobId: string,
  workerId: string,
  pageNumber: number,
  pageCount: number,
): Promise<void> {
  "use step";
  const operations = await import("@/lib/processing-jobs/operations");
  try {
    return await operations.inspectPdfPageStep(jobId, workerId, pageNumber, pageCount);
  } catch (error) {
    if (error instanceof Error && error.name === "ProcessingOperationError") {
      throw new FatalError(error.message);
    }
    throw error;
  }
}

async function processQuizStep(jobId: string, workerId: string): Promise<void> {
  "use step";
  const operations = await import("@/lib/processing-jobs/operations");
  try {
    return await operations.processQuizStep(jobId, workerId);
  } catch (error) {
    if (error instanceof Error && error.name === "ProcessingOperationError") {
      throw new FatalError(error.message);
    }
    throw error;
  }
}

async function processActivityStep(jobId: string, workerId: string): Promise<void> {
  "use step";
  const operations = await import("@/lib/processing-jobs/operations");
  try {
    return await operations.processActivityStep(jobId, workerId);
  } catch (error) {
    if (error instanceof Error && error.name === "ProcessingOperationError") {
      throw new FatalError(error.message);
    }
    throw error;
  }
}

async function prepareExtractionStep(
  jobId: string,
  workerId: string,
  reviewerExtraction = false,
): Promise<ExtractionWorkflowPlan> {
  "use step";
  const operations = await import("@/lib/processing-jobs/operations");
  try {
    return await operations.prepareExtractionStep(jobId, workerId, reviewerExtraction);
  } catch (error) {
    if (error instanceof Error && error.name === "ProcessingOperationError") {
      throw new FatalError(error.message);
    }
    throw error;
  }
}

async function extractImageStep(jobId: string, workerId: string): Promise<void> {
  "use step";
  const operations = await import("@/lib/processing-jobs/operations");
  try {
    return await operations.extractImageStep(jobId, workerId);
  } catch (error) {
    if (error instanceof Error && error.name === "ProcessingOperationError") {
      throw new FatalError(error.message);
    }
    throw error;
  }
}

async function extractPdfChunkStep(
  jobId: string,
  workerId: string,
  chunkIndex: number,
  pageNumbers: readonly number[],
  reviewerExtraction = false,
): Promise<void> {
  "use step";
  const operations = await import("@/lib/processing-jobs/operations");
  try {
    return await operations.extractPdfChunkStep(jobId, workerId, chunkIndex, pageNumbers, reviewerExtraction);
  } catch (error) {
    if (error instanceof Error && error.name === "ProcessingOperationError") {
      throw new FatalError(error.message);
    }
    throw error;
  }
}

async function finalizeExtractionStep(
  jobId: string,
  workerId: string,
): Promise<void> {
  "use step";
  const operations = await import("@/lib/processing-jobs/operations");
  try {
    return await operations.finalizeExtractionStep(jobId, workerId);
  } catch (error) {
    if (error instanceof Error && error.name === "ProcessingOperationError") {
      throw new FatalError(error.message);
    }
    throw error;
  }
}

async function finalizeCanvasReviewerExtractionStep(
  jobId: string,
  workerId: string,
): Promise<void> {
  "use step";
  const operations = await import("@/lib/processing-jobs/operations");
  try {
    return await operations.finalizeCanvasReviewerExtractionStep(jobId, workerId);
  } catch (error) {
    if (error instanceof Error && error.name === "ProcessingOperationError") {
      throw new FatalError(error.message);
    }
    throw error;
  }
}

async function processAIReviewerStep(jobId: string, workerId: string): Promise<void> {
  "use step";
  const operations = await import("@/lib/processing-jobs/operations");
  try {
    return await operations.processAIReviewerStep(jobId, workerId);
  } catch (error) {
    if (error instanceof Error && error.name === "ProcessingOperationError") {
      throw new FatalError(error.message);
    }
    throw error;
  }
}

async function finalizeWorkflowFailureStep(
  jobId: string,
  workerId: string,
): Promise<void> {
  "use step";
  const operations = await import("@/lib/processing-jobs/operations");
  try {
    return await operations.finalizeWorkflowFailureStep(jobId, workerId);
  } catch (error) {
    if (error instanceof Error && error.name === "ProcessingOperationError") {
      throw new FatalError(error.message);
    }
    throw error;
  }
}
