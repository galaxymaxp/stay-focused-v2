# Current Sprint

Last refreshed: 2026-07-05, Asia/Manila.

## Active Objective

Phase 4 Study Library and Persistence is complete and live validated. Phase 5A
Secure Canvas Connection and Capability Discovery is complete and live
validated: direct server-side Canvas validation used one developer-owned
personal access token, returned 17 courses for that token, and proved only that
user's available Canvas capabilities; remote Supabase Canvas table and RLS
validation passed; and the protected API
connect/status/courses/capabilities/disconnect lifecycle passed after
configuring a real app-owned `CANVAS_TOKEN_ENCRYPTION_KEY`. There is no
school-wide Canvas token.

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

## Completed Phase 3D Scope

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

## Completed Phase 4 Scope

- Add a Supabase `reviewers` migration for saved reviewer output, safe source
  metadata, section count, timestamps, and owner-scoped RLS.
- Add typed reviewer persistence shapes to `@stay-focused/db`.
- Add authenticated reviewer CRUD API routes under `/api/reviewers`.
- Use verified bearer auth and caller-scoped Supabase access for reviewer CRUD;
  do not use service-role CRUD for user library actions.
- Add a mobile Study Library screen with loading, empty, error, list, open,
  rename, delete, refresh, create-new, and logout paths.
- Add a save-to-library panel after successful reviewer generation.
- Preserve the proven reviewer engine, authenticated reviewer flow, image OCR,
  camera OCR, scanned PDF OCR, and editable OCR-before-reviewer behavior.
- Store only allowlisted source metadata and generated reviewer output; do not
  persist raw source text, OCR text, uploaded image/PDF bytes, file paths,
  credentials, tokens, or private document artifacts.
- Harden the PDF OCR web smoke so fast mocked OCR completion can satisfy the
  progress wait while the smoke still verifies the OCR POST shape and editable
  text.

## Completed Phase 5A Scope

- Replace the broad Phase 5 roadmap with Phase 5A through Phase 5F, plus future
  Grade Goal Planner and Student Intelligence groups.
- Add the Canvas source capability matrix under `docs/canvas`.
- Add ADR-006 through ADR-010 for Canvas academic graph synchronization,
  capability-based integration, Canvas credential storage, and grade-data
  separation, plus Canvas authentication phases.
- Expand `@stay-focused/canvas` into the canonical typed Canvas client.
- Add strict Canvas base-URL normalization, HTTPS enforcement, no credentials in
  URLs, bearer-token requests, timeout support, safe pagination, cross-origin
  pagination rejection, normalized errors, profile validation, course discovery,
  and Phase 5A capability probes.
- Add AES-256-GCM Canvas token encryption using
  `CANVAS_TOKEN_ENCRYPTION_KEY`.
- Add the `canvas_connections` and `canvas_capabilities` migration foundation
  with RLS enabled and no direct authenticated grants over encrypted credential
  fields.
- Add protected Canvas connection, courses, and capabilities API routes.
- Add the mobile Courses surface with disconnected/connected states, secure
  token entry, course refresh, disconnect confirmation, and compact capability
  summary.
- Use only per-user Canvas personal access tokens in Phase 5A. The existing
  `CANVAS_PERSONAL_ACCESS_TOKEN` name is developer-owned live-validation input,
  not a shared application credential.
- Keep Canvas content ingestion, file parsing, grade synchronization, source
  snapshots, and background sync out of Phase 5A.
- Keep Canvas OAuth out of Phase 5A; OAuth remains the future broad-production
  authorization path and requires an institution-approved Canvas Developer Key.

## Out Of Scope For Phase 3D Validation Documentation

- Automatic repeated header/footer detection or cleanup.
- Canvas integration.
- Reviewer persistence or Study Library work.
- Engine prompt changes.
- Generation-schema changes.
- Task generation.
- Study schedule generation.

## Out Of Scope For Phase 4

- Canvas LMS integration.
- Task generation.
- Study schedule generation.
- Background storage of uploads, OCR text, images, or PDFs.
- Service-role reviewer CRUD for user library operations.

## Out Of Scope For Phase 5A

- Full Canvas academic graph synchronization.
- Module-item, Page, file, announcement, discussion, quiz, grade, rubric, and
  submission persistence.
