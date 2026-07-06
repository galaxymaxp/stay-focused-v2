# Roadmap

Last refreshed: 2026-07-05, Asia/Manila.

## Phase 1 - Foundation And Reviewer Engine

Status: Complete

Purpose: Establish the repository foundation and a tested reviewer-generation
engine before product UI and integrations depend on it.

Major deliverables:

- Monorepo foundation
- Stage 0 through Stage 6 pipeline
- OpenAI-compatible provider boundary
- Coverage verification
- Grounding validation
- Leakage protection
- Deterministic evaluations
- Short-prose fallback for OCR-style pasted text

Exit criteria:

- Engine build passes.
- Aggregate deterministic evals pass with 266 cases.
- Default visible reviewer output is source-faithful.
- Unsupported enrichment is excluded from default assembly.

Immediate dependency: None.

## Phase 2 - Authenticated Reviewer Vertical Slice

Status: Complete

Purpose: Prove a real user can sign in, submit source text, call the protected
API, generate with OpenAI, and preview validated reviewer output.

Major deliverables:

- Supabase email/password authentication
- Protected reviewer API route
- Expo reviewer input and preview
- OpenAI-backed generation
- Local Expo Web CORS
- Unattended authenticated browser smoke
- Persistent smoke session and output assertions

Exit criteria:

- `POST /api/reviewer/generate` requires a valid Supabase bearer token.
- Expo reviewer generation screen can submit pasted text and render a preview.
- `npm run smoke:reviewer:web` passes against the local API and Expo Web.
- Immediate repeat and session-only smoke flows are supported.

Immediate dependency: Phase 1 complete.

## Phase 3 - OCR And Source Ingestion

Status: Complete

Purpose: Replace paste-only source intake with a server-side OCR contract that
preserves layout enough for the reviewer engine to stay source-faithful.

Completed in Phase 3A:

- Audit existing source and OCR-related contracts.
- Provider-agnostic OCR boundary.
- Server-only Google Cloud OCR adapter.
- Fake-client OCR tests.
- Protected image OCR API route.
- MIME type and size validation.
- Preserved line, list, and layout boundaries.

Completed in Phase 3B:

- Gallery image selection through Expo Image Picker.
- Selected-image preview and filename display.
- Authenticated upload to `POST /api/ocr/extract`.
- Editable extracted-text review before reviewer generation.
- Manual paste fallback as a separate source mode.
- Deterministic Expo Web OCR smoke using a mocked OCR response and real
  reviewer generation.

Completed in Phase 3C:

- Camera capture through the existing Expo image-picker boundary.
- Captured-image preview and generated filename display.
- Reuse of the authenticated `POST /api/ocr/extract` upload path.
- Editable extracted-text review before reviewer generation.
- Live physical-device validation on iPhone Expo Go with the local Next.js API
  over LAN and server-only Google Cloud Vision OCR.
- Verified that edited OCR text is used as the reviewer source.
- Verified Reviewer Ready, source-faithful, coverage, and clean-output passed
  for the live OCR-generated reviewer.

Completed in Phase 3D:

- Synchronous small-batch PDF OCR ingestion for one PDF per request.
- PDF selection through Expo Document Picker.
- Authenticated upload to `POST /api/ocr/extract-pdf`.
- Server-side PDF validation for MIME type, `%PDF-` signature, parseability,
  encrypted/password-protected files, upload size, and 1-5 page count.
- Google Vision `DOCUMENT_TEXT_DETECTION` through synchronous
  `batchAnnotateFiles` with inline PDF bytes and explicit pages.
- Page-ordered normalized text with editable extracted-text review before
  reviewer generation.
- PDFs over five pages are rejected, not silently truncated.
- PDF files stay server-bound; Google credentials remain server-only.
- No Cloud Storage, background jobs, polling, local PDF rasterization, Poppler,
  or Ghostscript in this phase.
- Mocked PDF OCR web smoke using a fictional PDF fixture and real reviewer
  generation.
- Live physical-device validation on iPhone Expo Go with the local Next.js API
  over LAN and server-only Google Cloud Vision PDF OCR.
- Verified that a fictional, image-only, two-page scanned PDF extracted both
  pages in page order.
