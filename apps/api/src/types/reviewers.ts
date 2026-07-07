import type { ReviewerOutput } from "@stay-focused/engine";
import type {
  SavedReviewerDetail as DbSavedReviewerDetail,
  SavedReviewerSourceMetadata,
  SavedReviewerSourceProvenanceSummary,
  SavedReviewerSummary,
} from "@stay-focused/db";
import type { ReviewerSourceStatusResponse } from "@/lib/reviewer-source-status";

export type {
  SavedReviewerSourceMetadata,
  SavedReviewerSourceProvenanceSummary,
  SavedReviewerSummary,
};

export type SavedReviewerDetail = DbSavedReviewerDetail<ReviewerOutput>;

export interface ReviewerListSuccessResponse {
  readonly ok: true;
  readonly reviewers: readonly SavedReviewerSummary[];
}

export interface ReviewerDetailSuccessResponse {
  readonly ok: true;
  readonly reviewer: SavedReviewerDetail;
}

export interface ReviewerSummarySuccessResponse {
  readonly ok: true;
  readonly reviewer: SavedReviewerSummary;
}

export interface ReviewerDeleteSuccessResponse {
  readonly ok: true;
}

export interface ReviewerSourceStatusSuccessResponse
  extends ReviewerSourceStatusResponse {
  readonly ok: true;
}

export interface ReviewerApiErrorResponse {
  readonly ok: false;
  readonly error: {
    readonly code: ReviewerApiErrorCode;
    readonly message: string;
  };
}

export type ReviewerApiErrorCode =
  | "unauthorized"
  | "invalid_json"
  | "invalid_request"
  | "invalid_title"
  | "invalid_source_metadata"
  | "invalid_reviewer_output"
  | "canvas_preview_session_missing"
  | "canvas_preview_session_expired"
  | "canvas_preview_session_not_found"
  | "canvas_preview_session_invalid"
  | "reviewer_not_found"
  | "reviewer_storage_not_configured"
  | "reviewer_storage_failed"
  | "source_snapshot_failed"
  | "source_snapshot_not_found"
  | "source_snapshot_ownership_mismatch"
  | "source_snapshot_required"
  | "source_snapshot_metadata_mismatch"
  | "source_snapshot_storage_failed";

export type ReviewerListResponse =
  | ReviewerListSuccessResponse
  | ReviewerApiErrorResponse;

export type ReviewerDetailResponse =
  | ReviewerDetailSuccessResponse
  | ReviewerApiErrorResponse;

export type ReviewerSummaryResponse =
  | ReviewerSummarySuccessResponse
  | ReviewerApiErrorResponse;

export type ReviewerDeleteResponse =
  | ReviewerDeleteSuccessResponse
  | ReviewerApiErrorResponse;

export type ReviewerSourceStatusApiResponse =
  | ReviewerSourceStatusSuccessResponse
  | ReviewerApiErrorResponse;
