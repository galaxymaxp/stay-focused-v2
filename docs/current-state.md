# Current State

Last refreshed: 2026-07-05, Asia/Manila.

## Repository Baseline

- Branch: `main`
- Local baseline before Phase 3B: `6e91231 feat(ocr): add provider-agnostic OCR API boundary`
- Upstream status at refresh: `main...origin/main`, with no reported ahead or behind count
- Working tree before Phase 3A edits: clean

## Working Vertical Slice

The current product slice is:

```text
Sign in
-> paste source text, import a gallery image, take a camera photo, or import a PDF
-> review and edit source text
-> authenticated reviewer API
-> OpenAI generation
-> coverage, grounding, and leakage validation
-> reviewer preview
-> save to Study Library
-> list, open, rename, or delete saved reviewers
```

The Expo app supports email/password Supabase sign-in, restores sessions, and
sends the session bearer token to `POST /api/reviewer/generate`. The Next.js API
route verifies that token with Supabase, validates the pasted-text request,
creates the server-only OpenAI provider, runs the Stage 0 through Stage 6 engine
pipeline, and returns a reviewer preview payload. Expo Web is the fast
laptop-browser regression surface for this mobile flow.

Phase 3A also adds a protected server OCR route:

```text
Bearer-authenticated multipart image upload
-> MIME and size validation
-> provider-agnostic OCR interface
-> server-only Google Cloud Vision adapter
-> normalized pages, blocks, and lines
-> safe JSON response
```

Phase 3B adds the mobile client gallery call path, and Phase 3C extends the
same path to camera capture: selected or captured PNG/JPEG images can be
previewed, uploaded to `POST /api/ocr/extract`, and converted into editable
source text. The reviewer engine receives only the final edited text through
the existing reviewer route. Live iPhone Expo Go validation has passed against
the local Next.js API over LAN with server-only Google Cloud Vision OCR.

Phase 3D adds scanned-PDF ingestion as a validated synchronous small-batch MVP:

```text
Bearer-authenticated multipart PDF upload
-> PDF signature, size, parseability, encryption, and 1-5 page validation
-> Google Vision synchronous batchAnnotateFiles with inline PDF bytes
-> normalized page-ordered text
-> editable extracted-text review
-> existing reviewer generation route
```

PDF files stay server-bound, Google credentials remain server-only, Cloud
Storage is not used, and PDFs over five pages are rejected instead of silently
truncated. Live iPhone Expo Go validation has passed against the local Next.js
API over LAN with server-only Google Cloud Vision PDF OCR.

Phase 4 adds user-owned reviewer persistence:

```text
Validated reviewer output
-> authenticated reviewer CRUD API
-> caller-scoped Supabase client
-> reviewers table protected by RLS
-> Study Library list/open/rename/delete
```

The mobile app can save a generated reviewer after the existing reviewer
pipeline succeeds. Saved reviewers reopen in the existing `ReviewerPreview`
without regeneration. The library stores reviewer output and a small
allowlisted source-metadata object; raw pasted source text, OCR text, uploaded
images, PDFs, file paths, credentials, and private OCR artifacts are not stored
by the save flow.

## Completed Capabilities

- Monorepo foundation with API, mobile, engine, DB, Canvas, and shared packages.
- Provider-agnostic reviewer engine covering normalization, outline detection,
  planning, generation, coverage verification, grounding validation, bounded
  retry, leakage protection, and deterministic assembly.
- Default visible reviewer content is source-faithful; unsupported enrichment is
  excluded from default assembly.
- Extractive fallback for short OCR-style prose inside the engine.
- API-layer OpenAI provider boundary and server-only provider factory.
- Protected reviewer API route using Supabase bearer authentication.
- Local Expo Web CORS handling for `POST /api/reviewer/generate`.
- Expo reviewer generation screen and preview screen.
- Supabase email/password sign-in and session restore.
- Automated reviewer web smoke runner with persisted browser session, output
  assertions, safe service startup, and runner-owned cleanup.
- Provider-agnostic OCR contracts and deterministic normalization in
  `@stay-focused/ocr`.