- Verified that edited PDF OCR text is used as the reviewer source.
- Verified Reviewer Ready, source-faithful, coverage, and clean-output passed
  for the live PDF OCR-generated reviewer.
- Verified that a separate PDF with more than five pages is rejected safely with
  the expected UI messages instead of being silently truncated.

Remaining Phase 3 deliverables:

- None.

Exit criteria:

- A protected OCR API route accepts image input, validates it, invokes the OCR
  provider boundary, and returns typed extracted text without exposing secrets.
- Fake-client tests prove success, error, size, MIME, and layout-preservation
  behavior.
- The reviewer input flow can use user-reviewed extracted text while manual
  paste remains available.
- Live iPhone camera/image OCR validation passes without exposing Google
  credentials to mobile code or committed files.
- Live iPhone PDF OCR validation passes using a fictional 1-2 page scanned PDF,
  editable OCR text, and reviewer generation.

Immediate dependency: Phase 2 complete.

Known limitation: visible repeated headers and footers in scanned PDFs may be
extracted as source text and become reviewer sections. Users can remove them in
the editable OCR text field. Automatic repeated header/footer detection is
deferred to a later OCR cleanup task.

Immediate next task after Phase 3D: Phase 4 Study Library and Persistence.
Phase 4 is complete and live validated; the next product phase is Phase 5
Canvas Integration.

## Phase 4 - Study Library And Persistence

Status: Complete

Purpose: Save generated study content to a user-owned library so reviewers can
be reopened, renamed, and managed across sessions.

Major deliverables:

- Supabase reviewer storage
- User-owned RLS policies
- Source metadata
- Reviewer list
- Open, rename, and delete actions
- Study Library as the saved-content destination

Implemented foundations:

- `reviewers` Supabase migration with owner-scoped RLS policies, timestamps,
  section count, source metadata, and reviewer JSON output.
- Typed reviewer table shapes in `@stay-focused/db`.
- Authenticated Next.js reviewer CRUD API using the caller's bearer token and
  user-scoped Supabase access instead of service-role CRUD.
- Mobile Study Library screen with list, open, rename, delete, refresh, and
  return-to-generator actions.
- Save-to-library action after reviewer generation, preserving editable
  OCR-before-reviewer behavior and storing only safe source metadata.
- Regression-hardened PDF OCR web smoke wait for fast mocked OCR completion.
- Live Supabase verification confirmed the migration is already applied, the
  `public.reviewers` table exists, RLS remains enabled, and owner SELECT,
  INSERT, UPDATE, and DELETE policies use `auth.uid() = user_id`.
- Live cross-user validation used two distinct Supabase auth users. User A
  created, listed, and opened a reviewer; User B's list excluded it and open,
  rename, and delete attempts returned safe `404 reviewer_not_found` responses.
- Reverse isolation was also validated: User B created and listed a reviewer;
  User A could not list or open it; User B deleted it.
- Cleanup removed both fictional validation reviewers through their owning
  users, and follow-up owner-list/open checks confirmed no validation rows
  remained.
- The Next.js reviewer detail route typing fix aligns `[id]` route params with
  the Promise-based App Router context without changing runtime behavior.

Exit criteria:

- Authenticated users can save, list, open, rename, and delete their own
  reviewers.
- RLS prevents cross-user access.
- Reviewer metadata preserves enough source context for later study workflows.
- Automated API, mobile, DB typecheck, engine, OCR, and browser smoke
  regression checks pass.
- Live migrated Supabase validation proves save, list, open, rename, delete,
  and cross-user denial against the deployed `reviewers` table.

Immediate dependency: Phase 3 source-ingestion contracts are stable enough to
store source metadata consistently. All Phase 4 external validation gates are
complete.

## Phase 5 - Canvas Synchronization Foundation

Status: In progress. Phase 5A is complete and live validated; Phase 5B.1
academic graph foundation is complete; Phase 5B.2 initial full academic graph
synchronization is complete and live validated; Phase 5B.3A course recovery
hardening is complete and live validated; Phase 5B.3B incremental persistence
is complete and live validated; Phase 5B.3C1 conditional-request capability
audit is complete; Phase 5B.4A planner-item and announcement synchronization
is complete with documented live Canvas limitations; Phase 5C through Phase 5F
remain planned and must not be collapsed into a single generic Canvas
integration task.

