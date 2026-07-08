# Stay Focused V2

Stay Focused V2 is a mobile-first, schedule-first student productivity app for
turning school source material into useful study work. The current product is
an Expo/React Native app backed by a Next.js 15 App Router API, Supabase
authentication, OpenAI-backed reviewer generation, TypeScript workspaces, and
Google Cloud OCR-backed source intake. Canvas LMS Phase 5A is implemented,
live validated, and hardened as a per-user connection foundation. Phase 5B.1
adds the academic graph schema and typed Canvas retrieval contracts. Phase 5B.2
adds manually triggered synchronous initial full synchronization into that
graph with atomic per-course persistence. Phase 5B.3A hardens that sync path
with operation-specific course failure diagnostics and bounded transient
retries. Phase 5B.3B adds deterministic incremental persistence: unchanged
courses still fetch complete Canvas snapshots, but skip database graph
replacement when the versioned snapshot fingerprint is unchanged. Phase 5B.3C1
audited conditional-request support and found no useful 304 behavior for the
currently synchronized Canvas endpoint families. Phase 5B.4A adds backend
Canvas planner-item and course-announcement synchronization over a bounded
30-day past and 120-day future window, with no mobile UI yet. Phase 5C.1 adds
secure Canvas file metadata inventory and a bounded backend ingestion route for
selected eligible files. Its migration, private Storage posture, protected live
ingestion, and second-run stability are validated, but the synchronous sync
route still exceeds its configured runtime budget in local production-build
measurement. It does not yet parse, OCR, preview, or generate reviewers from
Canvas file contents. Phase 5C.2A1 adds user-facing Canvas course selection
and runtime-safe selected-course synchronization: students explicitly select
eligible courses, preferences persist separately from course inventory, normal
mobile sync calls independent course-scoped requests with maximum concurrency
two, and the account-wide route stays available only for diagnostics and future
background-sync foundations. Phase 5C.2A2 adds the first student-facing
Canvas source-selection reviewer flow: selected synchronized courses can list
Pages, assignment descriptions, announcements, and Canvas file metadata;
students can prepare eligible PDFs/images, preview one ready OCR-backed file
with stored text sources, edit selected source text; generation reuses the
existing reviewer API; and saving reuses the existing Study Library. Phase
5D.1 adds immutable server-side Canvas source provenance for that flow: preview
sessions, exact edited source snapshots, ordered source items, reviewer
linkage, and safe Study Library provenance summaries. Protected live
validation for Phase 5D.1 is blocked until previously exposed local
credentials are rotated. Phase 5D.2 adds structured normalized blocks and
selective import: Canvas HTML/OCR sources become bounded server-held blocks,
students choose exact blocks before preview generation, and selected-block
provenance is copied into immutable snapshots. Phase 5D.3 adds exact duplicate
source analysis, repeated-reference provenance, conservative current-source
status checks, and regeneration-readiness assessment without implementing
actual reviewer regeneration. Phase 5E planning is complete, Phase 5E.1 adds
the service-role-only database foundation for read-only Canvas assignment
submission state and visible grade summaries, Phase 5E.2 adds strictly
read-only typed Canvas client support for assignment grade metadata, the
current user's own submissions, and Canvas-provided visible course grade
summaries, and Phase 5E.3 adds the internal explicit per-selected-course grade
synchronization service. Canvas access remains GET-only and manual. No public
grade API route, mobile UI, background synchronization, notification, local
grade calculation, submission action, private submission-content storage, or
reviewer integration exists yet.
Protected live validation remains blocked pending credential rotation.

Expo Web is the fast laptop-browser development and regression surface for the
mobile app. It is not a replacement for the mobile-primary product.

## Workspace

- `apps/mobile`: Expo and Expo Router mobile app
- `apps/api`: Next.js 15 App Router API
- `packages/engine`: Provider-agnostic reviewer generation pipeline
- `packages/ocr`: Provider-agnostic OCR contracts and deterministic
  normalization
- `packages/db`: Supabase client and database types
- `packages/canvas`: Canvas LMS client and types
- `packages/shared`: Shared types, constants, and utilities

## Current Working Vertical Slice

