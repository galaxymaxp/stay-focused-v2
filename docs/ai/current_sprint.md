# Current Sprint

Last refreshed: 2026-07-04, Asia/Manila.

## Active Objective

Phase 3D scanned PDF ingestion is implemented. Live iPhone validation with a
fictional 1-2 page scanned PDF is pending.

## Completed Phase 3A Scope

- Audit current source and OCR-related files.
- Define typed OCR contracts outside the reviewer engine.
- Add a provider interface for OCR adapters.
- Add fake Google OCR client tests.
- Add a protected image OCR API route.
- Validate MIME type and request size.
- Preserve line breaks and layout boundaries needed by the reviewer engine.
- Document environment-variable names without values.
- Keep manual paste as a fallback.

## Completed Phase 3B Scope

- Add a mobile gallery image-selection path.
- Submit selected PNG/JPEG images to `POST /api/ocr/extract`.
- Show extracted text in an editable review step before reviewer generation.
- Keep the existing manual paste path available.
- Keep OCR output editable before it enters the reviewer engine.

## Completed Phase 3C Scope

- Add camera capture without changing the OCR server contract.
- Validate camera/image OCR on a physical iPhone through Expo Go with live
  Google Cloud Vision OCR from the local API.
- Keep manual paste and editable OCR review intact.
- Confirm edited OCR text is used as the reviewer source.
- Confirm Reviewer Ready appears after generation.
- Confirm source-faithful, coverage, and clean-output validation pass.

## Implemented Phase 3D Scope - Live Validation Pending

- Add `expo-document-picker` for one-file PDF selection from Files.
- Add `Paste text`, `Import image`, and `Import PDF` source modes.
- Show selected PDF filename, `APPLICATION/PDF`, size, and page count after
  server validation when available.
- Add authenticated multipart PDF upload to `POST /api/ocr/extract-pdf`.
- Validate PDF MIME type, signature, parseability, encrypted/password-protected
  files, upload size, and 1-5 page count on the API.
- Reject PDFs over five pages instead of extracting only the first five.
- Use Google Vision synchronous `batchAnnotateFiles` with inline PDF bytes,
  `DOCUMENT_TEXT_DETECTION`, and explicit page numbers.
- Normalize page-ordered PDF text into the existing editable extracted-text
  review field.
- Keep the existing paste, gallery-image, and camera-image flows unchanged and
  regression-tested.
- Add mocked PDF OCR web smoke with a fictional PDF fixture and real reviewer
  generation.

## Out Of Scope For Phase 3C

- Scanned PDFs.
- Canvas integration.
- Reviewer persistence or Study Library work.
- Engine prompt changes.
- Generation-schema changes.
- Task generation.
- Study schedule generation.

## Phase 3A Results

- `@stay-focused/ocr` owns provider-agnostic contracts and deterministic
  normalization.
- `apps/api/src/lib/ocr` owns Google Cloud Vision adapter and server factory
  code.
- `POST /api/ocr/extract` accepts bearer-authenticated multipart PNG/JPEG
  uploads using file field `image`.
- Image size is capped at 5 MiB.
- Server-only Google env names are documented without values.
- Normal tests use fake clients only and do not require live Google
  credentials.

## Phase 3B Results

- `apps/mobile` depends on Expo SDK-compatible `expo-image-picker`.
- Reviewer input now has separate `Paste text` and `Import image` modes.
- Gallery-selected PNG/JPEG images show a local preview and filename.
- The mobile OCR client posts authenticated multipart uploads to
  `POST /api/ocr/extract` without setting a manual multipart boundary.
- OCR text populates the editable source field and preserves line breaks.
- Reviewer generation still sends only edited source text and optional title to
  the existing reviewer API.
- Images are not uploaded to storage, persisted to a database, or sent to the
  reviewer engine.
- `npm run smoke:ocr:web` verifies the browser OCR flow with a mocked OCR
  response and real reviewer generation; live Google OCR remains unverified in
  this smoke.

## Phase 3C Results

- Real iPhone Expo Go camera/image OCR validation passed against the local
  Next.js API over LAN.
- Google Cloud Vision successfully extracted fictional study-habits text from
  the server-side OCR path.
- Extracted text remained editable before reviewer generation.
- Edited OCR text was sent through the existing reviewer route.
- Reviewer Ready appeared.
- Source-faithful, coverage, and clean-output validation passed.
- The generated reviewer contained at least one section and key point.
- The corrected Google credential setup stayed server-only.
- Credential paths are machine-specific and are not documented.
- No captured images, screenshots, OCR test artifacts, credential files, or
  private OCR output are committed.

## Phase 3D Results

- `@stay-focused/ocr` now accepts image and PDF OCR inputs while preserving the
  existing normalized document result shape.
- `apps/api/src/lib/ocr` keeps the existing Google image OCR method and adds a
  PDF path through `batchAnnotateFiles`.
- `POST /api/ocr/extract-pdf` accepts bearer-authenticated multipart PDF uploads
  using file field `pdf`.
- PDF upload size is capped at 10 MiB.
- PDF page count is detected with `pdf-lib`; encrypted or malformed PDFs return
  safe errors.
- Server-only Google credentials are reused; no Google credential is added to
  mobile code or `EXPO_PUBLIC_*` variables.
- Cloud Storage, background jobs, polling, and local PDF rasterization are not
  used in this phase.
- Automated verification passed:
  - OCR package tests: 14/14
  - API tests: 72/72
  - Mobile tests: 61/61
  - Smoke-runner tests: 51/51
  - Engine evals: 266/266
  - Reviewer, image OCR, and PDF OCR web smokes passed with mocked OCR where
    applicable.

## Phase 3C Completion Sequence

1. Add a camera capture source option beside gallery import. Done.
2. Reuse the existing OCR upload and editable review path. Done.
3. Correct server-only Google OCR credential configuration for the local API.
   Done; no paths or values recorded.
4. Validate camera/image OCR on Expo Go with live Google credentials. Done.
5. Keep the deterministic mocked Expo Web OCR smoke for regression coverage.
6. Move scanned PDFs to Phase 3D.

## Exit Criteria

- Manual paste still works.
- Selected image OCR text remains editable before reviewer generation.
- Gallery and camera OCR route errors are shown safely in the mobile UI.
- No Google credentials or uploaded image bytes are exposed to mobile code,
  browser code, logs, or committed files.
- Live iPhone OCR produces editable source text that can generate a reviewer.
- Reviewer Ready, source-faithful, coverage, and clean-output all pass on the
  live OCR flow.
- Scanned PDFs remain out of Phase 3C scope.
- Phase 3D is not complete until live iPhone PDF OCR validates PDF selection,
  server-side Google Vision PDF OCR, editable extracted text, and reviewer
  generation with a fictional 1-2 page scanned PDF.

## Next Objective

Live iPhone validation using a fictional 1-2 page scanned PDF.
