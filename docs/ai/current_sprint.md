# Current Sprint

Last refreshed: 2026-07-06, Asia/Manila.

## Active Objective

Phase 4 Study Library and Persistence is complete and live validated. Phase 5A
Secure Canvas Connection and Capability Discovery is complete, live validated,
and audit-hardened: direct server-side Canvas validation used one
developer-owned personal access token, returned 17 courses for that token, and
proved only that user's available Canvas capabilities; remote Supabase Canvas
table and RLS validation passed; the protected API
connect/status/courses/capabilities/disconnect lifecycle passed after
configuring a real app-owned `CANVAS_TOKEN_ENCRYPTION_KEY`; and Phase 5A.2
closed the audit conditions for strict Base64 validation, atomic persistence,
two-user automated authorization evidence, redirect rejection, request
validation coverage, README status, and ADR numbering. Phase 5B.1 Academic
Graph Foundation is complete and remotely verified with academic graph tables,
composite ownership constraints, RLS, revoked direct client grants, typed Canvas
retrieval methods, and pagination tests. Phase 5B.2 Initial Full Academic Graph
Synchronization is complete and live validated as a manual synchronous route
with atomic per-course persistence, partial-run preservation, bounded
concurrency, sync-run persistence, and no background worker. Phase 5B.3A
course recovery hardening remains closed. Phase 5B.3B incremental academic
graph synchronization foundation is complete and live validated: unchanged
courses still fetch complete Canvas snapshots, but skip database graph
replacement when deterministic versioned fingerprints match. Phase 5B.3C1
conditional-request capability audit is complete as validation only: ETags were
present, `Last-Modified` was absent, no 304 responses were observed, and
ordinary GET behavior remains recommended for current Canvas sync endpoints.
Phase 5B.4A planner-item and announcement synchronization is complete as a
backend-only slice with documented live Canvas limitations. It uses ordinary
GET requests, a 30-day past and 120-day future sync window, service-role-only
persistence, safe scoped pruning, deterministic fingerprints, and
aggregate-only route diagnostics. Phase 5C.1 secure Canvas file inventory and
bounded selected-file ingestion is remotely and live validated for backend
behavior: sync inventories Canvas file metadata and bounded references, and the
protected ingestion route stores only eligible selected files in a private
bucket after fresh metadata, redirect, byte-limit, and signature checks. Remote
migrations `202607060003` and `202607060004` are applied, Supabase advisors
were reviewed, private Storage controls passed, and second-run ingestion kept
stable object pointers with zero additional bytes stored. It does not parse,
OCR, preview, or generate reviewers from Canvas file contents. The synchronous
metadata sync route remains over its configured 60-second runtime budget in
local production-build validation, so production-runtime readiness is not
claimed.
There is no school-wide Canvas token.

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
- Resolve duplicate ADR-004 numbering by renaming Fast Testing Surfaces to
  ADR-011 while keeping ADR-004 as the engine pipeline decision.
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
- Add Phase 5A.2 hardening: strict canonical Base64 validation for Canvas
  encryption keys and stored encrypted payload fields, atomic connection and
  capability persistence through a service-role-only RPC, database capability
  ownership consistency, redirect rejection, realistic two-user authorization
  tests, request validation coverage, and ADR numbering cleanup.
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

## Completed Phase 5B.1 Scope

- Added `202607050004_create_canvas_academic_graph.sql`.
- Created `canvas_courses`, `canvas_modules`, `canvas_module_items`,
  `canvas_pages`, `canvas_assignment_groups`, and `canvas_assignments`.
- Added stable Canvas identity constraints and synchronization metadata.
- Enforced ownership with composite foreign keys across `user_id`,
  `canvas_connection_id`, and `course_id`.
- Enabled RLS on every new table and kept direct `anon`/`authenticated` grants
  revoked for the Canvas academic graph.