The current completed flow is:

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

The completed Canvas reviewer flow is:

```text
Sign in
-> Courses
-> selected synchronized Canvas course
-> choose supported Canvas sources
-> prepare one eligible PDF/image when needed
-> choose structured content blocks
-> preview and edit selected source text/title
-> protected preview session
-> existing reviewer API
-> immutable source snapshot after successful generation
-> reviewer preview
-> save to Study Library
-> safe provenance summary in reviewer detail
-> manual source-health check and regeneration-readiness summary
```

This slice uses Supabase email/password authentication in the Expo app. The
mobile client sends a Supabase bearer token to `POST /api/reviewer/generate`;
the API verifies it with Supabase, creates the server-only OpenAI provider, runs
the Stage 0 through Stage 6 engine pipeline, and returns a reviewer preview.

## Current Implementation Status

Complete:

- Stage 0 through Stage 6 provider-agnostic reviewer engine
- OpenAI provider boundary in the API layer
- Supabase bearer-token protection for reviewer generation
- Expo reviewer input and preview
- Email/password sign-in and session restore
- Local Expo Web CORS support for the reviewer route
- Unattended authenticated Expo Web reviewer smoke runner
- Persistent smoke-browser session and automatic output assertions
- Provider-agnostic OCR contracts and normalization in `@stay-focused/ocr`
- Server-only Google Cloud Vision OCR adapter with fake-client tests
- Protected `POST /api/ocr/extract` image OCR route
- Expo gallery image import and camera capture with editable OCR text review
  before reviewer generation
- Protected `POST /api/ocr/extract-pdf` scanned-PDF OCR route for synchronous
  1-5 page PDF intake
- Expo PDF import with editable OCR text review before reviewer generation
- Supabase reviewer persistence migration and authenticated reviewer CRUD API
- Expo Study Library for saved reviewer list, open, rename, and delete
- Live Supabase Study Library validation with distinct users, bidirectional
  owner isolation, safe `404 reviewer_not_found` denial, and cleanup
- Reviewer detail route typing fix for Promise-based Next.js App Router params
- Phase 5A Canvas connection foundation with per-user personal access token
  entry, server-side validation, AES-256-GCM encrypted storage, course listing,
  capability probes, and disconnect
- Phase 5B.1 Canvas academic graph foundation with course, module, module item,
  Page, assignment-group, and assignment tables plus typed Canvas collection
  methods
- Phase 5B.2 manual Canvas academic graph synchronization with sync-run
  persistence, bounded concurrency, atomic per-course replacement, stale-child
  cleanup after complete course snapshots, and mobile service support without a
  screen
- Phase 5B.3A Canvas sync recovery hardening with sanitized per-course
  diagnostics, non-retryable Page-listing failure classification, bounded
  transient retries, and diagnostic persistence through a service-role RPC
- Phase 5B.3B Canvas incremental persistence foundation with a versioned
  deterministic course-snapshot fingerprint, service-role-only sync state,
  changed/unchanged/failed counts, and unchanged-course graph replacement
  avoidance
- Phase 5B.3C1 Canvas conditional-request capability audit, with no production
  sync behavior change and no 304/body-byte reduction observed for current sync
  endpoint families
- Phase 5B.4A Canvas planner-item and announcement synchronization with typed
  client methods, service-role-only persistence, deterministic fingerprints,
  safe scoped pruning, aggregate diagnostics, and mobile service parsing
- Phase 5C.1 Canvas file inventory and bounded ingestion foundation with
  service-role-only metadata persistence, private storage for eligible selected
  files, strict redirect/download limits, sanitized per-file results, remote
  Supabase validation, protected live ingestion validation, and a documented
  synchronous route-duration limitation
- Phase 5C.2A1 Canvas course selection and selected-course synchronization with
  metadata-based inventory classification, service-role-only preference
  persistence, course-scoped sync runs, mobile per-course status, planner
  exclusion from course-scoped requests, and no academic-unit synchronization
  limit
- Phase 5C.2A2 Canvas source selection and reviewer handoff with protected
  course source listing, ordered source preview, safe HTML-to-text
  normalization, editable mobile preview, existing reviewer-generation reuse,
  existing Study Library save, minimal `canvas` source metadata, and no Canvas
  file parsing/OCR