Purpose: Bring Canvas LMS data into Stay Focused as a permission-aware academic
graph that can feed the existing OCR, normalization, provenance, reviewer, and
future schedule/grade-planning boundaries without creating a parallel
generation path.

Immediate dependency: completed Phase 4 persistence and source metadata, plus a
stable source-ingestion contract from Phase 3.

Credential-source boundary: Canvas client, synchronization, and capability
logic must remain independent of whether credentials came from a manually
entered personal access token or a later OAuth flow. The intended model remains
conceptually similar to:

```text
CanvasCredentialProvider
|-- PersonalAccessTokenCredential
`-- OAuthCredential
```

### Phase 5A - Secure Canvas Connection And Capability Discovery

Status: Complete, live validated, and audit-hardened. Direct server-side Canvas
validation, remote Supabase migration/RLS validation, protected API
connect/status/courses/capabilities/disconnect lifecycle, strict encrypted
payload validation, atomic connection/capability persistence, redirect
rejection, and automated two-user authorization tests have passed.

Scope:

- Canvas instance URL
- Canvas personal access token
- API-side credential validation
- AES-256-GCM encrypted credential storage
- Protected connection-status API
- Disconnect support
- Course discovery
- Initial capability registry
- Safe endpoint probes
- User-visible connection and course states

#### Phase 5A Authentication Model

Phase 5A uses user-generated Canvas personal access tokens for development,
capstone demonstrations, controlled testing, and initial user-controlled Canvas
connections. Each Stay Focused user supplies their own personal access token.
There is no shared school-wide token.

Each token is scoped to the Canvas account that generated it and remains subject
to the permissions configured by the institution and course. A token cannot
access school-wide Canvas data, cannot bypass locked, hidden, unpublished, or
permission-restricted content, and must never be shared between Stay Focused
users.

Personal access tokens must be:

- validated before persistence
- encrypted server-side with AES-256-GCM
- stored per Stay Focused user
- excluded from API responses
- excluded from logs and errors
- removable through disconnect
- treated as revocable credentials

Personal access token entry is acceptable for the capstone, development, and
controlled initial deployment, but it is not the preferred permanent
authorization flow for a broad public multi-user release.

Completion criteria:

- A signed-in Stay Focused user can connect Canvas.
- The Canvas profile is validated.
- The token is encrypted before persistence.
- The token is never returned to mobile.
- Courses can be listed.
- Supported and unsupported Canvas capabilities are recorded honestly.

Validation status as of 2026-07-05:

- Direct Canvas HTTPS validation passed through the server-side validation
  script using one developer-owned personal access token from existing ignored
  local credential names.
- Canvas profile returned and normalized successfully.
- Course listing returned 17 courses.
- These results prove only the validating user's available Canvas capabilities;
  they do not prove institution-wide course or endpoint access.
- Live pagination was not exercised because the account did not require a
  second page; automated tests cover ordered pagination and cross-origin
  rejection.
- Enrollments, modules, assignment groups, and planner probes returned
  `available` for that user; capability availability may differ per user,
  course, role, or institution.
- Supabase migration `202607050002_create_canvas_connections.sql` applied
  remotely and read-only checks verified both tables, RLS, and no direct
  `anon`/`authenticated` access to encrypted token columns.
- `CANVAS_TOKEN_ENCRYPTION_KEY` is configured locally as a canonical padded
  Base64 key that decodes to exactly 32 bytes. The helper accepts surrounding
  environment whitespace, rejects malformed or non-canonical key material, and
  validates only when encryption or decryption is used.
- Protected API lifecycle validation passed against `http://localhost:3000`:
  Supabase bearer authentication was acquired for an established smoke-test
  user, `PUT /api/canvas/connection` validated the Canvas profile before
  persistence, 17 courses were returned, 25 capability records were created,
  and connection metadata responses excluded credential fields.
- Encrypted persistence was verified through a server-side database query:
  one connection row existed for the selected user, ciphertext, IV,
  authentication tag, and encryption version were populated, no plaintext PAT
  column was present, ciphertext differed from the submitted PAT, and capability
  rows were scoped to the same user and connection.
