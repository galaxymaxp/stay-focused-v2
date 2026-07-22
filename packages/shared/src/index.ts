export const APP_NAME = "Stay Focused V2";
export const APP_VERSION = "2.0.0";
export const COVERAGE_THRESHOLD = 0.8;
export const GROUNDING_THRESHOLD = 0.8;

export const STUDENT_CONTENT_LEAKAGE_DENYLIST = [
  "Stay Focused",
  "Stay Focused V2",
  "@stay-focused/engine",
  "the engine",
  "Stay Focused V2 engine",
  "reviewer pipeline",
  "generation pipeline",
  "internal pipeline",
  "pipeline stage",
  "source outline",
  "coverage report",
  "plannedSectionId",
  "sourceSectionId",
  "sourceCore",
  "source core",
  "repository",
  "monorepo",
  "provider adapter",
] as const;

export type Identifier = string;

export const PROCESSING_JOB_TYPES = [
  "document_extraction",
  "reviewer_generation",
] as const;

export type ProcessingJobType = (typeof PROCESSING_JOB_TYPES)[number];

export const PROCESSING_JOB_STATUSES = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancellation_requested",
  "cancelled",
  "expired",
] as const;

export type ProcessingJobStatus = (typeof PROCESSING_JOB_STATUSES)[number];

export const EXTRACTION_JOB_STAGES = [
  "accepting_upload",
  "inspecting_document",
  "extracting_native_text",
  "preparing_ocr_chunks",
  "extracting_ocr",
  "verifying_pages",
  "assembling_text",
  "storing_result",
] as const;

export type ExtractionJobStage = (typeof EXTRACTION_JOB_STAGES)[number];

export const REVIEWER_JOB_STAGES = [
  "preparing_source",
  "normalizing_source",
  "detecting_outline",
  "planning_sections",
  "generating_sections",
  "verifying_coverage",
  "retrying_sections",
  "assembling_reviewer",
  "storing_reviewer",
] as const;

export type ReviewerJobStage = (typeof REVIEWER_JOB_STAGES)[number];
export type ProcessingJobStage = ExtractionJobStage | ReviewerJobStage;

export interface ProcessingJobProgress {
  readonly completedUnits: number | null;
  readonly totalUnits: number | null;
  readonly unitLabel: "pages" | "sections" | null;
  readonly message: string;
}

export interface ProcessingJobSourceMetadata {
  readonly displayName: string;
  readonly sourceKind: "pdf" | "image" | "text";
  readonly mimeType: string;
  readonly byteSize?: number;
  readonly characterCount?: number;
  readonly pageCount?: number;
}

export interface ProcessingJobStatusView {
  readonly id: string;
  readonly jobType: ProcessingJobType;
  readonly status: ProcessingJobStatus;
  readonly stage: ProcessingJobStage;
  readonly progress: ProcessingJobProgress;
  readonly source: ProcessingJobSourceMetadata;
  readonly createdAt: string;
  readonly acceptedAt: string;
  readonly startedAt: string | null;
  readonly updatedAt: string;
  readonly completedAt: string | null;
  readonly failedAt: string | null;
  readonly cancellationRequestedAt: string | null;
  readonly errorCode: string | null;
  readonly safeErrorMessage: string | null;
  readonly retryable: boolean;
  readonly attemptCount: number;
  readonly resultAvailable: boolean;
  readonly retryOfJobId: string | null;
}

export interface AcceptedProcessingJobResponse {
  readonly ok: true;
  readonly data: ProcessingJobStatusView;
}

export interface ProcessingJobErrorResponse {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly retryable: boolean;
  };
}

export function isTerminalProcessingJobStatus(
  status: ProcessingJobStatus,
): boolean {
  return (
    status === "succeeded" ||
    status === "failed" ||
    status === "cancelled" ||
    status === "expired"
  );
}

export function isActiveProcessingJobStatus(
  status: ProcessingJobStatus,
): boolean {
  return !isTerminalProcessingJobStatus(status);
}
