# Current Sprint

Last refreshed: 2026-07-04, Asia/Manila.

## Active Objective

Add editable OCR text review plus gallery image selection while keeping manual
paste available.

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

## Active Phase 3B Scope

- Add a mobile gallery image-selection path.
- Submit selected PNG/JPEG images to `POST /api/ocr/extract`.
- Show extracted text in an editable review step before reviewer generation.
- Keep the existing manual paste path available.
- Keep OCR output editable before it enters the reviewer engine.

## Out Of Scope

- Scanned PDFs.
- Canvas integration.
- Reviewer persistence or Study Library work.
- Camera redesign.
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

## Proposed Phase 3B Sequence

1. Add image selection behind the existing reviewer input screen without
   removing manual paste.
2. Post selected images to the protected OCR route with the existing Supabase
   bearer token.
3. Render returned OCR text in an editable review step.
4. Send the edited text through the existing reviewer generation route.
5. Add mobile and API smoke coverage around the new client flow.

## Exit Criteria

- Manual paste still works.
- Selected image OCR text is editable before reviewer generation.
- OCR route errors are shown safely in the mobile UI.
- No Google credentials or uploaded image bytes are exposed to mobile code,
  browser code, logs, or committed files.
- Scanned PDFs remain out of scope.
