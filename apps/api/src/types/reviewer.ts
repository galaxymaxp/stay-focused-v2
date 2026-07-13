import type { ReviewerOutput } from "@stay-focused/engine";

export interface ReviewerGenerateRequest {
  readonly sourceText: string;
  readonly sourceTitle?: string;
  readonly canvasPreviewSessionId?: string;
  readonly canvasCourseId?: string;
  readonly canvasItemIds?: readonly string[];
  readonly canvasResolutionFingerprint?: string;
}

export interface ReviewerGenerateSuccessResponse {
  readonly ok: true;
  readonly reviewer: ReviewerOutput;
  readonly sourceSnapshotId?: string;
}

export interface ReviewerGenerateErrorResponse {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly diagnostic?: {
      readonly failingStage?: string;
      readonly failingSectionTitle?: string;
      readonly validationReason?: string;
      readonly retryCount?: number;
      readonly validationCategory?: string;
      readonly failedField?: string;
    };
  };
}

export type ReviewerGenerateResponse =
  | ReviewerGenerateSuccessResponse
  | ReviewerGenerateErrorResponse;