- Authorized Canvas file downloads.
- Parser/OCR selection for Canvas files.
- Reviewer generation from Canvas sources.
- Background synchronization.
- Grade goal planning.

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
- Live iPhone PDF OCR validation passed through Expo Go against the local
  Next.js API over LAN with real server-only Google Cloud Vision credentials.
- A fictional, image-only, two-page scanned PDF selected from Files displayed
  filename, `APPLICATION/PDF`, file size, and a detected page count of 2.
- Google Vision synchronous PDF OCR extracted both pages, preserved page order,
  and populated the editable OCR text field.
- The user edited the extracted text before generation, and reviewer generation
  used the edited OCR text as its source.
- Reviewer Ready appeared; source-faithful, coverage, and clean-output
  validation passed; and multiple reviewer sections and key points were
  generated.
- A separate PDF with more than five pages was rejected safely with `PDF has too
  many pages` and `PDF OCR supports up to 5 pages per request.`
- Visible repeated scanned-PDF footers were correctly extracted as source text
  and may become reviewer sections. Users can remove them in the editable OCR
  text field; automatic repeated header/footer detection is deferred.

## Phase 4 Results

- `packages/db/migrations/202607050001_create_reviewers.sql` creates the
  `reviewers` table, update timestamp trigger, list index, and owner-scoped RLS
  policies.
- The target Supabase project already has the Phase 4 migration applied.
- `apps/api` exposes save, list, open, rename, and delete routes for saved
  reviewers.
- Reviewer list responses return summaries only; full reviewer output is
  returned by create/open responses.
- The create route rejects client-supplied user IDs and unsupported metadata
  keys.
- The rename route allows title-only updates.
- Missing or inaccessible reviewer IDs return `reviewer_not_found`.
- The mobile Study Library reuses `ReviewerPreview` for saved reviewers and
  opens them without regeneration.
- Save metadata is limited to source mode, source character count, optional PDF
  page count, and optional source label.
- Live schema verification confirmed `public.reviewers` exists, RLS remains
  enabled, and the owner SELECT, INSERT, UPDATE, and DELETE policies use
  `auth.uid() = user_id`.
- Live cross-user validation used distinct authenticated users and no
  service-role reviewer CRUD. User A could create, list, and open a reviewer;
  User B's list excluded it and open, rename, and delete attempts returned safe
  `404 reviewer_not_found` responses without revealing owner data or row
  existence.
- Reverse isolation passed: User B could create and list a reviewer, User A
  could not list or open it, and User B could delete it.
- Cleanup passed: both fictional validation rows were deleted by their owning
  users, opening deleted rows returned safe `404 reviewer_not_found`, and no
  validation rows remained in owner lists.
- The reviewer `[id]` route typing fix updates the App Router context to
  Promise-based params and changes tests to match; runtime behavior is
  unchanged.
- Automated verification passed:
  - DB typecheck: passed
  - API typecheck/tests: passed; 94/94 tests
  - Mobile typecheck/tests: passed; 66/66 tests
  - OCR package tests: 14/14
  - Engine build/evals: passed; 266/266 eval cases
  - `git diff --check`: passed with line-ending warnings only
  - Reviewer, image OCR, and PDF OCR web smokes retain latest recorded passes;
    the final route fix was typing-only, so reviewer web smoke was not rerun.

## Phase 5A Results

- `docs/roadmap.md` now treats Canvas as a staged synchronization program, not
  a vague integration bucket.
- The roadmap now states that Phase 5A uses per-user Canvas personal access
  tokens, that there is no shared school-wide token, and that Canvas OAuth is
  required before broad public production authorization.
- `docs/canvas/canvas-source-capability-matrix.md` records connection, course,
  learning structure, activity, file/media, grades/performance, and
  communication/activity capabilities with permission-dependent limitations.
- `packages/canvas` exposes `getCurrentUser`, `listCourses`, and
  `probeCapabilities` through one strict client.
- `packages/db/migrations/202607050002_create_canvas_connections.sql` creates
  the Phase 5A storage foundation.
- `apps/api` encrypts Canvas personal access tokens before persistence and
  returns only safe connection metadata. Stored Canvas connections are scoped to
  the authenticated Stay Focused user.
- `apps/mobile` adds a Courses surface; tokens are secure text entry only,
  cleared after submission, and not persisted separately from the Supabase auth
  session.
