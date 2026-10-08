export type DocumentExtractionProgressStage =
  | "inspecting_document"
  | "extracting_native_text"
  | "preparing_ocr_chunks"
  | "extracting_ocr"
  | "verifying_pages"
  | "assembling_text"
  | "storing_result";

export function resolveExtractionProgressStage(
  stage: DocumentExtractionProgressStage,
  reviewerExtraction: boolean,
): DocumentExtractionProgressStage | "preparing_source" {
  return reviewerExtraction ? "preparing_source" : stage;
}