- `GET /api/canvas/connection`, `GET /api/canvas/courses`, and
  `GET /api/canvas/capabilities` passed from the stored encrypted credential.
  Capability statuses were `available` and `not_tested`.
- Invalid replacement PAT validation returned the stable token error while
  preserving the existing valid connection.
- `DELETE /api/canvas/connection` removed the selected user's connection and
  dependent capability rows, left saved reviewers unchanged, and final
  connection status returned the disconnected state.
- Automated route tests cover cross-user scoping for connection, courses,
  capabilities, and disconnect behavior. A live second-user validation was not
  run because no separate second test-user credentials were available.
- Phase 5A.2 hardening adds strict canonical Base64 validation for encrypted
  payload fields, the atomic `replace_canvas_connection_with_capabilities` RPC,
  a composite capability ownership foreign key, explicit redirect rejection,
  expanded request validation coverage, and realistic two-user route tests.
- Remote migration `202607050003_harden_canvas_connection_persistence.sql` is
  applied. Read-only checks passed for RPC existence, revoked public execution,
  service-role execution, validated ownership constraint, RLS, and revoked
  direct grants.

### Phase 5B - Academic Graph Synchronization

Status: In progress. Phase 5B.1 is complete as a database and typed Canvas API
foundation. Phase 5B.2 initial full synchronization is complete as a manual,
synchronous route with atomic per-course persistence. Phase 5B.3A recovery
hardening and Phase 5B.3B deterministic incremental persistence are complete.
Phase 5B.3C1 found no useful 304 support for the currently synchronized
endpoint families, so production conditional fetching remains unsupported.
Phase 5B.4A planner-item and announcement synchronization is complete as a
backend-only extension.

#### Phase 5B.1 - Academic Graph Foundation

Status: Complete and remotely verified.

Implemented:

- Supabase migration `202607050004_create_canvas_academic_graph.sql`.
- Tables: `canvas_courses`, `canvas_modules`, `canvas_module_items`,
  `canvas_pages`, `canvas_assignment_groups`, and `canvas_assignments`.
- Stable Canvas identity constraints for courses, modules, module items, Pages,
  assignment groups, and assignments.
- Composite ownership constraints across `user_id`, `canvas_connection_id`,
  and `course_id`.
- RLS on every academic graph table.
- Direct `anon` and `authenticated` grants revoked to preserve the Phase 5A
  service-role persistence boundary.
- Typed Canvas client methods for courses, modules, module items, Pages, Page
  detail, assignment groups, and assignments.
- Pagination tests for all new collection methods, including later-page
  failures, repeated-link loop protection, and cross-origin next-link
  rejection.

Deferred from Phase 5B.1:

- Full synchronization orchestration
- Scheduled jobs and background workers
- Mobile course screens
- Sync-start API routes
- Announcements, discussions, planner data, quiz metadata, and files/media
  ingestion
- Incremental sync cursors and destructive stale cleanup
- Reviewer generation from Canvas content

Recommended next phase after Phase 5B.3B: Phase 5B.3C - Conditional Canvas
fetching and network-efficiency hardening.

#### Phase 5B.2 - Initial Full Academic Graph Synchronization

Status: Complete, remotely verified, and live validated.

Scope:

- Courses
- Modules
- Ordered module items
- Canvas Pages
- Assignment groups
- Assignments
- Page detail bodies
- Existing assignment quiz metadata fields
- Sync-run history
- Bounded synchronous orchestration
- Per-course atomic replacement
- Stale-child cleanup after complete course snapshots only
- Partial account-sync handling
- Mobile service function without UI

Required source relationships:

