import type { ReviewerOutput } from "@stay-focused/engine";

export interface ReviewerGenerateRequest {
  readonly sourceText: string;
  readonly sourceTitle?: string;
}

export interface ReviewerGenerateSuccessResponse {
  readonly ok: true;
  readonly reviewer: ReviewerOutput;
}

export interface ReviewerGenerateErrorResponse {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

export type ReviewerGenerateResponse =
  | ReviewerGenerateSuccessResponse
  | ReviewerGenerateErrorResponse;