- API-only Google Cloud Vision OCR adapter with injected fake-client tests.
- Protected `POST /api/ocr/extract` route for PNG/JPEG multipart image uploads.
- Expo gallery image selection and camera capture with preview, explicit text
  extraction, editable OCR text review, retry, and clear-image handling.
- Protected `POST /api/ocr/extract-pdf` route for one synchronous PDF upload,
  with a 10 MiB upload cap, 1-5 page validation, encrypted/malformed PDF safe
  errors, and Google Vision `batchAnnotateFiles` PDF OCR.
- Expo PDF selection through `expo-document-picker`, filename/type/size display,
  page-count display after server validation, editable extracted-text review,
  retry, and clear-PDF handling.
- Mocked PDF OCR web smoke with a fictional in-memory PDF fixture and real
  reviewer generation.
- Manual pasted text remains available as a separate source mode.
- Supabase `reviewers` migration with timestamps, source metadata, reviewer
  JSON output, section count, and owner-scoped RLS policies.
- Typed reviewer persistence shapes in `@stay-focused/db`.
- Protected `GET /api/reviewers`, `POST /api/reviewers`,
  `GET /api/reviewers/[id]`, `PATCH /api/reviewers/[id]`, and
  `DELETE /api/reviewers/[id]` routes using verified bearer auth and
  user-scoped Supabase access.
- Mobile Study Library list, open, rename, delete, refresh, create-new, and
  save-after-generation flows.
- Save-to-library flow preserves editable OCR-before-reviewer behavior and
  does not persist raw source text or OCR/upload bytes.

## Current Verification Baselines

Verified across the Phase 4 implementation pass:

- DB package typecheck: passed
- OCR package typecheck: passed
- OCR package build: passed
- OCR package normalization tests: 14 passed, 0 failed
- Google OCR fake-client tests: included in API tests
- API route, reviewer library, OCR route, and adapter tests: 94 passed, 0 failed
- Reviewer smoke-runner tests: 51 passed, 0 failed
- Engine build: passed
- Engine evaluations: 266 passed, 0 failed
- API typecheck: passed
- Mobile typecheck: passed
- Mobile OCR client, picker, source-flow, and Study Library API tests: 66
  passed, 0 failed
- Reviewer web smoke: passed with real reviewer generation
- Deterministic OCR web smoke: passed with mocked OCR response and real
  reviewer generation
- Deterministic PDF OCR web smoke: passed with a fictional PDF fixture, mocked
  OCR response, editable extracted text, and real reviewer generation
- Live Supabase Study Library validation: pending until the Phase 4 migration
  is applied to the target Supabase project.
- Phase 3C live iPhone camera/image OCR validation: passed with local Expo Go
  -> Next.js API over LAN -> server-only Google Cloud Vision -> editable OCR
  text review -> reviewer generation. Reviewer Ready appeared, source-faithful,
  coverage, and clean-output validation passed, and the generated reviewer
  contained at least one section and key point. See
  `docs/ai/phase3c-camera-ocr-validation-20260704.md`.
- Phase 3D live iPhone PDF OCR validation: passed with local Expo Go ->
  Next.js API over LAN -> server-only Google Cloud Vision synchronous PDF OCR
  -> editable OCR text review -> reviewer generation. A fictional, image-only,
  two-page scanned PDF was extracted in page order; edited OCR text was used as
  the reviewer source; Reviewer Ready appeared; source-faithful, coverage, and
  clean-output validation passed; and multiple reviewer sections and key points
  were generated. A separate PDF with more than five pages was rejected safely
  with the expected UI messages. See
  `docs/ai/phase3d-pdf-ocr-validation-20260704.md`.

Latest recorded unattended smokes during Phase 4 implementation:

- `npm run smoke:reviewer:web`: passed
- Authentication: persisted session
- Reviewer POST: HTTP 200
- Source-faithful, coverage, and clean-output statuses: passed
- `npm run smoke:ocr:web`: passed with mocked OCR response, editable extracted
  text, and real reviewer generation
- `npm run smoke:ocr-pdf:web`: passed with mocked PDF OCR response, editable
  extracted text, and real reviewer generation

## Known Local Test Command