- Added `@stay-focused/canvas` types and methods for courses, modules, module
  items, Pages, Page detail, assignment groups, and assignments.
- Strengthened shared pagination behavior to reject repeated links and page
  limits instead of returning partial prefixes.
- Added Canvas pagination and redirect-security regression coverage for all new
  collection methods.
- Added `scripts/phase5b1-academic-graph-verification.sql` for remote rollback
  verification with fake User A/User B data.
- Applied and verified the remote migration; Phase 5A grants and RLS remained
  unchanged.

## Out Of Scope For Phase 5B.1

- Full synchronization orchestration.
- Scheduled jobs or background workers.
- Mobile course screens.
- API routes for starting synchronization.
- Announcements, discussions, planner data, quiz metadata, and files/media
  ingestion.
- Incremental sync cursor logic beyond schema-ready metadata.
- Destructive stale-record cleanup.
- Reviewer generation from Canvas content.

## Completed Phase 5B.2 Scope

- Added `202607050005_add_canvas_academic_sync.sql`.
- Added `canvas_sync_runs` with ownership, mode/status constraints, progress
  counters, resource counts, sanitized failure fields, RLS, revoked direct
  client grants, service-role grants, and non-stale active-run protection.
- Added service-role RPCs for beginning, updating, and finishing sync runs.
- Added `replace_canvas_course_academic_snapshot` for atomic per-course graph
  replacement.
- Added `202607050006_fix_canvas_connection_rpc_ambiguity.sql` after live
  validation exposed an ambiguous Phase 5A connection replacement conflict
  target. The repair was forward-only; the historical migration was not edited.
- Added `POST /api/canvas/sync` using the existing bearer authentication
  boundary.
- Added `apps/api/src/lib/canvas-sync.ts` for orchestration outside the route.
- Added `apps/api/src/lib/canvas-sync-normalize.ts` for explicit Canvas-to-DB
  payload normalization.
- Reused the existing encrypted Canvas connection loading and API-only PAT
  decryption boundary.
- Fetched active courses, modules, module items, Pages with detail bodies,
  assignment groups, and assignments.
- Limited concurrency to 2 courses, 3 module-item collections, and 3 Page-detail
  requests.
- Added route/orchestration tests for authentication, ownership, full sync,
  pagination reaching persistence, atomicity, idempotency, partial runs,
  overlap rejection, stale-run recovery, and error sanitization.
- Added mobile `syncCanvasAcademicGraph()` service support without UI,
  navigation, automatic calls, or screens.
- Added `scripts/phase5b2-full-sync-verification.sql`.
- Applied and verified the remote migrations.
- Recreated the encrypted stored Canvas connection through
  `PUT /api/canvas/connection` using ignored local credentials and the
  established smoke-test user.
- Ran two live syncs through `POST /api/canvas/sync`; both returned HTTP 200
  with sanitized partial results.

## Out Of Scope For Phase 5B.2

- Scheduled synchronization.
- Background queues or workers.
- Cron jobs.
- Incremental cursors.
- Canvas webhooks.
- Announcements.
- Discussions.
- Planner items.
- Files or attachments.
- Submissions.
- Grades.
- Reviewer generation from Canvas.
- Source snapshots.
- Mobile synchronization screens.
- Automatic sync on app launch.
- Synchronization notifications.
- Cross-course planning.
- Deletion of courses missing from the active-course response.

## Completed Phase 5B.3B Scope

- Added `202607050008_add_canvas_incremental_sync_state.sql`.
- Added `canvas_course_sync_states` with one state row per user, Canvas
  connection, and Canvas course identity.
- Added `apps/api/src/lib/canvas-sync-fingerprint.ts` with deterministic
  canonicalization and version `canvas-course-snapshot-v1`.
- Added optional `POST /api/canvas/sync` mode parsing for `full` and
  `incremental`, with `full` as the default and safe request validation.
- Added changed/unchanged/failed course accounting where
  `succeeded = changed + unchanged`.
