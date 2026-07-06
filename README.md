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
Canvas file contents.

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

Pending:

- Remaining secondary Canvas resources, content ingestion, grade sync, and
  background/resumable sync for larger accounts
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
- No background or scheduled Canvas synchronization exists yet, and no mobile
  synchronization screen exists yet.
- Phase 5A uses per-user Canvas personal access tokens. There is no
  school-wide Canvas token, and successful validation for one user does not
  prove access for every user, course, role, or institution.
- Automated user-scoping coverage is strengthened with two-user route tests.
  Live second-user Canvas validation was not run.
- Canvas OAuth is not implemented yet and is required before presenting the
  integration as broadly deployable public production authorization.
- Discussions, quiz metadata, file parsing/OCR, endpoint validators,
  grade/submission/rubric data, mobile Canvas source selection, announcement
  attachment content import, and reviewer generation from Canvas content are
  deferred.
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
synchronous route-duration limitation. The next roadmap task is Phase 5C.2A -
User-Facing Canvas Sync And Source-Selection Loop: manual mobile Canvas sync,
last-sync status and safe aggregate counts, clear partial-failure messaging,
narrow source-selection preview, and editable source text before reviewer
generation. Parser/OCR work should be added only as required for that narrow
loop. Canvas OAuth remains a future phase.