```sh
npm run typecheck --workspace @stay-focused/db
npm run typecheck --workspace apps/api
npm run test --workspace apps/api
npm run typecheck --workspace apps/mobile
npm run test --workspace apps/mobile
npm run build --workspace @stay-focused/engine
npm run eval --workspace @stay-focused/engine
npm run test --workspace @stay-focused/ocr
npm run test:reviewer-web-smoke
npm run smoke:reviewer:web
npm run smoke:ocr:web
npm run smoke:ocr-pdf:web
```

The smoke runner starts or reuses the API and Expo Web, authenticates or restores
a persisted session, submits the fictional study-habits fixture, verifies
reviewer output and validation statuses, and cleans up runner-owned services.
The OCR web smoke uses the same auth/session infrastructure, injects a
non-production fictional image fixture, mocks only the OCR response, verifies
editable extracted text, and then generates a reviewer through the real reviewer
route. It does not validate live Google OCR.
The PDF OCR web smoke follows the same pattern with a fictional PDF fixture and
mocked PDF OCR response. It does not validate live Google PDF OCR.

## Current Limitations

- Gallery import and camera capture support PNG/JPEG images and editable
  extracted-text review.
- PDF import supports one server-bound PDF per request, 1-5 pages, and editable
  extracted-text review. Live iPhone PDF OCR validation has passed.
- Visible repeated headers and footers in scanned PDFs may be extracted as
  source text and can become reviewer sections. Users can remove them in the
  editable OCR text field; automatic repeated header/footer detection is
  deferred to a later OCR cleanup task.
- Google OCR credential paths are machine-specific local configuration and
  must remain server-only.
- Study Library implementation is code-complete locally, but the Phase 4
  migration still needs to be applied and validated against the target live
  Supabase project before the roadmap phase is marked complete.
- Canvas LMS integration is not implemented beyond the package boundary.
- Task generation and study schedule generation are not implemented.
- Google and Microsoft OAuth helper functions exist, but completed mobile OAuth
  redirect flows are not validated as finished product features.
- Production deployment and iPhone production readiness are pending.

## Immediate Next Task

Apply the Phase 4 `reviewers` migration to the target Supabase project and run
minimal live Study Library validation: save, list, open, rename, delete, and
cross-user denial. After that, mark Phase 4 complete and choose the next scoped
Phase 5 Canvas task. Repeated PDF header/footer cleanup remains a deferred OCR
cleanup candidate.

## Known Risks

- OneDrive-backed generated Next output can create stale reparse-point artifacts;
  the smoke runner clears the generated `apps/api/.next/server` directory before
  runner-owned API startup. During Phase 4 verification, one stale
  `apps/api/.next/types/cache-life.d.ts` generated reparse-point artifact had to
  be removed manually before rerunning the PDF OCR smoke.
- OpenAI cost, rate limits, and serverless latency can affect reviewer
  generation.
- OCR layout preservation is critical because reviewer quality depends on line,
  heading, and list boundaries.
- The server OCR contract is proven with fake clients, the Expo Web OCR flow is
  proven with a mocked OCR response, and live iPhone Google OCR for images and
  PDFs has passed on a correctly configured local API. Future live OCR remains
  dependent on machine-specific server credential setup, LAN reachability, and
  device state.
- Scanned-PDF support is implemented as a synchronous 1-5 page MVP. Visible
  repeated headers and footers may still need manual removal before generation
  until a later cleanup task adds automatic repeated header/footer detection.
- Reviewer persistence depends on the live Supabase `reviewers` migration and
  RLS policies being present. API tests use mocked clients and do not replace a
  live cross-user RLS validation.
- Mobile OAuth redirect completion still needs validation before it is claimed
  as complete.
- Secrets must remain server-only; mobile env files may contain only public
  `EXPO_PUBLIC_` values.
- Captured images, screenshots, credential files, OCR test artifacts, tokens,
  and private document OCR output must stay out of committed files.

## Documentation Ownership

- Canonical current-state document: `docs/current-state.md`
- Canonical roadmap document: `docs/roadmap.md`
- Canonical current-sprint document: `docs/ai/current_sprint.md`
- AI handoff: `docs/ai/handoff.md`