- Added service-role-only RPCs for mode-aware run creation, changed-course
  graph replacement plus state advancement, unchanged-course recording, and
  failed-course state metadata.
- Updated API orchestration so incremental mode skips graph replacement for
  unchanged courses and preserves prior graph/fingerprint state on fetch
  failures.
- Updated mobile Canvas service parsing and tests without adding UI.
- Added remote rollback verification through
  `scripts/phase5b3b-incremental-sync-verification.sql`.
- Applied and verified the remote migration.
- Ran one full live baseline and two immediate incremental live validations
  with aggregate-only output.

## Out Of Scope For Phase 5B.3B

- Endpoint conditional requests.
- ETag or Last-Modified support.
- Canvas delta cursors.
- Reduced Canvas request-count synchronization.
- Secondary Canvas resources beyond the Phase 5B.4A planner-item and
  announcement slice.
- Scheduled synchronization, background workers, cron jobs, or webhooks.
- Mobile synchronization screens.
- Reviewer generation from Canvas.
- Treating the four Page-listing failures as successful empty-Page courses.

## Completed Phase 5B.4A Scope

- Added typed Canvas client support for planner items and announcements.
- Used ordinary authenticated GET requests, deterministic date serialization,
  repeated `context_codes[]`, trusted pagination, redirect rejection, and the
  existing timeout/retry protections.
- Retrieved planner items for the synchronized user's course contexts only.
- Retrieved announcements one course at a time with bounded course-level
  failure isolation.
- Added `canvas_planner_items` and `canvas_announcements` plus indexes,
  uniqueness, RLS, restricted grants, and service-role-only snapshot RPCs.
- Added deterministic normalized planner and announcement fingerprints.
- Added insert/update/unchanged/pruned accounting and safe scoped pruning only
  after complete authoritative snapshots.
- Extended protected `POST /api/canvas/sync` with aggregate planner and
  announcement counts and stable sanitized failure codes.
- Extended mobile Canvas sync response parsing and tests without adding UI.
- Added remote rollback verification through
  `scripts/phase5b4a-planner-announcements-verification.sql`.

## Out Of Scope For Phase 5B.4A

- Discussion entries, discussion replies, and general discussion-topic
  synchronization.
- Quiz details and quiz-question metadata.
- Planner-note creation, planner-note editing, and planner-override mutation.
- Submission, grade, rubric, and feedback synchronization.
- File, attachment, announcement-attachment, and media ingestion.
- Canvas webhooks, scheduled synchronization, background jobs, resumable jobs,
  queues, mobile synchronization UI, source-selection UI, notifications, and
  reviewer generation from Canvas data.

## Completed Phase 5C.1 Scope

- Added typed Canvas file metadata listing and single-file metadata lookup.
- Added bounded Canvas file download support with manual redirects,
  off-origin bearer stripping, unsafe target rejection, content-length checks,
  stream byte caps, and timeouts.
- Added centralized Canvas file ingestion policy using existing OCR limits:
  10 MiB per file, 3 files per request, and 15 MiB aggregate stored bytes.
- Added `canvas_files`, `canvas_file_references`, and
  `canvas_file_ingestion_results` plus service-role-only inventory/result RPCs.
- Added private `canvas-source-files` storage bucket configuration and
  restrictive policies denying direct `anon`/`authenticated` object access.
- Extended `POST /api/canvas/sync` with file metadata inventory and module,
  Page, assignment, and announcement reference discovery.
- Added protected `POST /api/canvas/files/ingest` for selected owned file-row
  ids with fresh metadata lookup, bounded download, content validation,
  private storage upload, stale object cleanup, and sanitized terminal results.
- Extended mobile sync response parsing for file aggregate counts without UI.
- Added focused Canvas client, API normalizer, API route-harness, and mobile
  service tests.