- Phase 5C.2B Canvas PDF/image OCR sources with safe file descriptors,
  course-scoped preparation through the existing ingestion boundary, private
  Storage byte/hash/signature revalidation, one OCR-backed file per preview,
  ordered mixed-source assembly, mobile prepare/ready states, transient OCR
  text only, and no Canvas/OpenAI calls during preview
- Phase 5D.1 immutable Canvas source snapshots and exact reviewer provenance
  with private preview sessions, exact edited source-text snapshots, ordered
  source snapshot items, database-enforced reviewer/snapshot ownership, safe
  detail summaries, and no provenance sent to OpenAI
- Phase 5D.2 structured normalized Canvas blocks and selective import with
  server-held HTML/OCR block manifests, bounded block selection before preview,
  selected-block snapshot provenance, Study Library selected-block summaries,
  and no provenance sent to OpenAI
- Phase 5D.3 duplicate relationships and source freshness with exact
  same-source and same-content grouping, repeated-reference summaries,
  immutable relationship rows, protected reviewer source-status checks,
  conservative missing-after-sync semantics, Study Library source-health UI,
  regeneration-readiness states, and no actual regeneration

Working locally:

- OpenAI-backed reviewer generation through the authenticated API route
- Authenticated image OCR extraction through the API route contract
- Gallery-selected, camera-captured, and scanned-PDF source intake in the
  mobile client
- Save, list, open, rename, and delete flows against the reviewer library API
  contract
- Live `reviewers` schema, RLS, policy, and migration-history verification
- Live cross-user Study Library validation against `http://localhost:3000`
- Final Phase 4 regression pass: DB/API/mobile typechecks, API/mobile/OCR
  tests, engine build/evals, and `git diff --check`
- `npm run smoke:reviewer:web` for laptop-browser regression coverage
- `npm run smoke:ocr:web` for deterministic Expo Web OCR UI coverage with a
  mocked OCR response
- `npm run smoke:ocr-pdf:web` for deterministic Expo Web PDF OCR UI coverage
  with a mocked OCR response
- API route tests, smoke-runner tests, engine evals, API typecheck, mobile
  typecheck, and engine build
- Direct developer-owned Canvas live validation returned 17 courses for that
  validating account only; this does not prove institution-wide access.
- Remote Canvas migration/RLS validation passed. Protected Canvas API lifecycle
  validation passed with encrypted persistence, course loading, capabilities,
  invalid replacement preservation, disconnect, and a final disconnected state.
- Phase 5A hardening closed the audit conditions for strict Base64 validation,
  atomic connection/capability persistence, automated two-user authorization
  evidence, redirect rejection, request validation coverage, README status, and
  ADR numbering.
- Phase 5B.1 remote migration verification passed for the academic graph
  foundation, including composite ownership constraints, RLS, revoked direct
  client grants, required indexes, and unchanged Phase 5A protections.
- Phase 5B.2 remote migration verification and live validation passed. The
  encrypted Canvas connection remains stored for future testing. Live sync is
  manual and synchronous; the observed account returned a documented partial
  result with 13 successful courses, 4 sanitized course-fetch failures, stable
  identities on the second run, no duplicate graph identities, and no running
  sync rows left behind.
- Phase 5B.3A remote migration verification and live validation passed. The
  four previously generic course failures are now sanitized
  `canvas_course_pages_failed` results classified as Page-listing
  `resource_not_found` 4xx failures, non-retryable with zero retry attempts.
  Two hardened live syncs returned HTTP 200 partial results with 13 successful
  courses, 4 permanent Canvas limitations, stable identities, no duplicate
  graph identities, and no running sync rows left behind.
- Phase 5B.3B remote migration verification and live validation passed. The
  encrypted Canvas connection remains stored. A full baseline run persisted 13
  changed courses and preserved 4 Page-listing failures; two immediate
  incremental runs then reported 13 unchanged courses, 0 changed courses, 4
  failed courses, 0 graph replacements for unchanged courses, stable
  fingerprints, stable graph timestamps, no duplicate identities, and no
  running sync rows left behind.
