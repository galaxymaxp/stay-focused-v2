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

export const GENERATED_ARTIFACT_TYPES = [
  "reviewer",
  "flashcards",
  "quiz",
  "summary",
  "practice_test",
  "study_guide",
] as const;

export type GeneratedArtifactType = (typeof GENERATED_ARTIFACT_TYPES)[number];

export const SOURCE_REVISION_KINDS = [
  "extracted_raw",
  "normalized",
  "user_edited",
  "regenerated",
  "imported_text",
  "canvas_resolved",
] as const;

export type SourceRevisionKind = (typeof SOURCE_REVISION_KINDS)[number];

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
  readonly sourceVersionId: string | null;
  readonly artifactType: GeneratedArtifactType | null;
  readonly reuseMode: "fresh" | "reuse_existing";
  readonly reusedFromJobId: string | null;
  readonly reuseCandidateArtifactVersionId: string | null;
  readonly provenance: ProcessingJobProvenance | null;
}

export interface ProcessingJobProvenance {
  readonly generationPolicyVersion: string;
  readonly engineVersion: string;
  readonly schemaVersion: string;
  readonly providerId: string;
  readonly settingsFingerprint: string;
  readonly language: string;
  readonly outputMode: string;
}

export interface AcceptedProcessingJobResponse {
  readonly ok: true;
  readonly data: ProcessingJobStatusView;
}

export interface ProcessingJobListPage {
  readonly jobs: readonly ProcessingJobStatusView[];
  readonly nextCursor: string | null;
}

export interface SourceVersionSummary {
  readonly id: string;
  readonly documentAssetId: string | null;
  readonly parentSourceVersionId: string | null;
  readonly revisionKind: SourceRevisionKind;
  readonly contentSha256: string;
  readonly characterCount: number;
  readonly normalizationVersion: string | null;
  readonly createdBy: "system" | "user";
  readonly createdAt: string;
  readonly supersededAt: string | null;
}

export interface SourceVersionRevisionResult extends SourceVersionSummary {
  readonly conflictDetected: boolean;
  readonly selectedAsActive: boolean;
}

export interface GeneratedArtifactProvenance {
  readonly sourceVersionId: string;
  readonly sourceContentSha256: string;
  readonly artifactType: GeneratedArtifactType;
  readonly generationPolicyVersion: string;
  readonly engineVersion: string;
  readonly schemaVersion: string;
  readonly providerId: string;
  readonly settingsFingerprint: string;
  readonly generationJobId: string | null;
  readonly createdAt: string;
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