- Applied and remotely verified migrations `202607060003` and `202607060004`.
- Reviewed Supabase security and performance advisors; fixed new Phase 5C.1
  foreign-key index warnings with `202607060004`.
- Validated private `canvas-source-files` Storage behavior: public,
  anonymous, authenticated arbitrary, and cross-user object access denied;
  trusted server access worked.
- Validated protected live ingestion with two stored eligible files, one
  metadata-only result, and second-run stability with zero additional bytes
  stored.
- Measured the synchronous sync route at 72.294 seconds and 65.355 seconds
  against `maxDuration = 60`; no route-duration increase was made because
  deployment support was not verified.

## Out Of Scope For Phase 5C.1

- Text extraction, parsing, OCR, transcription, or summarization from Canvas
  file bytes.
- PowerPoint, Word, spreadsheet, HTML, caption, and media parsers.
- Mobile file-selection/source-selection UI.
- Reviewer generation from Canvas file contents.
- Background or resumable ingestion jobs.

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
  - Canvas package tests: 22/22
  - DB package typecheck: passed
  - API typecheck/tests: passed; 146/146
  - Mobile typecheck/tests: passed; 70/70
  - Root workspace typecheck: passed after broad build regenerated Next
    `.next/types`
  - Root workspace build: passed
  - Workspace tests with scripts: passed; API 146/146, mobile 70/70, Canvas
    22/22, OCR 14/14
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
  hardened key format is canonical padded Base64 and must decode to exactly 32
  bytes.
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
- Phase 5A.2 hardening result:
  - `202607050003_harden_canvas_connection_persistence.sql` applied remotely.
  - `replace_canvas_connection_with_capabilities` exists and is executable by
    the server-side service-role workflow only.
  - Composite capability ownership foreign key is validated.
  - RLS remains enabled and direct `anon`/`authenticated` Canvas table access
    remains revoked.
  - Automated two-user authorization validation: PASS.
  - Live second-user authorization validation: not run.
  - Focused and full verification passed, including API 146/146, mobile 70/70,
    Canvas 22/22, and OCR 14/14 workspace tests.

## Phase 5B.2 Results

- Focused pre-live verification passed:
  - Canvas package typecheck/build/tests: passed; 30/30 tests.
  - DB package typecheck: passed.
  - API typecheck/build/tests: passed; 158/158 tests.
  - Mobile typecheck/tests: passed; 76/76 tests.
- Remote migration history includes `202607050005` and `202607050006`.
- Remote rollback SQL verification passed for sync-run ownership constraints,
  active-run protection, stale-run recovery, atomic course replacement,
  duplicate prevention, stable internal IDs, malformed relationship rollback,
  cross-user mutation rejection, RLS, direct grants, public RPC revocation,
  service-role execution, and unchanged Phase 5A/Phase 5B.1 protections.
- Protected Canvas connection recreation passed through
  `PUT /api/canvas/connection`.
- The encrypted Canvas connection remains stored for future testing.
- First live sync:
  - HTTP 200
  - Status `partial`
  - Duration 57.576 seconds
  - 17 courses discovered
  - 13 courses succeeded
  - 4 courses failed with sanitized `canvas_course_fetch_failed`
  - 27 modules
  - 311 module items
  - 459 Pages
  - 18 assignment groups
  - 25 assignments
  - 0 running sync rows after completion
- Second live sync:
  - HTTP 200
  - Status `partial`
  - Duration 52.403 seconds
  - Resource counts stable
  - Duplicate identities: 0
  - Internal identities stable
  - First-sync timestamps stable
  - Last-sync timestamps advanced
  - 0 running sync rows after completion
- The live run finished inside the current 60-second synchronous route duration,
  but the first run was close to the limit. Larger accounts may need resumable
  or background synchronization in a later phase.

## Phase 5B.3A Results

- Added `202607050007_add_canvas_sync_course_results.sql`.
- Added `record_canvas_sync_course_result` for sanitized per-course sync
  diagnostics behind the service-role boundary.