- Phase 5B.3C1 live conditional-request audit passed as validation only. ETags
  were present, `Last-Modified` was absent, primary conditional requests
  returned HTTP 200 with full bodies, no 304 responses were observed, body-byte
  reduction was 0%, and no sync runs or graph writes were created.
- Phase 5B.4A remote migration verification and protected live validation
  passed with a documented partial result. The first run inserted 37 planner
  items and 19 announcements; the second run classified them as unchanged with
  stable identities, zero duplicates, zero unexpected pruning, and zero running
  sync rows. Four known Page-listing limitations remained non-retryable, and
  four announcement persistence scopes were preserved with sanitized failures
  for the same unavailable course graphs.
- Phase 5C.1 automated, remote, and protected live validation passed for Canvas
  file metadata/download tests, API inventory/ingestion contracts, mobile sync
  parsing, Supabase migrations `202607060003` and `202607060004`, private
  Storage access controls, protected ingestion, and second-run stability. The
  synchronous `POST /api/canvas/sync` route measured 72.294 seconds and 65.355
  seconds in local production-build validation against a configured
  `maxDuration = 60`, so this backend foundation is locally functional and
  data-safe but not production-runtime safe yet.
- Phase 5C.2A1 automated, remote, and protected live validation passed for
  selected-course synchronization. The live inventory returned 76 course
  shells: 15 likely current, 59 past or concluded, 2 other or uncertain, and 0
  unavailable. Two likely-current courses were selected and restored after
  reload. First selected-course sync returned one `success` and one `partial`
  result in 6.052 seconds and 8.492 seconds; the second run completed in 5.833
  seconds and 7.849 seconds with zero unnecessary updates, zero unexpected
  pruning, zero duplicate identities, and zero running course sync rows. The
  account-wide route was not called by the normal selected-course flow.
- Phase 5C.2A2 automated and protected live validation passed for Canvas source
  selection and reviewer handoff. Live source listing for opaque
  `live-course-1` returned 49 descriptors with 36 available Pages, 2
  unavailable Pages, 11 available announcements, and no source bodies in the
  list response. Ordered preview used two sources, produced 3,467 characters,
  rejected empty input, rejected cross-course mixing, contained no URLs or
  credentials, and did not call Canvas, Storage, OCR, or OpenAI. Expo Web smoke
  selected two sources, edited source text/title, navigated back with selection
  preserved, and reloaded preview. Reviewer generation returned HTTP 200,
  saved to Study Library, verified list visibility, and deleted the smoke
  reviewer.
- Phase 5C.2B automated and protected live validation passed for Canvas
  PDF/image source preparation and OCR preview. Live inventory checked 2
  selected synchronized courses, found 0 eligible PDFs and 2 eligible images,
  prepared opaque `live-file-1`, reran preparation idempotently, previewed
  Page -> Image -> Announcement with 1 OCR-backed source and 62 extracted image
  characters, returned no private Storage or credential fields, generated and
  saved a reviewer from harmless edited text, verified Study Library
  visibility, and deleted the validation reviewer. An exploratory generation
  attempt that included the very short/noisy live OCR preview text returned the
  existing `reviewer_validation_failed` response.
- Phase 5D.2 automated and remote database verification passed for structured
  normalized blocks and selective import. Migration `202607070004` is applied
  remotely; rollback-safe SQL verification passed for private structure
  sessions, selected-block manifests, snapshot block copying, immutability,
  direct grant revocation, service-role grants, RLS, expired cleanup, snapshot
  reuse, and historical preview compatibility. Protected live validation is
  blocked pending credential rotation.
- Phase 5D.3 adds duplicate/repeated relationship provenance and reviewer
  source status. Migrations
  `202607080001_add_canvas_source_relationships_freshness.sql` and
  `202607080002_harden_source_relationship_grants.sql` add private immutable
  relationship rows, relationship manifests on Canvas preview and structure
  sessions, and explicit service-role-only table grants. Remote rollback-safe
  SQL verification passed with 18/18 checks. The protected source-status API
  compares current synchronized rows to immutable snapshots without Canvas,
  Storage, OCR, PAT decryption, or OpenAI calls. Protected live validation is
  blocked pending credential rotation.
