# Current Sprint

Last refreshed: 2026-07-04, Asia/Manila.

## Active Objective

Prove the OCR server boundary before building mobile capture UI.

## Sprint Scope

- Audit current source and OCR-related files.
- Define typed OCR contracts outside the reviewer engine.
- Add a provider interface for OCR adapters.
- Add fake Google OCR client tests.
- Add a protected image OCR API route.
- Validate MIME type and request size.
- Preserve line breaks and layout boundaries needed by the reviewer engine.
- Document environment-variable names without values.
- Keep manual paste as a fallback.

## Out Of Scope

- Scanned PDFs.
- Canvas integration.
- Reviewer persistence or Study Library work.
- Camera redesign.
- Gallery picker UI.
- Engine prompt changes.
- Generation-schema changes.
- Task generation.
- Study schedule generation.

## Proposed Phase 3A Sequence

1. Read `docs/architecture/engine-contract.md`, `apps/api/app/api/reviewer/generate/route.ts`,
   and source-normalization types in `packages/engine`.
2. Inventory any OCR-looking fixtures or helper code without treating them as
   implemented OCR ingestion.
3. Define a typed OCR request/result contract that preserves text, line order,
   page or image metadata, and safe diagnostics.
4. Add an OCR provider interface and a fake-client test harness before adding a
   real Google Cloud adapter.
5. Implement server-only Google Cloud OCR adapter wiring behind that interface.
6. Add a protected API route that validates auth, MIME type, and size before
   invoking OCR.
7. Add tests for auth rejection, missing file, unsupported MIME type, oversized
   payload, provider failure, and successful layout-preserving extraction.
8. Document required environment-variable names, including
   `GOOGLE_CLOUD_PROJECT_ID` and `GOOGLE_CLOUD_CREDENTIALS_JSON`.

## Exit Criteria

- Fake-client OCR tests pass without network access or credentials.
- The protected OCR API route returns typed extracted text for valid image
  input and safe errors for invalid input.
- OCR output preserves line breaks needed by the Stage 0 through Stage 6
  reviewer pipeline.
- No server secret is exposed to mobile code, browser code, logs, or committed
  files.
- Camera and gallery UI remain for the next sprint.