- Added operation-specific course failure codes and bounded transient retries:
  2 retries after the initial attempt, capped `Retry-After`, finite Canvas
  request timeouts, and no retries for non-retryable 4xx, malformed, redirect,
  pagination, ownership, or persistence failures.
- Remote migration history includes `202607050007`.
- Remote rollback SQL verification passed through
  `scripts/phase5b3a-recovery-verification.sql`.
- First hardened live sync:
  - HTTP 200
  - Status `partial`
  - Duration 52.318 seconds
  - 17 courses discovered
  - 13 courses succeeded
  - 4 courses failed with sanitized `canvas_course_pages_failed`
  - Failed operation: Page listing
  - Failure category: `resource_not_found`
  - HTTP class: 4xx
  - Retryable: false
  - Retry attempts: 0
  - 27 modules
  - 311 module items
  - 459 Pages
  - 18 assignment groups
  - 25 assignments
  - 0 running sync rows after completion
- Second hardened live sync:
  - HTTP 200
  - Status `partial`
  - Duration 50.622 seconds
  - Failure categories stable
  - Duplicate identities: 0
  - Internal identities stable
  - First-sync timestamps stable
  - Last-sync timestamps advanced
  - 0 running sync rows after completion
- The four previously generic failures are confirmed permanent Canvas/resource
  limitations for the required Page-listing operation. No incomplete course
  snapshots were persisted or pruned.
- Next recommended Canvas phase after Phase 5B.3B: Phase 5B.3C conditional
  Canvas fetching and network-efficiency hardening.

## Phase 5B.3B Results

- Added `202607050008_add_canvas_incremental_sync_state.sql` and updated
  `packages/db/src/types.ts`.
- Added private deterministic course-snapshot fingerprints from the normalized
  persistence payload. Fingerprints include persisted course graph content and
  exclude local sync timestamps, internal UUIDs, user IDs, connection IDs,
  PATs, authorization data, Canvas URLs, and raw errors.
- Added `begin_canvas_sync_run_with_mode`,
  `replace_canvas_course_academic_snapshot_with_sync_state`,
  `record_canvas_course_snapshot_unchanged`, and
  `record_canvas_course_snapshot_failed` behind the service-role boundary.
- Remote migration history includes `202607050008`.
- Remote rollback SQL verification passed through
  `scripts/phase5b3b-incremental-sync-verification.sql`.
- Automated verification passed: Canvas typecheck/build/tests 33/33, DB
  typecheck, API typecheck/build/tests 176/176, mobile typecheck/tests 79/79,
  root typecheck 7/7 with 4 cached and 3 fresh, root build 7/7 with 4 cached
  and 3 fresh, workspace tests API 176/176, mobile 79/79, Canvas 33/33, OCR
  14/14, and `git diff --check` with line-ending warnings only.
- Full live baseline:
  - HTTP 200
  - Status `partial`
  - Duration 50.725 seconds
  - 17 courses discovered
  - 13 courses changed/succeeded
  - 0 courses unchanged
  - 4 courses failed with sanitized `canvas_course_pages_failed`
  - 13 graph replacements
  - 0 running sync rows after completion
- First incremental live sync:
  - HTTP 200
  - Status `partial`
  - Duration 47.502 seconds
  - 17 courses discovered
  - 13 courses unchanged
  - 0 courses changed
  - 4 courses failed with sanitized `canvas_course_pages_failed`
  - 0 graph replacements for unchanged courses
  - State checks advanced
  - Failed fingerprints preserved
  - Unchanged graph timestamps stable
  - 0 running sync rows after completion
- Second incremental live sync:
  - HTTP 200
  - Status `partial`
  - Duration 46.750 seconds
  - 13 courses unchanged
  - 0 courses changed
  - 4 courses failed with sanitized `canvas_course_pages_failed`
  - Deterministic fingerprints confirmed
  - Duplicate identities: 0
  - Internal identities stable
  - Failed graphs preserved
  - 0 running sync rows after completion