```text
Course
|-- Module
|   `-- Module item
|       |-- Page
|       |-- Assignment
|       |-- External URL
|       `-- External tool
|-- Assignment group
`-- Assignment
```

Exit criteria:

- Canvas material is stored as related academic entities, not as a flat file
  list.
- Module order, Page relationships, assignment-group relationships, nullable
  dates, HTML fields, and existing assignment quiz metadata are preserved.
- The authenticated user can manually trigger synchronization through
  `POST /api/canvas/sync`.
- Persistence is atomic per course rather than for the whole Canvas account.
- A partial account sync may commit successful courses while preserving failed
  courses.
- Empty complete snapshots remove stale child rows for that course only.
- Incomplete course fetches and failed RPC calls do not prune existing graphs.
- Repeated full synchronization is idempotent and preserves internal row IDs.
- No background or scheduled synchronization exists yet.
- No mobile synchronization screen exists yet.

Validation:

- Remote migrations `202607050005_add_canvas_academic_sync.sql` and
  `202607050006_fix_canvas_connection_rpc_ambiguity.sql` are applied.
- Remote rollback verification passed through
  `scripts/phase5b2-full-sync-verification.sql`.
- Live protected connection recreation passed through
  `PUT /api/canvas/connection`.
- Two live sync calls returned HTTP 200 with sanitized partial results:
  17 courses discovered, 13 succeeded, 4 failed, 27 modules, 311 module items,
  459 Pages, 18 assignment groups, and 25 assignments.
- The second live sync introduced no duplicates, preserved internal
  identities, kept first-sync timestamps stable, advanced last-sync timestamps,
  and left zero running sync rows.

#### Phase 5B.3A - Course Failure Diagnostics And Recovery Hardening

Status: Complete.

Scope:

- Added migration `202607050007_add_canvas_sync_course_results.sql`.
- Added sanitized per-course sync diagnostics through
  `record_canvas_sync_course_result`.
- Preserved manual synchronous sync and atomic per-course persistence.
- Added operation-specific failure codes and bounded transient retries.
- Preserved course/module-item/Page-detail concurrency limits.
- Confirmed the four previous generic failures are Page-listing
  `resource_not_found` 4xx permanent Canvas limitations, not implementation
  defects.

Validation:

- Remote migration history includes `202607050007`.
- Remote rollback verification passed through
  `scripts/phase5b3a-recovery-verification.sql`.
- Two hardened live sync calls returned HTTP 200 partial results:
  17 courses discovered, 13 succeeded, 4 failed with sanitized
  `canvas_course_pages_failed`, 27 modules, 311 module items, 459 Pages,
  18 assignment groups, and 25 assignments.
- Retry attempts in live validation: 0, because the four failures are
  non-retryable 4xx resource-not-found responses.
- Duplicate identities remained 0, internal identities remained stable, and
  zero sync rows remained running.

#### Phase 5B.3B - Incremental Synchronization Foundation

Status: Complete, remotely verified, and live validated.

Scope:

- Added migration `202607050008_add_canvas_incremental_sync_state.sql`.
- Added `canvas_course_sync_states` with one row per user, Canvas connection,
  and Canvas course identity.
- Added deterministic course-snapshot fingerprints from the normalized
  persistence payload, with version `canvas-course-snapshot-v1`.
- Added `full` and `incremental` sync modes and `unchanged` course results.
- Added service-role-only RPCs for mode-aware run creation, changed-course
  graph replacement plus state advancement, unchanged-course recording, and
  failed-course metadata.
- Preserved the Phase 5A credential boundary and Phase 5B.2 per-course
  atomicity.

Validation:

- Remote migration history includes `202607050008`.
- Remote rollback verification passed through
  `scripts/phase5b3b-incremental-sync-verification.sql`.
- A full live baseline returned HTTP 200 partial with 17 courses discovered,
  13 changed/succeeded, 0 unchanged, 4 Page-listing failures, 13 graph
  replacements, and zero running sync rows.
- Two immediate incremental live runs returned HTTP 200 partial with 13
  unchanged courses, 0 changed courses, 4 Page-listing failures, 0 graph
  replacements for unchanged courses, deterministic fingerprints, stable graph
  timestamps, no duplicate identities, and zero running sync rows.

Deferred from Phase 5B.3B:

- Endpoint-level conditional requests
- ETag and Last-Modified support
- Secondary Canvas resources
- Scheduled/background synchronization
- Mobile synchronization UI
- Reviewer generation from Canvas content

#### Phase 5B.3C - Conditional Canvas Fetching And Network-Efficiency Hardening

Status: Audit complete for Phase 5B.3C1. Production conditional fetching is
not implemented.

Scope:

- Investigate Canvas endpoint support for conditional requests.
- Add ETag or Last-Modified handling only where reliable per endpoint.
- Measure whether request count, bandwidth, or duration improves.
- Preserve deterministic persistence and safe failure behavior from Phase
  5B.3B.
- Avoid claiming delta synchronization where Canvas cannot provide a reliable
  cursor.

Phase 5B.3C1 audit result:

- A local ignored harness audited active course listing, modules, module items,
  Pages, Page details, assignment groups, and assignments using the stored
  encrypted Canvas connection.
- Production sync behavior was unchanged; no sync runs, graph writes,
  validator persistence, raw response caching, or migrations were added.
- ETags were present and stable across all audited endpoint families.
- `Last-Modified` was absent across all audited endpoint families.
- If-None-Match primary conditional requests returned HTTP 200 with full
  bodies for every audited endpoint; no 304 responses were observed.
- Baseline and conditional body bytes were both 154,503, so observed body-byte
  reduction was 0%.
- One paginated Page collection included a later page, confirming that any
  future conditional design would need independent per-page validator and
  pagination state.
- Page-list validators cannot be treated as proof that Page-detail bodies are
  unchanged.
- Module lists, module-item lists, assignment groups, and assignments require
  separate state if future evidence ever supports conditional requests.
- The four known Page-listing failures remained
  `canvas_course_pages_failed`, `resource_not_found`, non-retryable, not 304,
  and did not advance graph or fingerprint state.

Decision:

- Outcome C: no useful validator support was observed.
- Do not implement Phase 5B.3C2 for the currently synchronized endpoint
  families.
- Continue ordinary GET behavior for courses, modules, module items, Pages,
  Page details, assignment groups, and assignments.
- Do not invent validators and do not skip requests based only on
  course-level fingerprint state.

#### Phase 5B.4 - Secondary Canvas Resource Synchronization

Status: Phase 5B.4A complete, remotely verified, and live validated with
documented permanent Canvas limitations.

Scope:

- Select each secondary Canvas resource family only after explicit product and
  security review.
- Continue using the per-user credential boundary, service-role persistence,
  sanitized diagnostics, and failure-preservation rules established in Phase
  5A through Phase 5B.3C1.
- Keep production conditional fetching out unless future evidence shows
  reliable 304 behavior.
- Continue not treating Page-listing 404 failures as successful empty-Page
  collections.

##### Phase 5B.4A - Planner Items And Announcements

Status: Complete, remotely verified, and live validated with a documented
partial result.

Scope:

- Canvas planner-item retrieval through `GET /api/v1/planner/items`.
- Canvas announcement retrieval through per-course
  `GET /api/v1/announcements` calls.
- A deterministic rolling sync window: 30 days in the past and 120 days in the
  future, captured from one run timestamp.
- Typed Canvas client methods, repeated `context_codes[]` query serialization,
  ordinary authenticated GET behavior, trusted pagination, redirect rejection,
  and bounded transient retry behavior.
- Normalized planner and announcement payloads with deterministic source
  fingerprints and without unrestricted nested Canvas payload retention.
- Tables `canvas_planner_items` and `canvas_announcements`.
- Service-role-only snapshot RPCs for planner and per-course announcement
  persistence.
- Insert/update/unchanged/pruned accounting and safe scoped pruning only after
  a complete authoritative snapshot is fetched.
- Aggregate-only route summaries and mobile service parsing without UI.

Validation:

- Remote migrations `202607060001` and `202607060002` are applied.
- Remote rollback verification passed through
  `scripts/phase5b4a-planner-announcements-verification.sql`.
- Protected live validation used the existing encrypted Canvas connection.
  The first run returned HTTP 200 `partial`, discovered 37 planner items and
  27 announcements, inserted 37 planner items and 19 announcements, preserved
  four known Page-listing limitations, and left zero running sync rows.
- The second run returned HTTP 200 `partial`, classified 37 planner items and
  19 announcements as unchanged, preserved stable identities, produced zero
  duplicates, zero unnecessary updates, zero unexpected pruning, stable failure
  categories, and zero running sync rows.
- The four known Page-listing failures remain non-retryable
  `canvas_course_pages_failed` `resource_not_found` 4xx limitations.
- Four announcement persistence scopes remain partial for the same unavailable
  course graphs and are reported as sanitized
  `canvas_announcement_persistence_failed` diagnostics without pruning.

Deferred from Phase 5B.4A:

- Discussion entries, discussion replies, and general discussion-topic
  synchronization.
- Quiz details and quiz-question metadata.
- Planner-note creation, planner-note editing, and planner-override mutation.
- Submission, grade, rubric, and feedback synchronization.
- File, attachment, announcement-attachment, and media ingestion.
- Canvas webhooks, scheduled synchronization, background jobs, resumable jobs,
  queues, mobile synchronization UI, source-selection UI, notifications, and
  reviewer generation from Canvas data.

### Phase 5C - File, Attachment, And Media Ingestion

Status: Pending.

Scope:

- PDF with embedded text
- Scanned PDF through the existing OCR boundary
- PowerPoint `.ppt` and `.pptx`
- Word `.doc` and `.docx`
- Images
- Plain text
- HTML
- Supported spreadsheet text
- Assignment attachments
- Discussion attachments
- Announcement attachments
- Canvas-hosted media captions when available
- Unsupported format handling
- File-size and page-count limits
- Parser registry
- Partial-failure reporting

Required ingestion flow:

```text
Canvas discovery
-> metadata record
-> authorized file download
-> MIME and extension detection
-> parser or OCR selection
-> structured text extraction
-> normalized source blocks
-> editable preview
-> confirmed import
-> reviewer generation
```

Exit criteria:

- Canvas file discovery does not bypass the existing OCR, normalization,
  grounding, or reviewer validation boundaries.
- Unsupported files and partial failures are visible without blocking unrelated
  synchronized records.

### Phase 5D - Source Normalization, Provenance, And Selective Import

Status: Pending.

Scope:

- Structure preservation
- Headings
- Bullet hierarchy
- Tables
- Pages
- Slide numbers
- Module order
- Source snapshots
- Source versions
- Content hashes
- Parser versions
- OCR versions
- Selective import
- Editable source preview
- Deduplication
- Repeated-source relationships
- Stale-source handling
- Deleted-source handling
- Unsupported-source reporting

Every normalized source must preserve provenance such as:

```text
Stay Focused user ID
Canvas connection ID
Canvas course ID
Canvas module ID
Canvas module-item ID
Canvas source-object ID
source type
source title
file name
MIME type
page or slide number
Canvas URL
Canvas updated timestamp
local synchronized timestamp
content hash
parser version
OCR version
```

Exit criteria:

- A reviewer remains linked to the exact source snapshot used during
  generation.
- Users can preview and selectively import source material before it reaches the
  reviewer engine.

### Phase 5E - Grades, Submissions, Rubrics, And Feedback Foundation

Status: Pending.

Scope:

- Visible current course score
- Visible final course score
- Displayed grades
- Assignment groups
- Assignment-group weights
- Drop rules
- Grading periods
- Assignments
- Points possible
- Grading type
- Submission scores
- Submission state
- Attempt number
- Missing state
- Late state
- Excused state
- Omitted-from-final-grade state
- Rubric definitions
- Rubric assessments
- Instructor comments
- Feedback attachments
- Learning outcomes when permitted
- Grade snapshots
- Canvas hidden-grade behavior

Exit criteria:

- Grade and submission records remain separate from reviewer source content.
- Grades never automatically enter reviewer-generation prompts.
- Hidden or incomplete Canvas grading information is represented honestly.

### Phase 5F - Incremental And Resilient Synchronization

Status: Pending.

Scope:

- Incremental updates
- Canvas `updated_at` handling
- Content hashing
- Idempotent upserts
- Per-course checkpoints
- Per-item sync status
- Resumable synchronization
- Pagination
- Low-concurrency queues
- Retry behavior
- `429` handling
- Retry-after handling
- Stale records
- Deleted Canvas objects
- Locked or unpublished objects
- Partial failures
- Synchronization history
- Background synchronization
- User-visible sync health

Supported item states:

```text
discovered
synced
metadata_only
locked
unpublished
permission_denied
external
unsupported_format
download_failed
parse_failed
ocr_failed
stale
deleted_from_canvas
temporarily_failed
```

Exit criteria:

- Synchronization is idempotent, resumable, low-concurrency, and transparent
  about partial failures.
- Users can see sync health without seeing raw Canvas errors or secret data.

### Future Phase - Canvas OAuth Production Authorization

Status: Future. Not implemented.

Purpose: Replace or supplement manual personal access token entry with the
intended production authorization path for broad multi-user Canvas deployment.

Scope:

- institution-approved Canvas Developer Key
- OAuth authorization redirect
- Canvas authorization-code exchange
- per-user OAuth access tokens
- refresh-token handling where supported
- token refresh and expiration
- encrypted server-side token storage
- connection revocation
- OAuth state validation
- redirect URI validation
- migration from manually entered PAT connections
- institution-specific configuration
- capability revalidation after OAuth connection

Stay Focused does not currently possess a Canvas Developer Key. A Developer Key
is controlled by the Canvas institution or administrator, so OAuth cannot be
fully implemented for the school instance until such a key is approved.

OAuth is required before presenting the Canvas integration as a broadly
deployable public production authorization system. Phase 5A personal access
token support remains useful as a capstone and controlled deployment path, but
OAuth is not merely an optional hardening step.

### Future Phase - Grade Goal Planner

Status: Future.

Grade Goal Planner - Allow students to set a desired course grade, such as
90%, and calculate what scores they need on remaining activities using
synchronized Canvas grades, assignment weights, points, submissions, grading
rules, and editable manual assumptions.

Future planner requirements:

- Target-grade input
- Total-points courses
- Weighted assignment-group courses
- Grading periods
- Dropped-score rules
- Excused assignments
- Omitted assignments
- Extra credit
- Hypothetical scores
- Minimum required score
- Feasibility detection
- Best-case projection
- Worst-case projection
- "What happens if" scenarios
- Highest-impact remaining activity
- Manual correction when Canvas data is incomplete
- Confidence labels
- Optional Canvas What-If Grades verification when supported

Authorization relationship: the planner must consume only grade and assignment
data visible through the connected user's own Canvas credentials, whether the
credential source is the current per-user PAT model or the future OAuth model.
It must not require or assume a school-wide Canvas credential.

Required confidence states:

```ts
type GradeProjectionConfidence =
  | "exact_from_visible_canvas_rules"
  | "verified_with_canvas_what_if"
  | "estimated_from_visible_data"
  | "manual_configuration_required"
  | "insufficient_data";