- Automated verification passed:
  - Canvas package typecheck: passed
  - Canvas package build: passed
  - Canvas package tests: 20/20
  - DB package typecheck: passed
  - API typecheck/tests: passed; 110/110
  - Mobile typecheck/tests: passed; 70/70
  - Root workspace typecheck: passed after broad build regenerated Next
    `.next/types`
  - Root workspace build: passed
  - Workspace tests with scripts: passed; API 110/110, mobile 70/70, Canvas
    20/20, OCR 14/14
  - `git diff --check`: passed with CRLF warnings only
- Phase 5A.1 verification passed:
  - `node --test scripts/phase5a-live-canvas-validation.test.mjs`: 5/5
  - Direct live Canvas validation script: passed with sanitized output only
  - `npx supabase migration list`: remote history includes `202607050001` and
    `202607050002`
  - `npx supabase db push --dry-run`: listed only
    `202607050002_create_canvas_connections.sql` before application
  - `npx supabase db push`: applied `202607050002_create_canvas_connections.sql`
  - Remote schema check query: 13/13 Canvas migration checks passed
  - Required workspace typechecks/build/tests: passed after Phase 5A.1 changes
- Phase 5A.1 live Canvas validation passed through
  `scripts/phase5a-live-canvas-validation.mjs` without printing credential
  values or raw Canvas JSON:
  - Existing ignored local variable names detected: `CANVAS_BASE_URL` and
    `CANVAS_PERSONAL_ACCESS_TOKEN`
  - The token was a developer-owned personal access token for direct validation
    only, not a school-wide or application-wide credential
  - Requested live aliases `CANVAS_LIVE_BASE_URL`,
    `CANVAS_LIVE_PERSONAL_ACCESS_TOKEN`, and `CANVAS_ACCESS_TOKEN` were missing
  - Profile returned and normalized successfully
  - 17 courses were listed for that token
  - Enrollments, modules, assignment groups, and planner probes returned
    `available` for that user
  - Results do not prove institution-wide access and may differ per user,
    course, role, or institution
  - Live pagination was not exercised because the course count did not require
    a second page
- Phase 5A.1 migration deployment passed through `npx supabase` using the
  ignored local Supabase CLI project:
  - Dry-run listed only `202607050002_create_canvas_connections.sql`
  - Remote migration history now includes `202607050001` and `202607050002`
  - Read-only schema checks passed for both Canvas tables, RLS, encrypted
    columns, and no direct `anon`/`authenticated` CRUD or encrypted-column
    select grants
- Protected API validation passed after configuring a real app-owned
  `CANVAS_TOKEN_ENCRYPTION_KEY` in the ignored API-local environment file. The
  key format is Base64 encoded and must decode to exactly 32 bytes.
- Protected lifecycle result:
  - API health: passed
  - Supabase bearer authentication: acquired for the established smoke-test user
  - Connect: passed; Canvas profile validated before persistence
  - Encrypted persistence: passed; ciphertext, IV, authentication tag, and
    encryption version populated; no plaintext PAT column; ciphertext differed
    from the submitted PAT
  - Connection status: passed with safe metadata and no credential fields
  - Courses from stored credential: passed; 17 courses returned
  - Capabilities: passed; 25 records returned with statuses `available` and
    `not_tested`
  - Invalid replacement PAT: returned the stable token error and preserved the
    existing valid connection
  - Disconnect: passed; connection and dependent capabilities deleted, saved
    reviewers unchanged
  - Final state: disconnected
- Cross-user protection distinction: automated route tests passed for user
  scoping. Live second-user validation was unavailable because no separate
  second test-user credentials were present.

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
- Scanned PDF OCR supports one server-bound PDF per request, validates 1-5
  pages, and rejects oversized page counts safely.
- Live iPhone PDF OCR validates PDF selection, server-side Google Vision PDF
  OCR, editable extracted text, and reviewer generation with a fictional
  image-only scanned PDF.
- Authenticated users can save, list, open, rename, and delete their own saved
  reviewers.
- RLS denies cross-user saved-reviewer access in the live Supabase project.
- Saved reviewer metadata avoids raw source text, OCR output, uploads, file
  paths, and credentials.

## Next Objective

Phase 5B can begin when requested. The deferred header/footer cleanup task
remains separate.