- Incremental mode reduced database graph replacement work for unchanged
  courses but did not reduce Canvas request volume. Complete snapshots are
  still fetched before fingerprint comparison.

## Phase 5B.3C1 Results

- Completed Canvas conditional-request capability audit as live validation
  only. Production synchronization behavior was not changed.
- Used an ignored local harness under `.local/` with the stored encrypted
  Canvas connection loaded through the API-side service-role and decryption
  boundary.
- Audited active course listing, modules, module items, Pages, Page details,
  assignment groups, and assignments.
- Successful course samples: 3 local labels; real course identities were not
  printed or committed.
- Baseline ordinary GET requests: 10.
- Primary conditional requests: 10.
- Controlled conditional subtests: 20.
- ETags were present and stable on every audited endpoint family.
- `Last-Modified` was absent on every audited endpoint family.
- Primary If-None-Match requests returned HTTP 200 with full bodies on every
  audited endpoint; no 304 responses were observed.
- Baseline body bytes: 154,503.
- Conditional body bytes: 154,503.
- Body-byte reduction: 0%.
- Baseline duration: 3.467 seconds.
- Conditional duration: 3.993 seconds.
- One paginated Page collection included a later page; any future conditional
  design would need per-page validator and pagination state.
- Page-list validators cannot prove Page-detail body stability.
- Module-item lists, assignment groups, and assignments require separate state
  from their neighboring collection families.
- Four Page-listing failures remained `canvas_course_pages_failed`,
  `resource_not_found`, non-retryable, not 304, and did not advance graph or
  fingerprint state.
- Focused verification passed because production source was not changed:
  Canvas typecheck/build/tests 33/33, API typecheck/build/tests 176/176, and
  mobile typecheck/tests 79/79.
- Decision: Outcome C, no useful validator support observed. Continue ordinary
  GET behavior for all currently synchronized endpoint families.
- The next implemented Canvas slice was Phase 5B.4A planner-item and
  announcement synchronization.

## Phase 5B.4A Results

- Added `202607060001_add_canvas_planner_announcements.sql`,
  `202607060002_harden_canvas_planner_announcement_triggers.sql`, and updated
  `packages/db/src/types.ts`.
- Added `canvas_planner_items` and `canvas_announcements`, with service-role
  snapshot RPCs that validate ownership and use controlled search paths.
- Added planner and announcement Canvas client methods, route orchestration,
  normalization tests, route tests, and mobile response parser updates.
- Remote migration history includes `202607060001` and `202607060002`.
- Remote rollback SQL verification passed through
  `scripts/phase5b4a-planner-announcements-verification.sql`.
- Automated verification passed: Canvas typecheck/build/tests 35/35, DB
  typecheck, API typecheck/build/tests 183/183, mobile typecheck/tests 79/79,
  root typecheck 7/7, root build 7/7 after clearing a generated API `.next`
  artifact from the known OneDrive/Next issue, workspace tests API 183/183,
  mobile 79/79, Canvas 35/35, OCR 14/14, and `git diff --check` with CRLF
  warnings only.
- First protected live run:
  - HTTP 200
  - Status `partial`
  - Duration 72.370 seconds
  - 17 courses discovered
  - 13 existing graph courses succeeded
  - 4 existing graph courses failed with sanitized `canvas_course_pages_failed`
  - 37 planner items discovered and inserted
  - 27 announcements discovered
  - 13 announcement courses succeeded
  - 4 announcement courses failed
  - 19 announcements inserted
  - 0 retry attempts
  - 0 running sync rows after completion
