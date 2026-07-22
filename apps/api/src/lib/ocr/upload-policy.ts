export { OCR_PROVIDER_MAX_PDF_PAGES_PER_REQUEST } from "@stay-focused/ocr";

export const OCR_IMAGE_FORM_FIELD = "image";
export const OCR_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const OCR_PDF_FORM_FIELD = "pdf";
export const OCR_MAX_PDF_BYTES = 10 * 1024 * 1024;

// Forty scanned pages require at most eight synchronous provider calls. With
// concurrency capped at two, this is a conservative ceiling for the route's
// 60-second runtime while allowing much larger native-text documents than the
// provider's per-call limit. An async storage/job path is required to raise it.
export const DOCUMENT_MAX_PDF_PAGES = 40;
export const OCR_PDF_CHUNK_CONCURRENCY = 2;
export const OCR_PROVIDER_REQUEST_TIMEOUT_MS = 12_000;
export const DOCUMENT_EXTRACTION_TIMEOUT_MS = 50_000;

export function getConfiguredDocumentMaxPdfPages(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): number {
  const configured = Number(environment.DOCUMENT_MAX_PDF_PAGES);
  if (!Number.isInteger(configured) || configured < 1) {
    return DOCUMENT_MAX_PDF_PAGES;
  }
  return Math.min(configured, DOCUMENT_MAX_PDF_PAGES);
}