- Phase 5E.1 adds the read-only Canvas grades/submissions database
  foundation. Migrations
  `202607080003_add_canvas_grades_submissions_foundation.sql` and
  `202607080004_harden_canvas_grade_trigger_search_path.sql` are applied
  remotely; rollback-safe SQL verification passed for normalized status and
  visibility contracts, owner-scoped tables, composite FKs, RLS, revoked direct
  client grants, service-role DML grants, privacy exclusions, and cascade
  behavior. No Canvas data was fetched, no grades or submissions were imported,
  no API route or mobile UI exists, no unofficial grade calculation exists, and
  no submission write capability exists.
- Phase 5E.2 adds read-only `@stay-focused/canvas` client methods and parser
  contracts for Phase 5E.3: `listCourseAssignments`,
  `listOwnCourseSubmissions`, and `getOwnCourseGradeSummary`. The methods use
  GET-only requests, shared pagination/security checks, omitted `student_ids[]`,
  `user_id=self` for own enrollment grades, explicit visible/hidden/
  unavailable/unknown wrappers, and unsafe-field discards for submission bodies,
  comments, attachments, user/grader IDs, URLs, rubrics, raw JSON, and unposted
  grades. No persistence, API route, mobile UI, synchronization service, grade
  calculation, submission action, or reviewer integration was added.
- Phase 5E.3 adds an internal explicit grade synchronization service for one
  owned selected Canvas course. It normalizes assignment/submission evidence,
  derives conservative canonical statuses, fingerprints rows and snapshots,
  writes through service-role-only RPCs, preserves failed families, records
  per-course sync state, and returns aggregate mobile-safe diagnostics. No
  public API route, mobile service/UI, background job, notification, local grade
  calculation, submission mutation, private submission-content storage, or
  reviewer integration was added.

Pending:

- Phase 5E.4 protected grade read APIs, then mobile grade UI
- Remaining secondary Canvas resources, broader parser families, grade sync
  hardening, and background/resumable sync for larger accounts
- Canvas OAuth production authorization with an institution-approved Developer
  Key before broad public multi-user deployment
- Task generation and study scheduling
- Completed mobile OAuth redirects, deployment validation, product polish, and
  capstone evidence

See [Current State](docs/current-state.md), [Roadmap](docs/roadmap.md), and
[Current Sprint](docs/ai/current_sprint.md) for the detailed working status.

## Reviewer Engine Status

The provider-agnostic Stage 0 through Stage 6 pipeline and end-to-end
`runPipeline` integration are complete. The deterministic engine evaluation
harness currently reports **266 passed and 0 failed**.

Default visible reviewer content is source-faithful: validation checks visible
titles, explanations, and key points, while unsupported enrichment is excluded
from default assembly. Short OCR-style prose has an extractive fallback, and the
mobile client can now send edited OCR text into the same reviewer generation
flow. Scanned-document OCR is implemented as a synchronous small-PDF MVP, and
reviewer persistence sits outside the engine behind authenticated API routes.

See [ADR-004](docs/architecture/ADR-004-engine-pipeline.md), the
[engine contract](docs/architecture/engine-contract.md), and
[ADR-005](docs/architecture/ADR-005-openai-provider-adapter.md) for the core
generation boundaries. See
[OCR API Boundary](docs/architecture/ocr-api-boundary.md) for the Phase 3A OCR
server contract.

## Local Environment Setup

Copy the committed empty templates into ignored local files as needed:

```sh
cp .env.example .env.local
cp apps/api/.env.example apps/api/.env.local
cp apps/mobile/.env.example apps/mobile/.env.local
```