```

Future grade projections must not be described as exact when grading
information is incomplete or hidden.

### Future Phase - Student Intelligence Features

Status: Future.

Later roadmap group:

- Missing-work recovery plans
- Announcement digests
- Deadline-conflict detection
- Professor-feedback summaries
- Rubric weakness detection
- Outcome-based study planning
- Course-progress dashboards
- Transcript-based reviewers
- Searchable lecture captions
- Offline course packs
- Course-wide semantic search
- Recently viewed material
- "Continue where you left off"

Permission-dependent features must be marked honestly. Successful Canvas course
access does not imply access to inbox messages, recent history, captions,
quiz questions, grades, outcomes, or external-tool content.

## Phase 6 - Tasks And Study Schedules

Status: Pending

Purpose: Expand from reviewer generation into schedule-first planning and
actionable study sessions.

Major deliverables:

- Task generation
- Due-date awareness
- Schedule generation
- Calendar-first planning
- Canvas deadline integration
- Actionable study sessions

Exit criteria:

- Source material and deadlines can produce user-actionable tasks.
- Generated study sessions fit into schedule-first planning.
- Canvas deadlines can inform task and schedule generation when Canvas is
  connected.

Immediate dependency: Phase 5 Canvas integration and Phase 4 saved content.

## Phase 7 - Polish, Deployment, And Thesis Validation

Status: Pending

Purpose: Validate the app as a polished, deployable capstone product rather
than only a local development slice.

Major deliverables:

- Completed mobile OAuth flows
- Deployed API validation
- Accessibility
- Navigation and UI polish
- Performance testing
- User testing
- Thesis evidence
- Production readiness

Exit criteria:

- Production deployment is validated with safe environment separation.
- Mobile auth flows are complete, including OAuth redirects if kept in scope.
- Accessibility, performance, and user-testing evidence are documented.
- Thesis evidence reflects the implemented product accurately.

Immediate dependency: Phases 3 through 6 complete enough to validate an end-to-end
student workflow.