- Second protected live run:
  - HTTP 200
  - Status `partial`
  - Duration 63.048 seconds
  - 37 planner items unchanged
  - 19 announcements unchanged
  - Stable planner and announcement identities
  - Duplicate planner identities: 0
  - Duplicate announcement identities: 0
  - Unnecessary planner updates: 0
  - Unnecessary announcement updates: 0
  - Unexpected planner pruning: 0
  - Unexpected announcement pruning: 0
  - Existing failed course graphs preserved
  - Failure categories stable
  - 0 running sync rows after completion
- Sanitized live failure counts remained
  `canvas_course_pages_failed: 4` and
  `canvas_announcement_persistence_failed: 4`.
- A final response-shape revalidation after hiding internal diagnostic fields
  repeated the protected sync twice and confirmed strict aggregate output,
  stable identities, zero duplicates, zero unnecessary updates, zero
  unexpected pruning, and zero running sync rows.
- Verdict: partial due documented permanent live Canvas limitations. The
  implementation preserved data and completed the safe independent scopes.

## Phase 5C.1 Results

- Added migration
  `202607060003_add_canvas_file_ingestion_foundation.sql` and updated DB types.
- Added `apps/api/src/lib/canvas-file-policy.ts`,
  `apps/api/src/lib/canvas-file-normalize.ts`,
  `apps/api/src/lib/canvas-file-ingestion.ts`, and
  `apps/api/app/api/canvas/files/ingest/route.ts`.
- Added `parse5` to the API workspace for structured bounded HTML reference
  parsing instead of ad hoc string matching.
- Automated verification passed:
  - Canvas tests: 50/50
  - Canvas typecheck: passed
  - API tests: 184/184
  - API typecheck: passed
  - Mobile tests: 79/79
  - Mobile typecheck: passed
  - OCR tests: 14/14
  - Root typecheck/build/tests: 7/7 workspaces
- Remote migration history includes `202607060003` and `202607060004`.
- Remote schema/RLS/RPC/grant/storage verification passed for the Phase 5C.1
  objects and private bucket.
- Supabase security advisors produced no unresolved new Phase 5C.1 security
  finding. Supabase performance advisors identified new Phase 5C.1 foreign-key
  index warnings, fixed by `202607060004`; remaining warnings were pre-existing
  or fresh unused-index noise.
- Protected live metadata sync returned HTTP 200 `partial` twice. File
  inventory discovered 52 files, inserted 52 on the first run, classified 52 as
  unchanged on the second run, recorded 15 references, and left zero running
  sync rows. The route exceeded the configured 60-second budget in both
  local-production-build measurements.
- Protected live ingestion requested 3 selected rows, stored 2 eligible files,
  recorded 1 metadata-only result, stored 92,950 aggregate bytes, verified
  private objects, denied public access, and invoked no OCR/extraction. The
  second ingestion returned 2 unchanged and 1 metadata-only, stored 0 bytes,
  produced no duplicate object versions, and left zero running sync rows.

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

Phase 5A hardening is complete, Phase 5A quality conditions are closed, Phase
5B.1 academic graph foundation is complete, and Phase 5B.2 initial full
academic graph synchronization is complete and live validated. Phase 5B.3A
course recovery hardening is complete and live validated. Phase 5B.3B
incremental academic graph synchronization foundation is complete and live
validated. Phase 5B.3C1 conditional-request capability audit is complete and
does not support Phase 5B.3C2 implementation for the audited endpoints. The
Phase 5B.4A planner-item and announcement synchronization slice is complete
with documented live Canvas limitations. Phase 5C.1 file inventory and bounded
ingestion foundation is remotely and live validated with a documented
synchronous route-duration limitation. The recommended next roadmap task is
Phase 5C.2A - User-Facing Canvas Sync And Source-Selection Loop: manual mobile
Canvas sync action, last-sync status and safe aggregate counts, clear
partial-failure messaging, narrow Canvas source-selection preview, and editable
source text before reviewer generation. Parser/OCR work should be added only
as required for that narrow loop. The deferred header/footer cleanup task
remains separate.
