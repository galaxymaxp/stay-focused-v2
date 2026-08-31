export { OCR_PROVIDER_MAX_PDF_PAGES_PER_REQUEST } from "@stay-focused/ocr";

export const OCR_IMAGE_FORM_FIELD = "image";
export const OCR_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const OCR_PDF_FORM_FIELD = "pdf";
export const OCR_MAX_PDF_BYTES = 10 * 1024 * 1024;

// Synchronous and Canvas extraction stay bounded by one request runtime.
export const DOCUMENT_MAX_PDF_PAGES = 40;

// Durable jobs may inspect longer classroom documents because Vercel Workflow
// owns the work after HTTP 202 acceptance. Only pages without usable embedded
// text consume the OCR-page allowance.
export const DURABLE_DOCUMENT_MAX_PDF_PAGES = 100;
export const DURABLE_DOCUMENT_MAX_OCR_PAGES = 40;

export const OCR_PDF_CHUNK_CONCURRENCY = 2;
export const OCR_PROVIDER_REQUEST_TIMEOUT_MS = 12_000;
export const DOCUMENT_EXTRACTION_TIMEOUT_MS = 50_000;

export type PdfDocumentProcessingPath =
  | "synchronous"
  | "durable"
  | "unsupported";

export function getConfiguredDocumentMaxPdfPages(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): number {
  const configured = Number(environment.DOCUMENT_MAX_PDF_PAGES);
  if (!Number.isInteger(configured) || configured < 1) {
    return DOCUMENT_MAX_PDF_PAGES;
  }
  return Math.min(configured, DOCUMENT_MAX_PDF_PAGES);
}

export function getConfiguredDurableDocumentMaxPdfPages(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): number {
  const configured = Number(environment.DURABLE_DOCUMENT_MAX_PDF_PAGES);
  if (!Number.isInteger(configured) || configured < 1) {
    return DURABLE_DOCUMENT_MAX_PDF_PAGES;
  }
  return Math.min(configured, DURABLE_DOCUMENT_MAX_PDF_PAGES);
}

export function getConfiguredDurableDocumentMaxOcrPages(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): number {
  const configured = Number(environment.DURABLE_DOCUMENT_MAX_OCR_PAGES);
  if (!Number.isInteger(configured) || configured < 1) {
    return DURABLE_DOCUMENT_MAX_OCR_PAGES;
  }
  return Math.min(configured, DURABLE_DOCUMENT_MAX_OCR_PAGES);
}

export function selectPdfDocumentProcessingPath(
  pageCount: number,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): PdfDocumentProcessingPath {
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    return "unsupported";
  }
  if (pageCount <= getConfiguredDocumentMaxPdfPages(environment)) {
    return "synchronous";
  }
  return pageCount <= getConfiguredDurableDocumentMaxPdfPages(environment)
    ? "durable"
    : "unsupported";
}
