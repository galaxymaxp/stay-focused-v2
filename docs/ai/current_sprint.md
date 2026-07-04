# Current Sprint

Last refreshed: 2026-07-04, Asia/Manila.

## Active Objective

Add camera capture and physical-device OCR validation after the gallery OCR
review path has landed.

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

## Active Phase 3C Scope

- Add camera capture without changing the OCR server contract. Completed in the
  mobile client.
- Validate gallery and camera OCR on a physical device with live Google Cloud
  OCR credentials.
- Keep manual paste and editable OCR review intact.

## Out Of Scope

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

## Proposed Phase 3C Sequence

1. Add a camera capture source option beside gallery import. Done.
2. Reuse the existing OCR upload and editable review path. Done.
3. Validate camera and gallery OCR on Expo Go with live Google credentials.
4. Keep the deterministic mocked Expo Web OCR smoke for regression coverage.
5. Defer scanned PDFs to Phase 3D.

## Exit Criteria

- Manual paste still works.
- Selected image OCR text remains editable before reviewer generation.
- Gallery and camera OCR route errors are shown safely in the mobile UI.
- No Google credentials or uploaded image bytes are exposed to mobile code,
  browser code, logs, or committed files.
- Scanned PDFs remain out of scope.
