# Generalized PDF extraction

Last refreshed: 2026-07-29, Asia/Manila.

Stay Focused treats a PDF as a sequence of pages, not as a subject-specific
document. The extraction boundary does not recognize course names, expected
section headings, or academic vocabulary. It produces one source-faithful text
string for the existing general reviewer pipeline.

## Independent safety limits

- `OCR_PROVIDER_MAX_PDF_PAGES_PER_REQUEST` is fixed at 5. It is the Google
  Vision synchronous `files:annotate` boundary and is enforced again inside
  the Google adapter before a network call.
- `DOCUMENT_MAX_PDF_PAGES` is 40. It is the current hard synchronous document
  ceiling, not a provider limit. `DOCUMENT_MAX_PDF_PAGES` in the API
  environment may lower this value but cannot raise it above the hard ceiling.
- Durable processing jobs accept up to 100 total pages. After embedded-text
  inspection, at most 40 pages may require OCR. Native-text and confirmed blank
  pages do not consume that OCR allowance.
- `OCR_MAX_PDF_BYTES` remains 10 MiB. The existing limit was retained because
  the reproduced defect concerned page count, not upload memory.
- OCR chunk concurrency is 2. A 40-page all-scan document creates at most eight
  provider calls and four concurrency waves.
- Each provider request has a 12-second timeout and the document extraction
  operation has a 50-second deadline inside the route's 60-second maximum.
  A document deadline returns a retryable `503` response with `Retry-After`.

These limits intentionally do not claim unlimited PDF support. Forty pages
remains the conservative synchronous ceiling. Durable Workflow jobs may inspect
longer classroom decks without increasing worst-case OCR fan-out.

## Inspection and page classification

Upload validation checks MIME type, byte count, PDF signature, structural
parseability, encryption, and total page count. `pdf-lib` performs structural
validation and page copying. `pdfjs-dist` inspects every page for embedded text
and visible drawing/image operations.

Each page is classified independently:

- `native_text`: usable embedded text is present.
- `ocr`: embedded text is absent or unusable and visible content is present.
- `blank`: no embedded text or visible content was found.

The usability check is character- and corruption-based. It does not contain
topic dictionaries. If embedded-text inspection fails for an otherwise valid
PDF, the pipeline falls back safely to OCR for all pages instead of silently
assuming that the document is blank.

## Native-text path

Native pages are not sent to Google Vision. PDF.js text items are assembled in
content order, with detectable line and paragraph boundaries retained. Nulls,
line endings, and trailing whitespace are normalized only after per-page
extraction. Headings, lists, symbols, URLs, and exact terminology are not
summarized or rewritten.

## Scanned-page path

Only pages classified for OCR are copied into server-side PDFs. Each chunk has
at most five pages. Provider page numbers are local to the chunk (`1..5`), so
the extraction service stores an explicit mapping back to original document
page numbers. Results are remapped and merged deterministically; provider-level
combined text is ignored to prevent duplicated chunk text.

Bounded workers process at most two chunks concurrently. A failed chunk creates
explicit failed terminal results for each of its original pages. Other chunks
may finish, but partial text is not accepted as a reviewer source.

## Mixed documents

A mixed PDF uses embedded text for readable pages, OCR for only the remaining
visible pages, and an explicit blank result for confirmed blank pages. The
merged `pages` array records the terminal status and method for each page.
Diagnostics also record the document mode, native and OCR page counts, OCR
chunk count, and each chunk's original page numbers.

## Completeness guarantee

`verifyDocumentExtraction` accounts for every expected page and rejects:

- missing or duplicated page numbers;
- out-of-range or malformed page results;
- failed non-blank pages;
- an entirely blank document.

Confirmed blank pages are accepted without shifting later page numbers. A
document becomes reviewer-eligible only when all pages have a valid terminal
result and at least one page contains source text. Student-visible reviewer
input is assembled in original page order with stable blank-line separation;
internal page/chunk markers do not enter that text.

## Expansion path

The durable path now provides upload storage, queued jobs, checkpoints,
idempotency, polling, and result expiry. Raising the 40-page OCR allowance still
requires separate cost/runtime evidence; a durable document above that limit
fails before any OCR provider call with `pdf_ocr_page_limit_exceeded`.