Root and API env files may hold server credentials. Mobile must contain only
public `EXPO_PUBLIC_` values. `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, and
Google Cloud credentials must never be placed in mobile env files or committed.
The OCR server factory supports `GOOGLE_CLOUD_PROJECT_ID`,
`GOOGLE_CLOUD_CREDENTIALS_JSON`, and Application Default Credentials through
`GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_CLOUD_PROJECT`.

Developer live Canvas validation can use `CANVAS_BASE_URL` and
`CANVAS_PERSONAL_ACCESS_TOKEN` with a developer-owned Canvas test account.
Compatibility aliases supported by the live-validation harness are
`CANVAS_ACCESS_TOKEN`, `CANVAS_LIVE_BASE_URL`, and
`CANVAS_LIVE_PERSONAL_ACCESS_TOKEN`. These variables are not shared application
credentials for all users.

`CANVAS_TOKEN_ENCRYPTION_KEY` is a required API-side application encryption
secret before stored Canvas connections can be persisted. It is generated and
owned by the Stay Focused deployment, not by Canvas, the school, or the student,
and must be canonical padded Base64 that decodes to exactly 32 bytes.

Node.js 20 or newer and npm 10 or newer are required.

## Local Testing

Run the reusable authenticated Expo Web reviewer smoke from the repository
root:

```sh
npm run smoke:reviewer:web
npm run smoke:ocr:web
npm run smoke:ocr-pdf:web
```

The reviewer smoke submits the pasted-text fixture. The OCR web smoke switches
to image mode, injects a tiny fictional image fixture without opening the
operating-system picker, mocks only `POST /api/ocr/extract`, verifies editable
extracted text, then uses the real reviewer route. The PDF OCR web smoke follows
the same pattern with a fictional PDF fixture and mocked
`POST /api/ocr/extract-pdf`. These OCR smokes do not prove live Google OCR. The
commands start or reuse local services, authenticate or restore a persisted
smoke session, verify reviewer output, and clean up runner-owned services.

See [Local Expo Web Reviewer Smoke](docs/testing/local-reviewer-smoke.md) for
credential setup, session-only mode, failure codes, and diagnostics.

Useful non-live checks:

```sh
npm run test:reviewer-web-smoke
npm run test --workspace apps/mobile
npm run test --workspace @stay-focused/ocr
npm run test --workspace apps/api
npm run typecheck --workspace @stay-focused/db
npm run typecheck --workspace apps/api
npm run typecheck --workspace apps/mobile
npm run build --workspace @stay-focused/engine
npm run eval --workspace @stay-focused/engine
```

The API-layer OpenAI provider also has a separate opt-in one-call smoke test:

```powershell
$env:RUN_OPENAI_SMOKE="1"
$env:OPENAI_API_KEY="<server-only-key>"
npm run smoke:openai -w apps/api
```

Normal engine evals, provider contract checks, and reviewer smoke-runner unit
tests do not run that opt-in provider smoke.

## Current Limitations

- Gallery image import and camera capture support PNG/JPEG OCR into editable
  text, and manual paste remains available.
- Scanned-PDF import supports one server-bound PDF per request, 1-5 pages, and
  editable extracted-text review.
- Physical-device live OCR validation depends on local API, Supabase, and
  Google Cloud OCR credentials.
- Phase 5A Canvas is complete and live validated for the secure connection
  lifecycle. Per-user PAT connect, encrypted persistence, remote migration,
  course loading, capability status, invalid replacement preservation,
  disconnect, and final disconnected state passed.
- Phase 5B.1 is complete as a foundation. Phase 5B.2 is complete as a manual
  synchronous initial full sync. Persistence is atomic per course, not one
  transaction for the entire Canvas account; partial account syncs may commit
  successful courses while preserving failed courses.
- Phase 5B.3A remains closed, and Phase 5B.3B is complete as deterministic
  incremental database persistence. Incremental mode still fetches complete
  Canvas snapshots, but unchanged courses avoid database graph replacement.
- Phase 5B.3C1 is complete as a capability audit only. Production conditional
  fetching remains unsupported for the current Canvas sync endpoint families
  because no 304 behavior or body-byte reduction was observed.
- Phase 5B.4A is complete for backend planner-item and announcement
  synchronization. It uses ordinary GET requests, a 30-day past and 120-day
  future sync window, service-role-only persistence, and aggregate-only
  diagnostics. The protected live account returned a documented partial result
  because four Page-listing limitations and their dependent announcement
  persistence scopes remain unavailable.
- Phase 5C.1 is remotely and live validated for backend Canvas file metadata
  inventory and bounded selected-file ingestion. It stores no parsed text, runs
  no OCR, adds no mobile UI, and does not make Canvas files available to
  reviewer generation yet. The synchronous sync route remains over its
  configured runtime budget, so deployed production readiness is not claimed.
- Phase 5C.2A1 adds the mobile selected-course synchronization screen and keeps
  the normal flow off the account-wide route. Course-scoped sync excludes
  user-wide planner items for now. One live selected course remained `partial`
  because file metadata listing failed safely with sanitized
  `canvas_course_files_failed`; previous graph data was preserved.
- Phase 5C.2A2 adds Canvas source selection only for synchronized selected
  courses. Pages, assignment descriptions, and announcements are selectable
  when they have readable synchronized text. Phase 5C.2B adds selectable
  Canvas PDFs, PNGs, and JPEGs after explicit preparation through the existing
  secure ingestion boundary. Preview supports one OCR-backed file mixed with
  text sources, is bounded and editable, and does not call Canvas, decrypt the
  PAT, call OpenAI, return Storage keys, or persist OCR output. Phase 5D.2 adds
  a structure-and-select step for normalized Canvas HTML/OCR blocks and stores
  selected-block provenance with immutable snapshots. Phase 5D.3 adds exact
  duplicate detection, repeated-reference indicators, immutable relationship
  provenance, and manual source-health checks for saved Canvas reviewers.
  Missing sources are reported only after later authoritative sync evidence;
  partial, failed, old, or ambiguous sync evidence remains `unknown`. Broader
  parser families, source and block diff UI, cross-course bundles, background
  sync, and actual reviewer regeneration remain deferred.
- No background or scheduled Canvas synchronization exists yet.
- Phase 5A uses per-user Canvas personal access tokens. There is no
  school-wide Canvas token, and successful validation for one user does not
  prove access for every user, course, role, or institution.
- Automated user-scoping coverage is strengthened with two-user route tests.
  Live second-user Canvas validation was not run.
- Canvas OAuth is not implemented yet and is required before presenting the
  integration as broadly deployable public production authorization.
- Discussions, quiz metadata, file parsing/OCR, endpoint validators,
  grade/submission/rubric data, announcement attachment content import, and
  broader Canvas source support are deferred.
- Task and schedule generation are not implemented.
- Google and Microsoft OAuth helpers exist, but completed mobile OAuth redirect
  flows are not validated as a finished feature.
- Production deployment and iPhone production readiness are not complete.

## Next Milestone

Phase 5A hardening is complete, Phase 5B.1 academic graph foundation is in
place, Phase 5B.2 initial full academic graph synchronization is live
validated, and Phase 5B.3A course recovery hardening is live validated. The
Phase 5B.3B incremental academic graph synchronization foundation is complete
and live validated. Phase 5B.3C1 conditional-request capability audit is
complete and does not support Phase 5B.3C2 for the audited endpoints. The
Phase 5B.4A planner-item and announcement synchronization slice is complete
with documented live Canvas limitations. Phase 5C.1 file inventory and bounded
ingestion foundation is remotely and live validated with a documented
synchronous route-duration limitation. Phase 5C.2A1 selected-course
synchronization is complete and runtime-safe in local production validation.
Phase 5C.2A2 Canvas source selection and reviewer handoff is complete and live
validated. Phase 5C.2B Canvas PDF and image OCR integration is complete and
live validated for preparation, private Storage OCR preview, edited reviewer
handoff, and Study Library cleanup. Phase 5D.1 immutable source snapshots and
exact reviewer provenance is implemented and remotely verified, with protected
live validation blocked pending credential rotation. Phase 5D.2 structured
normalized blocks and selective import is implemented and remotely verified,
with protected live validation blocked pending credential rotation. Phase 5D.3
duplicate relationships, source freshness, and regeneration readiness is
implemented, with protected live validation blocked pending credential
rotation. The next operational gate is credential rotation and protected
Phase 5D.1 through Phase 5D.3 live validation. Canvas OAuth remains a future
phase.
